import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useJanusWebRTC } from '../hooks/useJanusWebRTC';
import '../styles/RoomVideoConference.css';

const RoomVideoConference = ({ roomId, participants = [], isVisible = true }) => {
  const { user } = useAuth();
  const {
    localStream,
    remoteStreams,
    isConnected,
    currentRoom,
    isMuted,
    isVideoOff,
    participants: janusParticipants,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo
  } = useJanusWebRTC();

  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // 방 입장 시 자동으로 Janus 룸 참가
  useEffect(() => {
    const initVideoConference = async () => {
      if (!roomId || !user || hasJoined) return;
      
      // isVisible이 false면 아직 참가하지 않음
      if (!isVisible) {
        console.log('🔄 화상회의 대기중 (isVisible: false)');
        return;
      }

      try {
        console.log(`🎥 Janus VideoRoom 참가 시작: 룸 ${roomId}`);
        
        // Janus VideoRoom 참가
        await joinRoom('area', {
          roomId,
          metaverseId: roomId,
          areaId: roomId,
          areaName: `Room ${roomId}`,
          username: user.username,
          userId: user.id
        });
        
        setHasJoined(true);
        setError(null);
        console.log('✅ Janus VideoRoom 참가 성공');
      } catch (err) {
        console.error('❌ Janus VideoRoom 참가 실패:', err);
        setError('화상회의 연결에 실패했습니다.');
      }
    };

    initVideoConference();
  }, [roomId, user, joinRoom, hasJoined, isVisible]);

  // isVisible이 false가 되면 방 나가기
  useEffect(() => {
    if (!isVisible && hasJoined) {
      console.log('🔚 화상회의 종료: Janus VideoRoom 나가기');
      leaveRoom();
      setHasJoined(false);
    }
  }, [isVisible, hasJoined, leaveRoom]);
  
  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (hasJoined) {
        console.log('🔚 컴포넌트 언마운트: Janus VideoRoom 나가기');
        leaveRoom();
        setHasJoined(false);
      }
    };
  }, [hasJoined, leaveRoom]);

  // 방 변경 감지
  useEffect(() => {
    if (currentRoom && currentRoom.roomId !== roomId && hasJoined) {
      console.log('📍 방 변경 감지, VideoRoom 재참가');
      setHasJoined(false);
    }
  }, [roomId, currentRoom, hasJoined]);

  // 최소화 토글
  const handleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  // isVisible이 false일 때는 컴포넌트를 숨김
  if (!isVisible) return null;
  
  // 아직 참가하지 않았을 때 로딩 표시
  if (!hasJoined) {
    return (
      <div className="room-video-conference">
        <div className="video-header">
          <h3>화상회의 연결중...</h3>
          <div className="video-status">
            🟡 연결 준비중...
          </div>
        </div>
      </div>
    );
  }

  // 모든 참가자 (로컬 + 원격)
  const allParticipants = janusParticipants.length > 0 ? janusParticipants : participants;
  const participantCount = allParticipants.length + 1; // +1 for self

  return (
    <div className={`room-video-conference ${isMinimized ? 'minimized' : ''}`}>
      <button 
        className="minimize-btn" 
        onClick={handleMinimize}
        title={isMinimized ? '확대' : '최소화'}
      >
        {isMinimized ? '⬜' : '➖'}
      </button>

      <div className="video-header">
        <h3>화상회의 ({participantCount}명 참가중)</h3>
        <div className="video-status">
          {isConnected ? '🟢 연결됨' : '🔴 연결중...'}
        </div>
      </div>
      
      {error && !isMinimized && (
        <div className="video-error">
          ⚠️ {error}
        </div>
      )}

      {!isMinimized && (
        <div className="video-grid">
          {/* 로컬 비디오 */}
          <div className="video-container local">
            {localStream && (
              <video
                autoPlay
                playsInline
                muted
                className={`video-element ${isVideoOff ? 'hidden' : ''}`}
                ref={el => {
                  if (el && localStream) {
                    el.srcObject = localStream;
                  }
                }}
              />
            )}
            {isVideoOff && (
              <div className="video-placeholder">
                <span>📷</span>
              </div>
            )}
            <div className="video-label">
              나 ({user?.username})
              {isMuted && ' 🔇'}
            </div>
            <div className="video-controls">
              <button 
                onClick={toggleVideo}
                className={`control-btn ${isVideoOff ? 'disabled' : ''}`}
                title={isVideoOff ? '비디오 켜기' : '비디오 끄기'}
              >
                {isVideoOff ? '📹❌' : '📹'}
              </button>
              <button 
                onClick={toggleMute}
                className={`control-btn ${isMuted ? 'disabled' : ''}`}
                title={isMuted ? '음소거 해제' : '음소거'}
              >
                {isMuted ? '🎤❌' : '🎤'}
              </button>
            </div>
          </div>

          {/* 원격 비디오들 (Janus 스트림) */}
          {Array.from(remoteStreams.entries()).map(([streamId, stream]) => {
            // 참가자 정보 찾기
            const participant = allParticipants.find(p => 
              p.id === streamId || p.userId === streamId
            );
            const username = participant?.display || 
                           participant?.username || 
                           `User ${streamId.substring(0, 8)}`;

            return (
              <div key={streamId} className="video-container remote">
                <video
                  autoPlay
                  playsInline
                  className="video-element"
                  ref={el => {
                    if (el && stream) {
                      el.srcObject = stream;
                    }
                  }}
                />
                <div className="video-label">{username}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 최소화된 상태에서의 간단한 정보 */}
      {isMinimized && (
        <div className="minimized-info">
          <span className="participant-count">{participantCount}</span>
        </div>
      )}
    </div>
  );
};

export default RoomVideoConference;