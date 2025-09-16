import { useState, useEffect, useRef, useCallback } from 'react';

// 실시간 캐릭터 동기화 훅 (직선 이동 버전)
export const useRealtimeCharacterSync = (socket, currentMap, currentCharacter) => {
  const [myPosition, setMyPosition] = useState({ x: 400, y: 300 });
  const [myDirection, setMyDirection] = useState('down');
  const [otherCharacters, setOtherCharacters] = useState({});
  const [currentPath, setCurrentPath] = useState([]);
  
  const myPositionRef = useRef(myPosition);
  const myDirectionRef = useRef(myDirection);
  const clickTargetRef = useRef(null);
  
  // ref 업데이트
  useEffect(() => {
    myPositionRef.current = myPosition;
  }, [myPosition]);
  
  useEffect(() => {
    myDirectionRef.current = myDirection;
  }, [myDirection]);
  
  // 맵 변경 시 위치 초기화
  useEffect(() => {
    if (currentMap?.spawnPoints && currentMap.spawnPoints.length > 0) {
      const spawnPoint = currentMap.spawnPoints[0];
      const startPos = { x: spawnPoint.x, y: spawnPoint.y };
      console.log('🎯 스폰 포인트로 이동:', startPos);
      setMyPosition(startPos);
    } else {
      const defaultPosition = { x: 400, y: 300 };
      console.log('🎯 기본 위치로 이동:', defaultPosition);
      setMyPosition(defaultPosition);
    }
  }, [currentMap?.id]);
  
  // 벽 충돌 감지 함수 (강화된 버전)
  const checkWallCollision = useCallback((from, to) => {
    if (!currentMap?.walls || currentMap.walls.length === 0) return false;
    
    // 매우 짧은 이동은 허용
    const moveDistance = Math.hypot(to.x - from.x, to.y - from.y);
    if (moveDistance < 1) return false;
    
    // 선분과 벽의 교차 검사
    for (const wall of currentMap.walls) {
      const x1 = wall.start?.x ?? wall.x1 ?? 0;
      const y1 = wall.start?.y ?? wall.y1 ?? 0;
      const x2 = wall.end?.x ?? wall.x2 ?? 0;
      const y2 = wall.end?.y ?? wall.y2 ?? 0;
      
      // 선분 교차 알고리즘
      const det = (to.x - from.x) * (y2 - y1) - (to.y - from.y) * (x2 - x1);
      if (Math.abs(det) < 0.0001) continue;
      
      const t = ((x1 - from.x) * (y2 - y1) - (y1 - from.y) * (x2 - x1)) / det;
      const u = ((x1 - from.x) * (to.y - from.y) - (y1 - from.y) * (to.x - from.x)) / det;
      
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        console.log('🚧 벽 충돌 감지:', { from, to, wall: { x1, y1, x2, y2 } });
        return true;
      }
    }
    return false;
  }, [currentMap]);
  
  // 캐릭터 이동 함수 - 직선 이동
  const moveCharacterTo = useCallback((targetPos) => {
    console.log('🎯 클릭 이동: 직선 이동 시작', targetPos);
    console.log('📍 현재 위치:', myPosition);
    
    // 목표 지점 설정
    clickTargetRef.current = targetPos;
    
    // 직선 이동 애니메이션
    const MAX_SPEED = 300; // px/sec
    let lastFrameTime = null;
    
    const animate = (currentTime) => {
      if (!clickTargetRef.current) return;
      
      const deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / 1000 : 0.016;
      lastFrameTime = currentTime;
      
      const currentPos = myPositionRef.current;
      const targetPos = clickTargetRef.current;
      const dx = targetPos.x - currentPos.x;
      const dy = targetPos.y - currentPos.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 5) {
        // 목적지 도착
        console.log('🏁 목적지 도착');
        setMyPosition(targetPos);
        clickTargetRef.current = null;
        return;
      }
      
      // 방향 벡터 정규화
      const dirX = dx / dist;
      const dirY = dy / dist;
      
      // 이동 거리 계산
      const moveDistance = MAX_SPEED * deltaTime;
      
      // 새 위치 계산
      const newX = currentPos.x + dirX * Math.min(moveDistance, dist);
      const newY = currentPos.y + dirY * Math.min(moveDistance, dist);
      const newPos = { x: newX, y: newY };
      
      // 벽 충돌 검사
      const shouldMove = !checkWallCollision(currentPos, newPos);
      
      if (shouldMove) {
        // 방향 계산
        let newDir = myDirectionRef.current;
        if (Math.abs(dx) > Math.abs(dy)) {
          newDir = dx > 0 ? 'right' : 'left';
        } else if (Math.abs(dy) > 0) {
          newDir = dy > 0 ? 'down' : 'up';
        }
        
        setMyPosition(newPos);
        setMyDirection(newDir);
        myDirectionRef.current = newDir;
        
        // 다음 프레임
        requestAnimationFrame(animate);
      } else {
        // 충돌 시 이동 중단
        console.log('⚠️ 벽 충돌로 이동 중단');
        clickTargetRef.current = null;
      }
    };
    
    // 애니메이션 시작
    requestAnimationFrame(animate);
  }, [checkWallCollision, myPosition]);
  
  // 서버로 위치 전송
  useEffect(() => {
    if (!socket || !currentMap || !currentCharacter) return;
    
    const throttledEmit = debounce(() => {
      socket.emit('character-move', {
        characterId: currentCharacter.id,
        position: myPosition,
        direction: myDirection,
        mapId: currentMap.id,
        isMoving: !!clickTargetRef.current
      });
    }, 50);
    
    throttledEmit();
  }, [socket, currentMap, currentCharacter, myPosition, myDirection]);
  
  // 다른 캐릭터 위치 수신
  useEffect(() => {
    if (!socket) return;
    
    const handleCharacterMove = (data) => {
      if (data.characterId !== currentCharacter?.id) {
        setOtherCharacters(prev => ({
          ...prev,
          [data.characterId]: {
            position: data.position,
            direction: data.direction || 'down',
            isMoving: data.isMoving || false,
            character: data.character,
            lastUpdate: Date.now()
          }
        }));
      }
    };
    
    const handleCharacterDisconnect = (data) => {
      setOtherCharacters(prev => {
        const updated = { ...prev };
        delete updated[data.characterId];
        return updated;
      });
    };
    
    socket.on('character-moved', handleCharacterMove);
    socket.on('character-disconnected', handleCharacterDisconnect);
    
    return () => {
      socket.off('character-moved', handleCharacterMove);
      socket.off('character-disconnected', handleCharacterDisconnect);
    };
  }, [socket, currentCharacter]);
  
  return {
    myPosition,
    myDirection,
    otherCharacters,
    currentPath,
    moveCharacterTo,
    setMyPosition,
    setMyDirection
  };
};

// 디바운스 함수
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}