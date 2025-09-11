class SmoothMovementBroadcaster {
  constructor(io, metaverseHandler) {
    this.io = io;
    this.metaverseHandler = metaverseHandler;
    
    // 각 방별 사용자 위치 추적
    this.roomUserPositions = new Map(); // mapId -> { userId: { position, direction, lastUpdate, velocity } }
    
    // 움직임 보간을 위한 데이터
    this.userMovementData = new Map(); // userId -> { startPos, endPos, startTime, duration, isMoving }
    
    // 브로드캐스트 설정
    this.BROADCAST_INTERVAL = 50; // 50ms = 20fps (자연스러운 움직임)
    this.POSITION_INTERPOLATION_TIME = 200; // 200ms 보간
    this.INACTIVE_TIMEOUT = 5000; // 5초 동안 업데이트 없으면 비활성
    
    this.startSmoothBroadcast();
    this.startPositionCleanup();
  }

  // 사용자 위치 업데이트 (UDP 스타일 - 빈번한 업데이트)
  updateUserPosition(userId, mapId, position, direction) {
    if (!this.roomUserPositions.has(mapId)) {
      this.roomUserPositions.set(mapId, new Map());
    }

    const roomUsers = this.roomUserPositions.get(mapId);
    const currentTime = Date.now();
    const existingData = roomUsers.get(userId);

    if (existingData) {
      // 속도 계산 (자연스러운 보간을 위해)
      const timeDiff = currentTime - existingData.lastUpdate;
      const distanceX = position.x - existingData.position.x;
      const distanceY = position.y - existingData.position.y;
      
      const velocity = {
        x: timeDiff > 0 ? distanceX / timeDiff : 0,
        y: timeDiff > 0 ? distanceY / timeDiff : 0
      };

      // 움직임 데이터 업데이트
      this.userMovementData.set(userId, {
        startPos: existingData.position,
        endPos: position,
        startTime: currentTime,
        duration: this.POSITION_INTERPOLATION_TIME,
        isMoving: true,
        velocity: velocity
      });
    }

    // 위치 데이터 업데이트
    roomUsers.set(userId, {
      position: position,
      direction: direction,
      lastUpdate: currentTime,
      velocity: existingData?.velocity || { x: 0, y: 0 },
      isActive: true
    });
  }

  // 사용자 최종 위치 설정 (TCP 스타일 - 정확한 위치)
  setUserFinalPosition(userId, mapId, position, direction, areaInfo) {
    if (!this.roomUserPositions.has(mapId)) {
      this.roomUserPositions.set(mapId, new Map());
    }

    const roomUsers = this.roomUserPositions.get(mapId);
    const currentTime = Date.now();

    // 최종 위치로 즉시 설정
    roomUsers.set(userId, {
      position: position,
      direction: direction,
      lastUpdate: currentTime,
      velocity: { x: 0, y: 0 },
      isActive: true,
      areaInfo: areaInfo,
      isFinal: true
    });

    // 움직임 데이터 초기화
    this.userMovementData.delete(userId);

    console.log(`📍 사용자 ${userId} 최종 위치 설정: ${position.x}, ${position.y}`);
  }

  // 위치 보간 계산
  interpolatePosition(userId, currentTime) {
    const movementData = this.userMovementData.get(userId);
    if (!movementData || !movementData.isMoving) {
      return null;
    }

    const elapsed = currentTime - movementData.startTime;
    const progress = Math.min(elapsed / movementData.duration, 1);

    if (progress >= 1) {
      // 보간 완료
      this.userMovementData.delete(userId);
      return movementData.endPos;
    }

    // 부드러운 보간 (easeOutQuad)
    const easeProgress = 1 - Math.pow(1 - progress, 2);

    return {
      x: movementData.startPos.x + (movementData.endPos.x - movementData.startPos.x) * easeProgress,
      y: movementData.startPos.y + (movementData.endPos.y - movementData.startPos.y) * easeProgress
    };
  }

  // 자연스러운 움직임 브로드캐스트 시작
  startSmoothBroadcast() {
    setInterval(() => {
      const currentTime = Date.now();

      // 각 방별로 처리
      for (const [mapId, roomUsers] of this.roomUserPositions.entries()) {
        if (roomUsers.size === 0) continue;

        const smoothUserData = [];

        // 각 사용자의 부드러운 위치 계산
        for (const [userId, userData] of roomUsers.entries()) {
          if (!userData.isActive) continue;

          // 보간된 위치 계산
          const interpolatedPos = this.interpolatePosition(userId, currentTime);
          const displayPosition = interpolatedPos || userData.position;

          // 메타버스 핸들러에서 사용자 정보 가져오기
          const socketId = this.metaverseHandler.userSockets.get(userId);
          let userInfo = null;
          if (socketId) {
            userInfo = this.metaverseHandler.socketUsers.get(socketId);
          }

          smoothUserData.push({
            userId: userId,
            username: userInfo?.username || `User${userId}`,
            position: displayPosition,
            direction: userData.direction,
            velocity: userData.velocity,
            isMoving: this.userMovementData.has(userId),
            areaInfo: userData.areaInfo,
            characterInfo: userInfo?.characterInfo,
            timestamp: currentTime
          });
        }

        // 해당 방의 모든 사용자에게 부드러운 위치 정보 브로드캐스트
        this.io.to(`map-${mapId}`).emit('smooth-users-update', {
          mapId: mapId,
          users: smoothUserData,
          timestamp: currentTime,
          frameRate: 1000 / this.BROADCAST_INTERVAL
        });

        // 성능 모니터링
        if (smoothUserData.length > 0) {
          console.log(`🎮 Map ${mapId}: ${smoothUserData.length}명 위치 브로드캐스트 (${this.BROADCAST_INTERVAL}ms)`);
        }
      }
    }, this.BROADCAST_INTERVAL);
  }

  // 비활성 사용자 정리
  startPositionCleanup() {
    setInterval(() => {
      const currentTime = Date.now();

      for (const [mapId, roomUsers] of this.roomUserPositions.entries()) {
        for (const [userId, userData] of roomUsers.entries()) {
          // 일정 시간 동안 업데이트가 없으면 비활성화
          if (currentTime - userData.lastUpdate > this.INACTIVE_TIMEOUT) {
            userData.isActive = false;
            this.userMovementData.delete(userId);
            
            console.log(`⏰ 사용자 ${userId} 위치 업데이트 비활성화 (timeout)`);
          }
        }

        // 완전히 비활성화된 사용자 제거
        for (const [userId, userData] of roomUsers.entries()) {
          if (!userData.isActive && currentTime - userData.lastUpdate > this.INACTIVE_TIMEOUT * 2) {
            roomUsers.delete(userId);
            console.log(`🗑️ 사용자 ${userId} 위치 데이터 정리`);
          }
        }
      }
    }, 10000); // 10초마다 정리
  }

  // 사용자 제거
  removeUser(userId, mapId) {
    if (this.roomUserPositions.has(mapId)) {
      const roomUsers = this.roomUserPositions.get(mapId);
      roomUsers.delete(userId);
    }
    this.userMovementData.delete(userId);
    
    console.log(`👋 사용자 ${userId} 위치 추적 중단`);
  }

  // 방 통계
  getRoomStats(mapId) {
    const roomUsers = this.roomUserPositions.get(mapId);
    if (!roomUsers) return { totalUsers: 0, activeUsers: 0, movingUsers: 0 };

    const totalUsers = roomUsers.size;
    let activeUsers = 0;
    let movingUsers = 0;

    for (const [userId, userData] of roomUsers.entries()) {
      if (userData.isActive) activeUsers++;
      if (this.userMovementData.has(userId)) movingUsers++;
    }

    return { totalUsers, activeUsers, movingUsers };
  }

  // 전체 통계
  getGlobalStats() {
    let totalRooms = this.roomUserPositions.size;
    let totalUsers = 0;
    let activeUsers = 0;
    let movingUsers = 0;

    for (const [mapId, roomUsers] of this.roomUserPositions.entries()) {
      const stats = this.getRoomStats(mapId);
      totalUsers += stats.totalUsers;
      activeUsers += stats.activeUsers;
      movingUsers += stats.movingUsers;
    }

    return {
      totalRooms,
      totalUsers,
      activeUsers,
      movingUsers,
      broadcastInterval: this.BROADCAST_INTERVAL,
      frameRate: 1000 / this.BROADCAST_INTERVAL
    };
  }
}

module.exports = SmoothMovementBroadcaster;