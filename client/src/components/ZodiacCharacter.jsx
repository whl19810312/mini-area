import React from 'react';
import { zodiacSigns } from './ZodiacSelector';
import './ZodiacCharacter.css';

const ZodiacCharacter = ({ 
  zodiacId, 
  size = 'medium', 
  style = {},
  className = '',
  onClick,
  showGlow = true,
  showBorder = true 
}) => {
  // 별자리 데이터 찾기
  const zodiac = zodiacSigns.find(z => z.id === zodiacId) || zodiacSigns[0]; // 기본값: 양자리
  
  // 크기 설정
  const sizeMap = {
    small: { width: 32, height: 32, fontSize: 14 },
    medium: { width: 48, height: 48, fontSize: 18 },
    large: { width: 64, height: 64, fontSize: 24 },
    xlarge: { width: 80, height: 80, fontSize: 28 }
  };
  
  const sizeStyle = sizeMap[size] || sizeMap.medium;
  
  const characterStyle = {
    width: `${sizeStyle.width}px`,
    height: `${sizeStyle.height}px`,
    ...style
  };

  return (
    <div 
      className={`zodiac-character ${className} ${size} ${showGlow ? 'show-glow' : ''} ${showBorder ? 'show-border' : ''}`}
      style={characterStyle}
      onClick={onClick}
      title={`${zodiac.name} (${zodiac.englishName})`}
    >
      <div 
        className="zodiac-character-inner"
        style={{ background: zodiac.color }}
      >
        <div className="zodiac-character-content">
          <span className="zodiac-symbol-main">{zodiac.symbol}</span>
        </div>
        <div className="zodiac-character-sparkles">
          <span className="sparkle sparkle-1">✨</span>
          <span className="sparkle sparkle-2">⭐</span>
          <span className="sparkle sparkle-3">🌟</span>
        </div>
      </div>
      
      {/* 호버 시 정보 표시 */}
      <div className="zodiac-character-tooltip">
        <div className="tooltip-name">{zodiac.name}</div>
        <div className="tooltip-symbol">{zodiac.symbol}</div>
        <div className="tooltip-constellation">{zodiac.constellation}</div>
      </div>
    </div>
  );
};

export default ZodiacCharacter;