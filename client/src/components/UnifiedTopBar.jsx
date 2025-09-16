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
  onToggleFullscreen,
  onToggleShop,
  onToggleSocialFeed,
  isChatVisible,
  isUsersVisible,
  isFullscreen,
  isShopVisible,
  isSocialFeedVisible,
  participantCount = 0
}) => {
  return (
    <div className="unified-top-bar fixed-menu">
      {/* 메뉴 섹션 1: 메인 네비게이션 */}
      <div className="menu-section navigation">
        <div className="menu-group">
          <span className="menu-label">이동</span>
          <div className="menu-buttons">
            <button 
              className={`menu-btn ${currentView === 'metaverse' ? 'active' : ''}`}
              onClick={() => onViewChange('metaverse')}
              title="메타버스 공간"
            >
              🎮 공간
            </button>
            <button 
              className="menu-btn"
              onClick={() => window.open('/sns', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes')}
              title="SNS 게시판 (새 창)"
            >
              📱 SNS
            </button>
            <button 
              className="menu-btn home-btn"
              onClick={onReturnToLobby}
              title="대기실로 돌아가기"
            >
              🏠 대기실
            </button>
          </div>
        </div>
      </div>

      {/* 메뉴 섹션 2: 현재 위치 정보 */}
      <div className="menu-section info">
        <div className="location-display">
          <div className="location-item">
            <span className="location-icon">🗺️</span>
            <span className="location-text">{currentMap?.name || '메타버스'}</span>
          </div>
          {currentArea && (
            <div className="location-item">
              <span className="location-icon">
                {currentArea.type === 'private' ? '🔒' : '🌍'}
              </span>
              <span className="location-text">{currentArea.name}</span>
            </div>
          )}
          <div className="location-item">
            <span className="location-icon">👥</span>
            <span className="location-text">{participantCount}명</span>
          </div>
        </div>
      </div>

      {/* 메뉴 섹션 3: 커뮤니케이션 도구 */}
      <div className="menu-section communication">
        <div className="menu-group">
          <span className="menu-label">소통</span>
          <div className="menu-buttons">
            <button 
              className={`menu-btn ${isChatVisible ? 'active' : ''}`}
              onClick={onToggleChat}
              title="채팅창 열기/닫기"
            >
              💬 채팅
            </button>
            <button 
              className={`menu-btn ${isUsersVisible ? 'active' : ''}`}
              onClick={onToggleUsers}
              title="사용자 목록"
            >
              👥 사용자
            </button>
            <button 
              className={`menu-btn fullscreen ${isFullscreen ? 'active' : ''}`}
              onClick={onToggleFullscreen}
              title="전체화면"
            >
              🖥️ 전체화면
            </button>
          </div>
        </div>
      </div>

      {/* 메뉴 섹션 4: 부가 서비스 */}
      <div className="menu-section services">
        <div className="menu-group">
          <span className="menu-label">서비스</span>
          <div className="menu-buttons">
            <button 
              className="menu-btn shop"
              onClick={() => window.open('/shop', '_blank', 'width=1200,height=900,scrollbars=yes,resizable=yes')}
              title="개인 쇼핑몰 (새 창)"
            >
              🛍️ 쇼핑
            </button>
            <button 
              className={`menu-btn social ${isSocialFeedVisible ? 'active' : ''}`}
              onClick={onToggleSocialFeed}
              title="메타버스 소셜"
            >
              🌐 소셜
            </button>
            <button 
              className="menu-btn settings"
              title="설정"
            >
              ⚙️ 설정
            </button>
            <button 
              className="menu-btn help"
              title="도움말"
            >
              ❓ 도움말
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedTopBar;