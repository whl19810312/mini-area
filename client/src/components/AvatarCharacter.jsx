import React from 'react';
import { avatarOptions } from './AvatarSelector';
import './AvatarCharacter.css';

const AvatarCharacter = ({ 
  avatarId, 
  size = 'medium', 
  style = {},
  className = '',
  onClick,
  showGlow = true,
  showBorder = true 
}) => {
  // 아바타 데이터 찾기
  const avatar = avatarOptions.find(a => a.id === avatarId) || avatarOptions[0]; // 기본값: 첫 번째 아바타
  
  // 크기 설정
  const sizeMap = {
    small: { width: 32, height: 32, fontSize: 20 },
    medium: { width: 48, height: 48, fontSize: 28 },
    large: { width: 64, height: 64, fontSize: 36 },
    xlarge: { width: 80, height: 80, fontSize: 44 }
  };
  
  const sizeStyle = sizeMap[size] || sizeMap.medium;
  
  const characterStyle = {
    width: `${sizeStyle.width}px`,
    height: `${sizeStyle.height}px`,
    ...style
  };

  return (
    <div 
      className={`avatar-character ${className} ${size} ${showGlow ? 'show-glow' : ''}`}
      style={characterStyle}
      onClick={onClick}
      title={`${avatar.name} (${avatar.englishName})`}
    >
      <div className="avatar-single-display">
        <span className="avatar-fullbody-icon" style={{ fontSize: `${sizeStyle.fontSize}px` }}>
          {avatar.fullBody}
        </span>
      </div>
      <div className="avatar-character-sparkles">
        <span className="sparkle sparkle-1">✨</span>
        <span className="sparkle sparkle-2">⭐</span>
        <span className="sparkle sparkle-3">🌟</span>
      </div>
      
      {/* 호버 시 정보 표시 */}
      <div className="avatar-character-tooltip">
        <div className="tooltip-name">{avatar.name}</div>
        <div className="tooltip-parts">
          <span>{avatar.fullBody}</span>
        </div>
        <div className="tooltip-english">{avatar.englishName}</div>
      </div>
    </div>
  );
};

export default AvatarCharacter;