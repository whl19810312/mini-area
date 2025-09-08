import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MOVE_SPEED = 10; // px per step (keyboard)
const MAX_SPEED = 300; // 최대 속도 (픽셀/초) - 매우 빠르게 설정
const CHARACTER_RADIUS = 8; // 캐릭터 충돌 반경
const POSITION_UPDATE_THROTTLE = 50; // ms - 위치 업데이트 스로틀링

export const useCharacterMovement = (mapContainerRef, imageSize, currentMap) => {
  const { socket, user } = useAuth();
  
  // 맵의 시작점 사용 (기본값: 200, 200)
  const getInitialPosition = () => {
    let startPoint = null;
    
    // 에디터에서 저장된 spawnPoints 사용
    if (Array.isArray(currentMap?.spawnPoints) && currentMap.spawnPoints.length > 0) {
      const defaultSpawn = currentMap.spawnPoints.find(sp => sp.isDefault);
      startPoint = defaultSpawn || currentMap.spawnPoints[0];
    } else if (currentMap?.startPoint) {
      startPoint = currentMap.startPoint;
    } else if (currentMap?.coordinates) {
      startPoint = currentMap.coordinates;
    } else {
      return { x: 200, y: 200 };
    }
    
    return {
      x: startPoint?.x || 200,
      y: startPoint?.y || 200
    };
  };
  
  const [userPosition, setUserPositionRaw] = useState(getInitialPosition());
  const setUserPosition = useCallback((newPos) => {
    setUserPositionRaw(newPos);
  }, []);
  
  const [currentDirection, setCurrentDirection] = useState('down');
  const [otherUsers, setOtherUsers] = useState(new Map());
  const clickTargetRef = useRef(null);
  const animationRef = useRef(null);
  const lastFrameTimeRef = useRef(null);
  const userPositionRef = useRef(userPosition);
  const [clickTarget, setClickTarget] = useState(null);
  const lastPositionUpdateRef = useRef(0);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    userPositionRef.current = userPosition;
  }, [userPosition]);

  // 0.2초마다 위치 업데이트 전송
  useEffect(() => {
    if (!socket || !user?.id || !currentMap) return;

    const intervalId = setInterval(() => {
      const position = userPositionRef.current;
      const direction = currentDirection;
      
      // 서버에 위치 업데이트 전송 (맵 정보 포함)
      socket.emit('update-my-position', {
        position: position,
        direction: direction,
        mapId: currentMap.id,
        mapName: currentMap.name || `방 ${currentMap.id}`
      });
    }, 200); // 0.2초마다

    return () => clearInterval(intervalId);
  }, [socket, user, currentMap, currentDirection]);

  // 실시간 위치 업데이트를 서버로 보내는 함수
  const sendPositionUpdate = useCallback((position, direction) => {
    if (socket && currentMap && user) {
      const now = Date.now();
      if (now - lastPositionUpdateRef.current > POSITION_UPDATE_THROTTLE) {
        socket.emit('update-position', {
          mapId: currentMap.id,
          position: { x: position.x, y: position.y },
          direction: direction,
          username: user.username
        });
        lastPositionUpdateRef.current = now;
      }
    }
  }, [socket, currentMap, user]);

  // 벽과의 충돌 체크
  const checkCollision = useCallback((position) => {
    if (!currentMap || !Array.isArray(currentMap.walls) || currentMap.walls.length === 0) {
      return false;
    }

    for (const wall of currentMap.walls) {
      const rect = {
        x: wall.x || 0,
        y: wall.y || 0,
        width: wall.width || 100,
        height: wall.height || 100
      };

      // 캐릭터의 원과 사각형의 충돌 체크
      const closestX = Math.max(rect.x, Math.min(position.x, rect.x + rect.width));
      const closestY = Math.max(rect.y, Math.min(position.y, rect.y + rect.height));
      
      const distanceX = position.x - closestX;
      const distanceY = position.y - closestY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      if (distance < CHARACTER_RADIUS) {
        return true;
      }
    }
    
    return false;
  }, [currentMap]);

  // 맵 경계 체크
  const clampPosition = useCallback((position) => {
    const mapWidth = imageSize?.width || 1000;
    const mapHeight = imageSize?.height || 1000;
    
    return {
      x: Math.max(CHARACTER_RADIUS, Math.min(position.x, mapWidth - CHARACTER_RADIUS)),
      y: Math.max(CHARACTER_RADIUS, Math.min(position.y, mapHeight - CHARACTER_RADIUS))
    };
  }, [imageSize]);

  // 방향 계산
  const calculateDirection = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const degrees = (angle * 180) / Math.PI;
    
    if (degrees > -45 && degrees <= 45) return 'right';
    if (degrees > 45 && degrees <= 135) return 'down';
    if (degrees > 135 || degrees <= -135) return 'left';
    return 'up';
  };

  // 직선 이동 애니메이션
  const moveDirectToTarget = useCallback(() => {
    if (!clickTargetRef.current) {
      setIsMoving(false);
      return;
    }

    const animate = (currentTime) => {
      if (!clickTargetRef.current) {
        setIsMoving(false);
        return;
      }

      const deltaTime = lastFrameTimeRef.current ? (currentTime - lastFrameTimeRef.current) / 1000 : 0.016;
      lastFrameTimeRef.current = currentTime;

      const currentPos = userPositionRef.current;
      const target = clickTargetRef.current;
      
      const dx = target.x - currentPos.x;
      const dy = target.y - currentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 목표 지점에 도달했는지 확인 (5픽셀 이내)
      if (distance < 5) {
        const finalPos = clampPosition(target);
        if (!checkCollision(finalPos)) {
          setUserPosition(finalPos);
          sendPositionUpdate(finalPos, currentDirection);
        }
        clickTargetRef.current = null;
        setClickTarget(null);
        setIsMoving(false);
        return;
      }
      
      // 방향 벡터 정규화
      const dirX = dx / distance;
      const dirY = dy / distance;
      
      // 최고 속도로 이동
      const moveDistance = MAX_SPEED * deltaTime;
      
      // 새 위치 계산
      const newX = currentPos.x + dirX * Math.min(moveDistance, distance);
      const newY = currentPos.y + dirY * Math.min(moveDistance, distance);
      const newPos = clampPosition({ x: newX, y: newY });
      
      // 충돌 체크
      if (!checkCollision(newPos)) {
        // 방향 업데이트
        const newDirection = calculateDirection(currentPos, newPos);
        if (newDirection !== currentDirection) {
          setCurrentDirection(newDirection);
        }
        
        setUserPosition(newPos);
        sendPositionUpdate(newPos, newDirection);
        
        // 다음 프레임 예약
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // 충돌 시 이동 중지
        clickTargetRef.current = null;
        setClickTarget(null);
        setIsMoving(false);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [checkCollision, clampPosition, sendPositionUpdate, setUserPosition, currentDirection]);

  // 지도 클릭 핸들러
  const handleMapClick = useCallback((event) => {
    if (!mapContainerRef.current) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 기존 애니메이션 중지
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // 새 목표 설정
    clickTargetRef.current = { x, y };
    setClickTarget({ x, y });
    setIsMoving(true);
    lastFrameTimeRef.current = null;
    
    // 직선 이동 시작
    moveDirectToTarget();
  }, [mapContainerRef, moveDirectToTarget]);

  // 키보드 이동
  const handleKeyDown = useCallback((e) => {
    const now = Date.now();
    const timeSinceLastPress = now - lastKeyPressRef.current;
    
    if (timeSinceLastPress < 30) return;
    lastKeyPressRef.current = now;

    // 클릭 이동 중이면 키보드 입력 시 중지
    if (clickTargetRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clickTargetRef.current = null;
      setClickTarget(null);
      setIsMoving(false);
    }

    let newPos = { ...userPositionRef.current };
    let newDirection = currentDirection;
    let moved = false;

    switch(e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        newPos.y -= MOVE_SPEED;
        newDirection = 'up';
        moved = true;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        newPos.y += MOVE_SPEED;
        newDirection = 'down';
        moved = true;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        newPos.x -= MOVE_SPEED;
        newDirection = 'left';
        moved = true;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        newPos.x += MOVE_SPEED;
        newDirection = 'right';
        moved = true;
        break;
    }

    if (moved) {
      const clampedPos = clampPosition(newPos);
      
      if (!checkCollision(clampedPos)) {
        setUserPosition(clampedPos);
        setCurrentDirection(newDirection);
        sendPositionUpdate(clampedPos, newDirection);
      }
    }
  }, [currentDirection, checkCollision, clampPosition, sendPositionUpdate, setUserPosition]);

  // 키보드 이벤트 리스너
  useEffect(() => {
    const handleKeyDownWrapper = (e) => {
      // 입력 필드에 포커스가 있으면 이동하지 않음
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      handleKeyDown(e);
    };

    window.addEventListener('keydown', handleKeyDownWrapper);
    return () => window.removeEventListener('keydown', handleKeyDownWrapper);
  }, [handleKeyDown]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 소켓 이벤트 리스너
  useEffect(() => {
    if (!socket) return;

    const handleUsersPositions = (positions) => {
      if (Array.isArray(positions)) {
        const newUsers = new Map();
        positions.forEach(pos => {
          if (pos.userId !== user?.id) {
            newUsers.set(pos.userId, {
              ...pos,
              position: pos.position || { x: 200, y: 200 },
              direction: pos.direction || 'down'
            });
          }
        });
        setOtherUsers(newUsers);
      }
    };

    const handleUserPositionUpdate = (data) => {
      if (data.userId !== user?.id) {
        setOtherUsers(prev => {
          const updated = new Map(prev);
          updated.set(data.userId, {
            ...data,
            position: data.position || { x: 200, y: 200 },
            direction: data.direction || 'down'
          });
          return updated;
        });
      }
    };

    const handleUserDisconnected = (data) => {
      setOtherUsers(prev => {
        const updated = new Map(prev);
        updated.delete(data.userId);
        return updated;
      });
    };

    socket.on('users-positions', handleUsersPositions);
    socket.on('user-position-update', handleUserPositionUpdate);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('user-left-map', handleUserDisconnected);

    return () => {
      socket.off('users-positions', handleUsersPositions);
      socket.off('user-position-update', handleUserPositionUpdate);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('user-left-map', handleUserDisconnected);
    };
  }, [socket, user?.id]);

  return {
    userPosition,
    setUserPosition,
    currentDirection,
    otherUsers,
    handleMapClick,
    clickTarget,
    isMoving
  };
};