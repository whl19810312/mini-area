const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getConfig } = require('../config/serverConfig');

// 로깅 미들웨어
const requestLogger = (req, res, next) => {
  const config = getConfig();
  if (config.LOGGING.enabled) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.ip} (HTTPS: ${req.secure})`);
  }
  next();
};

// 에러 로깅 미들웨어
const errorLogger = (error, req, res, next) => {
  console.error('서버 오류:', error);
  next(error);
};

// 에러 핸들링 미들웨어
const errorHandler = (error, req, res, next) => {
  console.error('서버 오류:', error);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
  });
};

// 404 핸들러
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.',
    path: req.path
  });
};

// WebSocket 핸들러 주입 미들웨어
const websocketInjection = (io, metaverseHandler, privateAreaHandler) => {
  return (req, res, next) => {
    req.io = io;
    req.metaverseHandler = metaverseHandler;
    req.privateAreaHandler = privateAreaHandler;
    next();
  };
};

// 기본 미들웨어 설정
const setupBasicMiddleware = (app) => {
  const config = getConfig();
  
  // 요청 로깅
  app.use(requestLogger);
  
  // 보안 헤더 (Helmet)
  if (config.SECURITY.helmet.enabled) {
    app.use(helmet());
  }
  
  // CORS 설정
  app.use(cors(config.CORS));
  
  // 요청 본문 파싱
  app.use(express.json({ limit: config.UPLOAD.maxFileSize }));
  app.use(express.urlencoded({ limit: config.UPLOAD.maxFileSize, extended: true }));
  
  // 세션 설정
  app.use(session(config.SESSION));
  
  // Passport 초기화
  app.use(passport.initialize());
  app.use(passport.session());
  
  // 정적 파일 서빙
  app.use('/uploads', express.static(config.UPLOAD.uploadPath));
};

// 보안 미들웨어 설정
const setupSecurityMiddleware = (app) => {
  const config = getConfig();
  
  // Rate Limiting
  const limiter = rateLimit(config.SECURITY.rateLimit);
  app.use('/api/', limiter);
  
  // 추가 보안 헤더
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
};

// API 미들웨어 설정
const setupAPIMiddleware = (app) => {
  // API 버전 헤더
  app.use('/api', (req, res, next) => {
    res.setHeader('X-API-Version', '1.0.0');
    next();
  });
  
  // API 응답 시간 측정
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`API ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
};

// WebSocket 미들웨어 설정
const setupWebSocketMiddleware = (io) => {
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
};

// 미들웨어 초기화
const initializeMiddleware = (app, io, metaverseHandler, privateAreaHandler) => {
  // 기본 미들웨어 설정
  setupBasicMiddleware(app);
  
  // 보안 미들웨어 설정
  setupSecurityMiddleware(app);
  
  // API 미들웨어 설정
  setupAPIMiddleware(app);
  
  // WebSocket 핸들러 주입
  app.use(websocketInjection(io, metaverseHandler, privateAreaHandler));
  
  // WebSocket 미들웨어 설정
  setupWebSocketMiddleware(io);
  
  // 에러 핸들링 미들웨어 (라우터 초기화 후에 추가됨)
  app.use(errorLogger);
  app.use(errorHandler);
};

module.exports = {
  requestLogger,
  errorLogger,
  errorHandler,
  notFoundHandler,
  websocketInjection,
  setupBasicMiddleware,
  setupSecurityMiddleware,
  setupAPIMiddleware,
  setupWebSocketMiddleware,
  initializeMiddleware
};

