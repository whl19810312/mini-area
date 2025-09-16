import React, { useState, useEffect } from 'react';
import '../styles/NavigationBar.css';

const NavigationBar = ({ currentView, onViewChange, currentArea, onReturnToLobby, onToggleGroupCall, groupCallActive, onOpenUserList, roomName, onToggleVideoConference, videoConferenceActive }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 전체화면 상태 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('전체화면 전환 실패:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="navigation-bar">
      <div className="nav-left">
        {roomName && (
          <span className="room-name-display" style={{
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
            marginRight: '15px',
            padding: '5px 10px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px'
          }}>
            📍 {roomName}
          </span>
        )}
        <button 
          className={`nav-button ${currentView === 'metaverse' ? 'active' : ''}`}
          onClick={() => onViewChange('metaverse')}
        >
          🎮 mini area
        </button>
        <button 
          className={`nav-button ${currentView === 'sns' ? 'active' : ''}`}
          onClick={() => onViewChange('sns')}
        >
          📱 SNS
        </button>
      </div>
      
      <div className="nav-center">
        {/* 영역 표시 제거 */}
      </div>
      
      <div className="nav-right">
        <button
          className="nav-button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "전체화면 종료" : "전체화면"}
        >
          {isFullscreen ? '🔳' : '🔲'} 전체화면
        </button>
        <button
          className={`nav-button ${videoConferenceActive ? 'active' : ''}`}
          onClick={() => onToggleVideoConference && onToggleVideoConference()}
          title="화상회의"
          style={{
            backgroundColor: videoConferenceActive ? '#4CAF50' : undefined,
            color: videoConferenceActive ? 'white' : undefined
          }}
        >
          🎥 화상회의
        </button>
        <button
          className="nav-button"
          onClick={() => onOpenUserList && onOpenUserList()}
          title="1:1 화상통화"
        >
          🤝 1:1 통화
        </button>
        <button 
          className="nav-button return-button"
          onClick={onReturnToLobby}
        >
          🏠 로비로
        </button>
      </div>
    </div>
  );
};

export default NavigationBar;




