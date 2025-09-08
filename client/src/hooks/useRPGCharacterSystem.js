import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

// RPG 스타일 설정
const MOVE_SPEED = 250; // 픽셀/초 (매우 빠른 이동)
const INTERPOLATION_SPEED = 0.25; // 보간 속도 (0.1 = 부드러움, 1 = 즉시)
const POSITION_SYNC_INTERVAL = 100; // 서버 동기화 간격 (ms)
const CHARACTER_REMOVAL_DELAY = 5000; // 캐릭터 제거 지연 (5초)
const PATHFINDING_GRID_SIZE = 10; // 패스파인딩 그리드 크기

// 캐릭터 상태 클래스
class CharacterState {
  constructor(data) {
    this.id = data.userId || data.id;
    this.username = data.username;
    this.position = { ...data.position };
    this.targetPosition = { ...data.position };
    this.displayPosition = { ...data.position };
    this.direction = data.direction || 'down';
    this.characterInfo = data.characterInfo;
    this.lastUpdate = Date.now();
    this.isMoving = false;
    this.path = [];
    this.currentPathIndex = 0;
    this.speed = MOVE_SPEED;
    this.isDead = false;
    this.opacity = 1;
  }

  update(deltaTime) {
    if (this.isDead) {
      // 페이드 아웃 애니메이션
      this.opacity = Math.max(0, this.opacity - deltaTime * 2);
      return;
    }

    // 부드러운 위치 보간
    const dx = this.targetPosition.x - this.displayPosition.x;
    const dy = this.targetPosition.y - this.displayPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.5) {
      const moveDistance = Math.min(distance, this.speed * deltaTime);
      const ratio = moveDistance / distance;
      
      this.displayPosition.x += dx * ratio;
      this.displayPosition.y += dy * ratio;
      
      // 방향 업데이트
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? 'right' : 'left';
      } else if (Math.abs(dy) > 0.1) {
        this.direction = dy > 0 ? 'down' : 'up';
      }
      
      this.isMoving = true;
    } else {
      this.isMoving = false;
      this.displayPosition = { ...this.targetPosition };
    }
  }

  setTargetPosition(position) {
    this.targetPosition = { ...position };
    this.position = { ...position };
    this.lastUpdate = Date.now();
  }

  startDeath() {
    this.isDead = true;
  }
}

