const jwt = require('jsonwebtoken');
const AreaVideoCallManager = require('./areaVideoCallManager');

class MetaverseHandler {
  constructor(io) {
    this.io = io;
    this.maps = new Map(); // mapId -> Set of socketIds
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> { userId, username, mapId, characterId, position, status, characterInfo }
    this.privateAreas = new Map(); // privateAreaId -> Set of socketIds
    this.userStatuses = new Map(); // userId -> { isOnline, lastSeen, currentMap, currentPrivateArea, username, status }
    this.loggedInUsers = new Map(); // userId -> { id, username, socketId, ... }
    this.mapsList = new Map(); // mapId -> { id, name, creatorId, ... }

    // 영역 기반 화상통화 매니저 초기화
    this.areaVideoCallManager = new AreaVideoCallManager();
    // 의존성 주입: 알림 발송을 위해 자기 자신을 참조로 설정
    this.areaVideoCallManager.setMetaverseHandler(this);

    // 🎯 영역 상태 관리 시스템
    this.userAreaStates = new Map(); // userId -> { areaId, areaType, mapId, lastUpdate }
    this.areaGroups = new Map(); // areaKey -> Set<userId> (실시간 영역별 사용자 그룹)
    this.videoCallSessions = new Map(); // areaKey -> { participants, startTime, isActive }

    // 0.5초마다 각 맵의 모든 사용자 정보를 브로드캐스트
    this.startBroadcastInterval();

    this.loadMapsFromDatabase();
    this.loadUserMapStatusFromDatabase(); // 사용자 입실 상태 로드
    
    // Ping/Pong 시스템 설정
    this.clientPingStatus = new Map(); // socketId -> { lastPing, lastPong }
    this.PING_INTERVAL = 30000; // 30초
    this.PONG_TIMEOUT = 60000; // 60초
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
    this.privateAreaUserCounts = new Map(); // privateAreaId -> { count, users }
    this.startPrivateAreaMonitoring();
  }

  // 0.5초마다 각 맵의 모든 사용자 정보를 브로드캐스트
  startBroadcastInterval() {
    setInterval(() => {
      // 각 맵별로 처리
      for (const [mapId, socketIds] of this.maps.entries()) {
        if (socketIds.size === 0) continue;
        
        // 해당 맵의 모든 사용자 정보 수집
        const users = [];
        for (const socketId of socketIds) {
          const userInfo = this.socketUsers.get(socketId);
          if (userInfo) {
            users.push({
              userId: userInfo.userId,
              username: userInfo.username,
              socketId: socketId,
              position: userInfo.position || { x: 200, y: 200 },
              direction: userInfo.direction || 'down',
              characterInfo: userInfo.characterInfo
            });
          }
        }
        
        // 해당 맵의 모든 사용자에게 전송
        this.io.to(`map-${mapId}`).emit('all-users-update', {
          mapId: mapId,
          users: users,
          timestamp: new Date()
        });
      }
    }, 500); // 0.5초마다
  }

