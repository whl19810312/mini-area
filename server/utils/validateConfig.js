require('dotenv').config();
const logger = require('./logger');

/**
 * WebRTC 설정 유효성 검사
 */
function validateWebRTCConfig() {
  const mode = process.env.WEBRTC_MODE || 'p2p';
  const errors = [];
  const warnings = [];

  // 모드 확인
  if (!['p2p', 'mediasoup'].includes(mode)) {
    errors.push(`Invalid WEBRTC_MODE: ${mode}. Must be 'p2p' or 'mediasoup'`);
  }

  // P2P 설정 검증
  if (mode === 'p2p') {
    const p2pMaxRooms = parseInt(process.env.P2P_MAX_ROOMS) || 1000;
    const p2pMaxParticipants = parseInt(process.env.P2P_MAX_PARTICIPANTS_PER_ROOM) || 10;

    if (p2pMaxRooms < 1 || p2pMaxRooms > 10000) {
      warnings.push(`P2P_MAX_ROOMS (${p2pMaxRooms}) is unusual. Recommended: 1-10000`);
    }

    if (p2pMaxParticipants < 2 || p2pMaxParticipants > 20) {
      warnings.push(`P2P_MAX_PARTICIPANTS_PER_ROOM (${p2pMaxParticipants}) may cause performance issues. Recommended: 2-20 for P2P`);
    }

    logger.info('P2P Configuration:');
    logger.info(`   - Max Rooms: ${p2pMaxRooms}`);
    logger.info(`   - Max Participants per Room: ${p2pMaxParticipants}`);
    logger.info(`   - Total Capacity: ${p2pMaxRooms * p2pMaxParticipants} concurrent users`);
  }

  // MediaSoup 설정 검증
  if (mode === 'mediasoup') {
    const msMaxRooms = parseInt(process.env.MEDIASOUP_MAX_ROOMS) || 400;
    const msMaxParticipants = parseInt(process.env.MEDIASOUP_MAX_PARTICIPANTS_PER_ROOM) || 100;
    const msListenIP = process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0';
    const msAnnouncedIP = process.env.MEDIASOUP_ANNOUNCED_IP;
    const msPort = parseInt(process.env.MEDIASOUP_PORT) || 3000;

    if (msMaxRooms < 1 || msMaxRooms > 5000) {
      warnings.push(`MEDIASOUP_MAX_ROOMS (${msMaxRooms}) is unusual. Recommended: 1-5000`);
    }

    if (msMaxParticipants < 2 || msMaxParticipants > 500) {
      warnings.push(`MEDIASOUP_MAX_PARTICIPANTS_PER_ROOM (${msMaxParticipants}) may cause performance issues. Recommended: 2-500`);
    }

    if (!msAnnouncedIP || msAnnouncedIP === '192.168.200.103') {
      warnings.push(`MEDIASOUP_ANNOUNCED_IP should be set to your actual server IP address for production`);
    }

    if (msPort < 1024 || msPort > 65535) {
      errors.push(`Invalid MEDIASOUP_PORT: ${msPort}. Must be between 1024-65535`);
    }

    logger.info('MediaSoup Configuration:');
    logger.info(`   - Max Rooms: ${msMaxRooms}`);
    logger.info(`   - Max Participants per Room: ${msMaxParticipants}`);
    logger.info(`   - Total Capacity: ${msMaxRooms * msMaxParticipants} concurrent users`);
    logger.info(`   - Listen IP: ${msListenIP}`);
    logger.info(`   - Announced IP: ${msAnnouncedIP || 'Not set (using auto-detect)'}`);
    logger.info(`   - Port: ${msPort}`);
  }

  // 에러가 있으면 종료
  if (errors.length > 0) {
    logger.error('Configuration Errors:');
    errors.forEach(error => logger.error(`   - ${error}`));
    process.exit(1);
  }

  // 경고 출력
  if (warnings.length > 0) {
    logger.warn('Configuration Warnings:');
    warnings.forEach(warning => logger.warn(`   - ${warning}`));
  }

  logger.info('WebRTC configuration validated successfully');
}

module.exports = { validateWebRTCConfig };