// 메인 훅
export const useRPGCharacterSystem = (socket, currentMap, sceneSize) => {
  const { user } = useAuth();
  const [characters, setCharacters] = useState(new Map());
  const [myPosition, setMyPosition] = useState(() => {
    // 시작 위치 계산
    if (currentMap?.spawnPoints?.length > 0) {
      const defaultSpawn = currentMap.spawnPoints.find(sp => sp.isDefault);
      return defaultSpawn || currentMap.spawnPoints[0];
    }
    return { x: 200, y: 200 };
  });
  const [myDirection, setMyDirection] = useState('down');
  const [currentPath, setCurrentPath] = useState([]);
  
  const characterStates = useRef(new Map());
  const animationFrameRef = useRef(null);
  const lastFrameTime = useRef(Date.now());
  const pendingRemovals = useRef(new Map());
  const moveSpeed = useRef(MOVE_SPEED);
  const isMoving = useRef(false);
  const clickTarget = useRef(null);
  const pathIndex = useRef(0);

  // 벽 충돌 검사
  const checkWallCollision = useCallback((from, to) => {
    if (!currentMap?.walls) return false;
    
    // 간단한 선분 교차 검사
    for (const wall of currentMap.walls) {
      const x1 = wall.start?.x ?? wall.x1;
      const y1 = wall.start?.y ?? wall.y1;
      const x2 = wall.end?.x ?? wall.x2;
      const y2 = wall.end?.y ?? wall.y2;
      
      // 선분과의 거리 계산
      const A = to.x - from.x;
      const B = to.y - from.y;
      const C = x2 - x1;
      const D = y2 - y1;
      
      const denominator = A * D - B * C;
      if (Math.abs(denominator) < 0.0001) continue;
      
      const t = ((x1 - from.x) * D - (y1 - from.y) * C) / denominator;
      const u = ((x1 - from.x) * B - (y1 - from.y) * A) / denominator;
      
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return true;
      }
    }
    
    return false;
  }, [currentMap]);

  // A* 패스파인딩 알고리즘
  const findPath = useCallback((start, end) => {
    if (!sceneSize) return [end];
    
    const gridWidth = Math.ceil(sceneSize.width / PATHFINDING_GRID_SIZE);
    const gridHeight = Math.ceil(sceneSize.height / PATHFINDING_GRID_SIZE);
    
    const startGrid = {
      x: Math.floor(start.x / PATHFINDING_GRID_SIZE),
      y: Math.floor(start.y / PATHFINDING_GRID_SIZE)
    };
    
    const endGrid = {
      x: Math.floor(end.x / PATHFINDING_GRID_SIZE),
      y: Math.floor(end.y / PATHFINDING_GRID_SIZE)
    };
    
    // 간단한 직선 경로 (벽 체크 없이)
    const path = [];
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      path.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      });
    }
    
    return path;
  }, [sceneSize]);

  // 캐릭터 이동 처리
  const moveCharacterTo = useCallback((targetPos) => {
    if (!targetPos) return;
    
    const path = findPath(myPosition, targetPos);
    if (path.length > 0) {
      setCurrentPath(path);
      pathIndex.current = 0;
      clickTarget.current = targetPos;
      isMoving.current = true;
    }
  }, [myPosition, findPath]);

  // 게임 루프 (60 FPS)
  useEffect(() => {
    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastFrameTime.current) / 1000, 0.1); // 최대 0.1초
      lastFrameTime.current = now;

      // 내 캐릭터 이동 처리
      if (isMoving.current && currentPath.length > 0) {
        const target = currentPath[pathIndex.current];
        if (target) {
          const dx = target.x - myPosition.x;
          const dy = target.y - myPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 5) {
            // 다음 웨이포인트로
            pathIndex.current++;
            if (pathIndex.current >= currentPath.length) {
              isMoving.current = false;
              setCurrentPath([]);
              clickTarget.current = null;
            }
          } else {
            // 이동
            const moveDistance = moveSpeed.current * deltaTime;
            const ratio = Math.min(1, moveDistance / distance);
            const newPos = {
              x: myPosition.x + dx * ratio,
              y: myPosition.y + dy * ratio
            };
            
            // 방향 업데이트
            let newDir = myDirection;
            if (Math.abs(dx) > Math.abs(dy)) {
              newDir = dx > 0 ? 'right' : 'left';
            } else if (Math.abs(dy) > 1) {
              newDir = dy > 0 ? 'down' : 'up';
            }
            
            setMyPosition(newPos);
            setMyDirection(newDir);
          }
        }
      }

      // 다른 캐릭터들 업데이트
      characterStates.current.forEach((state, id) => {
        state.update(deltaTime);
        
        // 죽은 캐릭터 제거
        if (state.isDead && state.opacity <= 0) {
          characterStates.current.delete(id);
        }
      });

      // 제거 예정 캐릭터 처리
      const now = Date.now();
      pendingRemovals.current.forEach((removeTime, userId) => {
        if (now >= removeTime) {
          const state = characterStates.current.get(userId);
          if (state) {
            state.startDeath();
          }
          pendingRemovals.current.delete(userId);
        }
      });

      // 화면에 캐릭터 상태 반영
      const displayCharacters = new Map();
      characterStates.current.forEach((state, id) => {
        if (state.opacity > 0) {
          displayCharacters.set(id, {
            id: state.id,
            username: state.username,
            position: state.displayPosition,
            direction: state.direction,
            characterInfo: state.characterInfo,
            isMoving: state.isMoving,
            opacity: state.opacity
          });
        }
      });
      setCharacters(displayCharacters);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [myPosition, myDirection, currentPath]);

  // 서버 위치 동기화
  useEffect(() => {
    if (!socket || !currentMap) return;

    const syncInterval = setInterval(() => {
      if (socket && user) {
        socket.emit('update-position', {
          mapId: currentMap.id,
          position: myPosition,
          direction: myDirection,
          username: user.username
        });
      }
    }, POSITION_SYNC_INTERVAL);

    return () => clearInterval(syncInterval);
  }, [socket, currentMap, myPosition, myDirection, user]);

  // 다른 사용자 위치 수신
  useEffect(() => {
    if (!socket) return;

    const handleUserPosition = (data) => {
      if (data.userId === user?.id) return;

      const userId = data.userId || data.socketId;
      
      // 캐릭터 상태 업데이트 또는 생성
      if (!characterStates.current.has(userId)) {
        characterStates.current.set(userId, new CharacterState(data));
      } else {
        const state = characterStates.current.get(userId);
        state.setTargetPosition(data.position);
        state.direction = data.direction;
        state.characterInfo = data.characterInfo;
      }

      // 제거 예정에서 제외
      if (pendingRemovals.current.has(userId)) {
        pendingRemovals.current.delete(userId);
      }
    };

    const handleAllUsers = (data) => {
      const { users } = data;
      if (!users) return;

      const activeUsers = new Set();

      users.forEach(userData => {
        if (userData.userId === user?.id) return;

        const userId = userData.userId || userData.socketId;
        activeUsers.add(userId);

        if (!characterStates.current.has(userId)) {
          characterStates.current.set(userId, new CharacterState(userData));
        } else {
          const state = characterStates.current.get(userId);
          state.setTargetPosition(userData.position);
          state.direction = userData.direction;
          state.characterInfo = userData.characterInfo;
        }
      });

      // 없어진 사용자 제거 예약
      characterStates.current.forEach((state, userId) => {
        if (!activeUsers.has(userId) && !pendingRemovals.current.has(userId)) {
          pendingRemovals.current.set(userId, Date.now() + CHARACTER_REMOVAL_DELAY);
        }
      });
    };

    const handleUserLeft = (data) => {
      const userId = data.userId || data.socketId;
      
      // 즉시 제거하지 않고 지연
      if (!pendingRemovals.current.has(userId)) {
        pendingRemovals.current.set(userId, Date.now() + 1000); // 1초 후 제거
      }
    };

    socket.on('user-position', handleUserPosition);
    socket.on('all-users-update', handleAllUsers);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('user-position', handleUserPosition);
      socket.off('all-users-update', handleAllUsers);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, user]);

  // 맵 변경 시 초기화
  useEffect(() => {
    characterStates.current.clear();
    pendingRemovals.current.clear();
    setCharacters(new Map());
    
    // 시작 위치 설정
    if (currentMap?.spawnPoints?.length > 0) {
      const defaultSpawn = currentMap.spawnPoints.find(sp => sp.isDefault);
      const spawn = defaultSpawn || currentMap.spawnPoints[0];
      setMyPosition(spawn);
    }
  }, [currentMap?.id]);

  return {
    characters,
    myPosition,
    myDirection,
    moveCharacterTo,
    isMoving: isMoving.current,
    currentPath
  };
};