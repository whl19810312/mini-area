const Janode = require('janode');
const { v4: uuidv4 } = require('uuid');

class JanusService {
  constructor() {
    this.connection = null;
    this.sessions = new Map();
    this.rooms = new Map();
    this.areaRooms = new Map(); // 영역별 룸 관리
    this.janusUrl = process.env.JANUS_URL || 'ws://localhost:8188';
    this.janusSecret = process.env.JANUS_SECRET || '';
    this.janusApiSecret = process.env.JANUS_API_SECRET || '';
  }

  async initialize() {
    try {
      // Janus 서버 연결
      this.connection = await Janode.connect({
        url: this.janusUrl,
        apisecret: this.janusApiSecret
      });

      console.log('✅ Janus 서버 연결 성공:', this.janusUrl);

      // 기본 공개 영역 룸 생성
      await this.createPublicRoom();
      
      return true;
    } catch (error) {
      console.error('❌ Janus 서버 연결 실패:', error.message);
      throw error;
    }
  }

  async createPublicRoom() {
    try {
      const publicRoomId = 1234; // 고정된 공개 영역 룸 ID
      
      // 세션 생성
      const session = await this.connection.create();
      
      // VideoRoom 플러그인 연결
      const handle = await session.attach('janus.plugin.videoroom');
      
      // 공개 룸 생성
      const createResponse = await handle.message({
        request: 'create',
        room: publicRoomId,
        description: 'Public Area',
        publishers: 100,
        bitrate: 128000,
        fir_freq: 10,
        audiocodec: 'opus',
        videocodec: 'vp8',
        notify_joining: true,
        record: false,
        is_private: false,
        permanent: true
      });

      if (createResponse.videoroom === 'created' || createResponse.error_code === 426) {
        console.log('✅ 공개 영역 룸 생성/확인:', publicRoomId);
        this.rooms.set('public', {
          roomId: publicRoomId,
          session,
          handle,
          participants: new Map()
        });
      }

      return publicRoomId;
    } catch (error) {
      console.error('공개 룸 생성 실패:', error);
      throw error;
    }
  }

  async createAreaRoom(metaverseId, areaId, areaName) {
    try {
      const roomId = parseInt(`${metaverseId}${areaId}`);
      const roomKey = `${metaverseId}_${areaId}`;

      // 이미 생성된 룸인지 확인
      if (this.areaRooms.has(roomKey)) {
        return this.areaRooms.get(roomKey).roomId;
      }

      // 세션 생성
      const session = await this.connection.create();
      
      // VideoRoom 플러그인 연결
      const handle = await session.attach('janus.plugin.videoroom');
      
      // 영역별 룸 생성
      const createResponse = await handle.message({
        request: 'create',
        room: roomId,
        description: `Area: ${areaName}`,
        publishers: 50,
        bitrate: 256000,
        fir_freq: 10,
        audiocodec: 'opus',
        videocodec: 'vp8',
        notify_joining: true,
        record: false,
        is_private: false,
        permanent: false
      });

      if (createResponse.videoroom === 'created' || createResponse.error_code === 426) {
        console.log(`✅ 영역 룸 생성/확인: ${areaName} (${roomId})`);
        this.areaRooms.set(roomKey, {
          roomId,
          session,
          handle,
          areaName,
          participants: new Map()
        });
      }

      return roomId;
    } catch (error) {
      console.error('영역 룸 생성 실패:', error);
      throw error;
    }
  }

  async joinRoom(userId, username, roomType, roomInfo = {}) {
    try {
      let room;
      let roomId;

      if (roomType === 'public') {
        room = this.rooms.get('public');
        roomId = room.roomId;
      } else if (roomType === 'area') {
        const roomKey = `${roomInfo.metaverseId}_${roomInfo.areaId}`;
        room = this.areaRooms.get(roomKey);
        
        if (!room) {
          // 룸이 없으면 생성
          roomId = await this.createAreaRoom(
            roomInfo.metaverseId,
            roomInfo.areaId,
            roomInfo.areaName || 'Private Area'
          );
          room = this.areaRooms.get(roomKey);
        } else {
          roomId = room.roomId;
        }
      }

      if (!room) {
        throw new Error('룸을 찾을 수 없습니다');
      }

      // 새 세션과 핸들 생성
      const userSession = await this.connection.create();
      const userHandle = await userSession.attach('janus.plugin.videoroom');

      // 룸 참가
      const joinResponse = await userHandle.message({
        request: 'join',
        room: roomId,
        ptype: 'publisher',
        display: username,
        id: parseInt(userId)
      });

      // 사용자 정보 저장
      const participantInfo = {
        userId,
        username,
        session: userSession,
        handle: userHandle,
        roomId,
        roomType
      };

      room.participants.set(userId, participantInfo);
      this.sessions.set(userId, participantInfo);

      return {
        success: true,
        roomId,
        publishers: joinResponse.publishers || [],
        sessionId: userSession.id,
        handleId: userHandle.id
      };
    } catch (error) {
      console.error('룸 참가 실패:', error);
      throw error;
    }
  }

