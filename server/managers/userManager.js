const LoginUserManager = require('./loginUserManager');
const UserInfoManager = require('./userInfoManager');
const IntegratedFlowManager = require('./integratedFlowManager');
const VirtualSpaceManager = require('./virtualSpaceManager');

class UserManager {
  constructor() {
    this.loginManager = new LoginUserManager();
    this.infoManager = new UserInfoManager();
    this.flowManager = new IntegratedFlowManager();
    this.spaceManager = new VirtualSpaceManager();
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> { userId, username, mapId, characterId, position, status, characterInfo }
    
    console.log('✅ 통합 사용자 관리자 초기화 완료');
  }

  // 사용자 로그인 처리
  async loginUser(email, password, clientInfo = {}) {
    try {
      // 로그인 처리
      const loginResult = await this.loginManager.loginUser(email, password, clientInfo);
      
      if (loginResult.success) {
        // 사용자 정보 초기화
        await this.infoManager.initializeUserProfile(loginResult.user.id);
        
        // 플로우 초기화
        await this.flowManager.handleUserLogin(loginResult.user.id, {
          username: loginResult.user.username,
          email: loginResult.user.email
        });
        
        console.log(`✅ 사용자 로그인 완료: ${loginResult.user.email}`);
      }
      
      return loginResult;
      
    } catch (error) {
      console.error('❌ 사용자 로그인 실패:', error);
      throw error;
    }
  }

  // 사용자 로그아웃 처리
  async logoutUser(token, sessionId = null) {
    try {
      const logoutResult = await this.loginManager.logoutUser(token, sessionId);
      
      if (logoutResult.success) {
        // WebSocket 연결 정리
        const sessionInfo = this.loginManager.activeSessions.get(sessionId);
        if (sessionInfo) {
          this.removeUserSocket(sessionInfo.userId);
          
          // 플로우 종료
          await this.flowManager.handleUserLogout(sessionInfo.userId);
        }
        
        console.log('✅ 사용자 로그아웃 완료');
      }
      
      return logoutResult;
      
    } catch (error) {
      console.error('❌ 사용자 로그아웃 실패:', error);
      throw error;
    }
  }

  // 토큰 검증
  async verifyToken(token) {
    return await this.loginManager.verifyToken(token);
  }

  // WebSocket 연결 관리
  addUserSocket(userId, socketId, userInfo) {
    this.userSockets.set(userId, socketId);
    this.socketUsers.set(socketId, {
      userId,
      username: userInfo.username,
      mapId: userInfo.mapId || null,
      characterId: userInfo.characterId || null,
      position: userInfo.position || { x: 100, y: 100 },
      status: userInfo.status || 'online',
      characterInfo: userInfo.characterInfo || {},
      connectedAt: new Date()
    });
    
    console.log(`✅ 사용자 WebSocket 연결: ${userInfo.username} (${socketId})`);
  }