  // 프라이빗 영역 모니터링 시작
  startPrivateAreaMonitoring() {
    setInterval(() => {
      // 각 프라이빗 영역별로 사용자 수 변화 체크
      for (const [areaId, socketIds] of this.privateAreas.entries()) {
        const currentUsers = [];
        let mapId = null;
        
        // 현재 영역의 사용자 정보 수집
        for (const socketId of socketIds) {
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
              
              // 맵 ID 저장 (모든 사용자는 같은 맵에 있어야 함)
              if (!mapId) {
                mapId = socket.mapId;
              }
            }
          } else {
            // 연결되지 않은 소켓 제거
            socketIds.delete(socketId);
          }
        }
        
        // 이전 상태와 비교
        const previousState = this.privateAreaUserCounts.get(areaId);
        const currentCount = currentUsers.length;
        const previousCount = previousState?.count || 0;
        
        // 변화가 있거나 처음 체크하는 경우
        if (!previousState || currentCount !== previousCount || 
            JSON.stringify(previousState.users) !== JSON.stringify(currentUsers)) {
          
          // 상태 업데이트
          this.privateAreaUserCounts.set(areaId, {
            count: currentCount,
            users: currentUsers,
            lastUpdated: new Date()
          });
          
          // 변화가 있으면 해당 영역의 모든 사용자에게 브로드캐스트
          if (currentCount > 0) {
            // 새로 들어온 사용자 찾기
            let newUsers = [];
            let leftUsers = [];
            
            if (previousState && previousState.users) {
              // 새로 들어온 사용자 찾기
              newUsers = currentUsers.filter(currentUser => 
                !previousState.users.some(prevUser => prevUser.userId === currentUser.userId)
              );
              
              // 나간 사용자 찾기
              leftUsers = previousState.users.filter(prevUser =>
                !currentUsers.some(currentUser => currentUser.userId === prevUser.userId)
              );
            } else {
              // 처음 생성된 영역이면 모든 사용자가 새로운 사용자
              newUsers = currentUsers;
            }
            
            const updateData = {
              areaId: areaId,
              userCount: currentCount,
              users: currentUsers,
              newUsers: newUsers,    // 새로 들어온 사용자들
              leftUsers: leftUsers,   // 나간 사용자들
              timestamp: new Date(),
              changeType: previousCount === 0 ? 'initial' : 
                        currentCount > previousCount ? 'user_joined' : 
                        currentCount < previousCount ? 'user_left' : 'user_updated'
            };
            
            // 해당 프라이빗 영역의 모든 사용자에게 전송
            this.io.to(`private-area-${areaId}`).emit('private-area-users-changed', updateData);
            
            // 같은 맵의 다른 사용자들에게도 영역 상태 알림
            if (mapId) {
              this.io.to(`map-${mapId}`).emit('private-area-status-changed', {
                mapId: mapId,
                areaId: areaId,
                userCount: currentCount,
                changeType: updateData.changeType
              });
            }
            
            console.log(`🔍 프라이빗 영역 ${areaId} 변화 감지: ${previousCount}명 → ${currentCount}명 (${updateData.changeType})`);
          }
        }
      }
      
      // 빈 영역 정리
      for (const [areaId, state] of this.privateAreaUserCounts.entries()) {
        if (!this.privateAreas.has(areaId) || state.count === 0) {
          this.privateAreaUserCounts.delete(areaId);
          console.log(`🧹 빈 프라이빗 영역 ${areaId} 정리`);
        }
      }
    }, 1000); // 1초마다 체크
  }
  
  // Ping/Pong 시스템 시작
  startPingPongSystem() {
    setInterval(() => {
      const now = Date.now();
      
      // 모든 연결된 소켓에 ping 전송
      for (const [socketId, userInfo] of this.socketUsers.entries()) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (!socket) continue;
        
        const pingStatus = this.clientPingStatus.get(socketId);
        
        // 타임아웃 체크
        if (pingStatus && pingStatus.lastPing) {
          const timeSinceLastPong = now - (pingStatus.lastPong || pingStatus.lastPing);
          
          if (timeSinceLastPong > this.PONG_TIMEOUT) {
            console.log(`⚠️ Ping 타임아웃 감지: ${userInfo.username} (${socketId}) - ${timeSinceLastPong}ms`);
            this.cleanupZombieSocket(socketId, userInfo.userId, userInfo.username);
            continue;
          }
        }
        
        // 새로운 ping 전송
        const pingData = { timestamp: now, id: Math.random() };
        socket.emit('ping', pingData);
        
        this.clientPingStatus.set(socketId, {
          lastPing: now,
          lastPong: pingStatus?.lastPong || now,
          pingData: pingData
        });
      }
      
      console.log(`🏓 Ping 전송 완료: ${this.socketUsers.size}개 소켓`);
    }, this.PING_INTERVAL);
  }
  
  // 좀비 소켓 정리
  cleanupZombieSocket(socketId, userId, username) {
    console.log(`🧟 좀비 소켓 정리 시작: ${username} (${socketId})`);
    
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      // 클라이언트에 연결 타임아웃 알림
      socket.emit('connection-timeout', {
        message: '서버와의 연결이 끊어졌습니다. 페이지를 새로고침해주세요.',
        reason: 'ping_timeout'
      });
      
      // 소켓 강제 종료
      socket.disconnect(true);
    }
    
    // Ping 상태 제거
    this.clientPingStatus.delete(socketId);
    
    // 사용자 정보는 유지하되 오프라인 상태로 변경
    const userInfo = this.loggedInUsers.get(userId);
    if (userInfo) {
      console.log(`📊 좀비 정리 - 사용자 오프라인 처리: ${username} (방 정보 유지: ${userInfo.mapId})`);
      this.updateLoggedInUserInfo(userId, {
        socketId: null,
        isOnline: false,
        연결상태: '오프라인 (타임아웃)',
        마지막활동: new Date().toISOString()
        // mapId, privateAreaId 등은 그대로 유지
      });
    }
    
    // 소켓 매핑 정리
    this.socketUsers.delete(socketId);
    if (userId) {
      this.userSockets.delete(userId);
    }
    
    // 맵에서 제거 (실제로 나가는 것이 아니라 오프라인 처리만)
    for (const [mapId, mapSockets] of this.maps.entries()) {
      if (mapSockets.has(socketId)) {
        mapSockets.delete(socketId);
        console.log(`🗺️ 맵 ${mapId}에서 좀비 소켓 제거: ${username}`);
        
        // 참가자 목록 업데이트
        const participants = this.getParticipantsInMap(mapId);
        this.io.to(`map-${mapId}`).emit('update-participants', { mapId, participants });
      }
    }
    
    // 프라이빗 영역에서 제거
    for (const [areaId, areaSockets] of this.privateAreas.entries()) {
      if (areaSockets.has(socketId)) {
        areaSockets.delete(socketId);
        console.log(`🎬 프라이빗 영역 ${areaId}에서 좀비 소켓 제거: ${username}`);
      }
    }
    
    console.log(`✅ 좀비 소켓 정리 완료: ${username}`);
    
    // 전체 사용자 정보 브로드캐스트
    this.broadcastAllLoggedInUsersInfo();
    this.broadcastOnlineUsers();
    this.updateMapsParticipants();
    this.broadcastServerState();
  }

  handleConnection(socket) {
    console.log('새로운 mini area WebSocket 연결:', socket.id, 'IP:', socket.handshake.address);

    socket.on('authenticate', async (data) => {
      try {
        const token = data.token;
        if (!token) {
          throw new Error('인증 토큰이 없습니다.');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        socket.userId = decoded.userId;

        const User = require('../models/User');
        const user = await User.findByPk(decoded.userId);
        socket.username = user ? user.username : (decoded.username || 'Unknown');
        
        // 중복 로그인 검증 - 기존 연결이 있는지 확인
        const existingSocketId = this.userSockets.get(socket.userId);
        if (existingSocketId && existingSocketId !== socket.id && this.socketUsers.has(existingSocketId)) {
          // 기존 소켓이 실제로 연결되어 있는지 확인
          const existingSocket = this.io.sockets.sockets.get(existingSocketId);
          if (existingSocket && existingSocket.connected) {
            // 기존 연결의 IP와 새 연결의 IP 비교
            const existingIP = existingSocket.handshake.address;
            const newIP = socket.handshake.address;
            
            // 같은 IP에서의 연결이면 기존 연결을 대체 (페이지 새로고침, 재연결 허용)
            if (existingIP === newIP) {
              console.log(`🔄 같은 IP에서 재연결: ${socket.username} (${socket.userId}) - 기존 연결 대체`);
              
              // 기존 연결을 정리하고 새 연결을 허용
              existingSocket.disconnect();
              this.socketUsers.delete(existingSocketId);
            } else {
              // 다른 IP에서의 연결이면 차단
              console.log(`❌ 다른 IP에서 중복 로그인 시도 차단: ${socket.username} (${socket.userId})`);
              console.log(`   기존 IP: ${existingIP}, 새 IP: ${newIP}`);
              
              // 새로운 연결 시도를 차단하고 에러 메시지 전송
              socket.emit('login-error', { 
                message: '이미 다른 기기에서 로그인되어 있습니다.',
                code: 'DUPLICATE_LOGIN_BLOCKED'
              });
              socket.disconnect();
              return;
            }
          } else {
            // 기존 소켓이 실제로는 연결되어 있지 않다면 정리
            console.log(`🧹 끊어진 기존 연결 정리: ${socket.username} (${socket.userId})`);
            this.socketUsers.delete(existingSocketId);
            this.loggedInUsers.delete(socket.userId);
            this.userSockets.delete(socket.userId);
          }
        }

        // 사용자명 중복 확인 (같은 맵에서 동일한 username이 있는지 확인)
        const currentMapId = socket.mapId;
        if (currentMapId) {
          const mapSockets = this.maps.get(currentMapId);
          if (mapSockets) {
            for (const existingSocketId of mapSockets) {
              const existingSocket = this.io.sockets.sockets.get(existingSocketId);
              if (existingSocket && existingSocket.username === socket.username && existingSocket.userId !== socket.userId) {
                console.log(`⚠️ 사용자명 중복 감지: ${socket.username} - 기존 사용자: ${existingSocket.userId}, 새 사용자: ${socket.userId}`);
                // 중복된 사용자명에 접미사 추가
                socket.username = `${socket.username}_${socket.userId}`;
                console.log(`✅ 사용자명 변경: ${socket.username}`);
                break;
              }
            }
          }
        }
        
        console.log(`✅ 인증 성공: ${socket.username} (${socket.userId})`);

        this.userSockets.set(socket.userId, socket.id);
        this.socketUsers.set(socket.id, { userId: socket.userId, username: socket.username, status: 'online', joinedAt: new Date() });
        this.updateUserStatus(socket.userId, { isOnline: true, lastSeen: new Date(), username: socket.username, status: 'online' });

        // 사용자의 이전 입실 상태 확인 및 복원
        const existingUserInfo = this.loggedInUsers.get(socket.userId);
        if (existingUserInfo && existingUserInfo.mapId) {
          console.log(`🔄 [온라인] 사용자 이전 입실 상태 복원: ${socket.username} (ID: ${socket.userId}) → 맵 ${existingUserInfo.mapId}`);
          console.log(`   📍 이전 위치: (${existingUserInfo.위치?.x || 'N/A'}, ${existingUserInfo.위치?.y || 'N/A'}), 방향: ${existingUserInfo.방향 || 'N/A'}`);
          
          // 이전 입실 상태로 복원
          this.updateLoggedInUserInfo(socket.userId, {
            id: socket.userId,
            username: socket.username,
            socketId: socket.id,
            mapId: existingUserInfo.mapId,
            위치: existingUserInfo.위치,
            방향: existingUserInfo.방향,
            마지막활동: new Date().toISOString(),
            isOnline: true,
            연결상태: '온라인'
          });
          
          // 자동으로 이전 맵에 재입장
          setTimeout(() => {
            this.autoRejoinMap(socket, existingUserInfo);
          }, 1000); // 1초 후 자동 재입장
        } else {
          // 새로운 사용자 또는 대기실 사용자
          console.log(`✨ [온라인] 새로운 사용자 또는 대기실 입장: ${socket.username} (ID: ${socket.userId})`);
          this.updateLoggedInUserInfo(socket.userId, {
            id: socket.userId,
            username: socket.username,
            socketId: socket.id,
            mapId: 'wait',  // 대기실을 'wait'로 명시
            입실공간: '대기실',
            입장시간: new Date().toISOString(),
            isOnline: true,
            연결상태: '온라인'
          });
        }

        socket.emit('authenticated', { userId: socket.userId, username: socket.username });
        this.broadcastMapsList();
        this.broadcastServerState();

      } catch (error) {
        console.error(`❌ 인증 실패: ${error.message}`);
        socket.emit('unauthorized', { message: `인증 실패: ${error.message}` });
        socket.disconnect();
      }
    });

    // Ping/Pong 응답 처리
    socket.on('pong', (data) => {
      const now = Date.now();
      const pingStatus = this.clientPingStatus.get(socket.id);
      
      if (pingStatus && data && data.id === pingStatus.pingData?.id) {
        const latency = now - data.timestamp;
        this.clientPingStatus.set(socket.id, {
          ...pingStatus,
          lastPong: now,
          latency: latency
        });
        
        if (latency > 5000) {  // 5초 이상 지연
          console.log(`⚠️ 높은 지연 감지: ${socket.username} - ${latency}ms`);
        }
      }
    });

    socket.on('join-map', ({ mapId, characterId, position, characterInfo }) => {
      if (!socket.userId) return socket.emit('error', { message: '인증이 필요합니다.' });
      this.joinMap(socket, mapId, characterId, position, characterInfo);
    });

    socket.on('leave-map', () => {
      if (!socket.userId) return socket.emit('error', { message: '인증이 필요합니다.' });
      this.leaveMap(socket);
    });

    // 프라이빗 영역 입장/퇴장 처리
    socket.on('join-private-area', (data) => {
      if (!socket.userId) return socket.emit('error', { message: '인증이 필요합니다.' });
      const { privateAreaId, mapId } = data;
      console.log(`🎬 프라이빗 영역 입장 요청: ${socket.username} → 영역 ${privateAreaId}`);
      this.joinPrivateArea(socket, privateAreaId);
    });

    socket.on('leave-private-area', (data) => {
      if (!socket.userId) return socket.emit('error', { message: '인증이 필요합니다.' });
      console.log(`🎬 프라이빗 영역 퇴장 요청: ${socket.username}`);
      this.leavePrivateArea(socket);
    });

    // 자동 화상통화 초대 이벤트 처리
    socket.on('area-video-call-invite', async (data) => {
      if (!socket.userId) return socket.emit('error', { message: '인증이 필요합니다.' });
      
      const { targetUserId, areaKey, roomName, inviterInfo } = data;
      console.log(`📞 화상통화 자동 초대 요청: ${socket.username} → 사용자 ${targetUserId} (${areaKey})`);
      
      // AreaVideoCallManager가 있는 경우 처리
      if (this.areaVideoCallManager) {
        const result = await this.areaVideoCallManager.handleAutoVideoInvite(
          socket.userId, 
          targetUserId, 
          areaKey, 
          roomName
        );
        
        socket.emit('area-video-call-invite-result', {
          success: result,
          targetUserId,
          areaKey,
          reason: inviterInfo?.reason || 'unknown'
        });
      } else {
        console.error('❌ AreaVideoCallManager가 설정되지 않음');
        socket.emit('area-video-call-invite-result', {
          success: false,
          error: 'AreaVideoCallManager not available'
        });
      }
    });

    // 자동 화상통화 제거 이벤트 처리
    socket.on('area-video-call-remove', async (data) => {
      if (!socket.userId) return socket.emit('error', { message: '인증이 필요합니다.' });
      
      const { targetUserId, areaKey, roomName, reason } = data;
      console.log(`🚪 화상통화 자동 제거 요청: ${socket.username} → 사용자 ${targetUserId} (${areaKey})`);
      
      // AreaVideoCallManager가 있는 경우 처리
      if (this.areaVideoCallManager) {
        const result = await this.areaVideoCallManager.handleAutoVideoRemove(
          socket.userId, 
          targetUserId, 
          areaKey, 
          roomName
        );
        
        socket.emit('area-video-call-remove-result', {
          success: result,
          targetUserId,
          areaKey,
          reason: reason || 'unknown'
        });
      } else {
        console.error('❌ AreaVideoCallManager가 설정되지 않음');
        socket.emit('area-video-call-remove-result', {
          success: false,
          error: 'AreaVideoCallManager not available'
        });
      }
    });

    // 새로운 update-my-position 이벤트 처리 (0.2초마다 전송)
    socket.on('update-my-position', (data) => {
      if (!socket.userId) return;
      
      const userInfo = this.socketUsers.get(socket.id);
      if (!userInfo) return;

      // 위치 정보 업데이트 (브로드캐스트는 0.5초마다 일괄 처리)
      userInfo.position = data.position;
      userInfo.direction = data.direction;
      userInfo.lastPositionUpdate = new Date();

      // 영역 기반 위치 업데이트 처리 (다른 사용자들의 위치도 포함)
      if (data.position && socket.mapId) {
        this.updateUserAreaPosition(socket.userId, socket.mapId, data.position);
      }
      
      // 맵 정보가 포함되어 있으면 사용자 입실 상태 업데이트
      if (data.mapId && data.mapName) {
        // 사용자가 새로운 맵에 있는 경우 입실 처리
        if (socket.mapId !== data.mapId) {
          console.log(`📍 사용자 ${socket.username} 맵 이동 감지: ${socket.mapId} → ${data.mapId}`);
          // 기존 맵에서 나가고 새 맵으로 이동은 joinMap에서 처리
        }
        
        // 로그인 사용자 정보 업데이트 (입실 상태 유지)
        this.updateLoggedInUserInfo(socket.userId, {
          mapId: data.mapId,
          입실공간: data.mapName,
          위치: data.position,
          방향: data.direction,
          마지막활동: new Date().toISOString()
        });
      }
    });


    socket.on('get-all-maps', async (callback) => {
        try {
            const maps = await this.getAllMapsWithParticipants();
            if (typeof callback === 'function') callback(maps);
        } catch (error) {
            if (typeof callback === 'function') callback({ error: '맵 목록 조회 실패' });
        }
    });

    // 영역 기반 화상통화 이벤트 처리
    socket.on('start-area-video-call', (data, callback) => {
      if (!socket.userId) return callback({ error: '인증이 필요합니다.' });
      
      const userArea = this.areaVideoCallManager.getUserArea(socket.userId);
      if (!userArea) {
        return callback({ error: '현재 영역을 찾을 수 없습니다.' });
      }

      const result = this.startAreaVideoCall(socket.userId, userArea.areaKey);
      callback({ success: true, result });
    });

    socket.on('end-area-video-call', (data, callback) => {
      if (!socket.userId) return callback({ error: '인증이 필요합니다.' });
      
      const userArea = this.areaVideoCallManager.getUserArea(socket.userId);
      if (!userArea) {
        return callback({ error: '현재 영역을 찾을 수 없습니다.' });
      }

      const result = this.endAreaVideoCall(userArea.areaKey);
      callback({ success: true, result });
    });

    socket.on('get-area-video-session', (data, callback) => {
      if (!socket.userId) return callback({ error: '인증이 필요합니다.' });
      
      const userArea = this.areaVideoCallManager.getUserArea(socket.userId);
      if (!userArea) {
        return callback({ error: '현재 영역을 찾을 수 없습니다.' });
      }

      const participants = this.areaVideoCallManager.getVideoSession(userArea.areaKey);
      callback({ 
        success: true, 
        areaKey: userArea.areaKey,
        participants: participants || []
      });
    });

    // 색상 기반 화상통화 이벤트 처리 (새로 추가)
    socket.on('start-color-based-video-call', (data, callback) => {
      if (!socket.userId) return callback({ error: '인증이 필요합니다.' });
      
      const result = this.startColorBasedVideoCall(socket.userId);
      if (result.success) {
        callback({ success: true, result: result });
        
        // 같은 색상의 모든 사용자에게 알림
        this.notifyColorBasedVideoCallStart(result.color, result.participants, result.sessionKey);
      } else {
        callback({ success: false, error: result.error });
      }
    });

    // 영역 감시 시스템 상태 조회 (디버그용)
    socket.on('get-area-monitoring-status', (data, callback) => {
      if (!socket.userId) return callback({ error: '인증이 필요합니다.' });
      
      const status = this.areaVideoCallManager.getFullState();
      callback({ success: true, status });
    });

    socket.on('disconnect', () => this.handleDisconnect(socket));

    // 서버 상태 요청 처리 (스로틀링 적용)
    socket.on('request-server-state', () => {
      if (!socket.userId) return;
      
      const now = Date.now();
      const lastRequestTime = socket.lastServerStateRequest || 0;
      const REQUEST_THROTTLE = 500; // 500ms 스로틀링
      
      if (now - lastRequestTime < REQUEST_THROTTLE) {
        return; // 스로틀링으로 요청 제한
      }
      
      socket.lastServerStateRequest = now;
      this.sendServerStateToClient(socket);
    });

    // 캐릭터 업데이트 처리
    socket.on('character-updated', (data) => {
      this.handleCharacterUpdate(socket, data);
    });

    socket.on('request-all-users', () => {
      this.sendAllLoggedInUsersInfo(socket);
    });

    // 사용자 초대/응답 (1:1 화상통화 등)
    socket.on('user-invite', (targetUserId, inviteType = 'video', inviteData = {}) => {
      this.handleUserInvite(socket, targetUserId, inviteType, inviteData);
    });
    socket.on('invite-response', (fromUserId, accepted, responseData = {}) => {
      this.handleInviteResponse(socket, fromUserId, accepted, responseData);
    });
    
    // WebRTC 시그널링
    socket.on('webrtc-signal', (data) => {
      this.handleWebRTCSignal(socket, data);
    });
    
    // 통화 종료 신호 처리
    socket.on('end-video-call', (data) => {
      this.handleEndVideoCall(socket, data);
    });
    
    // 대기실 상태 업데이트 처리
    socket.on('update-lobby-status', (data) => {
      this.handleUpdateLobbyStatus(socket, data);
    });
    
    // 대기실 heartbeat 처리
    socket.on('waiting-room-heartbeat', () => {
      this.handleWaitingRoomHeartbeat(socket);
    });
    
    // 입실 중 heartbeat 처리
    socket.on('room-heartbeat', (data) => {
      this.handleRoomHeartbeat(socket, data);
    });
    
    // 채팅 메시지 처리
    socket.on('chat-message', (message, chatMode = 'area', targetUserId = null) => {
      console.log(`📨 채팅 메시지 수신 from ${socket.username}:`, {
        message,
        chatMode,
        targetUserId,
        userId: socket.userId,
        mapId: socket.mapId
      });
      this.handleChatMessage(socket, message, chatMode, targetUserId);
    });

    // 말풍선 메시지 처리
    socket.on('speech-bubble-message', (data) => {
      // 문자열 또는 객체 형태 지원
      const message = typeof data === 'string' ? data : data.message;
      const clientMapId = typeof data === 'object' ? data.mapId : null;
      
      console.log(`💭 말풍선 메시지 수신 from ${socket.username}:`, {
        message,
        clientMapId,
        userId: socket.userId,
        socketMapId: socket.mapId,
        finalMapId: socket.mapId || clientMapId
      });
      
      this.handleSpeechBubbleMessage(socket, message, clientMapId);
    });

    // 참가자 기반 자동 화상통화 시작
    socket.on('trigger-auto-video-call-from-participants', (data, callback) => {
      console.log(`🎥 [자동시작] 참가자 기반 화상통화 요청 from ${socket.username}:`, {
        participants: data.participants?.length,
        mapId: data.mapId,
        userId: socket.userId
      });

      this.handleTriggerAutoVideoCallFromParticipants(socket, data, callback);
    });
  }



  joinMap(socket, mapId, characterId, position, characterInfo) {
    console.log(`🏠 ${socket.username} 맵 입장 시작:`, {
      mapId,
      characterId,
      position,
      characterInfo: characterInfo ? '있음' : '없음',
      userId: socket.userId
    });
    this.leaveMap(socket, true); // Leave previous map silently

    // 맵 입장 시 사용자명 중복 확인 및 처리
    const mapSockets = this.maps.get(mapId);
    if (mapSockets) {
      for (const existingSocketId of mapSockets) {
        const existingSocket = this.io.sockets.sockets.get(existingSocketId);
        if (existingSocket && existingSocket.username === socket.username && existingSocket.userId !== socket.userId) {
          console.log(`⚠️ 맵 입장 시 사용자명 중복 감지: ${socket.username} - 기존 사용자: ${existingSocket.userId}, 새 사용자: ${socket.userId}`);
          // 중복된 사용자명에 접미사 추가
          socket.username = `${socket.username}_${socket.userId}`;
          console.log(`✅ 맵 입장 시 사용자명 변경: ${socket.username}`);
          break;
        }
      }
    }

    if (!this.maps.has(mapId)) {
      this.maps.set(mapId, new Set());
    }
    this.maps.get(mapId).add(socket.id);

    const socketUserInfo = this.socketUsers.get(socket.id);
    const initialPosition = position || { x: 200, y: 200 }; // 기본 시작점
    this.socketUsers.set(socket.id, {
        ...socketUserInfo,
        mapId,
        characterId,
        position: initialPosition,
        direction: 'down',
        characterInfo: characterInfo,
        lastPositionUpdate: new Date()
    });
    
    console.log(`🏠 ${socket.username} 맵 입장 - 초기 위치 설정:`, initialPosition);

    socket.join(`map-${mapId}`);
    socket.mapId = mapId;

    // 사용자 상태 업데이트
    this.updateUserStatus(socket.userId, { 
      currentMap: mapId, 
      status: 'in-map',
      lastSeen: new Date()
    });

    const mapInfo = this.mapsList.get(mapId);
    // 로그인 사용자 정보에 입실 정보 저장 (mapId만 사용)
    this.updateLoggedInUserInfo(socket.userId, {
        mapId: mapId,
        캐릭터: {
            이름: characterInfo?.name,
            ...(characterInfo || {})
        },
        입장시간: new Date().toISOString(),
        위치: initialPosition,
        방향: 'down',
        마지막활동: new Date().toISOString()
    });
    
    const mapName = mapInfo ? mapInfo.name : `방 ${mapId}`;
    console.log(`📊 사용자 입실 정보 저장 완료: ${socket.username}`, {
      mapId: mapId,
      mapName: mapName,
      캐릭터: characterInfo?.name || '기본 캐릭터',
      위치: initialPosition
    });
    
    // 데이터베이스에 입실 상태 저장
    this.saveUserMapStatusToDatabase(socket.userId, {
      mapId: mapId,
      position: initialPosition,
      direction: 'down'
    });

    const participants = this.getParticipantsInMap(mapId);
    console.log(`👥 방 ${mapId}의 참가자 목록:`, participants);
    this.io.to(`map-${mapId}`).emit('update-participants', { mapId, participants });
    
    // existing-users 이벤트 제거 - all-users-update로 대체
    
    // user-joined 이벤트 제거 - all-users-update로 대체
    
    console.log(`📢 Broadcasted updated participant list to room ${mapId}.`);
    console.log(`🏠 ${socket.username} 맵 입장 완료 - 최종 상태:`, {
      mapId: socket.mapId,
      position: this.socketUsers.get(socket.id)?.position,
      participants: this.getParticipantsInMap(mapId).length
    });
    this.broadcastMapsList();
    this.broadcastServerState(); // 서버 상태 업데이트
  }

  leaveMap(socket, isJoiningAnotherMap = false, isDisconnecting = false) {
    const { mapId, userId, username } = socket;
    if (!mapId) return;

    console.log(`🚪 ${username} leaving room ${mapId} (다른맵:${isJoiningAnotherMap}, 연결끊김:${isDisconnecting})`);
    const mapSockets = this.maps.get(mapId);
    if (mapSockets) {
      mapSockets.delete(socket.id);
      if (mapSockets.size === 0) {
        this.maps.delete(mapId);
      }
    }

    socket.leave(`map-${mapId}`);
    const leftMapId = socket.mapId;
    delete socket.mapId;

    // 연결이 끊긴 경우: 방 정보 영구 보존
    if (isDisconnecting) {
      console.log(`📊 연결 끊김 - 방 정보 유지: ${username} 맵 ${mapId}`);
      // 방 정보는 그대로 유지, handleDisconnect에서 오프라인 상태만 변경
    } 
    // 명시적으로 대기실로 나가는 경우만 'wait'로 변경
    else if (!isJoiningAnotherMap) {
        // 사용자 상태를 대기실로 변경
        this.updateUserStatus(userId, { 
          currentMap: null, 
          status: 'online',
          lastSeen: new Date()
        });
        
        // 명시적 퇴실 시에만 대기실로 변경
        this.updateLoggedInUserInfo(userId, {
            mapId: 'wait',  // 대기실을 'wait'로 명시
            입실공간: '대기실',
            privateAreaId: null,  // 대기실로 가면 영역 초기화
            현재영역: '대기실',
            위치: null,
            방향: null,
            마지막활동: new Date().toISOString()
        });
        
        console.log(`📊 명시적 퇴실 - 대기실로 이동: ${username} → 대기실 (mapId: wait)`);
      
      // 데이터베이스에서 입실 상태 제거
      this.saveUserMapStatusToDatabase(userId, {
        mapId: null,
        position: null,
        direction: null
      });
    }

    const participants = this.getParticipantsInMap(leftMapId);
    socket.to(`map-${leftMapId}`).emit('update-participants', { mapId: leftMapId, participants });
    
    // 사용자가 맵을 떠날 때 다른 사용자들에게 알림
    socket.to(`map-${leftMapId}`).emit('user-left', {
      username: username,
      timestamp: new Date()
    });
    
    console.log(`📢 leaveMap: Broadcasted updated participant list to room ${leftMapId}.`);

    this.broadcastMapInfo();
    this.broadcastServerState(); // 서버 상태 업데이트
    console.log(`user ${username} (${userId}) left room ${leftMapId}`);
  }




  async saveUserMapStatusToDatabase(userId, statusData) {
    try {
      const User = require('../models/User');
      
      const updateData = {
        currentMapId: statusData.mapId,
        lastPosition: statusData.position,
        lastDirection: statusData.direction,
        lastActivity: new Date()
      };
      
      await User.update(updateData, {
        where: { id: userId }
      });
      
      console.log(`💾 사용자 입실 상태 DB 저장: ${userId} → 맵 ${statusData.mapId}`);
      
    } catch (error) {
      console.error('❌ Failed to save user map status to database:', error);
    }
  }

  autoRejoinMap(socket, userInfo) {
    try {
      const mapId = userInfo.mapId;
      const position = userInfo.위치 || { x: 100, y: 100 };
      const direction = userInfo.방향 || 'down';
      
      // 맵이 존재하는지 확인
      if (!this.mapsList.has(mapId)) {
        console.log(`❌ 자동 재입장 실패: 맵 ${mapId}가 존재하지 않음`);
        return;
      }
      
      console.log(`🔄 자동 재입장 시도: ${socket.username} → 맵 ${mapId}`);
      
      // 맵에 자동 재입장
      this.joinMap(socket, mapId, null, position, null);
      
      // 클라이언트에 자동 재입장 알림
      socket.emit('auto-rejoin', {
        mapId: mapId,
        position: position,
        direction: direction,
        message: '이전 입실 상태가 복원되었습니다.'
      });
      
    } catch (error) {
      console.error('❌ 자동 재입장 실패:', error);
    }
  }

  updateUserStatus(userId, statusData) {
    const currentStatus = this.userStatuses.get(userId) || {};
    this.userStatuses.set(userId, { ...currentStatus, ...statusData });
  }

  updateLoggedInUserInfo(userId, userInfo) {
    const currentInfo = this.loggedInUsers.get(userId) || {};
    const updatedInfo = { ...currentInfo, ...userInfo, 마지막활동: new Date().toISOString() };

    // mapId 영구 보존 - 절대 null이나 undefined로 설정 불가
    // 오직 'wait' 또는 실제 맵 ID만 허용
    if (userInfo.mapId === null || userInfo.mapId === undefined) {
      if (currentInfo.mapId && currentInfo.mapId !== 'wait') {
        console.log(`⚠️ mapId 삭제 시도 차단 - 유지: ${currentInfo.mapId}`);
        updatedInfo.mapId = currentInfo.mapId;
      }
    }
    
    // privateAreaId 영구 보존 - 명시적으로 false나 null이 전달되지 않는 한 유지
    if (!('privateAreaId' in userInfo) && currentInfo.privateAreaId) {
      updatedInfo.privateAreaId = currentInfo.privateAreaId;
    }
    
    // 'wait' 상태일 때만 대기실로 설정
    if (updatedInfo.mapId === 'wait') {
      updatedInfo.입실공간 = '대기실';
      updatedInfo.privateAreaId = null; // 대기실에서는 프라이빗 영역 초기화
      updatedInfo.현재영역 = '대기실';
    } else if (updatedInfo.mapId) {
      const mapName = this.mapsList.get(updatedInfo.mapId)?.name || `방 ${updatedInfo.mapId}`;
      updatedInfo.입실공간 = mapName;
      
      // 현재 영역 정보 설정
      if (updatedInfo.privateAreaId) {
        updatedInfo.현재영역 = `프라이빗 영역 ${updatedInfo.privateAreaId}`;
      } else {
        updatedInfo.현재영역 = '공용 영역';
      }
    }

    const myMaps = Array.from(this.mapsList.values()).filter(map => map.creatorId === userId);
    updatedInfo.myMaps = myMaps;
    this.loggedInUsers.set(userId, updatedInfo);
    
    console.log(`📊 로그인 사용자 정보 업데이트: ${updatedInfo.username || userId}`, {
      입실공간: updatedInfo.입실공간,
      mapId: updatedInfo.mapId,
      현재영역: updatedInfo.현재영역,
      privateAreaId: updatedInfo.privateAreaId,
      캐릭터: updatedInfo.캐릭터?.이름,
      위치: updatedInfo.위치,
      마지막활동: updatedInfo.마지막활동
    });
    
    // 영구 보존 상태 확인
    if (updatedInfo.mapId && updatedInfo.mapId !== 'wait') {
      console.log(`✅ 방 정보 영구 보존: ${updatedInfo.username} → 맵 ${updatedInfo.mapId} (${updatedInfo.입실공간})`);
    }
    
    this.updateMapsParticipants();
    this.broadcastAllLoggedInUsersInfo();
    this.broadcastMapsList();
  }

  addMap(mapData) {
    console.log('🗺️ API를 통해 새 맵 추가:', mapData.name);
    this.mapsList.set(mapData.id, {
      ...mapData,
      participantCount: 0,
      participants: []
    });

    const creatorInfo = this.loggedInUsers.get(mapData.creatorId);
    if (creatorInfo) {
      creatorInfo.myMaps.push(mapData);
      this.loggedInUsers.set(mapData.creatorId, creatorInfo);
    }

    this.broadcastMapsList();
  }

  deleteMap(mapId) {
    const mapToDelete = this.mapsList.get(mapId);
    if (!mapToDelete) {
      console.log('⚠️ 삭제할 맵을 찾을 수 없음:', mapId);
      return;
    }

    console.log('🗺️ API를 통해 맵 삭제 시작:', {
      mapId: mapId,
      mapName: mapToDelete.name,
      creatorId: mapToDelete.creatorId,
      isPublic: mapToDelete.isPublic
    });

    const creatorId = mapToDelete.creatorId;
    
    // 맵에서 현재 입장 중인 사용자들에게 강제 퇴장 알림
    const mapSockets = this.maps.get(mapId);
    if (mapSockets && mapSockets.size > 0) {
      console.log(`🚨 맵 ${mapToDelete.name}에서 ${mapSockets.size}명의 사용자 강제 퇴장`);
      
      mapSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('map-deleted', {
            mapId: mapId,
            mapName: mapToDelete.name,
            message: `"${mapToDelete.name}" 가상공간이 삭제되어 대기실로 이동합니다.`
          });
          
          // 사용자 정보 업데이트
          const userInfo = this.loggedInUsers.get(socket.userId);
          if (userInfo) {
            userInfo.입실공간 = '대기실';
            userInfo.입장시간 = new Date().toISOString();
            this.loggedInUsers.set(socket.userId, userInfo);
          }
        }
      });
      
      // 맵에서 모든 소켓 제거
      this.maps.delete(mapId);
    }

    // 맵 목록에서 삭제
    this.mapsList.delete(mapId);

    // 생성자의 맵 목록에서도 제거
    const creatorInfo = this.loggedInUsers.get(creatorId);
    if (creatorInfo) {
      creatorInfo.myMaps = creatorInfo.myMaps.filter(map => map.id !== mapId);
      this.loggedInUsers.set(creatorId, creatorInfo);
      console.log(`👤 생성자 ${creatorInfo.username}의 맵 목록에서 제거됨`);
    }

    // 모든 클라이언트에게 맵 목록 업데이트 알림
    this.broadcastMapsList();
    
    // 모든 사용자 정보 업데이트
    this.broadcastAllLoggedInUsersInfo();
    
    console.log('✅ 맵 삭제 완료:', mapToDelete.name);
  }

  updateMap(mapData) {
    console.log('🗺️ API를 통해 맵 업데이트:', mapData.name);
    
    const existingMap = this.mapsList.get(mapData.id);
    if (!existingMap) {
      console.log('⚠️ 업데이트할 맵을 찾을 수 없습니다:', mapData.id);
      return;
    }

    // 기존 참가자 정보 유지하면서 맵 데이터 업데이트
    this.mapsList.set(mapData.id, {
      ...mapData,
      participantCount: existingMap.participantCount || 0,
      participants: existingMap.participants || []
    });

    // 생성자의 맵 목록도 업데이트
    const creatorInfo = this.loggedInUsers.get(mapData.creatorId);
    if (creatorInfo && creatorInfo.myMaps) {
      const mapIndex = creatorInfo.myMaps.findIndex(map => map.id === mapData.id);
      if (mapIndex !== -1) {
        creatorInfo.myMaps[mapIndex] = mapData;
        this.loggedInUsers.set(mapData.creatorId, creatorInfo);
      }
    }

    // 해당 맵에 있는 사용자들에게 업데이트 알림
    const mapSockets = this.maps.get(mapData.id);
    if (mapSockets && mapSockets.size > 0) {
      console.log(`📢 맵 ${mapData.name}에 있는 ${mapSockets.size}명의 사용자에게 업데이트 알림`);
      mapSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('map-updated', mapData);
        }
      });
    }

    this.broadcastMapsList();
  }

  broadcastAllLoggedInUsersInfo() {
    const allUsersInfo = Array.from(this.loggedInUsers.values());
    const onlineUsers = allUsersInfo.filter(user => user.isOnline);
    const offlineUsers = allUsersInfo.filter(user => !user.isOnline);
    
    console.log(`📊 [시스템] 전체 로그인 사용자 정보 브로드캐스트:`);
    console.log(`   전체: ${allUsersInfo.length}명 (온라인: ${onlineUsers.length}명, 오프라인: ${offlineUsers.length}명)`);
    
    const mapParticipantCounts = {}
    const mapParticipants = {}
    
    allUsersInfo.forEach(user => {
      const statusLabel = user.isOnline ? '[온라인]' : '[오프라인]';
      
      if (user.mapId && user.mapId !== null) {
        const mapName = this.mapsList.get(user.mapId)?.name || `방 ${user.mapId}`;
        if (!mapParticipantCounts[mapName]) {
          mapParticipantCounts[mapName] = 0
          mapParticipants[mapName] = []
        }
        mapParticipantCounts[mapName]++
        mapParticipants[mapName].push({
          id: user.id,
          username: user.username,
          캐릭터: user.캐릭터?.이름 || '기본 캐릭터',
          입장시간: user.입장시간,
          isOnline: user.isOnline
        })
        
        console.log(`📊 ${statusLabel} 입실 중인 사용자: ${user.username} → 맵 ${user.mapId} (${mapName}) (${user.캐릭터?.이름})`);
      } else {
        console.log(`📊 ${statusLabel} 대기실 사용자: ${user.username}`);
      }
    })
    
    this.io.emit('all-logged-in-users-updated', {
      users: allUsersInfo,
      totalUsers: allUsersInfo.length,
      mapParticipantCounts,
      mapParticipants,
      lobbyUsers: allUsersInfo.filter(u => !u.mapId || u.mapId === null).map(u => ({
        id: u.id,
        username: u.username,
        대기시간: u.입장시간
      })),
      timestamp: new Date().toISOString()
    });
  }


  sendAllLoggedInUsersInfo(socket) {
    const allUsersInfo = Array.from(this.loggedInUsers.values());
    const mapParticipantCounts = {};
    const mapParticipants = {};

    allUsersInfo.forEach(user => {
      if (user.mapId && user.mapId !== null) {
        const mapName = this.mapsList.get(user.mapId)?.name || `방 ${user.mapId}`;
        if (!mapParticipantCounts[mapName]) {
          mapParticipantCounts[mapName] = 0;
          mapParticipants[mapName] = [];
        }
        mapParticipantCounts[mapName]++;
        mapParticipants[mapName].push({
          id: user.id,
          username: user.username,
          캐릭터: user.캐릭터?.이름 || '기본 캐릭터',
          입장시간: user.입장시간
        });
      }
    });

    const onlineUsers = allUsersInfo.filter(user => user.isOnline);
    const offlineUsers = allUsersInfo.filter(user => !user.isOnline);

    socket.emit('all-logged-in-users-updated', {
      users: allUsersInfo,
      totalUsers: allUsersInfo.length,
      onlineParticipantCount: onlineUsers.length,
      offlineParticipantCount: offlineUsers.length,
      totalParticipantCount: allUsersInfo.length,
      mapParticipantCounts,
      mapParticipants,
      lobbyUsers: allUsersInfo.filter(u => !u.mapId || u.mapId === null).map(u => ({
        id: u.id,
        username: u.username,
        대기시간: u.입장시간,
        isOnline: u.isOnline
      })),
      lobbyParticipantCount: allUsersInfo.filter(u => !u.mapId || u.mapId === null).length,
      timestamp: new Date().toISOString()
    });
  }

  async loadMapsFromDatabase() {
    try {
      const Map = require('../models/Map');
      const User = require('../models/User');
      
      const maps = await Map.findAll({
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      this.mapsList.clear();
      
      maps.forEach(map => {
        this.mapsList.set(map.id, {
          id: map.id,
          name: map.name,
          creatorId: map.creatorId,
          isPublic: map.isPublic,
          creator: map.creator ? {
            id: map.creator.id,
            username: map.creator.username
          } : null,
          participantCount: 0,
          participants: []
        });
      });
      
      this.updateMapsParticipants();
      
    } catch (error) {
      console.error('❌ Failed to load room list:', error);
    }
  }

  async loadUserMapStatusFromDatabase() {
    try {
      const User = require('../models/User');
      
      // 입실 중인 사용자들 조회 (currentMapId가 null이 아닌 사용자)
      const usersInMaps = await User.findAll({
        where: {
          currentMapId: {
            [require('sequelize').Op.ne]: null
          }
        },
        attributes: ['id', 'username', 'currentMapId', 'lastPosition', 'lastDirection', 'lastActivity']
      });
      
      console.log(`📊 데이터베이스에서 입실 중인 사용자 ${usersInMaps.length}명 로드`);
      
      usersInMaps.forEach(user => {
        // loggedInUsers에 오프라인 상태로 저장 (재연결 시 복원됨)
        this.loggedInUsers.set(user.id, {
          id: user.id,
          username: user.username,
          mapId: user.currentMapId,
          위치: user.lastPosition,
          방향: user.lastDirection,
          마지막활동: user.lastActivity?.toISOString(),
          isOnline: false, // 오프라인 상태로 표시
          입장시간: user.lastActivity?.toISOString()
        });
        
        console.log(`📊 사용자 입실 상태 복원: ${user.username} → 맵 ${user.currentMapId}`);
      });
      
      this.updateMapsParticipants();
      
    } catch (error) {
      console.error('❌ Failed to load user map status:', error);
    }
  }

  updateMapsParticipants() {
    const allUsers = Array.from(this.loggedInUsers.values());
    
    for (const [mapId, mapInfo] of this.mapsList) {
      mapInfo.participantCount = 0;
      mapInfo.participants = [];
    }
    
    allUsers.forEach(user => {
      // 'wait' 상태가 아닌 실제 맵에 있는 사용자만 참가자로 계산
      if (user.mapId && user.mapId !== null && user.mapId !== 'wait') {
        const mapInfo = this.mapsList.get(user.mapId);
        if (mapInfo) {
          mapInfo.participantCount++;
          mapInfo.participants.push({
            id: user.id,
            username: user.username,
            socketId: user.socketId,
            위치: user.위치,
            캐릭터: user.캐릭터,
            입장시간: user.입장시간,
            마지막활동: user.마지막활동
          });
        }
      }
    });
    
    // 대기실 사용자는 mapId가 null, 'wait', 또는 없는 경우
    this.lobbyParticipantCount = allUsers.filter(u => !u.mapId || u.mapId === null || u.mapId === 'wait').length;
    this.lobbyParticipants = allUsers.filter(u => !u.mapId || u.mapId === null || u.mapId === 'wait').map(u => ({
      id: u.id,
      username: u.username,
      위치: u.위치,
      캐릭터: u.캐릭터?.이름
    }));
  }

  broadcastMapsList() {
    const mapsList = Array.from(this.mapsList.values());
    
    this.io.emit('maps-list-updated', {
      maps: mapsList,
      totalMaps: mapsList.length,
      lobbyParticipantCount: this.lobbyParticipantCount || 0,
      timestamp: new Date().toISOString()
    });
  }

  joinPrivateArea(socket, privateAreaId) {
    if (!socket.mapId) return;

    this.leavePrivateArea(socket);

    if (!this.privateAreas.has(privateAreaId)) {
      this.privateAreas.set(privateAreaId, new Set());
    }

    const areaSockets = this.privateAreas.get(privateAreaId);
    areaSockets.add(socket.id);

    socket.join(`private-area-${privateAreaId}`);
    socket.privateAreaId = privateAreaId;

    // socketUsers에 privateAreaId 반영
    const info = this.socketUsers.get(socket.id);
    if (info) {
      this.socketUsers.set(socket.id, { ...info, privateAreaId });
    }

    // 로그인 사용자 정보에 영역 정보 업데이트
    this.updateLoggedInUserInfo(socket.userId, {
      privateAreaId: privateAreaId,
      현재영역: `프라이빗 영역 ${privateAreaId}`,
      영역진입시간: new Date().toISOString()
    });

    this.updateUserStatus(socket.userId, { 
      currentPrivateArea: privateAreaId,
      status: 'in-private-area'
    });

    const participants = this.getParticipantsInPrivateArea(privateAreaId);
    
    // 본인에게 현재 영역 참가자 목록 전송
    socket.emit('private-area-participants', { 
      privateAreaId: privateAreaId,
      participants: participants,
      totalCount: participants.length
    });

    // 같은 프라이빗 영역의 다른 사용자들에게 새 참가자 알림
    socket.to(`private-area-${privateAreaId}`).emit('user-joined-private-area', {
      userId: socket.userId,
      username: socket.username,
      privateAreaId: privateAreaId,
      joinedAt: new Date(),
      currentParticipants: participants
    });
    
    // 프라이빗 영역에 있는 모든 사용자에게 전체 사용자 목록 전송 (화상통화용)
    this.io.to(`private-area-${privateAreaId}`).emit('private-area-video-update', {
      action: 'user-joined',
      privateAreaId: privateAreaId,
      newUser: {
        userId: socket.userId,
        username: socket.username
      },
      allUsers: participants
    });

    console.log(`🎬 ${socket.username} → 프라이빗 영역 ${privateAreaId} 입장 (참가자: ${participants.length}명)`);

    // 맵 참가자 목록에 privateAreaId 변화 반영하여 브로드캐스트
    if (socket.mapId) {
      const mapParticipants = this.getParticipantsInMap(socket.mapId);
      this.io.to(`map-${socket.mapId}`).emit('update-participants', { 
        mapId: socket.mapId, 
        participants: mapParticipants,
        privateAreaUpdate: {
          userId: socket.userId,
          username: socket.username,
          privateAreaId: privateAreaId,
          action: 'joined'
        }
      });
    }
    
    // 전체 로그인 사용자 정보 브로드캐스트 (영역 정보 포함)
    this.broadcastAllLoggedInUsersInfo();
    
    // 채널 기반 화상통화를 위한 정보 브로드캐스트
    const channelName = `${socket.mapId}_${privateAreaId}`;
    // broadcastChannelParticipants 제거 (정의되지 않은 함수)
    
    // 프라이빗 영역별 참가자 수 브로드캐스트
    this.broadcastPrivateAreaStatus(socket.mapId);
    
    // 모니터링 상태 즉시 업데이트
    const currentUsers = [];
    for (const socketId of areaSockets) {
      const userInfo = this.socketUsers.get(socketId);
      if (userInfo) {
        currentUsers.push({
          userId: userInfo.userId,
          username: userInfo.username,
          position: userInfo.position,
          characterInfo: userInfo.characterInfo
        });
      }
    }
    
    this.privateAreaUserCounts.set(privateAreaId, {
      count: currentUsers.length,
      users: currentUsers,
      lastUpdated: new Date()
    });
  }

  leavePrivateArea(socket) {
    if (!socket.privateAreaId) return;

    const privateAreaId = socket.privateAreaId;
    const areaSockets = this.privateAreas.get(privateAreaId);

    if (areaSockets) {
      areaSockets.delete(socket.id);
      
      if (areaSockets.size === 0) {
        this.privateAreas.delete(privateAreaId);
      }
    }

    // 남은 참가자 목록 먼저 가져오기
    const remainingParticipants = this.getParticipantsInPrivateArea(privateAreaId);
    
    socket.to(`private-area-${privateAreaId}`).emit('user-left-private-area', {
      userId: socket.userId,
      username: socket.username,
      leftAt: new Date()
    });
    
    // 프라이빗 영역에 있는 사용자들에게 퇴장 알림 (화상통화용)
    socket.to(`private-area-${privateAreaId}`).emit('private-area-video-update', {
      action: 'user-left',
      privateAreaId: privateAreaId,
      leftUser: {
        userId: socket.userId,
        username: socket.username
      },
      allUsers: remainingParticipants
    });

    socket.leave(`private-area-${privateAreaId}`);
    delete socket.privateAreaId;

    // socketUsers의 privateAreaId 제거
    const info = this.socketUsers.get(socket.id);
    if (info) {
      const { privateAreaId: _old, ...rest } = info;
      this.socketUsers.set(socket.id, { ...rest, privateAreaId: null });
    }

    // 로그인 사용자 정보에서 영역 정보 업데이트 (공용 영역으로)
    this.updateLoggedInUserInfo(socket.userId, {
      privateAreaId: null,
      현재영역: '공용 영역',
      영역퇴장시간: new Date().toISOString()
    });

    this.updateUserStatus(socket.userId, { 
      currentPrivateArea: null,
      status: 'in-map'
    });

    console.log(`🎬 ${socket.username} ← 프라이빗 영역 ${privateAreaId} 퇴장`);

    // 맵 참가자 목록에 privateAreaId 변화 반영하여 브로드캐스트
    if (socket.mapId) {
      const mapParticipants = this.getParticipantsInMap(socket.mapId);
      this.io.to(`map-${socket.mapId}`).emit('update-participants', { 
        mapId: socket.mapId, 
        participants: mapParticipants,
        privateAreaUpdate: {
          userId: socket.userId,
          username: socket.username,
          privateAreaId: privateAreaId,
          action: 'left',
          remainingParticipants: remainingParticipants
        }
      });
    }
    
    // 전체 로그인 사용자 정보 브로드캐스트 (영역 정보 포함)
    this.broadcastAllLoggedInUsersInfo();
    
    // 채널 기반 화상통화 정보 업데이트
    const channelName = `${socket.mapId}_${privateAreaId}`;
    // broadcastChannelParticipants 제거 (정의되지 않은 함수)
    
    // 프라이빗 영역별 참가자 수 브로드캐스트
    this.broadcastPrivateAreaStatus(socket.mapId);
    
    // 모니터링 상태 즉시 업데이트
    const currentUsers = [];
    for (const socketId of areaSockets) {
      const userInfo = this.socketUsers.get(socketId);
      if (userInfo) {
        currentUsers.push({
          userId: userInfo.userId,
          username: userInfo.username,
          position: userInfo.position,
          characterInfo: userInfo.characterInfo
        });
      }
    }
    
    this.privateAreaUserCounts.set(privateAreaId, {
      count: currentUsers.length,
      users: currentUsers,
      lastUpdated: new Date()
    });
  }

  handleChatMessage(socket, message, chatMode = 'area', targetUserId = null) {
    console.log(`📨 채팅 메시지 수신:`, { 
      message, 
      chatMode, 
      targetUserId, 
      userId: socket.userId,
      username: socket.username 
    });
    
    if (!socket.userId) {
      socket.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    const chatMessage = {
      content: message,
      username: socket.username,
      userId: socket.userId,
      timestamp: new Date(),
      type: chatMode,
      messageId: this.generateMessageId(),
      mapId: socket.mapId || null
    };

    // chatMode에 따라 다른 처리
    switch(chatMode) {
      case 'private': // 1:1 채팅 (쪽지)
        if (targetUserId) {
          // targetUserId가 숫자형 userId인지 문자형 username인지 확인
          console.log(`🔍 대상 찾기: targetUserId=${targetUserId}, type=${typeof targetUserId}`);
          
          let targetSocketId = this.userSockets.get(targetUserId);
          let targetUserInfo = null;
          let actualTargetUserId = targetUserId;
          
          // 숫자형으로도 시도
          if (!targetSocketId && typeof targetUserId === 'string') {
            const numericId = parseInt(targetUserId);
            if (!isNaN(numericId)) {
              targetSocketId = this.userSockets.get(numericId);
              if (targetSocketId) {
                actualTargetUserId = numericId;
                console.log(`✅ 숫자형 ID로 찾음: ${numericId}`);
              }
            }
          }
          
          // userId로 찾지 못했다면 username으로 찾기
          if (!targetSocketId) {
            for (const [userId, socketId] of this.userSockets.entries()) {
              const userInfo = this.socketUsers.get(socketId);
              console.log(`🔍 비교중: userId=${userId}, username=${userInfo?.username}`);
              if (userInfo && (
                userInfo.username === targetUserId || 
                userInfo.userId === targetUserId ||
                String(userInfo.userId) === String(targetUserId) ||
                userId === targetUserId ||
                String(userId) === String(targetUserId)
              )) {
                targetSocketId = socketId;
                targetUserInfo = userInfo;
                actualTargetUserId = userId;
                console.log(`✅ 대상 찾음: ${userInfo.username} (${userId})`);
                break;
              }
            }
          } else {
            targetUserInfo = this.socketUsers.get(targetSocketId);
          }
          
          if (targetSocketId && targetUserInfo) {
            const targetUsername = targetUserInfo.username || '알수없음';
            
            // 대상에게 전송 (받은 쪽지로 표시)
            this.io.to(targetSocketId).emit('chat-message', { 
              ...chatMessage, 
              type: 'private', 
              fromUserId: socket.userId,
              fromUsername: socket.username,
              isReceived: true 
            });
            
            // 발신자에게 전송 (보낸 쪽지로 표시)
            socket.emit('chat-message', { 
              ...chatMessage, 
              type: 'private', 
              toUserId: actualTargetUserId,
              toUsername: targetUsername,
              isSent: true 
            });
            
            console.log(`💌 1:1 쪽지: ${socket.username} → ${targetUsername}: ${message}`);
          } else {
            socket.emit('error', { message: '대상 사용자를 찾을 수 없습니다.' });
          }
        } else {
          socket.emit('error', { message: '1:1 쪽지 대상을 선택해주세요.' });
        }
        break;
        
      case 'area': // 영역별 채팅 (같은 맵)
        if (socket.mapId) {
          // 같은 맵에 있는 사용자들에게만 전송
          this.io.to(`map-${socket.mapId}`).emit('chat-message', chatMessage);
          console.log(`🗨️ 영역 채팅 (맵 ${socket.mapId}): ${socket.username}: ${message}`);
        } else {
          socket.emit('error', { message: '맵에 입장한 후 채팅을 사용할 수 있습니다.' });
        }
        break;
        
      case 'global': // 전체 채팅
        // 모든 연결된 사용자에게 전송
        this.io.emit('chat-message', { ...chatMessage, type: 'global' });
        console.log(`📢 전체 채팅: ${socket.username}: ${message}`);
        break;
        
      default:
        // 기본값은 영역별 채팅
        if (socket.mapId) {
          this.io.to(`map-${socket.mapId}`).emit('chat-message', chatMessage);
          console.log(`🗨️ 영역 채팅 (기본): ${socket.username}: ${message}`);
        }
    }
  }

  handleSpeechBubbleMessage(socket, message, clientMapId = null) {
    const mapId = socket.mapId || clientMapId;
    
    console.log(`💭 말풍선 메시지 처리:`, { 
      message, 
      userId: socket.userId,
      username: socket.username,
      socketMapId: socket.mapId,
      clientMapId,
      finalMapId: mapId
    });

    if (!mapId || !socket.userId) {
      console.log(`💭 말풍선 처리 실패: mapId=${mapId}, userId=${socket.userId}`);
      socket.emit('error', { message: '맵에 입장한 후 말풍선을 사용할 수 있습니다.' });
      return;
    }

    // 말풍선 메시지 객체 생성
    const speechBubbleMessage = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      userId: socket.userId,
      username: socket.username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      type: 'speech-bubble'
    };

    // 같은 맵에 있는 모든 사용자에게 말풍선 메시지 전송
    this.io.to(`map-${mapId}`).emit('speech-bubble-message', speechBubbleMessage);
    console.log(`💭 말풍선 전송 완료 (맵 ${mapId}): ${socket.username}: ${message}`);
  }

  handleTriggerAutoVideoCallFromParticipants(socket, data, callback) {
    const { participants, mapId } = data;
    
    console.log(`🎥 [자동시작] 참가자 기반 화상통화 처리 시작:`, {
      requesterId: socket.userId,
      requesterName: socket.username,
      mapId,
      participantCount: participants?.length
    });

    try {
      if (!mapId || !participants || participants.length < 2) {
        console.log(`🎥 [자동시작] 처리 실패: 조건 불충족`, { mapId, participantCount: participants?.length });
        if (callback) {
          callback({
            success: false,
            error: '참가자가 2명 이상이어야 합니다.'
          });
        }
        return;
      }

      // 같은 영역에 있는 사용자들끼리 자동 화상통화 시작 요청
      if (this.areaVideoCallManager) {
        console.log(`🎥 [자동시작] AreaVideoCallManager를 통한 자동 화상통화 시작 요청`);
        
        // 영역별로 그룹화된 참가자들에게 자동 화상통화 시작
        this.areaVideoCallManager.triggerAutoVideoCallForParticipants(mapId, participants);
        
        if (callback) {
          callback({
            success: true,
            message: '참가자 기반 자동 화상통화 요청이 처리되었습니다.',
            participantCount: participants.length
          });
        }
      } else {
        console.error(`🎥 [자동시작] AreaVideoCallManager를 사용할 수 없습니다.`);
        if (callback) {
          callback({
            success: false,
            error: '화상통화 매니저를 사용할 수 없습니다.'
          });
        }
      }
    } catch (error) {
      console.error(`🎥 [자동시작] 참가자 기반 화상통화 처리 오류:`, error);
      if (callback) {
        callback({
          success: false,
          error: '화상통화 시작 중 오류가 발생했습니다.'
        });
      }
    }
  }

  handleWebRTCSignal(socket, data) {
    const { type, targetUserId, fromUserId, ...signalData } = data;

    console.log(`📡 WebRTC 시그널 수신: ${type} from ${socket.username}(${fromUserId}) to ${targetUserId}`);

    if (!socket.userId || socket.userId !== fromUserId) {
      console.error('❌ WebRTC 시그널 인증 오류:', { socketUserId: socket.userId, fromUserId });
      socket.emit('error', { message: '인증 오류' });
      return;
    }

    // targetUserId가 username인지 userId인지 확인
    let targetSocketId = this.userSockets.get(targetUserId);
    console.log(`🔍 userId로 찾기: ${targetUserId} -> ${targetSocketId ? 'Found' : 'Not found'}`);
    
    // userId로 찾지 못했다면 username으로 찾기
    if (!targetSocketId) {
      for (const [userId, socketId] of this.userSockets.entries()) {
        const userInfo = this.socketUsers.get(socketId);
        if (userInfo && userInfo.username === targetUserId) {
          targetSocketId = socketId;
          console.log(`🔍 username으로 찾기 성공: ${targetUserId} -> userId: ${userId}, socketId: ${socketId}`);
          break;
        }
      }
    }
    
    if (!targetSocketId) {
      console.error(`❌ 대상 사용자 ${targetUserId}를 찾을 수 없음`);
      console.log('현재 연결된 사용자 목록:', Array.from(this.socketUsers.values()).map(u => ({ id: u.userId, username: u.username })));
      return;
    }

    const userInfo = this.socketUsers.get(socket.id);
    const targetUserInfo = this.socketUsers.get(targetSocketId);

    const bothSameMap = userInfo && targetUserInfo && userInfo.mapId && targetUserInfo.mapId && userInfo.mapId === targetUserInfo.mapId;

    if (bothSameMap) {
      console.log(`📡 WebRTC 시그널 전달: ${type} from ${socket.username} to ${targetUserId}`);
      this.io.to(targetSocketId).emit('webrtc-signal', {
        type,
        fromUserId,
        fromUsername: socket.username,
        ...signalData
      });
    } else {
      console.log('다른 맵 사용자에게 시그널링 시도 차단');
    }
  }

  handleEndVideoCall(socket, data) {
    const { targetUserId } = data;
    
    if (!targetUserId) {
      console.log('통화 종료 신호: 대상 사용자 ID 없음');
      return;
    }
    
    // targetUserId가 username인지 userId인지 확인
    let targetSocketId = this.userSockets.get(targetUserId);
    
    // userId로 찾지 못했다면 username으로 찾기
    if (!targetSocketId) {
      for (const [userId, socketId] of this.userSockets.entries()) {
        const userInfo = this.socketUsers.get(socketId);
        if (userInfo && userInfo.username === targetUserId) {
          targetSocketId = socketId;
          break;
        }
      }
    }
    
    if (targetSocketId) {
      console.log(`📞 통화 종료 신호 전달: ${socket.username} -> ${targetUserId}`);
      this.io.to(targetSocketId).emit('end-video-call', {
        fromUserId: socket.userId,
        fromUsername: socket.username
      });
    } else {
      console.log(`통화 종료 신호: 대상 사용자를 찾을 수 없음 - ${targetUserId}`);
    }
  }

  handleUpdateLobbyStatus(socket, data) {
    const { userId, username, mapId, 입실공간 } = data;
    
    // 사용자 인증 확인
    if (!socket.userId || socket.userId !== userId) {
      return;
    }
    
    console.log(`🏢 대기실 상태 업데이트: ${username} (${userId})`);
    
    // 로그인 사용자 정보를 대기실로 업데이트
    this.updateLoggedInUserInfo(userId, {
      mapId: 'wait',
      입실공간: '대기실',
      위치: null,
      방향: null,
      마지막활동: new Date().toISOString()
    });
    
    // 전체 사용자 정보 브로드캐스트
    this.broadcastAllLoggedInUsersInfo();
  }

  handleWaitingRoomHeartbeat(socket) {
    // 사용자 인증 확인
    if (!socket.userId) {
      return;
    }
    
    const userInfo = this.loggedInUsers.get(socket.userId);
    
    // 대기실에 있는 사용자만 heartbeat 처리
    if (userInfo && (userInfo.mapId === 'wait' || !userInfo.mapId)) {
      console.log(`💓 대기실 Heartbeat: ${socket.username} (${socket.userId})`);
      
      // 사용자 정보 업데이트 (마지막 활동 시간 갱신)
      this.updateLoggedInUserInfo(socket.userId, {
        mapId: 'wait',
        입실공간: '대기실',
        마지막활동: new Date().toISOString(),
        isOnline: true,
        연결상태: '온라인'
      });
      
      // 대기실의 모든 사용자에게 브로드캐스트
      this.broadcastWaitingRoomUsers();
    }
  }
  
  broadcastWaitingRoomUsers() {
    // 대기실 사용자만 필터링
    const waitingRoomUsers = Array.from(this.loggedInUsers.values())
      .filter(user => user.mapId === 'wait' || !user.mapId)
      .map(user => ({
        id: user.id,
        username: user.username,
        isOnline: user.isOnline,
        마지막활동: user.마지막활동,
        연결상태: user.연결상태 || (user.isOnline ? '온라인' : '오프라인')
      }));
    
    // 대기실 사용자들에게만 전송
    for (const [userId, socketId] of this.userSockets.entries()) {
      const userInfo = this.loggedInUsers.get(userId);
      if (userInfo && (userInfo.mapId === 'wait' || !userInfo.mapId)) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('waiting-room-users-updated', {
            users: waitingRoomUsers,
            totalUsers: waitingRoomUsers.length,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    console.log(`📢 대기실 사용자 목록 업데이트 (${waitingRoomUsers.length}명)`);
  }

  sendUserInfo(socket, targetUserId) {
    const targetSocketId = this.userSockets.get(targetUserId);
    if (!targetSocketId) {
      socket.emit('error', { message: '사용자를 찾을 수 없습니다.' });
      return;
    }

    const targetUserInfo = this.socketUsers.get(targetSocketId);
    const targetStatus = this.userStatuses.get(targetUserId);

    if (targetUserInfo && targetStatus) {
      socket.emit('user-info', {
        userId: targetUserId,
        username: targetUserInfo.username,
        status: targetStatus.status,
        currentMap: targetStatus.currentMap,
        currentPrivateArea: targetStatus.currentPrivateArea,
        lastSeen: targetStatus.lastSeen,
        position: targetUserInfo.position
      });
    }
  }

  handleUserInvite(socket, targetUserId, inviteType, inviteData) {
    console.log(`📞 초대 처리 시작: ${socket.username} -> ${targetUserId}`, inviteData);
    
    // inviteData에서 targetUserId와 targetUsername 확인
    const actualTargetUserId = inviteData?.targetUserId || targetUserId;
    const targetUsername = inviteData?.targetUsername || targetUserId;
    
    // 1) 먼저 targetUserId로 찾기
    let targetSocketId = this.userSockets.get(actualTargetUserId);
    
    // 2) userId로 찾지 못했다면 username으로 찾기
    if (!targetSocketId) {
      for (const [userId, socketId] of this.userSockets.entries()) {
        const userInfo = this.socketUsers.get(socketId);
        if (userInfo && userInfo.username === targetUsername) {
          targetSocketId = socketId;
          console.log(`📞 username으로 사용자 찾음: ${targetUsername} -> ${userId}`);
          break;
        }
      }
    }
    
    if (!targetSocketId) {
      console.log(`❌ 초대 대상 사용자를 찾을 수 없음: targetUserId=${actualTargetUserId}, targetUsername=${targetUsername}`);
      socket.emit('error', { message: '초대할 사용자를 찾을 수 없습니다.' });
      return;
    }
    
    console.log(`✅ 초대 대상 사용자 찾음: ${targetUsername} (socketId: ${targetSocketId})`);

    const invite = {
      fromUserId: socket.userId,
      fromUsername: socket.username,
      inviteType,
      inviteData,
      timestamp: new Date(),
      inviteId: this.generateInviteId()
    };

    this.io.to(targetSocketId).emit('user-invite', invite);
    socket.emit('invite-sent', { targetUserId, inviteId: invite.inviteId });

    console.log(`📞 초대 전송: ${socket.username} -> ${targetUserId} (${inviteType})`);
    console.log(`📞 초대 데이터:`, invite);
  }

  handleInviteResponse(socket, fromUserId, accepted, responseData) {
    // fromUserId가 username인지 userId인지 확인
    let fromSocketId = this.userSockets.get(fromUserId);
    
    // userId로 찾지 못했다면 username으로 찾기
    if (!fromSocketId) {
      for (const [userId, socketId] of this.userSockets.entries()) {
        const userInfo = this.socketUsers.get(socketId);
        if (userInfo && userInfo.username === fromUserId) {
          fromSocketId = socketId;
          break;
        }
      }
    }
    
    if (!fromSocketId) {
      socket.emit('error', { message: '초대한 사용자를 찾을 수 없습니다.' });
      return;
    }

    const response = {
      fromUserId: socket.userId,
      fromUsername: socket.username,
      accepted,
      responseData,
      timestamp: new Date()
    };

    this.io.to(fromSocketId).emit('invite-response', response);

    if (accepted) {
      console.log(`📞 초대 수락: ${socket.username} -> ${fromUserId}`);
      console.log(`📞 수락 응답 데이터:`, response);
    } else {
      console.log(`📞 초대 거절: ${socket.username} -> ${fromUserId}`);
    }
  }

  broadcastOnlineUsers() {
    const onlineUsers = [];
    
    for (const [userId, status] of this.userStatuses) {
      if (status.isOnline) {
        const socketId = this.userSockets.get(userId);
        const userInfo = socketId ? this.socketUsers.get(socketId) : null;
        
        onlineUsers.push({
          userId,
          username: userInfo?.username || status.username || 'Unknown',
          status: status.status || 'online',
          currentMap: status.currentMap,
          lastSeen: status.lastSeen,
          isOnline: true,
          characterInfo: userInfo?.characterInfo,
          position: userInfo?.position,
          direction: userInfo?.direction,
          currentArea: status.currentPrivateArea ? 'private' : status.currentMap ? 'map' : 'lobby'
        });
      }
    }
    
    this.io.emit('online-users-updated', { users: onlineUsers });
  }

  generateAllUsersJsonInfo() {
    const allUsersInfo = [];
    
    for (const [userId, status] of this.userStatuses) {
      if (status.isOnline) {
        const socketId = this.userSockets.get(userId);
        const userInfo = socketId ? this.socketUsers.get(socketId) : null;
        
        if (userInfo) {
          let userJsonInfo = userInfo.userInfoJson;
          
          if (!userJsonInfo) {
            userJsonInfo = {
              id: userId,
              username: userInfo.username || '알 수 없음',
              socketId: socketId,
              입실공간: userInfo.mapId ? (this.mapsList.get(userInfo.mapId)?.name || `room ${userInfo.mapId}`) : '대기실',
              mapId: userInfo.mapId || null,
              위치: userInfo.position || { x: 0, y: 200 },
              캐릭터: {
                이름: userInfo.characterInfo?.name || '기본 캐릭터',
                머리: userInfo.characterInfo?.appearance?.head || '기본',
                몸통: userInfo.characterInfo?.appearance?.body || '기본',
                팔: userInfo.characterInfo?.appearance?.arms || '기본',
                다리: userInfo.characterInfo?.appearance?.legs || '기본',
                이미지: userInfo.characterInfo?.images ? '있음' : '없음',
                크기: userInfo.characterInfo?.size || 32,
                방향: userInfo.direction || 'down'
              },
              현재영역: status.currentPrivateArea ? 'private' : status.currentMap ? 'map' : 'lobby',
              입장시간: userInfo.joinedAt || new Date().toISOString(),
              온라인상태: status.currentMap ? '입실' : '대기',
              마지막활동: new Date().toISOString()
            };
          } else {
            userJsonInfo = {
              ...userJsonInfo,
              id: userId,
              socketId: socketId,
              mapId: userInfo.mapId || null,
              마지막활동: new Date().toISOString()
            };
          }
          
          allUsersInfo.push(userJsonInfo);
        }
      }
    }
    
    return allUsersInfo;
  }

  generateMapParticipantsInfo() {
    const mapInfo = {};
    
    for (const [mapId, mapSockets] of this.maps) {
      const participants = [];
      
      for (const socketId of mapSockets) {
        const userInfo = this.socketUsers.get(socketId);
        if (userInfo) {
          const participant = {
            id: userInfo.userId,
            username: userInfo.username,
            socketId: socketId,
            위치: userInfo.position || { x: 0, y: 200 },
            캐릭터: {
              이름: userInfo.characterInfo?.name || '기본 캐릭터',
              머리: userInfo.characterInfo?.appearance?.head || '기본',
              몸통: userInfo.characterInfo?.appearance?.body || '기본',
              팔: userInfo.characterInfo?.appearance?.arms || '기본',
              다리: userInfo.characterInfo?.appearance?.legs || '기본',
              이미지: userInfo.characterInfo?.images ? '있음' : '없음',
              크기: userInfo.characterInfo?.size || 32
            },
            방향: userInfo.direction || 'down',
            입장시간: userInfo.joinedAt,
            마지막활동: new Date().toISOString()
          };
          
          participants.push(participant);
        }
      }
      
      mapInfo[`room_${mapId}`] = {
        방ID: mapId,
        이름: `방 ${mapId}`,
        입실자: participants,
        사용자수: participants.length,
        생성시간: new Date().toISOString(),
        마지막업데이트: new Date().toISOString()
      };
    }
    
    return mapInfo;
  }

  broadcastMapInfo() {
    const mapInfo = this.generateMapParticipantsInfo();
    
    this.io.emit('map-info-updated', { 
      maps: mapInfo,
      totalParticipants: Object.values(mapInfo).reduce((sum, map) => sum + map.사용자수, 0)
    });
  }

  broadcastAllUsersJsonInfo() {
    const allUsersInfo = this.generateAllUsersJsonInfo();
    
    this.io.emit('all-users-json-updated', {
      users: allUsersInfo,
      totalUsers: allUsersInfo.length,
      timestamp: new Date().toISOString()
    });
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  

  generateInviteId() {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getParticipantsInMap(mapId) {
    console.log(`📋 맵 ${mapId}의 참가자 조회 시작`);
    const mapSockets = this.maps.get(mapId);
    if (!mapSockets) {
      console.log(`📋 맵 ${mapId}에 소켓이 없음`);
      return [];
    }

    console.log(`📋 맵 ${mapId}의 소켓 수: ${mapSockets.size}`);
    const participants = [];
    for (const socketId of mapSockets) {
      const userInfo = this.socketUsers.get(socketId);
      if (userInfo) {
        // 사용자명이 없거나 빈 문자열인 경우 건너뛰기 (좀비 사용자 제거)
        if (!userInfo.username || userInfo.username.trim() === '' || userInfo.username === 'Unknown') {
          console.log(`🧟 좀비 사용자 제거: userId=${userInfo.userId}, username="${userInfo.username}", socketId=${socketId}`);
          // 좀비 소켓 정리
          mapSockets.delete(socketId);
          this.socketUsers.delete(socketId);
          continue;
        }
        
        const participant = {
          userId: userInfo.userId,
          username: userInfo.username,
          characterId: userInfo.characterId,
          position: userInfo.position,
          direction: userInfo.direction || 'down',
          status: userInfo.status,
          joinedAt: userInfo.joinedAt,
          characterInfo: userInfo.characterInfo,
          privateAreaId: userInfo.privateAreaId || null
        };
        participants.push(participant);
        console.log(`📋 참가자 추가: ${userInfo.username} (${userInfo.userId})`);
      } else {
        console.log(`⚠️ 소켓 ${socketId}의 사용자 정보를 찾을 수 없음 - 제거`);
        // 사용자 정보가 없는 소켓도 정리
        mapSockets.delete(socketId);
      }
    }
    
    console.log(`📋 맵 ${mapId}의 최종 참가자 수: ${participants.length}`);
    return participants;
  }

  getParticipantsInPrivateArea(privateAreaId) {
    const areaSockets = this.privateAreas.get(privateAreaId);
    if (!areaSockets) return [];

    const participants = [];
    for (const socketId of areaSockets) {
      const userInfo = this.socketUsers.get(socketId);
      if (userInfo) {
        // 사용자명이 없거나 빈 문자열인 경우 건너뛰기 (좀비 사용자 제거)
        if (!userInfo.username || userInfo.username.trim() === '' || userInfo.username === 'Unknown') {
          console.log(`🧟 프라이빗 영역 좀비 사용자 제거: userId=${userInfo.userId}, username="${userInfo.username}"`);
          areaSockets.delete(socketId);
          continue;
        }
        
        participants.push({
          userId: userInfo.userId,
          username: userInfo.username,
          status: userInfo.status
        });
      } else {
        // 사용자 정보가 없는 소켓 제거
        areaSockets.delete(socketId);
      }
    }
    return participants;
  }

  // 캐릭터 업데이트 처리
  handleCharacterUpdate(socket, data) {
    const { characterId, appearance } = data;
    
    if (!socket.userId || !characterId || !appearance) {
      console.log('❌ 캐릭터 업데이트 실패: 필수 데이터 누락');
      return;
    }

    console.log('🎭 캐릭터 업데이트:', {
      userId: socket.userId,
      username: socket.username,
      characterId,
      appearance
    });

    // 현재 사용자 정보 업데이트
    const userInfo = this.socketUsers.get(socket.id);
    if (userInfo) {
      userInfo.characterInfo = {
        ...userInfo.characterInfo,
        appearance
      };
      
      // 같은 맵에 있는 다른 사용자들에게 캐릭터 변경 알림
      if (socket.mapId) {
        const updateData = {
          userId: socket.userId,
          username: socket.username,
          characterId,
          appearance,
          position: userInfo.position,
          direction: userInfo.direction || 'down',
          timestamp: new Date()
        };
        
        socket.to(`map-${socket.mapId}`).emit('character-appearance-updated', updateData);
        console.log(`🎭 캐릭터 외형 변경 알림 전송 - 맵 ${socket.mapId}`);
      }
    }
  }

  handleDisconnect(socket) {
            console.log('🔌 [오프라인] mini area WebSocket 연결 해제:', {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      mapId: socket.mapId,
      privateAreaId: socket.privateAreaId,
      timestamp: new Date().toLocaleString()
    });
    
    if (socket.userId) {
      // 사용자 입실 상태 확인
      const userInfo = this.loggedInUsers.get(socket.userId);
      if (userInfo) {
        console.log(`📊 [오프라인] 사용자 상태 변경: ${socket.username} (ID: ${socket.userId})`);
        console.log(`   입실 상태: ${userInfo.mapId ? `맵 ${userInfo.mapId}에 입실 중 → 오프라인 (방 정보 유지)` : '대기실 → 오프라인'}`);
        
        // 오프라인 시에도 방 정보 영구 보존
        // mapId와 privateAreaId는 절대 삭제하지 않음
        this.updateLoggedInUserInfo(socket.userId, {
          socketId: null,
          isOnline: false,
          연결상태: '오프라인',
          마지막활동: new Date().toISOString()
          // mapId, privateAreaId, 입실공간, 현재영역은 그대로 유지
        });
      }
      
      if (socket.mapId) {
        this.leaveMap(socket, false, true);  // isDisconnecting = true로 방 정보 유지
      }

      if (socket.privateAreaId) {
        this.leavePrivateArea(socket);
      }

      this.updateUserStatus(socket.userId, { 
        isOnline: false, 
        lastSeen: new Date(),
        status: 'offline'
      });

      // 영역 기반 화상통화에서 사용자 제거
      this.areaVideoCallManager.removeUser(socket.userId);

      // 🎯 새로운 영역 상태 관리 시스템에서 사용자 제거
      this.cleanupUserAreaState(socket.userId);

      // 소켓 매핑만 제거 (사용자 정보는 유지)
      this.userSockets.delete(socket.userId);
      this.socketUsers.delete(socket.id);
      
      // Ping 상태도 제거
      this.clientPingStatus.delete(socket.id);
      
      console.log(`🧹 [시스템] 소켓 정리 완료: ${socket.username} (${socket.userId})`);
      
      // 온라인/오프라인 사용자 수 표시
      const onlineCount = Array.from(this.loggedInUsers.values()).filter(u => u.isOnline).length;
      const offlineCount = Array.from(this.loggedInUsers.values()).filter(u => !u.isOnline).length;
      console.log(`📊 [시스템] 현재 사용자 상태:`);
      console.log(`   온라인: ${onlineCount}명, 오프라인: ${offlineCount}명`);
      console.log(`   활성 소켓: ${this.socketUsers.size}개`);

      this.broadcastAllLoggedInUsersInfo();
      this.broadcastOnlineUsers();
      this.updateMapsParticipants();
      this.broadcastServerState(); // 서버 상태 업데이트
    }
  }

  getOnlineUsers() {
    const onlineUsers = [];
    for (const [userId, status] of this.userStatuses) {
      if (status.isOnline) {
        const userInfo = this.socketUsers.get(this.userSockets.get(userId));
        onlineUsers.push({
          userId,
          username: userInfo?.username || 'Unknown',
          status: status.status,
          currentMap: status.currentMap,
          lastSeen: status.lastSeen
        });
      }
    }
    return onlineUsers;
  }

  // 서버 상태 업데이트
  updateServerState() {
    const connectedUsers = Array.from(this.socketUsers.values());
    const lobbyUsers = connectedUsers.filter(user => !user.mapId);
    const mapUsers = {};
    
    // 맵별 사용자 분류
    connectedUsers.forEach(user => {
      if (user.mapId) {
        if (!mapUsers[user.mapId]) {
          mapUsers[user.mapId] = [];
        }
        mapUsers[user.mapId].push({
          id: user.userId,
          username: user.username,
          status: user.status || 'online',
          joinedAt: user.joinedAt,
          lastActivity: new Date()
        });
      }
    });

    // 맵 목록에 참여자 수 추가
    const mapsWithParticipants = Array.from(this.mapsList.values()).map(map => ({
      ...map,
      participantCount: mapUsers[map.id] ? mapUsers[map.id].length : 0
    }));

    this.serverState = {
      totalOnlineUsers: connectedUsers.length,
      lobbyUsers: lobbyUsers.map(user => ({
        id: user.userId,
        username: user.username,
        status: user.status || 'online',
        joinedAt: user.joinedAt,
        lastActivity: new Date()
      })),
      mapUsers,
      maps: mapsWithParticipants,
      lastUpdated: new Date()
    };

    console.log('🔄 서버 상태 업데이트:', {
      totalUsers: this.serverState.totalOnlineUsers,
      lobbyUsers: this.serverState.lobbyUsers.length,
      mapsCount: this.serverState.maps.length
    });
  }

  // 특정 클라이언트에게 서버 상태 전송
  sendServerStateToClient(socket) {
    this.updateServerState();
    socket.emit('server-state-updated', this.serverState);
    console.log(`📤 서버 상태 전송 to ${socket.username} (${socket.userId})`);
  }

  // 프라이빗 영역 상태 브로드캐스트
  broadcastPrivateAreaStatus(mapId) {
    if (!mapId) return;
    
    // 해당 맵의 모든 프라이빗 영역 정보 수집
    const privateAreasInfo = [];
    
    // 프라이빗 영역별 참가자 정보 수집
    for (const [areaId, socketIds] of this.privateAreas.entries()) {
      const participants = [];
      
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket && socket.mapId === mapId) {
          const userInfo = this.socketUsers.get(socketId);
          if (userInfo) {
            participants.push({
              userId: userInfo.userId,
              username: userInfo.username,
              position: userInfo.position
            });
          }
        }
      }
      
      if (participants.length > 0) {
        privateAreasInfo.push({
          areaId: areaId,
          participantCount: participants.length,
          participants: participants
        });
      }
    }
    
    // 해당 맵의 모든 사용자에게 프라이빗 영역 상태 전송
    this.io.to(`map-${mapId}`).emit('private-areas-status', {
      mapId: mapId,
      privateAreas: privateAreasInfo,
      timestamp: new Date()
    });
    
    console.log(`🎬 프라이빗 영역 상태 브로드캐스트 - 맵 ${mapId}: ${privateAreasInfo.length}개 영역`);
  }
  
  // 모든 클라이언트에게 서버 상태 브로드캐스트
  broadcastServerState() {
    this.updateServerState();
    this.io.emit('server-state-updated', this.serverState);
    console.log('📡 서버 상태 브로드캐스트');
  }

  // 대기실 사용자 목록 가져오기
  getLobbyUsers() {
    const connectedUsers = Array.from(this.socketUsers.values());
    return connectedUsers.filter(user => !user.mapId);
  }

  // 맵별 사용자 수 가져오기
  getMapUsers() {
    const connectedUsers = Array.from(this.socketUsers.values());
    const mapUsers = {};
    
    connectedUsers.forEach(user => {
      if (user.mapId) {
        if (!mapUsers[user.mapId]) {
          mapUsers[user.mapId] = 0;
        }
        mapUsers[user.mapId]++;
      }
    });
    
    return mapUsers;
  }

  // 실시간 사용자 수 정보 가져오기
  getRealTimeUserCounts() {
    const lobbyUsers = this.getLobbyUsers();
    const mapUsers = this.getMapUsers();
    
    return {
      lobbyUsers: lobbyUsers.length,
      mapUsers,
      totalOnlineUsers: Array.from(this.socketUsers.values()).length
    };
  }

  // 영역 기반 위치 업데이트 처리
  updateUserAreaPosition(userId, mapId, position) {
    const mapData = this.mapsList.get(parseInt(mapId));
    if (!mapData) return null;

    // 🎯 효율적인 영역 상태 업데이트
    const currentAreaState = this.updateUserAreaState(userId, mapId, position, mapData.privateAreas);
    
    if (currentAreaState.changed) {
      console.log('🌍 [영역변경] 사용자 영역 이동:', {
        userId,
        from: currentAreaState.previousAreaId,
        to: currentAreaState.currentAreaId,
        areaType: currentAreaState.areaType
      });

      // 영역 그룹 업데이트 및 화상통화 처리
      this.handleAreaStateChange(userId, currentAreaState);
    }

    return currentAreaState;
  }

  // 🎯 효율적인 영역 상태 업데이트
  updateUserAreaState(userId, mapId, position, privateAreas) {
    // 현재 위치의 영역 정보 계산
    const { detectUserArea } = require('../utils/areaDetection');
    const currentAreaInfo = detectUserArea(position, {
      id: mapId,
      privateAreas: privateAreas || [],
      size: { width: 1000, height: 1000 }
    });

    const currentAreaId = currentAreaInfo.id || 'public';
    const currentAreaType = currentAreaInfo.type || 'public';

    // AreaVideoCallManager에 사용자 영역 정보 업데이트 (자동 화상통화 감시를 위해)
    const videoCallResult = this.areaVideoCallManager.updateUserArea(userId, mapId, position, privateAreas || []);
    
    if (videoCallResult.changed) {
      console.log('🎥 [영역화상통화] 사용자 영역 변경:', {
        userId,
        oldArea: videoCallResult.oldAreaKey,
        newArea: videoCallResult.newAreaKey,
        color: videoCallResult.newColor,
        usersWithSameColor: videoCallResult.usersWithSameColor?.length
      });
    }
    const areaKey = `${mapId}_${currentAreaType}_${currentAreaId}`;

    // 이전 영역 상태 조회
    const previousState = this.userAreaStates.get(userId);
    const previousAreaId = previousState?.areaId;
    const previousAreaKey = previousState ? `${previousState.mapId}_${previousState.areaType}_${previousState.areaId}` : null;

    // 영역 변경 여부 확인 (성능 최적화)
    const changed = !previousState || 
                   previousState.areaId !== currentAreaId || 
                   previousState.mapId !== mapId;

    // 현재 영역 상태 저장
    this.userAreaStates.set(userId, {
      areaId: currentAreaId,
      areaType: currentAreaType,
      mapId: mapId,
      position: { ...position },
      lastUpdate: Date.now()
    });

    // 로그인 사용자 정보에 영역 정보 추가 (요청하신 사항)
    const loggedInUserInfo = this.loggedInUsers.get(userId);
    if (loggedInUserInfo) {
      this.loggedInUsers.set(userId, {
        ...loggedInUserInfo,
        현재영역ID: currentAreaId,
        영역타입: currentAreaType,
        영역정보: currentAreaInfo,
        calculatedAreaInfo: {
          areaInfo: {
            area: {
              id: currentAreaId,
              type: currentAreaType,
              name: currentAreaInfo.name
            }
          }
        },
        영역업데이트시간: new Date().toISOString()
      });
    }

    return {
      changed,
      currentAreaId,
      currentAreaType,
      previousAreaId,
      areaKey,
      previousAreaKey,
      areaInfo: currentAreaInfo,
      mapId
    };
  }

  // 🎯 영역 상태 변경 처리 (화상통화 관리)
  handleAreaStateChange(userId, areaState) {
    const { currentAreaId, previousAreaId, areaKey, previousAreaKey, mapId } = areaState;

    // 이전 영역 그룹에서 제거
    if (previousAreaKey) {
      this.removeUserFromAreaGroup(userId, previousAreaKey);
    }

    // 새 영역 그룹에 추가
    this.addUserToAreaGroup(userId, areaKey);

    // 영역별 화상통화 세션 관리
    this.manageAreaVideoCall(areaKey, currentAreaId, mapId);

    // 클라이언트에게 영역 변경 알림
    const userSocket = this.getUserSocket(userId);
    if (userSocket) {
      this.io.to(userSocket).emit('area-changed', {
        oldAreaId: previousAreaId,
        newAreaId: currentAreaId,
        areaInfo: areaState.areaInfo,
        usersInArea: Array.from(this.areaGroups.get(areaKey) || [])
      });
    }
  }

  // 영역 그룹 관리
  addUserToAreaGroup(userId, areaKey) {
    if (!this.areaGroups.has(areaKey)) {
      this.areaGroups.set(areaKey, new Set());
    }
    this.areaGroups.get(areaKey).add(userId);
  }

  removeUserFromAreaGroup(userId, areaKey) {
    const group = this.areaGroups.get(areaKey);
    if (group) {
      group.delete(userId);
      if (group.size === 0) {
        this.areaGroups.delete(areaKey);
        // 빈 영역의 화상통화 세션도 정리
        this.endAreaVideoCall(areaKey);
      }
    }
  }

  // 🎯 영역별 화상통화 관리 (효율적)
  manageAreaVideoCall(areaKey, areaId, mapId) {
    const usersInArea = this.areaGroups.get(areaKey);
    if (!usersInArea || usersInArea.size < 2) {
      // 사용자가 1명 이하면 화상통화 종료
      this.endAreaVideoCall(areaKey);
      return;
    }

    // 기존 세션이 있는지 확인
    if (this.videoCallSessions.has(areaKey)) {
      // 이미 진행중인 세션에 참가자 업데이트
      const session = this.videoCallSessions.get(areaKey);
      session.participants = Array.from(usersInArea);
      
      // 새 참가자에게 진행중인 화상통화 알림
      usersInArea.forEach(participantId => {
        const socket = this.getUserSocket(participantId);
        if (socket) {
          this.io.to(socket).emit('area-video-call-update', {
            areaKey,
            areaId,
            participants: session.participants,
            isActive: session.isActive
          });
        }
      });
    } else {
      // 새로운 화상통화 세션 시작
      this.startAreaVideoCall(areaKey, areaId, Array.from(usersInArea));
    }
  }

  // 영역 화상통화 시작
  startAreaVideoCall(areaKey, areaId, participants) {
    console.log('📹 [영역화상통화] 자동 시작:', { areaKey, areaId, participantCount: participants.length });

    this.videoCallSessions.set(areaKey, {
      areaId,
      participants,
      startTime: Date.now(),
      isActive: true
    });

    // 모든 참가자에게 자동 화상통화 시작 알림
    participants.forEach(participantId => {
      const socket = this.getUserSocket(participantId);
      if (socket) {
        this.io.to(socket).emit('auto-video-call-started', {
          areaKey,
          areaId,
          participants,
          message: `영역 "${areaId}"에서 화상통화가 자동으로 시작되었습니다.`
        });
      }
    });
  }

  // 영역 화상통화 종료
  endAreaVideoCall(areaKey) {
    const session = this.videoCallSessions.get(areaKey);
    if (session) {
      console.log('📹 [영역화상통화] 자동 종료:', { areaKey, duration: Date.now() - session.startTime });

      // 참가자들에게 종료 알림
      session.participants.forEach(participantId => {
        const socket = this.getUserSocket(participantId);
        if (socket) {
          this.io.to(socket).emit('area-video-call-ended', {
            areaKey,
            reason: '영역 참가자 부족'
          });
        }
      });

      this.videoCallSessions.delete(areaKey);
    }
  }

  // 🎯 사용자 영역 상태 정리 (연결 해제 시)
  cleanupUserAreaState(userId) {
    console.log('🧹 [영역정리] 사용자 영역 상태 정리:', userId);

    // 현재 사용자의 영역 상태 조회
    const userAreaState = this.userAreaStates.get(userId);
    if (userAreaState) {
      const { areaId, areaType, mapId } = userAreaState;
      const areaKey = `${mapId}_${areaType}_${areaId}`;

      // 영역 그룹에서 제거
      this.removeUserFromAreaGroup(userId, areaKey);

      // 사용자 영역 상태 제거
      this.userAreaStates.delete(userId);

      console.log('🧹 [영역정리] 완료:', { userId, areaId, areaType, mapId });
    }

    // 로그인 사용자 정보에서 영역 정보 정리
    const loggedInUserInfo = this.loggedInUsers.get(userId);
    if (loggedInUserInfo) {
      this.loggedInUsers.set(userId, {
        ...loggedInUserInfo,
        현재영역ID: null,
        영역타입: null,
        영역정보: null,
        calculatedAreaInfo: null,
        영역업데이트시간: new Date().toISOString()
      });
    }
  }

  // 🎯 영역 상태 디버그 정보 조회
  getAreaStateDebugInfo() {
    const areaGroupsObj = {};
    this.areaGroups.forEach((users, areaKey) => {
      areaGroupsObj[areaKey] = Array.from(users);
    });

    const videoCallSessionsObj = {};
    this.videoCallSessions.forEach((session, areaKey) => {
      videoCallSessionsObj[areaKey] = {
        ...session,
        duration: Date.now() - session.startTime
      };
    });

    const userAreaStatesObj = {};
    this.userAreaStates.forEach((state, userId) => {
      userAreaStatesObj[userId] = state;
    });

    return {
      areaGroups: areaGroupsObj,
      videoCallSessions: videoCallSessionsObj,
      userAreaStates: userAreaStatesObj,
      totalUsers: this.userAreaStates.size
    };
  }

  // 영역 전환 처리 (화상통화 관리)
  handleAreaTransition(userId, result) {
    const { oldAreaKey, newAreaKey, usersInNewArea } = result;

    // 이전 영역에서 화상통화 세션 퇴장
    if (oldAreaKey) {
      const leaveResult = this.areaVideoCallManager.handleUserLeaveArea(userId, oldAreaKey);
      if (leaveResult.left) {
        // 이전 영역 참가자들에게 알림
        this.notifyAreaVideoCallChange(oldAreaKey, leaveResult.remainingParticipants, 'user-left');
      }
    }

    // 새 영역 진입 시 같은 영역 ID의 사용자들과 화상통화 시작
    if (newAreaKey && result.areaInfo) {
      // 현재 사용자의 영역 ID 추출
      const currentAreaId = result.areaInfo.id || result.areaInfo.areaId || 'public';
      
      // 맵의 모든 참가자 중에서 같은 영역 ID에 있는 사용자 찾기
      const sameAreaUsers = this.getUsersInSameAreaId(userId, currentAreaId, result.mapId);
      
      console.log('🎯 [영역그룹] 같은 영역 ID 사용자 검색:', {
        userId,
        areaId: currentAreaId,
        sameAreaUsers: sameAreaUsers.map(u => ({ id: u.userId, area: u.areaId }))
      });

      if (sameAreaUsers.length > 1) { // 본인 포함 2명 이상일 때
        // 영역 ID 기반 세션 키 생성
        const areaSessionKey = `${result.mapId}_area_${currentAreaId}`;
        
        // 기존 화상통화 세션이 있는지 확인
        const existingSession = this.areaVideoCallManager.getVideoSession(areaSessionKey);
        
        if (existingSession) {
          // 기존 세션에 자동 참여
          const joinResult = this.areaVideoCallManager.handleUserEnterArea(userId, areaSessionKey);
          if (joinResult.joined) {
            console.log('📹 [자동참여] 영역 ID 기반 화상통화에 참여:', { userId, areaId: currentAreaId });
            this.notifyAreaVideoCallChange(areaSessionKey, joinResult.participants, 'user-joined');
          }
        } else {
          // 새로운 영역 ID 기반 화상통화 세션 자동 시작
          console.log('📹 [자동시작] 같은 영역 ID 사용자들과 화상통화 시작:', { 
            userId, 
            areaId: currentAreaId,
            usersCount: sameAreaUsers.length 
          });
          
          // 세션에 같은 영역의 모든 사용자 추가
          const sessionResult = this.areaVideoCallManager.startVideoSessionWithUsers(
            areaSessionKey, 
            sameAreaUsers.map(u => u.userId)
          );
          
          this.notifyAreaVideoCallChange(areaSessionKey, sessionResult.participants, 'session-started');
          
          // 같은 영역의 모든 사용자에게 자동 화상통화 시작 알림
          sameAreaUsers.forEach(user => {
            const participantSocket = this.getUserSocket(user.userId);
            if (participantSocket) {
              this.io.to(participantSocket).emit('auto-video-call-started', {
                areaKey: areaSessionKey,
                areaId: currentAreaId,
                participants: sessionResult.participants,
                initiator: userId
              });
            }
          });
        }
      }
    }

    // 클라이언트에게 영역 변경 알림
    const userSocket = this.getUserSocket(userId);
    if (userSocket) {
      this.io.to(userSocket).emit('area-changed', {
        oldAreaKey,
        newAreaKey,
        areaInfo: result.areaInfo,
        usersInArea: usersInNewArea
      });
    }
  }

  // 같은 영역 ID에 있는 사용자들 찾기
  getUsersInSameAreaId(currentUserId, areaId, mapId) {
    const sameAreaUsers = [];
    
    // 해당 맵의 모든 사용자 확인
    const mapSockets = this.maps.get(parseInt(mapId));
    if (mapSockets) {
      for (const socketId of mapSockets) {
        const userInfo = this.socketUsers.get(socketId);
        if (userInfo && userInfo.position) {
          // 사용자 위치로 영역 계산 (updateUserArea 대신 detectUserArea 사용)
          const mapData = this.mapsList.get(parseInt(mapId));
          if (mapData) {
            const { detectUserArea } = require('../utils/areaDetection');
            const userAreaInfo = detectUserArea(userInfo.position, {
              id: mapId,
              privateAreas: mapData.privateAreas || [],
              size: { width: 1000, height: 1000 }
            });
            
            const userAreaId = userAreaInfo.id || 'public';
            
            // 같은 영역 ID인 사용자 추가
            if (userAreaId === areaId) {
              sameAreaUsers.push({
                userId: userInfo.userId,
                socketId: socketId,
                areaId: userAreaId,
                position: userInfo.position
              });
            }
          }
        }
      }
    }
    
    return sameAreaUsers;
  }

  // 영역 화상통화 변경 알림
  notifyAreaVideoCallChange(areaKey, participants, eventType) {
    participants.forEach(participantId => {
      const socket = this.getUserSocket(participantId);
      if (socket) {
        this.io.to(socket).emit('area-video-call-changed', {
          areaKey,
          participants,
          eventType
        });
      }
    });
  }

  // 사용자 소켓 ID 조회
  getUserSocket(userId) {
    return this.userSockets.get(parseInt(userId));
  }

  // 영역 화상통화 세션 시작
  startAreaVideoCall(userId, areaKey) {
    const result = this.areaVideoCallManager.startVideoSession(areaKey, userId);
    if (result) {
      this.notifyAreaVideoCallChange(areaKey, result.participants, 'session-started');
      return result;
    }
    return null;
  }

  // 영역 화상통화 세션 종료
  endAreaVideoCall(areaKey) {
    const result = this.areaVideoCallManager.endVideoSession(areaKey);
    if (result) {
      this.notifyAreaVideoCallChange(areaKey, result.participants, 'session-ended');
      return result;
    }
    return null;
  }

  // 색상 기반 화상통화 세션 시작
  startColorBasedVideoCall(userId) {
    const result = this.areaVideoCallManager.startColorBasedVideoSession(userId);
    return result;
  }

  // 색상 기반 화상통화 시작 알림
  notifyColorBasedVideoCallStart(color, participants, sessionKey) {
    console.log('🎨 색상 기반 화상통화 알림 발송:', { color, participants, sessionKey });
    
    participants.forEach(participantId => {
      const socket = this.getUserSocket(participantId);
      if (socket) {
        this.io.to(socket).emit('color-based-video-call-started', {
          color,
          sessionKey,
          participants,
          message: `같은 색상(${color})의 캐릭터들과 화상통화가 시작되었습니다.`
        });
      }
    });
  }

  // 자동 영역 화상통화 시작 알림
  notifyAutoAreaVideoCallStart(areaKey, participants) {
    console.log('🎥 [자동시작] 영역 화상통화 시작 알림 발송:', { areaKey, participants });
    
    participants.forEach(participantId => {
      const socket = this.getUserSocket(participantId);
      if (socket) {
        this.io.to(socket).emit('auto-area-video-call-started', {
          areaKey,
          participants,
          message: `영역에 2명 이상 입장하여 자동으로 화상통화가 시작되었습니다.`
        });
      }
    });
  }

  // 자동 색상 화상통화 시작 알림
  notifyAutoColorVideoCallStart(color, sessionKey, participants) {
    console.log('🎨 [자동시작] 색상 기반 화상통화 시작 알림 발송:', { color, sessionKey, participants });
    
    participants.forEach(participantId => {
      const socket = this.getUserSocket(participantId);
      if (socket) {
        this.io.to(socket).emit('auto-color-video-call-started', {
          color,
          sessionKey,
          participants,
          message: `같은 색상(${color}) 캐릭터들이 모여 자동으로 화상통화가 시작되었습니다.`
        });
      }
    });
  }

  // 자동 영역 화상통화 종료 알림
  notifyAutoAreaVideoCallEnd(areaKey, participants, reason) {
    console.log('🎥 [자동종료] 영역 화상통화 종료 알림 발송:', { areaKey, participants, reason });
    
    participants.forEach(participantId => {
      const socket = this.getUserSocket(participantId);
      if (socket) {
        this.io.to(socket).emit('auto-area-video-call-ended', {
          areaKey,
          participants,
          reason,
          message: `영역 화상통화가 자동으로 종료되었습니다: ${reason}`
        });
      }
    });
  }

  // 화상통화 참가자 변경 알림
  notifyVideoCallParticipantChange(sessionKey, participants, added, removed) {
    console.log('👥 화상통화 참가자 변경 알림 발송:', { sessionKey, participants: participants.length, added: added.length, removed: removed.length });
    
    participants.forEach(participantId => {
      const socket = this.getUserSocket(participantId);
      if (socket) {
        this.io.to(socket).emit('video-call-participant-changed', {
          sessionKey,
          participants,
          added,
          removed,
          message: `화상통화 참가자가 변경되었습니다. (추가: ${added.length}명, 제거: ${removed.length}명)`
        });
      }
    });
  }

  // 개별 사용자에게 자동 영역 화상통화 참여 알림
  notifyUserAutoJoinVideoCall(userId, areaKey, participants) {
    console.log('👤 [자동참여] 개별 사용자에게 영역 화상통화 참여 알림:', { userId, areaKey, participants: participants.length });
    
    const socket = this.getUserSocket(userId);
    if (socket) {
      this.io.to(socket).emit('user-auto-joined-video-call', {
        areaKey,
        participants,
        message: '영역 내 다른 사용자와 함께 자동으로 화상통화에 참여되었습니다.'
      });
    }
  }

  // 개별 사용자에게 자동 색상 화상통화 참여 알림
  notifyUserAutoJoinColorVideoCall(userId, color, sessionKey, participants) {
    console.log('🎨 [자동참여] 개별 사용자에게 색상 화상통화 참여 알림:', { userId, color, sessionKey, participants: participants.length });
    
    const socket = this.getUserSocket(userId);
    if (socket) {
      this.io.to(socket).emit('user-auto-joined-color-video-call', {
        color,
        sessionKey,
        participants,
        message: `같은 색상(${color}) 캐릭터들과 함께 자동으로 화상통화에 참여되었습니다.`
      });
    }
  }

  // 개별 사용자에게 자동 화상통화 퇴장 알림
  notifyUserAutoLeaveVideoCall(userId, sessionKey, reason) {
    console.log('👤 [자동퇴장] 개별 사용자에게 화상통화 퇴장 알림:', { userId, sessionKey, reason });
    
    const socket = this.getUserSocket(userId);
    if (socket) {
      this.io.to(socket).emit('user-auto-left-video-call', {
        sessionKey,
        reason,
        message: `화상통화에서 자동으로 퇴장되었습니다: ${reason}`
      });
    }
  }
}

module.exports = MetaverseHandler;
