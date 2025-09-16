import React, { useState, useEffect, useRef, useMemo } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { getAreaTypeAtPoint } from '../utils/privateAreaUtils';
import { useAuth } from '../contexts/AuthContext';
import { useEffect as useSocketEffect } from 'react';

const IntegratedVideoBar = ({ 
  currentMap, 
  userId, 
  username,
  userPosition,
  isEnabled = true,
  socket
}) => {
  const { token } = useAuth();
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
  const [userMapping, setUserMapping] = useState({}); // UID -> username 매핑
  
  const screenShareTrackRef = useRef(null);
  
  // 참조
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localVideoContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Agora 설정
  const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '4fdc24d11417437785bfc1d7ddb78c96';

  // username을 숫자 UID로 변환하는 함수
  const generateUidFromUsername = (username) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      const char = username.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return Math.abs(hash) % 1000000000; // 항상 양수이고 10억 미만
  };

  // 현재 사용자가 있는 영역 정보 계산
  const currentAreaInfo = useMemo(() => {
    if (!currentMap || !userPosition) return { type: 'public', id: null };
    
    const areaType = getAreaTypeAtPoint(userPosition, currentMap.privateAreas);
    
    // 개인 영역인 경우 해당 영역의 ID 찾기
    let areaId = null;
    if (areaType === 'private' && currentMap.privateAreas) {
      const area = currentMap.privateAreas.find(area => {
        const normalizedArea = {
          position: area.position || area.start,
          size: area.size || {
            width: area.end.x - area.start.x,
            height: area.end.y - area.start.y
          }
        };
        return userPosition.x >= normalizedArea.position.x && 
               userPosition.x <= normalizedArea.position.x + normalizedArea.size.width &&
               userPosition.y >= normalizedArea.position.y && 
               userPosition.y <= normalizedArea.position.y + normalizedArea.size.height;
      });
      areaId = area?.id || area?.name || 'unknown';
    }
    
    return { type: areaType, id: areaId };
  }, [currentMap, userPosition]);

  // 영역별 채널명 생성
  const channelName = useMemo(() => {
    if (!currentMap || !currentAreaInfo) return null;
    
    let baseChannelName;
    if (currentMap.creatorId && currentMap.creatorMapIndex) {
      baseChannelName = `creator_${currentMap.creatorId}_map_${currentMap.creatorMapIndex}`;
    } else {
      baseChannelName = `metaverse_map_${currentMap.id}`;
    }
    
    // 영역별로 채널 분리
    if (currentAreaInfo.type === 'private' && currentAreaInfo.id) {
      return `${baseChannelName}_private_${currentAreaInfo.id}`;
    } else {
      return `${baseChannelName}_public`;
    }
  }, [currentMap, currentAreaInfo]);

  // 토큰 요청 함수
  const requestAgoraToken = async (channelName, userId, role = 'publisher') => {
    try {
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
    console.log('👤 사용자 발행 이벤트:', { uid: user.uid, mediaType, user });
    await clientRef.current.subscribe(user, mediaType);
    
    // 즉시 Socket.io로 해당 사용자의 정보 요청
    if (socket && !userMapping[user.uid]) {
      console.log('🔍 사용자 정보 요청:', user.uid);
      socket.emit('request-specific-video-user', { uid: user.uid, channelName });
    }
    
    if (mediaType === 'video') {
      setRemoteUsers(prev => {
        const existingUser = prev.find(u => u.uid === user.uid);
        if (existingUser) {
          return prev.map(u => u.uid === user.uid ? { ...u, videoTrack: user.videoTrack } : u);
        }
        console.log('➕ 새 비디오 사용자 추가:', user.uid);
        return [...prev, { uid: user.uid, videoTrack: user.videoTrack, audioTrack: null }];
      });
    }
    
    if (mediaType === 'audio') {
      setRemoteUsers(prev => {
        const existingUser = prev.find(u => u.uid === user.uid);
        if (existingUser) {
          return prev.map(u => u.uid === user.uid ? { ...u, audioTrack: user.audioTrack } : u);
        }
        console.log('🎵 새 오디오 사용자 추가:', user.uid);
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
    console.log('🎥 joinChannel 시작:', { 
      hasClient: !!clientRef.current, 
      channelName, 
      userId, 
      isMicOn, 
      isCameraOn 
    });

    if (!clientRef.current || !channelName) {
      console.log('❌ joinChannel 중단: client 또는 channelName 없음');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('🎫 토큰 요청 중...');
      const token = await requestAgoraToken(channelName, userId, 'publisher');
      console.log('✅ 토큰 요청 성공');

      // username을 기반으로 한 고유한 숫자 UID 생성
      const numericUid = username ? generateUidFromUsername(username) : Date.now() % 1000000000;
      console.log('🚪 Agora 채널 입장 중...', { channelName, numericUid, username, originalUserId: userId });
      
      // 사용자 매핑 정보 저장
      setUserMapping(prev => ({
        ...prev,
        [numericUid]: username || `사용자${userId}`
      }));
      
      await clientRef.current.join(APP_ID, channelName, token, numericUid);
      console.log('✅ Agora 채널 입장 성공 - 내 UID:', numericUid, '내 username:', username);

      // 즉시 내 정보 브로드캐스트 (3번 반복으로 확실히)
      const broadcastMyInfo = () => {
        const infoData = {
          channelName,
          uid: numericUid,
          username,
          userId
        };
        console.log('📤 내 정보 브로드캐스트 (즉시):', infoData);
        if (socket) {
          socket.emit('video-user-info', infoData);
        }
      };
      
      // 여러 번 브로드캐스트로 확실히 전달
      broadcastMyInfo();
      setTimeout(broadcastMyInfo, 500);
      setTimeout(broadcastMyInfo, 1000);

      // 로컬 트랙 생성
      console.log('📹 로컬 트랙 생성 시작...');
      if (isMicOn) {
        console.log('🎤 마이크 트랙 생성 중...');
        localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
        console.log('✅ 마이크 트랙 생성 완료');
      }
      
      if (isCameraOn) {
        console.log('📷 카메라 트랙 생성 중...');
        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: "480p_1"
        });
        console.log('✅ 카메라 트랙 생성 완료');
        
        // 약간의 지연 후 재생 시도
        setTimeout(() => {
          if (localVideoContainerRef.current && localVideoTrackRef.current) {
            console.log('📺 로컬 비디오 재생 시작...');
            try {
              localVideoTrackRef.current.play(localVideoContainerRef.current);
              console.log('✅ 로컬 비디오 재생 완료');
            } catch (error) {
              console.error('❌ 로컬 비디오 재생 실패:', error);
            }
          } else {
            console.log('❌ 로컬 비디오 컨테이너 또는 트랙을 찾을 수 없음');
          }
        }, 100);
      }

      // 트랙 퍼블리시
      const tracks = [];
      if (localAudioTrackRef.current) tracks.push(localAudioTrackRef.current);
      if (localVideoTrackRef.current) tracks.push(localVideoTrackRef.current);
      
      console.log('📡 트랙 퍼블리시 중...', { trackCount: tracks.length });
      if (tracks.length > 0) {
        await clientRef.current.publish(tracks);
        console.log('✅ 트랙 퍼블리시 완료');
      }

      setIsJoined(true);
      console.log('✅ 자동 화상회의 참여 완료:', channelName);
    } catch (error) {
      console.error('❌ 채널 입장 실패:', error);
      console.error('❌ 에러 상세:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 채널 떠나기
  const leaveChannel = async () => {
    if (!clientRef.current) return;

    try {
      console.log('🚪 채널 퇴장 시작...');
      
      // 화면 공유 트랙 정리
      if (screenShareTrackRef.current) {
        try {
          await clientRef.current.unpublish(screenShareTrackRef.current);
          screenShareTrackRef.current.close();
          screenShareTrackRef.current = null;
          setIsScreenSharing(false);
        } catch (error) {
          console.log('화면 공유 트랙 정리 중 오류:', error);
        }
      }

      // 오디오 트랙 정리
      if (localAudioTrackRef.current) {
        try {
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
        } catch (error) {
          console.log('오디오 트랙 정리 중 오류:', error);
        }
      }
      
      // 비디오 트랙 정리
      if (localVideoTrackRef.current) {
        try {
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        } catch (error) {
          console.log('비디오 트랙 정리 중 오류:', error);
        }
      }

      // 클라이언트 연결 해제
      if (clientRef.current.connectionState !== 'DISCONNECTED') {
        await clientRef.current.leave();
        console.log('✅ Agora 채널 퇴장 완료');
      }
      
      setIsJoined(false);
      setRemoteUsers([]);
    } catch (error) {
      console.error('❌ 채널 퇴장 실패:', error);
      // 에러가 발생해도 상태는 정리
      setIsJoined(false);
      setRemoteUsers([]);
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
        // 화면 공유 중지 - 카메라 다시 켜기
        console.log('🖥️ 화면 공유 중지 중...');
        
        if (screenShareTrackRef.current) {
          await clientRef.current.unpublish(screenShareTrackRef.current);
          screenShareTrackRef.current.close();
          screenShareTrackRef.current = null;
        }
        
        // 카메라 비디오 다시 시작
        if (isCameraOn && !localVideoTrackRef.current) {
          console.log('📷 카메라 비디오 재시작...');
          localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack();
          if (localVideoContainerRef.current) {
            localVideoTrackRef.current.play(localVideoContainerRef.current);
          }
          await clientRef.current.publish(localVideoTrackRef.current);
        }
        
        setIsScreenSharing(false);
        console.log('✅ 화면 공유 중지 완료');
      } else {
        // 화면 공유 시작 - 기존 비디오 트랙 먼저 제거
        console.log('🖥️ 화면 공유 시작 중...');
        
        // 기존 카메라 비디오 트랙 언퍼블리시
        if (localVideoTrackRef.current) {
          console.log('📷 카메라 비디오 언퍼블리시...');
          await clientRef.current.unpublish(localVideoTrackRef.current);
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        }
        
        // 화면 공유 시작
        console.log('🖥️ 화면 공유 트랙 생성...');
        screenShareTrackRef.current = await AgoraRTC.createScreenVideoTrack();
        
        // 화면 공유를 로컬 비디오 컨테이너에 표시
        if (localVideoContainerRef.current) {
          screenShareTrackRef.current.play(localVideoContainerRef.current);
        }
        
        await clientRef.current.publish(screenShareTrackRef.current);
        
        setIsScreenSharing(true);
        console.log('✅ 화면 공유 시작 완료');
      }
    } catch (error) {
      console.error('❌ 화면 공유 오류:', error);
      setIsScreenSharing(false);
    }
  };

  // 자동 입장 상태 관리
  const [isInitializing, setIsInitializing] = useState(false);

  // 맵이나 영역 변경 시 자동 재입장
  useEffect(() => {
    if (!isEnabled || !currentMap || !userId || !channelName || !userPosition) return;
    if (isInitializing) return; // 이미 초기화 중인 경우 무시

    const autoJoinChannel = async () => {
      console.log(`🎥 영역 변경 감지 - 새 채널로 이동: ${channelName}`);
      console.log(`📍 현재 영역: ${currentAreaInfo.type}${currentAreaInfo.id ? ` (${currentAreaInfo.id})` : ''}`);
      
      setIsInitializing(true);
      
      try {
        // 기존 연결이 있으면 완전히 정리
        if (clientRef.current && isJoined) {
          console.log('🔄 기존 채널 연결 정리 중...');
          await leaveChannel();
          // 잠시 대기하여 완전히 정리될 시간 확보
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await initializeAgora();
        await joinChannel();
      } catch (error) {
        console.error('자동 입장 중 오류:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    const timeoutId = setTimeout(autoJoinChannel, 100); // 약간의 지연

    return () => {
      clearTimeout(timeoutId);
      if (!isInitializing) {
        leaveChannel();
      }
    };
  }, [currentMap?.id, channelName, isEnabled, userPosition]);

  // 로컬 비디오 재생 확인
  useEffect(() => {
    if (isJoined && localVideoTrackRef.current && localVideoContainerRef.current) {
      if (!isScreenSharing) {
        console.log('🔄 로컬 비디오 재연결 시도...');
        try {
          localVideoTrackRef.current.play(localVideoContainerRef.current);
          console.log('✅ 로컬 비디오 재연결 성공');
        } catch (error) {
          console.error('❌ 로컬 비디오 재연결 실패:', error);
        }
      }
    }
  }, [isJoined, isCameraOn, isScreenSharing]);

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

  // Socket.io를 통한 사용자 정보 동기화
  useEffect(() => {
    if (!socket || !channelName) return;

    // 내 정보를 다른 사용자들에게 브로드캐스트
    const broadcastMyInfo = () => {
      if (isJoined) {
        const myUid = generateUidFromUsername(username);
        const infoData = {
          channelName,
          uid: myUid,
          username,
          userId
        };
        console.log('📤 내 정보 브로드캐스트:', infoData);
        socket.emit('video-user-info', infoData);
      }
    };

    // 다른 사용자의 정보 수신
    const handleVideoUserInfo = (data) => {
      console.log('📹 사용자 정보 수신:', data, 'channelName:', channelName);
      if (data.channelName === channelName && data.uid !== generateUidFromUsername(username)) {
        console.log('✅ 사용자 매핑 추가:', data.uid, '→', data.username);
        setUserMapping(prev => {
          const newMapping = {
            ...prev,
            [data.uid]: data.username
          };
          console.log('🗺️ 새로운 매핑 상태:', newMapping);
          return newMapping;
        });
      }
    };

    // 특정 사용자 정보 요청 처리
    const handleSpecificUserRequest = (data) => {
      if (data.channelName === channelName && data.uid === generateUidFromUsername(username)) {
        console.log('📞 특정 사용자 정보 요청 받음:', data.uid);
        broadcastMyInfo();
      }
    };

    // 사용자 정보 요청
    const requestUserInfos = () => {
      socket.emit('request-video-users', { channelName });
    };

    // 내 정보를 주기적으로 브로드캐스트
    broadcastMyInfo();
    const broadcastInterval = setInterval(broadcastMyInfo, 5000);
    
    // 처음 입장 시 다른 사용자 정보 요청
    requestUserInfos();

    socket.on('video-user-info', handleVideoUserInfo);
    socket.on('request-specific-video-user', handleSpecificUserRequest);
    
    // 다른 사용자가 내 정보를 요청할 때 응답
    socket.on('request-video-user-info', () => {
      console.log('📞 다른 사용자가 내 정보 요청함');
      broadcastMyInfo();
    });

    return () => {
      clearInterval(broadcastInterval);
      socket.off('video-user-info', handleVideoUserInfo);
      socket.off('request-specific-video-user', handleSpecificUserRequest);
      socket.off('request-video-user-info');
    };
  }, [socket, channelName, isJoined, username, userId]);

  // 자동 숨김 기능 제거 - 이제 수동 토글만 사용

  if (!isEnabled || !currentMap) {
    console.log('🎥 IntegratedVideoBar 렌더링 안됨:', { isEnabled, currentMap: !!currentMap, userPosition: !!userPosition });
    return null;
  }

  console.log('🎥 IntegratedVideoBar 렌더링:', { 
    channelName, 
    currentAreaInfo, 
    userPosition, 
    isJoined, 
    isCameraOn,
    isScreenSharing,
    hasLocalVideoTrack: !!localVideoTrackRef.current,
    hasLocalVideoContainer: !!localVideoContainerRef.current,
    totalParticipants: (isJoined ? 1 : 0) + remoteUsers.length 
  });

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
        transform: isBarVisible ? 'translateY(0)' : 'translateY(calc(100% - 50px))',
        transition: 'transform 0.3s ease-in-out',
        pointerEvents: 'auto'
      }}
    >
      {/* 화상회의 히든 상태일 때 토글 버튼 */}
      {!isBarVisible && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: '20px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <button
            onClick={() => setIsBarVisible(true)}
            style={{
              padding: '8px',
              backgroundColor: 'rgba(76, 175, 80, 0.8)',
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
              transition: 'all 0.2s',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}
            title="화상회의 보이기"
          >
            👁️
          </button>
        </div>
      )}
      
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
            {/* 현재 영역 정보 */}
            <div
              style={{
                backgroundColor: currentAreaInfo.type === 'private' 
                  ? 'rgba(255, 193, 7, 0.8)' 
                  : 'rgba(76, 175, 80, 0.8)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '15px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>{currentAreaInfo.type === 'private' ? '🔒' : '🌍'}</span>
              {currentAreaInfo.type === 'private' 
                ? `개인 영역 ${currentAreaInfo.id || ''}`
                : '공용 영역'
              }
            </div>

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

            {/* 화상회의 숨김/보이기 토글 */}
            <button
              onClick={() => setIsBarVisible(!isBarVisible)}
              style={{
                padding: '8px',
                backgroundColor: isBarVisible ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)',
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
              title={isBarVisible ? '화상회의 숨기기' : '화상회의 보이기'}
            >
              {isBarVisible ? '👁️' : '🙈'}
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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '120px',
                  height: '90px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '3px solid #4CAF50',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)'
                }}
              >
              <div
                ref={localVideoContainerRef}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: (isCameraOn || isScreenSharing) ? 'transparent' : '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* 로컬 비디오가 없을 때 디버깅 메시지 */}
                {!isCameraOn && !isScreenSharing && (
                  <div style={{ color: 'white', fontSize: '12px', textAlign: 'center' }}>
                    카메라 꺼짐
                  </div>
                )}
              </div>

              {/* 카메라 꺼짐 또는 화면 공유 아이콘 */}
              {(!isCameraOn && !isScreenSharing) && (
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
              
              {/* 내 이름 라벨 - 비디오 프레임 밖에 위치 */}
              <div
                style={{
                  marginTop: '4px',
                  color: 'white',
                  backgroundColor: isScreenSharing 
                    ? 'rgba(255, 193, 7, 0.9)' 
                    : 'rgba(76, 175, 80, 0.9)',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {isScreenSharing ? '🖥️ 화면공유' : `나 (${username})`}
              </div>
            </div>
          )}

          {/* 원격 사용자들 비디오 */}
          {remoteUsers.map(user => (
            <div
              key={user.uid}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '120px',
                  height: '90px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.3)',
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
              
              {/* 사용자 이름 - 비디오 프레임 밖에 위치 */}
              <div
                style={{
                  marginTop: '4px',
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
{(() => {
                  console.log('🔍 사용자 이름 표시 디버그:', { 
                    uid: user.uid, 
                    mappedName: userMapping[user.uid], 
                    allMappings: userMapping,
                    myUsername: username 
                  });
                  
                  // 우선순위: 매핑된 이름 > 일반적인 사용자명 추정 > UID 표시
                  if (userMapping[user.uid]) {
                    return userMapping[user.uid];
                  }
                  
                  // 매핑이 없으면 임시로 사용자 번호로 표시
                  const userNumber = String(user.uid).slice(-3); // 마지막 3자리만 사용
                  return `사용자${userNumber}`;
                })()}
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