  async leaveRoom(userId) {
    try {
      const participant = this.sessions.get(userId);
      if (!participant) {
        return { success: false, message: '참가자를 찾을 수 없습니다' };
      }

      // 룸 나가기
      await participant.handle.message({
        request: 'leave'
      });

      // 세션 종료
      await participant.session.destroy();

      // 참가자 정보 제거
      if (participant.roomType === 'public') {
        const room = this.rooms.get('public');
        room.participants.delete(userId);
      } else if (participant.roomType === 'area') {
        // 영역 룸에서 제거
        for (const [key, room] of this.areaRooms) {
          if (room.participants.has(userId)) {
            room.participants.delete(userId);
            
            // 참가자가 없으면 룸 제거 (공개 룸은 유지)
            if (room.participants.size === 0) {
              await room.handle.message({
                request: 'destroy',
                room: room.roomId
              });
              await room.session.destroy();
              this.areaRooms.delete(key);
            }
            break;
          }
        }
      }

      this.sessions.delete(userId);

      return { success: true, message: '룸을 나갔습니다' };
    } catch (error) {
      console.error('룸 나가기 실패:', error);
      throw error;
    }
  }

  async switchRoom(userId, fromRoomType, toRoomType, roomInfo = {}) {
    try {
      // 현재 룸에서 나가기
      await this.leaveRoom(userId);

      // 새 룸으로 참가
      const participant = this.sessions.get(userId);
      const username = participant ? participant.username : userId;
      
      return await this.joinRoom(userId, username, toRoomType, roomInfo);
    } catch (error) {
      console.error('룸 전환 실패:', error);
      throw error;
    }
  }

  async configurePublisher(userId, offer) {
    try {
      const participant = this.sessions.get(userId);
      if (!participant) {
        throw new Error('참가자를 찾을 수 없습니다');
      }

      // Configure publisher with offer
      const response = await participant.handle.message({
        request: 'configure',
        audio: true,
        video: true
      }, { jsep: offer });

      return {
        success: true,
        jsep: response.jsep
      };
    } catch (error) {
      console.error('Publisher 설정 실패:', error);
      throw error;
    }
  }

  async handleIceCandidate(userId, candidate) {
    try {
      const participant = this.sessions.get(userId);
      if (!participant) {
        throw new Error('참가자를 찾을 수 없습니다');
      }

      await participant.handle.trickle(candidate);
      return { success: true };
    } catch (error) {
      console.error('ICE candidate 처리 실패:', error);
      throw error;
    }
  }

  async getRoomParticipants(roomType, roomInfo = {}) {
    try {
      let room;
      
      if (roomType === 'public') {
        room = this.rooms.get('public');
      } else if (roomType === 'area') {
        const roomKey = `${roomInfo.metaverseId}_${roomInfo.areaId}`;
        room = this.areaRooms.get(roomKey);
      }

      if (!room) {
        return [];
      }

      const response = await room.handle.message({
        request: 'listparticipants',
        room: room.roomId
      });

      return response.participants || [];
    } catch (error) {
      console.error('참가자 목록 조회 실패:', error);
      return [];
    }
  }

  async destroyAreaRoom(metaverseId, areaId) {
    try {
      const roomKey = `${metaverseId}_${areaId}`;
      const room = this.areaRooms.get(roomKey);
      
      if (!room) {
        return { success: false, message: '룸을 찾을 수 없습니다' };
      }

      // 룸 제거
      await room.handle.message({
        request: 'destroy',
        room: room.roomId
      });

      // 세션 종료
      await room.session.destroy();

      // 맵에서 제거
      this.areaRooms.delete(roomKey);

      return { success: true, message: '룸이 제거되었습니다' };
    } catch (error) {
      console.error('룸 제거 실패:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      // 모든 세션 종료
      for (const [userId, participant] of this.sessions) {
        await participant.session.destroy();
      }

      // 모든 룸 세션 종료
      for (const [key, room] of this.rooms) {
        await room.session.destroy();
      }

      for (const [key, room] of this.areaRooms) {
        await room.session.destroy();
      }

      // 연결 종료
      if (this.connection) {
        await this.connection.close();
      }

      this.sessions.clear();
      this.rooms.clear();
      this.areaRooms.clear();

      console.log('✅ Janus 연결 종료');
    } catch (error) {
      console.error('Janus 연결 종료 실패:', error);
    }
  }
}

module.exports = new JanusService();