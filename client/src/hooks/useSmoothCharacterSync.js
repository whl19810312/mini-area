import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// 고성능 동기화 설정
const POSITION_UPDATE_RATE = 16; // ms (60 FPS로 위치 전송)
const INTERPOLATION_RATE = 8; // ms (120 FPS로 보간)
const CHARACTER_TIMEOUT = 5000; // 5초간 업데이트 없으면 제거
const MAX_PREDICTION_TIME = 200; // 최대 200ms 예측
const SMOOTHING_FACTOR = 0.15; // 보간 속도 (낮을수록 부드러움)

// 고급 캐릭터 데이터 클래스
class SmoothCharacterData {
  constructor(data) {
    this.id = data.userId || data.socketId;
    this.username = data.username;
    this.socketId = data.socketId;
    
    // 위치 관련 (다중 버퍼 시스템)
    this.serverPosition = { ...data.position };
    this.displayPosition = { ...data.position };
    this.targetPosition = { ...data.position };
    this.previousPosition = { ...data.position };
    
    // 속도 및 가속도 (물리 기반 예측)
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
    this.lastVelocity = { x: 0, y: 0 };
    
    // 예측 위치 버퍼 (네트워크 지연 보상)
    this.predictedPositions = [];
    this.positionHistory = [];
    
    // 방향 및 상태
    this.direction = data.direction || 'down';
    this.isMoving = false;
    this.movementStartTime = 0;
    
    // 캐릭터 정보
    this.characterInfo = data.characterInfo;
    
    // 타임스탬프
    this.lastUpdate = Date.now();
    this.lastServerUpdate = Date.now();
    this.networkLatency = 0;
    
    // 렌더링 최적화
    this.needsUpdate = true;
    this.lastRenderPosition = { ...data.position };
  }
  
  updateFromServer(data) {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastServerUpdate;
    
    // 네트워크 지연 계산
    this.networkLatency = Math.min(MAX_PREDICTION_TIME, timeSinceLastUpdate);
    
    // 이전 위치 저장
    this.previousPosition = { ...this.serverPosition };
    this.lastVelocity = { ...this.velocity };
    
    // 서버 위치 업데이트
    this.serverPosition = { ...data.position };
    this.targetPosition = { ...data.position };
    this.direction = data.direction || this.direction;
    this.characterInfo = data.characterInfo || this.characterInfo;
    
    // 속도 계산 (물리 기반)
    if (timeSinceLastUpdate > 0) {
      this.velocity.x = (this.serverPosition.x - this.previousPosition.x) / timeSinceLastUpdate * 1000;
      this.velocity.y = (this.serverPosition.y - this.previousPosition.y) / timeSinceLastUpdate * 1000;
      
      // 가속도 계산
      this.acceleration.x = (this.velocity.x - this.lastVelocity.x) / timeSinceLastUpdate * 1000;
      this.acceleration.y = (this.velocity.y - this.lastVelocity.y) / timeSinceLastUpdate * 1000;
    }
    
    // 움직임 감지 (속도 기반)
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    this.isMoving = speed > 10; // 10px/sec 이상이면 움직임으로 간주
    
    if (this.isMoving && this.movementStartTime === 0) {
      this.movementStartTime = now;
    } else if (!this.isMoving) {
      this.movementStartTime = 0;
    }
    
    // 위치 히스토리 업데이트 (예측용)
    this.positionHistory.push({
      position: { ...this.serverPosition },
      timestamp: now,
      velocity: { ...this.velocity }
    });
    
    // 히스토리 크기 제한 (메모리 최적화)
    if (this.positionHistory.length > 10) {
      this.positionHistory.shift();
    }
    
    // 예측 위치 계산
    this.calculatePredictedPositions();
    
    this.lastServerUpdate = now;
    this.lastUpdate = now;
    this.needsUpdate = true;
  }
  
  calculatePredictedPositions() {
    this.predictedPositions = [];
    const now = Date.now();
    const predictionSteps = Math.ceil(this.networkLatency / 16); // 16ms 단위로 예측
    
    let currentPos = { ...this.serverPosition };
    let currentVel = { ...this.velocity };
    
    for (let i = 1; i <= predictionSteps; i++) {
      const deltaTime = i * 16 / 1000; // 16ms를 초로 변환
      
      // 물리 기반 예측 (속도 + 가속도)
      currentPos.x += currentVel.x * deltaTime + 0.5 * this.acceleration.x * deltaTime * deltaTime;
      currentPos.y += currentVel.y * deltaTime + 0.5 * this.acceleration.y * deltaTime * deltaTime;
      
      // 속도 업데이트
      currentVel.x += this.acceleration.x * deltaTime;
      currentVel.y += this.acceleration.y * deltaTime;
      
      // 속도 감쇠 (자연스러운 정지)
      const damping = 0.95;
      currentVel.x *= damping;
      currentVel.y *= damping;
      
      this.predictedPositions.push({
        position: { ...currentPos },
        timestamp: now + (i * 16)
      });
    }
  }
  
