import React, { useEffect, useRef, useState } from 'react';

const CustomCharacterRenderer = ({ 
  characterData, 
  direction = 'down', 
  size = 50, 
  className = '',
  style = {},
  onClick 
}) => {
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    console.log('🎨 CustomCharacterRenderer 렌더링:', {
      characterData,
      direction,
      hasImages: !!characterData?.images,
      imageKeys: characterData?.images ? Object.keys(characterData.images) : null,
      directionImage: characterData?.images?.[direction],
      isSystemDefault: characterData?.isSystemDefault
    });

    if (!characterData || !characterData.images) {
      console.log('📌 기본 캐릭터 렌더링 (데이터 없음)');
      renderDefaultCharacter();
      return;
    }

    const image = characterData.images[direction];
    if (image) {
      console.log('✅ 이미지 기반 렌더링:', direction, characterData.isSystemDefault ? '(시스템 디폴트)' : '(커스텀)');
      renderFromImage(image);
    } else {
      console.log('📌 기본 캐릭터 렌더링 (이미지 없음)');
      renderDefaultCharacter();
    }
  }, [characterData, direction, size]);

  const renderFromImage = (imageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx.clearRect(0, 0, size, size);
      
      // 픽셀 아트 스타일 유지
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, size, size);
      setIsLoaded(true);
    };
    
    img.src = imageData;
  };

  const renderDefaultCharacter = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    // 기본 캐릭터 (간단한 도형)
    const scale = size / 64;
    
    // 머리
    ctx.fillStyle = '#FDB4A6';
    ctx.fillRect(16 * scale, 8 * scale, 32 * scale, 32 * scale);
    
    // 눈
    ctx.fillStyle = '#000';
    ctx.fillRect(20 * scale, 16 * scale, 4 * scale, 4 * scale);
    ctx.fillRect(28 * scale, 16 * scale, 4 * scale, 4 * scale);
    
    // 몸통
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(20 * scale, 32 * scale, 24 * scale, 20 * scale);
    
    // 팔
    ctx.fillStyle = '#FDB4A6';
    ctx.fillRect(12 * scale, 32 * scale, 8 * scale, 20 * scale);
    ctx.fillRect(44 * scale, 32 * scale, 8 * scale, 20 * scale);
    
    // 다리
    ctx.fillStyle = '#2F4F4F';
    ctx.fillRect(22 * scale, 45 * scale, 20 * scale, 19 * scale);
    
    setIsLoaded(true);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`custom-character ${className}`}
      style={{
        imageRendering: 'pixelated',
        imageRendering: '-moz-crisp-edges',
        imageRendering: 'crisp-edges',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onClick={onClick}
      width={size}
      height={size}
    />
  );
};

export default CustomCharacterRenderer;