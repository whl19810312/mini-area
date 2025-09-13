import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from 'mediasoup-client';
import './AreaVideoCallUI.css';
import zoneColorManager from '../utils/zoneColorManager';

const AreaVideoCallUI = ({ socket, currentArea, isVisible }) => {
  const [videoSession, setVideoSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [zoneColor, setZoneColor] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // 다른 사용자들의 스트림
  const [mediasoupDevice, setMediasoupDevice] = useState(null); // MediaSoup Device
  const [sendTransport, setSendTransport] = useState(null); // Producer Transport
  const [receiveTransport, setReceiveTransport] = useState(null); // Consumer Transport
  const [producers, setProducers] = useState(new Map()); // Local media producers
  const [consumers, setConsumers] = useState(new Map()); // Remote media consumers
  const [isConnecting, setIsConnecting] = useState(false); // MediaSoup 연결 상태 추적
  const [pendingConsumers, setPendingConsumers] = useState([]); // 대기 중인 Consumer 생성 요청들
  const [userNames, setUserNames] = useState(new Map()); // userId -> username 매핑
  const [pendingProducers, setPendingProducers] = useState(new Set()); // 대기 중인 Producer 생성 요청들 (video, audio)
  const videoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map()); // 원격 비디오 엘리먼트들

  // 로컬 카메라 시작
  const startLocalCamera = async () => {
    try {
      // 더 간단한 constraints로 시작하여 호환성 향상
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 200 },
          height: { ideal: 150 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // SSRC 문제 해결을 위해 더 호환성 높은 설정 사용
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 },
          latency: { ideal: 0.02 } // 낮은 레이턴시 설정
        }
      });
      
      // 스트림 트랙 상태 로깅
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      console.log('📹 로컬 스트림 생성 완료:', {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoSettings: videoTracks[0]?.getSettings(),
        audioSettings: audioTracks[0]?.getSettings()
      });
      
      // 트랙 상태 변화 모니터링
      videoTracks.forEach((track, index) => {
        track.addEventListener('ended', () => {
          console.warn(`📹 비디오 트랙 ${index} ended 이벤트 발생`);
        });
        track.addEventListener('mute', () => {
          console.warn(`📹 비디오 트랙 ${index} muted 이벤트 발생`);
        });
      });
      
      audioTracks.forEach((track, index) => {
        track.addEventListener('ended', () => {
          console.warn(`📹 오디오 트랙 ${index} ended 이벤트 발생`);
        });
        track.addEventListener('mute', () => {
          console.warn(`📹 오디오 트랙 ${index} muted 이벤트 발생`);
        });
      });
      
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      console.log('📹 로컬 카메라 시작됨');
    } catch (error) {
      console.error('카메라 접근 실패:', error);
    }
  };

  // 로컬 카메라 정지
  const stopLocalCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      console.log('📹 로컬 카메라 정지됨');
    }
  };

  // 색상 기반 화상통화 시작 (같은 색상 캐릭터들끼리만)
  const startColorBasedVideoCall = async () => {
    if (!socket || !currentArea) return;
    
    setIsLoading(true);
    try {
      // 먼저 로컬 카메라 시작
      await startLocalCamera();
      
      socket.emit('start-color-based-video-call', {}, (response) => {
        setIsLoading(false);
        if (response.success) {
          setIsCallActive(true);
          setVideoSession(response.result);
          setParticipants(response.result.participants || []);
          console.log('🎨 색상 기반 화상통화 시작:', response.result);
        } else {
          console.error('색상 기반 화상통화 시작 실패:', response.error);
          stopLocalCamera(); // 실패 시 카메라 정지
        }
      });
    } catch (error) {
      setIsLoading(false);
      console.error('화상통화 시작 오류:', error);
      stopLocalCamera(); // 에러 시 카메라 정지
    }
  };

  // 영역 기반 화상통화 시작 (기존 방식 - 호환성 유지)
  const startVideoCall = async () => {
    if (!socket || !currentArea) return;
    
    setIsLoading(true);
    try {
      // 먼저 로컬 카메라 시작
      await startLocalCamera();
      
      socket.emit('start-area-video-call', {}, (response) => {
        setIsLoading(false);
        if (response.success) {
          setIsCallActive(true);
          setVideoSession(response.result);
          setParticipants(response.result.participants || []);
          console.log('📹 영역 화상통화 시작:', response.result);
        } else {
          console.error('화상통화 시작 실패:', response.error);
          stopLocalCamera(); // 실패 시 카메라 정지
        }
      });
    } catch (error) {
      setIsLoading(false);
      console.error('화상통화 시작 오류:', error);
      stopLocalCamera(); // 에러 시 카메라 정지
    }
  };

  // 영역 기반 화상통화 종료 (카메라는 유지)
  const endVideoCall = async () => {
    if (!socket) return;

    setIsLoading(true);
    try {
      socket.emit('end-area-video-call', {}, (response) => {
        setIsLoading(false);
        if (response.success) {
          setIsCallActive(false);
          setVideoSession(null);
          setParticipants([]);
          
          // MediaSoup 연결 정리
          cleanupMediaSoupConnections();
          
          console.log('📹 영역 화상통화 종료 (카메라 유지):', response.result);
        } else {
          console.error('화상통화 종료 실패:', response.error);
        }
      });
    } catch (error) {
      setIsLoading(false);
      console.error('화상통화 종료 오류:', error);
    }
  };

  // 현재 영역의 화상통화 세션 상태 확인
  const checkVideoSession = async () => {
    if (!socket) return;

    socket.emit('get-area-video-session', {}, (response) => {
      if (response.success) {
        const hasActiveSession = response.participants && response.participants.length > 0;
        setIsCallActive(hasActiveSession);
        setParticipants(response.participants || []);
        if (hasActiveSession) {
          setVideoSession({ areaKey: response.areaKey, participants: response.participants });
        }
      }
    });
  };

  // 컴포넌트 마운트 시 즉시 카메라 시작 (항상 보이도록)
  useEffect(() => {
    if (socket && !localStream) {
      console.log('📹 [항상표시] 컴포넌트 마운트 시 카메라 자동 시작');
      startLocalCamera().catch(error => {
        console.error('📹 [항상표시] 컴포넌트 마운트 시 카메라 시작 실패:', error);
      });
    }
  }, [socket]); // localStream을 의존성에서 제거하여 무한 루프 방지

  // 영역 변경 시 색상 업데이트
  useEffect(() => {
    if (currentArea && socket) {
      // 현재 영역의 색상 계산
      const currentZoneColor = zoneColorManager.getColorFromArea(currentArea);
      setZoneColor(currentZoneColor);
      
      console.log('🎯 [화상통화] 영역 변경 감지:', { 
        area: currentArea, 
        color: currentZoneColor 
      });
      
      // 기존 세션 확인만 수행 (자동 시작은 서버 감시 시스템이 처리)
      checkVideoSession();
    } else {
      // 영역을 벗어났을 때 상태 초기화 (단, 카메라는 유지)
      console.log('🎯 [화상통화] 영역 벗어남 - 상태 초기화 (카메라 유지)');
      setZoneColor(null);
      // 화상통화 종료는 서버 감시 시스템이 자동으로 처리
    }
  }, [currentArea?.type, currentArea?.id, socket]);

  // 소켓 이벤트 리스너 설정
  useEffect(() => {
    if (!socket) {
      console.log('📹 [DEBUG] 소켓이 없음');
      return;
    }
    
    console.log('📹 [DEBUG] 소켓 이벤트 리스너 설정 시작');
    
    // 테스트 이벤트 리스너
    socket.on('connect', () => {
      console.log('🔥 [SOCKET] 소켓 연결됨');
    });
    
    socket.on('disconnect', () => {
      console.log('🔥 [SOCKET] 소켓 연결 끊어짐');
    });

    // 영역 변경 알림
    const handleAreaChanged = (data) => {
      console.log('🌍 영역 변경 알림:', data);
      
      // 새로운 영역의 화상통화 상태 확인
      setTimeout(() => {
        checkVideoSession();
      }, 500); // 서버 처리 후 상태 확인
    };

    // 화상통화 상태 변경 알림
    const handleVideoCallChanged = (data) => {
      console.log('📹 화상통화 상태 변경:', data);
      const { areaKey, participants, eventType } = data;

      setParticipants(participants || []);

      switch (eventType) {
        case 'session-started':
          setIsCallActive(true);
          setVideoSession({ areaKey, participants });
          break;
        case 'session-ended':
          setIsCallActive(false);
          setVideoSession(null);
          break;
        case 'user-joined':
          setIsCallActive(true);
          setVideoSession({ areaKey, participants });
          break;
        case 'user-left':
          if (participants.length === 0) {
            setIsCallActive(false);
            setVideoSession(null);
          }
          break;
      }
    };

    // 자동 화상통화 시작 알림
    const handleAutoVideoCallStarted = async (data) => {
      console.log('📹 [자동시작] 영역 진입으로 인한 자동 화상통화 시작:', data);
      const { areaKey, areaId, participants, message } = data;
      
      try {
        // 자동으로 로컬 카메라 시작
        await startLocalCamera();
        
        // 화상통화 세션 상태 설정
        setIsCallActive(true);
        setVideoSession({ areaKey, areaId, participants });
        setParticipants(participants || []);
        
        // MediaSoup 연결 시작
        await startMediaSoupConnections(participants || []);
        
        console.log('📹 [자동시작] 화상통화 자동 참여 완료:', { areaId, participantCount: participants?.length });
      } catch (error) {
        console.error('📹 [자동시작] 자동 화상통화 참여 실패:', error);
      }
    };

    // 화상통화 업데이트 (참가자 변경 등)
    const handleVideoCallUpdate = (data) => {
      console.log('📹 [업데이트] 영역 화상통화 상태 업데이트:', data);
      const { areaKey, areaId, participants, isActive } = data;
      
      setParticipants(participants || []);
      if (isActive && participants && participants.length > 0) {
        setIsCallActive(true);
        setVideoSession({ areaKey, areaId, participants });
      }
    };

    // 화상통화 종료 알림 (카메라는 유지)
    const handleVideoCallEnded = (data) => {
      console.log('📹 [종료] 영역 화상통화 종료:', data);
      const { areaKey, reason } = data;
      
      setIsCallActive(false);
      setVideoSession(null);
      setParticipants([]);
      
      // MediaSoup 연결 정리
      cleanupMediaSoupConnections();
      
      console.log(`📹 [종료] 화상통화 종료됨 (카메라 유지): ${reason}`);
    };

    // 색상 기반 화상통화 시작 알림 (새로 추가)
    const handleColorBasedVideoCallStarted = (data) => {
      console.log('🎨 [색상화상통화] 시작 알림:', data);
      const { color, sessionKey, participants, message } = data;
      
      setIsCallActive(true);
      setVideoSession({ sessionKey, color, participants });
      setParticipants(participants || []);
      setZoneColor(color);
      
      // 자동으로 로컬 카메라 시작
      if (!localStream) {
        startLocalCamera().catch(error => {
          console.error('카메라 시작 실패:', error);
        });
      }
    };

    // 자동 영역 화상통화 시작 알림 (0.5초 감시 시스템)
    const handleAutoAreaVideoCallStarted = async (data) => {
      console.log('🎥 [자동시작] 영역 화상통화 시작 알림:', data);
      const { areaKey, participants, message } = data;
      
      try {
        // 자동으로 로컬 카메라 시작
        if (!localStream) {
          await startLocalCamera();
        }
        
        setIsCallActive(true);
        setVideoSession({ areaKey, participants });
        setParticipants(participants || []);
        
        // MediaSoup 연결 시작
        await startMediaSoupConnections(participants || []);
        
        console.log('🎥 [자동시작] 영역 화상통화 자동 참여 완료:', { areaKey, participantCount: participants?.length });
      } catch (error) {
        console.error('🎥 [자동시작] 자동 영역 화상통화 참여 실패:', error);
      }
    };

    // 자동 색상 화상통화 시작 알림 (0.5초 감시 시스템)
    const handleAutoColorVideoCallStarted = async (data) => {
      console.log('🎨 [자동시작] 색상 기반 화상통화 시작 알림:', data);
      const { color, sessionKey, participants, message } = data;
      
      try {
        // 자동으로 로컬 카메라 시작
        if (!localStream) {
          await startLocalCamera();
        }
        
        setIsCallActive(true);
        setVideoSession({ sessionKey, color, participants });
        setParticipants(participants || []);
        setZoneColor(color);
        
        // MediaSoup 연결 시작
        await startMediaSoupConnections(participants || []);
        
        console.log('🎨 [자동시작] 색상 기반 화상통화 자동 참여 완료:', { color, participantCount: participants?.length });
      } catch (error) {
        console.error('🎨 [자동시작] 자동 색상 화상통화 참여 실패:', error);
      }
    };

    // 자동 영역 화상통화 종료 알림 (카메라는 유지)
    const handleAutoAreaVideoCallEnded = (data) => {
      console.log('🎥 [자동종료] 영역 화상통화 종료 알림:', data);
      const { areaKey, participants, reason, message } = data;
      
      setIsCallActive(false);
      setVideoSession(null);
      setParticipants([]);
      
      // MediaSoup 연결 정리
      cleanupMediaSoupConnections();
      
      console.log(`🎥 [자동종료] 영역 화상통화 자동 종료됨 (카메라 유지): ${reason}`);
    };

    // 화상통화 참가자 변경 알림 (카메라는 유지)
    const handleVideoCallParticipantChanged = (data) => {
      console.log('👥 화상통화 참가자 변경 알림:', data);
      const { sessionKey, participants, added, removed, message } = data;
      
      setParticipants(participants || []);
      
      if (participants.length === 0) {
        setIsCallActive(false);
        setVideoSession(null);
        // 📹 카메라는 항상 유지 - stopLocalCamera() 제거
      }
      
      console.log(`👥 참가자 변경: 추가 ${added.length}명, 제거 ${removed.length}명 (카메라 유지)`);
    };

    // 개별 사용자 자동 영역 화상통화 참여 알림
    const handleUserAutoJoinedVideoCall = async (data) => {
      console.log('👤 [자동참여] 영역 화상통화 자동 참여 알림:', data);
      const { areaKey, participants, message } = data;
      
      try {
        // 카메라가 꺼져있으면 자동 시작
        if (!localStream) {
          await startLocalCamera();
        }
        
        setIsCallActive(true);
        setVideoSession({ areaKey, participants });
        setParticipants(participants || []);
        
        // MediaSoup 연결 시작
        await startMediaSoupConnections(participants || []);
        
        console.log('👤 [자동참여] 영역 화상통화 자동 참여 완료:', { areaKey, participantCount: participants?.length });
      } catch (error) {
        console.error('👤 [자동참여] 자동 참여 실패:', error);
      }
    };

    // 개별 사용자 자동 색상 화상통화 참여 알림
    const handleUserAutoJoinedColorVideoCall = async (data) => {
      console.log('🎨 [자동참여] 색상 화상통화 자동 참여 알림:', data);
      const { color, sessionKey, participants, message } = data;
      
      try {
        // 카메라가 꺼져있으면 자동 시작
        if (!localStream) {
          await startLocalCamera();
        }
        
        setIsCallActive(true);
        setVideoSession({ sessionKey, color, participants });
        setParticipants(participants || []);
        setZoneColor(color);
        
        // MediaSoup 연결 시작
        await startMediaSoupConnections(participants || []);
        
        console.log('🎨 [자동참여] 색상 화상통화 자동 참여 완료:', { color, participantCount: participants?.length });
      } catch (error) {
        console.error('🎨 [자동참여] 자동 참여 실패:', error);
      }
    };

    // 개별 사용자 자동 화상통화 퇴장 알림 (카메라는 유지)
    const handleUserAutoLeftVideoCall = (data) => {
      console.log('👤 [자동퇴장] 화상통화 자동 퇴장 알림:', data);
      const { sessionKey, reason, message } = data;
      
      setIsCallActive(false);
      setVideoSession(null);
      setParticipants([]);
      
      // MediaSoup 연결 정리
      cleanupMediaSoupConnections();
      
      console.log(`👤 [자동퇴장] 화상통화 자동 퇴장 완료 (카메라 유지): ${reason}`);
    };

    socket.on('area-changed', handleAreaChanged);
    socket.on('area-video-call-changed', handleVideoCallChanged);
    socket.on('auto-video-call-started', handleAutoVideoCallStarted);
    socket.on('area-video-call-update', handleVideoCallUpdate);
    socket.on('area-video-call-ended', handleVideoCallEnded);
    socket.on('color-based-video-call-started', handleColorBasedVideoCallStarted);
    
    // 새로운 자동 화상통화 이벤트들
    socket.on('auto-area-video-call-started', handleAutoAreaVideoCallStarted);
    socket.on('auto-color-video-call-started', handleAutoColorVideoCallStarted);
    socket.on('auto-area-video-call-ended', handleAutoAreaVideoCallEnded);
    socket.on('video-call-participant-changed', handleVideoCallParticipantChanged);
    
    // 개별 사용자 자동 참여/퇴장 이벤트들
    socket.on('user-auto-joined-video-call', handleUserAutoJoinedVideoCall);
    socket.on('user-auto-joined-color-video-call', handleUserAutoJoinedColorVideoCall);
    socket.on('user-auto-left-video-call', handleUserAutoLeftVideoCall);

    // MediaSoup 관련 서버 이벤트들
    const handleNewProducer = async (data) => {
      console.log('📹 [MediaSoup] 새 Producer 감지:', data);
      const { producerId, userId, kind, username } = data;
      
      // 자신의 Producer는 무시
      if (userId === socket?.id) {
        console.log('📹 [MediaSoup] 자신의 Producer 무시:', { userId, socketId: socket.id });
        return;
      }
      
      // 사용자 이름 저장
      if (username && userId) {
        setUserNames(prev => new Map(prev.set(userId, username)));
        console.log(`📹 [MediaSoup] 사용자 이름 저장: ${userId} -> ${username}`);
      }
      
      // Transport와 Device 상태 확인
      const currentReceiveTransport = window.currentReceiveTransport || receiveTransport;
      const currentDevice = mediasoupDevice;
      
      console.log('📹 [MediaSoup] Consumer 생성 조건 확인:', {
        hasReceiveTransport: !!currentReceiveTransport,
        hasMediasoupDevice: !!currentDevice,
        transportClosed: currentReceiveTransport?.closed,
        deviceLoaded: currentDevice?.loaded,
        producerId,
        userId,
        kind,
        username
      });
      
      if (currentReceiveTransport && currentDevice && currentDevice.loaded && currentDevice.rtpCapabilities && !currentReceiveTransport.closed) {
        console.log(`📹 [MediaSoup] Consumer 생성 시작 - 사용자:${username || userId}, 종류:${kind}`);
        try {
          await createConsumer(currentReceiveTransport, producerId, userId, currentDevice);
        } catch (error) {
          console.error('📹 [MediaSoup] Consumer 생성 실패:', error);
          // 실패한 경우 대기열에 추가
          setPendingConsumers(prev => [...prev, { producerId, userId, kind, username, timestamp: Date.now() }]);
        }
      } else {
        console.log('📹 [MediaSoup] MediaSoup 준비되지 않음, Consumer 생성 요청을 대기열에 추가:', { 
          producerId, userId, kind, username,
          hasReceiveTransport: !!currentReceiveTransport,
          hasMediasoupDevice: !!currentDevice,
          deviceLoaded: currentDevice?.loaded,
          transportClosed: currentReceiveTransport?.closed
        });
        
        // 대기열에 Consumer 생성 요청 추가
        setPendingConsumers(prev => [...prev, { producerId, userId, kind, username, timestamp: Date.now() }]);
      }
    };

    const handleProducerClosed = (data) => {
      console.log('📹 [MediaSoup] Producer 종료:', data);
      const { producerId, userId } = data;
      
      // 해당 consumer 정리
      consumers.forEach((consumer, key) => {
        if (key.startsWith(userId)) {
          consumer.close();
          setConsumers(prev => {
            const newMap = new Map(prev);
            newMap.delete(key);
            return newMap;
          });
        }
      });
      
      // 원격 스트림 정리
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    };

    socket.on('new-producer', handleNewProducer);
    socket.on('producer-closed', handleProducerClosed);
    
    // 자동 MediaSoup 연결 이벤트들
    const handleAutoStartMediasoup = async (data) => {
      console.log('🔥 [MediaSoup] handleAutoStartMediasoup 호출됨!', data);
      const { mapId, participants, message } = data;
      
      console.log(`🔥 [자동연결] ${message}`);
      
      // 강화된 중복 실행 방지 - MediaSoup 연결 자동 시작
      if (isConnecting) {
        console.log('📹 [자동연결] 이미 연결 중이므로 무시 (isConnecting=true)');
        return;
      }
      
      if (sendTransport || receiveTransport) {
        console.log('📹 [자동연결] 이미 Transport가 존재하므로 무시');
        return;
      }
      
      if (isCallActive) {
        console.log('📹 [자동연결] 이미 통화 활성 상태이므로 무시');
        return;
      }
      
      if (!isCallActive && !mediasoupDevice) {
        console.log('📹 [자동연결] MediaSoup 연결 자동 시작...');
        
        // 먼저 로컬 카메라를 시작
        if (!localStream) {
          console.log('📹 [자동연결] 로컬 카메라 시작...');
          await startLocalCamera();
          // 카메라 시작 후 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 카메라가 시작된 후 MediaSoup 연결 시작
        if (localStream || videoRef.current?.srcObject) {
          await startMediaSoupConnections();
          setIsCallActive(true);
        } else {
          console.warn('📹 [자동연결] 로컬 카메라 시작 실패');
        }
      }
    };
    
    const handleNewUserJoinedMediasoup = async (data) => {
      console.log('📹 [MediaSoup] 새 사용자 MediaSoup 참여:', data);
      const { newUserId, newUsername, newSocketId, mapId, totalParticipants } = data;
      
      // 이미 MediaSoup가 활성화되어 있다면, 새 사용자와의 연결 준비
      if (isCallActive && mediasoupDevice) {
        console.log(`📹 [MediaSoup] 기존 연결에 새 사용자 추가: ${newUsername}`);
        // 새 사용자가 Producer를 생성하면 자동으로 handleNewProducer가 호출됨
      } else if (!mediasoupDevice) {
        // MediaSoup가 비활성화 상태라면 자동으로 시작
        console.log('📹 [MediaSoup] 새 사용자 참여로 인한 자동 시작...');
        
        // 먼저 로컬 카메라를 시작
        if (!localStream) {
          console.log('📹 [새사용자연결] 로컬 카메라 시작...');
          await startLocalCamera();
          // 카메라 시작 후 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 카메라가 시작된 후 MediaSoup 연결 시작
        if (localStream || videoRef.current?.srcObject) {
          await startMediaSoupConnections();
          setIsCallActive(true);
        } else {
          console.warn('📹 [새사용자연결] 로컬 카메라 시작 실패');
        }
      }
    };
    
    socket.on('auto-start-mediasoup', (data) => {
      console.log('🔥🔥🔥 [MEDIASOUP] auto-start-mediasoup 이벤트 수신됨!', data);
      handleAutoStartMediasoup(data);
    });
    socket.on('new-user-joined-mediasoup', handleNewUserJoinedMediasoup);
    socket.on('transport-closed', (data) => {
      console.log('📹 [MediaSoup] 서버에서 Transport 닫힘 알림:', data);
      const { transportId, transportType } = data;
      
      // Transport 상태 초기화
      if (transportType === 'send') {
        setSendTransport(null);
        window.currentSendTransport = null;
      } else if (transportType === 'receive') {
        setReceiveTransport(null);
        window.currentReceiveTransport = null;
      }
      
      // 재연결 시도
      setTimeout(async () => {
        console.log('📹 [MediaSoup] Transport 닫힘으로 인한 재연결 시도');
        try {
          await startMediaSoupConnections();
        } catch (reconnectError) {
          console.error('📹 [MediaSoup] Transport 닫힘 재연결 실패:', reconnectError);
        }
      }, 3000);
    });

    // 정리
    return () => {
      socket.off('area-changed', handleAreaChanged);
      socket.off('area-video-call-changed', handleVideoCallChanged);
      socket.off('auto-video-call-started', handleAutoVideoCallStarted);
      socket.off('area-video-call-update', handleVideoCallUpdate);
      socket.off('area-video-call-ended', handleVideoCallEnded);
      socket.off('color-based-video-call-started', handleColorBasedVideoCallStarted);
      
      // 새로운 이벤트 정리
      socket.off('auto-area-video-call-started', handleAutoAreaVideoCallStarted);
      socket.off('auto-color-video-call-started', handleAutoColorVideoCallStarted);
      socket.off('auto-area-video-call-ended', handleAutoAreaVideoCallEnded);
      socket.off('video-call-participant-changed', handleVideoCallParticipantChanged);
      
      // 개별 사용자 이벤트 정리
      socket.off('user-auto-joined-video-call', handleUserAutoJoinedVideoCall);
      socket.off('user-auto-joined-color-video-call', handleUserAutoJoinedColorVideoCall);
      socket.off('user-auto-left-video-call', handleUserAutoLeftVideoCall);
      
      // MediaSoup 이벤트 정리
      socket.off('new-producer', handleNewProducer);
      socket.off('producer-closed', handleProducerClosed);
      socket.off('auto-start-mediasoup', handleAutoStartMediasoup);
      socket.off('new-user-joined-mediasoup', handleNewUserJoinedMediasoup);
      socket.off('transport-closed');
    };
  }, [socket]);

  // 대기 중인 Consumer 요청들을 처리
  const processPendingConsumers = useCallback(async () => {
    if (pendingConsumers.length > 0 && receiveTransport && mediasoupDevice && mediasoupDevice.loaded && mediasoupDevice.rtpCapabilities) {
      console.log(`📹 [MediaSoup] 대기 중인 Consumer 요청 ${pendingConsumers.length}개 처리 시작`);
      
      const currentPending = [...pendingConsumers];
      setPendingConsumers([]); // 대기열 초기화
      
      for (const request of currentPending) {
        const { producerId, userId, kind, username } = request;
        console.log(`📹 [MediaSoup] 대기 중인 Consumer 생성 - 사용자:${username || userId}, 종류:${kind}`);
        
        // 사용자 이름 저장
        if (username && userId) {
          setUserNames(prev => new Map(prev.set(userId, username)));
        }
        
        try {
          await createConsumer(receiveTransport, producerId, userId, mediasoupDevice);
        } catch (error) {
          console.error('📹 [MediaSoup] 대기 중인 Consumer 생성 실패:', error);
        }
      }
      
      console.log('📹 [MediaSoup] 모든 대기 중인 Consumer 요청 처리 완료');
    }
  }, [pendingConsumers, receiveTransport, mediasoupDevice]);

  // MediaSoup이 준비되면 대기 중인 Consumer들을 처리
  useEffect(() => {
    if (receiveTransport && mediasoupDevice && pendingConsumers.length > 0) {
      console.log('📹 [MediaSoup] MediaSoup 준비 완료, 대기 중인 Consumer 처리');
      processPendingConsumers();
    }
  }, [receiveTransport, mediasoupDevice, processPendingConsumers]);

  // 원격 비디오 스트림을 비디오 엘리먼트에 연결 (ref 콜백에서 처리하므로 제거)

  // MediaSoup Device 초기화
  const initializeMediaSoupDevice = useCallback(async () => {
    if (mediasoupDevice) return mediasoupDevice;

    try {
      console.log('📹 [MediaSoup] Device 생성 시작...');
      const device = new Device();
      
      console.log('📹 [MediaSoup] Device 생성 완료', {
        handlerName: device.handlerName,
        loaded: device.loaded
      });
      
      setMediasoupDevice(device);
      return device;
    } catch (error) {
      console.error('📹 [MediaSoup] Device 생성 실패:', error);
      // Device 생성 실패 시 재시도하지 않고 에러 전파
      throw error;
    }
  }, [mediasoupDevice]);

  // MediaSoup Transport 생성
  const createTransports = useCallback(async (device) => {
    if (!socket || !device) return;

    return new Promise((resolve, reject) => {
      let sendTransportCreated = false;
      let receiveTransportCreated = false;

      const checkBothTransports = () => {
        console.log('📹 [MediaSoup] Transport 상태 체크:', {
          sendTransportCreated,
          receiveTransportCreated,
          bothReady: sendTransportCreated && receiveTransportCreated
        });
        
        if (sendTransportCreated && receiveTransportCreated) {
          setIsConnecting(false);
          window.mediasoupExecuting = false; // 실행 플래그 해제
          window.mediasoupRetryCount = 0; // 성공 시 재시도 카운터 리셋
          console.log('📹 [MediaSoup] 모든 Transport 준비 완료 - 서버에 준비 상태 알림');
          socket.emit('mediasoup-ready');
          resolve();
        }
      };

      try {
        // Send Transport 생성
        console.log('📹 [MediaSoup] Send Transport 요청');
        socket.emit('create-webrtc-transport', { direction: 'send' }, async (response) => {
          if (response.success) {
            const sendTransport = device.createSendTransport(response.params);
            
            sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
              try {
                console.log('📹 [MediaSoup] SendTransport 연결 시작:', sendTransport.id);
                socket.emit('connect-transport', {
                  transportId: sendTransport.id,
                  dtlsParameters
                }, (result) => {
                  if (result.success) {
                    console.log('📹 [MediaSoup] SendTransport 연결 완료:', sendTransport.id);
                    callback();
                  } else {
                    console.error('📹 [MediaSoup] SendTransport 연결 실패:', result.error);
                    if (result.error.includes('Transport를 찾을 수 없습니다') || result.error.includes('해당 Transport를 찾을 수 없습니다')) {
                      console.log('📹 [MediaSoup] Transport가 정리되었음, 전체 연결 재시작 필요');
                      
                      // Transport 상태 초기화
                      setSendTransport(null);
                      setReceiveTransport(null);
                      window.currentSendTransport = null;
                      window.currentReceiveTransport = null;
                      
                      // 재시도 제한 확인
                      window.mediasoupRetryCount = (window.mediasoupRetryCount || 0) + 1;
                      if (window.mediasoupRetryCount > 3) {
                        console.error('📹 [MediaSoup] 재시도 횟수 초과, 재연결 중단');
                        return;
                      }
                      
                      // 잠시 후 재연결 시도
                      setTimeout(async () => {
                        console.log('📹 [MediaSoup] SendTransport 연결 실패로 인한 재연결 시도', window.mediasoupRetryCount);
                        try {
                          await startMediaSoupConnections();
                        } catch (reconnectError) {
                          console.error('📹 [MediaSoup] SendTransport 재연결 실패:', reconnectError);
                        }
                      }, 3000);
                    }
                    errback(new Error(result.error));
                  }
                });
              } catch (error) {
                console.error('📹 [MediaSoup] SendTransport 연결 오류:', error);
                errback(error);
              }
            });

            sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
              try {
                console.log('📹 [MediaSoup] Producer 요청 시작:', { kind, transportId: sendTransport.id });
                socket.emit('produce', {
                  transportId: sendTransport.id,
                  kind,
                  rtpParameters
                }, (result) => {
                  if (result.success) {
                    console.log('📹 [MediaSoup] Producer 서버 응답 성공:', { kind, producerId: result.producerId });
                    callback({ id: result.producerId });
                  } else {
                    console.error('📹 [MediaSoup] Producer 서버 응답 실패:', result.error);
                    errback(new Error(result.error));
                  }
                });
              } catch (error) {
                console.error('📹 [MediaSoup] Producer 요청 오류:', error);
                errback(error);
              }
            });

            setSendTransport(sendTransport);
            console.log('📹 [MediaSoup] Send Transport 생성 완료');
            sendTransportCreated = true;
            
            // Transport 생성 시 참조를 저장
            window.currentSendTransport = sendTransport;
            
            checkBothTransports();
          } else {
            console.error('📹 [MediaSoup] Send Transport 생성 응답 실패:', response);
            reject(new Error('Send Transport 생성 실패: ' + JSON.stringify(response)));
          }
        });

        // Receive Transport 생성
        console.log('📹 [MediaSoup] Receive Transport 요청');
        socket.emit('create-webrtc-transport', { direction: 'recv' }, async (response) => {
          if (response.success) {
            const receiveTransport = device.createRecvTransport(response.params);
            
            receiveTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
              try {
                socket.emit('connect-transport', {
                  transportId: receiveTransport.id,
                  dtlsParameters
                }, (result) => {
                  if (result.success) {
                    callback();
                  } else {
                    console.error('📹 [MediaSoup] ReceiveTransport 연결 실패:', result.error);
                    if (result.error.includes('Transport를 찾을 수 없습니다') || result.error.includes('해당 Transport를 찾을 수 없습니다')) {
                      console.log('📹 [MediaSoup] ReceiveTransport가 정리되었음, 전체 연결 재시작 필요');
                      // Transport가 서버에서 정리된 경우, 전체 연결을 재시작하지 않고 실패로 처리
                      // 이는 pending consumer 큐를 통해 나중에 재시도됨
                    }
                    errback(new Error(result.error));
                  }
                });
              } catch (error) {
                errback(error);
              }
            });

            setReceiveTransport(receiveTransport);
            console.log('📹 [MediaSoup] Receive Transport 생성 완료');
            receiveTransportCreated = true;
            
            // Transport 생성 시 참조를 저장
            window.currentReceiveTransport = receiveTransport;
            
            checkBothTransports();
          } else {
            console.error('📹 [MediaSoup] Receive Transport 생성 응답 실패:', response);
            reject(new Error('Receive Transport 생성 실패: ' + JSON.stringify(response)));
          }
        });

      } catch (error) {
        console.error('📹 [MediaSoup] Transport 생성 실패:', error);
        reject(error);
      }
    });
  }, [socket]);

  // MediaSoup Producer 생성 (로컬 스트림 전송)
  const createProducer = useCallback(async (transport, track) => {
    if (!transport || !track) {
      console.error('📹 [MediaSoup] Producer 생성 실패: transport 또는 track이 없음', {
        hasTransport: !!transport,
        hasTrack: !!track,
        trackKind: track?.kind
      });
      return;
    }

    // 중복 Producer 생성 요청 방지
    if (pendingProducers.has(track.kind)) {
      console.log('📹 [MediaSoup] 중복 Producer 생성 요청 무시:', track.kind);
      return;
    }

    // Producer 생성 시작 표시
    setPendingProducers(prev => new Set(prev).add(track.kind));

    try {
      console.log('📹 [MediaSoup] Producer 생성 시작:', {
        trackKind: track.kind,
        trackLabel: track.label,
        trackEnabled: track.enabled,
        trackReadyState: track.readyState,
        transportId: transport.id,
        transportClosed: transport.closed
      });

      // Transport가 닫혀있는지 확인
      if (transport.closed) {
        console.error('📹 [MediaSoup] Producer 생성 실패: transport가 닫혀있음');
        setPendingProducers(prev => {
          const newSet = new Set(prev);
          newSet.delete(track.kind);
          return newSet;
        });
        return;
      }

      // 트랙이 ended 상태인지 확인
      if (track.readyState === 'ended') {
        console.error('📹 [MediaSoup] Producer 생성 실패: track이 ended 상태');
        setPendingProducers(prev => {
          const newSet = new Set(prev);
          newSet.delete(track.kind);
          return newSet;
        });
        
        // 새로운 미디어 스트림 획득 시도
        console.log('📹 [MediaSoup] Track ended - 새 미디어 스트림 획득 시도');
        setTimeout(async () => {
          try {
            const newStream = await startLocalCamera();
            if (newStream) {
              console.log('📹 [MediaSoup] 새 미디어 스트림 획득 성공, Producer 재시도');
              const newTrack = track.kind === 'video' 
                ? newStream.getVideoTracks()[0] 
                : newStream.getAudioTracks()[0];
              
              if (newTrack && newTrack.readyState === 'live') {
                await createProducer(transport, newTrack);
              }
            }
          } catch (refreshError) {
            console.error('📹 [MediaSoup] 새 스트림 획득 실패:', refreshError);
          }
        }, 1000);
        return;
      }

      // 기존 동일한 종류의 Producer가 있으면 먼저 정리 (MID 충돌 방지)
      const existingProducer = producers.get(track.kind);
      if (existingProducer) {
        console.log('📹 [MediaSoup] 기존 Producer 정리 (MID 충돌 방지):', { 
          kind: track.kind, 
          producerId: existingProducer.id 
        });
        
        try {
          existingProducer.close();
        } catch (error) {
          console.warn('📹 [MediaSoup] 기존 Producer 정리 중 오류 (무시됨):', error);
        }
        
        // Producer Map에서 제거
        setProducers(prev => {
          const newMap = new Map(prev);
          newMap.delete(track.kind);
          return newMap;
        });
        
        // 서버에서도 정리되도록 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 오디오 트랙의 경우 추가 검증 및 SSRC 문제 해결
      if (track.kind === 'audio') {
        console.log('📹 [MediaSoup] 오디오 트랙 상태 상세 검사:', {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          constraints: track.getConstraints ? track.getConstraints() : 'N/A',
          settings: track.getSettings ? track.getSettings() : 'N/A'
        });

        // 오디오 트랙이 비활성화되어 있으면 활성화
        if (!track.enabled) {
          console.log('📹 [MediaSoup] 오디오 트랙 활성화');
          track.enabled = true;
        }
        
        // SSRC 문제 해결을 위한 추가 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Producer 생성 시 추가 파라미터로 SSRC 관련 문제 해결
      const produceOptions = { track };
      
      // 오디오의 경우 추가 설정
      if (track.kind === 'audio') {
        produceOptions.appData = {
          source: 'microphone',
          timestamp: Date.now()
        };
      }

      // 직접 Producer 생성 직전에 한 번 더 트랙 상태 확인
      if (track.readyState === 'ended') {
        console.error('📹 [MediaSoup] Producer 생성 중단: track이 ended 상태로 변경됨');
        
        // 트랙이 ended 상태인 경우 새 스트림 획득 시도
        console.log('📹 [MediaSoup] Track ended - 새 미디어 스트림 획득 시도');
        try {
          const newStream = await startLocalCamera();
          if (newStream) {
            console.log('📹 [MediaSoup] 새 스트림 획득 성공, Producer 재시도');
            const newTrack = track.kind === 'video' 
              ? newStream.getVideoTracks()[0] 
              : newStream.getAudioTracks()[0];
            
            if (newTrack && newTrack.readyState === 'live') {
              // 기존 pending 제거 - 새 트랙으로는 자동 복구 로직에서 처리
              setPendingProducers(prev => {
                const newSet = new Set(prev);
                newSet.delete(track.kind);
                return newSet;
              });
              console.log('📹 [MediaSoup] 새 트랙 준비됨, 자동 복구에서 처리됨');
              return;
            }
          }
        } catch (refreshError) {
          console.error('📹 [MediaSoup] 새 스트림 획득 실패:', refreshError);
        }
        
        // 실패한 경우 pending에서 제거
        setPendingProducers(prev => {
          const newSet = new Set(prev);
          newSet.delete(track.kind);
          return newSet;
        });
        return;
      }

      const producer = await transport.produce(produceOptions);
      setProducers(prev => new Map(prev.set(track.kind, producer)));
      console.log('📹 [MediaSoup] Producer 생성 완료:', {
        kind: track.kind,
        producerId: producer.id,
        trackId: track.id
      });
      
      // 성공적으로 완료되면 pending에서 제거
      setPendingProducers(prev => {
        const newSet = new Set(prev);
        newSet.delete(track.kind);
        return newSet;
      });
      
      return producer;
    } catch (error) {
      console.error('📹 [MediaSoup] Producer 생성 실패:', {
        error: error.message,
        trackKind: track.kind,
        transportId: transport.id,
        transportClosed: transport.closed,
        trackReadyState: track?.readyState
      });

      // 특정 오류 타입에 대한 추가 처리
      if (error.message && (error.message.includes('track ended') || error.message.includes('ended'))) {
        console.log('📹 [MediaSoup] Track ended 오류 감지 - 새 스트림 획득 필요');
        
        // Track ended의 경우 미디어 스트림 새로 고침 시도
        setTimeout(async () => {
          console.log('📹 [MediaSoup] Track ended 복구 시도');
          try {
            const newStream = await startLocalCamera();
            if (newStream) {
              console.log('📹 [MediaSoup] 새 미디어 스트림 획득 성공');
              // 새 스트림으로 Producer 재생성 시도
              const videoTrack = newStream.getVideoTracks()[0];
              const audioTrack = newStream.getAudioTracks()[0];
              
              if (videoTrack && videoTrack.readyState === 'live' && sendTransport) {
                await createProducer(sendTransport, videoTrack);
              }
              if (audioTrack && audioTrack.readyState === 'live' && sendTransport) {
                await createProducer(sendTransport, audioTrack);
              }
            }
          } catch (recoveryError) {
            console.error('📹 [MediaSoup] Track ended 복구 실패:', recoveryError);
          }
        }, 500);
      } else if (error.message && (error.message.includes('Transport를 찾을 수 없습니다') || error.message.includes('해당 Transport를 찾을 수 없습니다'))) {
        console.log('📹 [MediaSoup] Transport not found 오류 감지 - 재연결 필요');
        
        // Transport 상태 초기화 및 재연결 시도
        setSendTransport(null);
        setReceiveTransport(null);
        window.currentSendTransport = null;
        window.currentReceiveTransport = null;
        
        // 재시도 제한 확인
        window.mediasoupRetryCount = (window.mediasoupRetryCount || 0) + 1;
        if (window.mediasoupRetryCount > 3) {
          console.error('📹 [MediaSoup] 재시도 횟수 초과, 재연결 중단');
          return;
        }
        
        // 잠시 후 재연결 시도
        setTimeout(async () => {
          console.log('📹 [MediaSoup] Transport 재연결 시도 시작', window.mediasoupRetryCount);
          try {
            await startMediaSoupConnections();
          } catch (reconnectError) {
            console.error('📹 [MediaSoup] 재연결 실패:', reconnectError);
          }
        }, 2500);
      }
      
      // 에러 발생 시 pending에서 제거
      setPendingProducers(prev => {
        const newSet = new Set(prev);
        newSet.delete(track.kind);
        return newSet;
      });
    }
  }, [pendingProducers]);

  // MediaSoup Consumer 생성 (원격 스트림 수신)
  const createConsumer = useCallback(async (transport, producerId, userId, device) => {
    console.log('📹 [MediaSoup] createConsumer 호출됨:', {
      hasTransport: !!transport,
      transportId: transport?.id,
      transportClosed: transport?.closed,
      producerId,
      userId,
      hasDevice: !!device,
      deviceLoaded: device?.loaded,
      paramDeviceLoaded: device?.loaded,
      globalDeviceLoaded: mediasoupDevice?.loaded,
      willUseParamDevice: !!device,
      willUseGlobalDevice: !device && !!mediasoupDevice
    });

    if (!transport || !producerId) {
      console.error('📹 [MediaSoup] createConsumer 실패: transport 또는 producerId 없음');
      return;
    }

    try {
      const deviceToUse = device || mediasoupDevice;
      if (!deviceToUse) {
        console.error('📹 [MediaSoup] MediaSoup Device가 없어서 Consumer 생성 불가');
        return;
      }

      if (!deviceToUse.loaded || !deviceToUse.rtpCapabilities) {
        console.error('📹 [MediaSoup] Device가 완전히 로드되지 않음 - Consumer 생성 불가', {
          deviceExists: !!deviceToUse,
          deviceLoaded: deviceToUse.loaded,
          hasRtpCapabilities: !!deviceToUse.rtpCapabilities,
          rtpCapabilitiesLength: deviceToUse.rtpCapabilities?.codecs?.length || 0,
          mediasoupDeviceState: mediasoupDevice ? {
            loaded: mediasoupDevice.loaded,
            hasRtpCapabilities: !!mediasoupDevice.rtpCapabilities,
            rtpCapabilitiesLength: mediasoupDevice.rtpCapabilities?.codecs?.length || 0
          } : null
        });
        
        // 재시도 제한 확인
        window.mediasoupRetryCount = (window.mediasoupRetryCount || 0) + 1;
        if (window.mediasoupRetryCount > 3) {
          console.error('📹 [MediaSoup] 재시도 횟수 초과, Device 재로딩 중단');
          return;
        }
        
        // Device 재로딩 시도
        setTimeout(async () => {
          console.log('📹 [MediaSoup] Device 재로딩 시도', window.mediasoupRetryCount);
          try {
            await startMediaSoupConnections();
          } catch (reloadError) {
            console.error('📹 [MediaSoup] Device 재로딩 실패:', reloadError);
          }
        }, 2500);
        return;
      }

      console.log('📹 [MediaSoup] consume 이벤트 전송:', {
        transportId: transport.id,
        producerId,
        hasRtpCapabilities: !!deviceToUse.rtpCapabilities
      });

      socket.emit('consume', {
        transportId: transport.id,
        producerId,
        rtpCapabilities: deviceToUse.rtpCapabilities
      }, async (response) => {
        console.log('📹 [MediaSoup] consume 응답 수신:', response);
        
        if (response.success) {
          try {
            // Consumer 생성 직전 Device 로딩 상태 재확인
            if (!deviceToUse.loaded || !deviceToUse.rtpCapabilities) {
              console.error('📹 [MediaSoup] Device가 완전히 준비되지 않음 - Consumer 생성 중단', {
                loaded: deviceToUse.loaded,
                hasRtpCapabilities: !!deviceToUse.rtpCapabilities
              });
              return;
            }
            
            console.log('📹 [MediaSoup] transport.consume() 호출 시작:', {
              hasTransport: !!transport,
              transportClosed: transport.closed,
              hasDevice: !!deviceToUse,
              deviceLoaded: deviceToUse.loaded,
              hasRtpCapabilities: !!deviceToUse.rtpCapabilities,
              responseParams: response.params
            });
            
            const consumer = await transport.consume(response.params);
            
            // 중복 Consumer 체크 및 기존 Consumer 정리
            const consumerKey = `${userId}_${consumer.kind}`;
            setConsumers(prev => {
              const newMap = new Map(prev);
              
              // 기존 Consumer가 있으면 정리
              if (newMap.has(consumerKey)) {
                const existingConsumer = newMap.get(consumerKey);
                console.log('📹 [MediaSoup] 기존 Consumer 정리:', { userId, kind: consumer.kind, existingId: existingConsumer.id });
                try {
                  existingConsumer.close();
                } catch (closeError) {
                  console.warn('📹 [MediaSoup] 기존 Consumer 정리 실패:', closeError);
                }
              }
              
              newMap.set(consumerKey, consumer);
              return newMap;
            });
            
            console.log('📹 [MediaSoup] Consumer 생성 완료:', {
              userId,
              kind: consumer.kind,
              consumerId: consumer.id,
              trackId: consumer.track.id,
              trackKind: consumer.track.kind,
              trackEnabled: consumer.track.enabled,
              trackReadyState: consumer.track.readyState
            });
            
            // 기존 스트림이 있으면 트랙을 추가, 없으면 새 스트림 생성
            setRemoteStreams(prev => {
              const newMap = new Map(prev);
              let existingStream = newMap.get(userId);
              
              if (existingStream) {
                // 같은 종류의 기존 트랙이 있는지 확인
                const existingTracks = consumer.kind === 'video' 
                  ? existingStream.getVideoTracks() 
                  : existingStream.getAudioTracks();
                
                // 기존 트랙 제거 후 새 트랙 추가
                existingTracks.forEach(track => {
                  existingStream.removeTrack(track);
                  console.log(`📹 [MediaSoup] 기존 ${consumer.kind} 트랙 제거 - 사용자:${userId}`);
                });
                
                existingStream.addTrack(consumer.track);
                console.log(`📹 [MediaSoup] ${consumer.kind} 트랙 교체됨 - 사용자:${userId}`);
              } else {
                // 새 스트림 생성
                existingStream = new MediaStream([consumer.track]);
                newMap.set(userId, existingStream);
                console.log(`📹 [MediaSoup] 새 스트림 생성 - 사용자:${userId}, 종류:${consumer.kind}`);
              }
              
              return newMap;
            });
            
            // Consumer 재개
            console.log('📹 [MediaSoup] Consumer 재개 요청:', consumer.id);
            socket.emit('resume-consumer', { consumerId: consumer.id });
            
            // 트랙 상태 확인 및 강제 활성화
            setTimeout(() => {
              const track = consumer.track;
              console.log('📹 [MediaSoup] Consumer 상태 확인:', {
                userId,
                kind: consumer.kind,
                consumerPaused: consumer.paused,
                trackEnabled: track?.enabled,
                trackReadyState: track?.readyState,
                trackMuted: track?.muted
              });
              
              // Consumer가 paused 상태면 resume
              if (consumer.paused) {
                console.log('📹 [MediaSoup] Consumer paused 상태 - resume 시도');
                consumer.resume();
              }
              
              // 트랙이 비활성화되어 있으면 활성화
              if (track && !track.enabled) {
                track.enabled = true;
                console.log('📹 [MediaSoup] Consumer 트랙 강제 활성화:', { userId, kind: consumer.kind });
              }
            }, 500);
          } catch (consumeError) {
            console.error('📹 [MediaSoup] transport.consume() 실패:', consumeError);
          }
        } else {
          console.error('📹 [MediaSoup] consume 서버 응답 실패:', response.error);
        }
      });
    } catch (error) {
      console.error('📹 [MediaSoup] Consumer 생성 실패:', error);
    }
  }, [socket, mediasoupDevice]);

  // MediaSoup 연결 정리
  const cleanupMediaSoupConnections = useCallback(() => {
    console.log('📹 [MediaSoup] 모든 연결 정리 시작');
    
    // Producer 정리
    producers.forEach((producer, kind) => {
      console.log('📹 [MediaSoup] Producer 정리:', { kind, producerId: producer.id });
      producer.close();
    });
    
    // Consumer 정리
    consumers.forEach((consumer, key) => {
      console.log('📹 [MediaSoup] Consumer 정리:', { key, consumerId: consumer.id });
      consumer.close();
    });

    // SendTransport 정리
    if (sendTransport) {
      console.log('📹 [MediaSoup] SendTransport 정리:', sendTransport.id);
      sendTransport.close();
      setSendTransport(null);
    }
    
    // window 참조도 정리
    window.currentSendTransport = null;

    // ReceiveTransport 정리
    if (receiveTransport) {
      console.log('📹 [MediaSoup] ReceiveTransport 정리:', receiveTransport.id);
      receiveTransport.close();
      setReceiveTransport(null);
    }
    
    // window 참조도 정리
    window.currentReceiveTransport = null;
    
    // MediaSoup Device 정리
    if (mediasoupDevice) {
      console.log('📹 [MediaSoup] MediaSoup Device 정리');
      setMediasoupDevice(null);
    }
    
    // State 정리
    setProducers(new Map());
    setConsumers(new Map());
    setRemoteStreams(new Map());
    setPendingConsumers([]); // 대기 중인 Consumer 요청들도 정리
    setUserNames(new Map()); // 사용자 이름 매핑도 정리
    setIsConnecting(false);
    window.mediasoupExecuting = false; // 실행 플래그 해제
    window.mediasoupRetryCount = 0; // 재시도 카운터도 리셋
    remoteVideoRefs.current.clear();
    
    console.log('📹 [MediaSoup] 모든 연결 정리 완료');
  }, [producers, consumers, sendTransport, receiveTransport, mediasoupDevice]);

  // 모든 MediaSoup 연결 시작
  const startMediaSoupConnections = useCallback(async (participantIds) => {
    console.log('📹 [MediaSoup] startMediaSoupConnections 호출됨:', {
      hasSocket: !!socket,
      isConnecting,
      hasSendTransport: !!sendTransport,
      hasReceiveTransport: !!receiveTransport,
      hasMediasoupDevice: !!mediasoupDevice,
      participantIds,
      isExecuting: window.mediasoupExecuting,
      windowSendTransport: !!window.currentSendTransport,
      windowReceiveTransport: !!window.currentReceiveTransport
    });

    if (!socket) {
      console.error('📹 [MediaSoup] Socket이 없어서 연결 중단');
      return;
    }

    // 새 연결 시작 전 기존 연결 완전 정리
    console.log('📹 [MediaSoup] 새 연결 시작 전 기존 연결 정리');
    cleanupMediaSoupConnections();
    
    // 정리 완료 대기 (비동기 정리 작업 완료 대기)
    await new Promise(resolve => setTimeout(resolve, 100));

    // 동기적 중복 실행 방지 - window 속성 사용
    if (window.mediasoupExecuting) {
      console.log('📹 [MediaSoup] 이미 실행 중, 중복 실행 방지 (window.mediasoupExecuting=true)');
      return;
    }

    // 강화된 중복 실행 방지 로직
    if (isConnecting) {
      console.log('📹 [MediaSoup] 이미 연결 중, 중복 실행 방지 (isConnecting=true)');
      return;
    }

    // 이미 완전히 연결된 상태인지 확인 (window 참조 포함)
    const currentSendTransport = window.currentSendTransport || sendTransport;
    const currentReceiveTransport = window.currentReceiveTransport || receiveTransport;
    
    if (currentSendTransport && currentReceiveTransport && mediasoupDevice && 
        !currentSendTransport.closed && !currentReceiveTransport.closed) {
      console.log('📹 [MediaSoup] 이미 완전히 연결됨, 중복 실행 방지:', {
        sendTransportId: currentSendTransport.id,
        receiveTransportId: currentReceiveTransport.id,
        sendClosed: currentSendTransport.closed,
        receiveClosed: currentReceiveTransport.closed
      });
      return;
    }

    // 동기적 실행 플래그 설정
    window.mediasoupExecuting = true;
    
    // 중복 실행 방지를 위해 즉시 isConnecting 설정
    setIsConnecting(true);
    console.log('📹 [MediaSoup] 연결 시작 - isConnecting=true, mediasoupExecuting=true로 설정');

    // 기존 연결이 있다면 먼저 정리 (MID 충돌 방지)
    if (sendTransport || receiveTransport || producers.size > 0 || consumers.size > 0) {
      console.log('📹 [MediaSoup] 기존 연결 정리 후 새로운 연결 시작 (MID 충돌 방지)');
      
      // 서버에 Producer 정리 요청
      await new Promise((resolve) => {
        socket.emit('cleanup-producers', {}, (response) => {
          console.log('📹 [MediaSoup] 서버 Producer 정리 응답:', response);
          resolve();
        });
      });
      
      cleanupMediaSoupConnections();
      
      // 서버에서 완전히 정리될 시간을 주기 위해 추가 대기
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // localStream이 없으면 videoRef에서 가져오기 시도
    const currentStream = localStream || videoRef.current?.srcObject;
    console.log('📹 [MediaSoup] 모든 참가자와 연결 시작:', participantIds, '스트림 상태:', !!currentStream);
    
    try {
      // Device 초기화
      const device = await initializeMediaSoupDevice();
      
      // RTP Capabilities 가져오기 (Promise로 변환)
      const rtpCapabilities = await new Promise((resolve, reject) => {
        socket.emit('get-router-rtp-capabilities', {}, (response) => {
          if (response.success) {
            resolve(response.rtpCapabilities);
          } else {
            reject(new Error('RTP Capabilities 가져오기 실패: ' + JSON.stringify(response)));
          }
        });
      });

      console.log('📹 [MediaSoup] RTP Capabilities 수신 완료');
      
      // Device에 RTP Capabilities 로드
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      console.log('📹 [MediaSoup] Device RTP Capabilities 로드 완료', {
        loaded: device.loaded,
        hasRtpCapabilities: !!device.rtpCapabilities,
        canProduce: device.loaded ? {
          video: device.canProduce('video'),
          audio: device.canProduce('audio')
        } : null
      });
      
      // Transport 생성 및 완료 대기
      await createTransports(device);
      console.log('📹 [MediaSoup] Transport 생성 완료, 기존 Producer 요청 시작');
      
      // 기존 Producer들 요청 (Promise로 변환)
      const existingProducers = await new Promise((resolve, reject) => {
        socket.emit('get-existing-producers', {}, (response) => {
          if (response.success) {
            resolve(response.producers || []);
          } else {
            resolve([]); // 실패해도 빈 배열로 계속 진행
          }
        });
      });

      console.log('📹 [MediaSoup] 기존 Producer 목록 수신:', existingProducers);
      
      // 기존 Producer들에 대한 Consumer 생성
      existingProducers.forEach(async ({ producerId, userId, username, kind }) => {
        // 자신의 Producer는 무시
        if (userId === socket.id) {
          console.log('📹 [MediaSoup] 기존 Producer - 자신의 Producer 무시:', { userId, socketId: socket.id });
          return;
        }
        
        // receiveTransport는 이제 확실히 존재함
        const currentReceiveTransport = window.currentReceiveTransport || receiveTransport;
        
        console.log('📹 [MediaSoup] 기존 Producer Consumer 생성 조건 확인:', {
          hasReceiveTransport: !!currentReceiveTransport,
          hasDevice: !!device,
          deviceLoaded: device?.loaded,
          transportClosed: currentReceiveTransport?.closed,
          producerId,
          userId,
          username,
          kind
        });
        
        if (currentReceiveTransport && device && device.loaded && device.rtpCapabilities && !currentReceiveTransport.closed) {
          console.log('📹 [MediaSoup] 기존 Producer에 대한 Consumer 생성:', { producerId, userId, username, kind });
          
          // 사용자 이름 저장
          if (username && userId) {
            setUserNames(prev => new Map(prev.set(userId, username)));
          }
          
          try {
            await createConsumer(currentReceiveTransport, producerId, userId, device);
          } catch (error) {
            console.error('📹 [MediaSoup] 기존 Producer Consumer 생성 실패:', error);
            // 실패한 경우 대기열에 추가
            setPendingConsumers(prev => [...prev, { producerId, userId, kind, username, timestamp: Date.now() }]);
          }
        } else {
          console.log('📹 [MediaSoup] 기존 Producer - MediaSoup 준비되지 않음, 대기열에 추가');
          // 대기열에 Consumer 생성 요청 추가
          setPendingConsumers(prev => [...prev, { producerId, userId, kind, username, timestamp: Date.now() }]);
        }
      });
              
      // Transport 생성 완료 후 로컬 스트림 전송 시작
      console.log('📹 [MediaSoup] 로컬 스트림 전송 시작');
      
      // Transport가 생성될 때까지 잠시 대기 (state 업데이트 대기)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const streamToUse = localStream || videoRef.current?.srcObject;
      console.log('📹 [MediaSoup] 로컬 스트림 상태 체크:', {
        hasLocalStream: !!localStream,
        hasVideoRefStream: !!videoRef.current?.srcObject,
        streamToUse: !!streamToUse,
        videoTracks: streamToUse?.getVideoTracks().length || 0,
        audioTracks: streamToUse?.getAudioTracks().length || 0
      });

      if (streamToUse) {
        console.log('📹 [MediaSoup] 로컬 미디어 전송 시작');
        const videoTrack = streamToUse.getVideoTracks()[0];
        const audioTrack = streamToUse.getAudioTracks()[0];
        
        console.log('📹 [MediaSoup] 트랙 상태 확인:', {
          videoTrack: videoTrack ? {
            id: videoTrack.id,
            kind: videoTrack.kind,
            enabled: videoTrack.enabled,
            readyState: videoTrack.readyState,
            label: videoTrack.label
          } : null,
          audioTrack: audioTrack ? {
            id: audioTrack.id,
            kind: audioTrack.kind,
            enabled: audioTrack.enabled,
            readyState: audioTrack.readyState,
            label: audioTrack.label
          } : null
        });
        
        // SendTransport 대기 및 재시도 로직
        const waitForSendTransport = async (maxRetries = 5, delay = 200) => {
          for (let i = 0; i < maxRetries; i++) {
            const currentSendTransport = window.currentSendTransport || sendTransport;
            
            console.log(`📹 [MediaSoup] SendTransport 대기 시도 ${i + 1}/${maxRetries}:`, {
              windowTransport: !!window.currentSendTransport,
              windowTransportId: window.currentSendTransport?.id,
              stateTransport: !!sendTransport,
              stateTransportId: sendTransport?.id,
              usingTransport: !!currentSendTransport,
              usingTransportId: currentSendTransport?.id,
              transportClosed: currentSendTransport?.closed
            });

            if (currentSendTransport && !currentSendTransport.closed) {
              return currentSendTransport;
            }
            
            if (i < maxRetries - 1) {
              console.log(`📹 [MediaSoup] SendTransport 아직 준비되지 않음, ${delay}ms 후 재시도...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 1.5; // 지수적 백오프
            }
          }
          return null;
        };

        const finalSendTransport = await waitForSendTransport();
        
        if (finalSendTransport) {
          console.log('📹 [MediaSoup] SendTransport 준비 완료, Producer 생성 시작');
          
          // 트랙이 ended 상태라면 새로운 스트림 생성
          if ((videoTrack && videoTrack.readyState === 'ended') || 
              (audioTrack && audioTrack.readyState === 'ended')) {
            console.log('📹 [MediaSoup] 트랙이 ended 상태, 새 스트림 생성...');
            
            try {
              const newStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                  width: { ideal: 200 },
                  height: { ideal: 150 },
                  frameRate: { ideal: 15, max: 30 }
                },
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                  sampleRate: { ideal: 48000 },
                  channelCount: { ideal: 1 },
                  latency: { ideal: 0.02 }
                }
              });
              
              // 새 스트림으로 업데이트
              setLocalStream(newStream);
              if (videoRef.current) {
                videoRef.current.srcObject = newStream;
              }
              
              // 새 트랙 가져오기
              const newVideoTrack = newStream.getVideoTracks()[0];
              const newAudioTrack = newStream.getAudioTracks()[0];
              
              console.log('📹 [MediaSoup] 새 스트림 생성 완료, 새 트랙 사용');
              
              // 비디오 트랙 처리
              if (newVideoTrack && newVideoTrack.readyState === 'live') {
                console.log('📹 [MediaSoup] 새 비디오 Producer 생성 시작...');
                try {
                  await createProducer(finalSendTransport, newVideoTrack);
                } catch (error) {
                  console.error('📹 [MediaSoup] 새 비디오 Producer 생성 실패:', error);
                }
              }
              
              // 오디오 트랙 처리
              if (newAudioTrack && newAudioTrack.readyState === 'live') {
                console.log('📹 [MediaSoup] 새 오디오 Producer 생성 시작...');
                try {
                  await createProducer(finalSendTransport, newAudioTrack);
                } catch (error) {
                  console.error('📹 [MediaSoup] 새 오디오 Producer 생성 실패:', error);
                }
              }
              
            } catch (error) {
              console.error('📹 [MediaSoup] 새 스트림 생성 실패:', error);
            }
          } else {
            // 기존 트랙이 live 상태인 경우 정상 처리
            
            // 비디오 트랙 처리
            if (videoTrack && videoTrack.readyState === 'live') {
              console.log('📹 [MediaSoup] 비디오 Producer 생성 시작...');
              try {
                await createProducer(finalSendTransport, videoTrack);
              } catch (error) {
                console.error('📹 [MediaSoup] 비디오 Producer 생성 실패:', error);
              }
            } else if (videoTrack) {
              console.warn('📹 [MediaSoup] 비디오 트랙이 live 상태가 아님:', videoTrack.readyState);
            }
            
            // 오디오 트랙 처리
            if (audioTrack && audioTrack.readyState === 'live') {
              console.log('📹 [MediaSoup] 오디오 Producer 생성 시작...');
              try {
                await createProducer(finalSendTransport, audioTrack);
              } catch (error) {
                console.error('📹 [MediaSoup] 오디오 Producer 생성 실패:', error);
              }
            } else if (audioTrack) {
              console.warn('📹 [MediaSoup] 오디오 트랙이 live 상태가 아님:', audioTrack.readyState);
            }
          }
        } else {
          console.error('📹 [MediaSoup] SendTransport를 찾을 수 없음 - Producer 생성 불가', {
            maxRetriesReached: true,
            windowTransport: !!window.currentSendTransport,
            stateTransport: !!sendTransport,
            isConnecting: isConnecting,
            mediasoupExecuting: window.mediasoupExecuting
          });
        }
      } else {
        console.error('📹 [MediaSoup] 로컬 스트림을 찾을 수 없음 - Producer 생성 불가');
      }

      console.log('📹 [MediaSoup] 모든 초기화 완료 - isConnecting=false로 설정');
      // 성공적인 연결 시 재시도 카운터 리셋
      window.mediasoupRetryCount = 0;
      // 모든 작업 완료 후 연결 상태 해제 (이미 createTransports에서 설정되었지만 확실하게)
      // setIsConnecting(false); // createTransports에서 이미 처리됨

    } catch (error) {
      console.error('📹 [MediaSoup] 연결 시작 실패:', error);
      setIsConnecting(false);
      window.mediasoupExecuting = false; // 실행 플래그 해제
    }
  }, [socket]);

  // UI가 보이지 않거나 현재 영역이 없으면 렌더링하지 않음
  if (!isVisible || !currentArea) {
    return null;
  }

  return (
    <div className="area-video-call-ui">
      <div className="area-video-header">
        <div className="area-info">
          <span className={`area-type ${currentArea.type}`}>
            {currentArea.type === 'private' ? '🏠' : currentArea.type === 'public' ? '🌍' : '🏛️'}
          </span>
          <span className="area-name">{currentArea.name}</span>
          
          {/* 영역 색상 표시 */}
          {zoneColor && zoneColor !== '#E8E8E8' && (
            <div 
              className="zone-color-indicator"
              style={{ 
                backgroundColor: zoneColor,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '2px solid white',
                display: 'inline-block',
                marginLeft: '8px',
                verticalAlign: 'middle'
              }}
              title={`영역 색상: ${zoneColor}`}
            />
          )}
        </div>
        
        {participants.length > 0 && (
          <div className="participants-count">
            <span className="participants-icon">👥</span>
            <span>{participants.length}</span>
          </div>
        )}
      </div>

      {/* 모든 비디오를 한 층에 표시 (로컬 + 원격) */}
      <div className="videos-container">
        {/* 로컬 비디오 (항상 표시) */}
        <div className="local-video-container">
          <video 
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="local-video"
            style={{
              width: '200px',
              height: '150px',
              backgroundColor: localStream ? 'transparent' : '#1a1a1a'
            }}
          />
          <div className="video-label">
            {localStream ? (socket?.username ? `${socket.username}` : '내 카메라') : '카메라 연결 중...'}
          </div>
          {!localStream && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontSize: '48px'
            }}>
              📹
            </div>
          )}
        </div>

        {/* 원격 비디오들 (MediaSoup 스트림) */}
        {isCallActive && Array.from(remoteStreams.entries())
          .filter(([userId, stream]) => {
            // 자신은 제외 (원격 스트림만 표시)
            const isNotSelf = userId !== socket?.id;
            // 스트림이 있고 트랙이 있는 것만 필터링
            const hasValidTracks = stream && stream.getTracks().length > 0;
            
            if (!isNotSelf) {
              console.log('📹 [UI] 자신의 스트림 제외:', { userId, socketId: socket?.id });
            } else if (!hasValidTracks) {
              console.log('📹 [UI] 빈 스트림 필터링:', { userId, hasStream: !!stream, trackCount: stream?.getTracks()?.length || 0 });
            }
            
            return isNotSelf && hasValidTracks;
          })
          .map(([userId, stream]) => {
          const username = userNames.get(userId) || userId;
          
          // 비디오 트랙 상태 확인
          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks();
          const hasVideoTrack = videoTracks.length > 0;
          const videoTrackEnabled = hasVideoTrack && videoTracks[0].enabled;
          const videoTrackReady = hasVideoTrack && videoTracks[0].readyState === 'live';
          
          // 문제가 있는 경우에만 로그 출력
          if (!hasVideoTrack || !videoTrackEnabled || !videoTrackReady) {
            console.warn('📹 [UI] 비디오 트랙 문제:', {
              userId,
              username,
              hasVideoTrack,
              videoTrackEnabled,
              videoTrackReady,
              videoTrackState: hasVideoTrack ? videoTracks[0].readyState : 'no track'
            });
          }
          
          return (
            <div key={userId} className="remote-video-container">
              <video 
                ref={(videoEl) => {
                  if (videoEl && stream) {
                    remoteVideoRefs.current.set(userId, videoEl);
                    
                    // 스트림 연결
                    videoEl.srcObject = stream;
                    
                    // 비디오 이벤트 리스너 추가
                    const handleLoadedMetadata = () => {
                      console.log('📹 [UI] 비디오 메타데이터 로드 완료:', { userId, username });
                    };
                    
                    const handleCanPlay = () => {
                      console.log('📹 [UI] 비디오 재생 준비 완료:', { userId, username });
                      videoEl.play().catch(playError => {
                        console.warn('📹 [UI] 비디오 재생 실패:', playError);
                      });
                    };
                    
                    const handlePlaying = () => {
                      console.log('📹 [UI] 비디오 재생 시작:', { userId, username });
                    };
                    
                    const handleError = (error) => {
                      console.error('📹 [UI] 비디오 에러:', { userId, username, error });
                    };
                    
                    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
                    videoEl.addEventListener('canplay', handleCanPlay);
                    videoEl.addEventListener('playing', handlePlaying);
                    videoEl.addEventListener('error', handleError);
                    
                    // 컴포넌트 언마운트 시 정리를 위해 ref에 cleanup 함수 저장
                    videoEl._cleanup = () => {
                      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
                      videoEl.removeEventListener('canplay', handleCanPlay);
                      videoEl.removeEventListener('playing', handlePlaying);
                      videoEl.removeEventListener('error', handleError);
                    };
                  } else if (videoEl && videoEl._cleanup) {
                    // 요소가 제거될 때 이벤트 리스너 정리
                    videoEl._cleanup();
                  }
                }}
                autoPlay
                playsInline
                controls={true}
                muted={false}
                className="remote-video"
                style={{
                  width: '300px',
                  height: '200px',
                  backgroundColor: '#000',
                  objectFit: 'cover'
                }}
              />
              <div className="video-label">
                {username}
              </div>
            </div>
          );
        })}
      </div>

      <div className="video-call-controls">
        {isCallActive && (
          <div className="active-call-controls">
            <div className="call-status">
              <span className="call-indicator">🔴</span>
              <span>
                {videoSession?.sessionKey?.startsWith('color_') ? '색상 기반 화상통화 중' : 
                 videoSession?.areaKey ? '영역 화상통화 중' : '자동 화상통화 중'}
              </span>
              <span className="auto-indicator" style={{ 
                fontSize: '10px', 
                marginLeft: '4px', 
                padding: '2px 4px', 
                backgroundColor: 'rgba(0, 255, 0, 0.2)', 
                borderRadius: '3px',
                color: '#00FF00'
              }}>
                AUTO
              </span>
              {zoneColor && (
                <div 
                  className="active-color-indicator"
                  style={{ 
                    backgroundColor: zoneColor,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: '1px solid white',
                    display: 'inline-block',
                    marginLeft: '6px',
                    verticalAlign: 'middle'
                  }}
                />
              )}
              {participants.length > 1 && (
                <span className="participant-list">
                  참여자: {participants.length}명
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {isCallActive && participants.length > 1 && (
        <div className="participants-list">
          <div className="participants-title">참여자 목록:</div>
          <div className="participants-items">
            {participants.map((participant, index) => (
              <div key={participant.userId || participant} className="participant-item">
                <span className="participant-icon">👤</span>
                <span className="participant-id">사용자 {participant.username || participant.userId || participant}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaVideoCallUI;