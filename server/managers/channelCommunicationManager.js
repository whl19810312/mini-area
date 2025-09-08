const ChannelManager = require('./channelManager');

class ChannelCommunicationManager {
  constructor(io) {
    this.io = io;
    this.channelManager = new ChannelManager();
    this.activeCommunications = new Map(); // channelName -> communicationInfo
    this.userCommunications = new Map(); // userId -> { video: channelName, chat: channelName }
    this.communicationHistory = new Map(); // channelName -> history[]
    this.communicationStatistics = {
      totalVideoCalls: 0,
      totalChatSessions: 0,
      activeVideoCalls: 0,
      activeChatSessions: 0,
      totalMessages: 0,
      totalVideoMinutes: 0
    };
    
    // 통계 업데이트 타이머
    this.startStatisticsUpdate();
  }

  // 채널 통신 서비스 초기화
  initializeChannelCommunication(channelName, channelType, areaInfo = {}) {
    const communicationInfo = {
      channelName,
      channelType, // 'video', 'chat', 'both'
      areaId: areaInfo.areaId,
      areaName: areaInfo.areaName,
      areaType: areaInfo.areaType,
      isActive: false,
      startedAt: null,
      endedAt: null,
      duration: 0,
      participants: [],
      maxParticipants: channelType === 'video' ? 10 : 50,
      settings: {
        autoStart: true,
        recording: false,
        screenSharing: true,
        fileSharing: true,
        messageRetention: 1000,
        moderation: false
      },
      videoCall: {
        isActive: false,
        participants: [],
        recording: false,
        screenSharing: false,
        currentSpeaker: null,
        quality: 'auto' // 'low', 'medium', 'high', 'auto'
      },
      chat: {
        isActive: false,
        participants: [],
        messages: [],
        unreadCount: new Map(), // userId -> count
        lastMessageAt: null
      }
    };

    this.activeCommunications.set(channelName, communicationInfo);
    this.communicationHistory.set(channelName, []);
    
    console.log(`✅ 채널 통신 서비스 초기화: ${channelName} (${channelType})`);
    return communicationInfo;
  }

  // 사용자 채널 입장
  async joinChannel(userId, username, channelName, channelType = 'both') {
    try {
      const communication = this.activeCommunications.get(channelName);
      if (!communication) {
        // 채널이 없으면 새로 생성
        this.initializeChannelCommunication(channelName, channelType, {
          areaId: channelName.split('_')[2],
          areaName: channelName.split('_')[0],
          areaType: channelName.split('_')[1]
        });
      }

      const comm = this.activeCommunications.get(channelName);
      
      // 참가자 수 제한 확인
      if (comm.participants.length >= comm.maxParticipants) {
        throw new Error('채널 참가자 수가 초과되었습니다.');
      }

      // 이미 참가 중인지 확인
      const existingParticipant = comm.participants.find(p => p.userId === userId);
      if (existingParticipant) {
        console.log(`ℹ️ 이미 채널에 참가 중: ${username} (${channelName})`);
        return existingParticipant;
      }

      // 참가자 정보 생성
      const participant = {
        userId,
        username,
        joinedAt: new Date(),
        isActive: true,
        lastActivity: new Date(),
        permissions: this.getUserPermissions(userId, comm.areaType),
        videoCall: {
          isJoined: false,
          isVideoEnabled: true,
          isAudioEnabled: true,
          isScreenSharing: false,
          streamId: null
        },
        chat: {
          isJoined: false,
          messageCount: 0,
          lastMessageAt: null,
          unreadCount: 0
        }
      };

      comm.participants.push(participant);

      // 채널 활성화 (첫 번째 참가자)
      if (!comm.isActive) {
        comm.isActive = true;
        comm.startedAt = new Date();
      }

      // 사용자 통신 정보 업데이트
      this.updateUserCommunication(userId, channelType, channelName);

      // 이벤트 기록
      this.recordCommunicationEvent(channelName, 'user_joined', {
        userId,
        username,
        channelType,
        timestamp: new Date()
      });

      // 실시간 알림 전송
      this.broadcastToChannel(channelName, 'user_joined', {
        userId,
        username,
        channelType,
        participantCount: comm.participants.length
      });

      console.log(`✅ 채널 입장: ${username} (${userId}) → ${channelName} (${channelType})`);
      return participant;
      
    } catch (error) {
      console.error('❌ 채널 입장 실패:', error);
      throw error;
    }
  }

