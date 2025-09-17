// 고해상도 캐릭터 생성 유틸리티

export const createHighResCharacter = async (customization) => {
  // 256x256 고해상도 캐릭터 이미지 생성
  const generateCharacterImage = async (direction = 'down') => {
    const canvas = document.createElement('canvas');
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
    await renderLayer(ctx, 'body', customization, directionConfig);
    await renderLayer(ctx, 'clothing_bottom', customization, directionConfig);
    await renderLayer(ctx, 'clothing_top', customization, directionConfig);
    await renderLayer(ctx, 'shoes', customization, directionConfig);
    await renderLayer(ctx, 'arms', customization, directionConfig);
    await renderLayer(ctx, 'head', customization, directionConfig);
    await renderLayer(ctx, 'hair', customization, directionConfig);
    await renderLayer(ctx, 'face', customization, directionConfig);
    await renderLayer(ctx, 'hat', customization, directionConfig);
    
    return canvas.toDataURL('image/png');
  };

  // 4방향 이미지 생성
  const directions = ['up', 'down', 'left', 'right'];
  const images = {};
  
  for (const direction of directions) {
    images[direction] = await generateCharacterImage(direction);
  }
  
  return {
    name: customization.name,
    customization,
    images,
    size: 256,
    isHighRes: true
  };
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

const renderLayer = async (ctx, layer, character, config) => {
  const size = 256;
  const centerX = size / 2;
  const centerY = size / 2;

  ctx.save();
  
  switch (layer) {
    case 'body':
      await renderBody(ctx, centerX, centerY + 20, character, config);
      break;
    case 'head':
      await renderHead(ctx, centerX + config.headOffset.x, centerY - 60 + config.headOffset.y, character, config);
      break;
    case 'hair':
      await renderHair(ctx, centerX + config.headOffset.x, centerY - 80 + config.headOffset.y, character, config);
      break;
    case 'face':
      if (config.showFace) {
        await renderFace(ctx, centerX + config.headOffset.x, centerY - 60 + config.headOffset.y, character, config);
      }
      break;
    case 'clothing_top':
      await renderClothingTop(ctx, centerX, centerY, character, config);
      break;
    case 'clothing_bottom':
      await renderClothingBottom(ctx, centerX, centerY + 40, character, config);
      break;
    case 'shoes':
      await renderShoes(ctx, centerX, centerY + 90, character, config);
      break;
    case 'arms':
      await renderArms(ctx, centerX, centerY, character, config);
      break;
    case 'hat':
      if (character.clothing?.hat) {
        await renderHat(ctx, centerX + config.headOffset.x, centerY - 90 + config.headOffset.y, character, config);
      }
      break;
  }
  
  ctx.restore();
};

const renderBody = async (ctx, x, y, character, config) => {
  ctx.fillStyle = character.skinTone || '#FDBCB4';
  
  if (config.bodyAngle === 180) { // 등뒤
    ctx.fillRect(x - 25, y, 50, 60);
  } else if (config.bodyAngle === 0) { // 정면
    ctx.fillRect(x - 25, y, 50, 60);
    // 가슴 라인
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x - 10, y + 15, 8, 0, Math.PI * 2);
    ctx.arc(x + 10, y + 15, 8, 0, Math.PI * 2);
    ctx.stroke();
  } else { // 측면
    const width = Math.abs(config.bodyAngle) === 45 ? 35 : 50;
    ctx.fillRect(x - width/2, y, width, 60);
  }
};

