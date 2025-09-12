const { detectUserArea } = require('../utils/areaDetection');

// 프라이빗 영역별 고정 색상 팔레트 (영역 번호 순서, 클라이언트와 동일)
const ZONE_COLOR_PALETTE = [
  '#FF6B6B', // 1번 프라이빗 영역: 빨강
  '#4CAF50', // 2번 프라이빗 영역: 녹색  
  '#2196F3', // 3번 프라이빗 영역: 청색
  '#FFEB3B', // 4번 프라이빗 영역: 노랑
  '#9C27B0', // 5번 프라이빗 영역: 보라
  '#8BC34A', // 6번 프라이빗 영역: 연두색
  '#FF9800', // 7번 프라이빗 영역: 주황색
  '#3F51B5', // 8번 프라이빗 영역: 남색
  '#E91E63', // 9번 프라이빗 영역: 분홍
  '#00BCD4', // 10번 프라이빗 영역: 시안
  '#795548', // 11번 프라이빗 영역: 갈색
  '#607D8B'  // 12번 프라이빗 영역: 청회색
];

const PUBLIC_ZONE_COLOR = '#E8E8E8'; // 회색 계열

/**
 * 영역 ID에 기반한 색상 할당 함수
 */
function getZoneColor(areaType, areaId) {
  if (areaType === 'public') {
    return PUBLIC_ZONE_COLOR;
  }

  if (!areaId) return PUBLIC_ZONE_COLOR;

  let colorIndex;

  // 프라이빗 영역의 경우 영역 번호에 따라 고정 색상 할당
  if (areaType === 'private') {
    // areaId에서 숫자 추출 (예: "private-1" -> 1, "1" -> 1)
    const areaNumber = extractAreaNumber(areaId);
    
    if (areaNumber !== null && areaNumber >= 1) {
      // 영역 번호에 따라 색상 인덱스 결정 (1번 영역 = 0번 인덱스)
      colorIndex = (areaNumber - 1) % ZONE_COLOR_PALETTE.length;
    } else {
      // 영역 번호를 추출할 수 없는 경우 해시 사용
      colorIndex = hashAreaId(areaId) % ZONE_COLOR_PALETTE.length;
    }
  } else {
    // 기타 영역 타입의 경우 해시 사용
    colorIndex = hashAreaId(areaId) % ZONE_COLOR_PALETTE.length;
  }

  return ZONE_COLOR_PALETTE[colorIndex];
}

/**
 * 영역 ID에서 영역 번호 추출
 */