  // 사용자 채널 퇴장
  async leaveChannel(userId, channelName) {
    try {
      const communication = this.activeCommunications.get(channelName);
      if (!communication) {
        throw new Error('채널을 찾을 수 없습니다.');
      }

      const participantIndex = communication.participants.findIndex(p => p.userId === userId);
      if (participantIndex === -1) {
        throw new Error('채널 참가자를 찾을 수 없습니다.');
      }

      const participant = communication.participants[participantIndex];
      participant.isActive = false;
      participant.leftAt = new Date();

      // 비디오 통화에서 퇴장
      if (participant.videoCall.isJoined) {
        await this.leaveVideoCall(userId, channelName);
      }

      // 채팅에서 퇴장
      if (participant.chat.isJoined) {
        await this.leaveChat(userId, channelName);
      }

      // 참가자 제거
      communication.participants.splice(participantIndex, 1);

      // 채널 비활성화 (마지막 참가자)
      if (communication.participants.length === 0) {
        communication.isActive = false;
        communication.endedAt = new Date();
        communication.duration = communication.endedAt.getTime() - communication.startedAt.getTime();
      }

      // 사용자 통신 정보 업데이트
      this.updateUserCommunication(userId, 'both', null);

      // 이벤트 기록
      this.recordCommunicationEvent(channelName, 'user_left', {
        userId,
        username: participant.username,
        timestamp: new Date()
      });

      // 실시간 알림 전송
      this.broadcastToChannel(channelName, 'user_left', {
        userId,
        username: participant.username,
        participantCount: communication.participants.length
      });

      console.log(`✅ 채널 퇴장: ${participant.username} (${userId}) ← ${channelName}`);
      return true;
      
    } catch (error) {
      console.error('❌ 채널 퇴장 실패:', error);
      throw error;
    }
  }

  // 비디오 통화 참가
  async joinVideoCall(userId, channelName) {
    try {
      const communication = this.activeCommunications.get(channelName);
      if (!communication) {
        throw new Error('채널을 찾을 수 없습니다.');
      }

      const participant = communication.participants.find(p => p.userId === userId);
      if (!participant) {
        throw new Error('채널 참가자를 찾을 수 없습니다.');
      }

      if (participant.videoCall.isJoined) {
        console.log(`ℹ️ 이미 비디오 통화에 참가 중: ${participant.username} (${channelName})`);
        return participant;
      }

      // 비디오 통화 활성화
      participant.videoCall.isJoined = true;
      communication.videoCall.isActive = true;
      communication.videoCall.participants.push({
        userId,
        username: participant.username,
        joinedAt: new Date(),
        isVideoEnabled: participant.videoCall.isVideoEnabled,
        isAudioEnabled: participant.videoCall.isAudioEnabled
      });

      // 이벤트 기록
      this.recordCommunicationEvent(channelName, 'video_call_joined', {
        userId,
        username: participant.username,
        timestamp: new Date()
      });

      // 실시간 알림 전송
      this.broadcastToChannel(channelName, 'video_call_joined', {
        userId,
        username: participant.username,
        participantCount: communication.videoCall.participants.length
      });

      console.log(`✅ 비디오 통화 참가: ${participant.username} (${userId}) → ${channelName}`);
      return participant;
      
    } catch (error) {
      console.error('❌ 비디오 통화 참가 실패:', error);
      throw error;
    }
  }

  // 비디오 통화 퇴장
  async leaveVideoCall(userId, channelName) {
    try {
      const communication = this.activeCommunications.get(channelName);
      if (!communication) {
        throw new Error('채널을 찾을 수 없습니다.');
      }

      const participant = communication.participants.find(p => p.userId === userId);
      if (!participant || !participant.videoCall.isJoined) {
        return false;
      }

      // 비디오 통화에서 제거
      participant.videoCall.isJoined = false;
      const videoIndex = communication.videoCall.participants.findIndex(p => p.userId === userId);
      if (videoIndex !== -1) {
        communication.videoCall.participants.splice(videoIndex, 1);
      }

      // 비디오 통화 비활성화 (마지막 참가자)
      if (communication.videoCall.participants.length === 0) {
        communication.videoCall.isActive = false;
      }

      // 이벤트 기록
      this.recordCommunicationEvent(channelName, 'video_call_left', {
        userId,
        username: participant.username,
        timestamp: new Date()
      });

      // 실시간 알림 전송
      this.broadcastToChannel(channelName, 'video_call_left', {
        userId,
        username: participant.username,
        participantCount: communication.videoCall.participants.length
      });

      console.log(`✅ 비디오 통화 퇴장: ${participant.username} (${userId}) ← ${channelName}`);
      return true;
      
    } catch (error) {
      console.error('❌ 비디오 통화 퇴장 실패:', error);
      throw error;
    }
  }