  interpolate(deltaTime) {
    // 예측된 위치 사용 (네트워크 지연 보상)
    const now = Date.now();
    let targetPos = { ...this.targetPosition };
    
    // 예측 위치가 있으면 사용
    if (this.predictedPositions.length > 0) {
      const latestPrediction = this.predictedPositions[this.predictedPositions.length - 1];
      if (now <= latestPrediction.timestamp) {
        // 예측 시간 내에 있으면 예측 위치 사용
        targetPos = latestPrediction.position;
      }
    }
    
    // 부드러운 보간 (지수적 감쇠)
    const factor = 1 - Math.pow(1 - SMOOTHING_FACTOR, deltaTime / 16);
    
    this.displayPosition.x += (targetPos.x - this.displayPosition.x) * factor;
    this.displayPosition.y += (targetPos.y - this.displayPosition.y) * factor;
    
    // 거리 기반 업데이트 필요성 판단
    const distance = Math.hypot(
      this.displayPosition.x - this.lastRenderPosition.x,
      this.displayPosition.y - this.lastRenderPosition.y
    );
    
    this.needsUpdate = distance > 0.5; // 0.5px 이상 움직였을 때만 업데이트
    
    if (this.needsUpdate) {
      this.lastRenderPosition = { ...this.displayPosition };
    }
    
    // 거의 도착했으면 정확한 위치로
    const targetDistance = Math.hypot(
      targetPos.x - this.displayPosition.x,
      targetPos.y - this.displayPosition.y
    );
    
    if (targetDistance < 1) {
      this.displayPosition = { ...targetPos };
      this.isMoving = false;
      this.movementStartTime = 0;
    }
  }
  
  isStale() {
    return Date.now() - this.lastUpdate > CHARACTER_TIMEOUT;
  }
  
  getRenderData() {
    return {
      id: this.id,
      username: this.username,
      position: { ...this.displayPosition },
      direction: this.direction,
      isMoving: this.isMoving,
      characterInfo: this.characterInfo,
      needsUpdate: this.needsUpdate
    };
  }
}

