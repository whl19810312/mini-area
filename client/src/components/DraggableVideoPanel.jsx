import React, { useState, useRef, useEffect } from 'react';
import '../styles/DraggableVideoPanel.css';

const DraggableVideoPanel = ({ 
  localStream, 
  remoteStreams, 
  isVisible,
  onClose,
  onToggleMicrophone,
  onToggleCamera,
  onToggleScreenShare,
  isScreenSharing = false
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMicOn, setIsMicOn] = useState(true); // 마이크 기본값 ON
  const [isCameraOn, setIsCameraOn] = useState(true); // 카메라 기본값 ON
  const [fullscreenStream, setFullscreenStream] = useState(null);
  const [fullscreenUserId, setFullscreenUserId] = useState(null);
  const panelRef = useRef(null);
  const localVideoRef = useRef(null);
  const fullscreenVideoRef = useRef(null);

  // 스트림 상태 감지 및 비디오 엘리먼트 업데이트
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];
      
      console.log('📹 로컬 스트림 상태:', {
        hasAudioTrack: !!audioTrack,
        hasVideoTrack: !!videoTrack,
        audioEnabled: audioTrack?.enabled,
        videoEnabled: videoTrack?.enabled,
        videoTrackState: videoTrack?.readyState,
        streamActive: localStream.active
      });
      
      // 비디오 엘리먼트에 스트림 설정
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(err => {
          console.error('로컬 비디오 재생 실패:', err);
        });
      }
      
      if (audioTrack) {
        setIsMicOn(audioTrack.enabled);
      }
      if (videoTrack) {
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // 화면 공유 시 자동 전체 화면
  useEffect(() => {
    if (isScreenSharing && localStream) {
      setFullscreenStream(localStream);
      setFullscreenUserId('local');
    } else if (!isScreenSharing && fullscreenUserId === 'local') {
      setFullscreenStream(null);
      setFullscreenUserId(null);
    }
  }, [isScreenSharing, localStream]);

  // 전체 화면 비디오 설정
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

  // 비디오 클릭 핸들러
  const handleVideoClick = (stream, userId) => {
    if (fullscreenUserId === userId) {
      setFullscreenStream(null);
      setFullscreenUserId(null);
    } else {
      setFullscreenStream(stream);
      setFullscreenUserId(userId);
    }
  };

  // 드래그 시작
  const handleMouseDown = (e) => {
    // 드래그 존에서만 드래그 가능
    if (e.target.classList.contains('drag-zone') || e.target.closest('.drag-zone')) {
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // 드래그 중
  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // 화면 경계 체크
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 300);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  // 드래그 종료
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
  }, [isDragging, dragOffset]);

  if (!isVisible) return null;

  return (
    <>
      {/* 전체 화면 비디오 */}
      {fullscreenStream && (
        <div 
          className="fullscreen-video-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'black',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
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
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '10px 20px',
              borderRadius: '8px',
              pointerEvents: 'none'
            }}
          >
            🎬 {fullscreenUserId === 'local' ? '내 화면' : fullscreenUserId}
            {isScreenSharing && fullscreenUserId === 'local' ? ' (화면 공유 중)' : ''}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 30,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              fontSize: '14px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '8px 20px',
              borderRadius: '8px',
              pointerEvents: 'none'
            }}
          >
            클릭 또는 ESC로 종료
          </div>
        </div>
      )}

      <div 
      ref={panelRef}
      className={`draggable-video-panel ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '200px' : '400px',
        height: isMinimized ? '60px' : 'auto'
      }}
    >
      {/* 드래그 존 (상단 바) */}
      <div 
        className="drag-zone"
        onMouseDown={handleMouseDown}
      >
        <div className="panel-title">
          <span>📹 화상통화</span>
          <span className="participant-count">
            {remoteStreams ? `(${remoteStreams.size + 1}명)` : '(1명)'}
          </span>
        </div>
        <div className="panel-controls">
          <button 
            className="control-btn minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "확대" : "최소화"}
          >
            {isMinimized ? '🔼' : '🔽'}
          </button>
          <button 
            className="control-btn close"
            onClick={onClose}
            title="닫기"
          >
            ✖
          </button>
        </div>
      </div>

      {/* 비디오 콘텐츠 */}
      {!isMinimized && (
        <div className="video-content">
          {/* 원격 비디오들 */}
          <div className="remote-videos">
            {remoteStreams && Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const videoTrack = stream.getVideoTracks()[0];
              const isRemoteScreenShare = videoTrack && videoTrack.label && videoTrack.label.includes('screen');
              
              return (
                <div 
                  key={userId} 
                  className="video-container remote"
                  onClick={() => handleVideoClick(stream, userId)}
                  style={{ cursor: 'pointer' }}
                  title="클릭하여 전체 화면"
                >
                  <video 
                    autoPlay 
                    playsInline
                    ref={el => {
                      if (el && stream) {
                        // 스트림이 이미 설정되어 있는지 확인
                        if (el.srcObject !== stream) {
                          el.srcObject = stream;
                          // 비디오 재생 시도
                          el.play().catch(err => {
                            console.error(`원격 비디오 재생 실패 (${userId}):`, err);
                          });
                        }
                      }
                    }}
                  />
                  <div className="video-label">
                    {userId} {isRemoteScreenShare ? '🖥️' : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 로컬 비디오 */}
          <div 
            className="local-video-container"
            onClick={() => handleVideoClick(localStream, 'local')}
            style={{ cursor: 'pointer' }}
            title="클릭하여 전체 화면"
          >
            <video 
              className="local-video"
              autoPlay 
              muted 
              playsInline
              ref={localVideoRef}
            />
            <div className="video-label">나</div>
            {/* 카메라가 꺼져있을 때 표시 */}
            {localStream && !isCameraOn && (
              <div className="video-off-overlay">
                <span>📷 카메라 꺼짐</span>
              </div>
            )}
          </div>

          {/* 컨트롤 버튼들 */}
          <div className="video-controls">
            <button 
              className={`control-btn ${isMicOn ? 'active-green' : 'inactive-red'}`}
              onClick={() => {
                onToggleMicrophone();
                setIsMicOn(!isMicOn);
              }}
              title={isMicOn ? "마이크 끄기" : "마이크 켜기"}
            >
              <span className={isMicOn ? '' : 'strikethrough'}>🎤</span>
            </button>
            <button 
              className={`control-btn ${isCameraOn ? 'active-green' : 'inactive-red'}`}
              onClick={() => {
                onToggleCamera();
                setIsCameraOn(!isCameraOn);
              }}
              title={isCameraOn ? "카메라 끄기" : "카메라 켜기"}
            >
              <span className={isCameraOn ? '' : 'strikethrough'}>📷</span>
            </button>
            <button 
              className={`control-btn ${isScreenSharing ? 'active' : ''}`}
              onClick={onToggleScreenShare}
              title="화면 공유"
            >
              🖥️
            </button>
            <button 
              className="control-btn end-call"
              onClick={onClose}
              title="통화 종료"
            >
              📞
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default DraggableVideoPanel;