const { Sequelize } = require('sequelize');
const Redis = require('ioredis');

// PostgreSQL 연결 설정 개선
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'metaverse',
  logging: false,
  pool: {
    max: 20,           // 최대 연결 수 증가
    min: 5,            // 최소 연결 수 증가
    acquire: 60000,    // 연결 획득 시간 증가 (60초)
    idle: 10000,       // 유휴 시간
    evict: 1000,       // 연결 체크 주기
    handleDisconnects: true
  },
  retry: {
    match: [
      /ETIMEDOUT/,
      /ECONNREFUSED/,
      /ENOTFOUND/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/
    ],
    max: 5  // 최대 재시도 횟수
  },
  dialectOptions: {
    connectTimeout: 60000,  // 연결 타임아웃 60초
    keepAlive: true,
    keepAliveInitialDelay: 0
  }
});

// Redis 클라이언트 설정
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
  disconnectTimeout: 2000,
  commandTimeout: 5000,
  keepAlive: 30000,
  noDelay: true,
  enableOfflineQueue: true,
  // 연결 끊김 시 자동 재연결
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // 재연결
    }
    return 1; // 1ms 후 재연결
  }
});

// Redis Pub/Sub용 클라이언트 (별도 연결 필요)
const redisPub = redis.duplicate();
const redisSub = redis.duplicate();

// 연결 상태 관리
let isPostgresConnected = false;
let isRedisConnected = false;

// PostgreSQL 연결 체크 및 재연결
const checkPostgresConnection = async () => {
  try {
    await sequelize.authenticate();
    if (!isPostgresConnected) {
      console.log('✅ PostgreSQL 연결 복구됨');
      isPostgresConnected = true;
    }
    return true;
  } catch (error) {
    if (isPostgresConnected) {
      console.error('❌ PostgreSQL 연결 끊김:', error.message);
      isPostgresConnected = false;
    }
    return false;
  }
};

// 자동 재연결 로직
const setupAutoReconnect = () => {
  // PostgreSQL 헬스체크 (30초마다)
  setInterval(async () => {
    if (!isPostgresConnected) {
      console.log('🔄 PostgreSQL 재연결 시도...');
      const connected = await checkPostgresConnection();
      if (connected) {
        // 재연결 후 필요한 초기화 작업
        await sequelize.sync({ alter: false });
      }
    } else {
      // 연결 상태 확인
      checkPostgresConnection();
    }
  }, 30000);

  // Redis 헬스체크
  setInterval(() => {
    redis.ping((err, result) => {
      if (err) {
        console.error('❌ Redis 응답 없음:', err.message);
        isRedisConnected = false;
      } else if (result === 'PONG') {
        if (!isRedisConnected) {
          console.log('✅ Redis 연결 복구됨');
          isRedisConnected = true;
        }
      }
    });
  }, 30000);
};

// Redis 이벤트 핸들러
redis.on('connect', () => {
  console.log('🔗 Redis 연결 시도 중...');
});

redis.on('ready', () => {
  console.log('✅ Redis 연결 성공');
  isRedisConnected = true;
});

redis.on('error', (err) => {
  console.error('❌ Redis 에러:', err.message);
  isRedisConnected = false;
});

redis.on('close', () => {
  console.log('🔌 Redis 연결 종료');
  isRedisConnected = false;
});

redis.on('reconnecting', (delay) => {
  console.log(`🔄 Redis 재연결 시도 중... (${delay}ms 후)`);
});

// Sequelize 이벤트 핸들러
sequelize.beforeConnect((config) => {
  console.log('🔗 PostgreSQL 연결 시도 중...');
});

sequelize.afterConnect(() => {
  console.log('✅ PostgreSQL 연결 성공');
  isPostgresConnected = true;
});

sequelize.afterDisconnect(() => {
  console.log('🔌 PostgreSQL 연결 종료');
  isPostgresConnected = false;
});

// 캐싱 헬퍼 함수들
const cache = {
  // 캐시 설정 (TTL 기본 5분)
  async set(key, value, ttl = 300) {
    try {
      if (isRedisConnected) {
        await redis.setex(key, ttl, JSON.stringify(value));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  // 캐시 가져오기
  async get(key) {
    try {
      if (isRedisConnected) {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // 캐시 삭제
  async del(key) {
    try {
      if (isRedisConnected) {
        await redis.del(key);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  // 패턴으로 캐시 삭제
  async delPattern(pattern) {
    try {
      if (isRedisConnected) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }
};

// 초기화 함수
const initialize = async () => {
  // PostgreSQL 연결
  const pgConnected = await checkPostgresConnection();
  
  // 자동 재연결 설정
  setupAutoReconnect();
  
  // 초기 상태 반환
  return {
    postgres: pgConnected,
    redis: isRedisConnected
  };
};

module.exports = {
  sequelize,
  redis,
  redisPub,
  redisSub,
  cache,
  initialize,
  checkPostgresConnection,
  isConnected: () => ({
    postgres: isPostgresConnected,
    redis: isRedisConnected
  })
};