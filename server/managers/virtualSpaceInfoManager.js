const MapModel = require('../models/Map');

class VirtualSpaceInfoManager {
  constructor() {
    this.spaceInfo = new Map(); // spaceId -> spaceInfo
    this.spaceElements = new Map(); // spaceId -> elements[]
    this.spaceSettings = new Map(); // spaceId -> settings
    this.spaceAccess = new Map(); // spaceId -> accessControl
    this.spaceAnalytics = new Map(); // spaceId -> analytics
    this.spaceBackups = new Map(); // spaceId -> backups[]
    this.spaceStatistics = {
      totalSpaces: 0,
      publicSpaces: 0,
      privateSpaces: 0,
      activeSpaces: 0,
      totalElements: 0,
      totalBackups: 0
    };
    
    // 통계 업데이트 타이머
    this.startStatisticsUpdate();
  }

  // 가상공간 정보 초기화
  async initializeSpaceInfo(spaceId, spaceData) {
    try {
      const spaceInfo = {
        spaceId,
        spaceName: spaceData.spaceName,
        description: spaceData.description || '',
        ownerId: spaceData.ownerId,
        category: spaceData.category || 'general',
        tags: spaceData.tags || [],
        isPublic: spaceData.isPublic || false,
        isActive: true,
        createdAt: new Date(),
        lastModified: new Date(),
        version: 1,
        thumbnail: spaceData.thumbnail || null,
        metadata: {
          width: spaceData.width || 1000,
          height: spaceData.height || 1000,
          backgroundColor: spaceData.backgroundColor || '#ffffff',
          gridSize: spaceData.gridSize || 32,
          snapToGrid: spaceData.snapToGrid || true
        }
      };

      this.spaceInfo.set(spaceId, spaceInfo);
      
      // 기본 설정 초기화
      this.initializeSpaceSettings(spaceId, spaceData);
      
      // 접근 제어 초기화
      this.initializeSpaceAccess(spaceId, spaceData);
      
      // 분석 데이터 초기화
      this.initializeSpaceAnalytics(spaceId);
      
      // 백업 초기화
      this.initializeSpaceBackups(spaceId);

      console.log(`✅ 가상공간 정보 초기화: ${spaceData.spaceName} (${spaceId})`);
      return spaceInfo;
      
    } catch (error) {
      console.error('❌ 가상공간 정보 초기화 실패:', error);
      throw error;
    }
  }

  // 가상공간 설정 초기화
  initializeSpaceSettings(spaceId, spaceData) {
    const settings = {
      spaceId,
      general: {
        allowGuests: spaceData.allowGuests || false,
        maxUsers: spaceData.maxUsers || 50,
        autoSave: spaceData.autoSave || true,
        saveInterval: spaceData.saveInterval || 30000, // 30초
        backupEnabled: spaceData.backupEnabled || true,
        backupInterval: spaceData.backupInterval || 300000, // 5분
        versionControl: spaceData.versionControl || true
      },
      permissions: {
        allowEdit: spaceData.allowEdit || false,
        allowInvite: spaceData.allowInvite || true,
        allowShare: spaceData.allowShare || true,
        requireApproval: spaceData.requireApproval || false
      },
      features: {
        videoCall: spaceData.videoCall || true,
        chat: spaceData.chat || true,
        screenShare: spaceData.screenShare || true,
        recording: spaceData.recording || false,
        whiteboard: spaceData.whiteboard || true,
        fileSharing: spaceData.fileSharing || true
      },
      appearance: {
        theme: spaceData.theme || 'default',
        customCSS: spaceData.customCSS || '',
        logo: spaceData.logo || null,
        favicon: spaceData.favicon || null
      }
    };

    this.spaceSettings.set(spaceId, settings);
  }

  // 접근 제어 초기화
  initializeSpaceAccess(spaceId, spaceData) {
    const accessControl = {
      spaceId,
      accessType: spaceData.accessType || 'public', // 'public', 'private', 'invite-only'
      allowedUsers: new Set([spaceData.ownerId]),
      blockedUsers: new Set(),
      inviteCodes: new Set(),
      password: spaceData.password || null,
      whitelist: spaceData.whitelist || [],
      blacklist: spaceData.blacklist || [],
      permissions: {
        owner: ['read', 'write', 'delete', 'invite', 'manage'],
        admin: ['read', 'write', 'invite'],
        moderator: ['read', 'write'],
        user: ['read'],
        guest: ['read']
      }
    };

    this.spaceAccess.set(spaceId, accessControl);
  }

