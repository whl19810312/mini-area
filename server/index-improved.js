const express = require('express');
const cors = require('cors');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const passport = require('passport');
const path = require('path');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
require('dotenv').config();

// 개선된 데이터베이스 연결 사용
const { sequelize, redis, initialize, isConnected } = require('./config/database-improved');
const eventManager = require('./services/redisEventManager');

const authRoutes = require('./routes/auth');
const mapRoutes = require('./routes/map');
const characterRoutes = require('./routes/character');
const userRoutes = require('./routes/user');
const livekitRoutes = require('./routes/livekit');
const videoCallRoutes = require('./routes/videoCallRoutes');
const PrivateAreaHandler = require('./websocket/privateAreaHandler');
const MetaverseHandler = require('./websocket/metaverseHandler');

const app = express();

// HTTPS 서버 생성
const server = https.createServer({
  key: fs.readFileSync('../ssl/key.pem'),
  cert: fs.readFileSync('../ssl/cert.pem')
}, app);

// Socket.IO 설정
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e8,
  allowUpgrades: true,
  forceBase64: false
});

const PORT = process.env.PORT || 7000;

// 미들웨어
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin'],
  exposedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Redis 세션 스토어 설정
app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true,  // HTTPS 환경
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24시간
    sameSite: 'none'
  },
  name: 'sessionId'
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 헬스체크 엔드포인트
app.get('/health', async (req, res) => {
  const dbStatus = isConnected();
  const redisHealth = await eventManager.healthCheck();
  
  const isHealthy = dbStatus.postgres && dbStatus.redis;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    database: {
      postgres: dbStatus.postgres,
      redis: dbStatus.redis
    },
    cache: redisHealth,
    timestamp: new Date().toISOString()
  });
});

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/livekit', livekitRoutes);
app.use('/api/video-call', videoCallRoutes);

// 정적 파일 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error('서버 에러:', err.stack);
  
  // 데이터베이스 연결 에러 처리
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    return res.status(503).json({
      error: '데이터베이스 연결 실패',
      message: '잠시 후 다시 시도해주세요.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || '서버 에러가 발생했습니다.',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// WebSocket 이벤트 매니저 통합
const setupWebSocketWithRedis = () => {
  const connectedUsers = new Map();
  const roomUsers = new Map();

  io.on('connection', (socket) => {
    console.log('🔗 새 WebSocket 연결:', socket.id);

    // Redis 이벤트 구독
    eventManager.subscribe('user:position', (data) => {
      // 다른 서버의 위치 업데이트를 브로드캐스트
      socket.to(data.mapId).emit('character-position-update', data);
    });

    eventManager.subscribe('room:update', (data) => {
      // 방 업데이트 브로드캐스트
      socket.to(data.mapId).emit('room-users-update', data);
    });

    // 사용자 연결
    socket.on('user-connected', async (userData) => {
      connectedUsers.set(socket.id, userData);
      
      // Redis에 세션 저장
      await eventManager.setUserSession(userData.id, {
        socketId: socket.id,
        ...userData,
        connectedAt: Date.now()
      });

      console.log(`👤 사용자 연결: ${userData.username}`);
    });

    // 맵 입장
    socket.on('join-map', async (data) => {
      const { mapId, userId, username } = data;
      socket.join(mapId);

      // Redis를 통한 방 사용자 관리
      const userData = {
        userId,
        username,
        socketId: socket.id,
        joinedAt: Date.now()
      };

      await eventManager.addUserToRoom(mapId, userData);

      // 현재 방의 모든 사용자 가져오기 (캐시 활용)
      const users = await eventManager.getRoomUsers(mapId);
      
      socket.emit('room-users-list', { users });
      socket.to(mapId).emit('user-joined', userData);
    });

    // 위치 업데이트
    socket.on('character-position-update', async (data) => {
      const { mapId, userId, position, direction } = data;
      
      // Redis 캐싱 및 Pub/Sub
      await eventManager.updateUserPosition(userId, mapId, position, direction);
    });

    // 맵 나가기
    socket.on('leave-map', async (data) => {
      const { mapId, userId } = data;
      socket.leave(mapId);

      // Redis를 통한 방 사용자 제거
      await eventManager.removeUserFromRoom(mapId, userId);
      
      socket.to(mapId).emit('user-left', { userId });
    });

    // 연결 해제
    socket.on('disconnect', async () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        // Redis 세션 정리
        await eventManager.clearUserSession(user.id);
        
        // 모든 방에서 제거
        for (const room of socket.rooms) {
          if (room !== socket.id) {
            await eventManager.removeUserFromRoom(room, user.id);
          }
        }
        
        connectedUsers.delete(socket.id);
        console.log(`👤 사용자 연결 해제: ${user.username}`);
      }
    });

    // 기존 핸들러 통합
    PrivateAreaHandler(io, socket, connectedUsers);
    MetaverseHandler(io, socket);
  });
};

// 서버 시작
const startServer = async () => {
  try {
    console.log('🚀 서버 시작 중...');
    
    // 데이터베이스 초기화
    const dbStatus = await initialize();
    
    if (dbStatus.postgres) {
      console.log('✅ PostgreSQL 연결 성공');
      
      // 테이블 동기화
      await sequelize.sync({ alter: false });
      console.log('✅ 데이터베이스 테이블 동기화 완료');
    } else {
      console.warn('⚠️ PostgreSQL 연결 실패 - 제한된 모드로 실행');
    }

    if (dbStatus.redis) {
      console.log('✅ Redis 연결 성공');
    } else {
      console.warn('⚠️ Redis 연결 실패 - 캐싱 비활성화');
    }

    // WebSocket 설정
    setupWebSocketWithRedis();

    // 서버 시작
    server.listen(PORT, '0.0.0.0', () => {
      const localIP = require('os').networkInterfaces()['eth0']?.[0]?.address || 
                     require('os').networkInterfaces()['wlan0']?.[0]?.address ||
                     require('os').networkInterfaces()['Wi-Fi']?.[0]?.address ||
                     '192.168.x.x';
      
      console.log('🎥 화상통신 최적화 서버 시작!');
      console.log(`🔒 HTTPS 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`LAN 접속: https://${localIP}:${PORT}`);
      console.log(`WebSocket 접속: wss://${localIP}:${PORT}`);
      console.log('WebRTC 화상통신: 지원됨');
      console.log('카메라/마이크: HTTPS 환경에서 활성화');
      console.log('Redis 캐싱: ' + (dbStatus.redis ? '활성화' : '비활성화'));
      console.log('헬스체크: /health');
    });

    // 종료 처리
    process.on('SIGTERM', async () => {
      console.log('🛑 서버 종료 중...');
      
      // Redis 연결 정리
      await redis.quit();
      
      // PostgreSQL 연결 정리
      await sequelize.close();
      
      // 서버 종료
      server.close(() => {
        console.log('✅ 서버가 안전하게 종료되었습니다.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

// Gmail 설정 정보 출력
if (process.env.GMAIL_USER) {
  console.log('Gmail을 사용하여 이메일을 전송합니다.');
}

// 서버 시작
startServer();