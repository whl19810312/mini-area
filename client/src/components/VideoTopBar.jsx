import React, { useEffect, useRef, useState } from 'react';
import './VideoTopBar.css';

const VideoTopBar = ({ 
  localStream, 
  remoteStreams, 
  isVisible, 
  onToggleMicrophone, 
  onToggleCamera, 
  onEndCall,
  currentView,
  onViewChange,
  onReturnToLobby,
  onOpenUserList
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());
  const currentLocalStreamRef = useRef(null);
  const currentRemoteStreamsRef = useRef(new Map());
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  // 전체화면 관련 코드 제거

  // 로컬 비디오 스트림 설정
  useEffect(() => {
    if (localVideoRef.current && localStream && currentLocalStreamRef.current !== localStream) {
      localVideoRef.current.srcObject = localStream;
      currentLocalStreamRef.current = localStream;
      
      // 초기 상태 설정
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      if (videoTrack) setIsCameraOn(videoTrack.enabled);
      if (audioTrack) setIsMicrophoneOn(audioTrack.enabled);
    }
  }, [localStream]);

  // 원격 비디오 스트림 설정
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement && stream && currentRemoteStreamsRef.current.get(userId) !== stream) {
        videoElement.srcObject = stream;
        currentRemoteStreamsRef.current.set(userId, stream);
      }
    });
  }, [remoteStreams]);

  const handleToggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
        if (onToggleCamera) onToggleCamera(videoTrack.enabled);
      }
    }
  };

  const handleToggleMicrophone = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicrophoneOn(audioTrack.enabled);
        if (onToggleMicrophone) onToggleMicrophone(audioTrack.enabled);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`video-top-bar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* 네비게이션 영역 */}
      <div className="nav-section">
        <div className="nav-left">
          <button 
            className={`nav-button ${currentView === 'metaverse' ? 'active' : ''}`}
            onClick={() => onViewChange && onViewChange('metaverse')}
          >
            🎮 mini area
          </button>
          <button 
            className={`nav-button ${currentView === 'sns' ? 'active' : ''}`}
            onClick={() => onViewChange && onViewChange('sns')}
          >
            📱 SNS
          </button>
        </div>
        
        <div className="nav-right">
          <button 
            className="nav-button"
            onClick={onReturnToLobby}
          >
            🏠 로비
          </button>
        </div>
      </div>
      {/* 토글 버튼 */}
      <button 
        className="toggle-expand-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? "접기" : "펼치기"}
      >
        {isExpanded ? '▲' : '▼'}
      </button>

      {/* 컨트롤 버튼 그룹 */}
      <div className="video-controls-group">
        <button 
          className={`control-btn ${isCameraOn ? 'active' : 'inactive'}`}
          onClick={handleToggleCamera}
          title={isCameraOn ? "카메라 끄기" : "카메라 켜기"}
        >
          {isCameraOn ? '📹' : '📷'}
        </button>
        <button 
          className={`control-btn ${isMicrophoneOn ? 'active' : 'inactive'}`}
          onClick={handleToggleMicrophone}
          title={isMicrophoneOn ? "마이크 끄기" : "마이크 켜기"}
        >
          {isMicrophoneOn ? '🎤' : '🔇'}
        </button>
        <button 
          className="control-btn end-call"
          onClick={onEndCall}
          title="통화 종료"
        >
          📞
        </button>
      </div>

      {/* 비디오 리스트 */}
      {isExpanded && (
        <div className="video-list-horizontal">
          {/* 본인 비디오 */}
          {localStream && (
            <div className="video-item local">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="video-stream"
              />
              <div className="video-label">나</div>
            </div>
          )}
          
          {/* 다른 사용자 비디오 */}
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <div key={userId} className="video-item remote">
              <video
                ref={(el) => {
                  if (el) remoteVideoRefs.current.set(userId, el);
                }}
                autoPlay
                playsInline
                className="video-stream"
              />
              <div className="video-label">{userId}</div>
            </div>
          ))}
          
          {/* 비디오가 없을 때 */}
          {!localStream && remoteStreams.size === 0 && (
            <div className="no-video-message">
              카메라 연결 대기 중...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoTopBar;