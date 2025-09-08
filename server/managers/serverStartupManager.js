const express = require('express');
const https = require('https');
const fs = require('fs');
const { getConfig, getServerIP, validateConfig } = require('../config/serverConfig');
const { initializeMiddleware } = require('../middleware');
const { initializeRoutes } = require('../routes');
const WebSocketManager = require('../websocket/websocketManager');
const DatabaseManager = require('../config/databaseManager');

class ServerStartupManager {
  constructor() {
    this.app = null;
    this.server = null;
    this.websocketManager = null;
    this.databaseManager = null;
    this.isRunning = false;
    this.startTime = null;
    this.startupLog = [];
    
    this.initialize();
  }

  // 서버 초기화
  initialize() {
    try {
      this.logStartup('🚀 서버 초기화 시작');
      
      // 설정 유효성 검사
      const validation = validateConfig();
      if (!validation.valid) {
        this.logStartup('❌ 서버 설정 오류');
        validation.errors.forEach(error => this.logStartup(`  - ${error}`));
        throw new Error('서버 설정이 유효하지 않습니다.');
      }

      // Express 앱 생성
      this.app = express();
      this.logStartup('✅ Express 앱 생성 완료');
      
      // HTTPS 서버 생성
      this.createHTTPSServer();
      
      // 데이터베이스 매니저 초기화
      this.databaseManager = new DatabaseManager();
      this.logStartup('✅ 데이터베이스 매니저 초기화 완료');
      
      // WebSocket 매니저 초기화
      this.websocketManager = new WebSocketManager(this.server);
      this.logStartup('✅ WebSocket 매니저 초기화 완료');
      
      // 미들웨어 초기화
      this.initializeMiddleware();
      
      // 라우터 초기화
      this.initializeRoutes();
      
      this.logStartup('✅ 서버 초기화 완료');
    } catch (error) {
      this.logStartup(`❌ 서버 초기화 실패: ${error.message}`);
      throw error;
    }
  }

  // HTTPS 서버 생성
  createHTTPSServer() {
    const config = getConfig();
    
    if (config.HTTPS.enabled) {
      try {
        this.server = https.createServer(config.HTTPS.options, this.app);
        this.logStartup('✅ HTTPS 서버 생성 완료');
      } catch (error) {
        this.logStartup(`❌ HTTPS 서버 생성 실패: ${error.message}`);
        throw error;
      }
    } else {
      // HTTP 서버 (개발용)
      this.server = require('http').createServer(this.app);
      this.logStartup('⚠️ HTTP 서버 생성 (개발 모드)');
    }
  }

  // 미들웨어 초기화
  initializeMiddleware() {
    const handlers = this.websocketManager.getAllHandlers();
    initializeMiddleware(
      this.app,
      this.websocketManager.getIO(),
      handlers.metaverse,
      handlers.privateArea
    );
    this.logStartup('✅ 미들웨어 초기화 완료');
  }

  // 라우터 초기화
  initializeRoutes() {
    initializeRoutes(this.app);
    this.logStartup('✅ 라우터 초기화 완료');
  }

  // 서버 시작
  async start() {
    if (this.isRunning) {
      this.logStartup('⚠️ 서버가 이미 실행 중입니다.');
      return;
    }

    try {
      const config = getConfig();
      this.logStartup('🚀 서버 시작 중...');

      // 데이터베이스 연결 대기
      await this.waitForDatabase();
      
      // WebSocket 서버 시작
      this.websocketManager.initialize();
      this.logStartup('✅ WebSocket 서버 시작 완료');

      // HTTP 서버 시작
      this.server.listen(config.PORT, config.HOST, () => {
        this.isRunning = true;
        this.startTime = new Date();
        
        const serverIP = getServerIP();
        const protocol = config.HTTPS.enabled ? 'https' : 'http';
        
        this.logStartup('🎉 서버 시작 완료!');
        this.logStartup(`📍 서버 주소: ${protocol}://${config.HOST}:${config.PORT}`);
        this.logStartup(`🌐 LAN 주소: ${protocol}://${serverIP}:${config.PORT}`);
        this.logStartup(`📊 WebSocket: ws://${config.HOST}:${config.PORT}`);
        
        // 서버 상태 정보 출력
        this.printServerInfo();
      });

      // Graceful Shutdown 설정
      this.setupGracefulShutdown();
      
    } catch (error) {
      this.logStartup(`❌ 서버 시작 실패: ${error.message}`);
      throw error;
    }
  }