  removeUserSocket(userId) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.userSockets.delete(userId);
      this.socketUsers.delete(socketId);
      console.log(`✅ 사용자 WebSocket 연결 해제: ${userId} (${socketId})`);
    }
  }

  getUserSocket(userId) {
    return this.userSockets.get(userId);
  }

  getSocketUser(socketId) {
    return this.socketUsers.get(socketId);
  }

  // 사용자 정보 관리
  async updateUserProfile(userId, profileData) {
    return await this.infoManager.updateUserProfile(userId, profileData);
  }

  updateUserPreferences(userId, preferences) {
    return this.infoManager.updateUserPreferences(userId, preferences);
  }

  updateUserActivity(userId, activityData) {
    return this.infoManager.updateUserActivity(userId, activityData);
  }

  updateUserStatistics(userId, statisticsData) {
    return this.infoManager.updateUserStatistics(userId, statisticsData);
  }

  // 사용자 관계 관리
  addUserRelationship(userId, relatedUserId, relationshipType = 'friend') {
    this.infoManager.addUserRelationship(userId, relatedUserId, relationshipType);
  }

  removeUserRelationship(userId, relatedUserId) {
    this.infoManager.removeUserRelationship(userId, relatedUserId);
  }

  // 사용자 정보 조회
  getUserProfile(userId) {
    return this.infoManager.getUserProfile(userId);
  }

  getUserPreferences(userId) {
    return this.infoManager.getUserPreferences(userId);
  }

  getUserActivity(userId) {
    return this.infoManager.getUserActivity(userId);
  }

  getUserStatistics(userId) {
    return this.infoManager.getUserStatistics(userId);
  }

  getUserRelationships(userId) {
    return this.infoManager.getUserRelationships(userId);
  }

  getUserSummary(userId) {
    return this.infoManager.getUserSummary(userId);
  }

  // 세션 관리
  getUserSessions(userId) {
    return this.loginManager.getUserSessions(userId);
  }

  getActiveSessionCount() {
    return this.loginManager.getActiveSessionCount();
  }

  getUserSessionCount(userId) {
    return this.loginManager.getUserSessionCount(userId);
  }

  // 사용자 검색
  searchUsers(query, limit = 20) {
    return this.infoManager.searchUsers(query, limit);
  }

  // 통계 정보
  getLoginHistory(userId = null, limit = 100) {
    return this.loginManager.getLoginHistory(userId, limit);
  }

  getUserStats(userId) {
    return this.loginManager.getUserStats(userId);
  }

  getOverallStats() {
    return this.loginManager.getOverallStats();
  }

  getGlobalStatistics() {
    return this.infoManager.getGlobalStatistics();
  }

  // 온라인 사용자 관리
  getOnlineUsers() {
    const onlineUsers = [];
    
    for (const [socketId, userInfo] of this.socketUsers.entries()) {
      onlineUsers.push({
        userId: userInfo.userId,
        username: userInfo.username,
        socketId,
        mapId: userInfo.mapId,
        characterId: userInfo.characterId,
        position: userInfo.position,
        status: userInfo.status,
        connectedAt: userInfo.connectedAt,
        lastActivity: userInfo.lastActivity || userInfo.connectedAt
      });
    }
    
    return onlineUsers;
  }

  getUsersInMap(mapId) {
    return this.getOnlineUsers().filter(user => user.mapId === mapId);
  }

  getUsersInArea(areaType, areaId) {
    // 영역별 사용자 필터링 로직
    return this.getOnlineUsers().filter(user => {
      // 실제 구현에서는 영역 정보를 확인해야 함
      return true; // 임시로 모든 사용자 반환
    });
  }

  // 사용자 상태 업데이트
  updateUserStatus(userId, statusData) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const userInfo = this.socketUsers.get(socketId);
      if (userInfo) {
        Object.assign(userInfo, statusData);
        userInfo.lastActivity = new Date();
        this.socketUsers.set(socketId, userInfo);
      }
    }
  }

  updateUserPosition(userId, position) {
    this.updateUserStatus(userId, { position });
  }

  updateUserMap(userId, mapId) {
    this.updateUserStatus(userId, { mapId });
  }

  updateUserCharacter(userId, characterId, characterInfo) {
    this.updateUserStatus(userId, { characterId, characterInfo });
  }

  // 강제 로그아웃
  forceLogoutSession(sessionId) {
    return this.loginManager.forceLogoutSession(sessionId);
  }

  forceLogoutUser(userId) {
    const result = this.loginManager.forceLogoutUser(userId);
    this.removeUserSocket(userId);
    return result;
  }

  // 설정 관리
  updateSettings(settings) {
    if (settings.login) {
      this.loginManager.updateSettings(settings.login);
    }
    // infoManager는 설정 업데이트 메서드가 없으므로 필요시 추가
  }

  // 사용자 제거
  removeUser(userId) {
    this.loginManager.removeSession(userId);
    this.infoManager.removeUser(userId);
    this.flowManager.removeUser(userId);
    this.spaceManager.removeUser(userId);
    this.removeUserSocket(userId);
    
    console.log(`✅ 사용자 완전 제거: ${userId}`);
  }

  // 모든 데이터 정리
  clear() {
    this.loginManager.clear();
    this.infoManager.clear();
    this.flowManager.clear();
    this.spaceManager.clear();
    this.userSockets.clear();
    this.socketUsers.clear();
    
    console.log('🧹 통합 사용자 관리자 데이터 정리 완료');
  }

  // 디버그 정보
  getDebugInfo() {
    return {
      loginManager: {
        activeSessions: this.loginManager.activeSessions.size,
        userSessions: this.loginManager.userSessions.size,
        sessionTokens: this.loginManager.sessionTokens.size,
        loginHistory: this.loginManager.loginHistory.length
      },
      infoManager: {
        userProfiles: this.infoManager.userProfiles.size,
        userPreferences: this.infoManager.userPreferences.size,
        userActivity: this.infoManager.userActivity.size,
        userStatistics: this.infoManager.userStatistics.size,
        userRelationships: this.infoManager.userRelationships.size
      },
      flowManager: this.flowManager.getDebugInfo(),
      spaceManager: this.spaceManager.getDebugInfo(),
      socketManager: {
        userSockets: this.userSockets.size,
        socketUsers: this.socketUsers.size
      },
      globalStatistics: this.infoManager.getGlobalStatistics()
    };
  }

  // Getter 메서드들
  getLoginManager() {
    return this.loginManager;
  }

  getInfoManager() {
    return this.infoManager;
  }

  getFlowManager() {
    return this.flowManager;
  }

  getSpaceManager() {
    return this.spaceManager;
  }

  getAllUserProfiles() {
    return this.infoManager.getAllUserProfiles();
  }

  getAllSessions() {
    return this.loginManager.getAllSessions();
  }

  // 플로우 관련 메서드들
  async handleVirtualSpaceEntry(userId, spaceInfo) {
    return await this.flowManager.handleVirtualSpaceEntry(userId, spaceInfo);
  }

  async handleAreaEntry(userId, areaInfo) {
    return await this.flowManager.handleAreaEntry(userId, areaInfo);
  }

  async handleVideoCallStart(userId, channelName) {
    return await this.flowManager.handleVideoCallStart(userId, channelName);
  }

  async handleChatStart(userId, channelName) {
    return await this.flowManager.handleChatStart(userId, channelName);
  }

  async handleChatMessage(userId, channelName, message, messageType = 'text') {
    return await this.flowManager.handleChatMessage(userId, channelName, message, messageType);
  }

  async handleAreaLeave(userId) {
    return await this.flowManager.handleAreaLeave(userId);
  }

  async handleVirtualSpaceLeave(userId) {
    return await this.flowManager.handleVirtualSpaceLeave(userId);
  }

  getUserFlowStatus(userId) {
    return this.flowManager.getUserFlowStatus(userId);
  }

  getUsersInStage(stage) {
    return this.flowManager.getUsersInStage(stage);
  }

  getUsersInVirtualSpace(spaceId) {
    return this.flowManager.getUsersInVirtualSpace(spaceId);
  }

  getUsersInArea(areaId) {
    return this.flowManager.getUsersInArea(areaId);
  }

  getUsersInChannel(channelName, channelType = 'video') {
    return this.flowManager.getUsersInChannel(channelName, channelType);
  }

  getChannelsByArea(areaId) {
    return this.flowManager.getChannelsByArea(areaId);
  }

  getChatHistory(channelName, limit = 100) {
    return this.flowManager.getChatHistory(channelName, limit);
  }

  getActiveChannels() {
    return this.flowManager.getActiveChannels();
  }

  getFlowStatistics() {
    return this.flowManager.getStatistics();
  }

  getAllActiveFlows() {
    return this.flowManager.getAllActiveFlows();
  }

  // 채널 통신 관련 메서드들
  async joinChannel(userId, username, channelName, channelType = 'both') {
    return await this.flowManager.joinChannel(userId, username, channelName, channelType);
  }

  async leaveChannel(userId, channelName) {
    return await this.flowManager.leaveChannel(userId, channelName);
  }

  async joinVideoCall(userId, channelName) {
    return await this.flowManager.joinVideoCall(userId, channelName);
  }

  async leaveVideoCall(userId, channelName) {
    return await this.flowManager.leaveVideoCall(userId, channelName);
  }

  async joinChat(userId, channelName) {
    return await this.flowManager.joinChat(userId, channelName);
  }

  async leaveChat(userId, channelName) {
    return await this.flowManager.leaveChat(userId, channelName);
  }

  async sendChatMessage(userId, channelName, message, messageType = 'text') {
    return await this.flowManager.sendChatMessage(userId, channelName, message, messageType);
  }

  async sendSystemMessage(channelName, message, messageType = 'system') {
    return await this.flowManager.sendSystemMessage(channelName, message, messageType);
  }

  async handleWebRTCSignal(channelName, fromUserId, toUserId, signalType, signalData) {
    return await this.flowManager.handleWebRTCSignal(channelName, fromUserId, toUserId, signalType, signalData);
  }

  // 채널 통신 정보 가져오기
  getChannelCommunication(channelName) {
    return this.flowManager.getChannelCommunication(channelName);
  }

  getUserCommunication(userId) {
    return this.flowManager.getUserCommunication(userId);
  }

  getChannelParticipants(channelName) {
    return this.flowManager.getChannelParticipants(channelName);
  }

  getVideoCallParticipants(channelName) {
    return this.flowManager.getVideoCallParticipants(channelName);
  }

  getChatParticipants(channelName) {
    return this.flowManager.getChatParticipants(channelName);
  }

  getChannelHistory(channelName) {
    return this.flowManager.getChannelHistory(channelName);
  }

  // 위치 관리 관련 메서드들
  setUserLocation(userId, locationInfo) {
    return this.flowManager.setUserLocation(userId, locationInfo);
  }

  getUserLocation(userId) {
    return this.flowManager.getUserLocation(userId);
  }

  moveUserToLocation(userId, locationInfo) {
    return this.flowManager.moveUserToLocation(userId, locationInfo);
  }

  updateUserLocation(userId, updates) {
    return this.flowManager.updateUserLocation(userId, updates);
  }

  getUsersAtLocation(locationId) {
    return this.flowManager.getUsersAtLocation(locationId);
  }

  getUserCurrentChannel(userId) {
    return this.flowManager.getUserCurrentChannel(userId);
  }

  getChannelUsers(channelName) {
    return this.flowManager.getChannelUsers(channelName);
  }

  getAreaChannels(spaceId, areaId) {
    return this.flowManager.getAreaChannels(spaceId, areaId);
  }

  getSpaceAreas(spaceId) {
    return this.flowManager.getSpaceAreas(spaceId);
  }

  getUserLocationHistory(userId, limit = 20) {
    return this.flowManager.getUserLocationHistory(userId, limit);
  }

  updateUserActivity(userId) {
    this.flowManager.updateUserActivity(userId);
  }

  cleanupInactiveUsers() {
    this.flowManager.cleanupInactiveUsers();
  }

  // 채널 이동 처리
  async handleChannelMove(userId, channelInfo) {
    return await this.flowManager.handleChannelMove(userId, channelInfo);
  }

  // 가상공간 관련 메서드들
  async createVirtualSpace(spaceData, ownerId) {
    return await this.spaceManager.createVirtualSpace(spaceData, ownerId);
  }

  async enterVirtualSpace(userId, username, spaceId, userRole = 'user') {
    return await this.spaceManager.enterVirtualSpace(userId, username, spaceId, userRole);
  }

  async leaveVirtualSpace(userId, spaceId) {
    return await this.spaceManager.leaveVirtualSpace(userId, spaceId);
  }

  async changeSpaceMode(spaceId, newMode, userId, changeReason = '') {
    return await this.spaceManager.changeSpaceMode(spaceId, newMode, userId, changeReason);
  }

  async startSpaceEdit(spaceId, userId) {
    return await this.spaceManager.startSpaceEdit(spaceId, userId);
  }

  async finishSpaceEdit(spaceId, userId) {
    return await this.spaceManager.finishSpaceEdit(spaceId, userId);
  }

  async addSpaceElement(spaceId, elementData, userId) {
    return await this.spaceManager.addSpaceElement(spaceId, elementData, userId);
  }

  async updateSpaceElement(spaceId, elementId, updateData, userId) {
    return await this.spaceManager.updateSpaceElement(spaceId, elementId, updateData, userId);
  }

  async removeSpaceElement(spaceId, elementId, userId) {
    return await this.spaceManager.removeSpaceElement(spaceId, elementId, userId);
  }

  async deleteVirtualSpace(spaceId, userId) {
    return await this.spaceManager.deleteVirtualSpace(spaceId, userId);
  }

  // 가상공간 정보 가져오기
  getSpaceInfo(spaceId) {
    return this.spaceManager.getSpaceInfo(spaceId);
  }

  getSpaceMode(spaceId) {
    return this.spaceManager.getSpaceMode(spaceId);
  }

  getSpaceSettings(spaceId) {
    return this.spaceManager.getSpaceSettings(spaceId);
  }

  getSpaceAccess(spaceId) {
    return this.spaceManager.getSpaceAccess(spaceId);
  }

  getSpaceElements(spaceId) {
    return this.spaceManager.getSpaceElements(spaceId);
  }

  getSpaceAnalytics(spaceId) {
    return this.spaceManager.getSpaceAnalytics(spaceId);
  }

  getSpaceBackups(spaceId) {
    return this.spaceManager.getSpaceBackups(spaceId);
  }

  getUserMode(userId) {
    return this.spaceManager.getUserMode(userId);
  }

  getUserSpaces(userId) {
    return this.spaceManager.getUserSpaces(userId);
  }

  getSpaceUsers(spaceId) {
    return this.spaceManager.getSpaceUsers(spaceId);
  }

  // 가상공간 권한 확인
  checkUserAccess(userId, spaceId, requiredPermission = 'read') {
    return this.spaceManager.checkUserAccess(userId, spaceId, requiredPermission);
  }

  getUserPermissions(userId, spaceId) {
    return this.spaceManager.getUserPermissions(userId, spaceId);
  }

  checkPermission(userId, spaceId, permission) {
    return this.spaceManager.checkPermission(userId, spaceId, permission);
  }

  // 가상공간 검색 및 필터링
  getAllSpaces() {
    return this.spaceManager.getAllSpaces();
  }

  getPublicSpaces() {
    return this.spaceManager.getPublicSpaces();
  }

  getSpacesByOwner(ownerId) {
    return this.spaceManager.getSpacesByOwner(ownerId);
  }

  getSpacesByCategory(category) {
    return this.spaceManager.getSpacesByCategory(category);
  }

  getSpacesInMode(mode) {
    return this.spaceManager.getSpacesInMode(mode);
  }

  searchSpaces(query, filters = {}) {
    return this.spaceManager.searchSpaces(query, filters);
  }

  getSpaceStatistics() {
    return this.spaceManager.getStatistics();
  }
}

module.exports = UserManager;
