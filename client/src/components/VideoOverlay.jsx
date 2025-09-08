import React, { useState, useEffect, useRef } from 'react';
import './VideoOverlay.css';

const VideoOverlay = ({ 
  localStream, 
  remoteStreams, 
  isVisible,
  currentArea,
  onToggleMicrophone,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  isScreenSharing = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedVideo, setDraggedVideo] = useState(null);
  const [videoPositions, setVideoPositions] = useState(new Map());
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const containerRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const videoRefs = useRef(new Map());

  // 로컬 비디오 스트림 설정
  useEffect(() => {
    const localVideo = videoRefs.current.get('local');
    if (localVideo && localStream) {
      localVideo.srcObject = localStream;
      
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];
      
      if (audioTrack) setIsMicOn(audioTrack.enabled);
      if (videoTrack) setIsCameraOn(videoTrack.enabled);
    }
  }, [localStream]);

  // 원격 비디오 스트림 설정
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoElement = videoRefs.current.get(userId);
      if (videoElement && stream) {
        if (videoElement.srcObject !== stream) {
          videoElement.srcObject = stream;
          videoElement.play().catch(err => {
            console.error(`원격 비디오 재생 실패 (${userId}):`, err);
          });
        }
      }
    });
  }, [remoteStreams]);

  // 더블클릭 핸들러 - 전체화면 토글
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsFullscreen(!isFullscreen);
  };

  // 드래그 시작
  const handleMouseDown = (e, videoId) => {
    if (e.detail === 2) return; // 더블클릭 시 드래그 방지
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDraggedVideo(videoId);
    
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // 드래그 중
  const handleMouseMove = (e) => {
    if (!isDragging || !draggedVideo) return;
    
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    
    setVideoPositions(prev => {
      const newPositions = new Map(prev);
      newPositions.set(draggedVideo, { x: newX, y: newY });
      return newPositions;
    });
  };

  // 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedVideo(null);
  };

  // 전역 마우스 이벤트
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, draggedVideo]);

  if (!isVisible) return null;

  const totalVideos = (localStream ? 1 : 0) + remoteStreams.size;

  return (
    <div 
      className={`video-overlay ${isFullscreen ? 'fullscreen' : ''}`}
      ref={containerRef}
    >
      {/* 비디오 컨테이너 - 하단 중앙 */}
      <div className={`video-container ${isFullscreen ? 'fullscreen-container' : 'bottom-center'}`}>
        
        {/* 로컬 비디오 */}
        {localStream && (
          <div 
            className={`video-item ${isFullscreen ? 'fullscreen-item' : ''}`}
            style={videoPositions.get('local') ? {
              position: 'fixed',
              left: `${videoPositions.get('local').x}px`,
              top: `${videoPositions.get('local').y}px`,
              zIndex: draggedVideo === 'local' ? 10001 : 10000
            } : {}}
            onMouseDown={(e) => handleMouseDown(e, 'local')}
            onDoubleClick={handleDoubleClick}
          >
            <video
              ref={el => el && videoRefs.current.set('local', el)}
              autoPlay
              muted
              playsInline
              className="video-stream"
            />
            <div className="video-label">
              <span className="user-name">나</span>
              {!isCameraOn && <span className="camera-off">📷</span>}
              {!isMicOn && <span className="mic-off">🔇</span>}
            </div>
          </div>
        )}
        
        {/* 원격 비디오들 */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
          <div 
            key={userId}
            className={`video-item ${isFullscreen ? 'fullscreen-item' : ''}`}
            style={videoPositions.get(userId) ? {
              position: 'fixed',
              left: `${videoPositions.get(userId).x}px`,
              top: `${videoPositions.get(userId).y}px`,
              zIndex: draggedVideo === userId ? 10001 : 10000
            } : {}}
            onMouseDown={(e) => handleMouseDown(e, userId)}
            onDoubleClick={handleDoubleClick}
          >
            <video
              ref={el => el && videoRefs.current.set(userId, el)}
              autoPlay
              playsInline
              className="video-stream"
            />
            <div className="video-label">
              <span className="user-name">{userId}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 컨트롤 버튼들 - 하단 중앙 */}
      <div className="video-controls">
        <button 
          className={`control-btn ${isMicOn ? 'active' : 'inactive'}`}
          onClick={() => {
            onToggleMicrophone();
            setIsMicOn(!isMicOn);
          }}
          title={isMicOn ? "마이크 끄기" : "마이크 켜기"}
        >
          {isMicOn ? '🎤' : '🔇'}
        </button>
        
        <button 
          className={`control-btn ${isCameraOn ? 'active' : 'inactive'}`}
          onClick={() => {
            onToggleCamera();
            setIsCameraOn(!isCameraOn);
          }}
          title={isCameraOn ? "카메라 끄기" : "카메라 켜기"}
        >
          {isCameraOn ? '📷' : '📵'}
        </button>
        
        <button 
          className={`control-btn ${isScreenSharing ? 'sharing' : ''}`}
          onClick={onToggleScreenShare}
          title={isScreenSharing ? "화면 공유 중지" : "화면 공유"}
        >
          {isScreenSharing ? '🖥️✓' : '🖥️'}
        </button>
        
        <button 
          className="control-btn end-call"
          onClick={onEndCall}
          title="통화 종료"
        >
          📞
        </button>
        
        <button 
          className={`control-btn fullscreen-btn`}
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? "일반 모드" : "전체 화면"}
        >
          {isFullscreen ? '🔲' : '⬜'}
        </button>
      </div>

      {/* 영역 표시 */}
      <div className="area-indicator">
        {currentArea?.type === 'private' ? '🔒 프라이빗' : '🌍 퍼블릭'} 영역
      </div>
    </div>
  );
};

export default VideoOverlay;