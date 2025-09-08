import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * RPG 스타일 캐릭터 매니저
 * - 캐릭터는 한 번 생성되면 명시적 제거 전까지 유지
 * - 위치 업데이트는 부드럽게 보간
 * - React 리렌더링 최소화
 */
export const useCharacterManager = (socket, currentUser, sceneSize, currentMap) => {
  // 캐릭터 풀 - 한 번 생성되면 계속 유지
  const characterPool = useRef(new Map());
  
  // 캐릭터 상태 (렌더링용)
  const [characters, setCharacters] = useState(new Map());
  
  // 애니메이션 프레임
  const animationFrameRef = useRef();
  const isAnimatingRef = useRef(false);
  
  // 시작점 계산
  const getSpawnPoint = () => {
    // 1. 맵에 spawnPoints가 있으면 사용
    if (currentMap?.spawnPoints && Array.isArray(currentMap.spawnPoints) && currentMap.spawnPoints.length > 0) {
      const defaultSpawn = currentMap.spawnPoints.find(sp => sp.isDefault);
      const spawn = defaultSpawn || currentMap.spawnPoints[0];
      console.log(`[CharacterManager] 시작점 사용: ${spawn.x}, ${spawn.y}`);
      return { x: spawn.x, y: spawn.y };
    }
    
    // 2. 맵 중앙 사용
    if (sceneSize?.width && sceneSize?.height) {
      const center = { x: sceneSize.width / 2, y: sceneSize.height / 2 };
      console.log(`[CharacterManager] 맵 중앙 사용: ${center.x}, ${center.y}`);
      return center;
    }
    
    // 3. 기본값
    console.log(`[CharacterManager] 기본 시작점 사용: 500, 500`);
    return { x: 500, y: 500 };
  };
  
  // 사용자 캐릭터 상태
  const [userPosition, setUserPosition] = useState(() => getSpawnPoint());
  const [userDirection, setUserDirection] = useState('down');
  const userVelocity = useRef({ x: 0, y: 0 });
  const hasInitialized = useRef(false);
  
  // 맵 변경시 시작점으로 이동
  useEffect(() => {
    if (currentMap) {
      const spawnPoint = getSpawnPoint();
      setUserPosition(spawnPoint);
      console.log(`[CharacterManager] 맵 변경 - 시작점으로 이동: ${spawnPoint.x}, ${spawnPoint.y}`);
    }
  }, [currentMap?.id]); // currentMap.id가 변경될 때만 실행
  
  // 캐릭터 생성/업데이트
  const updateCharacter = useCallback((userId, data) => {
    if (!userId) return;
    
    // 현재 사용자인지 체크 (userId와 socketId 모두 확인)
    if (userId === currentUser?.id || userId === socket?.id) {
      console.log(`[CharacterManager] 현재 사용자 스킵: userId=${userId}, currentUser.id=${currentUser?.id}, socket.id=${socket?.id}`);
      return;
    }
    
    let character = characterPool.current.get(userId);
    
    if (!character) {
      // 새 캐릭터 생성
      character = {
        userId: data.userId || userId,
        username: data.username || 'Unknown',
        socketId: data.socketId,
        position: data.position || { x: 400, y: 300 },
        targetPosition: data.position || { x: 400, y: 300 },
        direction: data.direction || 'down',
        characterInfo: data.characterInfo,
        lastUpdate: Date.now(),
        velocity: { x: 0, y: 0 },
        isMoving: false
      };
      characterPool.current.set(userId, character);
      console.log(`[CharacterManager] 새 캐릭터 생성: ${character.username}`);
    } else {
      // 기존 캐릭터 업데이트
      if (data.position) {
        character.targetPosition = { ...data.position };
        character.isMoving = true;
      }
      if (data.direction) {
        character.direction = data.direction;
      }
      character.lastUpdate = Date.now();
    }
    
    // 애니메이션 시작
    if (!isAnimatingRef.current) {
      startAnimation();
    }
  }, [currentUser, socket]);
  
  // 캐릭터 제거 (명시적 퇴장만)
  const removeCharacter = useCallback((userId) => {
    if (!userId) return;
    
    if (characterPool.current.has(userId)) {
      console.log(`[CharacterManager] 캐릭터 제거: ${userId}`);
      characterPool.current.delete(userId);
      
      // 상태 업데이트
      setCharacters(prev => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
    }
  }, []);
  
  // 부드러운 애니메이션
  const startAnimation = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    
    const animate = () => {
      let needsUpdate = false;
      const updatedCharacters = new Map();
      
      // 모든 캐릭터 위치 보간
      characterPool.current.forEach((character, userId) => {
        const dx = character.targetPosition.x - character.position.x;
        const dy = character.targetPosition.y - character.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.5) {
          // 부드러운 이동
          const speed = 0.15; // 보간 속도
          character.position.x += dx * speed;
          character.position.y += dy * speed;
          needsUpdate = true;
          
          // 방향 업데이트
          if (Math.abs(dx) > Math.abs(dy)) {
            character.direction = dx > 0 ? 'right' : 'left';
          } else if (distance > 2) {
            character.direction = dy > 0 ? 'down' : 'up';
          }
        } else {
          character.isMoving = false;
        }
        
        updatedCharacters.set(userId, { ...character });
      });
      
      // 상태 업데이트 (필요한 경우만)
      if (needsUpdate) {
        setCharacters(updatedCharacters);
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
      }
    };
    
    animate();
  }, []);
  
  // 소켓 이벤트 처리
  useEffect(() => {
    if (!socket) return;
    
    // 전체 사용자 업데이트
    const handleAllUsers = (data) => {
      if (!data.users || !Array.isArray(data.users)) return;
      
      console.log(`[CharacterManager] 전체 사용자 업데이트 받음: ${data.users.length}명`);
      console.log(`[CharacterManager] 현재 사용자 정보: currentUser.id=${currentUser?.id}, socket.id=${socket?.id}`);
      
      // 받은 사용자들만 업데이트 (제거하지 않음)
      data.users.forEach(userData => {
        // socketId를 기본 식별자로 사용
        const userId = userData.socketId || userData.userId;
        // 현재 사용자 체크 - userId와 socketId 모두 확인
        const isCurrentUser = (userData.userId === currentUser?.id) || 
                            (userData.socketId === socket?.id);
        
        console.log(`[CharacterManager] 사용자 체크: userId=${userData.userId}, socketId=${userData.socketId}, isCurrentUser=${isCurrentUser}`);
        
        if (userId && !isCurrentUser) {
          updateCharacter(userId, userData);
        }
      });
    };
    
    // 개별 사용자 업데이트
    const handleUserUpdate = (data) => {
      const userId = data.socketId || data.userId;
      // 현재 사용자 체크 - userId와 socketId 모두 확인
      const isCurrentUser = (data.userId === currentUser?.id) || 
                          (data.socketId === socket?.id);
      
      if (userId && !isCurrentUser) {
        updateCharacter(userId, data);
      }
    };
    
    // 명시적 퇴장
    const handleUserLeft = (data) => {
      const userId = data.socketId || data.userId;
      if (userId) {
        removeCharacter(userId);
      }
    };
    
    // 이벤트 리스너 등록
    socket.on('all-users-update', handleAllUsers);
    socket.on('user-position-update', handleUserUpdate);
    socket.on('user-joined', handleUserUpdate);
    socket.on('user-left', handleUserLeft);
    socket.on('user-logout', handleUserLeft);
    socket.on('user-disconnected', handleUserLeft);
    
    return () => {
      socket.off('all-users-update', handleAllUsers);
      socket.off('user-position-update', handleUserUpdate);
      socket.off('user-joined', handleUserUpdate);
      socket.off('user-left', handleUserLeft);
      socket.off('user-logout', handleUserLeft);
      socket.off('user-disconnected', handleUserLeft);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [socket, currentUser, updateCharacter, removeCharacter]);
  
  // 사용자 이동 처리
  const moveUser = useCallback((direction) => {
    const speed = 10;
    let newPos = { ...userPosition };
    let newDir = userDirection;
    
    switch(direction) {
      case 'up':
        newPos.y = Math.max(0, newPos.y - speed);
        newDir = 'up';
        break;
      case 'down':
        newPos.y = Math.min(sceneSize?.height || 1000, newPos.y + speed);
        newDir = 'down';
        break;
      case 'left':
        newPos.x = Math.max(0, newPos.x - speed);
        newDir = 'left';
        break;
      case 'right':
        newPos.x = Math.min(sceneSize?.width || 1000, newPos.x + speed);
        newDir = 'right';
        break;
    }
    
    setUserPosition(newPos);
    setUserDirection(newDir);
    
    // 서버에 위치 전송
    if (socket) {
      socket.emit('user-move', {
        position: newPos,
        direction: newDir,
        mapId: currentMap?.id
      });
    }
  }, [userPosition, userDirection, socket, currentMap, sceneSize]);
  
  // 클릭 이동
  const moveToPosition = useCallback((targetPos) => {
    // 클릭 위치로 이동 애니메이션
    const dx = targetPos.x - userPosition.x;
    const dy = targetPos.y - userPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      // 방향 설정
      let newDir = userDirection;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0 ? 'right' : 'left';
      } else {
        newDir = dy > 0 ? 'down' : 'up';
      }
      
      setUserDirection(newDir);
      
      // 목표 위치로 이동
      const steps = Math.ceil(distance / 10);
      let step = 0;
      
      const moveStep = () => {
        if (step < steps) {
          const progress = (step + 1) / steps;
          const newPos = {
            x: userPosition.x + (dx * progress),
            y: userPosition.y + (dy * progress)
          };
          
          setUserPosition(newPos);
          
          if (socket) {
            socket.emit('user-move', {
              position: newPos,
              direction: newDir,
              mapId: currentMap?.id
            });
          }
          
          step++;
          requestAnimationFrame(moveStep);
        }
      };
      
      moveStep();
    }
  }, [userPosition, userDirection, socket, currentMap]);
  
  return {
    characters,
    userPosition,
    userDirection,
    moveUser,
    moveToPosition,
    setUserPosition,
    setUserDirection
  };
};