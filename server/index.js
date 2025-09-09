const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const https = require('https'); // HTTP → HTTPS
const fs = require('fs'); // SSL 인증서 읽기용
const socketIo = require('socket.io');
require('dotenv').config();

const logger = require('./utils/logger');
const { validateWebRTCConfig } = require('./utils/validateConfig');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const mapRoutes = require('./routes/map');
const characterRoutes = require('./routes/character');
const userRoutes = require('./routes/user');
const PrivateAreaHandler = require('./websocket/privateAreaHandler');
const MetaverseHandler = require('./websocket/metaverseHandler');

// WebRTC 모드에 따라 핸들러 선택
const webrtcMode = process.env.WEBRTC_MODE || 'p2p';
let videoHandler = null;

if (webrtcMode === 'mediasoup') {
  const MediaSoupHandler = require('./websocket/mediasoupHandler');
  videoHandler = new MediaSoupHandler(null); // io는 나중에 설정
} else {
  const P2PHandler = require('./websocket/p2pHandler');
  videoHandler = new P2PHandler(null); // io는 나중에 설정
}

logger.info(`WebRTC Mode: ${webrtcMode.toUpperCase()}`);

const app = express();

// HTTPS 서버 생성 (WebRTC 필수) - mkcert 신뢰할 수 있는 인증서 사용
const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem'))
}, app);

// Socket.IO 설정 (WSS 지원)
const io = socketIo(server, {
  cors: {
    origin: "*", // 모든 origin 허용 (화상통신용)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
  },
  transports: ['websocket', 'polling'], // WebRTC와 호환성
  allowEIO3: true,
  // 화상통신 최적화 설정
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e8, // 100MB (화상 데이터용)
  allowUpgrades: true,
  forceBase64: false
});

const PORT = process.env.PORT || 7000;

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path}`, {
    ip: req.ip,
    secure: req.secure,
    userAgent: req.get('user-agent')
  });
  next();
});

// CORS 설정 (화상통신 최적화)
app.use(cors({
  origin: true, // 모든 origin 허용 (화상통신용)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '100mb' })); // 화상 데이터용 증가
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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

// 비디오 핸들러에 io 설정
if (videoHandler) {
  videoHandler.io = io;
}

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
  logger.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.',
    error: error.message
  });
});

// WebSocket 연결 처리 (화상통신 최적화)
io.on('connection', (socket) => {
  logger.info(`New WebSocket connection: ${socket.id}`, {
    id: socket.id,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    origin: socket.handshake.headers.origin,
    secure: socket.handshake.secure
  });
  
  // 비디오 통화 핸들러 (P2P 또는 MediaSoup)
  if (videoHandler) {
    videoHandler.handleConnection(socket);
  }
  
  // mini area 핸들러가 먼저 처리 (방 입장/퇴장, 위치 업데이트 등)
  metaverseHandler.handleConnection(socket);
  
  // 프라이빗 영역 핸들러도 처리
  privateAreaHandler.handleConnection(socket);
});

// WebSocket 연결 시도 로깅
io.engine.on('connection_error', (err) => {
  logger.error('WebSocket connection error:', err);
});

io.engine.on('initial_headers', (headers, req) => {
  logger.debug('WebSocket headers:', headers);
  logger.debug('WebSocket request info:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    secure: req.secure
  });
});

// 데이터베이스 연결
sequelize.authenticate()
  .then(() => {
    logger.info('PostgreSQL database connected successfully');
    return sequelize.sync({ alter: true });
  })
  .then(async () => {
    logger.info('Database tables synchronized');
    
    // 비디오 핸들러 초기화 (MediaSoup 또는 P2P)
    if (videoHandler && videoHandler.initialize) {
      await videoHandler.initialize();
      logger.info(`${webrtcMode.toUpperCase()} video service initialized`);
    }
  })
  .catch(err => {
    logger.error('PostgreSQL connection failed:', err);
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
  // WebRTC 설정 유효성 검사
  validateWebRTCConfig();
  
  const serverIP = getServerIP();
  logger.info('=================================');
  logger.info('Server started successfully');
  logger.info(`HTTPS Port: ${PORT}`);
  logger.info(`WebRTC Mode: ${webrtcMode.toUpperCase()}`);
  logger.info(`LAN Access: https://${serverIP}:${PORT}`);
  logger.info(`WebSocket: wss://${serverIP}:${PORT}`);
  logger.info('WebRTC video communication: Enabled');
  logger.info('Camera/Microphone: Enabled in HTTPS');
  logger.info('=================================');
}); 