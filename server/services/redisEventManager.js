const { redisPub, redisSub, cache } = require('../config/database-improved');

class RedisEventManager {
  constructor() {
    this.subscribers = new Map();
    this.channels = {
      USER_POSITION: 'user:position',
      USER_JOIN: 'user:join',
      USER_LEAVE: 'user:leave',
      ROOM_UPDATE: 'room:update',
      VIDEO_CALL: 'video:call',
      CHAT_MESSAGE: 'chat:message'
    };
    
    this.setupSubscriptions();
  }

  // Redis Pub/Sub 구독 설정
  setupSubscriptions() {
    // 모든 채널 구독
    Object.values(this.channels).forEach(channel => {
      redisSub.subscribe(channel, (err, count) => {
        if (err) {
          console.error(`Redis 구독 실패 ${channel}:`, err);
        } else {
          console.log(`📡 Redis 채널 구독: ${channel}`);
        }
      });
    });

    // 메시지 수신 처리
    redisSub.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        this.handleMessage(channel, data);
      } catch (error) {
        console.error('Redis 메시지 파싱 에러:', error);
      }
    });
  }

  // 메시지 처리
  handleMessage(channel, data) {
    const handlers = this.subscribers.get(channel);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`핸들러 실행 에러 (${channel}):`, error);
        }
      });
    }
  }

  // 이벤트 구독
  subscribe(channel, handler) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel).add(handler);
  }

  // 이벤트 발행
  async publish(channel, data) {
    try {
      await redisPub.publish(channel, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Redis 발행 실패 (${channel}):`, error);
      return false;
    }
  }

  // 사용자 위치 업데이트 (캐싱 포함)
  async updateUserPosition(userId, mapId, position, direction) {
    const key = `user:${userId}:position`;
    const data = {
      userId,
      mapId,
      position,
      direction,
      timestamp: Date.now()
    };

    // 캐시에 저장 (10초 TTL)
    await cache.set(key, data, 10);

    // 이벤트 발행
    await this.publish(this.channels.USER_POSITION, data);

    return data;
  }

  // 방별 사용자 목록 캐싱
  async getRoomUsers(mapId) {
    const key = `room:${mapId}:users`;
    
    // 캐시 확인
    let users = await cache.get(key);
    
    if (!users) {
      // 캐시 미스 시 데이터베이스에서 조회
      // (실제 구현은 데이터베이스 쿼리 필요)
      users = [];
      
      // 캐시에 저장 (30초 TTL)
      await cache.set(key, users, 30);
    }

    return users;
  }

  // 방 사용자 추가
  async addUserToRoom(mapId, userData) {
    const key = `room:${mapId}:users`;
    const users = await this.getRoomUsers(mapId);
    
    // 중복 제거 후 추가
    const updatedUsers = users.filter(u => u.userId !== userData.userId);
    updatedUsers.push(userData);
    
    // 캐시 업데이트
    await cache.set(key, updatedUsers, 30);
    
    // 이벤트 발행
    await this.publish(this.channels.ROOM_UPDATE, {
      mapId,
      users: updatedUsers,
      action: 'user_joined',
      userData
    });

    return updatedUsers;
  }

  // 방 사용자 제거
  async removeUserFromRoom(mapId, userId) {
    const key = `room:${mapId}:users`;
    const users = await this.getRoomUsers(mapId);
    
    const updatedUsers = users.filter(u => u.userId !== userId);
    
    // 캐시 업데이트
    await cache.set(key, updatedUsers, 30);
    
    // 이벤트 발행
    await this.publish(this.channels.ROOM_UPDATE, {
      mapId,
      users: updatedUsers,
      action: 'user_left',
      userId
    });

    return updatedUsers;
  }

  // 활성 사용자 세션 관리
  async setUserSession(userId, sessionData) {
    const key = `session:${userId}`;
    // 1시간 TTL
    await cache.set(key, sessionData, 3600);
    return true;
  }

  async getUserSession(userId) {
    const key = `session:${userId}`;
    return await cache.get(key);
  }

  async clearUserSession(userId) {
    const key = `session:${userId}`;
    await cache.del(key);
    
    // 관련 캐시도 정리
    await cache.delPattern(`user:${userId}:*`);
    
    return true;
  }

  // 전체 통계 캐싱
  async getStats() {
    const key = 'stats:global';
    let stats = await cache.get(key);
    
    if (!stats) {
      // 실제 통계 계산
      stats = {
        totalUsers: 0,
        activeRooms: 0,
        activeCalls: 0,
        timestamp: Date.now()
      };
      
      // 캐시에 저장 (1분 TTL)
      await cache.set(key, stats, 60);
    }

    return stats;
  }

  // 헬스체크
  async healthCheck() {
    try {
      // Redis Ping
      const redisPing = await redisPub.ping();
      
      // 캐시 테스트
      const testKey = 'health:check';
      await cache.set(testKey, { test: true }, 5);
      const testData = await cache.get(testKey);
      await cache.del(testKey);
      
      return {
        status: 'healthy',
        redis: redisPing === 'PONG',
        cache: testData?.test === true,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
}

// 싱글톤 인스턴스
const eventManager = new RedisEventManager();

module.exports = eventManager;