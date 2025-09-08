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
    // 4방향 이미지가 있는 경우
    if (character?.images && character.images[direction]) {
      return '🎭'; // 이미지가 있는 경우 특별한 이모지
    }
    
    // 단일 이미지가 있는 경우
    if (character?.image) {
      return '🎭';
    }
    
    // 이모지 기반 캐릭터인 경우
    if (character?.appearance) {
      return generateEmojiCharacter(character.appearance, direction);
    }
    
    return '😀'; // 기본 이모지
  }, [character, direction]);
  
  // 이모지 기반 캐릭터 생성
  const generateEmojiCharacter = (appearance, direction) => {
    const { head, body, hands, feet } = appearance;
    
    // 방향에 따른 레이아웃 결정
    const isHorizontal = direction === 'left' || direction === 'right';
    
    // 오른쪽 방향일 때 손 이모지 반전
    const displayHands = hands;
    
    if (isHorizontal) {
      // 좌우 방향: 손을 몸통 옆에 배치
      if (direction === 'right') {
        // 오른쪽 방향: 손을 반대쪽에 배치 (시각적 반전 효과)
        return `${feet}${body}${head}${displayHands}`;
      } else {
        // 왼쪽 방향: 일반 배치
        return `${displayHands}${head}${body}${feet}`;
      }
    } else {
      // 상하 방향: 손을 몸통 위아래에 배치
      return `${displayHands}${head}${body}${feet}`;
    }
  };
  
  // 애니메이션 효과
  const animationScale = isMoving ? 1.1 : 1.0;
  const animationRotation = direction === 'left' ? Math.PI : 0;
  
  // 캐릭터 색상
  const characterColor = isCurrentUser ? '#4CAF50' : '#2196F3';
  
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
        <boxGeometry args={[50, 50, 10]} />
        <meshBasicMaterial 
          color={characterColor}
          transparent={true}
          opacity={0.9}
        />
      </mesh>
      
      {/* 캐릭터 이모지 */}
      <Text
        position={[0, 0, 15]}
        fontSize={24}
        color="white"
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
          position={[0, 40, 0]}
          fontSize={12}
          color={characterColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.5}
          outlineColor="#000000"
        >
          {character.name}
        </Text>
      )}
      
      {/* 현재 사용자 표시 */}
      {isCurrentUser && (
        <mesh position={[0, -35, 0]}>
          <ringGeometry args={[25, 30, 16]} />
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