  // 분석 데이터 초기화
  initializeSpaceAnalytics(spaceId) {
    const analytics = {
      spaceId,
      visits: 0,
      uniqueVisitors: new Set(),
      totalTime: 0,
      averageSessionTime: 0,
      peakConcurrentUsers: 0,
      currentUsers: 0,
      elementsCreated: 0,
      elementsModified: 0,
      elementsDeleted: 0,
      videoCalls: 0,
      chatMessages: 0,
      fileUploads: 0,
      lastActivity: new Date(),
      dailyStats: new Map(),
      monthlyStats: new Map()
    };

    this.spaceAnalytics.set(spaceId, analytics);
  }

  // 백업 초기화
  initializeSpaceBackups(spaceId) {
    const backups = [];
    this.spaceBackups.set(spaceId, backups);
  }

  // 가상공간 정보 업데이트
  async updateSpaceInfo(spaceId, updateData) {
    try {
      const spaceInfo = this.spaceInfo.get(spaceId);
      if (!spaceInfo) {
        throw new Error('가상공간 정보를 찾을 수 없습니다.');
      }

      // 정보 업데이트
      Object.assign(spaceInfo, updateData);
      spaceInfo.lastModified = new Date();
      spaceInfo.version++;

      // 데이터베이스 업데이트
      await Map.update(updateData, {
        where: { id: spaceId }
      });

      this.spaceInfo.set(spaceId, spaceInfo);
      
      console.log(`✅ 가상공간 정보 업데이트: ${spaceInfo.spaceName} (${spaceId}) - 버전 ${spaceInfo.version}`);
      return spaceInfo;
      
    } catch (error) {
      console.error('❌ 가상공간 정보 업데이트 실패:', error);
      throw error;
    }
  }

  // 가상공간 설정 업데이트
  updateSpaceSettings(spaceId, settingsData) {
    const settings = this.spaceSettings.get(spaceId);
    if (!settings) {
      console.error(`❌ 가상공간 설정을 찾을 수 없음: ${spaceId}`);
      return false;
    }

    // 설정 병합
    Object.assign(settings, settingsData);
    this.spaceSettings.set(spaceId, settings);

    console.log(`✅ 가상공간 설정 업데이트: ${spaceId}`);
    return settings;
  }

  // 접근 제어 업데이트
  updateSpaceAccess(spaceId, accessData) {
    const accessControl = this.spaceAccess.get(spaceId);
    if (!accessControl) {
      console.error(`❌ 가상공간 접근 제어를 찾을 수 없음: ${spaceId}`);
      return false;
    }

    // 접근 제어 업데이트
    Object.assign(accessControl, accessData);
    this.spaceAccess.set(spaceId, accessControl);

    console.log(`✅ 가상공간 접근 제어 업데이트: ${spaceId}`);
    return accessControl;
  }

  // 사용자 접근 권한 확인
  checkUserAccess(userId, spaceId, requiredPermission = 'read') {
    const accessControl = this.spaceAccess.get(spaceId);
    if (!accessControl) return false;

    const spaceInfo = this.spaceInfo.get(spaceId);
    if (!spaceInfo) return false;

    // 소유자는 모든 권한
    if (spaceInfo.ownerId === userId) return true;

    // 차단된 사용자 확인
    if (accessControl.blockedUsers.has(userId)) return false;

    // 공개 공간이면 읽기 권한 허용
    if (accessControl.accessType === 'public' && requiredPermission === 'read') {
      return true;
    }

    // 허용된 사용자 확인
    if (accessControl.allowedUsers.has(userId)) {
      return true;
    }

    // 비밀번호 확인 (필요한 경우)
    if (accessControl.password && requiredPermission === 'read') {
      return true; // 실제로는 비밀번호 검증 필요
    }

    return false;
  }

  // 사용자 권한 확인
  getUserPermissions(userId, spaceId) {
    const accessControl = this.spaceAccess.get(spaceId);
    if (!accessControl) return [];

    const spaceInfo = this.spaceInfo.get(spaceId);
    if (!spaceInfo) return [];

    // 소유자
    if (spaceInfo.ownerId === userId) {
      return accessControl.permissions.owner;
    }

    // 관리자 (실제로는 데이터베이스에서 확인)
    if (accessControl.allowedUsers.has(userId)) {
      return accessControl.permissions.admin;
    }

    // 일반 사용자
    return accessControl.permissions.user;
  }

