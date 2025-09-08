const UserFlowManager = require('./userFlowManager');
const ChannelManager = require('./channelManager');
const ChannelCommunicationManager = require('./channelCommunicationManager');
const UserLocationManager = require('./userLocationManager');

class IntegratedFlowManager {
  constructor(io) {
    this.flowManager = new UserFlowManager();
    this.channelManager = new ChannelManager();
    this.communicationManager = new ChannelCommunicationManager(io);
    this.locationManager = new UserLocationManager();
    this.flowStatistics = {
      totalUsers: 0,
      usersInLobby: 0,
      usersInVirtualSpace: 0,
      usersInArea: 0,
      usersInVideoCall: 0,
      usersInChat: 0,
      activeVideoChannels: 0,
      activeChatChannels: 0,
      totalMessages: 0,
      totalVideoCalls: 0
    };
    
    // 통계 업데이트 타이머
    this.startStatisticsUpdate();
  }

  // 사용자 로그인 처리
  async handleUserLogin(userId, userInfo) {
    try {
      // 플로우 초기화
      const flowState = this.flowManager.initializeUserFlow(userId, userInfo);
      
      // 대기실로 이동
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.IN_LOBBY);
      
      // 대기실 위치로 설정
      this.locationManager.setUserLocation(userId, {
        type: this.locationManager.locationTypes.LOBBY,
        x: 0,
        y: 0
      });
      
      console.log(`✅ 사용자 로그인 플로우 시작: ${userInfo.username} (${userId}) → 대기실`);
      return flowState;
      
    } catch (error) {
      console.error('❌ 사용자 로그인 플로우 실패:', error);
      throw error;
    }
  }

  // 사용자 로그아웃 처리
  async handleUserLogout(userId) {
    try {
      const flowState = this.flowManager.getUserFlow(userId);
      if (!flowState) {
        console.error(`❌ 사용자 플로우를 찾을 수 없음: ${userId}`);
        return false;
      }

      // 현재 채널에서 퇴장
      const userChannels = this.channelManager.getUserChannels(userId);
      if (userChannels.video) {
        this.channelManager.leaveVideoChannel(userId, userChannels.video);
      }
      if (userChannels.chat) {
        this.channelManager.leaveChatChannel(userId, userChannels.chat);
      }

      // 플로우 종료
      this.flowManager.endUserFlow(userId);
      
      // 사용자 제거
      this.flowManager.removeUser(userId);
      this.channelManager.removeUser(userId);

      console.log(`✅ 사용자 로그아웃 플로우 완료: ${flowState.username} (${userId})`);
      return true;
      
    } catch (error) {
      console.error('❌ 사용자 로그아웃 플로우 실패:', error);
      throw error;
    }
  }

  // 가상공간 입실 처리
  async handleVirtualSpaceEntry(userId, spaceInfo) {
    try {
      const flowState = this.flowManager.getUserFlow(userId);
      if (!flowState) {
        throw new Error('사용자 플로우를 찾을 수 없습니다.');
      }

      // 가상공간 입실 단계로 변경
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.ENTERING_VIRTUAL_SPACE);
      
      // 가상공간 위치로 이동
      this.locationManager.moveUserToLocation(userId, {
        type: this.locationManager.locationTypes.VIRTUAL_SPACE,
        spaceId: spaceInfo.spaceId,
        spaceName: spaceInfo.spaceName,
        x: 0,
        y: 0
      });
      
      // 가상공간 내부로 이동
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.IN_VIRTUAL_SPACE, {
        spaceId: spaceInfo.spaceId,
        spaceName: spaceInfo.spaceName
      });

      console.log(`✅ 가상공간 입실: ${flowState.username} (${userId}) → ${spaceInfo.spaceName}`);
      return true;
      
    } catch (error) {
      console.error('❌ 가상공간 입실 실패:', error);
      throw error;
    }
  }

  // 영역 입실 처리
  async handleAreaEntry(userId, areaInfo) {
    try {
      const flowState = this.flowManager.getUserFlow(userId);
      if (!flowState) {
        throw new Error('사용자 플로우를 찾을 수 없습니다.');
      }

      // 영역 입실 단계로 변경
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.ENTERING_AREA);
      
      // 영역 위치로 이동
      this.locationManager.moveUserToLocation(userId, {
        type: this.locationManager.locationTypes.AREA,
        spaceId: areaInfo.spaceId,
        spaceName: areaInfo.spaceName,
        areaId: areaInfo.areaId,
        areaName: areaInfo.areaName,
        areaType: areaInfo.areaType,
        x: 0,
        y: 0
      });
      
      // 영역 내부로 이동
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.IN_AREA, {
        areaId: areaInfo.areaId,
        areaName: areaInfo.areaName,
        areaType: areaInfo.areaType
      });

      // 영역별 채널 생성 (없는 경우)
      const channelName = this.generateChannelName(areaInfo.spaceName, areaInfo.areaType, areaInfo.areaId);
      
      // 비디오 채널 생성
      if (!this.channelManager.getVideoChannel(channelName)) {
        this.channelManager.createVideoChannel(channelName, areaInfo);
      }
      
      // 채팅 채널 생성
      if (!this.channelManager.getChatChannel(channelName)) {
        this.channelManager.createChatChannel(channelName, areaInfo);
      }

      // 채널 통신 서비스 자동 시작
      await this.communicationManager.joinChannel(userId, flowState.username, channelName, 'both');

      console.log(`✅ 영역 입실: ${flowState.username} (${userId}) → ${areaInfo.areaName}`);
      return { channelName };
      
    } catch (error) {
      console.error('❌ 영역 입실 실패:', error);
      throw error;
    }
  }

  // 화상통화 시작 처리
  async handleVideoCallStart(userId, channelName) {
    try {
      const flowState = this.flowManager.getUserFlow(userId);
      if (!flowState) {
        throw new Error('사용자 플로우를 찾을 수 없습니다.');
      }

      // 화상통화 시작 단계로 변경
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.STARTING_VIDEO_CALL);
      
      // 채널 통신 서비스에서 비디오 통화 참가
      const joinResult = await this.communicationManager.joinVideoCall(userId, channelName);
      if (!joinResult) {
        throw new Error('비디오 통화 참가에 실패했습니다.');
      }

      // 화상통화 활성화
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.IN_VIDEO_CALL, {
        channelName,
        participants: this.communicationManager.getVideoCallParticipants(channelName)
      });

      // 시스템 메시지 추가
      await this.communicationManager.sendSystemMessage(channelName, `${flowState.username}님이 화상통화에 참가했습니다.`);

      console.log(`✅ 화상통화 시작: ${flowState.username} (${userId}) → ${channelName}`);
      return true;
      
    } catch (error) {
      console.error('❌ 화상통화 시작 실패:', error);
      throw error;
    }
  }

  // 채팅 시작 처리
  async handleChatStart(userId, channelName) {
    try {
      const flowState = this.flowManager.getUserFlow(userId);
      if (!flowState) {
        throw new Error('사용자 플로우를 찾을 수 없습니다.');
      }

      // 채팅 시작 단계로 변경
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.STARTING_CHAT);
      
      // 채널 통신 서비스에서 채팅 참가
      const joinResult = await this.communicationManager.joinChat(userId, channelName);
      if (!joinResult) {
        throw new Error('채팅 참가에 실패했습니다.');
      }

      // 채팅 활성화
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.IN_CHAT, {
        channelName
      });

      // 시스템 메시지 추가
      await this.communicationManager.sendSystemMessage(channelName, `${flowState.username}님이 채팅에 참가했습니다.`);

      console.log(`✅ 채팅 시작: ${flowState.username} (${userId}) → ${channelName}`);
      return true;
      
    } catch (error) {
      console.error('❌ 채팅 시작 실패:', error);
      throw error;
    }
  }

  // 채널 이동 처리
  async handleChannelMove(userId, channelInfo) {
    try {
      const flowState = this.flowManager.getUserFlow(userId);
      if (!flowState) {
        throw new Error('사용자 플로우를 찾을 수 없습니다.');
      }

      const currentLocation = this.locationManager.getUserLocation(userId);
      if (!currentLocation || currentLocation.type !== this.locationManager.locationTypes.AREA) {
        throw new Error('영역에 있지 않은 사용자는 채널을 이동할 수 없습니다.');
      }

      // 이전 채널에서 퇴장
      const currentChannel = this.locationManager.getUserCurrentChannel(userId);
      if (currentChannel) {
        await this.communicationManager.leaveChannel(userId, currentChannel);
        await this.communicationManager.sendSystemMessage(currentChannel, `${flowState.username}님이 채널을 이동했습니다.`);
      }

      // 새 채널 위치로 이동
      const newChannelName = this.generateChannelName(
        currentLocation.spaceName,
        currentLocation.areaType,
        currentLocation.areaId,
        channelInfo.channelId
      );

      this.locationManager.moveUserToLocation(userId, {
        type: this.locationManager.locationTypes.CHANNEL,
        spaceId: currentLocation.spaceId,
        spaceName: currentLocation.spaceName,
        areaId: currentLocation.areaId,
        areaName: currentLocation.areaName,
        areaType: currentLocation.areaType,
        channelId: channelInfo.channelId,
        channelName: newChannelName,
        x: channelInfo.x || 0,
        y: channelInfo.y || 0
      });

      // 새 채널에 입장
      await this.communicationManager.joinChannel(userId, flowState.username, newChannelName, 'both');
      await this.communicationManager.sendSystemMessage(newChannelName, `${flowState.username}님이 채널에 입장했습니다.`);

      // 화상통화 자동 시작 (권한이 있는 경우)
      if (currentLocation.areaType === 'private' || currentLocation.areaType === 'public') {
        await this.communicationManager.joinVideoCall(userId, newChannelName);
        await this.communicationManager.sendSystemMessage(newChannelName, `${flowState.username}님이 화상통화에 참가했습니다.`);
      }

      console.log(`✅ 채널 이동: ${flowState.username} (${userId}) → ${newChannelName}`);
      return { channelName: newChannelName };
      
    } catch (error) {
      console.error('❌ 채널 이동 실패:', error);
      throw error;
    }
  }

  // 채팅 메시지 처리
  async handleChatMessage(userId, channelName, message, messageType = 'text') {
    try {
      const flowState = this.flowManager.getUserFlow(userId);
      if (!flowState) {
        throw new Error('사용자 플로우를 찾을 수 없습니다.');
      }

      // 채널 통신 서비스에서 메시지 전송
      const chatMessage = await this.communicationManager.sendChatMessage(userId, channelName, message, messageType);
      
      // 플로우 메시지 카운트 증가
      this.flowManager.incrementChatMessageCount(userId);
      
      // 활동 업데이트
      this.flowManager.updateUserActivity(userId);

      console.log(`💬 채팅 메시지: ${flowState.username} (${userId}) → ${channelName}`);
      return chatMessage;
      
    } catch (error) {
      console.error('❌ 채팅 메시지 처리 실패:', error);
      throw error;
    }
  }

  // 영역 퇴장 처리
  async handleAreaLeave(userId) {
    try {
      const flowState = this.flowManager.getUserFlow(userId);
      if (!flowState) {
        throw new Error('사용자 플로우를 찾을 수 없습니다.');
      }

      // 현재 채널에서 퇴장
      const userChannels = this.communicationManager.getUserCommunication(userId);
      if (userChannels && userChannels.video) {
        await this.communicationManager.leaveVideoCall(userId, userChannels.video);
        await this.communicationManager.sendSystemMessage(userChannels.video, `${flowState.username}님이 화상통화에서 퇴장했습니다.`);
      }
      if (userChannels && userChannels.chat) {
        await this.communicationManager.leaveChat(userId, userChannels.chat);
        await this.communicationManager.sendSystemMessage(userChannels.chat, `${flowState.username}님이 채팅에서 퇴장했습니다.`);
      }

      // 채널 통신 서비스에서 완전 퇴장
      if (userChannels && (userChannels.video || userChannels.chat)) {
        const channelName = userChannels.video || userChannels.chat;
        await this.communicationManager.leaveChannel(userId, channelName);
      }

      // 가상공간 위치로 이동
      const currentLocation = this.locationManager.getUserLocation(userId);
      if (currentLocation) {
        this.locationManager.moveUserToLocation(userId, {
          type: this.locationManager.locationTypes.VIRTUAL_SPACE,
          spaceId: currentLocation.spaceId,
          spaceName: currentLocation.spaceName,
          x: 0,
          y: 0
        });
      }

      // 가상공간으로 돌아가기
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.IN_VIRTUAL_SPACE);

      console.log(`✅ 영역 퇴장: ${flowState.username} (${userId})`);
      return true;
      
    } catch (error) {
      console.error('❌ 영역 퇴장 실패:', error);
      throw error;
    }
  }

  // 가상공간 퇴장 처리
  async handleVirtualSpaceLeave(userId) {
    try {
      const flowState = this.flowManager.getUserFlow(userId);
      if (!flowState) {
        throw new Error('사용자 플로우를 찾을 수 없습니다.');
      }

      // 대기실 위치로 이동
      this.locationManager.moveUserToLocation(userId, {
        type: this.locationManager.locationTypes.LOBBY,
        x: 0,
        y: 0
      });

      // 대기실로 돌아가기
      this.flowManager.changeUserStage(userId, this.flowManager.flowStages.IN_LOBBY);

      console.log(`✅ 가상공간 퇴장: ${flowState.username} (${userId}) → 대기실`);
      return true;
      
    } catch (error) {
      console.error('❌ 가상공간 퇴장 실패:', error);
      throw error;
    }
  }

  // 채널명 생성
  generateChannelName(spaceName, areaType, areaId) {
    return `${spaceName}_${areaType}_${areaId}`.replace(/\s+/g, '_').toLowerCase();
  }

  // 사용자 플로우 상태 가져오기
  getUserFlowStatus(userId) {
    const flowState = this.flowManager.getUserFlow(userId);
    if (!flowState) return null;

    const userChannels = this.channelManager.getUserChannels(userId);
    
    return {
      userId,
      username: flowState.username,
      currentStage: flowState.currentStage,
      stageStartTime: flowState.stageStartTime,
      lastActivity: flowState.lastActivity,
      flowData: flowState.flowData,
      channels: userChannels,
      stageDuration: new Date().getTime() - flowState.stageStartTime.getTime()
    };
  }

  // 특정 단계의 사용자들 가져오기
  getUsersInStage(stage) {
    return this.flowManager.getUsersInStage(stage);
  }

  // 특정 가상공간의 사용자들 가져오기
  getUsersInVirtualSpace(spaceId) {
    return this.flowManager.getUsersInVirtualSpace(spaceId);
  }

  // 특정 영역의 사용자들 가져오기
  getUsersInArea(areaId) {
    return this.flowManager.getUsersInArea(areaId);
  }

  // 특정 채널의 사용자들 가져오기
  getUsersInChannel(channelName, channelType = 'video') {
    return this.flowManager.getUsersInChannel(channelName, channelType);
  }

  // 영역별 채널 정보 가져오기
  getChannelsByArea(areaId) {
    return this.channelManager.getChannelsByArea(areaId);
  }

  // 채널 메시지 히스토리 가져오기
  getChatHistory(channelName, limit = 100) {
    return this.communicationManager.getChatHistory(channelName, limit);
  }

  // 활성 채널 목록 가져오기
  getActiveChannels() {
    return this.communicationManager.getActiveChannels();
  }

  // 채널 통신 관련 메서드들
  async joinChannel(userId, username, channelName, channelType = 'both') {
    return await this.communicationManager.joinChannel(userId, username, channelName, channelType);
  }

  async leaveChannel(userId, channelName) {
    return await this.communicationManager.leaveChannel(userId, channelName);
  }

  async joinVideoCall(userId, channelName) {
    return await this.communicationManager.joinVideoCall(userId, channelName);
  }

  async leaveVideoCall(userId, channelName) {
    return await this.communicationManager.leaveVideoCall(userId, channelName);
  }

  async joinChat(userId, channelName) {
    return await this.communicationManager.joinChat(userId, channelName);
  }

  async leaveChat(userId, channelName) {
    return await this.communicationManager.leaveChat(userId, channelName);
  }

  async sendChatMessage(userId, channelName, message, messageType = 'text') {
    return await this.communicationManager.sendChatMessage(userId, channelName, message, messageType);
  }

  async sendSystemMessage(channelName, message, messageType = 'system') {
    return await this.communicationManager.sendSystemMessage(channelName, message, messageType);
  }

  async handleWebRTCSignal(channelName, fromUserId, toUserId, signalType, signalData) {
    return await this.communicationManager.handleWebRTCSignal(channelName, fromUserId, toUserId, signalType, signalData);
  }

  // 채널 통신 정보 가져오기
  getChannelCommunication(channelName) {
    return this.communicationManager.getChannelCommunication(channelName);
  }

  getUserCommunication(userId) {
    return this.communicationManager.getUserCommunication(userId);
  }

  getChannelParticipants(channelName) {
    return this.communicationManager.getChannelParticipants(channelName);
  }

  getVideoCallParticipants(channelName) {
    return this.communicationManager.getVideoCallParticipants(channelName);
  }

  getChatParticipants(channelName) {
    return this.communicationManager.getChatParticipants(channelName);
  }

  getChannelHistory(channelName) {
    return this.communicationManager.getChannelHistory(channelName);
  }

  // 위치 관리 관련 메서드들
  setUserLocation(userId, locationInfo) {
    return this.locationManager.setUserLocation(userId, locationInfo);
  }

  getUserLocation(userId) {
    return this.locationManager.getUserLocation(userId);
  }

  moveUserToLocation(userId, locationInfo) {
    return this.locationManager.moveUserToLocation(userId, locationInfo);
  }

  updateUserLocation(userId, updates) {
    return this.locationManager.updateUserLocation(userId, updates);
  }

  getUsersAtLocation(locationId) {
    return this.locationManager.getUsersAtLocation(locationId);
  }

  getUserCurrentChannel(userId) {
    return this.locationManager.getUserCurrentChannel(userId);
  }

  getChannelUsers(channelName) {
    return this.locationManager.getChannelUsers(channelName);
  }

  getAreaChannels(spaceId, areaId) {
    return this.locationManager.getAreaChannels(spaceId, areaId);
  }

  getSpaceAreas(spaceId) {
    return this.locationManager.getSpaceAreas(spaceId);
  }

  getUserLocationHistory(userId, limit = 20) {
    return this.locationManager.getUserLocationHistory(userId, limit);
  }

  updateUserActivity(userId) {
    this.locationManager.updateUserActivity(userId);
  }

  cleanupInactiveUsers() {
    this.locationManager.cleanupInactiveUsers();
  }

  // 통계 업데이트
  updateStatistics() {
    const flowStats = this.flowManager.getFlowStatistics();
    const channelStats = this.channelManager.getChannelStatistics();
    const communicationStats = this.communicationManager.getStatistics();
    
    this.flowStatistics = {
      totalUsers: flowStats.totalUsers,
      usersInLobby: flowStats.usersInLobby,
      usersInVirtualSpace: flowStats.usersInVirtualSpace,
      usersInArea: flowStats.usersInArea,
      usersInVideoCall: flowStats.usersInVideoCall,
      usersInChat: flowStats.usersInChat,
      activeVideoChannels: communicationStats.activeVideoCalls,
      activeChatChannels: communicationStats.activeChatSessions,
      totalMessages: communicationStats.totalMessages,
      totalVideoCalls: communicationStats.totalVideoCalls
    };
  }

  // 통계 업데이트 타이머 시작
  startStatisticsUpdate() {
    setInterval(() => {
      this.updateStatistics();
    }, 30 * 1000); // 30초마다 업데이트
  }

  // 전체 통계 가져오기
  getStatistics() {
    return { ...this.flowStatistics };
  }

  // 모든 활성 사용자 플로우 가져오기
  getAllActiveFlows() {
    return this.flowManager.getAllActiveFlows();
  }

  // 사용자 활동 업데이트
  updateUserActivity(userId) {
    this.flowManager.updateUserActivity(userId);
  }

  // 사용자 제거
  removeUser(userId) {
    this.flowManager.removeUser(userId);
    this.channelManager.removeUser(userId);
    this.communicationManager.removeUser(userId);
    this.locationManager.removeUser(userId);
  }

  // 모든 데이터 정리
  clear() {
    this.flowManager.clear();
    this.channelManager.clear();
    this.communicationManager.clear();
    this.locationManager.clear();
    this.flowStatistics = {
      totalUsers: 0,
      usersInLobby: 0,
      usersInVirtualSpace: 0,
      usersInArea: 0,
      usersInVideoCall: 0,
      usersInChat: 0,
      activeVideoChannels: 0,
      activeChatChannels: 0,
      totalMessages: 0,
      totalVideoCalls: 0
    };
    console.log('🧹 통합 플로우 관리자 데이터 정리 완료');
  }

  // 디버그 정보 가져오기
  getDebugInfo() {
    return {
      flowManager: {
        totalUsers: this.flowManager.userFlows.size,
        activeUsers: this.flowManager.getAllActiveFlows().length,
        flowHistory: Array.from(this.flowManager.flowHistory.keys()).length
      },
      channelManager: {
        videoChannels: this.channelManager.videoChannels.size,
        chatChannels: this.channelManager.chatChannels.size,
        userChannels: this.channelManager.userChannels.size,
        channelHistory: this.channelManager.channelHistory.size
      },
      communicationManager: this.communicationManager.getDebugInfo(),
      locationManager: this.locationManager.getDebugInfo(),
      statistics: this.getStatistics()
    };
  }
}

module.exports = IntegratedFlowManager;
