import { useState, useEffect, useRef, useCallback } from 'react';

export const useVideoCall = (socket, userId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [callState, setCallState] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'disconnected'
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const localStreamRef = useRef(null);
  const peerConnections = useRef(new Map());

  // 미디어 권한 확인
  const checkPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('미디어 권한 확인 실패:', err);
      setHasPermission(false);
      setError(err.message);
      return false;
    }
  }, []);

  // 카메라 시작
  const startCamera = useCallback(async () => {
    try {
      if (localStreamRef.current) {
        return localStreamRef.current;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoCallActive(true);
      setHasPermission(true);
      setError(null);
      setCallState('connected');

      return stream;
    } catch (err) {
      console.error('카메라 시작 실패:', err);
      setError(err.message);
      setCallState('disconnected');
      throw err;
    }
  }, [isVideoEnabled, isAudioEnabled]);

  // 카메라 중지
  const stopCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsVideoCallActive(false);
    setCallState('idle');
    
    // 모든 피어 연결 해제
    peerConnections.current.forEach(connection => connection.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
  }, []);

  // 비디오 토글
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // 오디오 토글
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // 연결 상태 확인
  const getConnectionStatus = useCallback(() => {
    if (!isVideoCallActive) return 'disconnected';
    if (callState === 'connected') return 'connected';
    if (callState === 'connecting') return 'connecting';
    return 'disconnected';
  }, [isVideoCallActive, callState]);

  // WebRTC 시그널 처리
  const handleWebRTCSignal = useCallback(async (data) => {
    const { type, fromUserId, offer, answer, candidate } = data;

    try {
      let peerConnection = peerConnections.current.get(fromUserId);

      if (!peerConnection && (type === 'offer' || type === 'answer')) {
        peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamRef.current);
          });
        }

        peerConnection.ontrack = (event) => {
          setRemoteStreams(prev => new Map(prev.set(fromUserId, event.streams[0])));
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('webrtc-signal', {
              type: 'ice-candidate',
              candidate: event.candidate,
              targetUserId: fromUserId
            });
          }
        };

        peerConnections.current.set(fromUserId, peerConnection);
      }

      if (!peerConnection) return;

      switch (type) {
        case 'offer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          if (socket) {
            socket.emit('webrtc-signal', {
              type: 'answer',
              answer,
              targetUserId: fromUserId
            });
          }
          break;

        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          break;

        case 'ice-candidate':
          if (candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
          break;

        default:
          console.warn('알 수 없는 WebRTC 시그널 타입:', type);
      }
    } catch (err) {
      console.error('WebRTC 시그널 처리 실패:', err);
    }
  }, [socket]);

  // 사용자와 연결
  const connectToUser = useCallback(async (targetUserId) => {
    if (!localStreamRef.current || !socket) return;

    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // 로컬 스트림 추가
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });

      // 원격 스트림 처리
      peerConnection.ontrack = (event) => {
        setRemoteStreams(prev => new Map(prev.set(targetUserId, event.streams[0])));
      };

      // ICE 후보 처리
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-signal', {
            type: 'ice-candidate',
            candidate: event.candidate,
            targetUserId
          });
        }
      };

      // Offer 생성 및 전송
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('webrtc-signal', {
        type: 'offer',
        offer,
        targetUserId
      });

      peerConnections.current.set(targetUserId, peerConnection);
      setCallState('connecting');
    } catch (err) {
      console.error(`사용자 ${targetUserId}와의 연결 실패:`, err);
      setError(err.message);
    }
  }, [socket]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    localStream,
    remoteStreams,
    isVideoCallActive,
    callState,
    error,
    hasPermission,
    isVideoEnabled,
    isAudioEnabled,
    checkPermissions,
    startCamera,
    stopCamera,
    toggleVideo,
    toggleAudio,
    getConnectionStatus,
    handleWebRTCSignal,
    connectToUser
  };
}; 
