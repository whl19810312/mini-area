import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// UDP 최적화 설정
const UDP_CONFIG = {
  // 실시간 위치 업데이트 (UDP 스타일)
  POSITION_UPDATE_RATE: 16, // 60fps
  POSITION_INTERPOLATION_RATE: 16, // 60fps 보간
  POSITION_COMPRESSION_THRESHOLD: 100, // 100ms 이상 지연시 압축 사용
  
  // 네트워크 적응형 설정
  NETWORK_QUALITY_CHECK_INTERVAL: 5000, // 5초마다 네트워크 품질 체크
  HIGH_LATENCY_THRESHOLD: 100, // 100ms 이상은 고지연
  PACKET_LOSS_THRESHOLD: 0.05, // 5% 이상 패킷 손실
  
  // 배치 처리 설정
  BATCH_SIZE: 3,
  BATCH_TIMEOUT: 50, // 50ms 내에 배치 전송
};

// 캐릭터 데이터 클래스 (UDP 최적화)
class UDPOptimizedCharacterData {
  constructor(data) {
    this.id = data.userId || data.socketId;
    this.username = data.username;
    this.socketId = data.socketId;
    
    // 위치 관련 (UDP 최적화)
    this.serverPosition = { ...data.position };
    this.displayPosition = { ...data.position };
    this.targetPosition = { ...data.position };
    this.previousPosition = { ...data.position };
    this.predictedPosition = { ...data.position };
    
    // 방향 및 상태
    this.direction = data.direction || 'down';
    this.isMoving = false;
    this.velocity = { x: 0, y: 0 };
    
    // 캐릭터 정보
    this.characterInfo = data.characterInfo;
    
    // 타임스탬프 및 네트워크 정보
    this.lastUpdate = Date.now();
    this.lastServerUpdate = Date.now();
    this.networkDelay = 0;
    this.updateSequence = 0;
    
    // 보간 관련
    this.interpolationStartTime = Date.now();
    this.interpolationDuration = 200;
  }
  
  // 서버 데이터로 업데이트 (UDP 최적화)
  updateFromServer(data, estimatedDelay = 0) {
    this.previousPosition = { ...this.serverPosition };
    this.serverPosition = { ...data.position };
    this.direction = data.direction || this.direction;
    this.characterInfo = data.characterInfo || this.characterInfo;
    this.networkDelay = estimatedDelay;
    this.updateSequence++;
    
    // 네트워크 지연 보상
    if (estimatedDelay > 0) {
      this.predictedPosition = this.compensateForDelay(data.position, estimatedDelay);
      this.targetPosition = { ...this.predictedPosition };
    } else {
      this.targetPosition = { ...this.serverPosition };
    }
    
    // 움직임 감지 및 속도 계산
    const dx = this.serverPosition.x - this.previousPosition.x;
    const dy = this.serverPosition.y - this.previousPosition.y;
    const distance = Math.hypot(dx, dy);
    
    this.isMoving = distance > 1;
    
    if (this.isMoving) {
      const timeDelta = Date.now() - this.lastServerUpdate;
      if (timeDelta > 0) {
        this.velocity.x = dx / timeDelta * 1000; // px/sec
        this.velocity.y = dy / timeDelta * 1000;
      }
    } else {
      this.velocity = { x: 0, y: 0 };
    }
    
    this.lastServerUpdate = Date.now();
    this.lastUpdate = Date.now();
    this.interpolationStartTime = Date.now();
  }
  
  // 네트워크 지연 보상
  compensateForDelay(position, delay) {
    if (!this.isMoving || delay <= 0) return position;
    
    const compensationTime = Math.min(delay, 200) / 1000; // 최대 200ms 보상
    
    return {
      x: position.x + this.velocity.x * compensationTime,
      y: position.y + this.velocity.y * compensationTime
    };
  }
  