  // 채팅 참가
  async joinChat(userId, channelName) {
    try {
      const communication = this.activeCommunications.get(channelName);
      if (!communication) {
        throw new Error('채널을 찾을 수 없습니다.');
      }

      const participant = communication.participants.find(p => p.userId === userId);
      if (!participant) {
        throw new Error('채널 참가자를 찾을 수 없습니다.');
      }

      if (participant.chat.isJoined) {
        console.log(`ℹ️ 이미 채팅에 참가 중: ${participant.username} (${channelName})`);
        return participant;
      }

      // 채팅 활성화
      participant.chat.isJoined = true;
      communication.chat.isActive = true;
      communication.chat.participants.push({
        userId,
        username: participant.username,
        joinedAt: new Date(),
        messageCount: 0
      });

      // 이벤트 기록
      this.recordCommunicationEvent(channelName, 'chat_joined', {
        userId,
        username: participant.username,
        timestamp: new Date()
      });

      // 실시간 알림 전송
      this.broadcastToChannel(channelName, 'chat_joined', {
        userId,
        username: participant.username,
        participantCount: communication.chat.participants.length
      });

      console.log(`✅ 채팅 참가: ${participant.username} (${userId}) → ${channelName}`);
      return participant;
      
    } catch (error) {
      console.error('❌ 채팅 참가 실패:', error);
      throw error;
    }
  }

  // 채팅 퇴장
  async leaveChat(userId, channelName) {
    try {
      const communication = this.activeCommunications.get(channelName);
      if (!communication) {
        throw new Error('채널을 찾을 수 없습니다.');
      }

      const participant = communication.participants.find(p => p.userId === userId);
      if (!participant || !participant.chat.isJoined) {
        return false;
      }

      // 채팅에서 제거
      participant.chat.isJoined = false;
      const chatIndex = communication.chat.participants.findIndex(p => p.userId === userId);
      if (chatIndex !== -1) {
        communication.chat.participants.splice(chatIndex, 1);
      }

      // 채팅 비활성화 (마지막 참가자)
      if (communication.chat.participants.length === 0) {
        communication.chat.isActive = false;
      }

      // 이벤트 기록
      this.recordCommunicationEvent(channelName, 'chat_left', {
        userId,
        username: participant.username,
        timestamp: new Date()
      });

      // 실시간 알림 전송
      this.broadcastToChannel(channelName, 'chat_left', {
        userId,
        username: participant.username,
        participantCount: communication.chat.participants.length
      });

      console.log(`✅ 채팅 퇴장: ${participant.username} (${userId}) ← ${channelName}`);
      return true;
      
    } catch (error) {
      console.error('❌ 채팅 퇴장 실패:', error);
      throw error;
    }
  }

