import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// 실시간 동기화 설정
const POSITION_UPDATE_RATE = 50; // ms (20 FPS로 위치 전송)
const INTERPOLATION_RATE = 16; // ms (60 FPS로 보간)
const INTERPOLATION_FACTOR = 0.2; // 보간 속도 (0.1 = 부드러움, 1 = 즉시)
const CHARACTER_TIMEOUT = 3000; // 3초간 업데이트 없으면 제거

// 캐릭터 데이터 클래스
class CharacterData {
  constructor(data) {
    this.id = data.userId || data.socketId;
    this.username = data.username;
    this.socketId = data.socketId;
    
    // 위치 관련
    this.serverPosition = { ...data.position };
    this.displayPosition = { ...data.position };
    this.targetPosition = { ...data.position };
    this.previousPosition = { ...data.position };
    
    // 방향 및 상태
    this.direction = data.direction || 'down';
    this.isMoving = false;
    
    // 캐릭터 정보
    this.characterInfo = data.characterInfo;
    
    // 타임스탬프
    this.lastUpdate = Date.now();
    this.lastServerUpdate = Date.now();
  }
  
  updateFromServer(data) {
    this.previousPosition = { ...this.serverPosition };
    this.serverPosition = { ...data.position };
    this.targetPosition = { ...data.position };
    this.direction = data.direction || this.direction;
    this.characterInfo = data.characterInfo || this.characterInfo;
    this.lastServerUpdate = Date.now();
    this.lastUpdate = Date.now();
    
    // 움직임 감지
    const dx = this.serverPosition.x - this.previousPosition.x;
    const dy = this.serverPosition.y - this.previousPosition.y;
    this.isMoving = Math.abs(dx) > 1 || Math.abs(dy) > 1;
  }
  
  interpolate(deltaTime) {
    // 부드러운 선형 보간
    const factor = Math.min(1, INTERPOLATION_FACTOR * (deltaTime / 16));
    
    this.displayPosition.x += (this.targetPosition.x - this.displayPosition.x) * factor;
    this.displayPosition.y += (this.targetPosition.y - this.displayPosition.y) * factor;
    
    // 거의 도착했으면 정확한 위치로
    const distance = Math.hypot(
      this.targetPosition.x - this.displayPosition.x,
      this.targetPosition.y - this.displayPosition.y
    );
    
    if (distance < 1) {
      this.displayPosition = { ...this.targetPosition };
      this.isMoving = false;
    }
  }
  
  isStale() {
    return Date.now() - this.lastUpdate > CHARACTER_TIMEOUT;
  }
}

