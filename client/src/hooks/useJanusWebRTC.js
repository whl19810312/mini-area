import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_SERVER_URL || 'https://localhost:7000';

export const useJanusWebRTC = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState([]);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const sessionInfoRef = useRef(null);

  // ICE 서버 설정
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // 미디어 스트림 시작
  const startLocalStream = useCallback(async (video = true, audio = true) => {
    try {
      const constraints = {
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      return stream;
    } catch (error) {
      console.error('미디어 스트림 시작 실패:', error);
      throw error;
    }
  }, []);

  // 룸 참가
  const joinRoom = useCallback(async (roomType, roomInfo = {}) => {
    try {
      // 먼저 로컬 스트림 시작
      if (!localStreamRef.current) {
        await startLocalStream();
      }

      // Janus 룸 참가 API 호출
      const response = await axios.post(`${API_URL}/api/janus/join-room`, {
        roomType,
        roomInfo
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        const { roomId, sessionId, handleId, publishers } = response.data.data;
        
        sessionInfoRef.current = {
          sessionId,
          handleId,
          roomId
        };

        setCurrentRoom({
          roomType,
          roomId,
          ...roomInfo
        });

        // PeerConnection 생성
        pcRef.current = new RTCPeerConnection(iceServers);

        // 로컬 스트림 추가
        localStreamRef.current.getTracks().forEach(track => {
          pcRef.current.addTrack(track, localStreamRef.current);
        });

        // ICE candidate 이벤트 처리
        pcRef.current.onicecandidate = async (event) => {
          if (event.candidate) {
            await sendIceCandidate(event.candidate);
          }
        };

        // 원격 스트림 수신 처리
        pcRef.current.ontrack = (event) => {
          handleRemoteStream(event);
        };

        // SDP Offer 생성 및 전송
        await createAndSendOffer();

        // 기존 참가자 정보 처리
        if (publishers && publishers.length > 0) {
          setParticipants(publishers);
          // 각 참가자에 대한 구독 처리
          for (const publisher of publishers) {
            await subscribeToPublisher(publisher);
          }
        }

        setIsConnected(true);
        console.log('✅ 룸 참가 성공:', roomId);
      }
    } catch (error) {
      console.error('룸 참가 실패:', error);
      throw error;
    }
  }, [startLocalStream]);

  // SDP Offer 생성 및 전송
  const createAndSendOffer = async () => {
    try {
      const offer = await pcRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await pcRef.current.setLocalDescription(offer);

      // 서버로 Offer 전송
      const response = await axios.post(`${API_URL}/api/janus/configure-publisher`, {
        offer: offer
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success && response.data.data.jsep) {
        // Answer 처리
        const answer = response.data.data.jsep;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Offer 생성/전송 실패:', error);
    }
  };

  // ICE Candidate 전송
  const sendIceCandidate = async (candidate) => {
    try {
      await axios.post(`${API_URL}/api/janus/ice-candidate`, {
        candidate
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('ICE candidate 전송 실패:', error);
    }
  };

  // 원격 스트림 처리
  const handleRemoteStream = (event) => {
    const { streams } = event;
    if (streams && streams[0]) {
      const stream = streams[0];
      const streamId = stream.id;
      
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(streamId, stream);
        return newStreams;
      });
    }
  };

  // Publisher 구독
  const subscribeToPublisher = async (publisher) => {
    try {
      // 구독용 PeerConnection 생성
      const subscriberPc = new RTCPeerConnection(iceServers);
      
      subscriberPc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(publisher.id, stream);
            return newStreams;
          });
        }
      };

      // 구독 로직 구현
      // Janus의 subscriber 처리 필요
    } catch (error) {
      console.error('Publisher 구독 실패:', error);
    }
  };

  // 룸 나가기
  const leaveRoom = useCallback(async () => {
    try {
      if (sessionInfoRef.current) {
        await axios.post(`${API_URL}/api/janus/leave-room`, {}, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      }

      // PeerConnection 정리
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      // 로컬 스트림 정리
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }

      // 원격 스트림 정리
      remoteStreams.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      setRemoteStreams(new Map());

      setIsConnected(false);
      setCurrentRoom(null);
      setParticipants([]);
      sessionInfoRef.current = null;

      console.log('✅ 룸 나가기 완료');
    } catch (error) {
      console.error('룸 나가기 실패:', error);
    }
  }, [remoteStreams]);

  // 룸 전환
  const switchRoom = useCallback(async (fromRoomType, toRoomType, roomInfo = {}) => {
    try {
      const response = await axios.post(`${API_URL}/api/janus/switch-room`, {
        fromRoomType,
        toRoomType,
        roomInfo
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setCurrentRoom({
          roomType: toRoomType,
          roomId: response.data.data.roomId,
          ...roomInfo
        });

        // 새 룸의 참가자 정보 업데이트
        if (response.data.data.publishers) {
          setParticipants(response.data.data.publishers);
        }

        console.log('✅ 룸 전환 성공');
      }
    } catch (error) {
      console.error('룸 전환 실패:', error);
      throw error;
    }
  }, []);

  // 음소거 토글
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // 비디오 토글
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff]);

  // 참가자 목록 조회
  const fetchParticipants = useCallback(async () => {
    if (!currentRoom) return;

    try {
      const params = {
        roomType: currentRoom.roomType
      };

      if (currentRoom.roomType === 'area') {
        params.metaverseId = currentRoom.metaverseId;
        params.areaId = currentRoom.areaId;
      }

      const response = await axios.get(`${API_URL}/api/janus/room-participants`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setParticipants(response.data.data);
      }
    } catch (error) {
      console.error('참가자 목록 조회 실패:', error);
    }
  }, [currentRoom]);

  // 정리 작업
  useEffect(() => {
    return () => {
      if (isConnected) {
        leaveRoom();
      }
    };
  }, [isConnected, leaveRoom]);

  // 참가자 목록 주기적 업데이트
  useEffect(() => {
    if (isConnected && currentRoom) {
      const interval = setInterval(fetchParticipants, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, currentRoom, fetchParticipants]);

  return {
    localStream,
    remoteStreams,
    isConnected,
    currentRoom,
    isMuted,
    isVideoOff,
    participants,
    joinRoom,
    leaveRoom,
    switchRoom,
    toggleMute,
    toggleVideo,
    startLocalStream
  };
};