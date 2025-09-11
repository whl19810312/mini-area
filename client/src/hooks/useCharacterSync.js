import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMetaverse } from '../contexts/MetaverseContext';

export const useCharacterSync = (currentMap, position, currentArea, isMoving = false, characterInfo = null) => {
  const { user, socket } = useAuth();
  const { currentCharacter: contextCharacter } = useMetaverse();
  const currentCharacter = characterInfo || contextCharacter;
  const intervalRef = useRef(null);
  const lastSentDataRef = useRef(null);

  // UDP 방식으로 캐릭터/위치/영역 정보를 서버로 전송
  const sendCharacterData = useCallback(() => {
    if (!socket || !user || !currentMap || !currentCharacter || !position) {
      return;
    }

    const characterData = {
      type: 'character_sync_udp',
      userId: user.id,
      username: user.username,
      mapId: currentMap.id,
      characterId: currentCharacter.id,
      characterInfo: {
        id: currentCharacter.id,
        name: currentCharacter.name,
        emoji: currentCharacter.emoji,
        color: currentCharacter.color,
        style: currentCharacter.style
      },
      position: {
        x: position.x,
        y: position.y
      },
      direction: position.direction || 'down',
      currentArea: currentArea || 'public',
      isMoving: isMoving,
      timestamp: Date.now(),
      connectionStatus: 'active'
    };

    // 데이터가 변경되었을 때만 전송 (최적화)
    const dataString = JSON.stringify(characterData);
    if (lastSentDataRef.current !== dataString) {
      socket.emit('character-sync-udp', characterData);
      lastSentDataRef.current = dataString;
      
      // DEBUG: 전송 확인 (개발 중에만)
      console.log(`📤 UDP 캐릭터 동기화 전송:`, {
        userId: user.id,
        position: position,
        area: currentArea,
        moving: isMoving
      });
    }
  }, [socket, user, currentMap, currentCharacter, position, currentArea, isMoving]);

  // 0.1초마다 자신의 캐릭터 정보를 UDP로 전송
  useEffect(() => {
    if (!socket || !user || !currentMap || !currentCharacter) {
      return;
    }

    console.log('🚀 UDP 캐릭터 동기화 시작:', {
      mapId: currentMap.id,
      characterId: currentCharacter.id,
      username: user.username
    });

    // 즉시 한 번 전송
    sendCharacterData();

    // 0.1초마다 전송
    intervalRef.current = setInterval(sendCharacterData, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('🛑 UDP 캐릭터 동기화 중지');
      }
    };
  }, [sendCharacterData]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    sendCharacterData,
    isActive: !!intervalRef.current
  };
};