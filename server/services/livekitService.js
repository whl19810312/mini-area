const { AccessToken } = require('livekit-server-sdk');

class LiveKitService {
  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;
    this.wsUrl = process.env.LIVEKIT_URL;
  }

  /**
   * Generate access token for a user to join a room
   * @param {string} roomName - The name of the room
   * @param {string} participantName - The name of the participant
   * @param {string} participantId - The unique ID of the participant
   * @param {Object} options - Additional options for the token
   * @returns {Promise<string>} - The access token
   */
  async createToken(roomName, participantName, participantId, options = {}) {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantId,
      name: participantName,
      ttl: options.ttl || '10h', // Token valid for 10 hours by default
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: options.canPublish !== false,
      canSubscribe: options.canSubscribe !== false,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    return at.toJwt();
  }

  /**
   * Create a token for global video call (entire metaverse)
   * @param {string} metaverseId - The ID of the metaverse
   * @param {string} userId - The user's ID
   * @param {string} username - The user's display name
   * @returns {Promise<Object>} - Token and room info
   */
  async createGlobalRoomToken(metaverseId, userId, username) {
    const roomName = `metaverse_${metaverseId}_global`;
    const token = await this.createToken(roomName, username, userId, {
      canPublish: true,
      canSubscribe: true,
    });

    return {
      token,
      roomName,
      wsUrl: this.wsUrl,
    };
  }

  /**
   * Create a token for area-based video call (private area)
   * @param {string} metaverseId - The ID of the metaverse
   * @param {string} areaId - The ID of the private area
   * @param {string} userId - The user's ID
   * @param {string} username - The user's display name
   * @returns {Promise<Object>} - Token and room info
   */
  async createAreaRoomToken(metaverseId, areaId, userId, username) {
    const roomName = `metaverse_${metaverseId}_area_${areaId}`;
    const token = await this.createToken(roomName, username, userId, {
      canPublish: true,
      canSubscribe: true,
    });

    return {
      token,
      roomName,
      wsUrl: this.wsUrl,
    };
  }

  /**
   * Create a token for 1:1 video call
   * @param {string} callId - Unique ID for the call
   * @param {string} userId - The user's ID
   * @param {string} username - The user's display name
   * @returns {Promise<Object>} - Token and room info
   */
  async createOneOnOneRoomToken(callId, userId, username) {
    const roomName = `call_${callId}`;
    const token = await this.createToken(roomName, username, userId, {
      canPublish: true,
      canSubscribe: true,
    });

    return {
      token,
      roomName,
      wsUrl: this.wsUrl,
    };
  }

  /**
   * Get connection info for a room
   * @param {string} roomName - The name of the room
   * @returns {Object} - Connection information
   */
  getConnectionInfo(roomName) {
    return {
      wsUrl: this.wsUrl,
      roomName,
    };
  }
}

module.exports = new LiveKitService();