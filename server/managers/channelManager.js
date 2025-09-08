class ChannelManager {
  constructor() {
    this.videoChannels = new Map(); // channelName -> channelInfo
    this.chatChannels = new Map();  // channelName -> channelInfo
    this.userChannels = new Map();  // userId -> { video: channelName, chat: channelName }
    this.channelHistory = new Map(); // channelName -> messageHistory[]
    this.channelStatistics = {
      totalVideoChannels: 0,
      totalChatChannels: 0,
      activeVideoChannels: 0,
      activeChatChannels: 0,
      totalMessages: 0,
      totalVideoCalls: 0
    };
    
    // 채널 정리 타이머
    this.startChannelCleanup();
  }

  // 비디오 채널 생성
  createVideoChannel(channelName, areaInfo = {}) {
    const channelInfo = {
      channelName,
      channelType: 'video',
      areaId: areaInfo.areaId,
      areaName: areaInfo.areaName,
      areaType: areaInfo.areaType, // 'public', 'private'
      participants: [],
      maxParticipants: 10,
      isActive: false,
      createdAt: new Date(),
      startedAt: null,
      endedAt: null,
      duration: 0,
      settings: {
        autoStart: true,
        maxDuration: 60 * 60 * 1000, // 1시간
        recording: false,
        screenSharing: true
      }
    };

    this.videoChannels.set(channelName, channelInfo);
    this.updateChannelStatistics();
    
    console.log(`✅ 비디오 채널 생성: ${channelName} (${areaInfo.areaName})`);
    return channelInfo;
  }

  // 채팅 채널 생성
  createChatChannel(channelName, areaInfo = {}) {
    const channelInfo = {
      channelName,
      channelType: 'chat',
      areaId: areaInfo.areaId,
      areaName: areaInfo.areaName,
      areaType: areaInfo.areaType,
      participants: [],
      maxParticipants: 50,
      isActive: false,
      createdAt: new Date(),
      startedAt: null,
      endedAt: null,
      duration: 0,
      messageCount: 0,
      settings: {
        autoStart: true,
        messageRetention: 1000, // 최근 1000개 메시지 유지
        moderation: false,
        emojiSupport: true
      }
    };

    this.chatChannels.set(channelName, channelInfo);
    this.updateChannelStatistics();
    
    console.log(`✅ 채팅 채널 생성: ${channelName} (${areaInfo.areaName})`);
    return channelInfo;
  }

  // 사용자를 비디오 채널에 참가
  joinVideoChannel(userId, username, channelName) {
    const channel = this.videoChannels.get(channelName);
    if (!channel) {
      console.error(`❌ 비디오 채널을 찾을 수 없음: ${channelName}`);
      return false;
    }

    // 참가자 수 제한 확인
    if (channel.participants.length >= channel.maxParticipants) {
      console.error(`❌ 비디오 채널 참가자 수 초과: ${channelName}`);
      return false;
    }

    // 이미 참가 중인지 확인
    const existingParticipant = channel.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      console.log(`ℹ️ 이미 비디오 채널에 참가 중: ${username} (${channelName})`);
      return true;
    }

    // 참가자 추가
    const participant = {
      userId,
      username,
      joinedAt: new Date(),
      isActive: true,
      videoEnabled: true,
      audioEnabled: true,
      isScreenSharing: false
    };

    channel.participants.push(participant);

    // 채널 활성화 (첫 번째 참가자)
    if (!channel.isActive) {
      channel.isActive = true;
      channel.startedAt = new Date();
    }

    // 사용자 채널 정보 업데이트
    this.updateUserChannel(userId, 'video', channelName);

    console.log(`✅ 비디오 채널 참가: ${username} (${userId}) → ${channelName}`);
    return true;
  }

  // 사용자를 채팅 채널에 참가
  joinChatChannel(userId, username, channelName) {
    const channel = this.chatChannels.get(channelName);
    if (!channel) {
      console.error(`❌ 채팅 채널을 찾을 수 없음: ${channelName}`);
      return false;
    }

    // 참가자 수 제한 확인
    if (channel.participants.length >= channel.maxParticipants) {
      console.error(`❌ 채팅 채널 참가자 수 초과: ${channelName}`);
      return false;
    }

    // 이미 참가 중인지 확인
    const existingParticipant = channel.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      console.log(`ℹ️ 이미 채팅 채널에 참가 중: ${username} (${channelName})`);
      return true;
    }

    // 참가자 추가
    const participant = {
      userId,
      username,
      joinedAt: new Date(),
      isActive: true,
      messageCount: 0,
      lastMessageAt: null
    };

    channel.participants.push(participant);

    // 채널 활성화 (첫 번째 참가자)
    if (!channel.isActive) {
      channel.isActive = true;
      channel.startedAt = new Date();
    }

    // 사용자 채널 정보 업데이트
    this.updateUserChannel(userId, 'chat', channelName);

    console.log(`✅ 채팅 채널 참가: ${username} (${userId}) → ${channelName}`);
    return true;
  }

  // 사용자를 비디오 채널에서 퇴장
  leaveVideoChannel(userId, channelName) {
    const channel = this.videoChannels.get(channelName);
    if (!channel) {
      console.error(`❌ 비디오 채널을 찾을 수 없음: ${channelName}`);
      return false;
    }

    const participantIndex = channel.participants.findIndex(p => p.userId === userId);
    if (participantIndex === -1) {
      console.error(`❌ 비디오 채널 참가자를 찾을 수 없음: ${userId} (${channelName})`);
      return false;
    }

    const participant = channel.participants[participantIndex];
    participant.isActive = false;
    participant.leftAt = new Date();

    // 참가자 제거
    channel.participants.splice(participantIndex, 1);

    // 채널 비활성화 (마지막 참가자)
    if (channel.participants.length === 0) {
      channel.isActive = false;
      channel.endedAt = new Date();
      channel.duration = channel.endedAt.getTime() - channel.startedAt.getTime();
    }

    // 사용자 채널 정보 업데이트
    this.updateUserChannel(userId, 'video', null);

    console.log(`✅ 비디오 채널 퇴장: ${participant.username} (${userId}) ← ${channelName}`);
    return true;
  }

  // 사용자를 채팅 채널에서 퇴장
  leaveChatChannel(userId, channelName) {
    const channel = this.chatChannels.get(channelName);
    if (!channel) {
      console.error(`❌ 채팅 채널을 찾을 수 없음: ${channelName}`);
      return false;
    }

    const participantIndex = channel.participants.findIndex(p => p.userId === userId);
    if (participantIndex === -1) {
      console.error(`❌ 채팅 채널 참가자를 찾을 수 없음: ${userId} (${channelName})`);
      return false;
    }

    const participant = channel.participants[participantIndex];
    participant.isActive = false;
    participant.leftAt = new Date();

    // 참가자 제거
    channel.participants.splice(participantIndex, 1);

    // 채널 비활성화 (마지막 참가자)
    if (channel.participants.length === 0) {
      channel.isActive = false;
      channel.endedAt = new Date();
      channel.duration = channel.endedAt.getTime() - channel.startedAt.getTime();
    }

    // 사용자 채널 정보 업데이트
    this.updateUserChannel(userId, 'chat', null);

    console.log(`✅ 채팅 채널 퇴장: ${participant.username} (${userId}) ← ${channelName}`);
    return true;
  }

  // 채팅 메시지 추가
  addChatMessage(channelName, userId, username, message, messageType = 'text') {
    const channel = this.chatChannels.get(channelName);
    if (!channel) {
      console.error(`❌ 채팅 채널을 찾을 수 없음: ${channelName}`);
      return false;
    }

    const chatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username,
      message,
      messageType,
      timestamp: new Date(),
      isSystem: false
    };

    // 채널 히스토리에 메시지 추가
    if (!this.channelHistory.has(channelName)) {
      this.channelHistory.set(channelName, []);
    }
    
    const history = this.channelHistory.get(channelName);
    history.push(chatMessage);

    // 메시지 수 제한
    if (history.length > channel.settings.messageRetention) {
      history.splice(0, history.length - channel.settings.messageRetention);
    }

    // 채널 통계 업데이트
    channel.messageCount++;
    this.channelStatistics.totalMessages++;

    // 참가자 메시지 카운트 업데이트
    const participant = channel.participants.find(p => p.userId === userId);
    if (participant) {
      participant.messageCount++;
      participant.lastMessageAt = new Date();
    }

    console.log(`💬 채팅 메시지: ${username} (${channelName}) - ${message.substring(0, 50)}...`);
    return chatMessage;
  }

  // 시스템 메시지 추가
  addSystemMessage(channelName, message) {
    const chatMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'system',
      username: 'System',
      message,
      messageType: 'system',
      timestamp: new Date(),
      isSystem: true
    };

    if (!this.channelHistory.has(channelName)) {
      this.channelHistory.set(channelName, []);
    }
    
    const history = this.channelHistory.get(channelName);
    history.push(chatMessage);

    console.log(`🔔 시스템 메시지: ${channelName} - ${message}`);
    return chatMessage;
  }

  // 사용자 채널 정보 업데이트
  updateUserChannel(userId, channelType, channelName) {
    if (!this.userChannels.has(userId)) {
      this.userChannels.set(userId, { video: null, chat: null });
    }

    const userChannels = this.userChannels.get(userId);
    userChannels[channelType] = channelName;
  }

  // 사용자의 채널 정보 가져오기
  getUserChannels(userId) {
    return this.userChannels.get(userId) || { video: null, chat: null };
  }

  // 채널 정보 가져오기
  getVideoChannel(channelName) {
    return this.videoChannels.get(channelName);
  }

  getChatChannel(channelName) {
    return this.chatChannels.get(channelName);
  }

  // 채널 참가자 목록 가져오기
  getVideoChannelParticipants(channelName) {
    const channel = this.videoChannels.get(channelName);
    return channel ? channel.participants.filter(p => p.isActive) : [];
  }

  getChatChannelParticipants(channelName) {
    const channel = this.chatChannels.get(channelName);
    return channel ? channel.participants.filter(p => p.isActive) : [];
  }

  // 채널 메시지 히스토리 가져오기
  getChatHistory(channelName, limit = 100) {
    const history = this.channelHistory.get(channelName) || [];
    return history.slice(-limit);
  }

  // 영역별 채널 가져오기
  getChannelsByArea(areaId) {
    const channels = {
      video: [],
      chat: []
    };

    // 비디오 채널 검색
    for (const [channelName, channel] of this.videoChannels.entries()) {
      if (channel.areaId === areaId) {
        channels.video.push({
          channelName,
          ...channel
        });
      }
    }

    // 채팅 채널 검색
    for (const [channelName, channel] of this.chatChannels.entries()) {
      if (channel.areaId === areaId) {
        channels.chat.push({
          channelName,
          ...channel
        });
      }
    }

    return channels;
  }

  // 활성 채널 목록 가져오기
  getActiveChannels() {
    const activeChannels = {
      video: [],
      chat: []
    };

    for (const [channelName, channel] of this.videoChannels.entries()) {
      if (channel.isActive) {
        activeChannels.video.push({
          channelName,
          ...channel
        });
      }
    }

    for (const [channelName, channel] of this.chatChannels.entries()) {
      if (channel.isActive) {
        activeChannels.chat.push({
          channelName,
          ...channel
        });
      }
    }

    return activeChannels;
  }

  // 채널 통계 업데이트
  updateChannelStatistics() {
    let totalVideoChannels = 0;
    let totalChatChannels = 0;
    let activeVideoChannels = 0;
    let activeChatChannels = 0;
    let totalMessages = 0;
    let totalVideoCalls = 0;

    // 비디오 채널 통계
    for (const channel of this.videoChannels.values()) {
      totalVideoChannels++;
      if (channel.isActive) {
        activeVideoChannels++;
        totalVideoCalls++;
      }
    }

    // 채팅 채널 통계
    for (const channel of this.chatChannels.values()) {
      totalChatChannels++;
      if (channel.isActive) {
        activeChatChannels++;
      }
      totalMessages += channel.messageCount;
    }

    this.channelStatistics = {
      totalVideoChannels,
      totalChatChannels,
      activeVideoChannels,
      activeChatChannels,
      totalMessages,
      totalVideoCalls
    };
  }

  // 채널 정리 타이머 시작
  startChannelCleanup() {
    setInterval(() => {
      this.cleanupInactiveChannels();
    }, 5 * 60 * 1000); // 5분마다 실행
  }

  // 비활성 채널 정리
  cleanupInactiveChannels() {
    const now = Date.now();
    const cleanupThreshold = 24 * 60 * 60 * 1000; // 24시간

    // 비활성 비디오 채널 정리
    for (const [channelName, channel] of this.videoChannels.entries()) {
      if (!channel.isActive && 
          channel.endedAt && 
          (now - channel.endedAt.getTime()) > cleanupThreshold) {
        this.videoChannels.delete(channelName);
        console.log(`🧹 비활성 비디오 채널 정리: ${channelName}`);
      }
    }

    // 비활성 채팅 채널 정리
    for (const [channelName, channel] of this.chatChannels.entries()) {
      if (!channel.isActive && 
          channel.endedAt && 
          (now - channel.endedAt.getTime()) > cleanupThreshold) {
        this.chatChannels.delete(channelName);
        this.channelHistory.delete(channelName);
        console.log(`🧹 비활성 채팅 채널 정리: ${channelName}`);
      }
    }

    this.updateChannelStatistics();
  }

  // 채널 통계 가져오기
  getChannelStatistics() {
    return { ...this.channelStatistics };
  }

  // 사용자 제거
  removeUser(userId) {
    const userChannels = this.userChannels.get(userId);
    if (userChannels) {
      if (userChannels.video) {
        this.leaveVideoChannel(userId, userChannels.video);
      }
      if (userChannels.chat) {
        this.leaveChatChannel(userId, userChannels.chat);
      }
      this.userChannels.delete(userId);
    }
  }

  // 모든 데이터 정리
  clear() {
    this.videoChannels.clear();
    this.chatChannels.clear();
    this.userChannels.clear();
    this.channelHistory.clear();
    this.channelStatistics = {
      totalVideoChannels: 0,
      totalChatChannels: 0,
      activeVideoChannels: 0,
      activeChatChannels: 0,
      totalMessages: 0,
      totalVideoCalls: 0
    };
    console.log('🧹 채널 관리자 데이터 정리 완료');
  }
}

module.exports = ChannelManager;