  // 가상공간 요소 관리
  addSpaceElement(spaceId, elementData) {
    const elements = this.spaceElements.get(spaceId) || [];
    
    const element = {
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      spaceId,
      type: elementData.type,
      position: elementData.position,
      size: elementData.size,
      properties: elementData.properties || {},
      createdAt: new Date(),
      createdBy: elementData.createdBy,
      version: 1
    };

    elements.push(element);
    this.spaceElements.set(spaceId, elements);

    // 분석 데이터 업데이트
    this.updateAnalytics(spaceId, 'elementsCreated', 1);

    console.log(`✅ 가상공간 요소 추가: ${elementData.type} (${spaceId})`);
    return element;
  }

  updateSpaceElement(spaceId, elementId, updateData) {
    const elements = this.spaceElements.get(spaceId);
    if (!elements) return false;

    const elementIndex = elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return false;

    const element = elements[elementIndex];
    Object.assign(element, updateData);
    element.lastModified = new Date();
    element.version++;

    elements[elementIndex] = element;
    this.spaceElements.set(spaceId, elements);

    // 분석 데이터 업데이트
    this.updateAnalytics(spaceId, 'elementsModified', 1);

    console.log(`✅ 가상공간 요소 업데이트: ${elementId} (${spaceId})`);
    return element;
  }

  removeSpaceElement(spaceId, elementId) {
    const elements = this.spaceElements.get(spaceId);
    if (!elements) return false;

    const elementIndex = elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return false;

    elements.splice(elementIndex, 1);
    this.spaceElements.set(spaceId, elements);

    // 분석 데이터 업데이트
    this.updateAnalytics(spaceId, 'elementsDeleted', 1);

    console.log(`✅ 가상공간 요소 제거: ${elementId} (${spaceId})`);
    return true;
  }

  // 분석 데이터 업데이트
  updateAnalytics(spaceId, metric, value = 1) {
    const analytics = this.spaceAnalytics.get(spaceId);
    if (!analytics) return;

    switch (metric) {
      case 'visit':
        analytics.visits += value;
        break;
      case 'uniqueVisitor':
        analytics.uniqueVisitors.add(value);
        break;
      case 'totalTime':
        analytics.totalTime += value;
        break;
      case 'currentUsers':
        analytics.currentUsers = value;
        if (value > analytics.peakConcurrentUsers) {
          analytics.peakConcurrentUsers = value;
        }
        break;
      case 'elementsCreated':
        analytics.elementsCreated += value;
        break;
      case 'elementsModified':
        analytics.elementsModified += value;
        break;
      case 'elementsDeleted':
        analytics.elementsDeleted += value;
        break;
      case 'videoCalls':
        analytics.videoCalls += value;
        break;
      case 'chatMessages':
        analytics.chatMessages += value;
        break;
      case 'fileUploads':
        analytics.fileUploads += value;
        break;
    }

    analytics.lastActivity = new Date();
    this.spaceAnalytics.set(spaceId, analytics);
  }

  // 백업 생성
  createBackup(spaceId, backupType = 'auto') {
    const spaceInfo = this.spaceInfo.get(spaceId);
    const elements = this.spaceElements.get(spaceId);
    const settings = this.spaceSettings.get(spaceId);

    if (!spaceInfo) return false;

    const backup = {
      id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      spaceId,
      type: backupType,
      timestamp: new Date(),
      version: spaceInfo.version,
      data: {
        spaceInfo: { ...spaceInfo },
        elements: elements ? [...elements] : [],
        settings: settings ? { ...settings } : null
      },
      size: JSON.stringify(elements).length,
      isRestorable: true
    };

    const backups = this.spaceBackups.get(spaceId) || [];
    backups.push(backup);
    this.spaceBackups.set(spaceId, backups);

    // 통계 업데이트
    this.spaceStatistics.totalBackups++;

    console.log(`💾 백업 생성: ${spaceInfo.spaceName} (${spaceId}) - ${backupType}`);
    return backup;
  }

  // 백업 복원
  restoreBackup(spaceId, backupId) {
    const backups = this.spaceBackups.get(spaceId);
    if (!backups) return false;

    const backup = backups.find(b => b.id === backupId);
    if (!backup || !backup.isRestorable) return false;

    try {
      // 공간 정보 복원
      this.spaceInfo.set(spaceId, backup.data.spaceInfo);
      
      // 요소 복원
      this.spaceElements.set(spaceId, backup.data.elements);
      
      // 설정 복원
      if (backup.data.settings) {
        this.spaceSettings.set(spaceId, backup.data.settings);
      }

      console.log(`🔄 백업 복원: ${backup.data.spaceInfo.spaceName} (${spaceId}) - ${backupId}`);
      return true;
      
    } catch (error) {
      console.error('❌ 백업 복원 실패:', error);
      return false;
    }
  }

