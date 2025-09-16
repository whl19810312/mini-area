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

export const useRealtimeCharacterSync = (socket, currentMap, currentCharacter) => {
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
      const spawnPosition = { 
        x: spawn.position?.x || spawn.x || 400, 
        y: spawn.position?.y || spawn.y || 300 
      };
      console.log('🎯 시작점으로 이동:', spawnPosition);
      setMyPosition(spawnPosition);
    } else if (currentMap?.startPoint) {
      const startPosition = {
        x: currentMap.startPoint.position?.x || currentMap.startPoint.x || 400,
        y: currentMap.startPoint.position?.y || currentMap.startPoint.y || 300
      };
      console.log('🎯 시작점으로 이동:', startPosition);
      setMyPosition(startPosition);
    } else {
      // 기본 위치를 좀 더 적절한 곳으로 설정
      const defaultPosition = { x: 400, y: 300 };
      console.log('🎯 기본 위치로 이동:', defaultPosition);
      setMyPosition(defaultPosition);
    }
  }, [currentMap?.id]);
  
  // 벽 충돌 감지 함수 (완화된 버전)
  const checkWallCollision = useCallback((from, to) => {
    if (!currentMap?.walls || currentMap.walls.length === 0) return false;
    
    // 매우 짧은 이동은 허용 (벽 근처에서 미세 이동 가능)
    const moveDistance = Math.hypot(to.x - from.x, to.y - from.y);
    if (moveDistance < 3) return false; // 3픽셀 이하 이동은 항상 허용
    
    // 선분과 벽의 교차 검사 (약간의 여유 공간 추가)
    for (const wall of currentMap.walls) {
      const x1 = wall.start?.x ?? wall.x1 ?? 0;
      const y1 = wall.start?.y ?? wall.y1 ?? 0;
      const x2 = wall.end?.x ?? wall.x2 ?? 0;
      const y2 = wall.end?.y ?? wall.y2 ?? 0;
      
      // 벽에서 조금 떨어진 곳까지 허용 (충돌 경계를 줄임)
      const buffer = 2; // 2픽셀 버퍼
      
      // 선분 교차 알고리즘
      const det = (to.x - from.x) * (y2 - y1) - (to.y - from.y) * (x2 - x1);
      if (Math.abs(det) < 0.0001) continue;
      
      const t = ((x1 - from.x) * (y2 - y1) - (y1 - from.y) * (x2 - x1)) / det;
      const u = ((x1 - from.x) * (to.y - from.y) - (y1 - from.y) * (to.x - from.x)) / det;
      
      // 충돌 감지 조건을 약간 완화 (buffer만큼의 여유)
      const margin = buffer / moveDistance;
      if (t >= -margin && t <= 1 + margin && u >= -margin && u <= 1 + margin) {
        // 벽과 매우 가까운 거리의 이동만 차단
        const intersectX = from.x + t * (to.x - from.x);
        const intersectY = from.y + t * (to.y - from.y);
        const distToWall = Math.min(
          Math.hypot(intersectX - from.x, intersectY - from.y),
          Math.hypot(intersectX - to.x, intersectY - to.y)
        );
        
        if (distToWall < buffer) {
          console.log('🚧 벽 충돌 감지:', { from, to, intersect: { x: intersectX, y: intersectY } });
          return true;
        }
      }
    }
    return false;
  }, [currentMap]);
  
  // 직선 경로에서 벽 충돌 여부 확인
  const canMoveDirectly = useCallback((from, to) => {
    if (!checkWallCollision(from, to)) {
      return true;
    }
    console.log('🚧 벽 충돌로 인한 이동 차단:', { from, to });
    return false;
  }, [checkWallCollision]);
  
  // 캐릭터 이동 함수 - 직선 이동
  const moveCharacterTo = useCallback((targetPos) => {
    console.log('🎯 클릭 이동: 직선 이동 시작', targetPos);
    console.log('📍 현재 위치:', myPosition);
    
    // 직선 이동 가능 여부 확인
    if (!canMoveDirectly(myPosition, targetPos)) {
      console.log('❌ 벽으로 인해 직선 이동 불가능');
      return;
    }
    
    // 목표 지점 설정
    clickTargetRef.current = targetPos;
    
    // 이동 애니메이션
    const MAX_SPEED = 300; // px/sec - 최고 속도
    let lastFrameTime = null;
    
    const animate = (currentTime) => {
      if (!clickTargetRef.current || currentPathIndex >= path.length) return;
      
      const deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / 1000 : 0.016;
      lastFrameTime = currentTime;
      
      const currentPos = myPositionRef.current;
      const currentTarget = path[currentPathIndex];
      const dx = currentTarget.x - currentPos.x;
      const dy = currentTarget.y - currentPos.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 5) {
        // 현재 경로점 도착
        console.log(`🚩 경로점 ${currentPathIndex + 1}/${path.length} 도착`);
        setMyPosition(currentTarget);
        currentPathIndex++;
        
        if (currentPathIndex >= path.length) {
          // 최종 목적지 도착
          console.log('🏁 최종 목적지 도착');
          setCurrentPath([]);
          clickTargetRef.current = null;
          return;
        }
        
        // 다음 경로점으로 계속
        requestAnimationFrame(animate);
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
      
      // 벽 충돌 검사를 더 관대하게 처리
      let shouldMove = !checkWallCollision(currentPos, newPos);
      
      // 충돌이 감지되면 작은 단위로 이동 시도
      if (!shouldMove && dist > 1) {
        const smallStepX = currentPos.x + dirX * 2; // 2픽셀씩만 이동
        const smallStepY = currentPos.y + dirY * 2;
        const smallStepPos = { x: smallStepX, y: smallStepY };
        
        if (!checkWallCollision(currentPos, smallStepPos)) {
          shouldMove = true;
          newPos.x = smallStepX;
          newPos.y = smallStepY;
          console.log('🐌 작은 단위로 이동');
        }
      }
      
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
        // 충돌 시 다음 경로점으로 스킵
        console.log('⚠️ 충돌 감지 - 다음 경로점으로 스킵');
        currentPathIndex++;
        if (currentPathIndex < path.length) {
          requestAnimationFrame(animate);
        } else {
          clickTargetRef.current = null;
          setCurrentPath([]);
        }
      }
    };
    
    requestAnimationFrame(animate);
  }, [checkWallCollision, findPath, myPosition]);
  
  // 서버로 위치 전송
  useEffect(() => {
    if (!socket || !currentMap || !user) return;
    
    const sendPosition = () => {
      const now = Date.now();
      if (now - lastPositionUpdate.current >= POSITION_UPDATE_RATE) {
        socket.emit('update-my-position', {
          mapId: currentMap.id,
          position: myPositionRef.current,
          direction: myDirectionRef.current,
          username: user.username,
          characterInfo: currentCharacter, // 캐릭터 정보 포함
          timestamp: now
        });
        lastPositionUpdate.current = now;
      }
    };
    
    const interval = setInterval(sendPosition, POSITION_UPDATE_RATE);
    
    // 즉시 한 번 전송
    sendPosition();
    
    return () => clearInterval(interval);
  }, [socket, currentMap, user, currentCharacter]);
  
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
      console.log('📡 all-users-update 수신:', { 
        userCount: users?.length || 0, 
        mapId, 
        currentMapId: currentMap?.id,
        users: users?.map(u => ({ username: u.username, position: u.position }))
      });
      
      if (!users || mapId !== currentMap?.id) {
        console.log('❌ 맵 ID 불일치 또는 사용자 데이터 없음');
        return;
      }
      
      const updatedIds = new Set();
      
      users.forEach(userData => {
        if (userData.userId === user.id || userData.username === user.username) {
          console.log('⏭️ 내 데이터 스킵:', userData.username);
          return;
        }
        
        const characterId = userData.userId || userData.socketId;
        updatedIds.add(characterId);
        
        console.log('👤 다른 사용자 데이터 처리:', {
          characterId,
          username: userData.username,
          position: userData.position,
          characterInfo: userData.characterInfo ? '있음' : '없음'
        });
        
        if (!charactersRef.current.has(characterId)) {
          charactersRef.current.set(characterId, new CharacterData(userData));
          console.log('✅ 새 캐릭터 추가:', userData.username);
        } else {
          charactersRef.current.get(characterId).updateFromServer(userData);
          console.log('🔄 기존 캐릭터 업데이트:', userData.username);
        }
      });
      
      // 업데이트 안 된 캐릭터는 stale로 표시
      charactersRef.current.forEach((character, id) => {
        if (!updatedIds.has(id)) {
          character.lastUpdate = Date.now() - CHARACTER_TIMEOUT + 1000; // 1초 후 제거
        }
      });
      
      console.log('📊 현재 다른 캐릭터 수:', charactersRef.current.size);
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
  
  // 맵 변경 시 초기화 및 맵 조인
  useEffect(() => {
    charactersRef.current.clear();
    setOtherCharacters(new Map());
    // 경로 초기화
    setCurrentPath([]);
    // pathIndexRef.current = 0; // PathFinder 제거
    // isFollowingPathRef.current = false; // PathFinder 제거
    
    // 소켓이 있고 맵과 현재 캐릭터가 준비되면 맵에 조인
    if (socket && currentMap && currentCharacter && user) {
      console.log('🚀 맵 조인 시도:', {
        mapId: currentMap.id,
        characterId: currentCharacter.id,
        characterName: currentCharacter.name,
        username: user.username
      });
      
      socket.emit('join-map', {
        mapId: currentMap.id,
        characterId: currentCharacter.id,
        position: myPositionRef.current,
        characterInfo: currentCharacter
      });
    }
  }, [currentMap?.id, currentCharacter?.id, socket, user]);
  
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