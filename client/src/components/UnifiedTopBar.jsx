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
  onToggleShop,
  isChatVisible,
  isUsersVisible,
  isVideoActive,
  isShopVisible,
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
              className={`menu-btn ${currentView === 'sns' ? 'active' : ''}`}
              onClick={() => onViewChange('sns')}
              title="SNS 게시판"
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
              className={`menu-btn video ${isVideoActive ? 'active' : ''}`}
              onClick={onToggleVideo}
              title="화상통화"
            >
              📹 화상통화
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
              className={`menu-btn shop ${isShopVisible ? 'active' : ''}`}
              onClick={onToggleShop}
              title="개인 쇼핑몰"
            >
              🛍️ 쇼핑
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