const VirtualSpaceModeManager = require('./virtualSpaceModeManager');
const VirtualSpaceInfoManager = require('./virtualSpaceInfoManager');

class VirtualSpaceManager {
  constructor() {
    this.modeManager = new VirtualSpaceModeManager();
    this.infoManager = new VirtualSpaceInfoManager();
    this.spaceStatistics = {
      totalSpaces: 0,
      spacesInCreation: 0,
      spacesInEdit: 0,
      spacesInUse: 0,
      publicSpaces: 0,
      privateSpaces: 0,
      totalElements: 0,
      totalBackups: 0
    };
    
    // 통계 업데이트 타이머
    this.startStatisticsUpdate();
  }

  // 가상공간 생성
  async createVirtualSpace(spaceData, ownerId) {
    try {
      const spaceId = `space_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 기본 정보 설정
      const spaceInfo = {
        ...spaceData,
        ownerId,
        spaceId
      };

      // 정보 관리자 초기화
      await this.infoManager.initializeSpaceInfo(spaceId, spaceInfo);
      
      // 모드 관리자 초기화 (생성 모드로 시작)
      this.modeManager.initializeSpaceMode(spaceId, spaceInfo, this.modeManager.modes.CREATION);
      
      // 소유자를 생성 모드에 참가
      this.modeManager.addUserToMode(ownerId, spaceData.ownerName || 'Owner', spaceId, 'owner');

      console.log(`✅ 가상공간 생성 완료: ${spaceData.spaceName} (${spaceId})`);
      return {
        spaceId,
        spaceInfo: this.infoManager.getSpaceInfo(spaceId),
        modeInfo: this.modeManager.getSpaceMode(spaceId)
      };
      
    } catch (error) {
      console.error('❌ 가상공간 생성 실패:', error);
      throw error;
    }
  }

  // 가상공간 입실
  async enterVirtualSpace(userId, username, spaceId, userRole = 'user') {
    try {
      // 접근 권한 확인
      const hasAccess = this.infoManager.checkUserAccess(userId, spaceId, 'read');
      if (!hasAccess) {
        throw new Error('가상공간에 접근할 권한이 없습니다.');
      }

      const spaceInfo = this.infoManager.getSpaceInfo(spaceId);
      const modeInfo = this.modeManager.getSpaceMode(spaceId);
      
      if (!spaceInfo || !modeInfo) {
        throw new Error('가상공간을 찾을 수 없습니다.');
      }

      // 현재 모드 확인
      if (modeInfo.currentMode === this.modeManager.modes.CREATION) {
        // 생성 모드에서는 소유자만 입실 가능
        if (spaceInfo.ownerId !== userId) {
          throw new Error('생성 중인 가상공간에는 소유자만 입실할 수 있습니다.');
        }
      } else if (modeInfo.currentMode === this.modeManager.modes.EDIT) {
        // 편집 모드에서는 편집 권한이 있는 사용자만 입실 가능
        const permissions = this.infoManager.getUserPermissions(userId, spaceId);
        if (!permissions.includes('write')) {
          throw new Error('편집 중인 가상공간에는 편집 권한이 필요합니다.');
        }
      }

      // 사용자를 모드에 참가
      const joinResult = this.modeManager.addUserToMode(userId, username, spaceId, userRole);
      if (!joinResult) {
        throw new Error('가상공간 입실에 실패했습니다.');
      }

      // 분석 데이터 업데이트
      this.infoManager.updateAnalytics(spaceId, 'visit', 1);
      this.infoManager.updateAnalytics(spaceId, 'uniqueVisitor', userId);
      this.infoManager.updateAnalytics(spaceId, 'currentUsers', modeInfo.users.size);

      console.log(`✅ 가상공간 입실: ${username} (${userId}) → ${spaceInfo.spaceName} (${spaceId})`);
      return {
        spaceInfo,
        modeInfo,
        userMode: this.modeManager.getUserMode(userId)
      };
      
    } catch (error) {
      console.error('❌ 가상공간 입실 실패:', error);
      throw error;
    }
  }

  // 가상공간 퇴장
  async leaveVirtualSpace(userId, spaceId) {
    try {
      const spaceInfo = this.infoManager.getSpaceInfo(spaceId);
      const modeInfo = this.modeManager.getSpaceMode(spaceId);
      
      if (!spaceInfo || !modeInfo) {
        throw new Error('가상공간을 찾을 수 없습니다.');
      }

      // 사용자를 모드에서 제거
      const leaveResult = this.modeManager.removeUserFromMode(userId, spaceId);
      if (!leaveResult) {
        throw new Error('가상공간 퇴장에 실패했습니다.');
      }

      // 분석 데이터 업데이트
      this.infoManager.updateAnalytics(spaceId, 'currentUsers', modeInfo.users.size);

      console.log(`✅ 가상공간 퇴장: ${userId} ← ${spaceInfo.spaceName} (${spaceId})`);
      return true;
      
    } catch (error) {
      console.error('❌ 가상공간 퇴장 실패:', error);
      throw error;
    }
  }

  // 가상공간 모드 변경
  async changeSpaceMode(spaceId, newMode, userId, changeReason = '') {
    try {
      const spaceInfo = this.infoManager.getSpaceInfo(spaceId);
      const modeInfo = this.modeManager.getSpaceMode(spaceId);
      
      if (!spaceInfo || !modeInfo) {
        throw new Error('가상공간을 찾을 수 없습니다.');
      }

      // 권한 확인 (소유자만 모드 변경 가능)
      if (spaceInfo.ownerId !== userId) {
        throw new Error('가상공간 모드 변경 권한이 없습니다.');
      }

      // 모드 변경
      const updatedModeInfo = this.modeManager.changeSpaceMode(spaceId, newMode, changeReason);
      if (!updatedModeInfo) {
        throw new Error('가상공간 모드 변경에 실패했습니다.');
      }

      // 모드별 특별 처리
      if (newMode === this.modeManager.modes.USE) {
        // 사용 모드로 변경 시 자동 백업 생성
        this.infoManager.createBackup(spaceId, 'mode_change');
      }

      console.log(`✅ 가상공간 모드 변경: ${spaceInfo.spaceName} (${spaceId}) → ${newMode}`);
      return updatedModeInfo;
      
    } catch (error) {
      console.error('❌ 가상공간 모드 변경 실패:', error);
      throw error;
    }
  }

  // 가상공간 편집 시작
  async startSpaceEdit(spaceId, userId) {
    try {
      const spaceInfo = this.infoManager.getSpaceInfo(spaceId);
      if (!spaceInfo) {
        throw new Error('가상공간을 찾을 수 없습니다.');
      }

      // 편집 권한 확인
      const permissions = this.infoManager.getUserPermissions(userId, spaceId);
      if (!permissions.includes('write')) {
        throw new Error('가상공간 편집 권한이 없습니다.');
      }

      // 편집 모드로 변경
      await this.changeSpaceMode(spaceId, this.modeManager.modes.EDIT, userId, '편집 시작');

      console.log(`✅ 가상공간 편집 시작: ${spaceInfo.spaceName} (${spaceId})`);
      return true;
      
    } catch (error) {
      console.error('❌ 가상공간 편집 시작 실패:', error);
      throw error;
    }
  }

  // 가상공간 편집 완료
  async finishSpaceEdit(spaceId, userId) {
    try {
      const spaceInfo = this.infoManager.getSpaceInfo(spaceId);
      if (!spaceInfo) {
        throw new Error('가상공간을 찾을 수 없습니다.');
      }

      // 편집 권한 확인
      const permissions = this.infoManager.getUserPermissions(userId, spaceId);
      if (!permissions.includes('write')) {
        throw new Error('가상공간 편집 권한이 없습니다.');
      }

      // 사용 모드로 변경
      await this.changeSpaceMode(spaceId, this.modeManager.modes.USE, userId, '편집 완료');

      console.log(`✅ 가상공간 편집 완료: ${spaceInfo.spaceName} (${spaceId})`);
      return true;
      
    } catch (error) {
      console.error('❌ 가상공간 편집 완료 실패:', error);
      throw error;
    }
  }

  // 가상공간 요소 추가
  async addSpaceElement(spaceId, elementData, userId) {
    try {
      const spaceInfo = this.infoManager.getSpaceInfo(spaceId);
      const modeInfo = this.modeManager.getSpaceMode(spaceId);
      
      if (!spaceInfo || !modeInfo) {
        throw new Error('가상공간을 찾을 수 없습니다.');
      }

      // 편집 권한 확인
      const permissions = this.infoManager.getUserPermissions(userId, spaceId);
      if (!permissions.includes('write')) {
        throw new Error('가상공간 편집 권한이 없습니다.');
      }

      // 편집 모드에서만 요소 추가 가능
      if (modeInfo.currentMode !== this.modeManager.modes.EDIT) {
        throw new Error('편집 모드에서만 요소를 추가할 수 있습니다.');
      }

      // 요소 추가
      const element = this.infoManager.addSpaceElement(spaceId, {
        ...elementData,
        createdBy: userId
      });

      console.log(`✅ 가상공간 요소 추가: ${elementData.type} (${spaceId})`);
      return element;
      
    } catch (error) {
      console.error('❌ 가상공간 요소 추가 실패:', error);
      throw error;
    }
  }

  // 가상공간 요소 수정
  async updateSpaceElement(spaceId, elementId, updateData, userId) {
    try {
      const spaceInfo = this.infoManager.getSpaceInfo(spaceId);
      const modeInfo = this.modeManager.getSpaceMode(spaceId);
      
      if (!spaceInfo || !modeInfo) {
        throw new Error('가상공간을 찾을 수 없습니다.');
      }

      // 편집 권한 확인
      const permissions = this.infoManager.getUserPermissions(userId, spaceId);
      if (!permissions.includes('write')) {
        throw new Error('가상공간 편집 권한이 없습니다.');
      }

      // 편집 모드에서만 요소 수정 가능
      if (modeInfo.currentMode !== this.modeManager.modes.EDIT) {
        throw new Error('편집 모드에서만 요소를 수정할 수 있습니다.');
      }

      // 요소 수정
      const element = this.infoManager.updateSpaceElement(spaceId, elementId, updateData);

      console.log(`✅ 가상공간 요소 수정: ${elementId} (${spaceId})`);
      return element;
      
    } catch (error) {
      console.error('❌ 가상공간 요소 수정 실패:', error);
      throw error;
    }
  }

  // 가상공간 요소 삭제
  async removeSpaceElement(spaceId, elementId, userId) {
    try {
      const spaceInfo = this.infoManager.getSpaceInfo(spaceId);
      const modeInfo = this.modeManager.getSpaceMode(spaceId);
      
      if (!spaceInfo || !modeInfo) {
        throw new Error('가상공간을 찾을 수 없습니다.');
      }

      // 편집 권한 확인
      const permissions = this.infoManager.getUserPermissions(userId, spaceId);
      if (!permissions.includes('write')) {
        throw new Error('가상공간 편집 권한이 없습니다.');
      }

      // 편집 모드에서만 요소 삭제 가능
      if (modeInfo.currentMode !== this.modeManager.modes.EDIT) {
        throw new Error('편집 모드에서만 요소를 삭제할 수 있습니다.');
      }

      // 요소 삭제
      const result = this.infoManager.removeSpaceElement(spaceId, elementId);

      console.log(`✅ 가상공간 요소 삭제: ${elementId} (${spaceId})`);
      return result;
      
    } catch (error) {
      console.error('❌ 가상공간 요소 삭제 실패:', error);
      throw error;
    }
  }

  // 가상공간 삭제
  async deleteVirtualSpace(spaceId, userId) {
    try {
      const spaceInfo = this.infoManager.getSpaceInfo(spaceId);
      if (!spaceInfo) {
        throw new Error('가상공간을 찾을 수 없습니다.');
      }

      // 삭제 권한 확인 (소유자만 삭제 가능)
      if (spaceInfo.ownerId !== userId) {
        throw new Error('가상공간 삭제 권한이 없습니다.');
      }

      // 모든 사용자 퇴장
      const modeInfo = this.modeManager.getSpaceMode(spaceId);
      if (modeInfo) {
        const usersToRemove = Array.from(modeInfo.users);
        usersToRemove.forEach(user => {
          this.modeManager.removeUserFromMode(user.userId, spaceId);
        });
      }

      // 가상공간 정보 삭제
      this.infoManager.removeSpace(spaceId);
      
      // 가상공간 모드 삭제
      this.modeManager.removeSpace(spaceId);

      console.log(`🗑️ 가상공간 삭제: ${spaceInfo.spaceName} (${spaceId})`);
      return true;
      
    } catch (error) {
      console.error('❌ 가상공간 삭제 실패:', error);
      throw error;
    }
  }

  // 가상공간 정보 가져오기
  getSpaceInfo(spaceId) {
    return this.infoManager.getSpaceInfo(spaceId);
  }

  getSpaceMode(spaceId) {
    return this.modeManager.getSpaceMode(spaceId);
  }

  getSpaceSettings(spaceId) {
    return this.infoManager.getSpaceSettings(spaceId);
  }

  getSpaceAccess(spaceId) {
    return this.infoManager.getSpaceAccess(spaceId);
  }

  getSpaceElements(spaceId) {
    return this.infoManager.getSpaceElements(spaceId);
  }

  getSpaceAnalytics(spaceId) {
    return this.infoManager.getSpaceAnalytics(spaceId);
  }

  getSpaceBackups(spaceId) {
    return this.infoManager.getSpaceBackups(spaceId);
  }

  // 사용자 관련 정보 가져오기
  getUserMode(userId) {
    return this.modeManager.getUserMode(userId);
  }

  getUserSpaces(userId) {
    return this.modeManager.getUserSpaces(userId);
  }

  getSpaceUsers(spaceId) {
    return this.modeManager.getSpaceUsers(spaceId);
  }

  // 권한 확인
  checkUserAccess(userId, spaceId, requiredPermission = 'read') {
    return this.infoManager.checkUserAccess(userId, spaceId, requiredPermission);
  }

  getUserPermissions(userId, spaceId) {
    return this.infoManager.getUserPermissions(userId, spaceId);
  }

  checkPermission(userId, spaceId, permission) {
    return this.modeManager.checkPermission(userId, spaceId, permission);
  }

  // 검색 및 필터링
  getAllSpaces() {
    return this.infoManager.getAllSpaces();
  }

  getPublicSpaces() {
    return this.infoManager.getPublicSpaces();
  }

  getSpacesByOwner(ownerId) {
    return this.infoManager.getSpacesByOwner(ownerId);
  }

  getSpacesByCategory(category) {
    return this.infoManager.getSpacesByCategory(category);
  }

  getSpacesInMode(mode) {
    return this.modeManager.getSpacesInMode(mode);
  }

  searchSpaces(query, filters = {}) {
    return this.infoManager.searchSpaces(query, filters);
  }

  // 통계 업데이트
  updateStatistics() {
    const modeStats = this.modeManager.getModeStatistics();
    const infoStats = this.infoManager.getStatistics();
    
    this.spaceStatistics = {
      totalSpaces: infoStats.totalSpaces,
      spacesInCreation: modeStats.spacesInCreation,
      spacesInEdit: modeStats.spacesInEdit,
      spacesInUse: modeStats.spacesInUse,
      publicSpaces: infoStats.publicSpaces,
      privateSpaces: infoStats.privateSpaces,
      totalElements: infoStats.totalElements,
      totalBackups: infoStats.totalBackups
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
    return { ...this.spaceStatistics };
  }

  // 사용자 제거
  removeUser(userId) {
    this.modeManager.removeUser(userId);
  }

  // 모든 데이터 정리
  clear() {
    this.modeManager.clear();
    this.infoManager.clear();
    this.spaceStatistics = {
      totalSpaces: 0,
      spacesInCreation: 0,
      spacesInEdit: 0,
      spacesInUse: 0,
      publicSpaces: 0,
      privateSpaces: 0,
      totalElements: 0,
      totalBackups: 0
    };
    console.log('🧹 통합 가상공간 관리자 데이터 정리 완료');
  }

  // 디버그 정보 가져오기
  getDebugInfo() {
    return {
      modeManager: this.modeManager.getDebugInfo(),
      infoManager: this.infoManager.getDebugInfo(),
      statistics: this.getStatistics()
    };
  }
}

module.exports = VirtualSpaceManager;





