import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebRTC = (socket, user) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);

  const peerConnections = useRef(new Map());
  const localStreamRef = useRef(null);
  const statsIntervals = useRef(new Map()); // Store interval IDs for cleanup
  const connectionStates = useRef(new Map()); // Track connection states
  const isStartingCamera = useRef(false); // 카메라 시작 중 플래그

  // 미디어 권한 확인
  const checkMediaPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true // 마이크 ON을 기본값으로 설정
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return { video: true, audio: true };
    } catch (err) {
      console.error('미디어 권한 확인 실패:', err);
      setHasPermission(false);
      setError(err.message);
      return { video: false, audio: false };
    }
  }, []);

  // 네트워크 상태 감지
  const detectNetworkQuality = useCallback(async () => {
    // Connection 객체를 통한 네트워크 정보 수집
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    let quality = 'medium'; // 기본값
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink; // Mbps
      
      // 네트워크 타입에 따른 품질 결정
      if (effectiveType === '4g' && downlink > 5) {
        quality = 'high';
      } else if (effectiveType === '3g' || (effectiveType === '4g' && downlink <= 5)) {
        quality = 'medium';
      } else {
        quality = 'low';
      }
      
      console.log(`📡 네트워크 감지: ${effectiveType}, ${downlink}Mbps -> ${quality} 품질`);
    }
    
    // 디바이스 성능 체크
    const deviceMemory = navigator.deviceMemory || 4; // GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4; // CPU 코어 수
    
    if (deviceMemory < 2 || hardwareConcurrency < 4) {
      quality = quality === 'high' ? 'medium' : 'low';
      console.log(`📱 저사양 디바이스 감지: ${deviceMemory}GB RAM, ${hardwareConcurrency} cores`);
    }
    
    return quality;
  }, []);

  // 품질에 따른 비디오 제약 조건 생성
  const getVideoConstraints = useCallback((quality) => {
    const constraints = {
      low: {
        width: { ideal: 320, max: 480 },
        height: { ideal: 240, max: 360 },
        frameRate: { ideal: 15, max: 20 }
      },
      medium: {
        width: { ideal: 640, max: 960 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 24, max: 30 }
      },
      high: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
      }
    };
    
    return constraints[quality] || constraints.medium;
  }, []);

  // 비트레이트 설정 적용
  const applyBitrateSettings = useCallback(async (peerConnection, senders, quality) => {
    const bitrateSettings = {
      low: { video: 200000, audio: 32000 },    // 200 kbps video, 32 kbps audio
      medium: { video: 500000, audio: 64000 }, // 500 kbps video, 64 kbps audio
      high: { video: 1500000, audio: 128000 }  // 1.5 Mbps video, 128 kbps audio
    };
    
    const settings = bitrateSettings[quality] || bitrateSettings.medium;
    
    for (const sender of senders) {
      const params = sender.getParameters();
      
      if (!params.encodings) {
        params.encodings = [{}];
      }
      
      if (sender.track?.kind === 'video') {
        params.encodings[0].maxBitrate = settings.video;
        console.log(`📊 비디오 비트레이트 설정: ${settings.video / 1000} kbps`);
      } else if (sender.track?.kind === 'audio') {
        params.encodings[0].maxBitrate = settings.audio;
        console.log(`📊 오디오 비트레이트 설정: ${settings.audio / 1000} kbps`);
      }
      
      try {
        await sender.setParameters(params);
      } catch (err) {
        console.warn('비트레이트 설정 실패:', err);
      }
    }
    
    // 연결 상태 모니터링
    const handleConnectionStateChange = () => {
      console.log(`📡 연결 상태: ${peerConnection.connectionState}`);
      if (peerConnection.connectionState === 'closed' || 
          peerConnection.connectionState === 'failed' || 
          peerConnection.connectionState === 'disconnected') {
        // Clear the stats interval when connection is closed
        const intervalId = statsIntervals.current.get(peerConnection);
        if (intervalId) {
          clearInterval(intervalId);
          statsIntervals.current.delete(peerConnection);
        }
      }
    };
    peerConnection.addEventListener('connectionstatechange', handleConnectionStateChange);
    
    // 통계 수집 (5초마다) - store interval ID for cleanup
    const intervalId = setInterval(async () => {
      if (peerConnection.connectionState === 'connected') {
        const stats = await peerConnection.getStats();
        stats.forEach(report => {
          if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
            const bitrate = report.bytesSent ? (report.bytesSent * 8 / 1000) : 0;
            console.log(`📊 현재 비디오 전송률: ${Math.round(bitrate)} kbps`);
          }
        });
      }
    }, 5000);
    statsIntervals.current.set(peerConnection, intervalId);
  }, []);

  // 카메라 시작 (마이크 OFF 기본값, 적응형 품질)
  const startCamera = useCallback(async () => {
    // 이미 카메라를 시작하는 중이면 기다림
    if (isStartingCamera.current) {
      console.log('⏳ 카메라가 이미 시작 중입니다...');
      // 기존 스트림이 생성될 때까지 대기
      let retries = 0;
      while (isStartingCamera.current && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
        if (localStreamRef.current) {
          return localStreamRef.current;
        }
      }
    }
    
    try {
      if (localStreamRef.current) {
        // 스트림이 활성화되어 있는지 확인
        const tracks = localStreamRef.current.getTracks();
        const isActive = tracks.some(track => track.readyState === 'live');
        if (isActive) {
          console.log('📹 기존 카메라 스트림 재사용');
          return localStreamRef.current;
        }
        // 비활성 스트림은 정리
        tracks.forEach(track => track.stop());
        localStreamRef.current = null;
      }

      isStartingCamera.current = true;

      // 네트워크 품질 감지
      const quality = await detectNetworkQuality();
      const videoConstraints = getVideoConstraints(quality);
      
      console.log(`🎥 비디오 품질 설정: ${quality}`, videoConstraints);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true // 마이크 ON을 기본값으로 설정
      });

      // 실제 획득한 비디오 트랙 정보 로그
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log(`📹 실제 비디오 설정: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
      }

      // 마이크 트랙 활성화 상태 확인
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log('🔊 마이크 활성화됨');
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoCallActive(true);
      setHasPermission(true);
      setError(null);

      console.log('📹 카메라와 마이크 시작 완료 (둘 다 ON)');
      return stream;
    } catch (err) {
      console.error('카메라 시작 실패:', err);
      setError(err.message);
      
      // 스트림 정리
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      
      throw err;
    } finally {
      isStartingCamera.current = false;
    }
  }, [detectNetworkQuality, getVideoConstraints]);

  // 카메라 중지
  const stopCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsVideoCallActive(false);
  }, []);

  // 마이크 토글
  const toggleMicrophone = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log(`🔇 마이크 ${track.enabled ? 'ON' : 'OFF'}`);
      });
    }
  }, []);

  // 카메라 토글
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log(`📷 카메라 ${track.enabled ? 'ON' : 'OFF'}`);
      });
    }
  }, []);

  // 화면 공유 상태
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const originalStreamRef = useRef(null);

  // 화면 공유 시작/중지
  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        // 화면 공유 스트림 획득
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        // 원본 스트림 저장
        originalStreamRef.current = localStreamRef.current;
        screenStreamRef.current = screenStream;

        // 화면 공유 종료 이벤트 처리
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        // 모든 peer connection의 비디오 트랙 교체
        peerConnections.current.forEach((pc, userId) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && screenStream.getVideoTracks()[0]) {
            sender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        });

        // 로컬 스트림을 화면 공유 스트림으로 교체
        localStreamRef.current = screenStream;
        setLocalStream(screenStream);
        setIsScreenSharing(true);
        
        console.log('🖥️ 화면 공유 시작');
      } catch (error) {
        console.error('화면 공유 시작 실패:', error);
        if (error.name === 'NotAllowedError') {
          console.log('사용자가 화면 공유를 취소했습니다');
        }
      }
    } else {
      stopScreenShare();
    }
  }, [isScreenSharing]);

  // 화면 공유 중지
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // 원본 카메라 스트림으로 복원
    if (originalStreamRef.current) {
      // 모든 peer connection의 비디오 트랙을 원본으로 교체
      peerConnections.current.forEach((pc, userId) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        const originalVideoTrack = originalStreamRef.current.getVideoTracks()[0];
        if (sender && originalVideoTrack) {
          sender.replaceTrack(originalVideoTrack);
        }
      });

      localStreamRef.current = originalStreamRef.current;
      setLocalStream(originalStreamRef.current);
      originalStreamRef.current = null;
    }

    setIsScreenSharing(false);
    console.log('🖥️ 화면 공유 종료');
  }, []);

  // 사용자들과 연결
  const connectToUsers = useCallback(async (userIds) => {
    if (!localStreamRef.current || !socket) return;

    for (const userId of userIds) {
      if (userId === user?.id) continue;

      // 간단한 충돌 방지: 나보다 큰 userId 에게만 offer initiate
      if (user && user.id && userId <= user.id) {
        continue;
      }

      // 이미 연결이 존재하면 스킵
      if (peerConnections.current.has(userId)) continue;

      try {
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        // 로컬 스트림 추가
        const senders = [];
        localStreamRef.current.getTracks().forEach(track => {
          const sender = peerConnection.addTrack(track, localStreamRef.current);
          senders.push(sender);
        });

        // 네트워크 품질에 따른 비트레이트 조정
        const quality = await detectNetworkQuality();
        await applyBitrateSettings(peerConnection, senders, quality);

        // 원격 스트림 처리
        peerConnection.ontrack = (event) => {
          setRemoteStreams(prev => new Map(prev.set(userId, event.streams[0])));
        };

        // ICE 후보 처리
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-signal', {
              type: 'ice-candidate',
              candidate: event.candidate,
              fromUserId: user?.id,
              targetUserId: userId
            });
          }
        };

        // Offer 생성 및 전송
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('webrtc-signal', {
          type: 'offer',
          offer,
          fromUserId: user?.id,
          targetUserId: userId
        });

        peerConnections.current.set(userId, peerConnection);
      } catch (err) {
        console.error(`사용자 ${userId}와의 연결 실패:`, err);
      }
    }
  }, [socket, user, detectNetworkQuality, applyBitrateSettings]);

  // 특정 사용자에게 강제로 Offer를 시작 (초대 수락 시 사용)
  const initiateCallToUser = useCallback(async (targetUsername) => {
    console.log(`📞 initiateCallToUser 호출: targetUsername=${targetUsername}`);
    console.log(`📞 localStreamRef.current:`, !!localStreamRef.current);
    console.log(`📞 socket:`, !!socket);
    
    if (!localStreamRef.current || !socket) {
      console.error(`📞 initiateCallToUser 실패: localStream 또는 socket이 없음`);
      return;
    }
    
    // Check if already connecting or connected
    const existingState = connectionStates.current.get(targetUsername);
    if (existingState === 'connecting' || existingState === 'connected') {
      console.log(`📞 Already ${existingState} with ${targetUsername}, skipping`);
      return;
    }
    
    try {
      console.log(`📞 사용자 ${targetUsername}에게 통화 시작 시도`);
      // 이미 연결되어 있으면 스킵
      if (peerConnections.current.has(targetUsername)) {
        console.log(`📞 이미 ${targetUsername}와 연결되어 있음`);
        const existingPc = peerConnections.current.get(targetUsername);
        if (existingPc.connectionState === 'connected' || existingPc.connectionState === 'connecting') {
          console.log(`📞 Connection is ${existingPc.connectionState}, not recreating`);
          return;
        }
      }
      
      // Mark as connecting
      connectionStates.current.set(targetUsername, 'connecting');

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      });
      
      // ICE candidate 큐 초기화
      peerConnection.iceCandidateQueue = [];

      console.log(`📹 로컬 스트림 추가 (initiate): ${targetUsername}`);
      console.log(`📹 로컬 스트림 트랙 수 (initiate):`, localStreamRef.current.getTracks().length);
      const senders = [];
      localStreamRef.current.getTracks().forEach((track, index) => {
        console.log(`📹 트랙 ${index} (initiate): ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        const sender = peerConnection.addTrack(track, localStreamRef.current);
        senders.push(sender);
      });

      // 네트워크 품질에 따른 비트레이트 조정
      const quality = await detectNetworkQuality();
      await applyBitrateSettings(peerConnection, senders, quality);

        peerConnection.ontrack = (event) => {
          console.log(`📹 원격 스트림 수신 (initiate): ${targetUsername}`, event.streams[0]);
          console.log(`📹 스트림 ID (initiate):`, event.streams[0].id);
          console.log(`📹 스트림 트랙 수 (initiate):`, event.streams[0].getTracks().length);
          
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(targetUsername, event.streams[0]);
            console.log(`📹 RemoteStreams 업데이트 (initiate):`, Array.from(newMap.keys()));
            return newMap;
          });
        };

        peerConnection.onconnectionstatechange = () => {
          console.log(`📞 연결 상태 변경 (initiate): ${targetUsername} - ${peerConnection.connectionState}`);
          connectionStates.current.set(targetUsername, peerConnection.connectionState);
          if (peerConnection.connectionState === 'failed') {
            console.error(`📞 연결 실패 (initiate): ${targetUsername}`);
            console.error(`📞 ICE 연결 상태: ${peerConnection.iceConnectionState}`);
            console.error(`📞 시그널링 상태: ${peerConnection.signalingState}`);
            // 연결 재시도
            setTimeout(() => {
              console.log(`📞 연결 재시도: ${targetUsername}`);
              peerConnection.restartIce();
            }, 1000);
          } else if (peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'disconnected') {
            connectionStates.current.delete(targetUsername);
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          console.log(`📞 ICE 연결 상태 변경 (initiate): ${targetUsername} - ${peerConnection.iceConnectionState}`);
          if (peerConnection.iceConnectionState === 'failed') {
            console.error(`📞 ICE 연결 실패 (initiate): ${targetUsername}`);
            console.error(`📞 ICE 수집 상태: ${peerConnection.iceGatheringState}`);
            console.error(`📞 원격 설명 설정됨: ${peerConnection.remoteDescription ? 'Yes' : 'No'}`);
            console.error(`📞 로컬 설명 설정됨: ${peerConnection.localDescription ? 'Yes' : 'No'}`);
          } else if (peerConnection.iceConnectionState === 'checking') {
            console.log(`📞 ICE 후보 확인 중: ${targetUsername}`);
          } else if (peerConnection.iceConnectionState === 'connected') {
            console.log(`✅ ICE 연결 성공: ${targetUsername}`);
          }
        };

        peerConnection.onsignalingstatechange = () => {
          console.log(`📞 시그널링 상태 변경 (initiate): ${targetUsername} - ${peerConnection.signalingState}`);
        };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 ICE 후보 생성: ${targetUsername}`, event.candidate.candidate);
          socket.emit('webrtc-signal', {
            type: 'ice-candidate',
            candidate: event.candidate,
            fromUserId: user?.id,
            fromUsername: user?.username,
            targetUserId: targetUsername // 수락자의 username 사용
          });
        } else {
          console.log(`🧊 ICE 수집 완료: ${targetUsername}`);
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log(`📞 Offer 생성 완료, 시그널 전송: targetUsername=${targetUsername}`);
      socket.emit('webrtc-signal', {
        type: 'offer',
        offer,
        fromUserId: user?.id,
        fromUsername: user?.username,
        targetUserId: targetUsername // 수락자의 username 사용
      });

      peerConnections.current.set(targetUsername, peerConnection);
      console.log(`📞 PeerConnection 설정 완료: ${targetUsername}`);
      console.log(`📞 현재 PeerConnection 수: ${peerConnections.current.size}`);
    } catch (err) {
      console.error(`📞 사용자 ${targetUsername}에 대한 통화 시작 실패:`, err);
      connectionStates.current.delete(targetUsername); // Clear connection state on error
      throw err; // 에러를 다시 던져서 상위에서 처리할 수 있도록
    }
  }, [socket, user, detectNetworkQuality, applyBitrateSettings]);

  // WebRTC 시그널 처리
  const handleWebRTCSignal = useCallback(async (data) => {
    const { type, fromUserId, fromUsername, offer, answer, candidate } = data;
    console.log(`📡 WebRTC 시그널 수신: ${type} from ${fromUsername || fromUserId}`);

    try {
      // username을 우선 키로 사용 (username이 없으면 userId 사용)
      let peerConnectionKey = fromUsername && fromUsername !== '' ? fromUsername : fromUserId;
      let peerConnection = peerConnections.current.get(peerConnectionKey);
      
      // 기존 연결 찾기 (숫자 ID로 저장된 경우 처리)
      if (!peerConnection && fromUsername) {
        // 숫자 ID로 저장된 연결 제거
        for (const [key, connection] of peerConnections.current.entries()) {
          if (typeof key === 'number' || (typeof key === 'string' && !isNaN(key))) {
            console.log(`📞 잘못된 키 ${key}로 저장된 연결 제거`);
            connection.close();
            peerConnections.current.delete(key);
            connectionStates.current.delete(key);
            // RemoteStreams에서도 제거
            setRemoteStreams(prev => {
              const newMap = new Map(prev);
              newMap.delete(key);
              return newMap;
            });
          }
        }
        // username으로 다시 찾기
        peerConnection = peerConnections.current.get(fromUsername);
        if (peerConnection) {
          peerConnectionKey = fromUsername;
        }
      }
      
      console.log(`📞 PeerConnection 키: ${peerConnectionKey}, 연결 존재: ${!!peerConnection}`);

      if (!peerConnection && (type === 'offer' || type === 'answer')) {
        // Check if already connecting
        const existingState = connectionStates.current.get(peerConnectionKey);
        if (existingState === 'connecting' || existingState === 'connected') {
          console.log(`📞 Already ${existingState} with ${peerConnectionKey}, ignoring signal`);
          return;
        }
        
        console.log(`📞 새로운 PeerConnection 생성: ${fromUsername || fromUserId}`);
        connectionStates.current.set(peerConnectionKey, 'connecting');
        
        peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        });
        
        // ICE candidate 큐 초기화
        peerConnection.iceCandidateQueue = [];

        if (localStreamRef.current) {
          console.log(`📹 로컬 스트림 추가: ${fromUsername || fromUserId}`);
          console.log(`📹 로컬 스트림 트랙 수:`, localStreamRef.current.getTracks().length);
          localStreamRef.current.getTracks().forEach((track, index) => {
            console.log(`📹 트랙 ${index}: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
            peerConnection.addTrack(track, localStreamRef.current);
          });
        } else {
          console.error(`📹 로컬 스트림이 없음: ${fromUsername || fromUserId}`);
        }

        peerConnection.ontrack = (event) => {
          console.log(`📹 원격 스트림 수신: ${fromUsername || fromUserId}`, event.streams[0]);
          console.log(`📹 스트림 ID:`, event.streams[0].id);
          console.log(`📹 스트림 트랙 수:`, event.streams[0].getTracks().length);
          console.log(`📹 비디오 트랙:`, event.streams[0].getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })));
          console.log(`📹 오디오 트랙:`, event.streams[0].getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })));
          
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(peerConnectionKey, event.streams[0]);
            console.log(`📹 RemoteStreams 업데이트:`, Array.from(newMap.keys()));
            return newMap;
          });
        };

        peerConnection.onconnectionstatechange = () => {
          console.log(`📞 연결 상태 변경: ${fromUsername || fromUserId} - ${peerConnection.connectionState}`);
          connectionStates.current.set(peerConnectionKey, peerConnection.connectionState);
          if (peerConnection.connectionState === 'failed') {
            console.error(`📞 연결 실패: ${fromUsername || fromUserId}`);
            connectionStates.current.delete(peerConnectionKey);
          } else if (peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'disconnected') {
            connectionStates.current.delete(peerConnectionKey);
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          console.log(`📞 ICE 연결 상태 변경: ${fromUsername || fromUserId} - ${peerConnection.iceConnectionState}`);
          if (peerConnection.iceConnectionState === 'failed') {
            console.error(`📞 ICE 연결 실패: ${fromUsername || fromUserId}`);
          }
        };

        peerConnection.onicegatheringstatechange = () => {
          console.log(`📞 ICE 수집 상태 변경: ${fromUsername || fromUserId} - ${peerConnection.iceGatheringState}`);
        };

        peerConnection.onsignalingstatechange = () => {
          console.log(`📞 시그널링 상태 변경: ${fromUsername || fromUserId} - ${peerConnection.signalingState}`);
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(`🧊 ICE 후보 생성 (answer): ${peerConnectionKey}`);
            socket.emit('webrtc-signal', {
              type: 'ice-candidate',
              candidate: event.candidate,
              targetUserId: fromUsername || fromUserId,
              fromUserId: user?.id,
              fromUsername: user?.username
            });
          } else {
            console.log(`🧊 ICE 수집 완료 (answer): ${peerConnectionKey}`);
          }
        };

        peerConnections.current.set(peerConnectionKey, peerConnection);
      }

      if (!peerConnection) return;

      switch (type) {
        case 'offer':
          console.log(`📞 Offer 처리 시작: ${fromUsername || fromUserId}`);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          console.log(`📞 Remote Description 설정 완료 (offer)`);
          
          // 큐에 저장된 ICE candidate들 처리
          if (peerConnection.iceCandidateQueue && peerConnection.iceCandidateQueue.length > 0) {
            console.log(`📞 큐에 저장된 ${peerConnection.iceCandidateQueue.length}개의 ICE candidate 처리`);
            for (const queuedCandidate of peerConnection.iceCandidateQueue) {
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(queuedCandidate));
                console.log(`📞 큐에 저장된 ICE candidate 추가 완료`);
              } catch (error) {
                console.error(`📞 큐에 저장된 ICE candidate 추가 실패:`, error);
              }
            }
            peerConnection.iceCandidateQueue = [];
          }
          
          const answerToSend = await peerConnection.createAnswer();
          console.log(`📞 Answer 생성 완료`);
          
          await peerConnection.setLocalDescription(answerToSend);
          console.log(`📞 Local Description 설정 완료 (answer)`);
          
          socket.emit('webrtc-signal', {
            type: 'answer',
            answer: answerToSend,
            fromUserId: user?.id,
            fromUsername: user?.username,
            targetUserId: fromUsername || fromUserId
          });
          console.log(`📞 Answer 전송 완료: ${fromUsername || fromUserId}`);
          break;

        case 'answer':
          console.log(`📞 Answer 처리 시작: ${fromUsername || fromUserId}`);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`📞 Answer 처리 완료: ${fromUsername || fromUserId}`);
          
          // 큐에 저장된 ICE candidate들 처리
          if (peerConnection.iceCandidateQueue && peerConnection.iceCandidateQueue.length > 0) {
            console.log(`📞 큐에 저장된 ${peerConnection.iceCandidateQueue.length}개의 ICE candidate 처리`);
            for (const queuedCandidate of peerConnection.iceCandidateQueue) {
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(queuedCandidate));
                console.log(`📞 큐에 저장된 ICE candidate 추가 완료`);
              } catch (error) {
                console.error(`📞 큐에 저장된 ICE candidate 추가 실패:`, error);
              }
            }
            peerConnection.iceCandidateQueue = [];
          }
          break;

        case 'ice-candidate':
          console.log(`📞 ICE Candidate 처리: ${fromUsername || fromUserId}`);
          if (candidate) {
            // Remote description이 설정된 후에만 ICE candidate 추가
            if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
              console.log(`📞 ICE Candidate 추가 완료`);
            } else {
              console.log(`📞 Remote description이 설정되지 않아 ICE candidate를 큐에 저장`);
              // ICE candidate를 큐에 저장
              if (!peerConnection.iceCandidateQueue) {
                peerConnection.iceCandidateQueue = [];
              }
              peerConnection.iceCandidateQueue.push(candidate);
            }
          }
          break;

        default:
          console.warn('알 수 없는 WebRTC 시그널 타입:', type);
      }
    } catch (err) {
      console.error('WebRTC 시그널 처리 실패:', err);
    }
  }, [socket]);

  // 연결 해제
  const disconnectFromUser = useCallback((username) => {
    console.log(`📞 연결 해제 시도: ${username}`);
    
    // username으로 연결 찾기
    const peerConnection = peerConnections.current.get(username);
    if (peerConnection) {
      // Clear stats interval
      const intervalId = statsIntervals.current.get(peerConnection);
      if (intervalId) {
        clearInterval(intervalId);
        statsIntervals.current.delete(peerConnection);
      }
      
      peerConnection.close();
      peerConnections.current.delete(username);
      connectionStates.current.delete(username);
      console.log(`📞 연결 해제 완료: ${username}`);
    }
    
    // 숫자 ID로 저장된 연결도 정리
    for (const [key, connection] of peerConnections.current.entries()) {
      if (typeof key === 'number' || (typeof key === 'string' && !isNaN(key))) {
        console.log(`📞 잘못된 키 ${key}로 저장된 연결 정리`);
        const intervalId = statsIntervals.current.get(connection);
        if (intervalId) {
          clearInterval(intervalId);
          statsIntervals.current.delete(connection);
        }
        connection.close();
        peerConnections.current.delete(key);
        connectionStates.current.delete(key);
      }
    }
    
    // RemoteStreams에서 username과 숫자 ID 모두 제거
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(username);
      // 숫자 ID도 제거
      for (const key of newMap.keys()) {
        if (typeof key === 'number' || (typeof key === 'string' && !isNaN(key))) {
          newMap.delete(key);
        }
      }
      return newMap;
    });
  }, []);

  // 모든 연결 해제
  const disconnectAll = useCallback(() => {
    // Clear all stats intervals
    statsIntervals.current.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    statsIntervals.current.clear();
    
    // Close all peer connections
    peerConnections.current.forEach(connection => {
      connection.close();
    });
    peerConnections.current.clear();
    connectionStates.current.clear();
    
    // RemoteStreams 초기화 (숫자 ID 포함 모두 제거)
    setRemoteStreams(new Map());
  }, []);

  // 통화 종료
  const endCall = useCallback(() => {
    // 화면 공유 중이면 중지
    if (isScreenSharing) {
      stopScreenShare();
    }
    
    // 모든 연결 종료
    disconnectAll();
    
    // 카메라 중지
    stopCamera();
  }, [isScreenSharing, stopScreenShare, disconnectAll, stopCamera]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopCamera();
      disconnectAll();
    };
  }, [stopCamera, disconnectAll]);

  return {
    localStream,
    remoteStreams,
    isVideoCallActive,
    hasPermission,
    error,
    isScreenSharing,
    checkMediaPermissions,
    startCamera,
    stopCamera,
    toggleMicrophone,
    toggleCamera,
    toggleScreenShare,
    connectToUsers,
    initiateCallToUser,
    handleWebRTCSignal,
    disconnectFromUser,
    disconnectAll,
    endCall
  };
};
