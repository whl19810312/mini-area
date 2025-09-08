class VirtualSpaceModeManager {
  constructor() {
    this.spaceModes = new Map(); // spaceId -> modeInfo
    this.userModes = new Map();  // userId -> modeInfo
    this.modeHistory = new Map(); // spaceId -> modeHistory[]
    this.modeStatistics = {
      totalSpaces: 0,
      spacesInCreation: 0,
      spacesInEdit: 0,
      spacesInUse: 0,
      totalUsers: 0,
      usersInCreation: 0,
      usersInEdit: 0,
      usersInUse: 0
    };
    
    // 모드 정의
    this.modes = {
      CREATION: 'creation',    // 생성 모드
      EDIT: 'edit',           // 편집 모드
      USE: 'use'              // 입실 모드
    };
    
    // 모드별 권한 정의
    this.modePermissions = {
      [this.modes.CREATION]: {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canInvite: false,
        canUse: false,
        maxUsers: 1
      },
      [this.modes.EDIT]: {
        canCreate: false,
        canEdit: true,
        canDelete: false,
        canInvite: false,
        canUse: false,
        maxUsers: 1
      },
      [this.modes.USE]: {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canInvite: true,
        canUse: true,
        maxUsers: 50
      }
    };
    
    // 통계 업데이트 타이머
    this.startStatisticsUpdate();
  }

  // 가상공간 모드 초기화
  initializeSpaceMode(spaceId, spaceInfo, initialMode = this.modes.CREATION) {
    const modeInfo = {
      spaceId,
      spaceName: spaceInfo.spaceName,
      ownerId: spaceInfo.ownerId,
      currentMode: initialMode,
      previousMode: null,
      modeStartTime: new Date(),
      modeDuration: 0,
      users: new Set(),
      maxUsers: this.modePermissions[initialMode].maxUsers,
      permissions: { ...this.modePermissions[initialMode] },
      settings: {
        autoSave: true,
        saveInterval: 30000, // 30초
        backupEnabled: true,
        versionControl: true
      },
      metadata: {
        createdAt: new Date(),
        lastModified: new Date(),
        version: 1,
        isPublic: spaceInfo.isPublic || false,
        category: spaceInfo.category || 'general',
        tags: spaceInfo.tags || []
      }
    };

    this.spaceModes.set(spaceId, modeInfo);
    this.modeHistory.set(spaceId, []);
    
    // 모드 시작 기록
    this.recordModeEvent(spaceId, 'mode_initialized', {
      mode: initialMode,
      spaceInfo,
      timestamp: new Date()
    });

    console.log(`✅ 가상공간 모드 초기화: ${spaceInfo.spaceName} (${spaceId}) - ${initialMode} 모드`);
    return modeInfo;
  }

  // 가상공간 모드 변경
  changeSpaceMode(spaceId, newMode, changeReason = '') {
    const modeInfo = this.spaceModes.get(spaceId);
    if (!modeInfo) {
      console.error(`❌ 가상공간 모드를 찾을 수 없음: ${spaceId}`);
      return null;
    }

    const previousMode = modeInfo.currentMode;
    const modeStartTime = modeInfo.modeStartTime;
    const currentTime = new Date();

    // 이전 모드 종료 처리
    this.endCurrentMode(spaceId, previousMode, modeStartTime, currentTime);

    // 새 모드 시작
    modeInfo.previousMode = previousMode;
    modeInfo.currentMode = newMode;
    modeInfo.modeStartTime = currentTime;
    modeInfo.permissions = { ...this.modePermissions[newMode] };
    modeInfo.maxUsers = this.modePermissions[newMode].maxUsers;

    // 모드 변경 이벤트 기록
    this.recordModeEvent(spaceId, 'mode_changed', {
      from: previousMode,
      to: newMode,
      reason: changeReason,
      timestamp: currentTime
    });

    console.log(`🔄 가상공간 모드 변경: ${modeInfo.spaceName} (${spaceId}) - ${previousMode} → ${newMode}`);
    return modeInfo;
  }

  // 현재 모드 종료 처리
  endCurrentMode(spaceId, mode, startTime, endTime) {
    const modeInfo = this.spaceModes.get(spaceId);
    if (!modeInfo) return;

    const duration = endTime.getTime() - startTime.getTime();
    modeInfo.modeDuration = duration;

    // 모드별 특별 처리
    switch (mode) {
      case this.modes.CREATION:
        // 생성 모드 종료 시 자동 저장
        if (modeInfo.settings.autoSave) {
          this.autoSaveSpace(spaceId);
        }
        break;
      
      case this.modes.EDIT:
        // 편집 모드 종료 시 변경사항 저장
        this.saveEditChanges(spaceId);
        break;
      
      case this.modes.USE:
        // 사용 모드 종료 시 사용자 정리
        this.cleanupUseMode(spaceId);
        break;
    }
  }

  // 사용자 모드 참가
  addUserToMode(userId, username, spaceId, userRole = 'user') {
    const modeInfo = this.spaceModes.get(spaceId);
    if (!modeInfo) {
      console.error(`❌ 가상공간 모드를 찾을 수 없음: ${spaceId}`);
      return false;
    }

    // 사용자 수 제한 확인
    if (modeInfo.users.size >= modeInfo.maxUsers) {
      console.error(`❌ 가상공간 사용자 수 초과: ${spaceId} (${modeInfo.users.size}/${modeInfo.maxUsers})`);
      return false;
    }

    // 사용자 정보
    const userInfo = {
      userId,
      username,
      role: userRole,
      joinedAt: new Date(),
      isActive: true,
      permissions: this.getUserPermissions(userRole, modeInfo.currentMode)
    };

    modeInfo.users.add(userInfo);

    // 사용자 모드 정보 업데이트
    this.userModes.set(userId, {
      spaceId,
      spaceName: modeInfo.spaceName,
      currentMode: modeInfo.currentMode,
      role: userRole,
      joinedAt: userInfo.joinedAt,
      permissions: userInfo.permissions
    });

    // 사용자 참가 이벤트 기록
    this.recordModeEvent(spaceId, 'user_joined', {
      userId,
      username,
      role: userRole,
      mode: modeInfo.currentMode,
      timestamp: new Date()
    });

    console.log(`✅ 사용자 모드 참가: ${username} (${userId}) → ${modeInfo.spaceName} (${spaceId}) - ${modeInfo.currentMode} 모드`);
    return true;
  }

  // 사용자 모드 퇴장
  removeUserFromMode(userId, spaceId) {
    const modeInfo = this.spaceModes.get(spaceId);
    if (!modeInfo) {
      console.error(`❌ 가상공간 모드를 찾을 수 없음: ${spaceId}`);
      return false;
    }

    // 사용자 찾기 및 제거
    const userToRemove = Array.from(modeInfo.users).find(user => user.userId === userId);
    if (!userToRemove) {
      console.error(`❌ 사용자를 찾을 수 없음: ${userId} (${spaceId})`);
      return false;
    }

    modeInfo.users.delete(userToRemove);

    // 사용자 모드 정보 제거
    this.userModes.delete(userId);

    // 사용자 퇴장 이벤트 기록
    this.recordModeEvent(spaceId, 'user_left', {
      userId,
      username: userToRemove.username,
      role: userToRemove.role,
      mode: modeInfo.currentMode,
      timestamp: new Date()
    });

    console.log(`✅ 사용자 모드 퇴장: ${userToRemove.username} (${userId}) ← ${modeInfo.spaceName} (${spaceId})`);
    return true;
  }

  // 사용자 권한 가져오기
  getUserPermissions(userRole, mode) {
    const basePermissions = { ...this.modePermissions[mode] };
    
    // 역할별 권한 조정
    switch (userRole) {
      case 'owner':
        basePermissions.canDelete = true;
        basePermissions.canInvite = true;
        break;
      case 'admin':
        basePermissions.canEdit = true;
        basePermissions.canInvite = true;
        break;
      case 'moderator':
        basePermissions.canEdit = false;
        basePermissions.canInvite = true;
        break;
      case 'user':
        // 기본 권한 유지
        break;
    }
    
    return basePermissions;
  }

  // 모드 이벤트 기록
  recordModeEvent(spaceId, eventType, eventData) {
    const history = this.modeHistory.get(spaceId) || [];
    const event = {
      eventType,
      timestamp: new Date(),
      ...eventData
    };
    
    history.push(event);
    this.modeHistory.set(spaceId, history);

    // 히스토리 크기 제한 (최근 100개만 유지)
    if (history.length > 100) {
      this.modeHistory.set(spaceId, history.slice(-100));
    }
  }

  // 자동 저장 (생성 모드)
  autoSaveSpace(spaceId) {
    const modeInfo = this.spaceModes.get(spaceId);
    if (!modeInfo) return;

    modeInfo.metadata.lastModified = new Date();
    modeInfo.metadata.version++;

    this.recordModeEvent(spaceId, 'auto_save', {
      version: modeInfo.metadata.version,
      timestamp: new Date()
    });

    console.log(`💾 자동 저장: ${modeInfo.spaceName} (${spaceId}) - 버전 ${modeInfo.metadata.version}`);
  }

  // 편집 변경사항 저장
  saveEditChanges(spaceId) {
    const modeInfo = this.spaceModes.get(spaceId);
    if (!modeInfo) return;

    modeInfo.metadata.lastModified = new Date();
    modeInfo.metadata.version++;

    this.recordModeEvent(spaceId, 'edit_saved', {
      version: modeInfo.metadata.version,
      timestamp: new Date()
    });

    console.log(`💾 편집 저장: ${modeInfo.spaceName} (${spaceId}) - 버전 ${modeInfo.metadata.version}`);
  }

  // 사용 모드 정리
  cleanupUseMode(spaceId) {
    const modeInfo = this.spaceModes.get(spaceId);
    if (!modeInfo) return;

    // 모든 사용자 퇴장
    const usersToRemove = Array.from(modeInfo.users);
    usersToRemove.forEach(user => {
      this.userModes.delete(user.userId);
    });
    modeInfo.users.clear();

    this.recordModeEvent(spaceId, 'use_mode_cleanup', {
      removedUsers: usersToRemove.length,
      timestamp: new Date()
    });

    console.log(`🧹 사용 모드 정리: ${modeInfo.spaceName} (${spaceId}) - ${usersToRemove.length}명 퇴장`);
  }

  // 가상공간 모드 정보 가져오기
  getSpaceMode(spaceId) {
    return this.spaceModes.get(spaceId);
  }

  // 사용자 모드 정보 가져오기
  getUserMode(userId) {
    return this.userModes.get(userId);
  }

  // 가상공간 모드 히스토리 가져오기
  getSpaceModeHistory(spaceId) {
    return this.modeHistory.get(spaceId) || [];
  }

  // 특정 모드의 가상공간들 가져오기
  getSpacesInMode(mode) {
    const spaces = [];
    for (const [spaceId, modeInfo] of this.spaceModes.entries()) {
      if (modeInfo.currentMode === mode) {
        spaces.push({
          spaceId,
          spaceName: modeInfo.spaceName,
          ownerId: modeInfo.ownerId,
          currentMode: modeInfo.currentMode,
          modeStartTime: modeInfo.modeStartTime,
          userCount: modeInfo.users.size,
          maxUsers: modeInfo.maxUsers,
          metadata: modeInfo.metadata
        });
      }
    }
    return spaces;
  }

  // 사용자가 참가 중인 가상공간 가져오기
  getUserSpaces(userId) {
    const userMode = this.userModes.get(userId);
    if (!userMode) return null;

    const spaceMode = this.spaceModes.get(userMode.spaceId);
    if (!spaceMode) return null;

    return {
      spaceId: userMode.spaceId,
      spaceName: userMode.spaceName,
      currentMode: userMode.currentMode,
      role: userMode.role,
      joinedAt: userMode.joinedAt,
      permissions: userMode.permissions,
      spaceInfo: {
        ownerId: spaceMode.ownerId,
        userCount: spaceMode.users.size,
        maxUsers: spaceMode.maxUsers,
        metadata: spaceMode.metadata
      }
    };
  }

  // 가상공간 사용자 목록 가져오기
  getSpaceUsers(spaceId) {
    const modeInfo = this.spaceModes.get(spaceId);
    if (!modeInfo) return [];

    return Array.from(modeInfo.users);
  }

  // 권한 확인
  checkPermission(userId, spaceId, permission) {
    const userMode = this.userModes.get(userId);
    if (!userMode || userMode.spaceId !== spaceId) return false;

    return userMode.permissions[permission] || false;
  }

  // 전체 통계 업데이트
  updateModeStatistics() {
    const stats = {
      totalSpaces: 0,
      spacesInCreation: 0,
      spacesInEdit: 0,
      spacesInUse: 0,
      totalUsers: 0,
      usersInCreation: 0,
      usersInEdit: 0,
      usersInUse: 0
    };

    // 가상공간별 통계
    for (const modeInfo of this.spaceModes.values()) {
      stats.totalSpaces++;
      
      switch (modeInfo.currentMode) {
        case this.modes.CREATION:
          stats.spacesInCreation++;
          stats.usersInCreation += modeInfo.users.size;
          break;
        case this.modes.EDIT:
          stats.spacesInEdit++;
          stats.usersInEdit += modeInfo.users.size;
          break;
        case this.modes.USE:
          stats.spacesInUse++;
          stats.usersInUse += modeInfo.users.size;
          break;
      }
    }

    stats.totalUsers = this.userModes.size;
    this.modeStatistics = stats;
  }

  // 통계 업데이트 타이머 시작
  startStatisticsUpdate() {
    setInterval(() => {
      this.updateModeStatistics();
    }, 30 * 1000); // 30초마다 업데이트
  }

  // 전체 통계 가져오기
  getModeStatistics() {
    return { ...this.modeStatistics };
  }

  // 가상공간 제거
  removeSpace(spaceId) {
    const modeInfo = this.spaceModes.get(spaceId);
    if (!modeInfo) return false;

    // 모든 사용자 제거
    const usersToRemove = Array.from(modeInfo.users);
    usersToRemove.forEach(user => {
      this.userModes.delete(user.userId);
    });

    // 가상공간 모드 정보 제거
    this.spaceModes.delete(spaceId);
    this.modeHistory.delete(spaceId);

    console.log(`🗑️ 가상공간 제거: ${modeInfo.spaceName} (${spaceId}) - ${usersToRemove.length}명 사용자 제거`);
    return true;
  }

  // 사용자 제거
  removeUser(userId) {
    const userMode = this.userModes.get(userId);
    if (userMode) {
      this.removeUserFromMode(userId, userMode.spaceId);
    }
  }

  // 모든 데이터 정리
  clear() {
    this.spaceModes.clear();
    this.userModes.clear();
    this.modeHistory.clear();
    this.modeStatistics = {
      totalSpaces: 0,
      spacesInCreation: 0,
      spacesInEdit: 0,
      spacesInUse: 0,
      totalUsers: 0,
      usersInCreation: 0,
      usersInEdit: 0,
      usersInUse: 0
    };
    console.log('🧹 가상공간 모드 관리자 데이터 정리 완료');
  }

  // 디버그 정보 가져오기
  getDebugInfo() {
    return {
      spaceModes: this.spaceModes.size,
      userModes: this.userModes.size,
      modeHistory: Array.from(this.modeHistory.keys()).length,
      statistics: this.getModeStatistics(),
      modes: this.modes
    };
  }
}

module.exports = VirtualSpaceModeManager;





