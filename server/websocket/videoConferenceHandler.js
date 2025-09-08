// Janus VideoRoom 화상회의 WebSocket 핸들러
// P2P 대신 Janus VideoRoom을 통한 중앙집중식 처리

const janusService = require('../services/janusService');

const handleVideoConference = (io, socket, connectedUsers) => {
  console.log('📹 Janus 화상회의 핸들러 초기화:', socket.id);

  // 화상회의 방 입장 (Janus VideoRoom 연동)
  socket.on('join-video-room', async ({ roomId, userId }) => {
    console.log(`📹 Janus VideoRoom 입장 요청: 사용자 ${userId} → 방 ${roomId}`);
    
    try {
      // Socket.IO 방에 입장 (알림용)
      socket.join(`video-room-${roomId}`);
      socket.userId = userId;
      socket.videoRoomId = roomId;
      
      // 같은 방의 다른 사용자들에게 알림
      socket.to(`video-room-${roomId}`).emit('new-video-participant', {
        userId,
        socketId: socket.id
      });

      // Janus 룸 참가 처리는 클라이언트가 직접 API 호출
      console.log(`✅ Socket.IO 방 입장 완료: ${roomId}`);
    } catch (error) {
      console.error('❌ VideoRoom 입장 실패:', error);
      socket.emit('video-error', {
        message: 'VideoRoom 입장에 실패했습니다.',
        error: error.message
      });
    }
  });

  // 화상회의 방 퇴장 (Janus VideoRoom 연동)
  socket.on('leave-video-room', async ({ roomId, userId }) => {
    console.log(`📹 Janus VideoRoom 퇴장 요청: 사용자 ${userId} ← 방 ${roomId}`);
    
    try {
      // Socket.IO 방에서 퇴장
      socket.leave(`video-room-${roomId}`);
      
      // 같은 방의 다른 사용자들에게 알림
      socket.to(`video-room-${roomId}`).emit('video-participant-left', {
        userId,
        socketId: socket.id
      });

      // Janus 룸 퇴장 처리는 클라이언트가 직접 API 호출
      console.log(`✅ Socket.IO 방 퇴장 완료: ${roomId}`);
    } catch (error) {
      console.error('❌ VideoRoom 퇴장 실패:', error);
    }
  });

  // 참가자 목록 요청
  socket.on('get-video-participants', async ({ roomId }) => {
    try {
      // Socket.IO 방의 참가자 목록 조회
      const room = io.sockets.adapter.rooms.get(`video-room-${roomId}`);
      const participants = [];
      
      if (room) {
        for (const socketId of room) {
          const participantSocket = io.sockets.sockets.get(socketId);
          if (participantSocket && participantSocket.userId) {
            participants.push({
              userId: participantSocket.userId,
              socketId: participantSocket.id
            });
          }
        }
      }

      socket.emit('video-participants', {
        roomId,
        participants
      });
    } catch (error) {
      console.error('❌ 참가자 목록 조회 실패:', error);
    }
  });

  // 비디오 토글 상태 전달 (UI 동기화용)
  socket.on('video-toggle', ({ roomId, isEnabled }) => {
    console.log(`📹 비디오 토글: ${socket.userId} - ${isEnabled ? 'ON' : 'OFF'}`);
    
    socket.to(`video-room-${roomId}`).emit('video-toggle', {
      userId: socket.userId,
      isEnabled
    });
  });

  // 오디오 토글 상태 전달 (UI 동기화용)
  socket.on('audio-toggle', ({ roomId, isEnabled }) => {
    console.log(`🎤 오디오 토글: ${socket.userId} - ${isEnabled ? 'ON' : 'OFF'}`);
    
    socket.to(`video-room-${roomId}`).emit('audio-toggle', {
      userId: socket.userId,
      isEnabled
    });
  });

  // Janus 이벤트 전달 (필요시)
  socket.on('janus-event', ({ roomId, event, data }) => {
    console.log(`🔄 Janus 이벤트: ${event}`, data);
    
    // 룸의 다른 참가자들에게 이벤트 전달
    socket.to(`video-room-${roomId}`).emit('janus-event', {
      userId: socket.userId,
      event,
      data
    });
  });

  // 연결 해제 시 정리
  socket.on('disconnect', () => {
    console.log(`📹 화상회의 연결 해제: ${socket.id}`);
    
    // 모든 화상회의 방에서 퇴장 알림
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('video-room-')) {
        const roomId = room.replace('video-room-', '');
        socket.to(room).emit('video-participant-left', {
          userId: socket.userId,
          socketId: socket.id
        });
      }
    });

    // Janus 세션 정리는 janusService에서 처리
    if (socket.userId && socket.videoRoomId) {
      console.log(`🔚 Janus 세션 정리: 사용자 ${socket.userId}`);
      // janusService가 세션을 관리하므로 여기서는 로그만
    }
  });
};

module.exports = handleVideoConference;