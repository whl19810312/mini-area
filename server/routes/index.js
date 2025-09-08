const express = require('express');
const authRoutes = require('./auth');
const mapRoutes = require('./map');
const characterRoutes = require('./character');
const userRoutes = require('./user');

// API 라우터 초기화
const initializeRoutes = (app) => {
  console.log('🔧 라우터 초기화 시작...');
  
  // 루트 경로
  app.get('/', (req, res) => {
    console.log('✅ 루트 경로 요청 처리');
    res.json({
      success: true,
      message: 'Mini Area Metaverse Server',
      version: '1.0.0',
      api: '/api/v1',
      websocket: 'wss://' + req.get('host'),
      timestamp: new Date().toISOString()
    });
  });
  
  // 헬스 체크
  app.get('/health', (req, res) => {
    console.log('✅ 헬스 체크 요청 처리');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // API 상태 확인 엔드포인트
  app.get('/api/status', (req, res) => {
    console.log('✅ API 상태 요청 처리');
    res.json({
      success: true,
      message: 'API 서버 정상 작동',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // 인증 라우터
  console.log('🔧 인증 라우터 등록...');
  app.use('/api/auth', authRoutes);
  
  // 맵 라우터
  console.log('🔧 맵 라우터 등록...');
  app.use('/api/map', mapRoutes);
  
  // 캐릭터 라우터
  console.log('🔧 캐릭터 라우터 등록...');
  app.use('/api/character', characterRoutes);
  
  // 사용자 라우터
  console.log('🔧 사용자 라우터 등록...');
  app.use('/api/user', userRoutes);
  
  // 404 핸들러 (모든 라우터 등록 후에 추가)
  app.use('*', (req, res) => {
    console.log(`❌ 404 오류: ${req.method} ${req.path}`);
    res.status(404).json({
      success: false,
      message: '요청한 리소스를 찾을 수 없습니다.',
      path: req.path,
      method: req.method
    });
  });
  
  console.log('✅ 라우터 초기화 완료');
};

// 라우터 정보 가져오기
const getRouteInfo = () => {
  return {
    auth: {
      prefix: '/api/auth',
      endpoints: [
        'POST /register',
        'POST /login',
        'POST /logout',
        'GET /verify-email/:token',
        'POST /forgot-password',
        'POST /reset-password'
      ]
    },
    map: {
      prefix: '/api/map',
      endpoints: [
        'GET /',
        'GET /:id',
        'POST /',
        'PUT /:id',
        'DELETE /:id',
        'POST /:id/upload',
        'GET /user/:userId'
      ]
    },
    character: {
      prefix: '/api/character',
      endpoints: [
        'GET /',
        'GET /:id',
        'POST /',
        'PUT /:id',
        'DELETE /:id',
        'POST /generate'
      ]
    },
    user: {
      prefix: '/api/user',
      endpoints: [
        'GET /profile',
        'PUT /profile',
        'GET /maps',
        'GET /characters'
      ]
    },
    system: {
      prefix: '/api',
      endpoints: [
        'GET /status',
        'GET /health'
      ]
    }
  };
};

module.exports = {
  initializeRoutes,
  getRouteInfo
};

