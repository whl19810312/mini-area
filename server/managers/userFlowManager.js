class UserFlowManager {
  constructor() {
    this.userFlows = new Map(); // userId -> flowState
    this.flowHistory = new Map(); // userId -> flowHistory[]
    this.flowStatistics = {
      totalUsers: 0,
      usersInLobby: 0,
      usersInVirtualSpace: 0,
      usersInArea: 0,
      usersInVideoCall: 0,
      usersInChat: 0,
      averageSessionTime: 0,
      totalSessions: 0
    };
    
    // 플로우 단계 정의
    this.flowStages = {
      LOGGED_OUT: 'logged_out',
      LOGGED_IN: 'logged_in',
      IN_LOBBY: 'in_lobby',
      ENTERING_VIRTUAL_SPACE: 'entering_virtual_space',
      IN_VIRTUAL_SPACE: 'in_virtual_space',
      ENTERING_AREA: 'entering_area',
      IN_AREA: 'in_area',
      STARTING_VIDEO_CALL: 'starting_video_call',
      IN_VIDEO_CALL: 'in_video_call',
      STARTING_CHAT: 'starting_chat',
      IN_CHAT: 'in_chat',
      LEAVING: 'leaving',
      LOGGED_OUT_COMPLETE: 'logged_out_complete'
    };
    
    // 통계 업데이트 타이머
    this.startStatisticsUpdate();
  }

  // 사용자 플로우 초기화
  initializeUserFlow(userId, userInfo) {
    const flowState = {
      userId,
      username: userInfo.username,
      currentStage: this.flowStages.LOGGED_IN,
      previousStage: null,
      stageStartTime: new Date(),
      totalSessionTime: 0,
      flowData: {
        lobby: {
          enteredAt: null,
          leftAt: null,
          duration: 0
        },
        virtualSpace: {
          spaceId: null,
          spaceName: null,
          enteredAt: null,
          leftAt: null,
          duration: 0
        },
        area: {
          areaId: null,
          areaName: null,
          areaType: null, // 'public', 'private'
          enteredAt: null,
          leftAt: null,
          duration: 0
        },
        videoCall: {
          isActive: false,
          startedAt: null,
          endedAt: null,
          duration: 0,
          participants: [],
          channelName: null
        },
        chat: {
          isActive: false,
          startedAt: null,
          endedAt: null,
          duration: 0,
          messageCount: 0,
          channelName: null
        }
      },
      sessionStartTime: new Date(),
      lastActivity: new Date(),
      isActive: true
    };

    this.userFlows.set(userId, flowState);
    this.flowHistory.set(userId, []);
    
    // 플로우 시작 기록
    this.recordFlowEvent(userId, 'flow_started', {
      stage: this.flowStages.LOGGED_IN,
      timestamp: new Date()
    });

    console.log(`✅ 사용자 플로우 초기화: ${userInfo.username} (${userId})`);
    return flowState;
  }

  // 플로우 단계 변경
  changeUserStage(userId, newStage, stageData = {}) {
    const flowState = this.userFlows.get(userId);
    if (!flowState) {
      console.error(`❌ 사용자 플로우를 찾을 수 없음: ${userId}`);
      return null;
    }

    const previousStage = flowState.currentStage;
    const stageStartTime = flowState.stageStartTime;
    const currentTime = new Date();

    // 이전 단계 종료 처리
    this.endCurrentStage(userId, previousStage, stageStartTime, currentTime);

    // 새 단계 시작
    flowState.previousStage = previousStage;
    flowState.currentStage = newStage;
    flowState.stageStartTime = currentTime;
    flowState.lastActivity = currentTime;

    // 단계별 데이터 업데이트
    this.updateStageData(userId, newStage, stageData);

    // 플로우 이벤트 기록
    this.recordFlowEvent(userId, 'stage_changed', {
      from: previousStage,
      to: newStage,
      timestamp: currentTime,
      stageData
    });

    console.log(`🔄 사용자 단계 변경: ${flowState.username} (${userId}) - ${previousStage} → ${newStage}`);
    return flowState;
  }

  // 현재 단계 종료 처리
  endCurrentStage(userId, stage, startTime, endTime) {
    const flowState = this.userFlows.get(userId);
    if (!flowState) return;

    const duration = endTime.getTime() - startTime.getTime();

    switch (stage) {
      case this.flowStages.IN_LOBBY:
        flowState.flowData.lobby.leftAt = endTime;
        flowState.flowData.lobby.duration = duration;
        break;
      
      case this.flowStages.IN_VIRTUAL_SPACE:
        flowState.flowData.virtualSpace.leftAt = endTime;
        flowState.flowData.virtualSpace.duration = duration;
        break;
      
      case this.flowStages.IN_AREA:
        flowState.flowData.area.leftAt = endTime;
        flowState.flowData.area.duration = duration;
        break;
      
      case this.flowStages.IN_VIDEO_CALL:
        flowState.flowData.videoCall.endedAt = endTime;
        flowState.flowData.videoCall.duration = duration;
        flowState.flowData.videoCall.isActive = false;
        break;
      
      case this.flowStages.IN_CHAT:
        flowState.flowData.chat.endedAt = endTime;
        flowState.flowData.chat.duration = duration;
        flowState.flowData.chat.isActive = false;
        break;
    }
  }

  // 단계별 데이터 업데이트
  updateStageData(userId, stage, stageData) {
    const flowState = this.userFlows.get(userId);
    if (!flowState) return;

    switch (stage) {
      case this.flowStages.IN_LOBBY:
        flowState.flowData.lobby.enteredAt = new Date();
        break;
      
      case this.flowStages.IN_VIRTUAL_SPACE:
        flowState.flowData.virtualSpace.spaceId = stageData.spaceId;
        flowState.flowData.virtualSpace.spaceName = stageData.spaceName;
        flowState.flowData.virtualSpace.enteredAt = new Date();
        break;
      
      case this.flowStages.IN_AREA:
        flowState.flowData.area.areaId = stageData.areaId;
        flowState.flowData.area.areaName = stageData.areaName;
        flowState.flowData.area.areaType = stageData.areaType;
        flowState.flowData.area.enteredAt = new Date();
        break;
      
      case this.flowStages.IN_VIDEO_CALL:
        flowState.flowData.videoCall.isActive = true;
        flowState.flowData.videoCall.startedAt = new Date();
        flowState.flowData.videoCall.participants = stageData.participants || [];
        flowState.flowData.videoCall.channelName = stageData.channelName;
        break;
      
      case this.flowStages.IN_CHAT:
        flowState.flowData.chat.isActive = true;
        flowState.flowData.chat.startedAt = new Date();
        flowState.flowData.chat.channelName = stageData.channelName;
        break;
    }
  }

  // 플로우 이벤트 기록
  recordFlowEvent(userId, eventType, eventData) {
    const history = this.flowHistory.get(userId) || [];
    const event = {
      eventType,
      timestamp: new Date(),
      ...eventData
    };
    
    history.push(event);
    this.flowHistory.set(userId, history);

    // 히스토리 크기 제한 (최근 100개만 유지)
    if (history.length > 100) {
      this.flowHistory.set(userId, history.slice(-100));
    }
  }

  // 사용자 활동 업데이트
  updateUserActivity(userId) {
    const flowState = this.userFlows.get(userId);
    if (flowState) {
      flowState.lastActivity = new Date();
    }
  }

  // 채팅 메시지 카운트 증가
  incrementChatMessageCount(userId) {
    const flowState = this.userFlows.get(userId);
    if (flowState && flowState.flowData.chat.isActive) {
      flowState.flowData.chat.messageCount++;
    }
  }

  // 비디오 콜 참가자 업데이트
  updateVideoCallParticipants(userId, participants) {
    const flowState = this.userFlows.get(userId);
    if (flowState && flowState.flowData.videoCall.isActive) {
      flowState.flowData.videoCall.participants = participants;
    }
  }

  // 사용자 플로우 종료
  endUserFlow(userId) {
    const flowState = this.userFlows.get(userId);
    if (!flowState) return;

    const currentTime = new Date();
    
    // 현재 단계 종료
    this.endCurrentStage(userId, flowState.currentStage, flowState.stageStartTime, currentTime);
    
    // 전체 세션 시간 계산
    flowState.totalSessionTime = currentTime.getTime() - flowState.sessionStartTime.getTime();
    flowState.isActive = false;

    // 플로우 종료 기록
    this.recordFlowEvent(userId, 'flow_ended', {
      totalSessionTime: flowState.totalSessionTime,
      timestamp: currentTime
    });

    console.log(`🏁 사용자 플로우 종료: ${flowState.username} (${userId}) - 총 세션 시간: ${this.formatDuration(flowState.totalSessionTime)}`);
  }

  // 사용자 플로우 가져오기
  getUserFlow(userId) {
    return this.userFlows.get(userId);
  }

  // 사용자 플로우 히스토리 가져오기
  getUserFlowHistory(userId) {
    return this.flowHistory.get(userId) || [];
  }

  // 특정 단계의 사용자들 가져오기
  getUsersInStage(stage) {
    const users = [];
    for (const [userId, flowState] of this.userFlows.entries()) {
      if (flowState.currentStage === stage && flowState.isActive) {
        users.push({
          userId,
          username: flowState.username,
          stageStartTime: flowState.stageStartTime,
          lastActivity: flowState.lastActivity,
          flowData: flowState.flowData
        });
      }
    }
    return users;
  }

  // 특정 가상공간의 사용자들 가져오기
  getUsersInVirtualSpace(spaceId) {
    const users = [];
    for (const [userId, flowState] of this.userFlows.entries()) {
      if (flowState.isActive && 
          (flowState.currentStage === this.flowStages.IN_VIRTUAL_SPACE || 
           flowState.currentStage === this.flowStages.IN_AREA ||
           flowState.currentStage === this.flowStages.IN_VIDEO_CALL ||
           flowState.currentStage === this.flowStages.IN_CHAT) &&
          flowState.flowData.virtualSpace.spaceId === spaceId) {
        users.push({
          userId,
          username: flowState.username,
          currentStage: flowState.currentStage,
          stageStartTime: flowState.stageStartTime,
          lastActivity: flowState.lastActivity,
          flowData: flowState.flowData
        });
      }
    }
    return users;
  }

  // 특정 영역의 사용자들 가져오기
  getUsersInArea(areaId) {
    const users = [];
    for (const [userId, flowState] of this.userFlows.entries()) {
      if (flowState.isActive && 
          (flowState.currentStage === this.flowStages.IN_AREA ||
           flowState.currentStage === this.flowStages.IN_VIDEO_CALL ||
           flowState.currentStage === this.flowStages.IN_CHAT) &&
          flowState.flowData.area.areaId === areaId) {
        users.push({
          userId,
          username: flowState.username,
          currentStage: flowState.currentStage,
          stageStartTime: flowState.stageStartTime,
          lastActivity: flowState.lastActivity,
          flowData: flowState.flowData
        });
      }
    }
    return users;
  }

  // 특정 채널의 사용자들 가져오기
  getUsersInChannel(channelName, channelType = 'video') {
    const users = [];
    for (const [userId, flowState] of this.userFlows.entries()) {
      if (!flowState.isActive) continue;

      let isInChannel = false;
      if (channelType === 'video' && flowState.flowData.videoCall.isActive) {
        isInChannel = flowState.flowData.videoCall.channelName === channelName;
      } else if (channelType === 'chat' && flowState.flowData.chat.isActive) {
        isInChannel = flowState.flowData.chat.channelName === channelName;
      }

      if (isInChannel) {
        users.push({
          userId,
          username: flowState.username,
          currentStage: flowState.currentStage,
          stageStartTime: flowState.stageStartTime,
          lastActivity: flowState.lastActivity,
          flowData: flowState.flowData
        });
      }
    }
    return users;
  }

  // 전체 통계 업데이트
  updateFlowStatistics() {
    const stats = {
      totalUsers: 0,
      usersInLobby: 0,
      usersInVirtualSpace: 0,
      usersInArea: 0,
      usersInVideoCall: 0,
      usersInChat: 0,
      averageSessionTime: 0,
      totalSessions: 0
    };

    let totalSessionTime = 0;
    let sessionCount = 0;

    for (const [userId, flowState] of this.userFlows.entries()) {
      if (!flowState.isActive) continue;

      stats.totalUsers++;

      switch (flowState.currentStage) {
        case this.flowStages.IN_LOBBY:
          stats.usersInLobby++;
          break;
        case this.flowStages.IN_VIRTUAL_SPACE:
        case this.flowStages.ENTERING_AREA:
        case this.flowStages.IN_AREA:
        case this.flowStages.STARTING_VIDEO_CALL:
        case this.flowStages.IN_VIDEO_CALL:
        case this.flowStages.STARTING_CHAT:
        case this.flowStages.IN_CHAT:
          stats.usersInVirtualSpace++;
          break;
      }

      if (flowState.currentStage === this.flowStages.IN_AREA ||
          flowState.currentStage === this.flowStages.IN_VIDEO_CALL ||
          flowState.currentStage === this.flowStages.IN_CHAT) {
        stats.usersInArea++;
      }

      if (flowState.flowData.videoCall.isActive) {
        stats.usersInVideoCall++;
      }

      if (flowState.flowData.chat.isActive) {
        stats.usersInChat++;
      }

      // 완료된 세션 통계
      if (flowState.totalSessionTime > 0) {
        totalSessionTime += flowState.totalSessionTime;
        sessionCount++;
      }
    }

    stats.averageSessionTime = sessionCount > 0 ? totalSessionTime / sessionCount : 0;
    stats.totalSessions = sessionCount;

    this.flowStatistics = stats;
  }

  // 통계 업데이트 타이머 시작
  startStatisticsUpdate() {
    setInterval(() => {
      this.updateFlowStatistics();
    }, 30 * 1000); // 30초마다 업데이트
  }

  // 전체 통계 가져오기
  getFlowStatistics() {
    return { ...this.flowStatistics };
  }

  // 사용자별 통계 가져오기
  getUserStatistics(userId) {
    const flowState = this.userFlows.get(userId);
    if (!flowState) return null;

    return {
      userId,
      username: flowState.username,
      currentStage: flowState.currentStage,
      stageStartTime: flowState.stageStartTime,
      lastActivity: flowState.lastActivity,
      totalSessionTime: flowState.totalSessionTime,
      flowData: flowState.flowData,
      stageDuration: new Date().getTime() - flowState.stageStartTime.getTime()
    };
  }

  // 모든 활성 사용자 플로우 가져오기
  getAllActiveFlows() {
    const activeFlows = [];
    for (const [userId, flowState] of this.userFlows.entries()) {
      if (flowState.isActive) {
        activeFlows.push({
          userId,
          username: flowState.username,
          currentStage: flowState.currentStage,
          stageStartTime: flowState.stageStartTime,
          lastActivity: flowState.lastActivity,
          flowData: flowState.flowData
        });
      }
    }
    return activeFlows;
  }

  // 사용자 제거
  removeUser(userId) {
    this.userFlows.delete(userId);
    this.flowHistory.delete(userId);
    console.log(`✅ 사용자 플로우 제거: ${userId}`);
  }

  // 모든 데이터 정리
  clear() {
    this.userFlows.clear();
    this.flowHistory.clear();
    this.flowStatistics = {
      totalUsers: 0,
      usersInLobby: 0,
      usersInVirtualSpace: 0,
      usersInArea: 0,
      usersInVideoCall: 0,
      usersInChat: 0,
      averageSessionTime: 0,
      totalSessions: 0
    };
    console.log('🧹 사용자 플로우 관리자 데이터 정리 완료');
  }

  // 시간 포맷팅 헬퍼
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분 ${seconds % 60}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds % 60}초`;
    } else {
      return `${seconds}초`;
    }
  }

  // 플로우 단계 가져오기
  getFlowStages() {
    return { ...this.flowStages };
  }
}

module.exports = UserFlowManager;





