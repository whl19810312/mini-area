import React, { useState, useEffect, useRef, useMemo } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const IntegratedVideoBar = ({ 
  currentMap, 
  userId, 
  username,
  isEnabled = true 
}) => {
  // 상태 관리
  const [isJoined, setIsJoined] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBarVisible, setIsBarVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioLevels, setAudioLevels] = useState({});
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const screenShareTrackRef = useRef(null);
  
  // 참조
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localVideoContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Agora 설정
  const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '4fdc24d11417437785bfc1d7ddb78c96';

  // 채널명 생성
  const channelName = useMemo(() => {
    if (!currentMap) return null;
    if (currentMap.creatorId && currentMap.creatorMapIndex) {
      return `creator_${currentMap.creatorId}_map_${currentMap.creatorMapIndex}`;
    }
    return `metaverse_map_${currentMap.id}`;
  }, [currentMap]);

  // 토큰 요청 함수
  const requestAgoraToken = async (channelName, userId, role = 'publisher') => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch('/api/agora/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ channelName, userId, role })
      });

      if (!response.ok) throw new Error(`Token request failed: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Token generation failed');

      return data.token;
    } catch (error) {
      console.error('❌ Agora 토큰 요청 실패:', error);
      throw error;
    }
  };

  // Agora 이벤트 핸들러
  const handleUserJoined = (user) => {
    console.log('👤 사용자 입장:', user.uid);
  };

  const handleUserLeft = (user, reason) => {
    console.log('👋 사용자 퇴장:', user.uid, reason);
    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
  };

  const handleUserPublished = async (user, mediaType) => {
    await clientRef.current.subscribe(user, mediaType);
    
    if (mediaType === 'video') {
      setRemoteUsers(prev => {
        const existingUser = prev.find(u => u.uid === user.uid);
        if (existingUser) {
          return prev.map(u => u.uid === user.uid ? { ...u, videoTrack: user.videoTrack } : u);
        }
        return [...prev, { uid: user.uid, videoTrack: user.videoTrack, audioTrack: null }];
      });
    }
    
    if (mediaType === 'audio') {
      setRemoteUsers(prev => {
        const existingUser = prev.find(u => u.uid === user.uid);
        if (existingUser) {
          return prev.map(u => u.uid === user.uid ? { ...u, audioTrack: user.audioTrack } : u);
        }
        return [...prev, { uid: user.uid, videoTrack: null, audioTrack: user.audioTrack }];
      });
      user.audioTrack.play();
    }
  };

  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === 'video') {
      setRemoteUsers(prev => 
        prev.map(u => u.uid === user.uid ? { ...u, videoTrack: null } : u)
      );
    }
  };

  // Agora 초기화
  const initializeAgora = async () => {
    try {
      if (clientRef.current) await clientRef.current.leave();

      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current.on('user-published', handleUserPublished);
      clientRef.current.on('user-unpublished', handleUserUnpublished);
      clientRef.current.on('user-joined', handleUserJoined);
      clientRef.current.on('user-left', handleUserLeft);

      console.log('✅ Agora 클라이언트 초기화 완료');
    } catch (error) {
      console.error('❌ Agora 초기화 실패:', error);
    }
  };

  // 채널 입장
  const joinChannel = async () => {
    if (!clientRef.current || !channelName) return;
    
    setIsLoading(true);
    
    try {
      const token = await requestAgoraToken(channelName, userId, 'publisher');
      await clientRef.current.join(APP_ID, channelName, token, userId);

      // 로컬 트랙 생성
      if (isMicOn) {
        localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
      }
      
      if (isCameraOn) {
        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack();
        if (localVideoContainerRef.current) {
          localVideoTrackRef.current.play(localVideoContainerRef.current);
        }
      }

      // 트랙 퍼블리시
      const tracks = [];
      if (localAudioTrackRef.current) tracks.push(localAudioTrackRef.current);
      if (localVideoTrackRef.current) tracks.push(localVideoTrackRef.current);
      
      if (tracks.length > 0) {
        await clientRef.current.publish(tracks);
      }

      setIsJoined(true);
      console.log('✅ 자동 화상회의 참여 완료:', channelName);
    } catch (error) {
      console.error('❌ 채널 입장 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 채널 떠나기
  const leaveChannel = async () => {
    if (!clientRef.current) return;

    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      await clientRef.current.leave();
      setIsJoined(false);
      setRemoteUsers([]);
    } catch (error) {
      console.error('❌ 채널 퇴장 실패:', error);
    }
  };

  // 마이크 토글
  const toggleMic = async () => {
    if (!localAudioTrackRef.current && isMicOn) return;
    
    if (isMicOn) {
      if (localAudioTrackRef.current) {
        await localAudioTrackRef.current.setEnabled(false);
      }
    } else {
      if (!localAudioTrackRef.current) {
        localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
        await clientRef.current.publish(localAudioTrackRef.current);
      } else {
        await localAudioTrackRef.current.setEnabled(true);
      }
    }
    setIsMicOn(!isMicOn);
  };

  // 카메라 토글
  const toggleCamera = async () => {
    if (!localVideoTrackRef.current && isCameraOn) return;
    
    if (isCameraOn) {
      if (localVideoTrackRef.current) {
        await localVideoTrackRef.current.setEnabled(false);
      }
    } else {
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

  // 화면 공유 토글
  const toggleScreenShare = async () => {
    if (!clientRef.current) return;

    try {
      if (isScreenSharing) {
        // 화면 공유 중지
        if (screenShareTrackRef.current) {
          await clientRef.current.unpublish(screenShareTrackRef.current);
          screenShareTrackRef.current.close();
          screenShareTrackRef.current = null;
        }
        setIsScreenSharing(false);
      } else {
        // 화면 공유 시작
        screenShareTrackRef.current = await AgoraRTC.createScreenVideoTrack();
        await clientRef.current.publish(screenShareTrackRef.current);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('화면 공유 오류:', error);
    }
  };

  // 맵 변경 시 자동 재입장
  useEffect(() => {
    if (!isEnabled || !currentMap || !userId) return;

    const autoJoinChannel = async () => {
      if (isJoined) await leaveChannel();
      await initializeAgora();
      await joinChannel();
    };

    autoJoinChannel();

    return () => {
      leaveChannel();
    };
  }, [currentMap?.id, isEnabled]);

  // 원격 사용자 비디오 렌더링
  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack) {
        const container = document.getElementById(`integrated-remote-video-${user.uid}`);
        if (container) {
          user.videoTrack.play(container);
        }
      }
    });
  }, [remoteUsers]);

  // 자동 숨김/보임 (마우스 이동 감지)
  useEffect(() => {
    let hideTimer;
    
    const handleMouseMove = () => {
      setIsBarVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!isExpanded) setIsBarVisible(false);
      }, 3000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimer);
    };
  }, [isExpanded]);

  if (!isEnabled || !currentMap) return null;

  const totalParticipants = (isJoined ? 1 : 0) + remoteUsers.length;
  const maxVisibleCameras = 5;
  const needsScroll = totalParticipants > maxVisibleCameras;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transform: isBarVisible ? 'translateY(0)' : 'translateY(80%)',
        transition: 'transform 0.3s ease-in-out',
        pointerEvents: isBarVisible ? 'auto' : 'none'
      }}
    >
      {/* 투명한 배경 바 */}
      <div
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6), rgba(0,0,0,0.3), transparent)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: isExpanded ? '200px' : '140px',
          transition: 'min-height 0.3s ease'
        }}
      >
        {/* 상단 컨트롤 바 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            maxWidth: '800px',
            marginBottom: '15px'
          }}
        >
          {/* 왼쪽: 참여자 수 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {totalParticipants > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(76, 175, 80, 0.8)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '15px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>🎥</span>
                {totalParticipants}명 참여 중
              </div>
            )}
            
            {isLoading && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 193, 7, 0.8)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '15px',
                  fontSize: '12px'
                }}
              >
                연결 중...
              </div>
            )}
          </div>

          {/* 오른쪽: 컨트롤 버튼들 */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            {/* 확장/축소 버튼 */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '14px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            >
              {isExpanded ? '⬇️' : '⬆️'}
            </button>

            {/* 마이크 버튼 */}
            {isJoined && (
              <button
                onClick={toggleMic}
                style={{
                  padding: '8px',
                  backgroundColor: isMicOn ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                {isMicOn ? '🎤' : '🔇'}
              </button>
            )}

            {/* 카메라 버튼 */}
            {isJoined && (
              <button
                onClick={toggleCamera}
                style={{
                  padding: '8px',
                  backgroundColor: isCameraOn ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                {isCameraOn ? '📹' : '📷'}
              </button>
            )}

            {/* 화면 공유 버튼 */}
            {isJoined && (
              <button
                onClick={toggleScreenShare}
                style={{
                  padding: '8px',
                  backgroundColor: isScreenSharing ? 'rgba(255, 193, 7, 0.8)' : 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title={isScreenSharing ? '화면 공유 중지' : '화면 공유 시작'}
              >
                🖥️
              </button>
            )}

            {/* 설정 버튼 */}
            {isJoined && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  padding: '8px',
                  backgroundColor: showSettings ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title="설정"
              >
                ⚙️
              </button>
            )}

            {/* 고정/숨김 토글 */}
            <button
              onClick={() => setIsBarVisible(!isBarVisible)}
              style={{
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '14px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            >
              📌
            </button>
          </div>
        </div>

        {/* 비디오 스트림 컨테이너 */}
        <div
          ref={scrollContainerRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '90vw',
            overflowX: needsScroll ? 'auto' : 'visible',
            padding: '0 10px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.3) transparent'
          }}
        >
          {/* 내 비디오 (항상 첫 번째, 중앙) */}
          {isJoined && (
            <div
              style={{
                position: 'relative',
                width: '120px',
                height: '90px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '3px solid #4CAF50',
                flexShrink: 0,
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)'
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
                  bottom: '6px',
                  left: '6px',
                  right: '6px',
                  color: 'white',
                  backgroundColor: 'rgba(76, 175, 80, 0.9)',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
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
                    fontSize: '24px',
                    textShadow: '0 1px 4px rgba(0,0,0,0.7)'
                  }}
                >
                  📷
                </div>
              )}

              {/* 마이크 상태 및 오디오 레벨 */}
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))'
                  }}
                >
                  {isMicOn ? '🎤' : '🔇'}
                </div>
                {isMicOn && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: audioLevels[userId] > 0.1 ? '#4CAF50' : 'rgba(255,255,255,0.3)',
                      borderRadius: '50%',
                      transition: 'background-color 0.2s'
                    }}
                  />
                )}
              </div>

              {/* 연결 품질 표시 */}
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  fontSize: '10px',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))'
                }}
              >
                {connectionQuality === 'good' ? '📶' : 
                 connectionQuality === 'medium' ? '📶' : '📵'}
              </div>
            </div>
          )}

          {/* 원격 사용자들 비디오 */}
          {remoteUsers.map(user => (
            <div
              key={user.uid}
              style={{
                position: 'relative',
                width: '120px',
                height: '90px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
              }}
            >
              <div
                id={`integrated-remote-video-${user.uid}`}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: user.videoTrack ? 'transparent' : '#333'
                }}
              />
              
              {/* 사용자 이름 */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  right: '6px',
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  textAlign: 'center',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
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
                    fontSize: '24px',
                    textShadow: '0 1px 4px rgba(0,0,0,0.7)'
                  }}
                >
                  👤
                </div>
              )}

              {/* 오디오 상태 및 레벨 */}
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))'
                  }}
                >
                  {user.audioTrack ? '🔊' : '🔇'}
                </div>
                {user.audioTrack && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: audioLevels[user.uid] > 0.1 ? '#4CAF50' : 'rgba(255,255,255,0.3)',
                      borderRadius: '50%',
                      transition: 'background-color 0.2s'
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 스크롤 힌트 */}
        {needsScroll && (
          <div
            style={{
              marginTop: '8px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>←</span>
            스크롤하여 더 많은 참여자 보기
            <span>→</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegratedVideoBar;