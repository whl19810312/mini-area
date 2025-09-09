import { useEffect, useRef, useState, useCallback } from 'react';
import { Device } from 'mediasoup-client';
import { useAuth } from '../contexts/AuthContext';

export const useMediasoup = () => {
  const { socket } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  
  const deviceRef = useRef(null);
  const producersRef = useRef(new Map());
  const consumersRef = useRef(new Map());
  const transportRef = useRef({ send: null, recv: null });

  // MediaSoup Device 초기화
  const initDevice = useCallback(async () => {
    try {
      deviceRef.current = new Device();
      console.log('MediaSoup Device created');
    } catch (error) {
      console.error('Failed to create MediaSoup Device:', error);
      throw error;
    }
  }, []);

  // 방 생성
  const createRoom = useCallback(async (roomId) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      socket.emit('mediasoup:createRoom', { roomId }, (response) => {
        if (response.success) {
          resolve(response.room);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, [socket]);

  // 방 참가
  const joinRoom = useCallback(async (roomId, userName) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    try {
      // Device 초기화
      if (!deviceRef.current) {
        await initDevice();
      }

      // 방 참가
      const joinResponse = await new Promise((resolve, reject) => {
        socket.emit('mediasoup:joinRoom', { roomId, userName }, (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      setRoom(joinResponse.room);

      // Router RTP Capabilities 가져오기
      const rtpCapabilities = await new Promise((resolve, reject) => {
        socket.emit('mediasoup:getRouterRtpCapabilities', { roomId }, (response) => {
          if (response.success) {
            resolve(response.rtpCapabilities);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      // Device 로드
      await deviceRef.current.load({ routerRtpCapabilities: rtpCapabilities });

      // Transport 생성
      await createTransports(roomId);

      // 로컬 미디어 스트림 가져오기
      await startLocalStream();

      setIsConnected(true);
      console.log(`Successfully joined room: ${roomId}`);

      // 새로운 프로듀서 이벤트 리스닝
      socket.on('mediasoup:newProducer', handleNewProducer);
      socket.on('mediasoup:peerLeft', handlePeerLeft);

      return joinResponse.room;
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }, [socket]);

  // Transport 생성
  const createTransports = useCallback(async (roomId) => {
    // Send Transport 생성
    const sendTransportInfo = await new Promise((resolve, reject) => {
      socket.emit('mediasoup:createTransport', { roomId, direction: 'send' }, (response) => {
        if (response.success) {
          resolve(response.transport);
        } else {
          reject(new Error(response.error));
        }
      });
    });

    const sendTransport = deviceRef.current.createSendTransport(sendTransportInfo);

    sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise((resolve, reject) => {
          socket.emit('mediasoup:connectTransport', {
            roomId,
            transportId: sendTransport.id,
            dtlsParameters
          }, (response) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error));
            }
          });
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const response = await new Promise((resolve, reject) => {
          socket.emit('mediasoup:produce', {
            roomId,
            transportId: sendTransport.id,
            kind,
            rtpParameters,
            appData
          }, (response) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error));
            }
          });
        });
        callback({ id: response.producerId });
      } catch (error) {
        errback(error);
      }
    });

    transportRef.current.send = sendTransport;

    // Receive Transport 생성
    const recvTransportInfo = await new Promise((resolve, reject) => {
      socket.emit('mediasoup:createTransport', { roomId, direction: 'recv' }, (response) => {
        if (response.success) {
          response.transport.appData = { consuming: true };
          resolve(response.transport);
        } else {
          reject(new Error(response.error));
        }
      });
    });

    const recvTransport = deviceRef.current.createRecvTransport(recvTransportInfo);

    recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise((resolve, reject) => {
          socket.emit('mediasoup:connectTransport', {
            roomId,
            transportId: recvTransport.id,
            dtlsParameters
          }, (response) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error));
            }
          });
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    transportRef.current.recv = recvTransport;
  }, [socket]);

  // 로컬 스트림 시작
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      setLocalStream(stream);

      // 비디오 트랙 produce
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && transportRef.current.send) {
        const videoProducer = await transportRef.current.send.produce({
          track: videoTrack,
          codecOptions: {
            videoGoogleStartBitrate: 1000
          }
        });
        producersRef.current.set('video', videoProducer);
      }

      // 오디오 트랙 produce
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack && transportRef.current.send) {
        const audioProducer = await transportRef.current.send.produce({
          track: audioTrack
        });
        producersRef.current.set('audio', audioProducer);
      }

      return stream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw error;
    }
  }, []);

  // 새로운 프로듀서 처리
  const handleNewProducer = useCallback(async ({ producerId, peerId, kind }) => {
    if (!room || !transportRef.current.recv || !deviceRef.current) return;

    try {
      const response = await new Promise((resolve, reject) => {
        socket.emit('mediasoup:consume', {
          roomId: room.id,
          producerId,
          rtpCapabilities: deviceRef.current.rtpCapabilities
        }, (response) => {
          if (response.success) {
            resolve(response.consumer);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      const consumer = await transportRef.current.recv.consume({
        id: response.id,
        producerId: response.producerId,
        kind: response.kind,
        rtpParameters: response.rtpParameters
      });

      consumersRef.current.set(consumer.id, consumer);

      // 스트림 추가
      const stream = new MediaStream();
      stream.addTrack(consumer.track);

      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        const existingStream = newStreams.get(peerId);
        
        if (existingStream) {
          existingStream.addTrack(consumer.track);
        } else {
          newStreams.set(peerId, stream);
        }
        
        return newStreams;
      });

      // Consumer resume
      await socket.emit('mediasoup:resumeConsumer', {
        roomId: room.id,
        consumerId: consumer.id
      });

    } catch (error) {
      console.error('Failed to consume:', error);
    }
  }, [room, socket]);

  // Peer 나감 처리
  const handlePeerLeft = useCallback(({ peerId }) => {
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(peerId);
      return newStreams;
    });
  }, []);

  // 오디오 토글
  const toggleAudio = useCallback(() => {
    const audioProducer = producersRef.current.get('audio');
    if (audioProducer) {
      if (audioEnabled) {
        audioProducer.pause();
      } else {
        audioProducer.resume();
      }
      setAudioEnabled(!audioEnabled);
    }
  }, [audioEnabled]);

  // 비디오 토글
  const toggleVideo = useCallback(() => {
    const videoProducer = producersRef.current.get('video');
    if (videoProducer) {
      if (videoEnabled) {
        videoProducer.pause();
      } else {
        videoProducer.resume();
      }
      setVideoEnabled(!videoEnabled);
    }
  }, [videoEnabled]);

  // 방 나가기
  const leaveRoom = useCallback(async () => {
    if (!socket || !room) return;

    try {
      // 모든 producer 정리
      for (const producer of producersRef.current.values()) {
        producer.close();
      }
      producersRef.current.clear();

      // 모든 consumer 정리
      for (const consumer of consumersRef.current.values()) {
        consumer.close();
      }
      consumersRef.current.clear();

      // Transport 정리
      if (transportRef.current.send) {
        transportRef.current.send.close();
        transportRef.current.send = null;
      }
      if (transportRef.current.recv) {
        transportRef.current.recv.close();
        transportRef.current.recv = null;
      }

      // 로컬 스트림 정리
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      // 서버에 나가기 알림
      await new Promise((resolve) => {
        socket.emit('mediasoup:leaveRoom', {}, resolve);
      });

      // 이벤트 리스너 제거
      socket.off('mediasoup:newProducer', handleNewProducer);
      socket.off('mediasoup:peerLeft', handlePeerLeft);

      setIsConnected(false);
      setRoom(null);
      setRemoteStreams(new Map());

      console.log('Left the room');
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [socket, room, localStream, handleNewProducer, handlePeerLeft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        leaveRoom();
      }
    };
  }, [isConnected]);

  return {
    isConnected,
    room,
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo
  };
};