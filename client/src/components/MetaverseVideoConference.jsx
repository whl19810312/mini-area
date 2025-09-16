import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const MetaverseVideoConference = ({ 
  currentMap, 
  userId, 
  username,
  isEnabled = true 
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localVideoContainerRef = useRef(null);

  // Agora 설정
  const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '4fdc24d11417437785bfc1d7ddb78c96';

  // 채널명 생성 (생성자 ID와 맵 순서 기반)
  const generateChannelName = (map) => {
    if (!map || !map.creatorId || !map.creatorMapIndex) {
      return `metaverse_map_${map?.id || 'default'}`;
    }
    return `creator_${map.creatorId}_map_${map.creatorMapIndex}`;
  };

  const channelName = currentMap ? generateChannelName(currentMap) : null;

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

  // 맵 변경 시 자동으로 채널 변경
  useEffect(() => {
    if (!isEnabled || !currentMap || !userId) return;

    const initializeAgoraForMap = async () => {
      // 기존 연결이 있으면 정리
      if (isJoined) {
        await leaveChannel();
      }

      // 새 맵의 채널에 자동 입장
      await initializeAgora();
      await joinChannel();
    };

    initializeAgoraForMap();

    return () => {
      leaveChannel();
    };
  }, [currentMap?.id, isEnabled]);

  const initializeAgora = async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.leave();
      }

      clientRef.current = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8'
      });

      // 이벤트 리스너
      clientRef.current.on('user-published', handleUserPublished);
      clientRef.current.on('user-unpublished', handleUserUnpublished);
      clientRef.current.on('user-joined', handleUserJoined);
      clientRef.current.on('user-left', handleUserLeft);

      console.log('✅ Agora 클라이언트 초기화 완료');
    } catch (error) {
      console.error('❌ Agora 초기화 실패:', error);
    }
  };

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
    if (!clientRef.current || !channelName) return;
    
    setIsLoading(true);
    
    try {
      // 토큰 요청
      console.log('🎫 Agora 토큰 요청 중:', { channelName, userId });
      const token = await requestAgoraToken(channelName, userId, 'publisher');
      
      // 채널 입장
      console.log('🔗 Agora 채널 입장 시도:', { channelName, userId });
      await clientRef.current.join(APP_ID, channelName, token, userId);
      console.log('✅ 채널 입장 성공:', channelName);

      // 로컬 오디오 트랙 생성 (자동 활성화)
      if (isMicOn) {
        localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
      }
      
      // 로컬 비디오 트랙 생성 (자동 활성화)
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

  // 원격 사용자 비디오 렌더링
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

  if (!isEnabled || !currentMap) return null;

  // 전체 참여자 수 (자신 + 원격 사용자들)
  const totalParticipants = (isJoined ? 1 : 0) + remoteUsers.length;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: 'none' // 게임 조작을 방해하지 않도록
      }}
    >
      {/* 투명한 하단 바 */}
      <div
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.4), transparent)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          minHeight: '120px',
          pointerEvents: 'auto'
        }}
      >
        {/* 비디오 스트림 컨테이너 */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
            maxWidth: '90vw',
            overflow: 'auto'
          }}
        >
          {/* 내 비디오 (항상 첫 번째) */}
          {isJoined && (
            <div
              style={{
                position: 'relative',
                width: isMinimized ? '80px' : '160px',
                height: isMinimized ? '60px' : '120px',
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid #4CAF50',
                flexShrink: 0,
                transition: 'all 0.3s ease'
              }}
            >
              <div
                ref={localVideoContainerRef}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: isCameraOn ? 'transparent' : '#333'
                }}
              />
              
              {/* 내 이름 라벨 */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '5px',
                  left: '5px',
                  right: '5px',
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: isMinimized ? '10px' : '12px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                나 ({username})
              </div>

              {/* 카메라 꺼짐 아이콘 */}
              {!isCameraOn && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: isMinimized ? '20px' : '30px'
                  }}
                >
                  📷
                </div>
              )}

              {/* 마이크 상태 아이콘 */}
              <div
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  fontSize: isMinimized ? '12px' : '16px'
                }}
              >
                {isMicOn ? '🎤' : '🔇'}
              </div>
            </div>
          )}

          {/* 원격 사용자들 비디오 */}
          {remoteUsers.map(user => (
            <div
              key={user.uid}
              style={{
                position: 'relative',
                width: isMinimized ? '80px' : '160px',
                height: isMinimized ? '60px' : '120px',
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
                transition: 'all 0.3s ease'
              }}
            >
              <div
                id={`remote-video-${user.uid}`}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: user.videoTrack ? 'transparent' : '#333'
                }}
              />
              
              {/* 사용자 이름 라벨 */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '5px',
                  left: '5px',
                  right: '5px',
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: isMinimized ? '10px' : '12px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                사용자 {user.uid}
              </div>

              {/* 비디오 꺼짐 아이콘 */}
              {!user.videoTrack && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: isMinimized ? '20px' : '30px'
                  }}
                >
                  👤
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 컨트롤 버튼들 */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}
        >
          {/* 참여자 수 표시 */}
          {totalParticipants > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              👥 {totalParticipants}
            </div>
          )}

          {/* 최소화/최대화 버튼 */}
          {isJoined && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                padding: '10px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isMinimized ? '🔍' : '📐'}
            </button>
          )}

          {/* 마이크 토글 */}
          {isJoined && (
            <button
              onClick={toggleMic}
              style={{
                padding: '10px',
                backgroundColor: isMicOn ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isMicOn ? '🎤' : '🔇'}
            </button>
          )}

          {/* 카메라 토글 */}
          {isJoined && (
            <button
              onClick={toggleCamera}
              style={{
                padding: '10px',
                backgroundColor: isCameraOn ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isCameraOn ? '📹' : '📷'}
            </button>
          )}

          {/* 연결 상태 표시 */}
          {!isJoined && isLoading && (
            <div
              style={{
                backgroundColor: 'rgba(255,193,7,0.8)',
                color: 'white',
                padding: '10px 15px',
                borderRadius: '20px',
                fontSize: '14px'
              }}
            >
              연결 중...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetaverseVideoConference;