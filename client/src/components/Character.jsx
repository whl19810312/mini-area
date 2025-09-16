import React, { useState, useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Three.js 기반 캐릭터 컴포넌트
 * - 간단한 메시 기반 렌더링
 * - 이모지 기반 캐릭터 지원
 * - 4방향 이동 지원
 * - 호버 효과
 */
const Character = ({ 
  character, 
  position = { x: 0, y: 0 }, 
  direction = 'down', 
  isMoving = false, 
  isCurrentUser = false 
}) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  
  
  // 캐릭터 내용 생성
  const characterContent = useMemo(() => {
    console.log('🎨 캐릭터 렌더링 데이터:', {
      character: character,
      hasImages: !!character?.images,
      hasAppearance: !!character?.appearance,
      images: character?.images,
      appearance: character?.appearance,
      direction: direction
    });

    // 이모지 기반 캐릭터인 경우 (우선순위 1)
    if (character?.appearance) {
      const result = generateEmojiCharacter(character.appearance, direction);
      console.log('✅ appearance 기반 캐릭터 생성:', result);
      return result;
    }
    
    // 4방향 이미지가 있는 경우 (우선순위 2)
    if (character?.images && character.images[direction]) {
      console.log('🖼️ 이미지 기반 캐릭터');
      // 실제 이미지가 있으면 렌더링하지 않음 (별도로 처리됨)
      return null;
    }
    
    // 단일 이미지가 있는 경우 (우선순위 3)
    if (character?.image) {
      console.log('🖼️ 단일 이미지 기반 캐릭터');
      return '🎭';
    }
    
    console.log('😀 기본 이모지 사용');
    return '😀'; // 기본 이모지
  }, [character, direction]);
  
  // 이모지 기반 캐릭터 생성
  const generateEmojiCharacter = (appearance, direction) => {
    const { head, body, arms, legs } = appearance;
    
    // 방향에 따른 레이아웃 결정
    const isHorizontal = direction === 'left' || direction === 'right';
    
    // 오른쪽 방향일 때 팔 이모지 반전
    const displayArms = arms;
    
    if (isHorizontal) {
      // 좌우 방향: 팔을 몸통 옆에 배치
      if (direction === 'right') {
        // 오른쪽 방향: 팔을 반대쪽에 배치 (시각적 반전 효과)
        return `${legs}${body}${head}${displayArms}`;
      } else {
        // 왼쪽 방향: 일반 배치
        return `${displayArms}${head}${body}${legs}`;
      }
    } else {
      // 상하 방향: 팔을 몸통 위아래에 배치
      return `${displayArms}${head}${body}${legs}`;
    }
  };
  
  // 애니메이션 효과
  const animationScale = isMoving ? 1.1 : 1.0;
  const animationRotation = direction === 'left' ? Math.PI : 0;
  
  // 사용자별 고유 색상 생성
  const getUserColor = (userName) => {
    if (!userName) return '#2196F3';
    
    // 사용자 이름을 해시하여 고유한 색상 생성
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // HSL 색상 공간을 사용하여 밝은 색상들 생성
    const hue = Math.abs(hash) % 360;
    const saturation = 70 + (Math.abs(hash) % 30); // 70-100% 채도
    const lightness = 50 + (Math.abs(hash) % 30);  // 50-80% 밝기
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // 캐릭터 색상
  const characterColor = isCurrentUser ? '#4CAF50' : getUserColor(character?.name);
  
  return (
    <group 
      position={[position.x, position.y, 0]}
      scale={[animationScale, animationScale, 1]}
      rotation={[0, 0, animationRotation]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 캐릭터 메시 */}
      <mesh ref={meshRef}>
        <boxGeometry args={[25, 25, 10]} />
        <meshBasicMaterial 
          color={characterColor}
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      
      {/* 캐릭터 이모지 */}
      <Text
        position={[0, 0, 15]}
        fontSize={12}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        outlineWidth={1}
        outlineColor="#000000"
      >
        {characterContent}
      </Text>
      
      {/* 사용자 이름 */}
      {character?.name && hovered && (
        <Text
          position={[0, 20, 0]}
          fontSize={8}
          color={characterColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.3}
          outlineColor="#000000"
        >
          {character.name}
        </Text>
      )}
      
      {/* 현재 사용자 표시 */}
      {isCurrentUser && (
        <mesh position={[0, -18, 0]}>
          <ringGeometry args={[12, 15, 16]} />
          <meshBasicMaterial 
            color="#4CAF50" 
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
};

export default Character; 