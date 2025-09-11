const jwt = require('jsonwebtoken');
const { ServerUDPOptimizer, AdaptiveNetworkHandler, UDP_ADVANTAGEOUS_EVENTS, TCP_REQUIRED_EVENTS } = require('../utils/udpOptimization');

class UDPOptimizedMetaverseHandler {
  constructor(io) {
    this.io = io;
    this.maps = new Map(); // mapId -> Set of socketIds
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> { userId, username, mapId, characterId, position, status, characterInfo }
    this.privateAreas = new Map(); // privateAreaId -> Set of socketIds
    this.userStatuses = new Map(); // userId -> { isOnline, lastSeen, currentMap, currentPrivateArea, username, status }
    this.loggedInUsers = new Map(); // userId -> { id, username, socketId, ... }
    this.mapsList = new Map(); // mapId -> { id, name, creatorId, ... }

    // UDP 최적화 컴포넌트들
    this.udpOptimizer = new ServerUDPOptimizer(io);
    this.networkHandlers = new Map(); // socketId -> AdaptiveNetworkHandler
    this.positionBuffers = new Map(); // mapId -> 위치 데이터 버퍼
    this.lastPositionBroadcast = new Map(); // mapId -> timestamp

    // UDP 스타일 이벤트 설정
    this.setupUDPEvents();
    
    // 기존 시스템들
    this.loadMapsFromDatabase();
    this.loadUserMapStatusFromDatabase();
    
    // 최적화된 브로드캐스트 시스템
    this.startOptimizedBroadcast();
    
    // Ping/Pong 시스템으로 네트워크 품질 측정
    this.clientPingStatus = new Map();
    this.PING_INTERVAL = 5000; // 5초로 단축 (네트워크 품질 측정용)
    this.PONG_TIMEOUT = 15000; // 15초
    this.startPingPongSystem();
    
    // 서버 상태 관리
    this.serverState = {
      totalOnlineUsers: 0,
      lobbyUsers: [],
      mapUsers: {},
      maps: [],
      lastUpdated: null
    };
    
    // 프라이빗 영역 모니터링
    this.privateAreaUserCounts = new Map();
    this.startPrivateAreaMonitoring();
  }

  // UDP 스타일 이벤트 설정
  setupUDPEvents() {
    // 위치 업데이트는 UDP 방식으로 처리
    this.io.on('connection', (socket) => {
      // 네트워크 품질 핸들러 생성
      this.networkHandlers.set(socket.id, new AdaptiveNetworkHandler());

      // UDP 최적화된 위치 업데이트
      socket.on(UDP_ADVANTAGEOUS_EVENTS.POSITION_UPDATE, (data) => {
        this.handleUDPPositionUpdate(socket, data);
      });

      // 배치 위치 업데이트 처리
      socket.on('update-position-batch', (batchData) => {
        this.handleBatchPositionUpdate(socket, batchData);
      });

      // 압축된 위치 데이터 처리
      socket.on('update-position-compressed', (compressedData) => {
        this.handleCompressedPositionUpdate(socket, compressedData);
      });

      // 미디어 상태 업데이트 (UDP 스타일)
      socket.on(UDP_ADVANTAGEOUS_EVENTS.MEDIA_STATE, (data) => {
        this.handleUDPMediaStateUpdate(socket, data);
      });

      // 타이핑 표시 (UDP 스타일)
      socket.on(UDP_ADVANTAGEOUS_EVENTS.TYPING_INDICATOR, (data) => {
        this.handleUDPTypingIndicator(socket, data);
      });

      // 네트워크 품질 측정을 위한 핑/퐁
      socket.on('ping', (data) => {
        this.handlePing(socket, data);
      });

      socket.on('pong', (data) => {
        this.handlePong(socket, data);
      });

      // 연결 해제 시 정리
      socket.on('disconnect', () => {
        this.networkHandlers.delete(socket.id);
      });
    });
  }

  // UDP 최적화된 위치 업데이트 처리
  handleUDPPositionUpdate(socket, data) {
    const userInfo = this.socketUsers.get(socket.id);
    if (!userInfo) return;

    const now = Date.now();
    const mapId = userInfo.mapId;

    // 위치 정보 업데이트
    userInfo.position = data.position;
    userInfo.direction = data.direction;
    userInfo.lastUpdate = now;

    // 맵별 위치 버퍼에 추가
    if (!this.positionBuffers.has(mapId)) {
      this.positionBuffers.set(mapId, []);
    }

    const buffer = this.positionBuffers.get(mapId);
    
    // 사용자별 최신 위치만 유지 (UDP 스타일)
    const existingIndex = buffer.findIndex(item => item.userId === userInfo.userId);
    const positionData = {
      userId: userInfo.userId,
      username: userInfo.username,
      socketId: socket.id,
      position: data.position,
      direction: data.direction,
      timestamp: now,
      characterInfo: userInfo.characterInfo
    };

    if (existingIndex >= 0) {
      buffer[existingIndex] = positionData;
    } else {
      buffer.push(positionData);
    }

    // 네트워크 품질에 따른 적응형 브로드캐스트
    this.adaptiveBroadcast(mapId);
  }

  // 배치 위치 업데이트 처리
  handleBatchPositionUpdate(socket, batchData) {
    const { events, timestamp } = batchData;
    
    events.forEach(data => {
      this.handleUDPPositionUpdate(socket, data);
    });
  }

  // 압축된 위치 데이터 처리
  handleCompressedPositionUpdate(socket, compressedData) {
    // 압축 해제
    const decompressed = this.decompressPositionData(compressedData);
    this.handleUDPPositionUpdate(socket, decompressed);
  }

  // 압축 해제
  decompressPositionData(compressedData) {
    if (compressedData.compressed) {
      const [x, y, timestamp] = compressedData.compressed;
      return {
        position: { x, y },
        direction: compressedData.direction,
        timestamp
      };
    }
    return compressedData;
  }

  // 네트워크 품질 기반 적응형 브로드캐스트
  adaptiveBroadcast(mapId) {
    const now = Date.now();
    const lastBroadcast = this.lastPositionBroadcast.get(mapId) || 0;
    
    // 네트워크 품질에 따른 브로드캐스트 간격 결정
    let broadcastInterval = 50; // 기본 20fps
    
    // 맵의 사용자들의 평균 네트워크 품질 계산
    const socketIds = this.maps.get(mapId);
    if (socketIds) {
      let totalLatency = 0;
      let userCount = 0;
      
      socketIds.forEach(socketId => {
        const handler = this.networkHandlers.get(socketId);
        if (handler) {
          totalLatency += handler.latency;
          userCount++;
        }
      });
      
      if (userCount > 0) {
        const avgLatency = totalLatency / userCount;
        
        if (avgLatency < 50) {
          broadcastInterval = 33; // 30fps
        } else if (avgLatency < 100) {
          broadcastInterval = 50; // 20fps
        } else {
          broadcastInterval = 100; // 10fps
        }
      }
    }

    // 브로드캐스트 간격 체크
    if (now - lastBroadcast < broadcastInterval) return;

    this.broadcastPositions(mapId);
    this.lastPositionBroadcast.set(mapId, now);
  }

