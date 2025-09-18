import React, { useState, useEffect } from 'react';
import './ZodiacSelector.css';

// 12개 별자리 데이터 (보석 귀걸이처럼 예쁜 별자리 이미지)
const zodiacSigns = [
  {
    id: 'aries',
    name: '양자리',
    englishName: 'Aries',
    symbol: '♈',
    constellation: '⭐🌟✨⭐',
    color: 'linear-gradient(135deg, #FFD700, #FF6B35)'
  },
  {
    id: 'taurus',
    name: '황소자리',
    englishName: 'Taurus', 
    symbol: '♉',
    constellation: '🌟⭐✨🌟',
    color: 'linear-gradient(135deg, #32CD32, #228B22)',
    removed_emoji: '🐂'
  },
  {
    id: 'gemini',
    name: '쌍둥이자리',
    englishName: 'Gemini',
    symbol: '♊',
    constellation: '✨⭐🌟✨',
    color: 'linear-gradient(135deg, #87CEEB, #4682B4)',
    removed_emoji: '👫'
  },
  {
    id: 'cancer',
    name: '게자리',
    englishName: 'Cancer',
    symbol: '♋',
    constellation: '🌟✨⭐🌟',
    color: 'linear-gradient(135deg, #E6E6FA, #9370DB)',
    removed_emoji: '🦀'
  },
  {
    id: 'leo',
    name: '사자자리',
    englishName: 'Leo',
    symbol: '♌',
    constellation: '⭐🌟⭐✨',
    color: 'linear-gradient(135deg, #FFD700, #FF8C00)',
    removed_emoji: '🦁'
  },
  {
    id: 'virgo',
    name: '처녀자리',
    englishName: 'Virgo',
    symbol: '♍',
    constellation: '✨🌟✨⭐',
    color: 'linear-gradient(135deg, #98FB98, #006400)',
    removed_emoji: '👧'
  },
  {
    id: 'libra',
    name: '천칭자리',
    englishName: 'Libra',
    symbol: '♎',
    constellation: '🌟⭐🌟✨',
    color: 'linear-gradient(135deg, #FFB6C1, #FF69B4)',
    removed_emoji: '⚖️'
  },
  {
    id: 'scorpio',
    name: '전갈자리',
    englishName: 'Scorpio',
    symbol: '♏',
    constellation: '⭐✨🌟⭐',
    color: 'linear-gradient(135deg, #8B0000, #DC143C)',
    removed_emoji: '🦂'
  },
  {
    id: 'sagittarius',
    name: '궁수자리',
    englishName: 'Sagittarius',
    symbol: '♐',
    constellation: '🌟✨⭐🌟',
    color: 'linear-gradient(135deg, #9932CC, #4B0082)',
    removed_emoji: '🏹'
  },
  {
    id: 'capricorn',
    name: '염소자리',
    englishName: 'Capricorn',
    symbol: '♑',
    constellation: '✨⭐✨🌟',
    color: 'linear-gradient(135deg, #2F4F4F, #708090)',
    removed_emoji: '🐐'
  },
  {
    id: 'aquarius',
    name: '물병자리',
    englishName: 'Aquarius',
    symbol: '♒',
    constellation: '⭐🌟✨⭐',
    color: 'linear-gradient(135deg, #00CED1, #008B8B)',
    removed_emoji: '🏺'
  },
  {
    id: 'pisces',
    name: '물고기자리',
    englishName: 'Pisces',
    symbol: '♓',
    constellation: '🌟⭐🌟✨',
    color: 'linear-gradient(135deg, #7B68EE, #483D8B)',
    removed_emoji: '🐟'
  }
];

const ZodiacSelector = ({ isOpen, onClose, onSelect, currentZodiac }) => {
  const [selectedZodiac, setSelectedZodiac] = useState(currentZodiac || zodiacSigns[0]);

  useEffect(() => {
    if (currentZodiac) {
      setSelectedZodiac(currentZodiac);
    }
  }, [currentZodiac]);

  const handleSelectZodiac = (zodiac) => {
    setSelectedZodiac(zodiac);
  };

  const handleConfirm = () => {
    onSelect(selectedZodiac);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="zodiac-selector-overlay">
      <div className="zodiac-selector-modal">
        <div className="zodiac-selector-header">
          <h2>✨ 별자리 선택 ✨</h2>
          <p>귀걸이처럼 예쁜 별자리를 선택해주세요</p>
        </div>

        <div className="zodiac-grid">
          {zodiacSigns.map((zodiac) => (
            <div
              key={zodiac.id}
              className={`zodiac-item ${selectedZodiac?.id === zodiac.id ? 'selected' : ''}`}
              onClick={() => handleSelectZodiac(zodiac)}
              title={`${zodiac.name} (${zodiac.englishName})`}
            >
              <div 
                className="zodiac-image"
                style={{ background: zodiac.color }}
              >
                <div className="zodiac-symbol-display">
                  <span className="zodiac-symbol-main">{zodiac.symbol}</span>
                </div>
              </div>
              <div className="zodiac-info">
                <div className="zodiac-name">{zodiac.name}</div>
                <div className="zodiac-symbol">{zodiac.symbol}</div>
                <div className="zodiac-constellation">{zodiac.constellation}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="zodiac-preview">
          <h3>선택된 별자리</h3>
          <div className="preview-item">
            <div 
              className="preview-image"
              style={{ background: selectedZodiac.color }}
            >
              <div className="zodiac-symbol-display">
                <span className="zodiac-symbol-main">{selectedZodiac.symbol}</span>
              </div>
            </div>
            <div className="preview-info">
              <div className="preview-name">{selectedZodiac.name}</div>
              <div className="preview-english">{selectedZodiac.englishName}</div>
              <div className="preview-constellation">{selectedZodiac.constellation}</div>
            </div>
          </div>
        </div>

        <div className="zodiac-selector-actions">
          <button className="cancel-btn" onClick={onClose}>
            취소
          </button>
          <button className="confirm-btn" onClick={handleConfirm}>
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
};

export { zodiacSigns };
export default ZodiacSelector;