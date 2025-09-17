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
  const keysPressed = useRef(new Set());
  const keyboardMoveIntervalRef = useRef(null);
  
  // ref 업데이트
  useEffect(() => {
    myPositionRef.current = myPosition;
  }, [myPosition]);
  
  useEffect(() => {
    myDirectionRef.current = myDirection;
  }, [myDirection]);
  
  // 맵 변경 시 위치 초기화 및 서버 입장 알림
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

    // 서버에 맵 입장 알림 (다른 사용자들과 실시간 동기화를 위해 필수)
    if (socket && currentMap && currentCharacter) {
      const joinData = {
        mapId: currentMap.id,
        characterId: currentCharacter.id,
        position: myPositionRef.current,
        characterInfo: currentCharacter
      };
      console.log('🏠 맵 입장 요청:', joinData);
      console.log('📊 전송할 characterInfo 상세:', {
        hasCharacterInfo: !!currentCharacter,
        characterId: currentCharacter?.id,
        characterName: currentCharacter?.name,
        hasImages: !!currentCharacter?.images,
        hasAppearance: !!currentCharacter?.appearance,
        currentCharacterKeys: currentCharacter ? Object.keys(currentCharacter) : [],
        fullCharacterInfo: currentCharacter
      });
      socket.emit('join-map', joinData);
    }
  }, [currentMap?.id, socket, currentCharacter]);
  
  // 벽 충돌 감지 함수 (정밀한 버전)
  const checkWallCollision = useCallback((from, to) => {
    if (!currentMap?.walls || currentMap.walls.length === 0) return false;
    
    // 매우 짧은 이동은 허용
    const moveDistance = Math.hypot(to.x - from.x, to.y - from.y);
    if (moveDistance < 0.5) return false;
    
    // 캐릭터 크기 (반지름) - Character.jsx의 boxGeometry 크기 25x25에 맞춤  
    const characterRadius = 12.5; // 캐릭터 중심에서 가장자리까지의 거리 (25/2)
    
    // 선분과 벽의 교차 검사
    for (const wall of currentMap.walls) {
      const x1 = wall.start?.x ?? wall.x1 ?? 0;
      const y1 = wall.start?.y ?? wall.y1 ?? 0;
      const x2 = wall.end?.x ?? wall.x2 ?? 0;
      const y2 = wall.end?.y ?? wall.y2 ?? 0;
      
      // 벽의 길이
      const wallLength = Math.hypot(x2 - x1, y2 - y1);
      if (wallLength === 0) continue;
      
      // 벽의 방향 벡터 (정규화)
      const wallDx = (x2 - x1) / wallLength;
      const wallDy = (y2 - y1) / wallLength;
      
      // 벽의 법선 벡터
      const normalX = -wallDy;
      const normalY = wallDx;
      
      // 캐릭터 이동 경로와 벽까지의 최단 거리 계산
      const distanceToWall = Math.abs(
        normalX * (from.x - x1) + normalY * (from.y - y1)
      );
      
      // 캐릭터가 벽에 너무 가까이 가려고 하는지 확인
      if (distanceToWall <= characterRadius) {
        // 벽에 대한 투영 계산
        const projectionStart = wallDx * (from.x - x1) + wallDy * (from.y - y1);
        const projectionEnd = wallDx * (to.x - x1) + wallDy * (to.y - y1);
        
        // 투영이 벽 선분 내부에 있는지 확인 (약간의 여유 추가)
        const margin = characterRadius;
        if ((projectionStart >= -margin && projectionStart <= wallLength + margin) ||
            (projectionEnd >= -margin && projectionEnd <= wallLength + margin)) {
          
          // 목표 지점에서 벽까지의 거리도 확인
          const distanceToWallAtTarget = Math.abs(
            normalX * (to.x - x1) + normalY * (to.y - y1)
          );
          
          if (distanceToWallAtTarget < characterRadius) {
            console.log('🚧 정밀 벽 충돌 감지:', {
              from, to, 
              wall: { x1, y1, x2, y2 },
              distance: distanceToWallAtTarget,
              characterRadius
            });
            return true;
          }
        }
      }
    }
    return false;
  }, [currentMap]);

  // 키보드 움직임 함수
  const moveWithKeyboard = useCallback(() => {
    if (keysPressed.current.size === 0) return;

    const currentPos = myPositionRef.current;
    const MOVE_SPEED = 5; // 픽셀 단위 이동 속도
    let newX = currentPos.x;
    let newY = currentPos.y;
    let newDirection = myDirectionRef.current;

    // 키 입력에 따른 이동 계산
    if (keysPressed.current.has('w') || keysPressed.current.has('ArrowUp')) {
      newY -= MOVE_SPEED;
      newDirection = 'up';
    }
    if (keysPressed.current.has('s') || keysPressed.current.has('ArrowDown')) {
      newY += MOVE_SPEED;
      newDirection = 'down';
    }
    if (keysPressed.current.has('a') || keysPressed.current.has('ArrowLeft')) {
      newX -= MOVE_SPEED;
      newDirection = 'left';
    }
    if (keysPressed.current.has('d') || keysPressed.current.has('ArrowRight')) {
      newX += MOVE_SPEED;
      newDirection = 'right';
    }

    const newPos = { x: newX, y: newY };

    // 벽 충돌 검사
    const shouldMove = !checkWallCollision(currentPos, newPos);

    if (shouldMove) {
      setMyPosition(newPos);
      setMyDirection(newDirection);
      myDirectionRef.current = newDirection;
    }
  }, [checkWallCollision]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((event) => {
    const key = event.key.toLowerCase();
    const validKeys = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    
    if (validKeys.includes(key) || validKeys.includes(event.key)) {
      event.preventDefault();
      const keyToAdd = validKeys.includes(key) ? key : event.key;
      keysPressed.current.add(keyToAdd);
      
      // 키 입력이 시작되면 클릭 이동 중단
      clickTargetRef.current = null;
      
      // 움직임 시작
      if (!keyboardMoveIntervalRef.current) {
        keyboardMoveIntervalRef.current = setInterval(moveWithKeyboard, 16); // 60fps
      }
    }
  }, [moveWithKeyboard]);

  const handleKeyUp = useCallback((event) => {
    const key = event.key.toLowerCase();
    const validKeys = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    
    if (validKeys.includes(key) || validKeys.includes(event.key)) {
      const keyToRemove = validKeys.includes(key) ? key : event.key;
      keysPressed.current.delete(keyToRemove);
      
      // 모든 키가 떼어지면 움직임 중단
      if (keysPressed.current.size === 0 && keyboardMoveIntervalRef.current) {
        clearInterval(keyboardMoveIntervalRef.current);
        keyboardMoveIntervalRef.current = null;
      }
    }
  }, []);

  // 키보드 이벤트 리스너 등록
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (keyboardMoveIntervalRef.current) {
        clearInterval(keyboardMoveIntervalRef.current);
      }
    };
  }, [handleKeyDown, handleKeyUp]);
  
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
  
  // 다른 캐릭터 위치 수신 및 전체 사용자 업데이트 처리
  useEffect(() => {
    if (!socket) return;
    
    const handleCharacterMove = (data) => {
      if (data.characterId !== currentCharacter?.id) {
        console.log('👥 다른 캐릭터 위치 업데이트:', data);
        setOtherCharacters(prev => ({
          ...prev,
          [data.characterId]: {
            id: data.characterId,
            username: data.username,
            position: data.position,
            direction: data.direction || 'down',
            isMoving: data.isMoving || false,
            characterInfo: data.characterInfo || data.character,
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

    // 전체 사용자 업데이트 처리 (입실 후 그려지지 않은 사용자 감지)
    const handleAllUsersUpdate = (data) => {
      console.log('🏠 전체 사용자 업데이트 수신:', data);
      
      if (data.users && Array.isArray(data.users)) {
        const newOtherCharacters = {};
        
        data.users.forEach(user => {
          // 현재 사용자가 아닌 경우만 추가
          if (user.userId !== currentCharacter?.id && user.username !== currentCharacter?.name) {
            newOtherCharacters[user.userId] = {
              id: user.userId,
              username: user.username,
              position: user.position || { x: 200, y: 200 },
              direction: user.direction || 'down',
              isMoving: false,
              characterInfo: user.characterInfo,
              areaType: user.areaType || 'public',
              currentArea: user.currentArea,
              areaDescription: user.areaDescription || '공개 영역',
              lastUpdate: Date.now()
            };
          }
        });
        
        console.log('🎨 렌더링할 다른 캐릭터들:', Object.keys(newOtherCharacters));
        setOtherCharacters(newOtherCharacters);
      }
    };
    
    socket.on('character-moved', handleCharacterMove);
    socket.on('character-disconnected', handleCharacterDisconnect);
    socket.on('all-users-update', handleAllUsersUpdate);
    
    return () => {
      socket.off('character-moved', handleCharacterMove);
      socket.off('character-disconnected', handleCharacterDisconnect);
      socket.off('all-users-update', handleAllUsersUpdate);
    };
  }, [socket, currentCharacter]);

  // 컴포넌트 언마운트 시 맵에서 나가기
  useEffect(() => {
    return () => {
      if (socket && currentMap) {
        console.log('🚪 맵 퇴장:', currentMap.id);
        socket.emit('leave-map');
      }
    };
  }, [socket, currentMap]);
  
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