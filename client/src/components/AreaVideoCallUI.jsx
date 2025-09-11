import React, { useState, useEffect, useRef } from 'react';
import './AreaVideoCallUI.css';

const AreaVideoCallUI = ({ socket, currentArea, isVisible }) => {
  const [videoSession, setVideoSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const videoRef = useRef(null);

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

  // 영역 기반 화상통화 시작
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

  // 영역 기반 화상통화 종료
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
          stopLocalCamera(); // 카메라도 정지
          console.log('📹 영역 화상통화 종료:', response.result);
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

  // 영역 변경 시 화상통화 자동 시작 및 상태 확인
  useEffect(() => {
    if (currentArea && socket) {
      console.log('🎯 [화상통화] 영역 변경 감지 - 자동 시작 준비:', currentArea);
      
      // 새로운 영역 진입 시 기존 세션 확인
      checkVideoSession();
      
      // 잠시 후 자동으로 화상통화 시작 (서버 동기화를 위해 대기)
      setTimeout(() => {
        if (!isCallActive) {
          console.log('🎯 [화상통화] 자동 시작 실행');
          startVideoCall();
        }
      }, 1000);
    } else {
      // 영역을 벗어났을 때 상태 초기화
      console.log('🎯 [화상통화] 영역 벗어남 - 통화 종료');
      setIsCallActive(false);
      setVideoSession(null);
      setParticipants([]);
      stopLocalCamera(); // 카메라 정지
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

    // 화상통화 종료 알림
    const handleVideoCallEnded = (data) => {
      console.log('📹 [종료] 영역 화상통화 종료:', data);
      const { areaKey, reason } = data;
      
      setIsCallActive(false);
      setVideoSession(null);
      setParticipants([]);
      stopLocalCamera();
      
      console.log(`📹 [종료] 화상통화 종료됨: ${reason}`);
    };

    socket.on('area-changed', handleAreaChanged);
    socket.on('area-video-call-changed', handleVideoCallChanged);
    socket.on('auto-video-call-started', handleAutoVideoCallStarted);
    socket.on('area-video-call-update', handleVideoCallUpdate);
    socket.on('area-video-call-ended', handleVideoCallEnded);

    // 정리
    return () => {
      socket.off('area-changed', handleAreaChanged);
      socket.off('area-video-call-changed', handleVideoCallChanged);
      socket.off('auto-video-call-started', handleAutoVideoCallStarted);
      socket.off('area-video-call-update', handleVideoCallUpdate);
      socket.off('area-video-call-ended', handleVideoCallEnded);
    };
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
        </div>
        
        {participants.length > 0 && (
          <div className="participants-count">
            <span className="participants-icon">👥</span>
            <span>{participants.length}</span>
          </div>
        )}
      </div>

      {/* 로컬 비디오 표시 */}
      {localStream && (
        <div className="local-video-container">
          <video 
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="local-video"
          />
          <div className="video-label">내 카메라</div>
        </div>
      )}

      <div className="video-call-controls">
        {isCallActive && (
          <div className="active-call-controls">
            <div className="call-status">
              <span className="call-indicator">🔴</span>
              <span>화상통화 중</span>
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