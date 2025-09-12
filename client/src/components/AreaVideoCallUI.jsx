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
  const videoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map()); // 원격 비디오 엘리먼트들

  // 로컬 카메라 시작
  const startLocalCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 200, height: 150 },
        audio: true
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
    if (!socket) return;

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
      const { producerId, userId, kind } = data;
      
      if (receiveTransport) {
        await createConsumer(receiveTransport, producerId, userId);
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
    };
  }, [socket]);

  // MediaSoup Device 초기화
  const initializeMediaSoupDevice = useCallback(async () => {
    if (mediasoupDevice) return mediasoupDevice;

    try {
      const device = new Device();
      console.log('📹 [MediaSoup] Device 생성 완료');
      setMediasoupDevice(device);
      return device;
    } catch (error) {
      console.error('📹 [MediaSoup] Device 생성 실패:', error);
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
        if (sendTransportCreated && receiveTransportCreated) {
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
                socket.emit('connect-transport', {
                  transportId: sendTransport.id,
                  dtlsParameters
                }, (result) => {
                  if (result.success) callback();
                  else errback(new Error(result.error));
                });
              } catch (error) {
                errback(error);
              }
            });

            sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
              try {
                socket.emit('produce', {
                  transportId: sendTransport.id,
                  kind,
                  rtpParameters
                }, (result) => {
                  if (result.success) callback({ id: result.producerId });
                  else errback(new Error(result.error));
                });
              } catch (error) {
                errback(error);
              }
            });

            setSendTransport(sendTransport);
            console.log('📹 [MediaSoup] Send Transport 생성 완료');
            sendTransportCreated = true;
            checkBothTransports();
          } else {
            reject(new Error('Send Transport 생성 실패'));
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
                  if (result.success) callback();
                  else errback(new Error(result.error));
                });
              } catch (error) {
                errback(error);
              }
            });

            setReceiveTransport(receiveTransport);
            console.log('📹 [MediaSoup] Receive Transport 생성 완료');
            receiveTransportCreated = true;
            checkBothTransports();
          } else {
            reject(new Error('Receive Transport 생성 실패'));
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
    if (!transport || !track) return;

    try {
      const producer = await transport.produce({ track });
      setProducers(prev => new Map(prev.set(track.kind, producer)));
      console.log('📹 [MediaSoup] Producer 생성 완료:', track.kind, producer.id);
      return producer;
    } catch (error) {
      console.error('📹 [MediaSoup] Producer 생성 실패:', error);
    }
  }, []);

  // MediaSoup Consumer 생성 (원격 스트림 수신)
  const createConsumer = useCallback(async (transport, producerId, userId) => {
    if (!transport || !producerId) return;

    try {
      socket.emit('consume', {
        transportId: transport.id,
        producerId,
        rtpCapabilities: mediasoupDevice.rtpCapabilities
      }, async (response) => {
        if (response.success) {
          const consumer = await transport.consume(response.params);
          setConsumers(prev => new Map(prev.set(`${userId}_${consumer.kind}`, consumer)));
          
          // 원격 스트림 생성 및 비디오 엘리먼트에 연결
          const stream = new MediaStream([consumer.track]);
          setRemoteStreams(prev => new Map(prev.set(userId, stream)));
          
          const videoElement = remoteVideoRefs.current.get(userId);
          if (videoElement) {
            videoElement.srcObject = stream;
          }

          console.log('📹 [MediaSoup] Consumer 생성 완료:', userId, consumer.kind, consumer.id);
          
          // Consumer 재개
          socket.emit('resume-consumer', { consumerId: consumer.id });
        }
      });
    } catch (error) {
      console.error('📹 [MediaSoup] Consumer 생성 실패:', error);
    }
  }, [socket, mediasoupDevice]);

  // 모든 MediaSoup 연결 시작
  const startMediaSoupConnections = useCallback(async (participantIds) => {
    if (!localStream || !socket) return;

    console.log('📹 [MediaSoup] 모든 참가자와 연결 시작:', participantIds);
    
    try {
      // Device 초기화
      const device = await initializeMediaSoupDevice();
      
      // RTP Capabilities 가져오기
      socket.emit('get-router-rtp-capabilities', {}, (response) => {
        if (response.success) {
          device.load({ routerRtpCapabilities: response.rtpCapabilities })
            .then(async () => {
              console.log('📹 [MediaSoup] Device RTP Capabilities 로드 완료');
              // Transport 생성 및 대기
              await createTransports(device);
              
              // Transport 생성 완료 후 로컬 스트림 전송 시작
              setTimeout(async () => {
                if (localStream) {
                  console.log('📹 [MediaSoup] 로컬 미디어 전송 시작');
                  const videoTrack = localStream.getVideoTracks()[0];
                  const audioTrack = localStream.getAudioTracks()[0];
                  
                  // sendTransport 상태를 다시 확인
                  const currentSendTransport = sendTransport;
                  if (currentSendTransport) {
                    if (videoTrack) {
                      await createProducer(currentSendTransport, videoTrack);
                    }
                    if (audioTrack) {
                      await createProducer(currentSendTransport, audioTrack);
                    }
                  } else {
                    console.log('📹 [MediaSoup] SendTransport가 아직 준비되지 않음');
                  }
                }
              }, 100); // Transport 상태 업데이트를 위한 짧은 지연
            });
        }
      });

    } catch (error) {
      console.error('📹 [MediaSoup] 연결 시작 실패:', error);
    }
  }, [localStream, socket, initializeMediaSoupDevice, createTransports]);

  // MediaSoup 연결 정리
  const cleanupMediaSoupConnections = useCallback(() => {
    console.log('📹 [MediaSoup] 모든 연결 정리');
    
    producers.forEach((producer) => {
      producer.close();
    });
    
    consumers.forEach((consumer) => {
      consumer.close();
    });

    if (sendTransport) {
      sendTransport.close();
      setSendTransport(null);
    }

    if (receiveTransport) {
      receiveTransport.close();
      setReceiveTransport(null);
    }
    
    setProducers(new Map());
    setConsumers(new Map());
    setRemoteStreams(new Map());
    remoteVideoRefs.current.clear();
  }, [producers, consumers, sendTransport, receiveTransport]);

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

      {/* 로컬 비디오 표시 (항상 표시) */}
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
            backgroundColor: localStream ? 'transparent' : '#1a1a1a',
            border: '2px solid #333',
            borderRadius: '8px'
          }}
        />
        <div className="video-label">
          {localStream ? '내 카메라' : '카메라 연결 중...'}
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

      {/* 원격 비디오들 표시 (MediaSoup 스트림) */}
      {isCallActive && remoteStreams.size > 0 && (
        <div className="remote-videos-container" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginTop: '10px'
        }}>
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <div key={userId} className="remote-video-container" style={{
              position: 'relative'
            }}>
              <video 
                ref={(videoEl) => {
                  if (videoEl) {
                    remoteVideoRefs.current.set(userId, videoEl);
                    videoEl.srcObject = stream;
                  }
                }}
                autoPlay
                playsInline
                className="remote-video"
                style={{
                  width: '200px',
                  height: '150px',
                  backgroundColor: '#1a1a1a',
                  border: '2px solid #666',
                  borderRadius: '8px'
                }}
              />
              <div className="video-label" style={{
                position: 'absolute',
                bottom: '5px',
                left: '5px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '12px'
              }}>
                사용자 {userId}
              </div>
            </div>
          ))}
        </div>
      )}

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
            
            <button 
              className="end-call-btn"
              onClick={endVideoCall}
              disabled={isLoading}
            >
              {isLoading ? '⏳' : '📞'} 통화 종료
            </button>
          </div>
        )}
      </div>

      {isCallActive && participants.length > 1 && (
        <div className="participants-list">
          <div className="participants-title">참여자 목록:</div>
          <div className="participants-items">
            {participants.map((participantId, index) => (
              <div key={participantId} className="participant-item">
                <span className="participant-icon">👤</span>
                <span className="participant-id">사용자 {participantId}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaVideoCallUI;