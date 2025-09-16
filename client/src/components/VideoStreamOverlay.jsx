import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const VideoStreamOverlay = ({ 
  roomId, 
  userId, 
  username,
  isVisible = true 
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
  const scrollContainerRef = useRef(null);

  // Agora 설정
  const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
  const TOKEN = null; // 개발용으로 null 사용, 프로덕션에서는 토큰 필요

  // Agora 채널명 생성
  const generateChannelName = (roomId) => {
    const channelName = `room_${roomId}`;
    return channelName.replace(/[^a-zA-Z0-9\s!#$%&()+\-:;<=>?@\[\]^_{|}~,]/g, '_');
  };

  const channelName = generateChannelName(roomId);

  // Agora 초기화 및 자동 참여
  useEffect(() => {
    if (!isVisible || !APP_ID) return;

    const initializeAndJoin = async () => {
      try {
        // Agora 클라이언트 초기화
        clientRef.current = AgoraRTC.createClient({
          mode: 'rtc',
          codec: 'vp8'
        });

        // 이벤트 리스너 등록
        clientRef.current.on('user-published', handleUserPublished);
        clientRef.current.on('user-unpublished', handleUserUnpublished);
        clientRef.current.on('user-joined', handleUserJoined);
        clientRef.current.on('user-left', handleUserLeft);

        console.log('✅ Agora 클라이언트 초기화 완료');
        
        // 자동으로 채널 참여
        await joinChannel();
        
      } catch (error) {
        console.error('❌ Agora 초기화 및 참여 실패:', error);
      }
    };

    initializeAndJoin();

    return () => {
      leaveChannel();
    };
  }, [isVisible, roomId]);

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
    if (!clientRef.current || !APP_ID) {
      console.error('❌ Agora 클라이언트 또는 APP_ID가 없습니다.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 채널 입장
      console.log('🔗 Agora 채널 입장 시도:', { channelName, userId });
      await clientRef.current.join(APP_ID, channelName, TOKEN, userId);
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

  // 원격 사용자 비디오 재생
  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack) {
        const container = document.getElementById(`remote-video-overlay-${user.uid}`);
        if (container) {
          user.videoTrack.play(container);
        }
      }
    });
  }, [remoteUsers]);

  if (!isVisible || !APP_ID) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 'calc(100vw - 40px)',
        pointerEvents: 'auto'
      }}
    >
      {/* 비디오 스트림 리스트 */}
      <div
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '15px',
          backdropFilter: 'blur(10px)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent'
        }}
      >
        {/* 내 비디오 (가장 왼쪽) */}
        <div
          style={{
            position: 'relative',
            minWidth: '150px',
            width: '150px',
            height: '100px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <div
            ref={localVideoContainerRef}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: isCameraOn ? 'transparent' : 'rgba(255, 255, 255, 0.1)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '5px',
              left: '5px',
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '2px 6px',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 'bold'
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
                fontSize: '24px'
              }}
            >
              📷
            </div>
          )}
          {/* 마이크 상태 표시 */}
          <div
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              color: 'white',
              fontSize: '12px'
            }}
          >
            {isMicOn ? '🎤' : '🔇'}
          </div>
        </div>

        {/* 원격 사용자들 비디오 (오른쪽으로) */}
        {remoteUsers.map(user => (
          <div
            key={user.uid}
            style={{
              position: 'relative',
              minWidth: '150px',
              width: '150px',
              height: '100px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <div
              id={`remote-video-overlay-${user.uid}`}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: user.videoTrack ? 'transparent' : 'rgba(255, 255, 255, 0.1)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '5px',
                left: '5px',
                color: 'white',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 'bold'
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
                  fontSize: '24px'
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
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '10px',
          padding: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)'
        }}
      >
        {!isJoined ? (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: isLoading ? 'rgba(255, 255, 255, 0.2)' : 'rgba(76, 175, 80, 0.8)',
              color: 'white',
              borderRadius: '15px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {isLoading ? '참여 중...' : '화상회의 연결됨'}
          </div>
        ) : (
          <>
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
                minWidth: '32px',
                height: '32px'
              }}
            >
              {isMicOn ? '🎤' : '🔇'}
            </button>
            
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
                minWidth: '32px',
                height: '32px'
              }}
            >
              {isCameraOn ? '📹' : '📷'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoStreamOverlay;