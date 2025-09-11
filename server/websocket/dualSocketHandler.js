const dgram = require('dgram');
const net = require('net');
const jwt = require('jsonwebtoken');

class DualSocketHandler {
  constructor(io, metaverseHandler) {
    this.io = io;
    this.metaverseHandler = metaverseHandler;
    
    // UDP 서버 (실시간 위치 정보)
    this.udpServer = dgram.createSocket('udp4');
    this.udpPort = process.env.UDP_PORT || 7001;
    
    // TCP 서버 (영역 정보)
    this.tcpServer = net.createServer();
    this.tcpPort = process.env.TCP_PORT || 7002;
    
    // 클라이언트 연결 관리
    this.udpClients = new Map(); // clientId -> { address, port, userId, lastSeen }
    this.tcpClients = new Map(); // clientId -> { socket, userId, lastSeen }
    
    this.setupUDPServer();
    this.setupTCPServer();
    this.startCleanupInterval();
  }

  setupUDPServer() {
    this.udpServer.on('listening', () => {
      const address = this.udpServer.address();
      console.log(`🔵 UDP Server listening on ${address.address}:${address.port}`);
    });

    this.udpServer.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        this.handleUDPMessage(data, rinfo);
      } catch (error) {
        console.error('UDP 메시지 파싱 오류:', error);
      }
    });

    this.udpServer.on('error', (err) => {
      console.error('UDP Server 오류:', err);
    });

    this.udpServer.bind(this.udpPort, '0.0.0.0');
  }

  setupTCPServer() {
    this.tcpServer.on('connection', (socket) => {
      console.log(`🔴 TCP 클라이언트 연결: ${socket.remoteAddress}:${socket.remotePort}`);
      
      socket.on('data', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleTCPMessage(message, socket);
        } catch (error) {
          console.error('TCP 메시지 파싱 오류:', error);
        }
      });

      socket.on('close', () => {
        console.log(`🔴 TCP 클라이언트 연결 종료: ${socket.remoteAddress}:${socket.remotePort}`);
        this.removeTCPClient(socket);
      });

      socket.on('error', (error) => {
        console.error('TCP 소켓 오류:', error);
      });
    });

    this.tcpServer.listen(this.tcpPort, '0.0.0.0', () => {
      console.log(`🔴 TCP Server listening on port ${this.tcpPort}`);
    });
  }

  async handleUDPMessage(data, rinfo) {
    const { type, token, payload, clientId } = data;

    // 인증 토큰 검증
    if (!await this.verifyToken(token)) {
      return;
    }

    const userId = this.getUserIdFromToken(token);
    
    // 클라이언트 정보 업데이트
    this.udpClients.set(clientId, {
      address: rinfo.address,
      port: rinfo.port,
      userId: userId,
      lastSeen: Date.now()
    });

    switch (type) {
      case 'position_update':
        await this.handlePositionUpdate(payload, userId, clientId);
        break;
      case 'movement_start':
        await this.handleMovementStart(payload, userId);
        break;
      case 'heartbeat':
        this.handleUDPHeartbeat(clientId, userId);
        break;
    }
  }

  async handleTCPMessage(data, socket) {
    const { type, token, payload, clientId } = data;

    // 인증 토큰 검증
    if (!await this.verifyToken(token)) {
      socket.write(JSON.stringify({ error: 'Invalid token' }));
      return;
    }

    const userId = this.getUserIdFromToken(token);
    
    // 클라이언트 정보 업데이트
    this.tcpClients.set(clientId, {
      socket: socket,
      userId: userId,
      lastSeen: Date.now()
    });

    switch (type) {
      case 'movement_end':
        await this.handleMovementEnd(payload, userId, socket);
        break;
      case 'area_request':
        await this.handleAreaRequest(payload, userId, socket);
        break;
      case 'register_client':
        this.handleTCPRegistration(clientId, userId, socket);
        break;
    }
  }

  async handlePositionUpdate(payload, userId, clientId) {
    const { position, mapId, direction, characterInfo } = payload;
    
    try {
      // 메타버스 핸들러를 통해 위치 업데이트
      const socketId = this.metaverseHandler.userSockets.get(userId);
      if (socketId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          // 소켓 사용자 정보 업데이트
          const userInfo = this.metaverseHandler.socketUsers.get(socketId);
          if (userInfo) {
            userInfo.position = position;
            userInfo.direction = direction;
            userInfo.lastPositionUpdate = Date.now();
            
            // 캐릭터 정보 업데이트 (있는 경우)
            if (characterInfo) {
              userInfo.characterInfo = characterInfo;
            }
            
            this.metaverseHandler.socketUsers.set(socketId, userInfo);
            
            // 로그인 사용자 정보에도 위치 저장
            this.metaverseHandler.updateLoggedInUserInfo(userId, {
              위치: position,
              방향: direction,
              마지막위치업데이트: new Date().toISOString()
            });
          }

          // 같은 맵의 다른 사용자들에게 실시간 위치 정보 UDP 브로드캐스트
          if (mapId) {
            await this.broadcastPositionToMapUsers(mapId, userId, {
              userId,
              username: userInfo?.username,
              position,
              direction,
              characterInfo: userInfo?.characterInfo,
              timestamp: Date.now()
            });
          }

          // UDP 응답 (위치 업데이트 확인)
          const client = this.udpClients.get(clientId);
          if (client) {
            const response = {
              type: 'position_ack',
              userId: userId,
              timestamp: Date.now(),
              receivedPosition: position
            };
            this.sendUDPResponse(response, client.address, client.port);
          }
        }
      }
    } catch (error) {
      console.error(`UDP 위치 업데이트 처리 오류 (사용자: ${userId}):`, error);
      
      // 에러 응답
      const client = this.udpClients.get(clientId);
      if (client) {
        const errorResponse = {
          type: 'position_error',
          error: 'Position update failed',
          timestamp: Date.now()
        };
        this.sendUDPResponse(errorResponse, client.address, client.port);
      }
    }
  }

  async handleMovementEnd(payload, userId, socket) {
    const { position, mapId, finalDirection } = payload;
    
    try {
      // 영역 정보 계산
      const areaInfo = await this.calculateAreaInfo(position, mapId);
      
      // 사용자 위치 최종 업데이트
      const socketId = this.metaverseHandler.userSockets.get(userId);
      if (socketId) {
        const userInfo = this.metaverseHandler.socketUsers.get(socketId);
        if (userInfo) {
          userInfo.position = position;
          userInfo.direction = finalDirection;
          userInfo.currentArea = areaInfo;
          this.metaverseHandler.socketUsers.set(socketId, userInfo);
        }
      }

      // TCP로 영역 정보 전송
      const response = {
        type: 'movement_complete',
        payload: {
          finalPosition: position,
          areaInfo: areaInfo,
          timestamp: Date.now()
        }
      };

      socket.write(JSON.stringify(response) + '\n');
      
      // Socket.IO를 통해 다른 사용자들에게 최종 위치 브로드캐스트
      this.io.to(`map-${mapId}`).emit('user-final-position', {
        userId: userId,
        position: position,
        direction: finalDirection,
        areaInfo: areaInfo
      });

    } catch (error) {
      console.error('이동 완료 처리 오류:', error);
      const errorResponse = {
        type: 'error',
        message: 'Movement end processing failed'
      };
      socket.write(JSON.stringify(errorResponse) + '\n');
    }
  }

  async calculateAreaInfo(position, mapId) {
    // 데이터베이스에서 맵 정보 로드
    const Map = require('../models/Map');
    
    try {
      const map = await Map.findByPk(mapId);
      if (!map) {
        return { area: 'unknown', type: 'none' };
      }

      const mapData = map.toJSON();
      const { privateAreas = [], walls = [] } = mapData;

      // 프라이빗 영역 체크
      for (const area of privateAreas) {
        if (this.isPointInArea(position, area)) {
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
      const nearWall = this.getNearWall(position, walls);
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
        coordinates: position
      };

    } catch (error) {
      console.error('영역 정보 계산 오류:', error);
      return { area: 'unknown', type: 'error' };
    }
  }

  isPointInArea(point, area) {
    const { x, y } = point;
    const { x: ax, y: ay, width, height } = area;
    
    return x >= ax && x <= ax + width && y >= ay && y <= ay + height;
  }

  getNearWall(position, walls) {
    const WALL_PROXIMITY = 50; // 벽 근접 거리
    
    for (const wall of walls) {
      const distance = this.calculateDistanceToWall(position, wall);
      if (distance <= WALL_PROXIMITY) {
        return { ...wall, distance };
      }
    }
    
    return null;
  }

  calculateDistanceToWall(point, wall) {
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

  sendUDPResponse(data, address, port) {
    const message = Buffer.from(JSON.stringify(data));
    this.udpServer.send(message, port, address, (error) => {
      if (error) {
        console.error('UDP 응답 전송 오류:', error);
      }
    });
  }

  async verifyToken(token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      return true;
    } catch (error) {
      return false;
    }
  }

  getUserIdFromToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      return decoded.userId || decoded.id;
    } catch (error) {
      return null;
    }
  }

  handleUDPHeartbeat(clientId, userId) {
    const client = this.udpClients.get(clientId);
    if (client) {
      client.lastSeen = Date.now();
      this.sendUDPResponse({ type: 'heartbeat_ack' }, client.address, client.port);
    }
  }

  // 같은 맵의 사용자들에게 실시간 위치 정보 UDP 브로드캐스트
  async broadcastPositionToMapUsers(mapId, senderUserId, positionData) {
    try {
      // 해당 맵의 모든 사용자 찾기
      const mapUsers = this.metaverseHandler.maps.get(mapId);
      if (!mapUsers || mapUsers.size === 0) {
        return;
      }

      const allMapUsersData = [];
      
      // 해당 맵의 모든 사용자 정보 수집
      for (const socketId of mapUsers) {
        const userInfo = this.metaverseHandler.socketUsers.get(socketId);
        if (userInfo && userInfo.userId !== senderUserId) { // 송신자 제외
          allMapUsersData.push({
            userId: userInfo.userId,
            username: userInfo.username,
            position: userInfo.position || { x: 200, y: 200 },
            direction: userInfo.direction || 'down',
            characterInfo: userInfo.characterInfo,
            isActive: true,
            lastUpdate: userInfo.lastPositionUpdate || Date.now()
          });
        }
      }

      // 송신자의 업데이트된 정보도 포함
      allMapUsersData.push({
        userId: positionData.userId,
        username: positionData.username,
        position: positionData.position,
        direction: positionData.direction,
        characterInfo: positionData.characterInfo,
        isActive: true,
        lastUpdate: positionData.timestamp
      });

      // UDP 브로드캐스트 메시지 생성
      const broadcastMessage = {
        type: 'map_users_update',
        mapId: mapId,
        users: allMapUsersData,
        totalUsers: allMapUsersData.length,
        timestamp: Date.now()
      };

      // 해당 맵의 모든 사용자들에게 UDP로 전송
      let broadcastCount = 0;
      for (const socketId of mapUsers) {
        const userInfo = this.metaverseHandler.socketUsers.get(socketId);
        if (userInfo) {
          // UDP 클라이언트 정보 찾기
          const udpClient = this.findUDPClientByUserId(userInfo.userId);
          if (udpClient) {
            this.sendUDPResponse(broadcastMessage, udpClient.address, udpClient.port);
            broadcastCount++;
          }
        }
      }

      // 브로드캐스트 통계 로깅 (5초마다 한 번씩만)
      if (!this.lastBroadcastLog || (Date.now() - this.lastBroadcastLog) > 5000) {
        console.log(`📡 UDP 위치 브로드캐스트: 맵 ${mapId}, ${broadcastCount}명에게 전송`);
        this.lastBroadcastLog = Date.now();
      }

    } catch (error) {
      console.error(`UDP 위치 브로드캐스트 오류 (맵: ${mapId}):`, error);
    }
  }

  // 사용자 ID로 UDP 클라이언트 찾기
  findUDPClientByUserId(userId) {
    for (const [clientId, client] of this.udpClients.entries()) {
      if (client.userId === userId) {
        return client;
      }
    }
    return null;
  }

  handleTCPRegistration(clientId, userId, socket) {
    this.tcpClients.set(clientId, {
      socket: socket,
      userId: userId,
      lastSeen: Date.now()
    });
    
    socket.write(JSON.stringify({
      type: 'registration_ack',
      clientId: clientId,
      timestamp: Date.now()
    }) + '\n');
  }

  removeTCPClient(socket) {
    for (const [clientId, client] of this.tcpClients.entries()) {
      if (client.socket === socket) {
        this.tcpClients.delete(clientId);
        break;
      }
    }
  }

  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1분 타임아웃

      // UDP 클라이언트 정리
      for (const [clientId, client] of this.udpClients.entries()) {
        if (now - client.lastSeen > timeout) {
          this.udpClients.delete(clientId);
          console.log(`🔵 UDP 클라이언트 타임아웃: ${clientId}`);
        }
      }

      // TCP 클라이언트 정리
      for (const [clientId, client] of this.tcpClients.entries()) {
        if (now - client.lastSeen > timeout) {
          client.socket.destroy();
          this.tcpClients.delete(clientId);
          console.log(`🔴 TCP 클라이언트 타임아웃: ${clientId}`);
        }
      }
    }, 30000); // 30초마다 정리
  }

  getStatus() {
    return {
      udp: {
        port: this.udpPort,
        clients: this.udpClients.size
      },
      tcp: {
        port: this.tcpPort,
        clients: this.tcpClients.size
      }
    };
  }
}

module.exports = DualSocketHandler;