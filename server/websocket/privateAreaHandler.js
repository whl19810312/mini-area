const jwt = require('jsonwebtoken');

class PrivateAreaHandler {
  constructor(io) {
    this.io = io;
    this.privateAreas = new Map(); // privateAreaId -> Set of socketIds
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> { userId, username, privateAreaId }
  }

  // WebSocket 연결 처리
  handleConnection(socket) {
    console.log('새로운 WebSocket 연결:', socket.id);

    // 인증 처리
    socket.on('authenticate', async (data) => {
      try {
        const token = data.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');

        socket.userId = decoded.userId;

        // 사용자명 조회 (JWT에 사용자명이 없으므로 DB 조회)
        try {
          const User = require('../models/User');
          const user = await User.findByPk(decoded.userId);
          socket.username = user ? user.username : (decoded.username || 'Unknown');
        } catch (e) {
          console.warn('사용자명 조회 실패, 기본값 사용:', e?.message);
          socket.username = decoded.username || 'Unknown';
        }

        console.log('WebSocket 인증 성공:', socket.userId, socket.username);
        socket.emit('authenticated');
      } catch (error) {
        console.error('WebSocket 인증 실패:', error);
        socket.emit('auth_error', { message: '인증에 실패했습니다.' });
      }
    });

    // 프라이빗 영역 입장
    socket.on('join-private-area', (data) => {
      const { privateAreaId } = data;
      
      if (!socket.userId) {
        socket.emit('error', { message: '인증이 필요합니다.' });
        return;
      }

      this.joinPrivateArea(socket, privateAreaId);
    });

    // 프라이빗 영역 퇴장
    socket.on('leave-private-area', () => {
      this.leavePrivateArea(socket);
    });

    // WebRTC 시그널링 메시지 처리
    socket.on('webrtc-signal', (data) => {
      this.handleWebRTCSignal(socket, data);
    });

    // 채팅 메시지 처리
    socket.on('chat-message', (data) => {
      this.handleChatMessage(socket, data);
    });

    // 연결 해제 처리
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  // 프라이빗 영역 입장
  joinPrivateArea(socket, privateAreaId) {
    // 이전 영역에서 퇴장
    this.leavePrivateArea(socket);

    // 새 영역에 입장
    if (!this.privateAreas.has(privateAreaId)) {
      this.privateAreas.set(privateAreaId, new Set());
    }

    const areaSockets = this.privateAreas.get(privateAreaId);
    areaSockets.add(socket.id);

    // 사용자 정보 저장
    this.userSockets.set(socket.userId, socket.id);
    this.socketUsers.set(socket.id, {
      userId: socket.userId,
      username: socket.username,
      privateAreaId
    });

    socket.join(`private-area-${privateAreaId}`);
    socket.privateAreaId = privateAreaId;

    // 현재 참가자 목록 전송
    const participants = this.getParticipantsInArea(privateAreaId);
    socket.emit('participants', { participants });

    // 다른 참가자들에게 새 사용자 입장 알림
    socket.to(`private-area-${privateAreaId}`).emit('user-joined', {
      userId: socket.userId,
      username: socket.username
    });

    console.log(`사용자 ${socket.username} (${socket.userId})가 프라이빗 영역 ${privateAreaId}에 입장`);
  }

  // 프라이빗 영역 퇴장
  leavePrivateArea(socket) {
    if (!socket.privateAreaId) return;

    const privateAreaId = socket.privateAreaId;
    const areaSockets = this.privateAreas.get(privateAreaId);

    if (areaSockets) {
      areaSockets.delete(socket.id);
      
      // 영역이 비어있으면 제거
      if (areaSockets.size === 0) {
        this.privateAreas.delete(privateAreaId);
      }
    }

    // 다른 참가자들에게 퇴장 알림
    socket.to(`private-area-${privateAreaId}`).emit('user-left', {
      userId: socket.userId
    });

    socket.leave(`private-area-${privateAreaId}`);
    delete socket.privateAreaId;

    // 사용자 정보 정리
    this.userSockets.delete(socket.userId);
    this.socketUsers.delete(socket.id);

    console.log(`사용자 ${socket.username} (${socket.userId})가 프라이빗 영역 ${privateAreaId}에서 퇴장`);
  }

  // WebRTC 시그널링 메시지 처리
  handleWebRTCSignal(socket, data) {
    const { type, targetUserId, fromUserId, ...signalData } = data;

    if (!socket.userId || socket.userId !== fromUserId) {
      socket.emit('error', { message: '인증 오류' });
      return;
    }

    const targetSocketId = this.userSockets.get(targetUserId);
    if (!targetSocketId) {
      console.log(`대상 사용자 ${targetUserId}를 찾을 수 없음`);
      return;
    }

    // 같은 프라이빗 영역의 사용자에게만 전달
    const userInfo = this.socketUsers.get(socket.id);
    const targetUserInfo = this.socketUsers.get(targetSocketId);

    if (userInfo && targetUserInfo && userInfo.privateAreaId === targetUserInfo.privateAreaId) {
      this.io.to(targetSocketId).emit('webrtc-signal', {
        type,
        fromUserId,
        ...signalData
      });
    } else {
      console.log('다른 프라이빗 영역의 사용자에게 시그널링 시도 차단');
    }
  }

  // 채팅 메시지 처리
  handleChatMessage(socket, data) {
    const { message, areaType = 'public' } = data;
    
    if (!socket.userId) {
      socket.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    const chatMessage = {
      content: message,
      username: socket.username,
      userId: socket.userId,
      timestamp: new Date(),
      type: areaType
    };

    if (areaType === 'private' && socket.privateAreaId) {
      // 프라이빗 영역 채팅
      this.io.to(`private-area-${socket.privateAreaId}`).emit('chat-message', chatMessage);
    } else {
      // 퍼블릭 채팅 (전체 사용자에게 전송)
      this.io.emit('chat-message', chatMessage);
    }

    console.log(`채팅 메시지: ${socket.username} -> ${message}`);
  }

  // 영역 내 참가자 목록 가져오기
  getParticipantsInArea(privateAreaId) {
    const areaSockets = this.privateAreas.get(privateAreaId);
    if (!areaSockets) return [];

    const participants = [];
    for (const socketId of areaSockets) {
      const userInfo = this.socketUsers.get(socketId);
      if (userInfo) {
        participants.push({
          userId: userInfo.userId,
          username: userInfo.username
        });
      }
    }
    return participants;
  }

  // 연결 해제 처리
  handleDisconnect(socket) {
    console.log('WebSocket 연결 해제:', socket.id);
    this.leavePrivateArea(socket);
  }

  // 프라이빗 영역 정보 가져오기
  getPrivateAreaInfo(privateAreaId) {
    const areaSockets = this.privateAreas.get(privateAreaId);
    if (!areaSockets) return null;

    return {
      id: privateAreaId,
      participantCount: areaSockets.size,
      participants: this.getParticipantsInArea(privateAreaId)
    };
  }
}

module.exports = PrivateAreaHandler;
