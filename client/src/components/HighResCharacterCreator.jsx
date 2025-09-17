import React, { useState, useRef, useEffect } from 'react';
import './HighResCharacterCreator.css';

const HighResCharacterCreator = ({ isOpen, onClose, onCharacterSaved }) => {
  const canvasRef = useRef(null);
  const [currentDirection, setCurrentDirection] = useState('down');
  const [isLoading, setIsLoading] = useState(false);
  const [character, setCharacter] = useState({
    name: '',
    gender: 'male',
    skinTone: '#FDBCB4',
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
      topColor: '#4169E1',
      bottom: 'basic_pants',
      bottomColor: '#2F4F4F',
      shoes: 'sneakers',
      shoeColor: '#000000',
      accessories: []
    },
    equipment: {
      weapon: null,
      shield: null,
      gloves: null,
      belt: null
    }
  });

  // 고해상도 캐릭터 렌더링 (256x256)
  const renderCharacter = async (direction = 'down') => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    
    // 캔버스 초기화
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    
    // 방향에 따른 기본 설정
    const directionConfig = getDirectionConfig(direction);
    
    // 레이어별 렌더링 (뒤에서 앞으로)
    await renderLayer(ctx, 'background', directionConfig);
    await renderLayer(ctx, 'body', directionConfig);
    await renderLayer(ctx, 'clothing_bottom', directionConfig);
    await renderLayer(ctx, 'clothing_top', directionConfig);
    await renderLayer(ctx, 'shoes', directionConfig);
    await renderLayer(ctx, 'arms', directionConfig);
    await renderLayer(ctx, 'hands', directionConfig);
    await renderLayer(ctx, 'head', directionConfig);
    await renderLayer(ctx, 'hair', directionConfig);
    await renderLayer(ctx, 'face', directionConfig);
    await renderLayer(ctx, 'hat', directionConfig);
    await renderLayer(ctx, 'accessories', directionConfig);
    await renderLayer(ctx, 'equipment', directionConfig);
    
    return canvas.toDataURL('image/png');
  };

  const getDirectionConfig = (direction) => {
    switch (direction) {
      case 'up': // 등뒤
        return {
          showFace: false,
          bodyAngle: 180,
          headOffset: { x: 0, y: -10 },
          armAngle: -15,
          legStance: 'back'
        };
      case 'down': // 정면
        return {
          showFace: true,
          bodyAngle: 0,
          headOffset: { x: 0, y: 0 },
          armAngle: 0,
          legStance: 'front'
        };
      case 'left': // 왼쪽 얼굴과 몸
        return {
          showFace: true,
          bodyAngle: -45,
          headOffset: { x: -5, y: 0 },
          armAngle: -30,
          legStance: 'left'
        };
      case 'right': // 오른쪽 얼굴과 몸
        return {
          showFace: true,
          bodyAngle: 45,
          headOffset: { x: 5, y: 0 },
          armAngle: 30,
          legStance: 'right'
        };
      default:
        return getDirectionConfig('down');
    }
  };

  const renderLayer = async (ctx, layer, config) => {
    const size = 256;
    const centerX = size / 2;
    const centerY = size / 2;

    ctx.save();
    
    switch (layer) {
      case 'body':
        await renderBody(ctx, centerX, centerY + 20, config);
        break;
      case 'head':
        await renderHead(ctx, centerX + config.headOffset.x, centerY - 60 + config.headOffset.y, config);
        break;
      case 'hair':
        await renderHair(ctx, centerX + config.headOffset.x, centerY - 80 + config.headOffset.y, config);
        break;
      case 'face':
        if (config.showFace) {
          await renderFace(ctx, centerX + config.headOffset.x, centerY - 60 + config.headOffset.y, config);
        }
        break;
      case 'clothing_top':
        await renderClothingTop(ctx, centerX, centerY, config);
        break;
      case 'clothing_bottom':
        await renderClothingBottom(ctx, centerX, centerY + 40, config);
        break;
      case 'shoes':
        await renderShoes(ctx, centerX, centerY + 90, config);
        break;
      case 'arms':
        await renderArms(ctx, centerX, centerY, config);
        break;
      case 'hat':
        if (character.clothing.hat) {
          await renderHat(ctx, centerX + config.headOffset.x, centerY - 90 + config.headOffset.y, config);
        }
        break;
    }
    
    ctx.restore();
  };

  const renderBody = async (ctx, x, y, config) => {
    ctx.fillStyle = character.skinTone;
    
    if (config.bodyAngle === 180) { // 등뒤
      // 등 부분
      ctx.fillRect(x - 25, y, 50, 60);
    } else if (config.bodyAngle === 0) { // 정면
      // 가슴과 복부
      ctx.fillRect(x - 25, y, 50, 60);
      // 가슴 라인 (정면일 때만)
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x - 10, y + 15, 8, 0, Math.PI * 2);
      ctx.arc(x + 10, y + 15, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else { // 측면
      // 측면 몸통
      const width = Math.abs(config.bodyAngle) === 45 ? 35 : 50;
      ctx.fillRect(x - width/2, y, width, 60);
    }
  };

  const renderHead = async (ctx, x, y, config) => {
    ctx.fillStyle = character.skinTone;
    
    if (config.bodyAngle === 180) { // 등뒤
      // 뒤통수
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
    } else if (config.bodyAngle === 0) { // 정면
      // 정면 얼굴 형태
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
    } else { // 측면
      // 측면 얼굴 형태 (타원)
      ctx.beginPath();
      ctx.ellipse(x, y, 25, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const renderHair = async (ctx, x, y, config) => {
    ctx.fillStyle = character.hair.color;
    
    const hairStyle = character.hair.style;
    
    if (config.bodyAngle === 180) { // 등뒤
      // 뒤통수 머리카락
      switch (hairStyle) {
        case 'short_messy':
          ctx.fillRect(x - 35, y - 15, 70, 35);
          break;
        case 'long_straight':
          ctx.fillRect(x - 40, y - 20, 80, 80);
          break;
        case 'ponytail':
          ctx.fillRect(x - 35, y - 15, 70, 35);
          // 포니테일
          ctx.fillRect(x - 8, y + 20, 16, 40);
          break;
      }
    } else if (config.bodyAngle === 0) { // 정면
      switch (hairStyle) {
        case 'short_messy':
          ctx.fillRect(x - 35, y - 20, 70, 40);
          // 앞머리
          ctx.fillRect(x - 30, y - 25, 60, 15);
          break;
        case 'long_straight':
          ctx.fillRect(x - 40, y - 25, 80, 70);
          break;
        case 'ponytail':
          ctx.fillRect(x - 35, y - 20, 70, 40);
          ctx.fillRect(x - 30, y - 25, 60, 15);
          break;
      }
    } else { // 측면
      switch (hairStyle) {
        case 'short_messy':
          ctx.fillRect(x - 30, y - 20, 50, 40);
          break;
        case 'long_straight':
          ctx.fillRect(x - 35, y - 25, 60, 70);
          break;
        case 'ponytail':
          ctx.fillRect(x - 30, y - 20, 50, 40);
          if (config.bodyAngle === 45) { // 오른쪽
            ctx.fillRect(x + 20, y + 10, 12, 35);
          }
          break;
      }
    }
  };

  const renderFace = async (ctx, x, y, config) => {
    if (!config.showFace) return;
    
    // 눈
    ctx.fillStyle = character.face.eyeColor;
    if (config.bodyAngle === 0) { // 정면
      // 양쪽 눈
      ctx.beginPath();
      ctx.arc(x - 10, y - 5, 4, 0, Math.PI * 2);
      ctx.arc(x + 10, y - 5, 4, 0, Math.PI * 2);
      ctx.fill();
    } else { // 측면
      // 보이는 쪽 눈 하나
      ctx.beginPath();
      ctx.arc(x + (config.bodyAngle > 0 ? 8 : -8), y - 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 코
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    if (config.bodyAngle === 0) { // 정면
      ctx.fillRect(x - 1, y + 2, 2, 3);
    } else { // 측면
      ctx.fillRect(x + (config.bodyAngle > 0 ? 5 : -7), y + 2, 3, 2);
    }
    
    // 입
    ctx.fillStyle = '#FF69B4';
    if (config.bodyAngle === 0) { // 정면
      ctx.fillRect(x - 6, y + 10, 12, 3);
    } else { // 측면
      ctx.fillRect(x + (config.bodyAngle > 0 ? 2 : -8), y + 10, 8, 3);
    }
  };

  const renderClothingTop = async (ctx, x, y, config) => {
    if (!character.clothing.top) return;
    
    ctx.fillStyle = character.clothing.topColor;
    
    if (config.bodyAngle === 180) { // 등뒤
      // 등 부분 옷
      ctx.fillRect(x - 30, y - 10, 60, 70);
    } else if (config.bodyAngle === 0) { // 정면
      // 정면 셔츠
      ctx.fillRect(x - 30, y - 10, 60, 70);
      // 버튼
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x, y + i * 15, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else { // 측면
      const width = 45;
      ctx.fillRect(x - width/2, y - 10, width, 70);
    }
  };

  const renderClothingBottom = async (ctx, x, y, config) => {
    if (!character.clothing.bottom) return;
    
    ctx.fillStyle = character.clothing.bottomColor;
    
    if (config.bodyAngle === 180) { // 등뒤
      // 등뒤 바지
      ctx.fillRect(x - 25, y, 50, 50);
    } else if (config.bodyAngle === 0) { // 정면
      // 정면 바지
      ctx.fillRect(x - 25, y, 50, 50);
      // 다리 구분선
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 50);
      ctx.stroke();
    } else { // 측면
      ctx.fillRect(x - 20, y, 40, 50);
    }
  };

  const renderShoes = async (ctx, x, y, config) => {
    ctx.fillStyle = character.clothing.shoeColor;
    
    if (config.bodyAngle === 0) { // 정면
      // 양쪽 신발
      ctx.fillRect(x - 20, y, 15, 8);
      ctx.fillRect(x + 5, y, 15, 8);
    } else if (config.bodyAngle === 180) { // 등뒤
      ctx.fillRect(x - 20, y, 15, 8);
      ctx.fillRect(x + 5, y, 15, 8);
    } else { // 측면
      ctx.fillRect(x - 10, y, 20, 8);
    }
  };

  const renderArms = async (ctx, x, y, config) => {
    ctx.fillStyle = character.skinTone;
    
    const armLength = 45;
    const armWidth = 12;
    
    if (config.bodyAngle === 180) { // 등뒤
      // 양팔 등뒤
      ctx.fillRect(x - 40, y + 10, armWidth, armLength);
      ctx.fillRect(x + 28, y + 10, armWidth, armLength);
    } else if (config.bodyAngle === 0) { // 정면
      // 양팔 정면
      ctx.fillRect(x - 40, y + 10, armWidth, armLength);
      ctx.fillRect(x + 28, y + 10, armWidth, armLength);
    } else { // 측면
      if (config.bodyAngle > 0) { // 오른쪽
        ctx.fillRect(x + 25, y + 10, armWidth, armLength);
        ctx.fillRect(x - 15, y + 15, armWidth, armLength); // 뒤쪽 팔
      } else { // 왼쪽
        ctx.fillRect(x - 37, y + 10, armWidth, armLength);
        ctx.fillRect(x + 3, y + 15, armWidth, armLength); // 뒤쪽 팔
      }
    }
  };

  const renderHat = async (ctx, x, y, config) => {
    ctx.fillStyle = '#8B4513'; // 기본 모자 색상
    
    if (config.bodyAngle === 180) { // 등뒤
      ctx.fillRect(x - 40, y, 80, 15);
    } else if (config.bodyAngle === 0) { // 정면
      ctx.fillRect(x - 40, y, 80, 15);
      // 모자 챙
      ctx.fillRect(x - 45, y + 10, 90, 5);
    } else { // 측면
      ctx.fillRect(x - 35, y, 60, 15);
      if (config.bodyAngle > 0) { // 오른쪽
        ctx.fillRect(x - 40, y + 10, 70, 5);
      } else { // 왼쪽
        ctx.fillRect(x - 30, y + 10, 70, 5);
      }
    }
  };

  // 모든 방향 이미지 생성
  const generateAllDirections = async () => {
    const directions = ['up', 'down', 'left', 'right'];
    const images = {};
    
    for (const direction of directions) {
      const imageData = await renderCharacter(direction);
      images[direction] = imageData;
    }
    
    return images;
  };

  // 캐릭터 변경 시 자동 렌더링
  useEffect(() => {
    if (isOpen) {
      renderCharacter(currentDirection);
    }
  }, [character, currentDirection, isOpen]);

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
      const response = await fetch('/api/characters/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: character.name,
          customization: character,
          images: allDirectionImages,
          size: 256
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('고해상도 캐릭터가 저장되었습니다!');
        
        // 메타버스 캐릭터 시스템에서 새 캐릭터 로드하도록 트리거
        window.dispatchEvent(new CustomEvent('characterUpdated', {
          detail: result.character
        }));
        
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

  const skinTones = [
    '#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#654321'
  ];

  const hairStyles = [
    { id: 'short_messy', name: '짧은 머리', icon: '✂️' },
    { id: 'long_straight', name: '긴 생머리', icon: '👩' },
    { id: 'ponytail', name: '포니테일', icon: '🎀' },
    { id: 'curly', name: '곱슬머리', icon: '🌀' }
  ];

  const clothingTops = [
    { id: 'basic_shirt', name: '기본 셔츠', icon: '👔' },
    { id: 'hoodie', name: '후드티', icon: '🧥' },
    { id: 't_shirt', name: '티셔츠', icon: '👕' },
    { id: 'jacket', name: '재킷', icon: '🧥' }
  ];

  const clothingBottoms = [
    { id: 'basic_pants', name: '기본 바지', icon: '👖' },
    { id: 'jeans', name: '청바지', icon: '👖' },
    { id: 'shorts', name: '반바지', icon: '🩳' },
    { id: 'skirt', name: '치마', icon: '👗' }
  ];

  if (!isOpen) return null;

  return (
    <div className="high-res-character-creator-overlay">
      <div className="high-res-character-creator">
        <div className="creator-header">
          <h2>🎨 고해상도 캐릭터 생성</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="creator-content">
          {/* 캐릭터 미리보기 */}
          <div className="character-preview">
            <h3>미리보기</h3>
            <div className="preview-canvas">
              <canvas 
                ref={canvasRef}
                width={256}
                height={256}
                style={{ width: '128px', height: '128px' }}
              />
            </div>
            
            {/* 방향 컨트롤 */}
            <div className="direction-controls">
              <div className="direction-row">
                <button 
                  className={`direction-btn ${currentDirection === 'up' ? 'active' : ''}`}
                  onClick={() => setCurrentDirection('up')}
                >↑</button>
              </div>
              <div className="direction-row">
                <button 
                  className={`direction-btn ${currentDirection === 'left' ? 'active' : ''}`}
                  onClick={() => setCurrentDirection('left')}
                >←</button>
                <button 
                  className={`direction-btn ${currentDirection === 'down' ? 'active' : ''}`}
                  onClick={() => setCurrentDirection('down')}
                >↓</button>
                <button 
                  className={`direction-btn ${currentDirection === 'right' ? 'active' : ''}`}
                  onClick={() => setCurrentDirection('right')}
                >→</button>
              </div>
            </div>
          </div>

          {/* 커스터마이징 패널 */}
          <div className="customization-panel">
            {/* 기본 정보 */}
            <div className="option-section">
              <h3>기본 정보</h3>
              <div className="option-group">
                <label>캐릭터 이름</label>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="캐릭터 이름을 입력하세요"
                />
              </div>
              <div className="option-group">
                <label>성별</label>
                <select
                  value={character.gender}
                  onChange={(e) => setCharacter(prev => ({ ...prev, gender: e.target.value }))}
                >
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </div>
            </div>

            {/* 피부톤 */}
            <div className="option-section">
              <h3>피부톤</h3>
              <div className="skin-tone-options">
                {skinTones.map(tone => (
                  <button
                    key={tone}
                    className={`skin-tone-btn ${character.skinTone === tone ? 'active' : ''}`}
                    style={{ backgroundColor: tone }}
                    onClick={() => setCharacter(prev => ({ ...prev, skinTone: tone }))}
                  />
                ))}
              </div>
            </div>

            {/* 헤어 스타일 */}
            <div className="option-section">
              <h3>헤어 스타일</h3>
              <div className="style-grid">
                {hairStyles.map(style => (
                  <button
                    key={style.id}
                    className={`style-btn ${character.hair.style === style.id ? 'active' : ''}`}
                    onClick={() => handleCharacterChange('hair', 'style', style.id)}
                  >
                    <span className="style-icon">{style.icon}</span>
                    <span className="style-name">{style.name}</span>
                  </button>
                ))}
              </div>
              <div className="option-group">
                <label>머리 색상</label>
                <input
                  type="color"
                  value={character.hair.color}
                  onChange={(e) => handleCharacterChange('hair', 'color', e.target.value)}
                />
              </div>
            </div>

            {/* 상의 */}
            <div className="option-section">
              <h3>상의</h3>
              <div className="style-grid">
                {clothingTops.map(item => (
                  <button
                    key={item.id}
                    className={`style-btn ${character.clothing.top === item.id ? 'active' : ''}`}
                    onClick={() => handleCharacterChange('clothing', 'top', item.id)}
                  >
                    <span className="style-icon">{item.icon}</span>
                    <span className="style-name">{item.name}</span>
                  </button>
                ))}
              </div>
              <div className="option-group">
                <label>상의 색상</label>
                <input
                  type="color"
                  value={character.clothing.topColor}
                  onChange={(e) => handleCharacterChange('clothing', 'topColor', e.target.value)}
                />
              </div>
            </div>

            {/* 하의 */}
            <div className="option-section">
              <h3>하의</h3>
              <div className="style-grid">
                {clothingBottoms.map(item => (
                  <button
                    key={item.id}
                    className={`style-btn ${character.clothing.bottom === item.id ? 'active' : ''}`}
                    onClick={() => handleCharacterChange('clothing', 'bottom', item.id)}
                  >
                    <span className="style-icon">{item.icon}</span>
                    <span className="style-name">{item.name}</span>
                  </button>
                ))}
              </div>
              <div className="option-group">
                <label>하의 색상</label>
                <input
                  type="color"
                  value={character.clothing.bottomColor}
                  onChange={(e) => handleCharacterChange('clothing', 'bottomColor', e.target.value)}
                />
              </div>
            </div>

            {/* 신발 */}
            <div className="option-section">
              <h3>신발</h3>
              <div className="option-group">
                <label>신발 색상</label>
                <input
                  type="color"
                  value={character.clothing.shoeColor}
                  onChange={(e) => handleCharacterChange('clothing', 'shoeColor', e.target.value)}
                />
              </div>
            </div>

            {/* 모자 */}
            <div className="option-section">
              <h3>모자</h3>
              <div className="option-group">
                <label>
                  <input
                    type="checkbox"
                    checked={!!character.clothing.hat}
                    onChange={(e) => handleCharacterChange('clothing', 'hat', e.target.checked ? 'cap' : null)}
                  />
                  모자 착용
                </label>
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

export default HighResCharacterCreator;