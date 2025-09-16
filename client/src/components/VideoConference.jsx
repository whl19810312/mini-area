import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const VideoConference = ({ 
  isOpen, 
  onClose, 
  roomId, 
  userId, 
  username 
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localVideoContainerRef = useRef(null);

  // Agora 설정
  const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '4fdc24d11417437785bfc1d7ddb78c96';

  // Agora 채널명 생성 (생성자 ID와 맵 순서 기반)
  const generateChannelName = (roomId) => {
    // 단순한 roomId 기반 채널명 (기존 호환성 유지)
    const channelName = `room_${roomId}`;
    // Agora 규칙에 맞게 검증 및 수정
    return channelName.replace(/[^a-zA-Z0-9\s!#$%&()+\-:;<=>?@\[\]^_{|}~,]/g, '_');
  };

  const channelName = generateChannelName(roomId);

  // Agora 토큰 요청 함수
  const requestAgoraToken = async (channelName, userId, role = 'publisher') => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/agora/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          channelName,
          userId,
          role
        })
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Token generation failed');
      }

      console.log('✅ Agora 토큰 요청 성공:', { channelName, userId });
      return data.token;

    } catch (error) {
      console.error('❌ Agora 토큰 요청 실패:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Agora 클라이언트 초기화
    const initializeAgora = async () => {
      try {
        clientRef.current = AgoraRTC.createClient({
          mode: 'rtc',
          codec: 'vp8'
        });

        // 원격 사용자 이벤트 리스너
        clientRef.current.on('user-published', handleUserPublished);
        clientRef.current.on('user-unpublished', handleUserUnpublished);
        clientRef.current.on('user-joined', handleUserJoined);
        clientRef.current.on('user-left', handleUserLeft);

        console.log('✅ Agora 클라이언트 초기화 완료');
      } catch (error) {
        console.error('❌ Agora 초기화 실패:', error);
      }
    };

    initializeAgora();

    return () => {
      leaveChannel();
    };
  }, [isOpen]);

  const handleUserJoined = (user) => {
    console.log('👤 사용자 입장:', user.uid);
  };

  const handleUserLeft = (user, reason) => {
    console.log('👋 사용자 퇴장:', user.uid, reason);
    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
  };

  const handleUserPublished = async (user, mediaType) => {
    console.log('📺 사용자 미디어 퍼블리시:', user.uid, mediaType);
    
    await clientRef.current.subscribe(user, mediaType);
    
    if (mediaType === 'video') {
      setRemoteUsers(prev => {
        const existingUser = prev.find(u => u.uid === user.uid);
        if (existingUser) {
          return prev.map(u => u.uid === user.uid ? { ...u, videoTrack: user.videoTrack } : u);
        } else {
          return [...prev, { uid: user.uid, videoTrack: user.videoTrack, audioTrack: null }];
        }
      });
    }
    
    if (mediaType === 'audio') {
      setRemoteUsers(prev => {
        const existingUser = prev.find(u => u.uid === user.uid);
        if (existingUser) {
          return prev.map(u => u.uid === user.uid ? { ...u, audioTrack: user.audioTrack } : u);
        } else {
          return [...prev, { uid: user.uid, videoTrack: null, audioTrack: user.audioTrack }];
        }
      });
      
      // 오디오 자동 재생
      user.audioTrack.play();
    }
  };

  const handleUserUnpublished = (user, mediaType) => {
    console.log('📴 사용자 미디어 언퍼블리시:', user.uid, mediaType);
    
    if (mediaType === 'video') {
      setRemoteUsers(prev => 
        prev.map(u => u.uid === user.uid ? { ...u, videoTrack: null } : u)
      );
    }
  };

  const joinChannel = async () => {
    if (!clientRef.current) return;
    
    setIsLoading(true);
    
    try {
      // 토큰 요청
      console.log('🎫 Agora 토큰 요청 중:', { channelName, userId });
      const token = await requestAgoraToken(channelName, userId, 'publisher');
      
      // 채널 입장
      console.log('🔗 Agora 채널 입장 시도:', { channelName, userId });
      await clientRef.current.join(APP_ID, channelName, token, userId);
      console.log('✅ 채널 입장 성공:', channelName);

      // 로컬 오디오/비디오 트랙 생성
      if (isMicOn) {
        localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
      }
      
      if (isCameraOn) {
        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack();
        // 로컬 비디오 표시
        if (localVideoContainerRef.current) {
          localVideoTrackRef.current.play(localVideoContainerRef.current);
        }
      }

      // 로컬 트랙 퍼블리시
      const tracks = [];
      if (localAudioTrackRef.current) tracks.push(localAudioTrackRef.current);
      if (localVideoTrackRef.current) tracks.push(localVideoTrackRef.current);
      
      if (tracks.length > 0) {
        await clientRef.current.publish(tracks);
        console.log('✅ 로컬 트랙 퍼블리시 완료');
      }

      setIsJoined(true);
    } catch (error) {
      console.error('❌ 채널 입장 실패:', error);
      alert('화상회의 참여에 실패했습니다: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const leaveChannel = async () => {
    if (!clientRef.current) return;

    try {
      // 로컬 트랙 정리
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      // 채널 떠나기
      await clientRef.current.leave();
      console.log('✅ 채널 퇴장 완료');
      
      setIsJoined(false);
      setRemoteUsers([]);
    } catch (error) {
      console.error('❌ 채널 퇴장 실패:', error);
    }
  };

  const toggleMic = async () => {
    if (!localAudioTrackRef.current && isMicOn) return;
    
    if (isMicOn) {
      // 마이크 끄기
      if (localAudioTrackRef.current) {
        await localAudioTrackRef.current.setEnabled(false);
      }
    } else {
      // 마이크 켜기
      if (!localAudioTrackRef.current) {
        localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
        await clientRef.current.publish(localAudioTrackRef.current);
      } else {
        await localAudioTrackRef.current.setEnabled(true);
      }
    }
    
    setIsMicOn(!isMicOn);
  };

  const toggleCamera = async () => {
    if (!localVideoTrackRef.current && isCameraOn) return;
    
    if (isCameraOn) {
      // 카메라 끄기
      if (localVideoTrackRef.current) {
        await localVideoTrackRef.current.setEnabled(false);
      }
    } else {
      // 카메라 켜기
      if (!localVideoTrackRef.current) {
        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack();
        if (localVideoContainerRef.current) {
          localVideoTrackRef.current.play(localVideoContainerRef.current);
        }
        await clientRef.current.publish(localVideoTrackRef.current);
      } else {
        await localVideoTrackRef.current.setEnabled(true);
      }
    }
    
    setIsCameraOn(!isCameraOn);
  };

  // 원격 사용자 비디오 컨테이너 ref 효과
  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack) {
        const container = document.getElementById(`remote-video-${user.uid}`);
        if (container) {
          user.videoTrack.play(container);
        }
      }
    });
  }, [remoteUsers]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h2 style={{ color: 'white', margin: 0 }}>
          화상회의 - {channelName}
        </h2>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          나가기
        </button>
      </div>

      {/* 비디오 영역 */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '10px',
          padding: '20px',
          overflow: 'auto'
        }}
      >
        {/* 내 비디오 */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#333',
            borderRadius: '10px',
            overflow: 'hidden',
            aspectRatio: '16/9'
          }}
        >
          <div
            ref={localVideoContainerRef}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: isCameraOn ? 'transparent' : '#555'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '5px 10px',
              borderRadius: '15px',
              fontSize: '14px'
            }}
          >
            {username} (나)
          </div>
          {!isCameraOn && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                fontSize: '48px'
              }}
            >
              📷
            </div>
          )}
        </div>

        {/* 원격 사용자들 비디오 */}
        {remoteUsers.map(user => (
          <div
            key={user.uid}
            style={{
              position: 'relative',
              backgroundColor: '#333',
              borderRadius: '10px',
              overflow: 'hidden',
              aspectRatio: '16/9'
            }}
          >
            <div
              id={`remote-video-${user.uid}`}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: user.videoTrack ? 'transparent' : '#555'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                color: 'white',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: '5px 10px',
                borderRadius: '15px',
                fontSize: '14px'
              }}
            >
              사용자 {user.uid}
            </div>
            {!user.videoTrack && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  fontSize: '48px'
                }}
              >
                👤
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 컨트롤 버튼 */}
      <div
        style={{
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)'
        }}
      >
        {!isJoined ? (
          <button
            onClick={joinChannel}
            disabled={isLoading}
            style={{
              padding: '15px 30px',
              backgroundColor: isLoading ? '#666' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isLoading ? '참여 중...' : '회의 참여'}
          </button>
        ) : (
          <>
            <button
              onClick={toggleMic}
              style={{
                padding: '15px',
                backgroundColor: isMicOn ? '#4CAF50' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              {isMicOn ? '🎤' : '🔇'}
            </button>
            
            <button
              onClick={toggleCamera}
              style={{
                padding: '15px',
                backgroundColor: isCameraOn ? '#4CAF50' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              {isCameraOn ? '📹' : '📷'}
            </button>
            
            <button
              onClick={leaveChannel}
              style={{
                padding: '15px 30px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              회의 종료
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoConference;