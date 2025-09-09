const roomLimits = require('../config/roomLimits');
const BaseHandler = require('./baseHandler');

class P2PHandler extends BaseHandler {
  constructor(io) {
    super(io);
    this.calls = new Map(); // 진행 중인 통화 관리
    this.MAX_ROOMS = roomLimits.p2p.MAX_ROOMS;
    this.MAX_PARTICIPANTS_PER_ROOM = roomLimits.p2p.MAX_PARTICIPANTS_PER_ROOM;
  }

  initialize() {
    this.log('P2P WebRTC handler initialized');
    this.log(`   - Max rooms: ${this.MAX_ROOMS}`);
    this.log(`   - Max participants per room: ${this.MAX_PARTICIPANTS_PER_ROOM}`);
    return Promise.resolve();
  }

  handleConnection(socket) {
    this.logWebRTC(`P2P handler for socket ${socket.id}`);

    // P2P 통화 시작
    socket.on('p2p:startCall', (data, callback) => {
      try {
        const { roomId, targetUserId } = data;
        const callerId = socket.userId || socket.id;
        
        // 방 수 제한 체크
        if (this.calls.size >= this.MAX_ROOMS) {
          throw new Error(`Maximum number of rooms (${this.MAX_ROOMS}) reached`);
        }
        
        // 통화 정보 저장
        if (!this.calls.has(roomId)) {
          this.calls.set(roomId, {
            id: roomId,
            participants: new Set(),
            createdAt: new Date()
          });
        }
        
        const call = this.calls.get(roomId);
        
        // 참가자 수 제한 체크
        if (call.participants.size >= this.MAX_PARTICIPANTS_PER_ROOM) {
          throw new Error(`Room is full (max ${this.MAX_PARTICIPANTS_PER_ROOM} participants)`);
        }
        
        call.participants.add(callerId);
        
        // Socket.IO 룸 참가
        socket.join(`p2p:${roomId}`);
        socket.p2pRoomId = roomId;
        
        // 대상 사용자에게 통화 요청 전송
        if (targetUserId) {
          this.io.to(`user:${targetUserId}`).emit('p2p:incomingCall', {
            roomId,
            callerId,
            callerName: socket.userName || 'Anonymous'
          });
        }
        
        callback({
          success: true,
          roomId,
          participantCount: call.participants.size
        });
        
        this.logWebRTC(`P2P call started in room ${roomId} (${call.participants.size}/${this.MAX_PARTICIPANTS_PER_ROOM})`);
      } catch (error) {
        this.logWebRTCError('Error starting P2P call:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // P2P 통화 참가
    socket.on('p2p:joinCall', (data, callback) => {
      try {
        const { roomId } = data;
        const userId = socket.userId || socket.id;
        
        const call = this.calls.get(roomId);
        if (!call) {
          throw new Error('Call room not found');
        }
        
        // 참가자 수 제한 체크
        if (call.participants.size >= this.MAX_PARTICIPANTS_PER_ROOM) {
          throw new Error(`Room is full (max ${this.MAX_PARTICIPANTS_PER_ROOM} participants)`);
        }
        
        call.participants.add(userId);
        
        // Socket.IO 룸 참가
        socket.join(`p2p:${roomId}`);
        socket.p2pRoomId = roomId;
        
        // 기존 참가자들에게 새 참가자 알림
        socket.to(`p2p:${roomId}`).emit('p2p:userJoined', {
          userId,
          userName: socket.userName || 'Anonymous'
        });
        
        // 기존 참가자 목록 전송
        const participants = Array.from(call.participants);
        
        callback({
          success: true,
          participants,
          participantCount: call.participants.size
        });
        
        this.logWebRTC(`User ${userId} joined P2P room ${roomId} (${call.participants.size}/${this.MAX_PARTICIPANTS_PER_ROOM})`);
      } catch (error) {
        this.logWebRTCError('Error joining P2P call:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // WebRTC Offer 전달
    socket.on('p2p:offer', (data) => {
      const { targetUserId, offer, roomId } = data;
      const senderId = socket.userId || socket.id;
      
      this.logDebug(`P2P: Relaying offer from ${senderId} to ${targetUserId}`);
      
      this.io.to(`user:${targetUserId}`).emit('p2p:offer', {
        offer,
        senderId,
        roomId
      });
    });

    // WebRTC Answer 전달
    socket.on('p2p:answer', (data) => {
      const { targetUserId, answer, roomId } = data;
      const senderId = socket.userId || socket.id;
      
      this.logDebug(`P2P: Relaying answer from ${senderId} to ${targetUserId}`);
      
      this.io.to(`user:${targetUserId}`).emit('p2p:answer', {
        answer,
        senderId,
        roomId
      });
    });

    // ICE Candidate 전달
    socket.on('p2p:iceCandidate', (data) => {
      const { targetUserId, candidate, roomId } = data;
      const senderId = socket.userId || socket.id;
      
      this.logDebug(`P2P: Relaying ICE candidate from ${senderId} to ${targetUserId}`);
      
      this.io.to(`user:${targetUserId}`).emit('p2p:iceCandidate', {
        candidate,
        senderId,
        roomId
      });
    });

    // 통화 종료
    socket.on('p2p:leaveCall', (data, callback) => {
      const roomId = socket.p2pRoomId || data.roomId;
      const userId = socket.userId || socket.id;
      
      if (roomId) {
        const call = this.calls.get(roomId);
        if (call) {
          call.participants.delete(userId);
          
          // 다른 참가자들에게 알림
          socket.to(`p2p:${roomId}`).emit('p2p:userLeft', {
            userId
          });
          
          // Socket.IO 룸에서 나가기
          socket.leave(`p2p:${roomId}`);
          delete socket.p2pRoomId;
          
          // 방이 비었으면 삭제
          if (call.participants.size === 0) {
            this.calls.delete(roomId);
            this.logWebRTC(`Empty P2P room ${roomId} deleted`);
          } else {
            this.logWebRTC(`User ${userId} left P2P room ${roomId} (${call.participants.size}/${this.MAX_PARTICIPANTS_PER_ROOM})`);
          }
        }
      }
      
      if (callback) {
        callback({ success: true });
      }
    });

    // 방 정보 가져오기
    socket.on('p2p:getRoomInfo', (data, callback) => {
      try {
        const { roomId } = data;
        const call = this.calls.get(roomId);
        
        if (!call) {
          throw new Error('Room not found');
        }
        
        callback({
          success: true,
          room: {
            id: roomId,
            participantCount: call.participants.size,
            maxParticipants: this.MAX_PARTICIPANTS_PER_ROOM,
            participants: Array.from(call.participants),
            createdAt: call.createdAt
          }
        });
      } catch (error) {
        this.logError('Error getting room info:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // 모든 방 목록 가져오기
    socket.on('p2p:getAllRooms', (data, callback) => {
      try {
        const rooms = Array.from(this.calls.entries()).map(([roomId, call]) => ({
          id: roomId,
          participantCount: call.participants.size,
          createdAt: call.createdAt
        }));
        
        callback({
          success: true,
          rooms,
          totalRooms: this.calls.size,
          maxRooms: this.MAX_ROOMS
        });
      } catch (error) {
        this.logError('Error getting all rooms:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // 미디어 상태 변경 (음소거, 비디오 끄기 등)
    socket.on('p2p:mediaStateChange', (data) => {
      const { roomId, audioEnabled, videoEnabled } = data;
      const userId = socket.userId || socket.id;
      
      // 같은 방의 다른 참가자들에게 미디어 상태 변경 알림
      socket.to(`p2p:${roomId}`).emit('p2p:peerMediaStateChanged', {
        userId,
        audioEnabled,
        videoEnabled
      });
    });

    // 연결 종료 시 정리
    socket.on('disconnect', () => {
      const roomId = socket.p2pRoomId;
      const userId = socket.userId || socket.id;
      
      if (roomId) {
        const call = this.calls.get(roomId);
        if (call) {
          call.participants.delete(userId);
          
          // 다른 참가자들에게 알림
          socket.to(`p2p:${roomId}`).emit('p2p:userLeft', {
            userId
          });
          
          // 방이 비었으면 삭제
          if (call.participants.size === 0) {
            this.calls.delete(roomId);
            this.logWebRTC(`Empty P2P room ${roomId} deleted on disconnect`);
          }
        }
      }
    });
  }
}

module.exports = P2PHandler;