export const useRealtimeCharacterSync = (socket, currentMap) => {
  const { user } = useAuth();
  const [myPosition, setMyPosition] = useState({ x: 200, y: 200 });
  const [myDirection, setMyDirection] = useState('down');
  const [otherCharacters, setOtherCharacters] = useState(new Map());
  const [currentPath, setCurrentPath] = useState([]); // 현재 경로 상태 추가
  
  const charactersRef = useRef(new Map());
  const lastPositionUpdate = useRef(0);
  const animationFrame = useRef(null);
  const lastFrameTime = useRef(Date.now());
  const myPositionRef = useRef(myPosition);
  const myDirectionRef = useRef(myDirection);
  const currentPathRef = useRef([]);
  const clickTargetRef = useRef(null); // 클릭 목표 지점
  // const pathFinderRef = useRef(null); // PathFinder 제거
  // const pathIndexRef = useRef(0); // PathFinder 제거
  // const isFollowingPathRef = useRef(false); // PathFinder 제거
  
  // 내 위치 업데이트 시 ref도 업데이트
  useEffect(() => {
    myPositionRef.current = myPosition;
  }, [myPosition]);
  
  useEffect(() => {
    myDirectionRef.current = myDirection;
  }, [myDirection]);
  
  // 시작 위치 설정
  useEffect(() => {
    if (currentMap?.spawnPoints?.length > 0) {
      const defaultSpawn = currentMap.spawnPoints.find(sp => sp.isDefault);
      const spawn = defaultSpawn || currentMap.spawnPoints[0];
      setMyPosition({ x: spawn.x || 200, y: spawn.y || 200 });
    } else if (currentMap?.startPoint) {
      setMyPosition({
        x: currentMap.startPoint.x || 200,
        y: currentMap.startPoint.y || 200
      });
    }
  }, [currentMap?.id]);
  
  // 벽 충돌 감지 함수
  const checkWallCollision = useCallback((from, to) => {
    if (!currentMap?.walls || currentMap.walls.length === 0) return false;
    
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
        return true; // 충돌 감지
      }
    }
    return false;
  }, [currentMap]);
  
  // A* 패스파인딩 알고리즘
  const findPath = useCallback((start, end) => {
    if (!currentMap) return [end];
    
    const walls = currentMap.walls || [];
    const gridSize = 10; // 그리드 크기
    const maxDistance = Math.hypot(end.x - start.x, end.y - start.y);
    const maxSteps = Math.ceil(maxDistance / gridSize) * 2;
    
    // 간단한 경로: 벽을 우회하는 중간 지점들 생성
    const path = [];
    let currentPos = { ...start };
    let attempts = 0;
    
    while (attempts < maxSteps) {
      attempts++;
      
      // 목표까지 직선 이동 시도
      const directPath = {
        x: currentPos.x + (end.x - currentPos.x) * 0.1,
        y: currentPos.y + (end.y - currentPos.y) * 0.1
      };
      
      // 충돌 검사
      if (!checkWallCollision(currentPos, directPath)) {
        path.push(directPath);
        currentPos = directPath;
        
        // 목적지 근처 도달
        if (Math.hypot(end.x - currentPos.x, end.y - currentPos.y) < gridSize) {
          path.push(end);
          break;
        }
      } else {
        // 충돌 시 우회 경로 찾기
        const angles = [Math.PI/4, -Math.PI/4, Math.PI/2, -Math.PI/2, Math.PI*3/4, -Math.PI*3/4];
        let foundAlternative = false;
        
        for (const angle of angles) {
          const dx = Math.cos(angle) * gridSize * 2;
          const dy = Math.sin(angle) * gridSize * 2;
          const altPath = {
            x: currentPos.x + dx,
            y: currentPos.y + dy
          };
          
          if (!checkWallCollision(currentPos, altPath)) {
            path.push(altPath);
            currentPos = altPath;
            foundAlternative = true;
            break;
          }
        }
        
        if (!foundAlternative) {
          // 우회 경로를 찾지 못한 경우 직접 이동
          path.push(end);
          break;
        }
      }
    }
    
    return path.length > 0 ? path : [end];
  }, [currentMap, checkWallCollision]);
  
  // 캐릭터 이동 함수 - 직선 이동
  const moveCharacterTo = useCallback((targetPos) => {
    console.log('🎯 클릭 이동: 직선 이동 시작', targetPos);
    console.log('📍 현재 위치:', myPosition);
    
    // 목표 지점 설정
    clickTargetRef.current = targetPos;
    
    // 이동 애니메이션
    const MAX_SPEED = 300; // px/sec - 최고 속도
    let lastFrameTime = null;
    
    const animate = (currentTime) => {
      if (!clickTargetRef.current) return;
      
      const deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / 1000 : 0.016;
      lastFrameTime = currentTime;
      
      const currentPos = myPositionRef.current;
      const target = clickTargetRef.current;
      const dx = target.x - currentPos.x;
      const dy = target.y - currentPos.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 5) {
        // 목적지 도착
        console.log('🏁 목적지 도착');
        setMyPosition(target);
        setCurrentPath([]); // 경로 표시 초기화
        clickTargetRef.current = null;
        return;
      }
      
      // 방향 벡터 정규화
      const dirX = dx / dist;
      const dirY = dy / dist;
      
      // 최고 속도로 이동
      const moveDistance = MAX_SPEED * deltaTime;
      
      // 새 위치 계산
      const newX = currentPos.x + dirX * Math.min(moveDistance, dist);
      const newY = currentPos.y + dirY * Math.min(moveDistance, dist);
      const newPos = { x: newX, y: newY };
      
      // 벽 충돌 확인
      if (!checkWallCollision(currentPos, newPos)) {
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
        
        // 직선 경로 표시 (시작점과 끝점만)
        setCurrentPath([myPosition, target]);
        
        // 다음 프레임
        requestAnimationFrame(animate);
      } else {
        // 충돌 시 이동 중지
        console.log('⛔ 벽과 충돌 - 이동 중지');
        clickTargetRef.current = null;
        setCurrentPath([]);
      }
    };
    
    requestAnimationFrame(animate);
  }, [checkWallCollision, myPosition]);
  
  // 서버로 위치 전송
  useEffect(() => {
    if (!socket || !currentMap || !user) return;
    
    const sendPosition = () => {
      const now = Date.now();
      if (now - lastPositionUpdate.current >= POSITION_UPDATE_RATE) {
        socket.emit('update-position', {
          mapId: currentMap.id,
          position: myPositionRef.current,
          direction: myDirectionRef.current,
          username: user.username,
          timestamp: now
        });
        lastPositionUpdate.current = now;
      }
    };
    
    const interval = setInterval(sendPosition, POSITION_UPDATE_RATE);
    
    // 즉시 한 번 전송
    sendPosition();
    
    return () => clearInterval(interval);
  }, [socket, currentMap, user]);
  
  // 서버로부터 위치 수신
  useEffect(() => {
    if (!socket || !user) return;
    
    // 개별 사용자 위치 업데이트
    const handleUserPosition = (data) => {
      if (data.userId === user.id || data.username === user.username) return;
      
      const characterId = data.userId || data.socketId;
      
      if (!charactersRef.current.has(characterId)) {
        charactersRef.current.set(characterId, new CharacterData(data));
      } else {
        charactersRef.current.get(characterId).updateFromServer(data);
      }
    };
    
    // 전체 사용자 업데이트
    const handleAllUsers = (data) => {
      const { users, mapId } = data;
      if (!users || mapId !== currentMap?.id) return;
      
      const updatedIds = new Set();
      
      users.forEach(userData => {
        if (userData.userId === user.id || userData.username === user.username) return;
        
        const characterId = userData.userId || userData.socketId;
        updatedIds.add(characterId);
        
        if (!charactersRef.current.has(characterId)) {
          charactersRef.current.set(characterId, new CharacterData(userData));
        } else {
          charactersRef.current.get(characterId).updateFromServer(userData);
        }
      });
      
      // 업데이트 안 된 캐릭터는 stale로 표시
      charactersRef.current.forEach((character, id) => {
        if (!updatedIds.has(id)) {
          character.lastUpdate = Date.now() - CHARACTER_TIMEOUT + 1000; // 1초 후 제거
        }
      });
    };
    
    // 사용자 퇴장
    const handleUserLeft = (data) => {
      const characterId = data.userId || data.socketId;
      
      // 즉시 제거하지 않고 페이드 아웃
      const character = charactersRef.current.get(characterId);
      if (character) {
        character.lastUpdate = 0; // 즉시 stale로 표시
      }
    };
    
    // 참가자 업데이트
    const handleUpdateParticipants = (data) => {
      if (data.mapId !== currentMap?.id) return;
      
      // 참가자 목록 업데이트
      const participantIds = new Set(
        data.participants
          .filter(p => p.userId !== user.id)
          .map(p => p.userId || p.socketId)
      );
      
      // 없는 참가자는 제거 예약
      charactersRef.current.forEach((character, id) => {
        if (!participantIds.has(id)) {
          character.lastUpdate = Date.now() - CHARACTER_TIMEOUT + 500;
        }
      });
    };
    
    socket.on('user-position', handleUserPosition);
    socket.on('all-users-update', handleAllUsers);
    socket.on('user-left', handleUserLeft);
    socket.on('update-participants', handleUpdateParticipants);
    
    return () => {
      socket.off('user-position', handleUserPosition);
      socket.off('all-users-update', handleAllUsers);
      socket.off('user-left', handleUserLeft);
      socket.off('update-participants', handleUpdateParticipants);
    };
  }, [socket, user, currentMap?.id]);
  
  // 보간 애니메이션 루프
  useEffect(() => {
    const interpolationLoop = () => {
      const now = Date.now();
      const deltaTime = now - lastFrameTime.current;
      lastFrameTime.current = now;
      
      // 모든 캐릭터 보간 및 정리
      const activeCharacters = new Map();
      
      charactersRef.current.forEach((character, id) => {
        // Stale 캐릭터 제거
        if (character.isStale()) {
          return;
        }
        
        // 위치 보간
        character.interpolate(deltaTime);
        
        // 활성 캐릭터만 렌더링 목록에 추가
        activeCharacters.set(id, {
          id: character.id,
          username: character.username,
          position: { ...character.displayPosition },
          direction: character.direction,
          isMoving: character.isMoving,
          characterInfo: character.characterInfo
        });
      });
      
      // Stale 캐릭터 정리
      const idsToRemove = [];
      charactersRef.current.forEach((character, id) => {
        if (character.isStale()) {
          idsToRemove.push(id);
        }
      });
      idsToRemove.forEach(id => charactersRef.current.delete(id));
      
      // 상태 업데이트
      setOtherCharacters(activeCharacters);
      
      animationFrame.current = requestAnimationFrame(interpolationLoop);
    };
    
    animationFrame.current = requestAnimationFrame(interpolationLoop);
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);
  
  // 맵 정보 초기화
  useEffect(() => {
    console.log('🔍 맵 정보 초기화 시도, currentMap:', currentMap);
    
    // 맵 크기 결정 (다양한 소스에서 가져오기)
    let mapWidth = currentMap?.size?.width || currentMap?.width || 1000;
    let mapHeight = currentMap?.size?.height || currentMap?.height || 1000;
    
    // 배경 이미지가 있으면 그 크기 사용
    if (currentMap?.backgroundImage || currentMap?.backgroundLayer?.image) {
      mapWidth = currentMap?.imageSize?.width || mapWidth;
      mapHeight = currentMap?.imageSize?.height || mapHeight;
    }
    
    console.log(`📐 맵 크기: ${mapWidth} x ${mapHeight}`);
    
    // PathFinder 제거
    // pathFinderRef.current = new PathFinder(mapWidth, mapHeight, 10);
    
    if (currentMap?.walls) {
      // pathFinderRef.current.setWalls(currentMap.walls);
      console.log(`🧱 벽 설정: ${currentMap.walls.length}개`);
    }
    
    console.log('✅ 맵 정보 초기화 완료');
  }, [currentMap]);
  
  // 맵 변경 시 초기화
  useEffect(() => {
    charactersRef.current.clear();
    setOtherCharacters(new Map());
    // 경로 초기화
    setCurrentPath([]);
    // pathIndexRef.current = 0; // PathFinder 제거
    // isFollowingPathRef.current = false; // PathFinder 제거
  }, [currentMap?.id]);
  
  return {
    myPosition,
    myDirection,
    otherCharacters,
    currentPath, // 경로 정보 반환
    moveCharacterTo,
    setMyPosition,
    setMyDirection
  };
};