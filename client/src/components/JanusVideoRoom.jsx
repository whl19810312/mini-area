import React, { useEffect, useRef, useState } from 'react';
import { useJanusWebRTC } from '../hooks/useJanusWebRTC';
import './JanusVideoRoom.css';

const JanusVideoRoom = ({ roomType, roomInfo, onLeave }) => {
  const {
    localStream,
    remoteStreams,
    isConnected,
    currentRoom,
    isMuted,
    isVideoOff,
    participants,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo
  } = useJanusWebRTC();

  const localVideoRef = useRef(null);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  // 룸 참가 처리
  useEffect(() => {
    const handleJoinRoom = async () => {
      if (!isJoining && !isConnected) {
        setIsJoining(true);
        setError(null);
        
        try {
          await joinRoom(roomType, roomInfo);
        } catch (err) {
          setError('룸 참가에 실패했습니다: ' + err.message);
          console.error('룸 참가 오류:', err);
        } finally {
          setIsJoining(false);
        }
      }
    };

    handleJoinRoom();
  }, [roomType, roomInfo]);

  // 로컬 비디오 스트림 설정
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // 룸 나가기 처리
  const handleLeave = async () => {
    try {
      await leaveRoom();
      if (onLeave) {
        onLeave();
      }
    } catch (err) {
      console.error('룸 나가기 오류:', err);
    }
  };

  // 룸 정보 표시
  const getRoomTitle = () => {
    if (roomType === 'public') {
      return '공개 영역';
    } else if (roomType === 'area' && roomInfo?.areaName) {
      return `${roomInfo.areaName} 영역`;
    }
    return '화상 회의';
  };

  if (error) {
    return (
      <div className="janus-video-room error">
        <div className="error-message">
          <h3>오류 발생</h3>
          <p>{error}</p>
          <button onClick={handleLeave} className="leave-btn">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (isJoining) {
    return (
      <div className="janus-video-room loading">
        <div className="loading-spinner"></div>
        <p>룸에 참가하는 중...</p>
      </div>
    );
  }

  return (
    <div className="janus-video-room">
      <div className="video-header">
        <h2>{getRoomTitle()}</h2>
        <div className="room-info">
          <span className="participant-count">
            참가자: {participants.length + 1}명
          </span>
          {currentRoom && (
            <span className="room-id">
              룸 ID: {currentRoom.roomId}
            </span>
          )}
        </div>
      </div>

      <div className="video-grid">
        {/* 로컬 비디오 */}
        <div className="video-container local">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={isVideoOff ? 'hidden' : ''}
          />
          {isVideoOff && (
            <div className="video-off-placeholder">
              <span>비디오 꺼짐</span>
            </div>
          )}
          <div className="video-label">나 {isMuted && '🔇'}</div>
        </div>

        {/* 원격 비디오 */}
        {Array.from(remoteStreams.entries()).map(([id, stream]) => (
          <RemoteVideo 
            key={id} 
            stream={stream} 
            participantId={id}
            participants={participants}
          />
        ))}
      </div>

      <div className="video-controls">
        <button
          onClick={toggleMute}
          className={`control-btn ${isMuted ? 'active' : ''}`}
          title={isMuted ? '음소거 해제' : '음소거'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>

        <button
          onClick={toggleVideo}
          className={`control-btn ${isVideoOff ? 'active' : ''}`}
          title={isVideoOff ? '비디오 켜기' : '비디오 끄기'}
        >
          {isVideoOff ? '📵' : '📹'}
        </button>

        <button
          onClick={handleLeave}
          className="control-btn leave"
          title="나가기"
        >
          📞
        </button>
      </div>

      {/* 참가자 목록 */}
      {participants.length > 0 && (
        <div className="participants-list">
          <h3>참가자 목록</h3>
          <ul>
            {participants.map(participant => (
              <li key={participant.id}>
                {participant.display || `User ${participant.id}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// 원격 비디오 컴포넌트
const RemoteVideo = ({ stream, participantId, participants }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const getParticipantName = () => {
    const participant = participants.find(p => p.id === participantId);
    return participant?.display || `User ${participantId}`;
  };

  return (
    <div className="video-container remote">
      <video
        ref={videoRef}
        autoPlay
        playsInline
      />
      <div className="video-label">{getParticipantName()}</div>
    </div>
  );
};

export default JanusVideoRoom;