const renderHead = async (ctx, x, y, character, config) => {
  ctx.fillStyle = character.skinTone || '#FDBCB4';
  
  if (config.bodyAngle === 180) { // 등뒤
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  } else if (config.bodyAngle === 0) { // 정면
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  } else { // 측면
    ctx.beginPath();
    ctx.ellipse(x, y, 25, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

const renderHair = async (ctx, x, y, character, config) => {
  ctx.fillStyle = character.hair?.color || '#8B4513';
  
  const hairStyle = character.hair?.style || 'short_messy';
  
  if (config.bodyAngle === 180) { // 등뒤
    switch (hairStyle) {
      case 'short_messy':
        ctx.fillRect(x - 35, y - 15, 70, 35);
        break;
      case 'long_straight':
        ctx.fillRect(x - 40, y - 20, 80, 80);
        break;
      case 'ponytail':
        ctx.fillRect(x - 35, y - 15, 70, 35);
        ctx.fillRect(x - 8, y + 20, 16, 40);
        break;
      case 'curly':
        // 곱슬머리 - 여러 원으로 표현
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const hairX = x + Math.cos(angle) * 25;
          const hairY = y + Math.sin(angle) * 20;
          ctx.beginPath();
          ctx.arc(hairX, hairY, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  } else if (config.bodyAngle === 0) { // 정면
    switch (hairStyle) {
      case 'short_messy':
        ctx.fillRect(x - 35, y - 20, 70, 40);
        ctx.fillRect(x - 30, y - 25, 60, 15);
        break;
      case 'long_straight':
        ctx.fillRect(x - 40, y - 25, 80, 70);
        break;
      case 'ponytail':
        ctx.fillRect(x - 35, y - 20, 70, 40);
        ctx.fillRect(x - 30, y - 25, 60, 15);
        break;
      case 'curly':
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const hairX = x + Math.cos(angle) * 30;
          const hairY = y + Math.sin(angle) * 25;
          ctx.beginPath();
          ctx.arc(hairX, hairY, 6, 0, Math.PI * 2);
          ctx.fill();
        }
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
        if (config.bodyAngle === 45) {
          ctx.fillRect(x + 20, y + 10, 12, 35);
        }
        break;
      case 'curly':
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI;
          const hairX = x + Math.cos(angle) * 25;
          const hairY = y + Math.sin(angle) * 20;
          ctx.beginPath();
          ctx.arc(hairX, hairY, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  }
};

const renderFace = async (ctx, x, y, character, config) => {
  if (!config.showFace) return;
  
  // 눈
  ctx.fillStyle = character.face?.eyeColor || '#4B4B4D';
  if (config.bodyAngle === 0) { // 정면
    ctx.beginPath();
    ctx.arc(x - 10, y - 5, 4, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 5, 4, 0, Math.PI * 2);
    ctx.fill();
  } else { // 측면
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

const renderClothingTop = async (ctx, x, y, character, config) => {
  if (!character.clothing?.top) return;
  
  ctx.fillStyle = character.clothing?.topColor || '#4169E1';
  
  if (config.bodyAngle === 180) { // 등뒤
    ctx.fillRect(x - 30, y - 10, 60, 70);
  } else if (config.bodyAngle === 0) { // 정면
    ctx.fillRect(x - 30, y - 10, 60, 70);
    // 버튼 또는 디테일
    ctx.fillStyle = '#FFFFFF';
    if (character.clothing.top === 'basic_shirt') {
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x, y + i * 15, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else { // 측면
    const width = 45;
    ctx.fillRect(x - width/2, y - 10, width, 70);
  }
};

const renderClothingBottom = async (ctx, x, y, character, config) => {
  if (!character.clothing?.bottom) return;
  
  ctx.fillStyle = character.clothing?.bottomColor || '#2F4F4F';
  
  if (config.bodyAngle === 180) { // 등뒤
    ctx.fillRect(x - 25, y, 50, 50);
  } else if (config.bodyAngle === 0) { // 정면
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

const renderShoes = async (ctx, x, y, character, config) => {
  ctx.fillStyle = character.clothing?.shoeColor || '#000000';
  
  if (config.bodyAngle === 0) { // 정면
    ctx.fillRect(x - 20, y, 15, 8);
    ctx.fillRect(x + 5, y, 15, 8);
  } else if (config.bodyAngle === 180) { // 등뒤
    ctx.fillRect(x - 20, y, 15, 8);
    ctx.fillRect(x + 5, y, 15, 8);
  } else { // 측면
    ctx.fillRect(x - 10, y, 20, 8);
  }
};

const renderArms = async (ctx, x, y, character, config) => {
  ctx.fillStyle = character.skinTone || '#FDBCB4';
  
  const armLength = 45;
  const armWidth = 12;
  
  if (config.bodyAngle === 180) { // 등뒤
    ctx.fillRect(x - 40, y + 10, armWidth, armLength);
    ctx.fillRect(x + 28, y + 10, armWidth, armLength);
  } else if (config.bodyAngle === 0) { // 정면
    ctx.fillRect(x - 40, y + 10, armWidth, armLength);
    ctx.fillRect(x + 28, y + 10, armWidth, armLength);
  } else { // 측면
    if (config.bodyAngle > 0) { // 오른쪽
      ctx.fillRect(x + 25, y + 10, armWidth, armLength);
      ctx.fillRect(x - 15, y + 15, armWidth, armLength);
    } else { // 왼쪽
      ctx.fillRect(x - 37, y + 10, armWidth, armLength);
      ctx.fillRect(x + 3, y + 15, armWidth, armLength);
    }
  }
};

const renderHat = async (ctx, x, y, character, config) => {
  ctx.fillStyle = '#8B4513';
  
  if (config.bodyAngle === 180) { // 등뒤
    ctx.fillRect(x - 40, y, 80, 15);
  } else if (config.bodyAngle === 0) { // 정면
    ctx.fillRect(x - 40, y, 80, 15);
    ctx.fillRect(x - 45, y + 10, 90, 5);
  } else { // 측면
    ctx.fillRect(x - 35, y, 60, 15);
    if (config.bodyAngle > 0) {
      ctx.fillRect(x - 40, y + 10, 70, 5);
    } else {
      ctx.fillRect(x - 30, y + 10, 70, 5);
    }
  }
};

// 메타버스에서 사용할 캐릭터 크기 조정 함수
export const resizeCharacterForMetaverse = (imageData, targetSize = 64) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = targetSize;
      canvas.height = targetSize;
      
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, targetSize, targetSize);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageData;
  });
};

// 기본 고해상도 캐릭터 생성
export const createDefaultHighResCharacter = async (username) => {
  const defaultCustomization = {
    name: username,
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
  };
  
  return await createHighResCharacter(defaultCustomization);
};