  // 채팅 메시지 전송
  async sendChatMessage(userId, channelName, message, messageType = 'text') {
    try {
      const communication = this.activeCommunications.get(channelName);
      if (!communication) {
        throw new Error('채널을 찾을 수 없습니다.');
      }

      const participant = communication.participants.find(p => p.userId === userId);
      if (!participant || !participant.chat.isJoined) {
        throw new Error('채팅에 참가하지 않은 사용자입니다.');
      }

      const chatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        username: participant.username,
        message,
        messageType,
        timestamp: new Date(),
        isSystem: false
      };

      // 메시지 추가
      communication.chat.messages.push(chatMessage);
      communication.chat.lastMessageAt = new Date();

      // 메시지 수 제한
      if (communication.chat.messages.length > communication.settings.messageRetention) {
        communication.chat.messages.splice(0, communication.chat.messages.length - communication.settings.messageRetention);
      }

      // 참가자 메시지 카운트 업데이트
      participant.chat.messageCount++;
      participant.chat.lastMessageAt = new Date();

      // 통계 업데이트
      this.communicationStatistics.totalMessages++;

      // 이벤트 기록
      this.recordCommunicationEvent(channelName, 'chat_message', {
        messageId: chatMessage.id,
        userId,
        username: participant.username,
        messageType,
        timestamp: new Date()
      });

      // 실시간 메시지 전송
      this.broadcastToChannel(channelName, 'chat_message', chatMessage);

      console.log(`💬 채팅 메시지: ${participant.username} (${channelName}) - ${message.substring(0, 50)}...`);
      return chatMessage;
      
    } catch (error) {
      console.error('❌ 채팅 메시지 전송 실패:', error);
      throw error;
    }
  }

  // 시스템 메시지 전송
  async sendSystemMessage(channelName, message, messageType = 'system') {
    try {
      const communication = this.activeCommunications.get(channelName);
      if (!communication) {
        throw new Error('채널을 찾을 수 없습니다.');
      }

      const systemMessage = {
        id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'system',
        username: 'System',
        message,
        messageType,
        timestamp: new Date(),
        isSystem: true
      };

      // 메시지 추가
      communication.chat.messages.push(systemMessage);
      communication.chat.lastMessageAt = new Date();

      // 이벤트 기록
      this.recordCommunicationEvent(channelName, 'system_message', {
        messageId: systemMessage.id,
        message,
        timestamp: new Date()
      });

      // 실시간 메시지 전송
      this.broadcastToChannel(channelName, 'system_message', systemMessage);

      console.log(`🔔 시스템 메시지: ${channelName} - ${message}`);
      return systemMessage;
      
    } catch (error) {
      console.error('❌ 시스템 메시지 전송 실패:', error);
      throw error;
    }
  }

  // WebRTC 시그널링 처리
  async handleWebRTCSignal(channelName, fromUserId, toUserId, signalType, signalData) {
    try {
      const communication = this.activeCommunications.get(channelName);
      if (!communication) {
        throw new Error('채널을 찾을 수 없습니다.');
      }

      // 비디오 통화 참가자 확인
      const fromParticipant = communication.videoCall.participants.find(p => p.userId === fromUserId);
      const toParticipant = communication.videoCall.participants.find(p => p.userId === toUserId);
      
      if (!fromParticipant || !toParticipant) {
        throw new Error('비디오 통화 참가자를 찾을 수 없습니다.');
      }

      const signal = {
        from: fromUserId,
        to: toUserId,
        type: signalType,
        data: signalData,
        timestamp: new Date()
      };

      // 이벤트 기록
      this.recordCommunicationEvent(channelName, 'webrtc_signal', {
        from: fromUserId,
        to: toUserId,
        signalType,
        timestamp: new Date()
      });

      // 특정 사용자에게 시그널 전송
      this.sendToUser(toUserId, 'webrtc_signal', signal);

      console.log(`📡 WebRTC 시그널: ${fromUserId} → ${toUserId} (${signalType})`);
      return signal;
      
    } catch (error) {
      console.error('❌ WebRTC 시그널 처리 실패:', error);
      throw error;
    }
  }

  // 사용자 권한 가져오기
  getUserPermissions(userId, areaType) {
    const basePermissions = ['read', 'chat'];
    
    // 영역 타입별 권한 조정
    if (areaType === 'private') {
      basePermissions.push('video_call', 'screen_share', 'file_share');
    } else if (areaType === 'public') {
      basePermissions.push('video_call');
    }
    
    return basePermissions;
  }

  // 사용자 통신 정보 업데이트
  updateUserCommunication(userId, channelType, channelName) {
    if (!this.userCommunications.has(userId)) {
      this.userCommunications.set(userId, { video: null, chat: null });
    }

    const userComm = this.userCommunications.get(userId);
    if (channelType === 'video' || channelType === 'both') {
      userComm.video = channelName;
    }
    if (channelType === 'chat' || channelType === 'both') {
      userComm.chat = channelName;
    }
  }

  // 통신 이벤트 기록
  recordCommunicationEvent(channelName, eventType, eventData) {
    const history = this.communicationHistory.get(channelName) || [];
    const event = {
      eventType,
      timestamp: new Date(),
      ...eventData
    };
    
    history.push(event);
    this.communicationHistory.set(channelName, history);

    // 히스토리 크기 제한 (최근 100개만 유지)
    if (history.length > 100) {
      this.communicationHistory.set(channelName, history.slice(-100));
    }
  }

  // 채널에 브로드캐스트
  broadcastToChannel(channelName, event, data) {
    this.io.to(channelName).emit(event, data);
  }

  // 특정 사용자에게 전송
  sendToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // 채널 정보 가져오기
  getChannelCommunication(channelName) {
    return this.activeCommunications.get(channelName);
  }

  getUserCommunication(userId) {
    return this.userCommunications.get(userId);
  }

  getChannelHistory(channelName) {
    return this.communicationHistory.get(channelName) || [];
  }

  // 활성 채널 목록 가져오기
  getActiveChannels() {
    const activeChannels = [];
    for (const [channelName, communication] of this.activeCommunications.entries()) {
      if (communication.isActive) {
        activeChannels.push({
          channelName,
          channelType: communication.channelType,
          areaId: communication.areaId,
          areaName: communication.areaName,
          areaType: communication.areaType,
          participantCount: communication.participants.length,
          videoCallActive: communication.videoCall.isActive,
          chatActive: communication.chat.isActive,
          startedAt: communication.startedAt
        });
      }
    }
    return activeChannels;
  }

  // 채널 참가자 목록 가져오기
  getChannelParticipants(channelName) {
    const communication = this.activeCommunications.get(channelName);
    return communication ? communication.participants : [];
  }

  getVideoCallParticipants(channelName) {
    const communication = this.activeCommunications.get(channelName);
    return communication ? communication.videoCall.participants : [];
  }

  getChatParticipants(channelName) {
    const communication = this.activeCommunications.get(channelName);
    return communication ? communication.chat.participants : [];
  }

  // 채팅 메시지 히스토리 가져오기
  getChatHistory(channelName, limit = 100) {
    const communication = this.activeCommunications.get(channelName);
    if (!communication) return [];

    const messages = communication.chat.messages;
    return messages.slice(-limit);
  }

  // 통계 업데이트
  updateStatistics() {
    const stats = {
      totalVideoCalls: 0,
      totalChatSessions: 0,
      activeVideoCalls: 0,
      activeChatSessions: 0,
      totalMessages: 0,
      totalVideoMinutes: 0
    };

    for (const communication of this.activeCommunications.values()) {
      if (communication.isActive) {
        if (communication.videoCall.isActive) {
          stats.activeVideoCalls++;
          stats.totalVideoCalls++;
        }
        if (communication.chat.isActive) {
          stats.activeChatSessions++;
          stats.totalChatSessions++;
        }
        stats.totalMessages += communication.chat.messages.length;
      }
    }

    this.communicationStatistics = stats;
  }

  // 통계 업데이트 타이머 시작
  startStatisticsUpdate() {
    setInterval(() => {
      this.updateStatistics();
    }, 30 * 1000); // 30초마다 업데이트
  }

  // 전체 통계 가져오기
  getStatistics() {
    return { ...this.communicationStatistics };
  }

  // 사용자 제거
  removeUser(userId) {
    const userComm = this.userCommunications.get(userId);
    if (userComm) {
      if (userComm.video) {
        this.leaveVideoCall(userId, userComm.video);
      }
      if (userComm.chat) {
        this.leaveChat(userId, userComm.chat);
      }
      this.userCommunications.delete(userId);
    }
  }

  // 모든 데이터 정리
  clear() {
    this.activeCommunications.clear();
    this.userCommunications.clear();
    this.communicationHistory.clear();
    this.communicationStatistics = {
      totalVideoCalls: 0,
      totalChatSessions: 0,
      activeVideoCalls: 0,
      activeChatSessions: 0,
      totalMessages: 0,
      totalVideoMinutes: 0
    };
    console.log('🧹 채널 통신 관리자 데이터 정리 완료');
  }

  // 디버그 정보 가져오기
  getDebugInfo() {
    return {
      activeCommunications: this.activeCommunications.size,
      userCommunications: this.userCommunications.size,
      communicationHistory: Array.from(this.communicationHistory.keys()).length,
      statistics: this.getStatistics()
    };
  }
}

module.exports = ChannelCommunicationManager;