  // 위치 정보 브로드캐스트
  broadcastPositions(mapId) {
    const buffer = this.positionBuffers.get(mapId);
    if (!buffer || buffer.length === 0) return;

    const socketIds = this.maps.get(mapId);
    if (!socketIds || socketIds.size === 0) return;

    // 네트워크 품질별로 다른 방식으로 전송
    socketIds.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      const handler = this.networkHandlers.get(socketId);
      
      if (socket && handler) {
        const config = handler.getTransmissionConfig();
        
        if (config.useCompression) {
          // 압축된 형태로 전송
          const compressedBuffer = this.compressPositionBuffer(buffer);
          socket.emit('compressed-positions-update', compressedBuffer);
        } else if (config.batchSize > 1) {
          // 배치로 전송
          const batches = this.createPositionBatches(buffer, config.batchSize);
          batches.forEach(batch => {
            socket.emit('position-batch-update', batch);
          });
        } else {
          // 일반 전송
          socket.emit('all-users-update', {
            mapId: mapId,
            users: buffer,
            timestamp: Date.now()
          });
        }
      }
    });

    // 버퍼 정리 (오래된 데이터 제거)
    this.cleanPositionBuffer(mapId);
  }

  // 위치 버퍼 압축
  compressPositionBuffer(buffer) {
    return buffer.map(user => ({
      i: user.userId, // id 단축
      u: user.username.substring(0, 8), // username 단축
      p: [Math.round(user.position.x), Math.round(user.position.y)], // position 배열
      d: user.direction[0], // direction 첫 글자만
      t: user.timestamp
    }));
  }

  // 위치 데이터 배치 생성
  createPositionBatches(buffer, batchSize) {
    const batches = [];
    for (let i = 0; i < buffer.length; i += batchSize) {
      batches.push(buffer.slice(i, i + batchSize));
    }
    return batches;
  }

  // 위치 버퍼 정리
  cleanPositionBuffer(mapId) {
    const buffer = this.positionBuffers.get(mapId);
    if (!buffer) return;

    const now = Date.now();
    const maxAge = 2000; // 2초 이상 된 데이터 제거

    // 오래된 데이터 제거
    const cleanedBuffer = buffer.filter(item => now - item.timestamp < maxAge);
    this.positionBuffers.set(mapId, cleanedBuffer);
  }

  // UDP 스타일 미디어 상태 업데이트
  handleUDPMediaStateUpdate(socket, data) {
    const userInfo = this.socketUsers.get(socket.id);
    if (!userInfo) return;

    // 미디어 상태 업데이트
    userInfo.mediaState = data;

    // 방의 모든 사용자에게 즉시 브로드캐스트 (UDP 스타일)
    if (userInfo.mapId) {
      socket.to(`map-${userInfo.mapId}`).emit('user-media-state', {
        userId: userInfo.userId,
        username: userInfo.username,
        mediaState: data,
        timestamp: Date.now()
      });
    }
  }

  // UDP 스타일 타이핑 표시
  handleUDPTypingIndicator(socket, data) {
    const userInfo = this.socketUsers.get(socket.id);
    if (!userInfo) return;

    // 타이핑 상태는 즉시 전송하고 짧은 시간 후 자동 해제
    if (userInfo.mapId) {
      socket.to(`map-${userInfo.mapId}`).emit('user-typing', {
        userId: userInfo.userId,
        username: userInfo.username,
        isTyping: data.isTyping,
        timestamp: Date.now()
      });
    }

    // 5초 후 자동으로 타이핑 해제 (UDP의 무상태성 모방)
    if (data.isTyping) {
      setTimeout(() => {
        if (userInfo.mapId) {
          socket.to(`map-${userInfo.mapId}`).emit('user-typing', {
            userId: userInfo.userId,
            username: userInfo.username,
            isTyping: false,
            timestamp: Date.now()
          });
        }
      }, 5000);
    }
  }

  // 네트워크 품질 측정을 위한 핑 처리
  handlePing(socket, data) {
    const now = Date.now();
    
    // 핑 정보 기록
    if (!this.clientPingStatus.has(socket.id)) {
      this.clientPingStatus.set(socket.id, {});
    }
    
    const pingStatus = this.clientPingStatus.get(socket.id);
    pingStatus.lastPing = now;
    pingStatus.pingTimestamp = data.timestamp;

    // 즉시 퐁 응답
    socket.emit('pong', {
      timestamp: data.timestamp,
      serverTime: now
    });
  }

  // 퐁 응답 처리로 네트워크 품질 업데이트
  handlePong(socket, data) {
    const now = Date.now();
    const pingStatus = this.clientPingStatus.get(socket.id);
    const handler = this.networkHandlers.get(socket.id);
    
    if (pingStatus && handler && pingStatus.pingTimestamp) {
      // RTT 계산
      const rtt = now - pingStatus.pingTimestamp;
      
      // 패킷 손실률 추정 (핑/퐁 실패 비율)
      pingStatus.pongReceived = (pingStatus.pongReceived || 0) + 1;
      pingStatus.totalPings = (pingStatus.totalPings || 0) + 1;
      
      const packetLoss = 1 - (pingStatus.pongReceived / pingStatus.totalPings);
      
      // 네트워크 품질 업데이트
      handler.updateNetworkQuality(rtt, packetLoss);
      
      pingStatus.lastPong = now;
      pingStatus.latency = rtt;
    }
  }

  // 최적화된 브로드캐스트 시스템
  startOptimizedBroadcast() {
    // 고빈도 업데이트 (위치 등)
    setInterval(() => {
      this.maps.forEach((socketIds, mapId) => {
        if (socketIds.size > 0) {
          this.adaptiveBroadcast(mapId);
        }
      });
    }, 16); // 60fps

    // 저빈도 업데이트 (사용자 목록 등)
    setInterval(() => {
      this.broadcastUserLists();
    }, 1000); // 1초마다

    // 서버 상태 업데이트
    setInterval(() => {
      this.updateServerState();
    }, 5000); // 5초마다
  }

  // 사용자 목록 브로드캐스트 (TCP 방식)
  broadcastUserLists() {
    this.maps.forEach((socketIds, mapId) => {
      if (socketIds.size === 0) return;
      
      const users = [];
      socketIds.forEach(socketId => {
        const userInfo = this.socketUsers.get(socketId);
        if (userInfo) {
          users.push({
            userId: userInfo.userId,
            username: userInfo.username,
            socketId: socketId,
            characterInfo: userInfo.characterInfo,
            status: userInfo.status || 'online'
          });
        }
      });
      
      // 신뢰성이 중요한 사용자 목록은 TCP 방식으로 전송
      this.io.to(`map-${mapId}`).emit('participants-update', {
        mapId: mapId,
        participants: users,
        timestamp: Date.now(),
        reliable: true // TCP 전송 표시
      });
    });
  }

  // 서버 상태 업데이트
  updateServerState() {
    this.serverState.totalOnlineUsers = this.loggedInUsers.size;
    this.serverState.lastUpdated = new Date().toISOString();
    
    // 전체 클라이언트에게 서버 상태 브로드캐스트
    this.io.emit('server-state-update', this.serverState);
  }

  // 프라이빗 영역 모니터링 시작
  startPrivateAreaMonitoring() {
    setInterval(() => {
      this.privateAreas.forEach((socketIds, areaId) => {
        const currentUsers = [];
        let mapId = null;
        
        socketIds.forEach(socketId => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket && socket.connected) {
            const userInfo = this.socketUsers.get(socketId);
            if (userInfo) {
              currentUsers.push({
                userId: userInfo.userId,
                username: userInfo.username,
                position: userInfo.position,
                characterInfo: userInfo.characterInfo
              });
              
              if (!mapId) {
                mapId = socket.mapId;
              }
            }
          } else {
            socketIds.delete(socketId);
          }
        });

        // 프라이빗 영역 상태 업데이트
        const previousCount = this.privateAreaUserCounts.get(areaId)?.count || 0;
        this.privateAreaUserCounts.set(areaId, {
          count: currentUsers.length,
          users: currentUsers,
          mapId: mapId
        });

        // 사용자 수 변화가 있을 때만 브로드캐스트
        if (currentUsers.length !== previousCount) {
          if (mapId) {
            this.io.to(`map-${mapId}`).emit('private-area-update', {
              areaId: areaId,
              userCount: currentUsers.length,
              users: currentUsers,
              timestamp: Date.now()
            });
          }
        }
      });
    }, 1000);
  }

  // Ping/Pong 시스템 시작
  startPingPongSystem() {
    setInterval(() => {
      this.io.sockets.sockets.forEach((socket) => {
        if (socket.connected) {
          socket.emit('ping', { timestamp: Date.now() });
        }
      });
    }, this.PING_INTERVAL);

    // 응답 없는 클라이언트 정리
    setInterval(() => {
      this.clientPingStatus.forEach((status, socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket && status.lastPing && !status.lastPong) {
          const timeSinceLastPing = Date.now() - status.lastPing;
          if (timeSinceLastPing > this.PONG_TIMEOUT) {
            console.log(`클라이언트 ${socketId} 응답 없음으로 연결 해제`);
            socket.disconnect(true);
          }
        }
      });
    }, this.PONG_TIMEOUT);
  }

  // 정리 함수
  destroy() {
    if (this.udpOptimizer) {
      this.udpOptimizer.destroy();
    }
    this.networkHandlers.clear();
    this.positionBuffers.clear();
    this.lastPositionBroadcast.clear();
  }

  // 기존 데이터베이스 로드 함수들 (원본 유지)
  async loadMapsFromDatabase() {
    // 기존 구현 유지
  }

  async loadUserMapStatusFromDatabase() {
    // 기존 구현 유지
  }
}

module.exports = UDPOptimizedMetaverseHandler;