  // UDP 스타일 보간 (더 부드러운 움직임)
  interpolate(deltaTime, networkQuality = 'good') {
    const elapsed = Date.now() - this.interpolationStartTime;
    
    // 네트워크 품질에 따른 보간 설정
    let interpolationSpeed, maxInterpolationTime;
    
    switch (networkQuality) {
      case 'good':
        interpolationSpeed = 0.3;
        maxInterpolationTime = 100;
        break;
      case 'medium':
        interpolationSpeed = 0.2;
        maxInterpolationTime = 200;
        break;
      case 'poor':
        interpolationSpeed = 0.15;
        maxInterpolationTime = 300;
        break;
      default:
        interpolationSpeed = 0.25;
        maxInterpolationTime = 150;
    }
    
    // 부드러운 보간
    const factor = Math.min(1, interpolationSpeed * (deltaTime / 16));
    
    this.displayPosition.x += (this.targetPosition.x - this.displayPosition.x) * factor;
    this.displayPosition.y += (this.targetPosition.y - this.displayPosition.y) * factor;
    
    // 예측 기반 위치 조정 (UDP 패킷 손실 대비)
    if (elapsed > maxInterpolationTime && this.isMoving) {
      // 서버 업데이트가 오래되었으면 예측 위치로 이동
      const predictedX = this.serverPosition.x + this.velocity.x * (elapsed / 1000);
      const predictedY = this.serverPosition.y + this.velocity.y * (elapsed / 1000);
      
      this.targetPosition.x = predictedX;
      this.targetPosition.y = predictedY;
    }
    
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
  
  // 오래된 데이터 체크 (UDP 특성상 더 짧은 타임아웃)
  isStale() {
    return Date.now() - this.lastUpdate > 2000; // 2초로 단축
  }
}

// 네트워크 품질 모니터링
class NetworkQualityMonitor {
  constructor() {
    this.latency = 0;
    this.packetLoss = 0;
    this.quality = 'good';
    this.pingSamples = [];
    this.maxSamples = 10;
  }
  
  addLatencySample(latency) {
    this.pingSamples.push(latency);
    if (this.pingSamples.length > this.maxSamples) {
      this.pingSamples.shift();
    }
    
    // 평균 지연시간 계산
    this.latency = this.pingSamples.reduce((sum, sample) => sum + sample, 0) / this.pingSamples.length;
    
    // 네트워크 품질 판정
    this.updateQuality();
  }
  
  updateQuality() {
    if (this.latency < 50 && this.packetLoss < 0.01) {
      this.quality = 'good';
    } else if (this.latency < 100 && this.packetLoss < 0.05) {
      this.quality = 'medium';
    } else {
      this.quality = 'poor';
    }
  }
  