export const useSmoothCharacterSync = (socket, currentMap) => {
  const { user } = useAuth();
  const [myPosition, setMyPosition] = useState({ x: 200, y: 200 });
  const [myDirection, setMyDirection] = useState('down');
  const [otherCharacters, setOtherCharacters] = useState(new Map());
  const [currentPath, setCurrentPath] = useState([]);
  
  const charactersRef = useRef(new Map());
  const lastPositionUpdate = useRef(0);
  const animationFrame = useRef(null);
  const lastFrameTime = useRef(Date.now());
  const myPositionRef = useRef(myPosition);
  const myDirectionRef = useRef(myDirection);
  const currentPathRef = useRef([]);
  const clickTargetRef = useRef(null);
  const myVelocityRef = useRef({ x: 0, y: 0 });
  const myLastPositionRef = useRef({ x: 200, y: 200 });
  const myLastUpdateTime = useRef(Date.now());
  
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
  
  // 벽 충돌 감지 함수 (최적화됨)
  const checkWallCollision = useCallback((from, to) => {
    if (!currentMap?.walls || currentMap.walls.length === 0) return false;
    
    // 빠른 AABB 체크로 대부분의 충돌을 걸러냄
    const minX = Math.min(from.x, to.x) - 10;
    const maxX = Math.max(from.x, to.x) + 10;
    const minY = Math.min(from.y, to.y) - 10;
    const maxY = Math.max(from.y, to.y) + 10;
    
    for (const wall of currentMap.walls) {
      const x1 = wall.start?.x ?? wall.x1 ?? 0;
      const y1 = wall.start?.y ?? wall.y1 ?? 0;
      const x2 = wall.end?.x ?? wall.x2 ?? 0;
      const y2 = wall.end?.y ?? wall.y2 ?? 0;
      
      // AABB 체크
      const wallMinX = Math.min(x1, x2);
      const wallMaxX = Math.max(x1, x2);
      const wallMinY = Math.min(y1, y2);
      const wallMaxY = Math.max(y1, y2);
      
      if (maxX < wallMinX || minX > wallMaxX || maxY < wallMinY || minY > wallMaxY) {
        continue; // AABB 충돌 없음
      }
      
      // 정확한 선분 교차 검사
      const det = (to.x - from.x) * (y2 - y1) - (to.y - from.y) * (x2 - x1);
      if (Math.abs(det) < 0.0001) continue;
      
      const t = ((x1 - from.x) * (y2 - y1) - (y1 - from.y) * (x2 - x1)) / det;
      const u = ((x1 - from.x) * (to.y - from.y) - (y1 - from.y) * (to.x - from.x)) / det;
      
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return true;
      }
    }
    return false;
  }, [currentMap]);
  
  // 고성능 A* 패스파인딩
  const findPath = useCallback((start, end) => {
    if (!currentMap) return [end];
    
    const walls = currentMap.walls || [];
    const gridSize = 8; // 더 작은 그리드로 정밀도 향상
    const maxDistance = Math.hypot(end.x - start.x, end.y - start.y);
    const maxSteps = Math.ceil(maxDistance / gridSize) * 3;
    
    // 개선된 경로 찾기
    const path = [];
    let currentPos = { ...start };
    let attempts = 0;
    let lastValidPos = { ...start };
    
    while (attempts < maxSteps) {
      attempts++;
      
      // 목표까지 직선 이동 시도
      const stepSize = Math.min(gridSize, Math.hypot(end.x - currentPos.x, end.y - currentPos.y));
      const directPath = {
        x: currentPos.x + (end.x - currentPos.x) * (stepSize / Math.hypot(end.x - currentPos.x, end.y - currentPos.y)),
        y: currentPos.y + (end.y - currentPos.y) * (stepSize / Math.hypot(end.x - currentPos.x, end.y - currentPos.y))
      };
      
      // 충돌 검사
      if (!checkWallCollision(currentPos, directPath)) {
        path.push(directPath);
        lastValidPos = { ...directPath };
        currentPos = directPath;
        
        // 목적지 근처 도달
        if (Math.hypot(end.x - currentPos.x, end.y - currentPos.y) < gridSize) {
          path.push(end);
          break;
        }
      } else {
        // 충돌 시 개선된 우회 경로 찾기
        const angles = [Math.PI/6, -Math.PI/6, Math.PI/3, -Math.PI/3, Math.PI/2, -Math.PI/2, Math.PI*2/3, -Math.PI*2/3];
        let foundAlternative = false;
        
        for (const angle of angles) {
          const dx = Math.cos(angle) * gridSize * 1.5;
          const dy = Math.sin(angle) * gridSize * 1.5;
          const altPath = {
            x: currentPos.x + dx,
            y: currentPos.y + dy
          };
          
          if (!checkWallCollision(currentPos, altPath)) {
            path.push(altPath);
            lastValidPos = { ...altPath };
            currentPos = altPath;
            foundAlternative = true;
            break;
          }
        }
        
        if (!foundAlternative) {
          // 우회 경로를 찾지 못한 경우 마지막 유효한 위치에서 목적지로
          if (path.length > 0) {
            path.push(end);
          }
          break;
        }
      }
    }
    
    return path.length > 0 ? path : [end];
  }, [currentMap, checkWallCollision]);
  
  // 부드러운 캐릭터 이동 함수
  const moveCharacterTo = useCallback((targetPos) => {
    console.log('🎯 부드러운 이동 시작:', targetPos);
    
    clickTargetRef.current = targetPos;
    
    // 이동 애니메이션 (물리 기반)
    const MAX_SPEED = 400; // px/sec - 더 빠른 속도
    const ACCELERATION = 800; // px/sec² - 가속도
    const DECELERATION = 1200; // px/sec² - 감속도
    
    let currentSpeed = 0;
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
      
      if (dist < 3) {
        // 목적지 도착
        console.log('🏁 목적지 도착');
        setMyPosition(target);
        setCurrentPath([]);
        clickTargetRef.current = null;
        myVelocityRef.current = { x: 0, y: 0 };
        return;
      }
      
      // 방향 벡터 정규화
      const dirX = dx / dist;
      const dirY = dy / dist;
      
      // 속도 조절 (거리에 따른 가속/감속)
      const targetSpeed = Math.min(MAX_SPEED, Math.sqrt(dist * ACCELERATION));
      const speedDiff = targetSpeed - currentSpeed;
      
      if (speedDiff > 0) {
        // 가속
        currentSpeed = Math.min(targetSpeed, currentSpeed + ACCELERATION * deltaTime);
      } else {
        // 감속
        currentSpeed = Math.max(0, currentSpeed + DECELERATION * deltaTime);
      }
      
      // 새 위치 계산
      const moveDistance = currentSpeed * deltaTime;
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
        
        // 속도 업데이트
        myVelocityRef.current = {
          x: dirX * currentSpeed,
          y: dirY * currentSpeed
        };
        
        // 경로 표시
        setCurrentPath([myPosition, target]);
        
        // 다음 프레임
        requestAnimationFrame(animate);
      } else {
        // 충돌 시 이동 중지
        console.log('⛔ 벽과 충돌 - 이동 중지');
        clickTargetRef.current = null;
        setCurrentPath([]);
        myVelocityRef.current = { x: 0, y: 0 };
      }
    };
    
    requestAnimationFrame(animate);
  }, [checkWallCollision, myPosition]);
  
  // 고주파 위치 전송
  useEffect(() => {
    if (!socket || !currentMap || !user) return;
    
    const sendPosition = () => {
      const now = Date.now();
      if (now - lastPositionUpdate.current >= POSITION_UPDATE_RATE) {
        // 속도 정보도 함께 전송
        const currentPos = myPositionRef.current;
        const timeDiff = now - myLastUpdateTime.current;
        
        if (timeDiff > 0) {
          myVelocityRef.current = {
            x: (currentPos.x - myLastPositionRef.current.x) / timeDiff * 1000,
            y: (currentPos.y - myLastPositionRef.current.y) / timeDiff * 1000
          };
        }
        
        socket.emit('update-position', {
          mapId: currentMap.id,
          position: currentPos,
          direction: myDirectionRef.current,
          velocity: myVelocityRef.current,
          username: user.username,
          timestamp: now
        });
        
        myLastPositionRef.current = { ...currentPos };
        myLastUpdateTime.current = now;
        lastPositionUpdate.current = now;
      }
    };
    
    const interval = setInterval(sendPosition, POSITION_UPDATE_RATE);
    sendPosition();
    
    return () => clearInterval(interval);
  }, [socket, currentMap, user]);
  
  // 서버로부터 위치 수신 (최적화됨)
  useEffect(() => {
    if (!socket || !user) return;
    
    const handleUserPosition = (data) => {
      if (data.userId === user.id || data.username === user.username) return;
      
      const characterId = data.userId || data.socketId;
      
      if (!charactersRef.current.has(characterId)) {
        charactersRef.current.set(characterId, new SmoothCharacterData(data));
      } else {
        charactersRef.current.get(characterId).updateFromServer(data);
      }
    };
    
    const handleAllUsers = (data) => {
      const { users, mapId } = data;
      if (!users || mapId !== currentMap?.id) return;
      
      const updatedIds = new Set();
      
      users.forEach(userData => {
        if (userData.userId === user.id || userData.username === user.username) return;
        
        const characterId = userData.userId || userData.socketId;
        updatedIds.add(characterId);
        
        if (!charactersRef.current.has(characterId)) {
          charactersRef.current.set(characterId, new SmoothCharacterData(userData));
        } else {
          charactersRef.current.get(characterId).updateFromServer(userData);
        }
      });
      
      // 업데이트 안 된 캐릭터는 stale로 표시
      charactersRef.current.forEach((character, id) => {
        if (!updatedIds.has(id)) {
          character.lastUpdate = Date.now() - CHARACTER_TIMEOUT + 1000;
        }
      });
    };
    
    const handleUserLeft = (data) => {
      const characterId = data.userId || data.socketId;
      const character = charactersRef.current.get(characterId);
      if (character) {
        character.lastUpdate = 0;
      }
    };
    
    const handleUpdateParticipants = (data) => {
      if (data.mapId !== currentMap?.id) return;
      
      const participantIds = new Set(
        data.participants
          .filter(p => p.userId !== user.id)
          .map(p => p.userId || p.socketId)
      );
      
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
  
  // 고성능 보간 애니메이션 루프
  useEffect(() => {
    const interpolationLoop = () => {
      const now = Date.now();
      const deltaTime = now - lastFrameTime.current;
      lastFrameTime.current = now;
      
      // 모든 캐릭터 보간 및 정리
      const activeCharacters = new Map();
      const idsToRemove = [];
      
      charactersRef.current.forEach((character, id) => {
        if (character.isStale()) {
          idsToRemove.push(id);
          return;
        }
        
        // 위치 보간
        character.interpolate(deltaTime);
        
        // 업데이트가 필요한 캐릭터만 렌더링 목록에 추가
        if (character.needsUpdate) {
          activeCharacters.set(id, character.getRenderData());
        }
      });
      
      // Stale 캐릭터 정리
      idsToRemove.forEach(id => charactersRef.current.delete(id));
      
      // 상태 업데이트 (변경된 캐릭터만)
      if (activeCharacters.size > 0) {
        setOtherCharacters(prev => {
          const newMap = new Map(prev);
          activeCharacters.forEach((data, id) => {
            newMap.set(id, data);
          });
          return newMap;
        });
      }
      
      animationFrame.current = requestAnimationFrame(interpolationLoop);
    };
    
    animationFrame.current = requestAnimationFrame(interpolationLoop);
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);
  
  // 맵 변경 시 초기화
  useEffect(() => {
    charactersRef.current.clear();
    setOtherCharacters(new Map());
    setCurrentPath([]);
  }, [currentMap?.id]);
  
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
