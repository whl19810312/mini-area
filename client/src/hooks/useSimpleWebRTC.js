import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const useSimpleWebRTC = (socket, user) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  
  const peerConnections = useRef(new Map());
  const localStreamRef = useRef(null);

  // ICE 서버 설정
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // 로컬 스트림 초기화
  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 15 },
        audio: true
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      
      // 초기에는 비디오/오디오 끄기
      stream.getVideoTracks().forEach(track => track.enabled = false);
      stream.getAudioTracks().forEach(track => track.enabled = false);
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);
      
      console.log('✅ [WebRTC] 로컬 스트림 초기화 성공');
      return stream;
    } catch (error) {
      console.error('❌ [WebRTC] 로컬 스트림 초기화 실패:', error);
      toast.error('카메라/마이크 접근 실패');
      return null;
    }
  }, []);

  // Peer Connection 생성
  const createPeerConnection = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(iceServers);
    
    // ICE candidate 이벤트
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', {
          targetUserId,
          candidate: event.candidate
        });
      }
    };
    
    // 원격 스트림 수신
    pc.ontrack = (event) => {
      console.log('📺 [WebRTC] 원격 스트림 수신:', targetUserId);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(targetUserId, event.streams[0]);
        return newMap;
      });
    };
    
    // 연결 상태 변경
    pc.onconnectionstatechange = () => {
      console.log(`🔗 [WebRTC] 연결 상태 (${targetUserId}):`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      }
    };
    
    // 로컬 스트림 추가
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    peerConnections.current.set(targetUserId, pc);
    return pc;
  }, [socket]);

  // Offer 생성 및 전송
  const createOffer = useCallback(async (targetUserId) => {
    try {
      const pc = createPeerConnection(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('webrtc-offer', {
        targetUserId,
        offer
      });
      
      console.log('📤 [WebRTC] Offer 전송:', targetUserId);
    } catch (error) {
      console.error('❌ [WebRTC] Offer 생성 실패:', error);
    }
  }, [socket, createPeerConnection]);

  // Answer 생성 및 전송
  const createAnswer = useCallback(async (fromUserId, offer) => {
    try {
      const pc = createPeerConnection(fromUserId);
      await pc.setRemoteDescription(offer);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('webrtc-answer', {
        targetUserId: fromUserId,
        answer
      });
      
      console.log('📤 [WebRTC] Answer 전송:', fromUserId);
    } catch (error) {
      console.error('❌ [WebRTC] Answer 생성 실패:', error);
    }
  }, [socket, createPeerConnection]);

  // 비디오 토글
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const newState = !isVideoEnabled;
      videoTracks.forEach(track => track.enabled = newState);
      setIsVideoEnabled(newState);
      console.log(`📹 [WebRTC] 비디오 ${newState ? '켜짐' : '꺼짐'}`);
    }
  }, [isVideoEnabled]);

  // 오디오 토글
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newState = !isAudioEnabled;
      audioTracks.forEach(track => track.enabled = newState);
      setIsAudioEnabled(newState);
      console.log(`🎤 [WebRTC] 오디오 ${newState ? '켜짐' : '꺼짐'}`);
    }
  }, [isAudioEnabled]);

  // 통화 시작
  const startCall = useCallback(async (targetUserIds = []) => {
    // 로컬 스트림 초기화
    if (!localStreamRef.current) {
      await initLocalStream();
    }
    
    // 각 사용자에게 offer 전송
    targetUserIds.forEach(userId => {
      if (userId !== user?.id) {
        createOffer(userId);
      }
    });
    
    toast.success('화상통화를 시작합니다');
  }, [initLocalStream, createOffer, user]);

  // 통화 종료
  const endCall = useCallback(() => {
    // 모든 peer connection 종료
    peerConnections.current.forEach(pc => {
      pc.close();
    });
    peerConnections.current.clear();
    
    // 로컬 스트림 정지
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    // 원격 스트림 제거
    setRemoteStreams(new Map());
    setIsConnected(false);
    
    toast('화상통화를 종료했습니다');
  }, []);

  // 소켓 이벤트 처리
  useEffect(() => {
    if (!socket) return;
    
    // Offer 수신
    const handleOffer = async ({ fromUserId, offer }) => {
      console.log('📥 [WebRTC] Offer 수신:', fromUserId);
      await createAnswer(fromUserId, offer);
    };
    
    // Answer 수신
    const handleAnswer = async ({ fromUserId, answer }) => {
      console.log('📥 [WebRTC] Answer 수신:', fromUserId);
      const pc = peerConnections.current.get(fromUserId);
      if (pc) {
        await pc.setRemoteDescription(answer);
      }
    };
    
    // ICE candidate 수신
    const handleIceCandidate = async ({ fromUserId, candidate }) => {
      const pc = peerConnections.current.get(fromUserId);
      if (pc) {
        await pc.addIceCandidate(candidate);
      }
    };
    
    // 사용자 퇴장
    const handleUserLeft = ({ userId }) => {
      const pc = peerConnections.current.get(userId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(userId);
      }
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    };
    
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);
    
    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, createAnswer]);

  return {
    localStream,
    remoteStreams,
    isConnected,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    startCall,
    endCall,
    initLocalStream
  };
};

export default useSimpleWebRTC;