function extractAreaNumber(areaId) {
  if (!areaId) return null;
  
  // 숫자만 추출하는 정규식
  const match = areaId.toString().match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * 영역 ID 해시 함수
 */
function hashAreaId(areaId) {
  if (!areaId) return 0;
  
  let hash = 0;
  for (let i = 0; i < areaId.length; i++) {
    const char = areaId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit 정수로 변환
  }
  return Math.abs(hash);
}

class AreaVideoCallManager {
  constructor() {
    // 맵별 영역별 사용자 관리: { mapId: { areaId: Set<userId> } }
    this.areaUsers = new Map();
    // 사용자별 현재 영역 정보: { userId: { mapId, areaId, areaType, color } }
    this.userAreas = new Map();
    // 영역별 화상통화 세션: { areaKey: Set<userId> }
    this.videoSessions = new Map();
    // 색상별 화상통화 그룹: { color: Set<userId> }
    this.colorVideoGroups = new Map();
    // 영역 감시 시스템
    this.areaMonitoringEnabled = true;
    this.areaMonitoringInterval = null;
    this.monitoringIntervalMs = 500; // 0.5초
    
    // 자동 감시 시작
    this.startAreaMonitoring();
  }

  /**
   * 영역 키 생성 (mapId_areaType_areaId 형식)
   */
  generateAreaKey(mapId, areaType, areaId = 'main') {
    return `${mapId}_${areaType}_${areaId}`;
  }

  /**
   * 사용자의 현재 영역 정보 업데이트
   */
  updateUserArea(userId, mapId, position, privateAreas = []) {
    const areaInfo = detectUserArea(position, { 
      id: mapId, 
      privateAreas, 
      size: { width: 1000, height: 1000 } 
    });
    
    // 영역에 따른 색상 계산
    const areaColor = getZoneColor(areaInfo.type, areaInfo.id);
    
    const oldUserArea = this.userAreas.get(userId);
    const newAreaKey = this.generateAreaKey(mapId, areaInfo.type, areaInfo.id);
    const oldAreaKey = oldUserArea ? 
      this.generateAreaKey(oldUserArea.mapId, oldUserArea.areaType, oldUserArea.areaId) : null;
    const oldColor = oldUserArea ? oldUserArea.color : null;

    console.log('🌍 영역 업데이트:', {
      userId,
      oldArea: oldUserArea,
      newArea: areaInfo,
      oldAreaKey,
      newAreaKey,
      oldColor,
      newColor: areaColor
    });

    // 영역이 변경된 경우
    if (!oldUserArea || oldAreaKey !== newAreaKey) {
      // 이전 영역에서 제거
      if (oldAreaKey && this.areaUsers.has(oldAreaKey)) {
        this.areaUsers.get(oldAreaKey).delete(userId);
        
        // 화상통화 세션에서 제거
        if (this.videoSessions.has(oldAreaKey)) {
          this.videoSessions.get(oldAreaKey).delete(userId);
          console.log('📹 사용자가 영역을 떠남:', { userId, areaKey: oldAreaKey });
        }
      }

      // 이전 색상 그룹에서 제거
      if (oldColor && this.colorVideoGroups.has(oldColor)) {
        this.colorVideoGroups.get(oldColor).delete(userId);
        if (this.colorVideoGroups.get(oldColor).size === 0) {
          this.colorVideoGroups.delete(oldColor);
        }
      }

      // 새 영역에 추가
      if (!this.areaUsers.has(newAreaKey)) {
        this.areaUsers.set(newAreaKey, new Set());
      }
      this.areaUsers.get(newAreaKey).add(userId);

      // 새 색상 그룹에 추가
      if (!this.colorVideoGroups.has(areaColor)) {
        this.colorVideoGroups.set(areaColor, new Set());
      }
      this.colorVideoGroups.get(areaColor).add(userId);

      // 사용자 영역 정보 업데이트
      this.userAreas.set(userId, {
        mapId,
        areaType: areaInfo.type,
        areaId: areaInfo.id,
        areaKey: newAreaKey,
        color: areaColor,
        position: { ...position }
      });

      return {
        changed: true,
        oldAreaKey,
        newAreaKey,
        oldColor,
        newColor: areaColor,
        areaInfo,
        usersInNewArea: Array.from(this.areaUsers.get(newAreaKey)),
        usersInOldArea: oldAreaKey ? Array.from(this.areaUsers.get(oldAreaKey) || []) : [],
        usersWithSameColor: Array.from(this.colorVideoGroups.get(areaColor))
      };
    }

    // 영역이 변경되지 않았지만 위치는 업데이트
    if (oldUserArea) {
      this.userAreas.set(userId, {
        ...oldUserArea,
        position: { ...position }
      });
    }

    return {
      changed: false,
      areaKey: newAreaKey,
      color: areaColor,
      areaInfo,
      usersInArea: Array.from(this.areaUsers.get(newAreaKey) || []),
      usersWithSameColor: Array.from(this.colorVideoGroups.get(areaColor) || [])
    };
  }

  /**
   * 색상 기반 화상통화 세션 시작 (같은 색상의 캐릭터들끼리만)
   */
  startColorBasedVideoSession(userId) {
    const userArea = this.userAreas.get(userId);
    if (!userArea) {
      return { success: false, error: '사용자 영역 정보 없음' };
    }

    const { color, areaKey } = userArea;
    const usersWithSameColor = this.colorVideoGroups.get(color) || new Set();

    if (usersWithSameColor.size <= 1) {
      return { success: false, error: '같은 색상의 다른 사용자가 없음' };
    }

    // 색상 기반 세션 키 생성
    const colorSessionKey = `color_${color}_${Date.now()}`;

    if (!this.videoSessions.has(colorSessionKey)) {
      this.videoSessions.set(colorSessionKey, new Set());
    }

    const session = this.videoSessions.get(colorSessionKey);
    
    // 같은 색상을 가진 모든 사용자를 세션에 추가
    usersWithSameColor.forEach(participantId => {
      session.add(participantId);
    });

    console.log('🎨 색상 기반 화상통화 세션 시작:', {
      color,
      sessionKey: colorSessionKey,
      initiator: userId,
      participants: Array.from(session)
    });

    return {
      success: true,
      sessionKey: colorSessionKey,
      color,
      participants: Array.from(session)
    };
  }

  /**
   * 영역 내 화상통화 세션 시작 (기존 방식 - 호환성 유지)
   */
  startVideoSession(areaKey, initiatorUserId) {
    if (!this.videoSessions.has(areaKey)) {
      this.videoSessions.set(areaKey, new Set());
    }
    
    const session = this.videoSessions.get(areaKey);
    const usersInArea = this.areaUsers.get(areaKey) || new Set();
    
    // 영역 내 모든 사용자를 화상통화 세션에 추가
    usersInArea.forEach(userId => {
      session.add(userId);
    });

    console.log('📹 영역 화상통화 세션 시작:', {
      areaKey,
      initiator: initiatorUserId,
      participants: Array.from(session)
    });

    return {
      areaKey,
      participants: Array.from(session)
    };
  }

  /**
   * 지정된 사용자들과 화상통화 세션 시작
   */
  startVideoSessionWithUsers(areaKey, userIds) {
    if (!this.videoSessions.has(areaKey)) {
      this.videoSessions.set(areaKey, new Set());
    }
    
    const session = this.videoSessions.get(areaKey);
    
    // 지정된 사용자들을 화상통화 세션에 추가
    userIds.forEach(userId => {
      session.add(userId);
    });

    console.log('📹 지정 사용자들과 화상통화 세션 시작:', {
      areaKey,
      userIds,
      participants: Array.from(session)
    });

    return {
      areaKey,
      participants: Array.from(session)
    };
  }

  /**
   * 영역 내 화상통화 세션 종료
   */
  endVideoSession(areaKey) {
    const session = this.videoSessions.get(areaKey);
    if (session) {
      const participants = Array.from(session);
      this.videoSessions.delete(areaKey);
      
      console.log('📹 영역 화상통화 세션 종료:', {
        areaKey,
        participants
      });

      return { areaKey, participants };
    }
    return null;
  }

  /**
   * 사용자가 영역에 진입했을 때 화상통화 자동 참여
   */
  handleUserEnterArea(userId, areaKey) {
    const existingSession = this.videoSessions.get(areaKey);
    if (existingSession && !existingSession.has(userId)) {
      existingSession.add(userId);
      
      console.log('📹 사용자가 진행 중인 화상통화에 자동 참여:', {
        userId,
        areaKey,
        participants: Array.from(existingSession)
      });

      return {
        joined: true,
        areaKey,
        participants: Array.from(existingSession)
      };
    }
    return { joined: false };
  }

  /**
   * 사용자가 영역을 떠났을 때 화상통화에서 제거
   */
  handleUserLeaveArea(userId, areaKey) {
    const existingSession = this.videoSessions.get(areaKey);
    if (existingSession && existingSession.has(userId)) {
      existingSession.delete(userId);
      
      console.log('📹 사용자가 화상통화에서 제거됨:', {
        userId,
        areaKey,
        remainingParticipants: Array.from(existingSession)
      });

      // 세션에 참가자가 없으면 세션 종료
      if (existingSession.size === 0) {
        this.videoSessions.delete(areaKey);
        console.log('📹 영역 화상통화 세션 자동 종료 (참가자 없음):', areaKey);
      }

      return {
        left: true,
        areaKey,
        remainingParticipants: Array.from(existingSession)
      };
    }
    return { left: false };
  }

  /**
   * 특정 영역의 사용자 목록 조회
   */
  getUsersInArea(areaKey) {
    return Array.from(this.areaUsers.get(areaKey) || []);
  }

  /**
   * 사용자의 현재 영역 정보 조회
   */
  getUserArea(userId) {
    return this.userAreas.get(userId) || null;
  }

  /**
   * 영역별 화상통화 세션 정보 조회
   */
  getVideoSession(areaKey) {
    const session = this.videoSessions.get(areaKey);
    return session ? Array.from(session) : null;
  }

  /**
   * 특정 색상을 가진 사용자들 조회
   */
  getUsersByColor(color) {
    return Array.from(this.colorVideoGroups.get(color) || []);
  }

  /**
   * 사용자의 색상 정보 조회
   */
  getUserColor(userId) {
    const userArea = this.userAreas.get(userId);
    return userArea ? userArea.color : null;
  }

  /**
   * 색상별 화상통화 가능 여부 확인
   */
  canStartColorBasedVideoCall(userId) {
    const userArea = this.userAreas.get(userId);
    if (!userArea) return false;

    const usersWithSameColor = this.colorVideoGroups.get(userArea.color) || new Set();
    return usersWithSameColor.size > 1;
  }

  /**
   * 사용자 연결 해제 시 정리
   */
  removeUser(userId) {
    const userArea = this.userAreas.get(userId);
    if (userArea) {
      const { areaKey, color } = userArea;
      
      // 영역에서 제거
      if (this.areaUsers.has(areaKey)) {
        this.areaUsers.get(areaKey).delete(userId);
      }
      
      // 색상 그룹에서 제거
      if (color && this.colorVideoGroups.has(color)) {
        this.colorVideoGroups.get(color).delete(userId);
        if (this.colorVideoGroups.get(color).size === 0) {
          this.colorVideoGroups.delete(color);
        }
      }
      
      // 화상통화 세션에서 제거
      this.handleUserLeaveArea(userId, areaKey);
      
      // 사용자 영역 정보 제거
      this.userAreas.delete(userId);
      
      console.log('🧹 사용자 정리 완료:', { userId, areaKey, color });
    }
  }

  /**
   * AreaVideoCallManager 종료 및 정리
   */
  shutdown() {
    console.log('🔚 AreaVideoCallManager 종료 중...');
    
    // 영역 감시 중지
    this.stopAreaMonitoring();
    
    // 모든 화상통화 세션 종료
    this.videoSessions.forEach((participants, sessionKey) => {
      console.log(`🎥 [종료] 세션 정리: ${sessionKey}, 참가자: ${participants.size}명`);
    });
    
    // 모든 데이터 정리
    this.areaUsers.clear();
    this.userAreas.clear();
    this.videoSessions.clear();
    this.colorVideoGroups.clear();
    this.metaverseHandler = null;
    
    console.log('🔚 AreaVideoCallManager 종료 완료');
  }

  /**
   * 영역 자동 감시 시작 (0.5초마다)
   */
  startAreaMonitoring() {
    if (this.areaMonitoringInterval) {
      clearInterval(this.areaMonitoringInterval);
    }

    console.log(`🔍 영역 자동 감시 시작 (${this.monitoringIntervalMs}ms 간격)`);
    
    this.areaMonitoringInterval = setInterval(() => {
      if (this.areaMonitoringEnabled) {
        this.monitorAreas();
      }
    }, this.monitoringIntervalMs);
  }

  /**
   * 영역 자동 감시 중지
   */
  stopAreaMonitoring() {
    if (this.areaMonitoringInterval) {
      clearInterval(this.areaMonitoringInterval);
      this.areaMonitoringInterval = null;
      console.log('🔍 영역 자동 감시 중지');
    }
  }

  /**
   * 영역 감시 활성화/비활성화
   */
  setAreaMonitoringEnabled(enabled) {
    this.areaMonitoringEnabled = enabled;
    console.log(`🔍 영역 감시 ${enabled ? '활성화' : '비활성화'}`);
  }

  /**
   * 0.5초마다 실행되는 영역 감시 로직
   */
  monitorAreas() {
    const currentTime = Date.now();
    const totalAreas = this.areaUsers.size;
    const totalColorGroups = this.colorVideoGroups.size;
    const totalVideoSessions = this.videoSessions.size;
    
    // 감시 상태 로깅 (매 10회마다 한 번씩)
    if (!this.monitoringCounter) this.monitoringCounter = 0;
    this.monitoringCounter++;
    
    if (this.monitoringCounter % 20 === 0) { // 10초마다
      console.log(`🔍 [감시] 영역 감시 상태:`, {
        areas: totalAreas,
        colorGroups: totalColorGroups,
        activeSessions: totalVideoSessions,
        counter: this.monitoringCounter
      });
    }
    
    // 모든 영역을 감시하여 2명 이상의 사용자가 있는 영역 찾기
    this.areaUsers.forEach((users, areaKey) => {
      if (users.size >= 2) {
        // 현재 화상통화 세션이 없으면 자동 시작
        if (!this.videoSessions.has(areaKey)) {
          console.log(`🎥 [감시발견] 영역에 ${users.size}명 감지 → 자동 화상통화 시작:`, {
            areaKey,
            users: Array.from(users)
          });
          this.autoStartAreaVideoCall(areaKey, Array.from(users));
        } else {
          // 기존 세션이 있으면 참가자 동기화 (누락된 사용자 자동 추가)
          this.ensureAllAreaUsersInVideoCall(areaKey, Array.from(users));
        }
      } else if (users.size < 2) {
        // 사용자가 1명 이하면 화상통화 세션 종료
        if (this.videoSessions.has(areaKey)) {
          console.log(`🎥 [감시종료] 영역에 ${users.size}명만 남음 → 자동 화상통화 종료:`, areaKey);
          this.autoEndAreaVideoCall(areaKey, '참가자 부족');
        }
      }
    });

    // 색상별 그룹 감시 (같은 색상의 사용자들끼리 화상통화)
    this.colorVideoGroups.forEach((users, color) => {
      if (users.size >= 2) {
        const colorSessionKey = `color_${color.replace('#', '')}`;
        if (!this.videoSessions.has(colorSessionKey)) {
          console.log(`🎨 [감시발견] 색상 ${color}에 ${users.size}명 감지 → 자동 화상통화 시작:`, {
            color,
            sessionKey: colorSessionKey,
            users: Array.from(users)
          });
          this.autoStartColorBasedVideoCall(color, Array.from(users));
        } else {
          // 색상 기반 세션 참가자 동기화 (누락된 사용자 자동 추가)
          this.ensureAllColorUsersInVideoCall(colorSessionKey, color, Array.from(users));
        }
      }
    });
  }

  /**
   * 영역별 자동 화상통화 시작
   */
  autoStartAreaVideoCall(areaKey, userIds) {
    if (!this.videoSessions.has(areaKey)) {
      this.videoSessions.set(areaKey, new Set());
    }

    const session = this.videoSessions.get(areaKey);
    userIds.forEach(userId => session.add(userId));

    console.log(`🎥 [자동시작] 영역 화상통화 시작:`, {
      areaKey,
      participants: userIds.length,
      userIds
    });

    // 영역의 모든 참가자에게 알림 발송
    this.notifyAutoAreaVideoCallStart(areaKey, userIds);

    return { areaKey, participants: Array.from(session) };
  }

  /**
   * 색상별 자동 화상통화 시작
   */
  autoStartColorBasedVideoCall(color, userIds) {
    const colorSessionKey = `color_${color.replace('#', '')}`;
    
    if (!this.videoSessions.has(colorSessionKey)) {
      this.videoSessions.set(colorSessionKey, new Set());
    }

    const session = this.videoSessions.get(colorSessionKey);
    userIds.forEach(userId => session.add(userId));

    console.log(`🎨 [자동시작] 색상 기반 화상통화 시작:`, {
      color,
      sessionKey: colorSessionKey,
      participants: userIds.length,
      userIds
    });

    // 색상 그룹의 모든 참가자에게 알림 발송
    this.notifyAutoColorVideoCallStart(color, colorSessionKey, userIds);

    return { sessionKey: colorSessionKey, color, participants: Array.from(session) };
  }

  /**
   * 영역별 자동 화상통화 종료
   */
  autoEndAreaVideoCall(areaKey, reason = '자동 종료') {
    const session = this.videoSessions.get(areaKey);
    if (session) {
      const participants = Array.from(session);
      this.videoSessions.delete(areaKey);

      console.log(`🎥 [자동종료] 영역 화상통화 종료:`, {
        areaKey,
        reason,
        participants: participants.length
      });

      // 참가자들에게 종료 알림 발송
      this.notifyAutoAreaVideoCallEnd(areaKey, participants, reason);

      return { areaKey, participants, reason };
    }
    return null;
  }

  /**
   * 화상통화 참가자 동기화 (새로운 사용자 자동 추가/제거)
   */
  syncVideoCallParticipants(sessionKey, currentUsers) {
    const session = this.videoSessions.get(sessionKey);
    if (!session) return;

    const sessionUsers = Array.from(session);
    const toAdd = currentUsers.filter(userId => !session.has(userId));
    const toRemove = sessionUsers.filter(userId => !currentUsers.includes(userId));

    // 새로운 사용자 추가
    toAdd.forEach(userId => {
      session.add(userId);
      console.log(`👤 [자동추가] 화상통화 참가자 추가: ${userId} to ${sessionKey}`);
    });

    // 떠난 사용자 제거
    toRemove.forEach(userId => {
      session.delete(userId);
      console.log(`👤 [자동제거] 화상통화 참가자 제거: ${userId} from ${sessionKey}`);
    });

    // 변경 사항이 있으면 알림 발송
    if (toAdd.length > 0 || toRemove.length > 0) {
      this.notifyVideoCallParticipantChange(sessionKey, Array.from(session), toAdd, toRemove);
    }
  }

  /**
   * 자동 영역 화상통화 시작 알림
   */
  notifyAutoAreaVideoCallStart(areaKey, participants) {
    // MetaverseHandler를 통해 알림 발송 (의존성 주입 필요)
    if (this.metaverseHandler) {
      this.metaverseHandler.notifyAutoAreaVideoCallStart(areaKey, participants);
    }
  }

  /**
   * 자동 색상 화상통화 시작 알림
   */
  notifyAutoColorVideoCallStart(color, sessionKey, participants) {
    // MetaverseHandler를 통해 알림 발송 (의존성 주입 필요)
    if (this.metaverseHandler) {
      this.metaverseHandler.notifyAutoColorVideoCallStart(color, sessionKey, participants);
    }
  }

  /**
   * 자동 영역 화상통화 종료 알림
   */
  notifyAutoAreaVideoCallEnd(areaKey, participants, reason) {
    // MetaverseHandler를 통해 알림 발송 (의존성 주입 필요)
    if (this.metaverseHandler) {
      this.metaverseHandler.notifyAutoAreaVideoCallEnd(areaKey, participants, reason);
    }
  }

  /**
   * 화상통화 참가자 변경 알림
   */
  notifyVideoCallParticipantChange(sessionKey, participants, added, removed) {
    // MetaverseHandler를 통해 알림 발송 (의존성 주입 필요)
    if (this.metaverseHandler) {
      this.metaverseHandler.notifyVideoCallParticipantChange(sessionKey, participants, added, removed);
    }
  }

  /**
   * 영역 내 모든 사용자가 화상통화에 참여하도록 보장 (누락된 사용자 자동 추가)
   */
  ensureAllAreaUsersInVideoCall(areaKey, currentAreaUsers) {
    const session = this.videoSessions.get(areaKey);
    if (!session) {
      // 세션이 없으면 새로 시작
      this.autoStartAreaVideoCall(areaKey, currentAreaUsers);
      return;
    }

    const sessionParticipants = Array.from(session);
    const missingUsers = currentAreaUsers.filter(userId => !session.has(userId));
    const extraUsers = sessionParticipants.filter(userId => !currentAreaUsers.includes(userId));

    if (missingUsers.length > 0) {
      console.log(`👤 [자동추가] 영역 화상통화에 누락된 사용자 ${missingUsers.length}명 추가:`, {
        areaKey,
        missingUsers,
        currentUsers: currentAreaUsers,
        sessionUsers: sessionParticipants
      });

      // 누락된 사용자들을 세션에 추가
      missingUsers.forEach(userId => {
        session.add(userId);
        // 개별 사용자에게 자동 참여 알림
        this.notifyUserAutoJoinVideoCall(userId, areaKey, Array.from(session));
      });
    }

    if (extraUsers.length > 0) {
      console.log(`👤 [자동제거] 영역을 떠난 사용자 ${extraUsers.length}명 제거:`, {
        areaKey,
        extraUsers
      });

      // 영역을 떠난 사용자들을 세션에서 제거
      extraUsers.forEach(userId => {
        session.delete(userId);
        // 개별 사용자에게 자동 퇴장 알림
        this.notifyUserAutoLeaveVideoCall(userId, areaKey, '영역 이탈');
      });
    }

    // 변경 사항이 있으면 모든 참가자에게 알림
    if (missingUsers.length > 0 || extraUsers.length > 0) {
      this.notifyVideoCallParticipantChange(areaKey, Array.from(session), missingUsers, extraUsers);
    }
  }

  /**
   * 색상 그룹 내 모든 사용자가 화상통화에 참여하도록 보장 (누락된 사용자 자동 추가)
   */
  ensureAllColorUsersInVideoCall(colorSessionKey, color, currentColorUsers) {
    const session = this.videoSessions.get(colorSessionKey);
    if (!session) {
      // 세션이 없으면 새로 시작
      this.autoStartColorBasedVideoCall(color, currentColorUsers);
      return;
    }

    const sessionParticipants = Array.from(session);
    const missingUsers = currentColorUsers.filter(userId => !session.has(userId));
    const extraUsers = sessionParticipants.filter(userId => !currentColorUsers.includes(userId));

    if (missingUsers.length > 0) {
      console.log(`🎨 [자동추가] 색상 화상통화에 누락된 사용자 ${missingUsers.length}명 추가:`, {
        color,
        sessionKey: colorSessionKey,
        missingUsers,
        currentUsers: currentColorUsers,
        sessionUsers: sessionParticipants
      });

      // 누락된 사용자들을 세션에 추가
      missingUsers.forEach(userId => {
        session.add(userId);
        // 개별 사용자에게 자동 참여 알림
        this.notifyUserAutoJoinColorVideoCall(userId, color, colorSessionKey, Array.from(session));
      });
    }

    if (extraUsers.length > 0) {
      console.log(`🎨 [자동제거] 색상이 변경된 사용자 ${extraUsers.length}명 제거:`, {
        color,
        sessionKey: colorSessionKey,
        extraUsers
      });

      // 색상이 변경된 사용자들을 세션에서 제거
      extraUsers.forEach(userId => {
        session.delete(userId);
        // 개별 사용자에게 자동 퇴장 알림
        this.notifyUserAutoLeaveVideoCall(userId, colorSessionKey, '색상 변경');
      });
    }

    // 변경 사항이 있으면 모든 참가자에게 알림
    if (missingUsers.length > 0 || extraUsers.length > 0) {
      this.notifyVideoCallParticipantChange(colorSessionKey, Array.from(session), missingUsers, extraUsers);
    }
  }

  /**
   * 개별 사용자에게 자동 영역 화상통화 참여 알림
   */
  notifyUserAutoJoinVideoCall(userId, areaKey, participants) {
    if (this.metaverseHandler) {
      this.metaverseHandler.notifyUserAutoJoinVideoCall(userId, areaKey, participants);
    }
  }

  /**
   * 개별 사용자에게 자동 색상 화상통화 참여 알림
   */
  notifyUserAutoJoinColorVideoCall(userId, color, sessionKey, participants) {
    if (this.metaverseHandler) {
      this.metaverseHandler.notifyUserAutoJoinColorVideoCall(userId, color, sessionKey, participants);
    }
  }

  /**
   * 개별 사용자에게 자동 화상통화 퇴장 알림
   */
  notifyUserAutoLeaveVideoCall(userId, sessionKey, reason) {
    if (this.metaverseHandler) {
      this.metaverseHandler.notifyUserAutoLeaveVideoCall(userId, sessionKey, reason);
    }
  }

  /**
   * MetaverseHandler 참조 설정 (의존성 주입)
   */
  setMetaverseHandler(handler) {
    this.metaverseHandler = handler;
  }

  /**
   * 참가자 목록을 기반으로 자동 화상통화 시작
   */
  triggerAutoVideoCallForParticipants(mapId, participants) {
    console.log(`🎥 [참가자기반] 자동 화상통화 시작:`, {
      mapId,
      participantCount: participants.length
    });

    try {
      // 참가자들을 영역별로 그룹화
      const areaGroups = new Map();
      
      participants.forEach(participant => {
        const areaInfo = participant.calculatedAreaInfo;
        const areaIndex = participant.calculatedAreaIndex || 0;
        const areaType = participant.calculatedAreaType || 'public';
        
        // 영역 키 생성 (맵ID-영역타입-영역인덱스)
        const areaKey = `${mapId}-${areaType}-${areaIndex}`;
        
        if (!areaGroups.has(areaKey)) {
          areaGroups.set(areaKey, {
            areaInfo,
            areaType,
            areaIndex,
            participants: []
          });
        }
        
        areaGroups.get(areaKey).participants.push(participant);
      });

      // 각 영역별로 2명 이상의 참가자가 있으면 화상통화 시작
      areaGroups.forEach((group, areaKey) => {
        const { areaInfo, areaType, areaIndex, participants: areaParticipants } = group;
        
        if (areaParticipants.length >= 2) {
          console.log(`🎥 [참가자기반] 영역 ${areaKey}에 ${areaParticipants.length}명 있음 - 화상통화 시작`);
          
          const color = getZoneColor(areaType, areaInfo?.id || areaIndex.toString());
          
          // 색상 기반 화상통화 세션 설정
          this.colorVideoGroups.set(color, new Set(areaParticipants.map(p => p.userId)));
          
          // 각 참가자에게 자동 화상통화 시작 알림
          areaParticipants.forEach(participant => {
            const socket = this.metaverseHandler.userSockets.get(participant.userId);
            if (socket) {
              const actualSocket = this.metaverseHandler.io.sockets.sockets.get(socket);
              if (actualSocket) {
                actualSocket.emit('auto-color-video-call-started', {
                  color,
                  sessionKey: `color-${color}`,
                  participants: areaParticipants.map(p => ({
                    userId: p.userId,
                    username: p.username
                  })),
                  message: `${areaParticipants.length}명이 같은 영역에 있어 자동으로 화상통화가 시작됩니다.`
                });
                
                console.log(`🎥 [참가자기반] ${participant.username}에게 자동 화상통화 시작 알림 전송 (색상: ${color})`);
              }
            }
          });
        } else {
          console.log(`🎥 [참가자기반] 영역 ${areaKey}에 ${areaParticipants.length}명 있음 - 화상통화 시작 조건 불충족`);
        }
      });

    } catch (error) {
      console.error(`🎥 [참가자기반] 자동 화상통화 시작 오류:`, error);
    }
  }

  /**
   * 전체 상태 조회 (디버깅용)
   */
  getFullState() {
    const areaUsersObj = {};
    this.areaUsers.forEach((users, areaKey) => {
      areaUsersObj[areaKey] = Array.from(users);
    });

    const videoSessionsObj = {};
    this.videoSessions.forEach((users, sessionKey) => {
      videoSessionsObj[sessionKey] = Array.from(users);
    });

    const colorVideoGroupsObj = {};
    this.colorVideoGroups.forEach((users, color) => {
      colorVideoGroupsObj[color] = Array.from(users);
    });

    const userAreasObj = {};
    this.userAreas.forEach((area, userId) => {
      userAreasObj[userId] = area;
    });

    return {
      areaUsers: areaUsersObj,
      videoSessions: videoSessionsObj,
      colorVideoGroups: colorVideoGroupsObj,
      userAreas: userAreasObj,
      monitoring: {
        enabled: this.areaMonitoringEnabled,
        intervalMs: this.monitoringIntervalMs,
        isRunning: !!this.areaMonitoringInterval
      }
    };
  }
}

module.exports = AreaVideoCallManager;