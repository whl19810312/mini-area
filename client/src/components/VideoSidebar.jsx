import React, { useEffect, useRef, useState } from 'react';
import './VideoSidebar.css';

const VideoSidebar = ({ localStream, remoteStreams, isVisible, currentArea, onEndCall, onToggleMicrophone, onToggleScreenShare, isScreenSharing }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());
  const currentLocalStreamRef = useRef(null);
  const currentRemoteStreamsRef = useRef(new Map());
  const sidebarRef = useRef(null);
  
  // 드래그 상태 - 상단 가로 배치를 위해 위치 조정
  const [position, setPosition] = useState({ x: 100, y: 10 }); // 상단에 위치
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 로컬 비디오 스트림 설정
  useEffect(() => {
    if (localVideoRef.current && localStream && currentLocalStreamRef.current !== localStream) {
      localVideoRef.current.srcObject = localStream;
      currentLocalStreamRef.current = localStream;
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

  // 드래그 이벤트 핸들러
  const handleMouseDown = (e) => {
    // 헤더 영역에서만 드래그 가능
    if (e.target.closest('.video-sidebar-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // 화면 밖으로 나가지 않도록 제한 (가로형 레이아웃용)
    const maxX = window.innerWidth - 800; // 가로형이므로 더 넓게
    const maxY = window.innerHeight - 200; // 세로는 더 작게
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 전역 마우스 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (!isVisible) return null;

  return (
    <div 
      ref={sidebarRef}
      className="video-sidebar horizontal-layout"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="video-sidebar-header" style={{ cursor: 'grab' }}>
        <div className="header-title">
          <h3>📹</h3>
          <span className="area-badge">
            {currentArea?.type === 'private' ? '🔒' : '🌍'}
          </span>
        </div>
      </div>
      
      <div className="video-list horizontal">
        {/* 본인 비디오 */}
        {localStream && (
          <div className="video-item local-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="video-stream"
            />
            <div className="video-label">👤 나</div>
          </div>
        )}
        
        {/* 다른 사용자 비디오 */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
          <div key={userId} className="video-item remote-video">
            <video
              ref={(el) => {
                if (el) remoteVideoRefs.current.set(userId, el);
              }}
              autoPlay
              playsInline
              className="video-stream"
            />
            <div className="video-label">👤 {userId}</div>
          </div>
        ))}
        
        {/* 비디오가 없을 때 */}
        {!localStream && remoteStreams.size === 0 && (
          <div className="no-video-message">
            카메라 연결 대기 중...
          </div>
        )}
      </div>
      
      {/* 컨트롤 버튼 - 컴팩트 버전 */}
      <div className="video-controls compact">
        <button 
          className="control-btn mic-btn"
          onClick={onToggleMicrophone}
          title="마이크"
        >
          🎤
        </button>
        <button 
          className={`control-btn screen-share-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={onToggleScreenShare}
          title={isScreenSharing ? "공유 중지" : "화면 공유"}
        >
          🖥️
        </button>
        <button 
          className="control-btn end-call-btn"
          onClick={onEndCall}
          title="종료"
        >
          ❌
        </button>
      </div>
    </div>
  );
};

export default VideoSidebar;