import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './PrivateVideoConference.css';

const PrivateVideoConference = ({ 
  isVisible, 
  privateAreaId, 
  currentUser, 
  onStreamReady, 
  onStreamError,
  onConferenceEnd 
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [peers, setPeers] = useState(new Map());
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isConferenceActive, setIsConferenceActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const localVideoRef = useRef(null);
  const peerConnections = useRef(new Map());
  const { socket: authSocket, connectSocket, user: authUser } = useAuth();

  // WebRTC 설정
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // 권한 확인
  const checkPermissions = async () => {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' });
      const micPermissions = await navigator.permissions.query({ name: 'microphone' });
      
      if (permissions.state === 'granted' && micPermissions.state === 'granted') {
        setHasPermission(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('권한 확인 오류:', error);
      return false;
    }
  };

  // 권한 요청
  const requestPermissions = async () => {
    try {
      setIsRequesting(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      setHasPermission(true);
      setIsConferenceActive(true);
      
      if (onStreamReady) {
        onStreamReady(stream);
      }
      
      // 프라이빗 영역에 입장 알림
      joinPrivateArea();
      
    } catch (error) {
      console.error('권한 요청 실패:', error);
      if (onStreamError) {
        onStreamError(error);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  // 권한 거부
  const denyPermissions = () => {
    setHasPermission(false);
    setIsConferenceActive(false);
    if (onStreamError) {
      onStreamError(new Error('권한이 거부되었습니다.'));
    }
  };

  // 프라이빗 영역 입장 (Socket.IO)
  const joinPrivateArea = () => {
    const socket = authSocket || connectSocket();
    if (!socket) {
      console.warn('소켓이 준비되지 않아 프라이빗 영역에 입장할 수 없습니다.');
      return;
    }
    socket.emit('join-private-area', { privateAreaId });
  };

  // Socket.IO 이벤트 바인딩
  useEffect(() => {
    const socket = authSocket || connectSocket();
    if (!socket) return;

    const onParticipants = (data) => {
      const list = (data?.participants || []).map(p => ({ id: p.userId, username: p.username }));
      setParticipants(list);
    };

    const onUserJoined = (data) => {
      handleUserJoined({ id: data.userId, username: data.username });
    };

    const onUserLeft = (data) => {
      handleUserLeft(data.userId);
    };

    const onWebRTCSignal = async (message) => {
      switch (message.type) {
        case 'offer':
          await handleOffer(message);
          break;
        case 'answer':
          await handleAnswer(message);
          break;
        case 'ice-candidate':
          await handleIceCandidate(message);
          break;
      }
    };

    socket.on('participants', onParticipants);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('webrtc-signal', onWebRTCSignal);

    return () => {
      socket.off('participants', onParticipants);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('webrtc-signal', onWebRTCSignal);
    };
  }, [authSocket, connectSocket]);

  // 새 사용자 입장 처리
  const handleUserJoined = async (user) => {
    if (user.id === currentUser.id) return;
    
    console.log('새 사용자 입장:', user);
    
    // 새 PeerConnection 생성
    const peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnections.current.set(user.id, peerConnection);
    
    // 로컬 스트림 추가
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }
    
    // 원격 스트림 처리
    peerConnection.ontrack = (event) => {
      console.log('원격 스트림 수신:', user.id);
      setRemoteStreams(prev => new Map(prev.set(user.id, event.streams[0])));
    };
    
    // ICE 후보 처리
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = authSocket || connectSocket();
        if (socket) {
          socket.emit('webrtc-signal', {
            type: 'ice-candidate',
            candidate: event.candidate,
            targetUserId: user.id,
            fromUserId: currentUser.id
          });
        }
      }
    };
    
    // Offer 생성 및 전송
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      const socket = authSocket || connectSocket();
      if (socket) {
        socket.emit('webrtc-signal', {
          type: 'offer',
          offer: offer,
          targetUserId: user.id,
          fromUserId: currentUser.id
        });
      }
    } catch (error) {
      console.error('Offer 생성 실패:', error);
    }
  };

  // 사용자 퇴장 처리
  const handleUserLeft = (userId) => {
    console.log('사용자 퇴장:', userId);
    
    // PeerConnection 정리
    const peerConnection = peerConnections.current.get(userId);
    if (peerConnection) {
      peerConnection.close();
      peerConnections.current.delete(userId);
    }
    
    // 원격 스트림 제거
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(userId);
      return newStreams;
    });
    
    // 참가자 목록에서 제거
    setParticipants(prev => prev.filter(p => p.id !== userId));
  };

  // Offer 처리
  const handleOffer = async (message) => {
    const { offer, fromUserId } = message;
    
    // 새 PeerConnection 생성
    const peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnections.current.set(fromUserId, peerConnection);
    
    // 로컬 스트림 추가
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }
    
    // 원격 스트림 처리
    peerConnection.ontrack = (event) => {
      console.log('원격 스트림 수신:', fromUserId);
      setRemoteStreams(prev => new Map(prev.set(fromUserId, event.streams[0])));
    };
    
    // ICE 후보 처리
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = authSocket || connectSocket();
        if (socket) {
          socket.emit('webrtc-signal', {
            type: 'ice-candidate',
            candidate: event.candidate,
            targetUserId: fromUserId,
            fromUserId: currentUser.id
          });
        }
      }
    };
    
    try {
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      const socket = authSocket || connectSocket();
      if (socket) {
        socket.emit('webrtc-signal', {
          type: 'answer',
          answer: answer,
          targetUserId: fromUserId,
          fromUserId: currentUser.id
        });
      }
    } catch (error) {
      console.error('Offer 처리 실패:', error);
    }
  };

  // Answer 처리
  const handleAnswer = async (message) => {
    const { answer, fromUserId } = message;
    const peerConnection = peerConnections.current.get(fromUserId);
    
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(answer);
      } catch (error) {
        console.error('Answer 처리 실패:', error);
      }
    }
  };

  // ICE 후보 처리
  const handleIceCandidate = async (message) => {
    const { candidate, fromUserId } = message;
    const peerConnection = peerConnections.current.get(fromUserId);
    
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error('ICE 후보 처리 실패:', error);
      }
    }
  };

  // 마이크 토글
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // 비디오 토글
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  // 화상회의 종료
  const endConference = () => {
    // 로컬 스트림 정리
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // PeerConnection 정리
    peerConnections.current.forEach(connection => {
      connection.close();
    });
    peerConnections.current.clear();
    
    // 프라이빗 영역 퇴장
    const socket = authSocket || connectSocket();
    if (socket) {
      socket.emit('leave-private-area');
    }
    
    // 상태 초기화
    setRemoteStreams(new Map());
    setParticipants([]);
    setIsConferenceActive(false);
    setHasPermission(false);
    
    if (onConferenceEnd) {
      onConferenceEnd();
    }
  };

  // 로컬 비디오 스트림 연결
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      const socket = authSocket || connectSocket();
      if (socket) {
        socket.emit('leave-private-area');
      }
      peerConnections.current.forEach(connection => {
        connection.close();
      });
    };
  }, []);

  // 권한 확인 및 요청
  useEffect(() => {
    if (isVisible && !hasPermission && !isRequesting) {
      checkPermissions().then(hasPermission => {
        if (!hasPermission) {
          setHasPermission(false);
        }
      });
    }
  }, [isVisible, hasPermission, isRequesting]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="private-video-conference">
      {/* 권한 요청 다이얼로그 */}
      {!hasPermission && !isConferenceActive && (
        <div className="conference-dialog-overlay">
          <div className="conference-dialog">
            <div className="conference-icon">🎥</div>
            <h3>프라이빗 영역 화상회의</h3>
            <p>같은 프라이빗 영역의 사람들과 화상회의를 시작합니다.</p>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>
              카메라와 마이크 권한이 필요합니다.
            </p>
            <div className="conference-buttons">
              <button
                className="conference-btn allow"
                onClick={requestPermissions}
                disabled={isRequesting}
              >
                {isRequesting ? '연결 중...' : '화상회의 참여'}
              </button>
              <button
                className="conference-btn deny"
                onClick={denyPermissions}
                disabled={isRequesting}
              >
                거부
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 화상회의 인터페이스 */}
      {isConferenceActive && (
        <div className="conference-interface">
          <div className="conference-header">
            <h3>🎥 프라이빗 화상회의</h3>
            <div className="participants-count">
              참가자: {participants.length + 1}명
            </div>
            <button
              onClick={endConference}
              className="end-conference-btn"
              title="화상회의 종료"
            >
              ❌
            </button>
          </div>

          <div className="video-grid">
            {/* 로컬 비디오 */}
            <div className="video-item local">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="local-video"
              />
              <div className="video-label">나 ({currentUser.username})</div>
            </div>

            {/* 원격 비디오들 */}
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const participant = participants.find(p => p.id === userId);
              return (
                <div key={userId} className="video-item remote">
                  <video
                    autoPlay
                    playsInline
                    className="remote-video"
                    ref={el => {
                      if (el) el.srcObject = stream;
                    }}
                  />
                  <div className="video-label">
                    {participant ? participant.username : '참가자'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="conference-controls">
            <button
              onClick={toggleMic}
              className={`control-btn ${isMicOn ? 'active' : 'inactive'}`}
              title={isMicOn ? '마이크 끄기' : '마이크 켜기'}
            >
              {isMicOn ? '🎤' : '🔇'}
            </button>
            <button
              onClick={toggleVideo}
              className={`control-btn ${isVideoOn ? 'active' : 'inactive'}`}
              title={isVideoOn ? '카메라 끄기' : '카메라 켜기'}
            >
              {isVideoOn ? '📹' : '🚫'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateVideoConference;
