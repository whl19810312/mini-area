import React, { useEffect, useRef, useState } from 'react';
import './VideoSidebar.css';

const VideoSidebar = ({ localStream, remoteStreams, isVisible, currentArea, onEndCall, onToggleMicrophone, onToggleScreenShare, isScreenSharing }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());
  const currentLocalStreamRef = useRef(null);
  const currentRemoteStreamsRef = useRef(new Map());
  const sidebarRef = useRef(null);
  const fullscreenVideoRef = useRef(null);
  
  // 드래그 상태 - 상단 가로 배치를 위해 위치 조정
  const [position, setPosition] = useState({ x: 100, y: 10 }); // 상단에 위치
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fullscreenStream, setFullscreenStream] = useState(null);
  const [fullscreenUserId, setFullscreenUserId] = useState(null);

  // 로컬 비디오 스트림 설정
  useEffect(() => {
    if (localVideoRef.current && localStream && currentLocalStreamRef.current !== localStream) {
      localVideoRef.current.srcObject = localStream;
      currentLocalStreamRef.current = localStream;
      
      // 화면 공유 시 전체 화면으로 표시
      if (isScreenSharing) {
        setFullscreenStream(localStream);
        setFullscreenUserId('local');
      }
    }
    
    // 화면 공유 종료 시 전체 화면 해제
    if (!isScreenSharing && fullscreenUserId === 'local') {
      setFullscreenStream(null);
      setFullscreenUserId(null);
    }
  }, [localStream, isScreenSharing]);

  // 원격 비디오 스트림 설정
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement && stream && currentRemoteStreamsRef.current.get(userId) !== stream) {
        videoElement.srcObject = stream;
        currentRemoteStreamsRef.current.set(userId, stream);
        
        // 원격 사용자가 화면 공유 중인지 확인 (트랙 라벨로 판단)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.label && videoTrack.label.includes('screen')) {
          setFullscreenStream(stream);
          setFullscreenUserId(userId);
        }
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

  // 전체 화면 스트림 설정
  useEffect(() => {
    if (fullscreenVideoRef.current && fullscreenStream) {
      fullscreenVideoRef.current.srcObject = fullscreenStream;
    }
  }, [fullscreenStream]);

  // ESC 키로 전체 화면 종료
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && fullscreenStream) {
        setFullscreenStream(null);
        setFullscreenUserId(null);
      }
    };

    if (fullscreenStream) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [fullscreenStream]);

  // 비디오 클릭 시 전체 화면 토글
  const handleVideoClick = (stream, userId) => {
    if (fullscreenUserId === userId) {
      // 이미 전체 화면이면 해제
      setFullscreenStream(null);
      setFullscreenUserId(null);
    } else {
      // 전체 화면으로 설정
      setFullscreenStream(stream);
      setFullscreenUserId(userId);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 전체 화면 비디오 */}
      {fullscreenStream && (
        <div 
          className="fullscreen-video-container"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'black',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            setFullscreenStream(null);
            setFullscreenUserId(null);
          }}
        >
          <video
            ref={fullscreenVideoRef}
            autoPlay
            playsInline
            muted={fullscreenUserId === 'local'}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto'
            }}
          />
          <div 
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              color: 'white',
              fontSize: '18px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🎬 {fullscreenUserId === 'local' ? '내 화면' : fullscreenUserId} {isScreenSharing && fullscreenUserId === 'local' ? '(화면 공유 중)' : ''}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              fontSize: '14px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '5px 15px',
              borderRadius: '5px'
            }}
          >
            ESC 또는 클릭하여 전체 화면 종료
          </div>
        </div>
      )}
      
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
          <div 
            className="video-item local-video"
            onClick={() => handleVideoClick(localStream, 'local')}
            style={{ cursor: 'pointer' }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="video-stream"
            />
            <div className="video-label">
              👤 나 {isScreenSharing ? '🖥️' : ''}
            </div>
          </div>
        )}
        
        {/* 다른 사용자 비디오 */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
          const videoTrack = stream.getVideoTracks()[0];
          const isRemoteScreenShare = videoTrack && videoTrack.label && videoTrack.label.includes('screen');
          
          return (
            <div 
              key={userId} 
              className="video-item remote-video"
              onClick={() => handleVideoClick(stream, userId)}
              style={{ cursor: 'pointer' }}
            >
              <video
                ref={(el) => {
                  if (el) remoteVideoRefs.current.set(userId, el);
                }}
                autoPlay
                playsInline
                className="video-stream"
              />
              <div className="video-label">
                👤 {userId} {isRemoteScreenShare ? '🖥️' : ''}
              </div>
            </div>
          );
        })}
        
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
    </>
  );
};

export default VideoSidebar;