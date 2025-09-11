const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const socketIo = require('socket.io');
require('dotenv').config();

const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const mapRoutes = require('./routes/map');
const characterRoutes = require('./routes/character');
const userRoutes = require('./routes/user');
const PrivateAreaHandler = require('./websocket/privateAreaHandler');
const MetaverseHandler = require('./websocket/metaverseHandler');

const app = express();

// HTTP 서버 생성
const http = require('http');
const server = http.createServer(app);

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
  maxHttpBufferSize: 1e6, // 1MB
  allowUpgrades: true,
  forceBase64: false
});

const PORT = process.env.PORT || 3000;

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// CORS 설정
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, // HTTPS 필수
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

// 정적 파일 서빙
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// WebSocket 핸들러 초기화
const privateAreaHandler = new PrivateAreaHandler(io);
const metaverseHandler = new MetaverseHandler(io);

// WebSocket 핸들러를 req 객체에 주입하는 미들웨어
app.use((req, res, next) => {
  req.io = io;
  req.metaverseHandler = metaverseHandler;
  req.privateAreaHandler = privateAreaHandler;
  next();
});

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/user', userRoutes);

// 클라이언트 호환성을 위한 추가 라우트 (api 접두사 없이)
app.use('/maps', mapRoutes);
app.use('/characters', characterRoutes);
app.use('/user', userRoutes);

// 화상통신 상태 확인 엔드포인트
app.get('/api/webrtc/status', (req, res) => {
  res.json({
    success: true,
    message: 'WebRTC 서버 정상 작동',
    timestamp: new Date().toISOString(),
    https: true,
    wss: true,
    privateAreas: privateAreaHandler.getActiveAreasCount ? privateAreaHandler.getActiveAreasCount() : 0,
    activeConnections: io.engine.clientsCount
  });
});

// 에러 핸들링 미들웨어
app.use((error, req, res, next) => {
  console.error('서버 오류:', error);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.',
    error: error.message
  });
});

// WebSocket 연결 처리 (화상통신 최적화)
io.on('connection', (socket) => {
  console.log('새로운 WebSocket 연결 (화상통신 준비):', socket.id);
  console.log('연결 정보:', {
    id: socket.id,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    origin: socket.handshake.headers.origin,
    secure: socket.handshake.secure
  });
  
      // mini area 핸들러가 먼저 처리 (방 입장/퇴장, 위치 업데이트 등)
  metaverseHandler.handleConnection(socket);
  
  // 프라이빗 영역 핸들러도 처리 (화상통화 등)
  privateAreaHandler.handleConnection(socket);
});

// WebSocket 연결 시도 로깅
io.engine.on('connection_error', (err) => {
  console.error('❌ WebSocket 연결 오류:', err);
});

io.engine.on('initial_headers', (headers, req) => {
  console.log('WebSocket 초기 헤더:', headers);
  console.log('WebSocket 요청 정보:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    secure: req.secure
  });
});

// 데이터베이스 연결
sequelize.authenticate()
  .then(() => {
    console.log('✅ PostgreSQL 데이터베이스 연결 성공');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('✅ 데이터베이스 테이블 동기화 완료');
  })
  .catch(err => {
    console.error('❌ PostgreSQL 연결 실패:', err.message);
  });

// 서버 IP 자동 감지 함수
const getServerIP = () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  // LAN IP 찾기
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // IPv4이고 내부 네트워크가 아닌 주소 찾기
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  
  // LAN IP를 찾지 못한 경우 localhost 반환
  return 'localhost';
};

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Mini Area 서버 시작!');
  console.log(`📡 HTTP 서버가 포트 ${PORT}에서 실행 중입니다.`);
  const serverIP = getServerIP();
  console.log(`LAN 접속: http://${serverIP}:${PORT}`);
  console.log(`WebSocket 접속: ws://${serverIP}:${PORT}`);
}); 