  // 가상공간 정보 가져오기
  getSpaceInfo(spaceId) {
    return this.spaceInfo.get(spaceId);
  }

  getSpaceSettings(spaceId) {
    return this.spaceSettings.get(spaceId);
  }

  getSpaceAccess(spaceId) {
    return this.spaceAccess.get(spaceId);
  }

  getSpaceAnalytics(spaceId) {
    return this.spaceAnalytics.get(spaceId);
  }

  getSpaceElements(spaceId) {
    return this.spaceElements.get(spaceId) || [];
  }

  getSpaceBackups(spaceId) {
    return this.spaceBackups.get(spaceId) || [];
  }

  // 모든 가상공간 정보 가져오기
  getAllSpaces() {
    return Array.from(this.spaceInfo.values());
  }

  getPublicSpaces() {
    return Array.from(this.spaceInfo.values()).filter(space => space.isPublic);
  }

  getSpacesByOwner(ownerId) {
    return Array.from(this.spaceInfo.values()).filter(space => space.ownerId === ownerId);
  }

  getSpacesByCategory(category) {
    return Array.from(this.spaceInfo.values()).filter(space => space.category === category);
  }

  // 검색
  searchSpaces(query, filters = {}) {
    let results = Array.from(this.spaceInfo.values());

    // 텍스트 검색
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(space => 
        space.spaceName.toLowerCase().includes(searchTerm) ||
        space.description.toLowerCase().includes(searchTerm) ||
        space.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // 필터 적용
    if (filters.category) {
      results = results.filter(space => space.category === filters.category);
    }
    if (filters.isPublic !== undefined) {
      results = results.filter(space => space.isPublic === filters.isPublic);
    }
    if (filters.ownerId) {
      results = results.filter(space => space.ownerId === filters.ownerId);
    }

    return results;
  }

  // 통계 업데이트
  updateStatistics() {
    const stats = {
      totalSpaces: 0,
      publicSpaces: 0,
      privateSpaces: 0,
      activeSpaces: 0,
      totalElements: 0,
      totalBackups: 0
    };

    for (const spaceInfo of this.spaceInfo.values()) {
      stats.totalSpaces++;
      
      if (spaceInfo.isPublic) {
        stats.publicSpaces++;
      } else {
        stats.privateSpaces++;
      }
      
      if (spaceInfo.isActive) {
        stats.activeSpaces++;
      }
    }

    // 요소 수 계산
    for (const elements of this.spaceElements.values()) {
      stats.totalElements += elements.length;
    }

    // 백업 수 계산
    for (const backups of this.spaceBackups.values()) {
      stats.totalBackups += backups.length;
    }

    this.spaceStatistics = stats;
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

  // 가상공간 제거
  removeSpace(spaceId) {
    const spaceInfo = this.spaceInfo.get(spaceId);
    if (!spaceInfo) return false;

    // 모든 데이터 제거
    this.spaceInfo.delete(spaceId);
    this.spaceElements.delete(spaceId);
    this.spaceSettings.delete(spaceId);
    this.spaceAccess.delete(spaceId);
    this.spaceAnalytics.delete(spaceId);
    this.spaceBackups.delete(spaceId);

    console.log(`🗑️ 가상공간 제거: ${spaceInfo.spaceName} (${spaceId})`);
    return true;
  }

  // 모든 데이터 정리
  clear() {
    this.spaceInfo.clear();
    this.spaceElements.clear();
    this.spaceSettings.clear();
    this.spaceAccess.clear();
    this.spaceAnalytics.clear();
    this.spaceBackups.clear();
    this.spaceStatistics = {
      totalSpaces: 0,
      publicSpaces: 0,
      privateSpaces: 0,
      activeSpaces: 0,
      totalElements: 0,
      totalBackups: 0
    };
    console.log('🧹 가상공간 정보 관리자 데이터 정리 완료');
  }

  // 디버그 정보 가져오기
  getDebugInfo() {
    return {
      spaceInfo: this.spaceInfo.size,
      spaceElements: this.spaceElements.size,
      spaceSettings: this.spaceSettings.size,
      spaceAccess: this.spaceAccess.size,
      spaceAnalytics: this.spaceAnalytics.size,
      spaceBackups: this.spaceBackups.size,
      statistics: this.getStatistics()
    };
  }
}

module.exports = VirtualSpaceInfoManager;

