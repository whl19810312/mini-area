const { detectUserArea } = require('../utils/areaDetection');

class AreaVideoCallManager {
  constructor() {
    // 맵별 영역별 사용자 관리: { mapId: { areaId: Set<userId> } }
    this.areaUsers = new Map();
    // 사용자별 현재 영역 정보: { userId: { mapId, areaId, areaType } }
    this.userAreas = new Map();
    // 영역별 화상통화 세션: { areaKey: Set<userId> }
    this.videoSessions = new Map();
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
    
    const oldUserArea = this.userAreas.get(userId);
    const newAreaKey = this.generateAreaKey(mapId, areaInfo.type, areaInfo.id);
    const oldAreaKey = oldUserArea ? 
      this.generateAreaKey(oldUserArea.mapId, oldUserArea.areaType, oldUserArea.areaId) : null;

    console.log('🌍 영역 업데이트:', {
      userId,
      oldArea: oldUserArea,
      newArea: areaInfo,
      oldAreaKey,
      newAreaKey
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

      // 새 영역에 추가
      if (!this.areaUsers.has(newAreaKey)) {
        this.areaUsers.set(newAreaKey, new Set());
      }
      this.areaUsers.get(newAreaKey).add(userId);

      // 사용자 영역 정보 업데이트
      this.userAreas.set(userId, {
        mapId,
        areaType: areaInfo.type,
        areaId: areaInfo.id,
        areaKey: newAreaKey,
        position: { ...position }
      });

      return {
        changed: true,
        oldAreaKey,
        newAreaKey,
        areaInfo,
        usersInNewArea: Array.from(this.areaUsers.get(newAreaKey)),
        usersInOldArea: oldAreaKey ? Array.from(this.areaUsers.get(oldAreaKey) || []) : []
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
      areaInfo,
      usersInArea: Array.from(this.areaUsers.get(newAreaKey) || [])
    };
  }

  /**
   * 영역 내 화상통화 세션 시작
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
   * 사용자 연결 해제 시 정리
   */
  removeUser(userId) {
    const userArea = this.userAreas.get(userId);
    if (userArea) {
      const { areaKey } = userArea;
      
      // 영역에서 제거
      if (this.areaUsers.has(areaKey)) {
        this.areaUsers.get(areaKey).delete(userId);
      }
      
      // 화상통화 세션에서 제거
      this.handleUserLeaveArea(userId, areaKey);
      
      // 사용자 영역 정보 제거
      this.userAreas.delete(userId);
      
      console.log('🧹 사용자 정리 완료:', { userId, areaKey });
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
    this.videoSessions.forEach((users, areaKey) => {
      videoSessionsObj[areaKey] = Array.from(users);
    });

    const userAreasObj = {};
    this.userAreas.forEach((area, userId) => {
      userAreasObj[userId] = area;
    });

    return {
      areaUsers: areaUsersObj,
      videoSessions: videoSessionsObj,
      userAreas: userAreasObj
    };
  }
}

module.exports = AreaVideoCallManager;