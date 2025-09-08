const redis = require('redis');

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis 에러:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis 연결 성공');
        this.isConnected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('❌ Redis 연결 실패:', error);
      this.isConnected = false;
      return false;
    }
  }

  // [삭제됨] 공간별 사용자 캐릭터 정보 저장 - 더 이상 사용하지 않음
  async saveRoomUserCharacter(mapId, userId, characterData) {
    // 삭제된 기능
    return true;
  }

  // [삭제됨] 공간의 모든 사용자 캐릭터 정보 조회 - 더 이상 사용하지 않음
  async getRoomUsers(mapId) {
    // 삭제된 기능
    return [];
  }

  // [삭제됨] 특정 사용자 캐릭터 정보 조회 - 더 이상 사용하지 않음
  async getRoomUserCharacter(mapId, userId) {
    // 삭제된 기능
    return null;
  }

  // [삭제됨] 공간에서 사용자 제거 - 더 이상 사용하지 않음
  async removeRoomUser(mapId, userId) {
    // 삭제된 기능
    return true;
  }

  // [삭제됨] 공간의 모든 사용자 정보 삭제 - 더 이상 사용하지 않음
  async clearRoom(mapId) {
    // 삭제된 기능
    return true;
  }
  
  // [삭제됨] 공간별 사용자 수 업데이트 - 더 이상 사용하지 않음
  async updateRoomUserCount(mapId) {
    // 삭제된 기능
    return true;
  }
  
  // [삭제됨] 모든 공간의 사용자 통계 조회 - 더 이상 사용하지 않음
  async getAllRoomsStats() {
    // 삭제된 기능
    return {};
  }
  
  // [삭제됨] 특정 공간의 사용자 수 조회 - 더 이상 사용하지 않음
  async getRoomUserCount(mapId) {
    // 삭제된 기능
    return 0;
  }

  // 온라인 사용자 관리
  async setOnlineUser(userId, userInfo) {
    if (!this.isConnected) return false;
    
    try {
      const key = 'online:users';
      const userData = {
        userId,
        username: userInfo.username,
        socketId: userInfo.socketId,
        status: userInfo.status || 'online',
        currentMapId: userInfo.mapId || null,
        characterName: userInfo.characterName || userInfo.username,
        // 캐릭터 외형 정보 추가
        characterAppearance: {
          head: userInfo.characterAppearance?.head || userInfo.appearance?.head || null,
          top: userInfo.characterAppearance?.top || userInfo.appearance?.top || null,
          bottom: userInfo.characterAppearance?.bottom || userInfo.appearance?.bottom || null
        },
        // 캐릭터 위치 정보 추가
        position: userInfo.position || { x: 0, y: 0 },
        direction: userInfo.direction || 'down',
        loginTime: userInfo.loginTime || new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      await this.client.hSet(key, userId, JSON.stringify(userData));
      
      console.log(`🔵 온라인 사용자 등록: ${userInfo.username} (${userId})`);
      return true;
    } catch (error) {
      console.error('❌ 온라인 사용자 등록 실패:', error);
      return false;
    }
  }
  
  // 온라인 사용자 제거
  async removeOnlineUser(userId) {
    if (!this.isConnected) return false;
    
    try {
      const key = 'online:users';
      await this.client.hDel(key, userId);
      
      console.log(`🔴 온라인 사용자 제거: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ 온라인 사용자 제거 실패:', error);
      return false;
    }
  }
  
  // 모든 온라인 사용자 조회
  async getOnlineUsers() {
    if (!this.isConnected) return [];
    
    try {
      const key = 'online:users';
      const users = await this.client.hGetAll(key);
      
      const userList = [];
      for (const [userId, userData] of Object.entries(users)) {
        try {
          userList.push(JSON.parse(userData));
        } catch (e) {
          console.error('파싱 오류:', e);
        }
      }
      
      return userList;
    } catch (error) {
      console.error('❌ 온라인 사용자 조회 실패:', error);
      return [];
    }
  }
  
  // 특정 온라인 사용자 조회
  async getOnlineUser(userId) {
    if (!this.isConnected) return null;
    
    try {
      const key = 'online:users';
      const userData = await this.client.hGet(key, userId);
      
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('❌ 온라인 사용자 조회 실패:', error);
      return null;
    }
  }
  
  // 온라인 사용자 상태 업데이트
  async updateOnlineUserStatus(userId, status) {
    if (!this.isConnected) return false;
    
    try {
      const key = 'online:users';
      const userData = await this.client.hGet(key, userId);
      
      if (userData) {
        const user = JSON.parse(userData);
        user.status = status;
        user.lastActivity = new Date().toISOString();
        
        await this.client.hSet(key, userId, JSON.stringify(user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ 사용자 상태 업데이트 실패:', error);
      return false;
    }
  }
  
  // [삭제됨] 온라인 사용자 수 업데이트 - 더 이상 사용하지 않음
  async updateOnlineUsersCount() {
    // 삭제된 기능
    return true;
  }
  
  // [삭제됨] 온라인 사용자 수 조회 - 더 이상 사용하지 않음
  async getOnlineUsersCount() {
    // 삭제된 기능 - 메모리에서 직접 계산
    if (!this.isConnected) return 0;
    
    try {
      const key = 'online:users';
      const users = await this.client.hGetAll(key);
      return Object.keys(users).length;
    } catch (error) {
      return 0;
    }
  }
  
  // 모든 온라인 사용자 초기화 (서버 재시작 시)
  async clearAllOnlineUsers() {
    if (!this.isConnected) return false;
    
    try {
      await this.client.del('online:users');
      
      console.log('🧹 모든 온라인 사용자 초기화');
      return true;
    } catch (error) {
      console.error('❌ 온라인 사용자 초기화 실패:', error);
      return false;
    }
  }
  
  // 연결 종료
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('👋 Redis 연결 종료');
    }
  }
}

module.exports = new RedisManager();