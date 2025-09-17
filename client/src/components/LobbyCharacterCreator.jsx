import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LobbyCharacterCreator.css';

const LobbyCharacterCreator = ({ onClose, onCharacterSaved }) => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [character, setCharacter] = useState({
    name: user?.username || '',
    gender: 'male',
    skinTone: 'light',
    hair: {
      style: 'short_messy',
      color: '#8B4513'
    },
    face: {
      eyes: 'normal',
      eyeColor: '#4B4B4D',
      nose: 'normal',
      mouth: 'smile'
    },
    clothing: {
      hat: null,
      top: 'basic_shirt',
      bottom: 'basic_pants',
      shoes: 'sneakers',
      accessories: []
    },
    equipment: {
      weapon: null,
      shield: null,
      gloves: null,
      belt: null
    }
  });

  const [currentDirection, setCurrentDirection] = useState('down');
  const [generatedImages, setGeneratedImages] = useState({});

  // 스타일 옵션들
  const hairStyles = {
    short_messy: { name: '단발 헝클어진', icon: '🧑' },
    long_straight: { name: '긴 직모', icon: '👩' },
    curly: { name: '곱슬머리', icon: '👨‍🦱' },
    bald: { name: '대머리', icon: '👨‍🦲' },
    ponytail: { name: '포니테일', icon: '👩‍🦳' },
    braids: { name: '땋은머리', icon: '👱‍♀️' }
  };

  const clothingOptions = {
    tops: {
      basic_shirt: { name: '기본 셔츠', icon: '👔' },
      hoodie: { name: '후드티', icon: '🥽' },
      tank_top: { name: '탱크톱', icon: '🎽' },
      dress_shirt: { name: '드레스 셔츠', icon: '👔' },
      jacket: { name: '재킷', icon: '🧥' },
      armor_light: { name: '가벼운 갑옷', icon: '🦺' },
      armor_heavy: { name: '무거운 갑옷', icon: '⚔️' }
    },
    bottoms: {
      basic_pants: { name: '기본 바지', icon: '👖' },
      jeans: { name: '청바지', icon: '👕' },
      shorts: { name: '반바지', icon: '🩳' },
      skirt: { name: '치마', icon: '👗' },
      formal_pants: { name: '정장 바지', icon: '👔' },
      armor_legs: { name: '다리 갑옷', icon: '🛡️' }
    },
    shoes: {
      sneakers: { name: '운동화', icon: '👟' },
      boots: { name: '부츠', icon: '🥾' },
      sandals: { name: '샌들', icon: '👡' },
      dress_shoes: { name: '구두', icon: '👞' },
      armor_boots: { name: '갑옷 부츠', icon: '👢' }
    },
    hats: {
      baseball_cap: { name: '야구모자', icon: '🧢' },
      beanie: { name: '비니', icon: '🎩' },
      helmet: { name: '헬멧', icon: '⛑️' },
      crown: { name: '왕관', icon: '👑' },
      witch_hat: { name: '마법사 모자', icon: '🧙‍♂️' }
    }
  };

  const skinTones = {
    light: '#FDB4A6',
    medium: '#D2936B',
    dark: '#8B5A3C',
    tan: '#C49A81'
  };

  // 4방향 이미지 생성
  const generateAllDirections = async () => {
    const directions = ['up', 'down', 'left', 'right'];
    const images = {};
    
    for (const direction of directions) {
      const imageData = await renderCharacter(direction);
      images[direction] = imageData;
    }
    
    setGeneratedImages(images);
    return images;
  };

  // 캐릭터 렌더링 함수
  const renderCharacter = async (direction = 'down') => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const size = 64;
    
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    
    // 기본 신체 그리기
    await drawBodyBase(ctx, direction, size);
    
    // 의류 레이어별로 그리기
    await drawClothingLayers(ctx, direction, size);
    
    return canvas.toDataURL();
  };

  const drawBodyBase = async (ctx, direction, size) => {
    const baseColor = skinTones[character.skinTone];
    
    // 머리
    ctx.fillStyle = baseColor;
    ctx.fillRect(16, 8, 32, 32);
    
    // 눈
    const eyeOffset = getDirectionOffset(direction);
    ctx.fillStyle = character.face.eyeColor;
    ctx.fillRect(20 + eyeOffset.x, 16 + eyeOffset.y, 4, 4);
    ctx.fillRect(28 + eyeOffset.x, 16 + eyeOffset.y, 4, 4);
    
    // 머리카락
    ctx.fillStyle = character.hair.color;
    switch (character.hair.style) {
      case 'short_messy':
        ctx.fillRect(14, 6, 36, 10);
        break;
      case 'long_straight':
        ctx.fillRect(14, 6, 36, 18);
        break;
      case 'curly':
        ctx.fillRect(12, 6, 40, 12);
        break;
      case 'bald':
        // 머리카락 없음
        break;
      default:
        ctx.fillRect(14, 6, 36, 10);
    }
    
    // 몸통
    ctx.fillStyle = baseColor;
    ctx.fillRect(20, 32, 24, 20);
    
    // 팔
    const armOffset = getArmOffset(direction);
    ctx.fillRect(12 + armOffset.left.x, 32 + armOffset.left.y, 8, 20);
    ctx.fillRect(44 + armOffset.right.x, 32 + armOffset.right.y, 8, 20);
    
    // 다리
    ctx.fillRect(22, 52, 8, 12);
    ctx.fillRect(34, 52, 8, 12);
  };

  const drawClothingLayers = async (ctx, direction, size) => {
    const colors = {
      basic_shirt: '#4169E1',
      hoodie: '#708090',
      basic_pants: '#2F4F4F',
      jeans: '#1E90FF',
      sneakers: '#FFFFFF',
      boots: '#8B4513'
    };
    
    // 상의
    if (character.clothing.top) {
      ctx.fillStyle = colors[character.clothing.top] || '#888888';
      ctx.fillRect(20, 32, 24, 20);
    }
    
    // 하의
    if (character.clothing.bottom) {
      ctx.fillStyle = colors[character.clothing.bottom] || '#888888';
      ctx.fillRect(22, 45, 20, 19);
    }
    
    // 신발
    if (character.clothing.shoes) {
      ctx.fillStyle = colors[character.clothing.shoes] || '#888888';
      ctx.fillRect(22, 60, 8, 4);
      ctx.fillRect(34, 60, 8, 4);
    }
    
    // 모자
    if (character.clothing.hat) {
      ctx.fillStyle = colors[character.clothing.hat] || '#888888';
      ctx.fillRect(16, 4, 32, 8);
    }
  };

  const getDirectionOffset = (direction) => {
    switch (direction) {
      case 'up': return { x: 0, y: -2 };
      case 'down': return { x: 0, y: 0 };
      case 'left': return { x: -2, y: 0 };
      case 'right': return { x: 2, y: 0 };
      default: return { x: 0, y: 0 };
    }
  };

  const getArmOffset = (direction) => {
    switch (direction) {
      case 'up':
        return { left: { x: 0, y: -2 }, right: { x: 0, y: -2 } };
      case 'down':
        return { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
      case 'left':
        return { left: { x: -2, y: 0 }, right: { x: 2, y: 0 } };
      case 'right':
        return { left: { x: -2, y: 0 }, right: { x: 2, y: 0 } };
      default:
        return { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
    }
  };

  // 캐릭터 변경 시 자동 렌더링
  useEffect(() => {
    renderCharacter(currentDirection);
  }, [character, currentDirection]);

  const handleSaveCharacter = async () => {
    if (!character.name.trim()) {
      alert('캐릭터 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // 4방향 이미지 생성
      const allDirectionImages = await generateAllDirections();
      
      // 서버에 저장
      const response = await fetch('/api/character/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: character.name,
          customization: character,
          images: allDirectionImages,
          size: 64
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('캐릭터가 저장되었습니다!');
        onCharacterSaved && onCharacterSaved(result.character);
        onClose();
      } else {
        alert(`저장 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('캐릭터 저장 오류:', error);
      alert('캐릭터 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharacterChange = (category, subcategory, value) => {
    setCharacter(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: value
      }
    }));
  };

  return (
    <div className="lobby-character-creator-overlay">
      <div className="lobby-character-creator">
        <div className="creator-header">
          <h2>🎨 캐릭터 커스터마이징</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="creator-content">
          {/* 캐릭터 미리보기 */}
          <div className="character-preview">
            <h3>미리보기</h3>
            <div className="preview-canvas">
              <canvas ref={canvasRef} width="64" height="64" />
            </div>
            
            <div className="direction-controls">
              <button 
                className={`direction-btn ${currentDirection === 'up' ? 'active' : ''}`}
                onClick={() => setCurrentDirection('up')}
              >
                ↑
              </button>
              <div className="direction-row">
                <button 
                  className={`direction-btn ${currentDirection === 'left' ? 'active' : ''}`}
                  onClick={() => setCurrentDirection('left')}
                >
                  ←
                </button>
                <button 
                  className={`direction-btn ${currentDirection === 'down' ? 'active' : ''}`}
                  onClick={() => setCurrentDirection('down')}
                >
                  ↓
                </button>
                <button 
                  className={`direction-btn ${currentDirection === 'right' ? 'active' : ''}`}
                  onClick={() => setCurrentDirection('right')}
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* 커스터마이징 옵션 */}
          <div className="customization-panel">
            {/* 기본 정보 */}
            <div className="option-section">
              <h3>기본 정보</h3>
              <div className="option-group">
                <label>이름:</label>
                <input 
                  type="text" 
                  value={character.name}
                  onChange={(e) => setCharacter(prev => ({...prev, name: e.target.value}))}
                  placeholder="캐릭터 이름"
                />
              </div>
              
              <div className="option-group">
                <label>성별:</label>
                <select 
                  value={character.gender}
                  onChange={(e) => setCharacter(prev => ({...prev, gender: e.target.value}))}
                >
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                  <option value="neutral">중성</option>
                </select>
              </div>

              <div className="option-group">
                <label>피부톤:</label>
                <div className="skin-tone-options">
                  {Object.entries(skinTones).map(([key, color]) => (
                    <button
                      key={key}
                      className={`skin-tone-btn ${character.skinTone === key ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCharacter(prev => ({...prev, skinTone: key}))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 헤어 스타일 */}
            <div className="option-section">
              <h3>헤어 스타일</h3>
              <div className="option-group">
                <label>스타일:</label>
                <div className="style-grid">
                  {Object.entries(hairStyles).map(([key, style]) => (
                    <button
                      key={key}
                      className={`style-btn ${character.hair.style === key ? 'active' : ''}`}
                      onClick={() => handleCharacterChange('hair', 'style', key)}
                    >
                      <span className="style-icon">{style.icon}</span>
                      <span className="style-name">{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="option-group">
                <label>색상:</label>
                <input 
                  type="color" 
                  value={character.hair.color}
                  onChange={(e) => handleCharacterChange('hair', 'color', e.target.value)}
                />
              </div>
            </div>

            {/* 의류 */}
            <div className="option-section">
              <h3>의류</h3>
              
              <div className="option-group">
                <label>상의:</label>
                <div className="style-grid">
                  {Object.entries(clothingOptions.tops).map(([key, item]) => (
                    <button
                      key={key}
                      className={`style-btn ${character.clothing.top === key ? 'active' : ''}`}
                      onClick={() => handleCharacterChange('clothing', 'top', key)}
                    >
                      <span className="style-icon">{item.icon}</span>
                      <span className="style-name">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <label>하의:</label>
                <div className="style-grid">
                  {Object.entries(clothingOptions.bottoms).map(([key, item]) => (
                    <button
                      key={key}
                      className={`style-btn ${character.clothing.bottom === key ? 'active' : ''}`}
                      onClick={() => handleCharacterChange('clothing', 'bottom', key)}
                    >
                      <span className="style-icon">{item.icon}</span>
                      <span className="style-name">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <label>신발:</label>
                <div className="style-grid">
                  {Object.entries(clothingOptions.shoes).map(([key, item]) => (
                    <button
                      key={key}
                      className={`style-btn ${character.clothing.shoes === key ? 'active' : ''}`}
                      onClick={() => handleCharacterChange('clothing', 'shoes', key)}
                    >
                      <span className="style-icon">{item.icon}</span>
                      <span className="style-name">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <label>모자:</label>
                <div className="style-grid">
                  <button
                    className={`style-btn ${!character.clothing.hat ? 'active' : ''}`}
                    onClick={() => handleCharacterChange('clothing', 'hat', null)}
                  >
                    <span className="style-icon">🚫</span>
                    <span className="style-name">없음</span>
                  </button>
                  {Object.entries(clothingOptions.hats).map(([key, item]) => (
                    <button
                      key={key}
                      className={`style-btn ${character.clothing.hat === key ? 'active' : ''}`}
                      onClick={() => handleCharacterChange('clothing', 'hat', key)}
                    >
                      <span className="style-icon">{item.icon}</span>
                      <span className="style-name">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="creator-actions">
          <button className="cancel-btn" onClick={onClose}>
            취소
          </button>
          <button 
            className="save-btn" 
            onClick={handleSaveCharacter}
            disabled={isLoading}
          >
            {isLoading ? '저장 중...' : '캐릭터 저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LobbyCharacterCreator;