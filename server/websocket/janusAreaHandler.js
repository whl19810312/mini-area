const janusService = require('../services/janusService');

class JanusAreaHandler {
  constructor(io) {
    this.io = io;
    this.userRooms = new Map(); // userId -> { roomType, roomInfo }
    this.areaUsers = new Map(); // areaKey -> Set<userId>
  }

  handleConnection(socket) {
    console.log(`Janus 영역 핸들러 연결: ${socket.id}`);

    // 공개 영역 입장
    socket.on('janus:join-public', async (data) => {
      await this.handleJoinPublicArea(socket, data);
    });

    // 프라이빗 영역 입장
    socket.on('janus:join-area', async (data) => {
      await this.handleJoinPrivateArea(socket, data);
    });

    // 영역 전환
    socket.on('janus:switch-area', async (data) => {
      await this.handleSwitchArea(socket, data);
    });

    // 영역 나가기
    socket.on('janus:leave-area', async (data) => {
      await this.handleLeaveArea(socket, data);
    });

    // 사용자 위치 업데이트 (영역 자동 전환)
    socket.on('janus:update-position', async (data) => {
      await this.handlePositionUpdate(socket, data);
    });

    // 연결 해제
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  async handleJoinPublicArea(socket, data) {
    try {
      const { userId, username, metaverseId } = data;

      // Janus 공개 룸 참가
      const result = await janusService.joinRoom(userId, username, 'public');

      // 사용자 룸 정보 저장
      this.userRooms.set(userId, {
        roomType: 'public',
        roomInfo: { metaverseId },
        socketId: socket.id
      });

      // Socket.io 룸 참가
      socket.join(`janus:public:${metaverseId}`);

      // 성공 응답
      socket.emit('janus:joined-public', {
        success: true,
        roomId: result.roomId,
        publishers: result.publishers
      });

      // 다른 사용자들에게 알림
      socket.to(`janus:public:${metaverseId}`).emit('janus:user-joined', {
        userId,
        username,
        roomType: 'public'
      });

      console.log(`✅ 사용자 ${username}(${userId})가 공개 영역 참가`);
    } catch (error) {
      console.error('공개 영역 참가 실패:', error);
      socket.emit('janus:join-error', {
        error: error.message
      });
    }
  }

  async handleJoinPrivateArea(socket, data) {
    try {
      const { userId, username, metaverseId, areaId, areaName } = data;
      const areaKey = `${metaverseId}_${areaId}`;

      // 이전 룸에서 나가기
      const currentRoom = this.userRooms.get(userId);
      if (currentRoom) {
        await janusService.leaveRoom(userId);
        
        // Socket.io 룸에서도 나가기
        if (currentRoom.roomType === 'public') {
          socket.leave(`janus:public:${currentRoom.roomInfo.metaverseId}`);
        } else {
          const oldAreaKey = `${currentRoom.roomInfo.metaverseId}_${currentRoom.roomInfo.areaId}`;
          socket.leave(`janus:area:${oldAreaKey}`);
          
          // 영역 사용자 목록 업데이트
          const areaUsers = this.areaUsers.get(oldAreaKey);
          if (areaUsers) {
            areaUsers.delete(userId);
            if (areaUsers.size === 0) {
              this.areaUsers.delete(oldAreaKey);
            }
          }
        }
      }

      // Janus 영역 룸 참가
      const result = await janusService.joinRoom(userId, username, 'area', {
        metaverseId,
        areaId,
        areaName
      });

      // 사용자 룸 정보 업데이트
      this.userRooms.set(userId, {
        roomType: 'area',
        roomInfo: { metaverseId, areaId, areaName },
        socketId: socket.id
      });

      // 영역 사용자 목록 업데이트
      if (!this.areaUsers.has(areaKey)) {
        this.areaUsers.set(areaKey, new Set());
      }
      this.areaUsers.get(areaKey).add(userId);

      // Socket.io 룸 참가
      socket.join(`janus:area:${areaKey}`);

      // 성공 응답
      socket.emit('janus:joined-area', {
        success: true,
        roomId: result.roomId,
        areaId,
        areaName,
        publishers: result.publishers
      });

      // 같은 영역의 다른 사용자들에게 알림
      socket.to(`janus:area:${areaKey}`).emit('janus:user-joined', {
        userId,
        username,
        roomType: 'area',
        areaId,
        areaName
      });

      console.log(`✅ 사용자 ${username}(${userId})가 ${areaName} 영역 참가`);
    } catch (error) {
      console.error('프라이빗 영역 참가 실패:', error);
      socket.emit('janus:join-error', {
        error: error.message
      });
    }
  }

  async handleSwitchArea(socket, data) {
    try {
      const { userId, fromRoomType, toRoomType, roomInfo } = data;

      // Janus 룸 전환
      const result = await janusService.switchRoom(
        userId,
        fromRoomType,
        toRoomType,
        roomInfo
      );

      // Socket.io 룸 전환
      const currentRoom = this.userRooms.get(userId);
      if (currentRoom) {
        // 이전 룸에서 나가기
        if (currentRoom.roomType === 'public') {
          socket.leave(`janus:public:${currentRoom.roomInfo.metaverseId}`);
        } else {
          const oldAreaKey = `${currentRoom.roomInfo.metaverseId}_${currentRoom.roomInfo.areaId}`;
          socket.leave(`janus:area:${oldAreaKey}`);
          
          // 영역 사용자 목록 업데이트
          const areaUsers = this.areaUsers.get(oldAreaKey);
          if (areaUsers) {
            areaUsers.delete(userId);
            if (areaUsers.size === 0) {
              this.areaUsers.delete(oldAreaKey);
            }
          }
        }
      }

      // 새 룸으로 참가
      if (toRoomType === 'public') {
        socket.join(`janus:public:${roomInfo.metaverseId}`);
      } else {
        const newAreaKey = `${roomInfo.metaverseId}_${roomInfo.areaId}`;
        socket.join(`janus:area:${newAreaKey}`);
        
        // 영역 사용자 목록 업데이트
        if (!this.areaUsers.has(newAreaKey)) {
          this.areaUsers.set(newAreaKey, new Set());
        }
        this.areaUsers.get(newAreaKey).add(userId);
      }

      // 사용자 룸 정보 업데이트
      this.userRooms.set(userId, {
        roomType: toRoomType,
        roomInfo,
        socketId: socket.id
      });

      // 성공 응답
      socket.emit('janus:switched-area', {
        success: true,
        roomId: result.roomId,
        roomType: toRoomType,
        publishers: result.publishers
      });

      console.log(`✅ 사용자 ${userId}가 ${fromRoomType}에서 ${toRoomType}으로 전환`);
    } catch (error) {
      console.error('영역 전환 실패:', error);
      socket.emit('janus:switch-error', {
        error: error.message
      });
    }
  }

  async handleLeaveArea(socket, data) {
    try {
      const { userId } = data;

      // Janus 룸 나가기
      await janusService.leaveRoom(userId);

      // Socket.io 룸에서 나가기
      const currentRoom = this.userRooms.get(userId);
      if (currentRoom) {
        if (currentRoom.roomType === 'public') {
          socket.leave(`janus:public:${currentRoom.roomInfo.metaverseId}`);
          
          // 다른 사용자들에게 알림
          socket.to(`janus:public:${currentRoom.roomInfo.metaverseId}`).emit('janus:user-left', {
            userId,
            roomType: 'public'
          });
        } else {
          const areaKey = `${currentRoom.roomInfo.metaverseId}_${currentRoom.roomInfo.areaId}`;
          socket.leave(`janus:area:${areaKey}`);
          
          // 영역 사용자 목록 업데이트
          const areaUsers = this.areaUsers.get(areaKey);
          if (areaUsers) {
            areaUsers.delete(userId);
            if (areaUsers.size === 0) {
              this.areaUsers.delete(areaKey);
            }
          }
          
          // 다른 사용자들에게 알림
          socket.to(`janus:area:${areaKey}`).emit('janus:user-left', {
            userId,
            roomType: 'area',
            areaId: currentRoom.roomInfo.areaId
          });
        }
      }

      // 사용자 룸 정보 제거
      this.userRooms.delete(userId);

      // 성공 응답
      socket.emit('janus:left-area', {
        success: true
      });

      console.log(`✅ 사용자 ${userId}가 영역 나감`);
    } catch (error) {
      console.error('영역 나가기 실패:', error);
      socket.emit('janus:leave-error', {
        error: error.message
      });
    }
  }

  async handlePositionUpdate(socket, data) {
    try {
      const { userId, position, currentArea } = data;
      const currentRoom = this.userRooms.get(userId);

      if (!currentRoom) return;

      // 현재 공개 영역에 있고, 프라이빗 영역으로 이동한 경우
      if (currentRoom.roomType === 'public' && currentArea && currentArea.type === 'private') {
        await this.handleJoinPrivateArea(socket, {
          userId,
          username: data.username,
          metaverseId: currentRoom.roomInfo.metaverseId,
          areaId: currentArea.id,
          areaName: currentArea.name
        });
      }
      // 현재 프라이빗 영역에 있고, 공개 영역으로 이동한 경우
      else if (currentRoom.roomType === 'area' && (!currentArea || currentArea.type === 'public')) {
        await this.handleJoinPublicArea(socket, {
          userId,
          username: data.username,
          metaverseId: currentRoom.roomInfo.metaverseId
        });
      }
      // 다른 프라이빗 영역으로 이동한 경우
      else if (currentRoom.roomType === 'area' && currentArea && 
               currentArea.type === 'private' && currentArea.id !== currentRoom.roomInfo.areaId) {
        await this.handleJoinPrivateArea(socket, {
          userId,
          username: data.username,
          metaverseId: currentRoom.roomInfo.metaverseId,
          areaId: currentArea.id,
          areaName: currentArea.name
        });
      }
    } catch (error) {
      console.error('위치 업데이트 처리 실패:', error);
    }
  }

  handleDisconnect(socket) {
    // 연결이 끊긴 사용자 찾기
    for (const [userId, roomInfo] of this.userRooms) {
      if (roomInfo.socketId === socket.id) {
        // Janus 룸에서 나가기
        janusService.leaveRoom(userId).catch(err => {
          console.error('연결 해제 시 룸 나가기 실패:', err);
        });

        // 사용자 정보 제거
        this.userRooms.delete(userId);

        // 영역 사용자 목록에서 제거
        if (roomInfo.roomType === 'area') {
          const areaKey = `${roomInfo.roomInfo.metaverseId}_${roomInfo.roomInfo.areaId}`;
          const areaUsers = this.areaUsers.get(areaKey);
          if (areaUsers) {
            areaUsers.delete(userId);
            if (areaUsers.size === 0) {
              this.areaUsers.delete(areaKey);
            }
          }
        }

        console.log(`사용자 ${userId} 연결 해제`);
        break;
      }
    }
  }

  // 영역별 사용자 수 조회
  getAreaUserCount(metaverseId, areaId) {
    const areaKey = `${metaverseId}_${areaId}`;
    const areaUsers = this.areaUsers.get(areaKey);
    return areaUsers ? areaUsers.size : 0;
  }

  // 전체 활성 영역 수 조회
  getActiveAreasCount() {
    return this.areaUsers.size;
  }

  // 공개 영역 사용자 수 조회
  getPublicAreaUserCount(metaverseId) {
    let count = 0;
    for (const [userId, roomInfo] of this.userRooms) {
      if (roomInfo.roomType === 'public' && roomInfo.roomInfo.metaverseId === metaverseId) {
        count++;
      }
    }
    return count;
  }
}

module.exports = JanusAreaHandler;