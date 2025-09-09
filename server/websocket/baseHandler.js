const logger = require('../utils/logger');

class BaseHandler {
  constructor(io) {
    this.io = io;
    this.logger = logger;
  }

  log(message, meta = {}) {
    this.logger.info(message, meta);
  }

  logError(message, error) {
    this.logger.error(message, error);
  }

  logWebRTC(message, meta = {}) {
    this.logger.webrtc.info(message, meta);
  }

  logWebRTCError(message, error) {
    this.logger.webrtc.error(message, error);
  }

  logDebug(message, meta = {}) {
    this.logger.debug(message, meta);
  }
}

module.exports = BaseHandler;