class VideoAutoStartManager {
  constructor() {
    this.autoStartEnabled = true;
    this.autoStartSettings = {
      privateAreas: true,    // 프라이빗 영역 자동 시작
      publicAreas: false,    // 퍼블릭 영역 자동 시작
      lobby: false,          // 대기실 자동 시작
      requirePermission: true, // 권한 확인 필요
      delay: 1000            // 시작 지연 시간 (ms)
    };
    
    this.permissionCache = new Map(); // userId -> permission status
    this.startAttempts = new Map();   // userId -> attempt count
    this.maxAttempts = 3;
  }

  // 자동 시작 설정 업데이트
  updateSettings(settings) {
    this.autoStartSettings = { ...this.autoStartSettings, ...settings };
    console.log('📹 화상통신 자동 시작 설정 업데이트:', this.autoStartSettings);
  }

  // 자동 시작 활성화/비활성화
  setAutoStartEnabled(enabled) {
    this.autoStartEnabled = enabled;
    console.log(`📹 화상통신 자동 시작 ${enabled ? '활성화' : '비활성화'}`);
  }

  // 영역 진입 시 자동 시작 체크
  async checkAutoStartOnAreaEnter(areaType, areaId, videoCall, user) {
    if (!this.autoStartEnabled) {
      console.log('📹 자동 시작이 비활성화되어 있습니다.');
      return false;
    }

    // 영역별 자동 시작 설정 확인
    if (!this.shouldAutoStartInArea(areaType)) {
      console.log(`📹 ${areaType} 영역에서는 자동 시작이 비활성화되어 있습니다.`);
      return false;
    }

    console.log(`📹 ${areaType} 영역 진입 - 화상통신 자동 시작 체크`);

    // 권한 확인
    if (this.autoStartSettings.requirePermission) {
      const hasPermission = await this.checkUserPermission(user?.id, videoCall);
      if (!hasPermission) {
        console.log('📹 권한이 없어 자동 시작을 건너뜁니다.');
        return false;
      }
    }

    // 자동 시작 실행
    return await this.executeAutoStart(videoCall, areaType, areaId);
  }

  // 영역별 자동 시작 여부 확인
  shouldAutoStartInArea(areaType) {
    switch (areaType) {
      case 'private':
        return this.autoStartSettings.privateAreas;
      case 'public':
        return this.autoStartSettings.publicAreas;
      case 'lobby':
        return this.autoStartSettings.lobby;
      default:
        return false;
    }
  }

  // 사용자 권한 확인
  async checkUserPermission(userId, videoCall) {
    if (!userId) return false;

    // 캐시된 권한 확인
    if (this.permissionCache.has(userId)) {
      return this.permissionCache.get(userId);
    }

    try {
      const permissions = await videoCall.checkPermissions();
      const hasPermission = permissions.video && permissions.audio;
      
      // 권한 상태 캐시
      this.permissionCache.set(userId, hasPermission);
      
      console.log(`📹 사용자 ${userId} 권한 상태:`, permissions);
      return hasPermission;
    } catch (error) {
      console.error('📹 권한 확인 실패:', error);
      return false;
    }
  }

  // 자동 시작 실행
  async executeAutoStart(videoCall, areaType, areaId) {
    const userId = 'current'; // 현재 사용자
    const attemptKey = `${userId}-${areaType}-${areaId}`;
    
    // 시도 횟수 확인
    const attempts = this.startAttempts.get(attemptKey) || 0;
    if (attempts >= this.maxAttempts) {
      console.log(`📹 최대 시도 횟수 초과 (${attempts}/${this.maxAttempts})`);
      return false;
    }

    this.startAttempts.set(attemptKey, attempts + 1);

    try {
      console.log(`📹 화상통신 자동 시작 시도 ${attempts + 1}/${this.maxAttempts}`);
      
      // 지연 없이 즉시 시작
      
      // 이미 활성화되어 있는지 확인
      if (videoCall.isVideoCallActive) {
        console.log('📹 화상통신이 이미 활성화되어 있습니다.');
        return true;
      }

      // 카메라 시작
      await videoCall.startCamera();
      
      console.log(`✅ ${areaType} 영역에서 화상통신 자동 시작 성공`);
      
      // 성공 시 시도 횟수 초기화
      this.startAttempts.delete(attemptKey);
      
      return true;
    } catch (error) {
      console.error(`❌ 화상통신 자동 시작 실패 (시도 ${attempts + 1}/${this.maxAttempts}):`, error);
      
      // 재시도 없이 즉시 실패 처리
      
      return false;
    }
  }

  // 영역 퇴장 시 정리
  onAreaLeave(areaType, areaId) {
    const userId = 'current';
    const attemptKey = `${userId}-${areaType}-${areaId}`;
    
    // 시도 횟수 초기화
    this.startAttempts.delete(attemptKey);
    
    console.log(`📹 ${areaType} 영역 퇴장 - 자동 시작 기록 정리`);
  }

  // 권한 상태 업데이트
  updatePermissionStatus(userId, hasPermission) {
    this.permissionCache.set(userId, hasPermission);
    console.log(`📹 사용자 ${userId} 권한 상태 업데이트: ${hasPermission}`);
  }

  // 권한 캐시 정리
  clearPermissionCache() {
    this.permissionCache.clear();
    console.log('📹 권한 캐시 정리 완료');
  }

  // 시도 기록 정리
  clearAttemptHistory() {
    this.startAttempts.clear();
    console.log('📹 시도 기록 정리 완료');
  }

  // 모든 캐시 정리
  clearAllCache() {
    this.clearPermissionCache();
    this.clearAttemptHistory();
  }

  // 현재 설정 가져오기
  getSettings() {
    return {
      autoStartEnabled: this.autoStartEnabled,
      settings: { ...this.autoStartSettings }
    };
  }

  // 통계 정보 가져오기
  getStats() {
    return {
      permissionCacheSize: this.permissionCache.size,
      attemptHistorySize: this.startAttempts.size,
      settings: this.getSettings()
    };
  }

  // 디버그 정보 출력
  debug() {
    console.log('📹 VideoAutoStartManager 디버그 정보:');
    console.log('- 설정:', this.getSettings());
    console.log('- 통계:', this.getStats());
    console.log('- 권한 캐시:', Array.from(this.permissionCache.entries()));
    console.log('- 시도 기록:', Array.from(this.startAttempts.entries()));
  }
}

export default VideoAutoStartManager;