  getTransmissionConfig() {
    switch (this.quality) {
      case 'good':
        return {
          updateRate: 16, // 60fps
          useCompression: false,
          useBatching: false,
          usePrecompensation: true
        };
      case 'medium':
        return {
          updateRate: 33, // 30fps
          useCompression: true,
          useBatching: true,
          usePrecompensation: true
        };
      case 'poor':
        return {
          updateRate: 100, // 10fps
          useCompression: true,
          useBatching: true,
          usePrecompensation: false
        };
      default:
        return {
          updateRate: 50,
          useCompression: false,
          useBatching: false,
          usePrecompensation: true
        };
    }
  }
}

// UDP 최적화된 실시간 동기화 훅
export const useUDPOptimizedSync = (socket, currentMap) => {
  const { user } = useAuth();
  const [myPosition, setMyPosition] = useState({ x: 200, y: 200 });
  const [myDirection, setMyDirection] = useState('down');
  const [otherCharacters, setOtherCharacters] = useState(new Map());
  const [currentPath, setCurrentPath] = useState([]);
  const [networkQuality, setNetworkQuality] = useState('good');
  
  // Refs
  const charactersRef = useRef(new Map());
  const lastPositionUpdate = useRef(0);
  const animationFrame = useRef(null);
  const lastFrameTime = useRef(Date.now());
  const myPositionRef = useRef(myPosition);
  const myDirectionRef = useRef(myDirection);
  const networkMonitor = useRef(new NetworkQualityMonitor());
  const positionBatch = useRef([]);
  const batchTimer = useRef(null);
  const pingStartTime = useRef(new Map());
  
  // 위치 업데이트 시 ref 동기화
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
  
  // UDP 최적화된 위치 전송
  const sendPositionUpdate = useCallback((position, direction, force = false) => {
    if (!socket || !currentMap || !user) return;
    
    const now = Date.now();
    const config = networkMonitor.current.getTransmissionConfig();
    
    // 전송 빈도 제어
    if (!force && now - lastPositionUpdate.current < config.updateRate) return;
    
    const positionData = {
      mapId: currentMap.id,
      position,
      direction,
      username: user.username,
      timestamp: now
    };
    
    if (config.useBatching) {
      // 배치 처리
      positionBatch.current.push(positionData);
      
      if (positionBatch.current.length >= UDP_CONFIG.BATCH_SIZE) {
        socket.emit('update-position-batch', {
          events: positionBatch.current,
          timestamp: now
        });
        positionBatch.current = [];
      } else if (!batchTimer.current) {
        batchTimer.current = setTimeout(() => {
          if (positionBatch.current.length > 0) {
            socket.emit('update-position-batch', {
              events: positionBatch.current,
              timestamp: Date.now()
            });
            positionBatch.current = [];
          }
          batchTimer.current = null;
        }, UDP_CONFIG.BATCH_TIMEOUT);
      }
    } else if (config.useCompression) {
      // 압축 전송
      const compressed = compressPositionData(positionData);
      socket.emit('update-position-compressed', compressed);
    } else {
      // 일반 전송 (UDP 스타일)
      socket.emit('update-position', positionData);
    }
    
    lastPositionUpdate.current = now;
  }, [socket, currentMap, user]);
  
  // 위치 데이터 압축
  const compressPositionData = useCallback((data) => {
    return {
      compressed: [
        Math.round(data.position.x),
        Math.round(data.position.y),
        data.timestamp
      ],
      direction: data.direction,
      mapId: data.mapId
    };
  }, []);
  
  // 캐릭터 이동 함수
  const moveCharacterTo = useCallback((targetPos) => {
    const MAX_SPEED = 300;
    let lastFrameTime = null;
    
    const animate = (currentTime) => {
      const deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / 1000 : 0.016;
      lastFrameTime = currentTime;
      
      const currentPos = myPositionRef.current;
      const dx = targetPos.x - currentPos.x;
      const dy = targetPos.y - currentPos.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 5) {
        setMyPosition(targetPos);
        setCurrentPath([]);
        sendPositionUpdate(targetPos, myDirectionRef.current, true);
        return;
      }
      
      const dirX = dx / dist;
      const dirY = dy / dist;
      const moveDistance = MAX_SPEED * deltaTime;
      
      const newX = currentPos.x + dirX * Math.min(moveDistance, dist);
      const newY = currentPos.y + dirY * Math.min(moveDistance, dist);
      const newPos = { x: newX, y: newY };
      
      let newDir = myDirectionRef.current;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0 ? 'right' : 'left';
      } else if (Math.abs(dy) > 0) {
        newDir = dy > 0 ? 'down' : 'up';
      }
      
      setMyPosition(newPos);
      setMyDirection(newDir);
      setCurrentPath([myPosition, targetPos]);
      
      // UDP 최적화된 위치 전송
      sendPositionUpdate(newPos, newDir);
      
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, [sendPositionUpdate, myPosition]);
  
  // 네트워크 품질 모니터링 설정
  useEffect(() => {
    if (!socket) return;
    
    // 핑 측정
    const pingInterval = setInterval(() => {
      const pingId = Date.now().toString();
      pingStartTime.current.set(pingId, Date.now());
      socket.emit('ping', { id: pingId, timestamp: Date.now() });
    }, UDP_CONFIG.NETWORK_QUALITY_CHECK_INTERVAL);
    
    // 퐁 응답 처리
    const handlePong = (data) => {
      const startTime = pingStartTime.current.get(data.id);
      if (startTime) {
        const latency = Date.now() - startTime;
        networkMonitor.current.addLatencySample(latency);
        setNetworkQuality(networkMonitor.current.quality);
        pingStartTime.current.delete(data.id);
      }
    };
    
    socket.on('pong', handlePong);
    
    return () => {
      clearInterval(pingInterval);
      socket.off('pong', handlePong);
    };
  }, [socket]);
  
  // 서버로부터 위치 수신 (UDP 최적화)
  useEffect(() => {
    if (!socket || !user) return;
    
    // 일반 위치 업데이트
    const handleUserPosition = (data) => {
      if (data.userId === user.id || data.username === user.username) return;
      
      const characterId = data.userId || data.socketId;
      const estimatedDelay = Date.now() - (data.timestamp || 0);
      
      if (!charactersRef.current.has(characterId)) {
        charactersRef.current.set(characterId, new UDPOptimizedCharacterData(data));
      } else {
        charactersRef.current.get(characterId).updateFromServer(data, estimatedDelay);
      }
    };
    
    // 압축된 위치 업데이트
    const handleCompressedPositions = (compressedData) => {
      compressedData.forEach(item => {
        const data = {
          userId: item.i,
          username: item.u,
          position: { x: item.p[0], y: item.p[1] },
          direction: getFullDirection(item.d),
          timestamp: item.t
        };
        handleUserPosition(data);
      });
    };
    
    // 배치 위치 업데이트
    const handlePositionBatch = (batchData) => {
      batchData.forEach(data => {
        handleUserPosition(data);
      });
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
        
        const estimatedDelay = Date.now() - (userData.timestamp || 0);
        
        if (!charactersRef.current.has(characterId)) {
          charactersRef.current.set(characterId, new UDPOptimizedCharacterData(userData));
        } else {
          charactersRef.current.get(characterId).updateFromServer(userData, estimatedDelay);
        }
      });
      
      // 업데이트되지 않은 캐릭터 제거 예약
      charactersRef.current.forEach((character, id) => {
        if (!updatedIds.has(id)) {
          character.lastUpdate = Date.now() - 1500; // 1.5초 후 제거
        }
      });
    };
    
    socket.on('user-position', handleUserPosition);
    socket.on('compressed-positions-update', handleCompressedPositions);
    socket.on('position-batch-update', handlePositionBatch);
    socket.on('all-users-update', handleAllUsers);
    
    return () => {
      socket.off('user-position', handleUserPosition);
      socket.off('compressed-positions-update', handleCompressedPositions);
      socket.off('position-batch-update', handlePositionBatch);
      socket.off('all-users-update', handleAllUsers);
    };
  }, [socket, user, currentMap?.id]);
  
  // 방향 문자열 복원
  const getFullDirection = (shortDir) => {
    const dirMap = { u: 'up', d: 'down', l: 'left', r: 'right' };
    return dirMap[shortDir] || 'down';
  };
  
  // UDP 최적화된 보간 루프
  useEffect(() => {
    const interpolationLoop = () => {
      const now = Date.now();
      const deltaTime = now - lastFrameTime.current;
      lastFrameTime.current = now;
      
      const activeCharacters = new Map();
      const currentNetworkQuality = networkMonitor.current.quality;
      
      charactersRef.current.forEach((character, id) => {
        if (character.isStale()) {
          return;
        }
        
        // UDP 최적화된 보간
        character.interpolate(deltaTime, currentNetworkQuality);
        
        activeCharacters.set(id, {
          id: character.id,
          username: character.username,
          position: { ...character.displayPosition },
          direction: character.direction,
          isMoving: character.isMoving,
          characterInfo: character.characterInfo,
          networkQuality: currentNetworkQuality
        });
      });
      
      // 오래된 캐릭터 정리
      const idsToRemove = [];
      charactersRef.current.forEach((character, id) => {
        if (character.isStale()) {
          idsToRemove.push(id);
        }
      });
      idsToRemove.forEach(id => charactersRef.current.delete(id));
      
      setOtherCharacters(activeCharacters);
      
      animationFrame.current = requestAnimationFrame(interpolationLoop);
    };
    
    animationFrame.current = requestAnimationFrame(interpolationLoop);
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
    };
  }, []);
  
  // 맵 변경 시 초기화
  useEffect(() => {
    charactersRef.current.clear();
    setOtherCharacters(new Map());
    setCurrentPath([]);
    positionBatch.current = [];
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
      batchTimer.current = null;
    }
  }, [currentMap?.id]);
  
  return {
    myPosition,
    myDirection,
    otherCharacters,
    currentPath,
    networkQuality,
    moveCharacterTo,
    setMyPosition,
    setMyDirection,
    sendPositionUpdate
  };
};