  // 데이터베이스 연결 대기
  async waitForDatabase(timeout = 30000) {
    this.logStartup('⏳ 데이터베이스 연결 대기 중...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await this.databaseManager.testConnection();
        this.logStartup('✅ 데이터베이스 연결 성공');
        return;
      } catch (error) {
        this.logStartup(`⏳ 데이터베이스 연결 재시도... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('데이터베이스 연결 시간 초과');
  }

  // Graceful Shutdown 설정
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.logStartup(`\n🛑 ${signal} 신호 수신 - 서버 종료 시작`);
      
      try {
        // WebSocket 연결 종료
        if (this.websocketManager) {
          this.websocketManager.shutdown();
          this.logStartup('✅ WebSocket 서버 종료 완료');
        }
        
        // HTTP 서버 종료
        if (this.server) {
          this.server.close(() => {
            this.logStartup('✅ HTTP 서버 종료 완료');
          });
        }
        
        // 데이터베이스 연결 종료
        if (this.databaseManager) {
          await this.databaseManager.closeConnection();
          this.logStartup('✅ 데이터베이스 연결 종료 완료');
        }
        
        this.isRunning = false;
        this.logStartup('🎉 서버 종료 완료');
        process.exit(0);
        
      } catch (error) {
        this.logStartup(`❌ 서버 종료 중 오류: ${error.message}`);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    this.logStartup('✅ Graceful Shutdown 설정 완료');
  }

  // 서버 정보 출력
  printServerInfo() {
    const config = getConfig();
    const uptime = this.getUptime();
    
    console.log('\n📊 서버 정보:');
    console.log(`   환경: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   포트: ${config.PORT}`);
    console.log(`   호스트: ${config.HOST}`);
    console.log(`   HTTPS: ${config.HTTPS.enabled ? '활성화' : '비활성화'}`);
    console.log(`   실행 시간: ${uptime}`);
    console.log(`   메모리 사용량: ${this.getMemoryUsage()}`);
    console.log(`   Node.js 버전: ${process.version}`);
    console.log(`   플랫폼: ${process.platform}`);
    console.log('');
  }

  // 서버 상태 가져오기
  getServerStatus() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.getUptime(),
      memoryUsage: this.getMemoryUsage(),
      startupLog: [...this.startupLog]
    };
  }

  // 서버 통계 가져오기
  async getServerStats() {
    const stats = {
      server: this.getServerStatus(),
      database: await this.databaseManager.getDatabaseStats(),
      websocket: this.websocketManager.getServerStatus()
    };
    
    return stats;
  }

  // 서버 중지
  async stop() {
    if (!this.isRunning) {
      this.logStartup('⚠️ 서버가 실행 중이 아닙니다.');
      return;
    }

    this.logStartup('🛑 서버 중지 시작');
    
    try {
      // WebSocket 서버 종료
      if (this.websocketManager) {
        this.websocketManager.shutdown();
      }
      
      // HTTP 서버 종료
      if (this.server) {
        this.server.close();
      }
      
      // 데이터베이스 연결 종료
      if (this.databaseManager) {
        await this.databaseManager.closeConnection();
      }
      
      this.isRunning = false;
      this.logStartup('✅ 서버 중지 완료');
      
    } catch (error) {
      this.logStartup(`❌ 서버 중지 실패: ${error.message}`);
      throw error;
    }
  }

  // 실행 시간 가져오기
  getUptime() {
    if (!this.startTime) return '0초';
    
    const uptime = Date.now() - this.startTime.getTime();
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 ${hours % 24}시간 ${minutes % 60}분`;
    if (hours > 0) return `${hours}시간 ${minutes % 60}분`;
    if (minutes > 0) return `${minutes}분 ${seconds % 60}초`;
    return `${seconds}초`;
  }

  // 메모리 사용량 가져오기
  getMemoryUsage() {
    const usage = process.memoryUsage();
    const formatBytes = (bytes) => {
      const sizes = ['B', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };
    
    return {
      rss: formatBytes(usage.rss),
      heapTotal: formatBytes(usage.heapTotal),
      heapUsed: formatBytes(usage.heapUsed),
      external: formatBytes(usage.external)
    };
  }

  // 시작 로그 기록
  logStartup(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    this.startupLog.push(logMessage);
    console.log(logMessage);
    
    // 로그 개수 제한 (최근 100개만 유지)
    if (this.startupLog.length > 100) {
      this.startupLog = this.startupLog.slice(-100);
    }
  }

  // Getter 메서드들
  getApp() {
    return this.app;
  }

  getServer() {
    return this.server;
  }

  getWebSocketManager() {
    return this.websocketManager;
  }

  getDatabaseManager() {
    return this.databaseManager;
  }

  getStartupLog() {
    return [...this.startupLog];
  }
}

module.exports = ServerStartupManager;





