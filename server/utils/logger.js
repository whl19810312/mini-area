const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// logs 디렉토리 생성
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 로그 레벨 색상
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 콘솔 출력용 포맷
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// 일별 로테이션 설정
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // 14일간 보관
  format: logFormat
});

// 에러 로그 전용
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  format: logFormat
});

// WebRTC 전용 로그
const webrtcFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'webrtc-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d',
  format: logFormat
});

// HTTP 요청 로그
const httpFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d',
  format: logFormat
});

// 메인 로거
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    dailyRotateFileTransport,
    errorFileTransport
  ]
});

// 개발 환경에서는 콘솔에도 출력
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// WebRTC 전용 로거
const webrtcLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'webrtc' },
  transports: [
    webrtcFileTransport
  ]
});

if (process.env.NODE_ENV !== 'production') {
  webrtcLogger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// HTTP 로거
const httpLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'http' },
  transports: [
    httpFileTransport
  ]
});

// Morgan 스트림 (HTTP 로깅용)
const morganStream = {
  write: (message) => {
    httpLogger.info(message.trim());
  }
};

// 로그 함수 래퍼
const log = {
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  http: (message, meta = {}) => httpLogger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // WebRTC 전용
  webrtc: {
    info: (message, meta = {}) => webrtcLogger.info(message, meta),
    error: (message, meta = {}) => webrtcLogger.error(message, meta),
    debug: (message, meta = {}) => webrtcLogger.debug(message, meta)
  },
  
  // 기존 console 객체와 호환성을 위한 메서드
  log: (message, ...args) => logger.info(message, ...args),
  
  // Express 미들웨어용
  morganStream
};

// 전역 에러 핸들링
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// 시작 로그
logger.info('=================================');
logger.info('Logger initialized');
logger.info(`Log directory: ${logDir}`);
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
logger.info('=================================');

module.exports = log;