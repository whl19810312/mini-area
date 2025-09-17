import React, { useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useRealtimeCharacterSync } from '../hooks/useRealtimeCharacterSync';
import { createDefaultCharacter } from '../utils/characterGenerator';

const MetaverseCharacterSystem = forwardRef(({ 
  socket, 
  currentMap, 
  currentCharacter,
  user,
  updateCharacterPosition
}, ref) => {
  const charSync = useRealtimeCharacterSync(socket, currentMap);
  
  // 기본 캐릭터 생성 (메모화)
  const defaultCharacter = useMemo(() => {
    return createDefaultCharacter(user?.username || '사용자');
  }, [user?.username]);

  // 외부에서 호출할 수 있는 메서드 노출
  useImperativeHandle(ref, () => ({
    handleClick: ({ x, y }) => {
      if (!user?.username || !currentMap || !socket) {
        console.log('🚫 이동 실패 - 필요한 데이터 없음:', { user: !!user?.username, currentMap: !!currentMap, socket: !!socket });
        return;
      }

      console.log(`🎯 캐릭터 이동 요청: (${x}, ${y})`);

      // 캐릭터 이동 애니메이션 시작
      if (charSync?.moveCharacterTo) {
        console.log('🚀 moveCharacterTo 호출');
        charSync.moveCharacterTo({ x, y });
      } else {
        console.log('❌ moveCharacterTo 함수 없음');
      }

      const characterId = user.username;
      const mapId = currentMap.id || currentMap._id;

      // 사용할 캐릭터 정보 (설정된 캐릭터 또는 기본 캐릭터)
      const characterToUse = currentCharacter || defaultCharacter;

      // 캐릭터 이동 처리
      const moveData = {
        characterId,
        mapId,
        position: { x, y },
        character: characterToUse
      };

      console.log('📡 서버에 위치 업데이트 전송:', moveData);

      // 서버에 위치 업데이트 전송
      socket.emit('update-character-position', moveData);

      // Context의 위치 업데이트
      if (updateCharacterPosition) {
        updateCharacterPosition(characterId, { x, y });
      }
    }
  }));

  // 렌더링할 캐릭터들 (메모화)
  const charactersToRender = useMemo(() => {
    const characters = [];
    
    // 현재 사용자 캐릭터만 먼저 추가 (myPosition 사용)
    if (user?.username && charSync?.myPosition) {
      // 현재 사용할 캐릭터 결정 (설정된 캐릭터 또는 기본 캐릭터)
      const characterToUse = currentCharacter || defaultCharacter;
      const currentDirection = charSync.myDirection || 'down';
      
      const userCharacter = {
        id: user.username,
        name: characterToUse.name || user.username,
        sprite: characterToUse.images?.[currentDirection] || characterToUse.sprite || characterToUse.image,
        direction: currentDirection,
        position: charSync.myPosition,
        isCurrentUser: true
      };
      
      characters.push(userCharacter);
    }

    // 다른 사용자 캐릭터들 추가 (입실한 모든 사용자 포함)
    if (charSync?.otherCharacters) {
      Object.values(charSync.otherCharacters).forEach((char) => {
        // 현재 사용자가 아닌 경우만 추가
        if (char.id !== user?.username && char.username !== user?.username) {
          // 캐릭터 정보가 있으면 사용, 없으면 기본 캐릭터 생성
          let characterSprite = null;
          let characterName = char.username || char.id;
          
          if (char.characterInfo && char.characterInfo.images) {
            // 서버에서 받은 캐릭터 정보 사용
            const direction = char.direction || 'down';
            characterSprite = char.characterInfo.images[direction];
            characterName = char.characterInfo.name || characterName;
          } else {
            // 기본 캐릭터 생성
            const otherDefaultChar = createDefaultCharacter(characterName);
            const direction = char.direction || 'down';
            characterSprite = otherDefaultChar.images[direction];
          }
          
          const otherCharacter = {
            id: char.id,
            name: characterName,
            username: char.username,
            sprite: characterSprite,
            direction: char.direction || 'down',
            position: char.position || { x: 200, y: 200 },
            isCurrentUser: false,
            areaType: char.areaType || 'public',
            currentArea: char.currentArea,
            areaDescription: char.areaDescription || '공개 영역',
            lastUpdate: char.lastUpdate
          };
          
          characters.push(otherCharacter);
        }
      });
    }
    
    console.log('🎨 최종 렌더링 캐릭터 목록:', characters.map(c => ({ 
      name: c.name, 
      id: c.id, 
      position: c.position, 
      isCurrentUser: c.isCurrentUser,
      hasSprite: !!c.sprite
    })));
    
    return characters;
  }, [user?.username, charSync?.myPosition, charSync?.myDirection, charSync?.otherCharacters, currentCharacter, defaultCharacter]);

  return (
    <div className="character-system">
      {charactersToRender.map((char) => {
        const hasSprite = char.sprite && char.sprite !== 'null' && char.sprite !== '';
        
        return (
          <div
            key={char.id}
            className={`character-container`}
            style={{
              position: 'absolute',
              left: `${char.position.x}px`,
              top: `${char.position.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* 캐릭터 이름 */}
            <div 
              className={`character-name ${char.isCurrentUser ? 'current-user' : 'other-user'}`}
              style={{
                background: char.isCurrentUser ? 'rgba(76, 175, 80, 0.9)' : 'rgba(33, 150, 243, 0.9)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                marginBottom: '6px',
                border: `2px solid ${char.isCurrentUser ? '#4CAF50' : '#2196F3'}`,
                textAlign: 'center',
                minWidth: 'fit-content',
                maxWidth: '120px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                position: 'relative',
                transform: 'translateX(0)', // 중앙 정렬 보장
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={`${char.name || char.id} - ${char.areaDescription || '공개 영역'} (${char.lastUpdate ? '동기화됨' : '대기중'})`}
            >
              {char.name || char.username || char.id}
              {/* 입실 상태 표시 */}
              {char.lastUpdate && (
                <span style={{
                  marginLeft: '4px',
                  fontSize: '10px',
                  color: '#90EE90'
                }}>●</span>
              )}
            </div>
            
            {/* 캐릭터 이미지 */}
            <div
              className={`character ${char.isCurrentUser ? 'current-user' : 'other-user'}`}
              style={{
                width: '64px',
                height: '64px',
                backgroundImage: hasSprite ? `url(${char.sprite})` : 'none',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'transparent',
                border: char.isCurrentUser ? '3px solid #4CAF50' : '3px solid #2196F3',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px'
              }}
              title={char.name || char.id}
            >
              {/* 스프라이트가 없을 때만 이모지 표시 */}
              {!hasSprite && (char.isCurrentUser ? '👤' : '👥')}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default MetaverseCharacterSystem;