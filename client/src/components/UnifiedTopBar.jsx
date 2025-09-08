import React, { useState } from 'react';
import '../styles/UnifiedTopBar.css';

const UnifiedTopBar = ({ 
  currentView, 
  onViewChange, 
  currentArea, 
  currentMap,
  onReturnToLobby,
  onToggleChat,
  onToggleUsers,
  onToggleVideo,
  isChatVisible,
  isUsersVisible,
  isVideoActive,
  participantCount = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`unified-top-bar ${isExpanded ? 'expanded' : ''}`}>
      {/* 왼쪽 섹션: 네비게이션 */}
      <div className="bar-section left">
        <button 
          className={`nav-btn ${currentView === 'metaverse' ? 'active' : ''}`}
          onClick={() => onViewChange('metaverse')}
          title="메타버스"
        >
          🎮 공간
        </button>
        <button 
          className={`nav-btn ${currentView === 'sns' ? 'active' : ''}`}
          onClick={() => onViewChange('sns')}
          title="SNS 보드"
        >
          📱 SNS
        </button>
        <span className="separator">|</span>
        <button 
          className="nav-btn home"
          onClick={onReturnToLobby}
          title="대기실로 돌아가기"
        >
          🏠 대기실
        </button>
      </div>

      {/* 중앙 섹션: 현재 위치 정보 */}
      <div className="bar-section center">
        <div className="location-info">
          <span className="map-name">{currentMap?.name || '메타버스'}</span>
          {currentArea && (
            <>
              <span className="separator">•</span>
              <span className={`area-badge ${currentArea.type}`}>
                {currentArea.type === 'private' ? '🔒' : '🌍'} {currentArea.name}
              </span>
            </>
          )}
          <span className="separator">•</span>
          <span className="participant-count">👥 {participantCount}명</span>
        </div>
      </div>

      {/* 오른쪽 섹션: 기능 버튼들 */}
      <div className="bar-section right">
        {/* 채팅 토글 */}
        <button 
          className={`feature-btn ${isChatVisible ? 'active' : ''}`}
          onClick={onToggleChat}
          title="채팅"
        >
          💬 채팅
        </button>

        {/* 사용자 목록 토글 */}
        <button 
          className={`feature-btn ${isUsersVisible ? 'active' : ''}`}
          onClick={onToggleUsers}
          title="사용자 목록"
        >
          👥 사용자
        </button>

        {/* 화상통화 토글 */}
        <button 
          className={`feature-btn video ${isVideoActive ? 'active' : ''}`}
          onClick={onToggleVideo}
          title="화상통화"
        >
          {isVideoActive ? '📹' : '📷'} 화상
        </button>

        {/* 확장/축소 버튼 */}
        <button 
          className="expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "축소" : "확장"}
        >
          {isExpanded ? '⬆' : '⬇'}
        </button>
      </div>

      {/* 확장 패널 (선택사항) */}
      {isExpanded && (
        <div className="expanded-panel">
          <div className="quick-settings">
            <h4>빠른 설정</h4>
            <div className="settings-grid">
              <button className="setting-btn">🔊 소리</button>
              <button className="setting-btn">🎵 음악</button>
              <button className="setting-btn">⚙️ 설정</button>
              <button className="setting-btn">❓ 도움말</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedTopBar;