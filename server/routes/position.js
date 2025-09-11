const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Map = require('../models/Map');

// JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// UDP 에뮬레이션: 실시간 위치 업데이트
router.post('/update', authenticateToken, (req, res) => {
  const { type, clientId, payload } = req.body;
  const { position, mapId, direction, currentArea, timestamp } = payload;
  const userId = req.user.userId || req.user.id;

  try {
    // 메타버스 핸들러를 통해 위치 업데이트
    const metaverseHandler = req.metaverseHandler;
    if (metaverseHandler) {
      const socketId = metaverseHandler.userSockets.get(userId);
      if (socketId) {
        const userInfo = metaverseHandler.socketUsers.get(socketId);
        if (userInfo) {
          // 이동 상태 감지: 위치가 이전과 다르면 이동 중
          const wasMoving = userInfo.isMoving || false;
          const positionChanged = 
            !userInfo.position || 
            userInfo.position.x !== position.x || 
            userInfo.position.y !== position.y;
          
          userInfo.position = position;
          userInfo.direction = direction;
          userInfo.currentArea = currentArea; // 클라이언트에서 계산된 영역 정보 저장
          userInfo.isMoving = positionChanged; // 위치 변경 여부로 이동 상태 결정
          userInfo.lastUpdate = timestamp;
          userInfo.lastPositionUpdate = timestamp; // 위치 업데이트 시간 추적
          
          // 이동 시작/중지 로그 (디버그용)
          if (positionChanged && !wasMoving) {
            console.log(`🏃 사용자 ${userId} 이동 시작`);
          } else if (!positionChanged && wasMoving) {
            console.log(`🛑 사용자 ${userId} 이동 중지`);
          }
          
          metaverseHandler.socketUsers.set(socketId, userInfo);
        }
      }
    }

    // SmoothMovementBroadcaster를 통한 부드러운 위치 업데이트 (영역 정보 포함)
    const smoothMovementBroadcaster = req.smoothMovementBroadcaster;
    if (smoothMovementBroadcaster) {
      smoothMovementBroadcaster.updateUserPosition(userId, mapId, position, direction, currentArea);
    }


    // UDP 특성 에뮬레이션: 빠른 응답 (최소한의 데이터)
    res.status(200).end(); // 빠른 종료
  } catch (error) {
    // UDP 특성: 오류 무시
    res.status(200).end();
  }
});

// TCP 에뮬레이션: 영역 정보 요청 및 응답
router.post('/area', authenticateToken, async (req, res) => {
  const { type, clientId, payload } = req.body;
  const { position, mapId, finalDirection, movementDuration, timestamp } = payload;
  const userId = req.user.userId || req.user.id;

  try {
    // 영역 정보 계산
    const areaInfo = await calculateAreaInfo(position, mapId);

    // 사용자 최종 위치 업데이트
    const metaverseHandler = req.metaverseHandler;
    if (metaverseHandler) {
      const socketId = metaverseHandler.userSockets.get(userId);
      if (socketId) {
        const userInfo = metaverseHandler.socketUsers.get(socketId);
        if (userInfo) {
          userInfo.position = position;
          userInfo.direction = finalDirection;
          userInfo.currentArea = areaInfo;
          userInfo.lastFinalUpdate = timestamp;
          metaverseHandler.socketUsers.set(socketId, userInfo);
        }
      }
    }

    // SmoothMovementBroadcaster를 통한 최종 위치 설정
    const smoothMovementBroadcaster = req.smoothMovementBroadcaster;
    if (smoothMovementBroadcaster) {
      smoothMovementBroadcaster.setUserFinalPosition(userId, mapId, position, finalDirection, areaInfo);
    }


    // Socket.IO를 통해 최종 위치 브로드캐스트
    req.io.to(`map-${mapId}`).emit('user-final-position', {
      userId: userId,
      position: position,
      direction: finalDirection,
      areaInfo: areaInfo,
      movementDuration: movementDuration
    });

    // TCP 응답: 상세한 영역 정보
    res.json({
      success: true,
      type: 'movement_complete',
      payload: {
        finalPosition: position,
        areaInfo: areaInfo,
        timestamp: Date.now(),
        movementDuration: movementDuration
      }
    });

  } catch (error) {
    console.error('영역 정보 계산 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Area calculation failed',
      payload: {
        finalPosition: position,
        areaInfo: { area: 'unknown', type: 'error' },
        timestamp: Date.now()
      }
    });
  }
});

// 영역 정보만 요청
router.post('/area-info', authenticateToken, async (req, res) => {
  const { position, mapId } = req.body;

  try {
    const areaInfo = await calculateAreaInfo(position, mapId);
    
    res.json({
      success: true,
      areaInfo: areaInfo,
      position: position,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('영역 정보 요청 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Area info request failed',
      areaInfo: { area: 'unknown', type: 'error' }
    });
  }
});

// Heartbeat 처리
router.post('/heartbeat', authenticateToken, (req, res) => {
  const { clientId, timestamp } = req.body;
  const userId = req.user.userId || req.user.id;

  // 사용자 활성 상태 업데이트
  const metaverseHandler = req.metaverseHandler;
  if (metaverseHandler) {
    const socketId = metaverseHandler.userSockets.get(userId);
    if (socketId) {
      const userInfo = metaverseHandler.socketUsers.get(socketId);
      if (userInfo) {
        userInfo.lastHeartbeat = timestamp;
        metaverseHandler.socketUsers.set(socketId, userInfo);
      }
    }
  }

  res.status(200).json({ 
    type: 'heartbeat_ack', 
    timestamp: Date.now() 
  });
});

// 영역 정보 계산 함수
async function calculateAreaInfo(position, mapId) {
  try {
    const map = await Map.findByPk(mapId);
    if (!map) {
      return { area: 'unknown', type: 'none' };
    }

    const mapData = map.toJSON();
    const { privateAreas = [], walls = [] } = mapData;

    // 프라이빗 영역 체크
    for (const area of privateAreas) {
      if (isPointInArea(position, area)) {
        return {
          area: 'private',
          type: area.type || 'private_area',
          id: area.id,
          name: area.name || '프라이빗 영역',
          properties: area.properties || {}
        };
      }
    }

    // 벽 충돌 체크
    const nearWall = getNearWall(position, walls);
    if (nearWall) {
      return {
        area: 'near_wall',
        type: 'boundary',
        wallId: nearWall.id,
        distance: nearWall.distance
      };
    }

    // 일반 영역
    return {
      area: 'public',
      type: 'open_space',
      coordinates: position,
      mapId: mapId
    };

  } catch (error) {
    console.error('영역 정보 계산 오류:', error);
    return { area: 'unknown', type: 'error' };
  }
}

function isPointInArea(point, area) {
  const { x, y } = point;
  const { x: ax, y: ay, width, height } = area;
  
  return x >= ax && x <= ax + width && y >= ay && y <= ay + height;
}

function getNearWall(position, walls) {
  const WALL_PROXIMITY = 50; // 벽 근접 거리
  
  for (const wall of walls) {
    const distance = calculateDistanceToWall(position, wall);
    if (distance <= WALL_PROXIMITY) {
      return { ...wall, distance };
    }
  }
  
  return null;
}

function calculateDistanceToWall(point, wall) {
  // 벽과 점 사이의 최단거리 계산
  const { x, y } = point;
  const { x1, y1, x2, y2 } = wall;
  
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  let param = dot / lenSq;
  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

module.exports = router;