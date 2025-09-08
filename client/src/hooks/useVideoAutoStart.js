import { useState, useEffect, useRef, useCallback } from 'react';
import VideoAutoStartManager from '../utils/videoAutoStartManager';

export const useVideoAutoStart = (videoCall, user) => {
  const [autoStartManager] = useState(() => new VideoAutoStartManager());
  const [isAutoStarting, setIsAutoStarting] = useState(false);
  const [autoStartSettings, setAutoStartSettings] = useState(autoStartManager.getSettings());
  const [lastAutoStartResult, setLastAutoStartResult] = useState(null);
  
  const managerRef = useRef(autoStartManager);

  // 설정 변경 시 매니저 업데이트
  useEffect(() => {
    managerRef.current.updateSettings(autoStartSettings.settings);
  }, [autoStartSettings]);

  // 자동 시작 활성화/비활성화
  const setAutoStartEnabled = useCallback((enabled) => {
    managerRef.current.setAutoStartEnabled(enabled);
    setAutoStartSettings(prev => ({
      ...prev,
      autoStartEnabled: enabled
    }));
  }, []);

  // 자동 시작 설정 업데이트
  const updateAutoStartSettings = useCallback((newSettings) => {
    setAutoStartSettings(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  // 영역 진입 시 자동 시작 체크
  const checkAutoStartOnAreaEnter = useCallback(async (areaType, areaId) => {
    if (!videoCall || !user) {
      console.log('📹 화상통신 또는 사용자 정보가 없어 자동 시작을 건너뜁니다.');
      return false;
    }

    setIsAutoStarting(true);
    setLastAutoStartResult(null);

    try {
      const result = await managerRef.current.checkAutoStartOnAreaEnter(
        areaType, 
        areaId, 
        videoCall, 
        user
      );
      
      setLastAutoStartResult({
        success: result,
        areaType,
        areaId,
        timestamp: new Date()
      });

      return result;
    } catch (error) {
      console.error('📹 자동 시작 체크 실패:', error);
      setLastAutoStartResult({
        success: false,
        error: error.message,
        areaType,
        areaId,
        timestamp: new Date()
      });
      return false;
    } finally {
      setIsAutoStarting(false);
    }
  }, [videoCall, user]);

  // 영역 퇴장 시 정리
  const onAreaLeave = useCallback((areaType, areaId) => {
    managerRef.current.onAreaLeave(areaType, areaId);
  }, []);

  // 권한 상태 업데이트
  const updatePermissionStatus = useCallback((hasPermission) => {
    if (user?.id) {
      managerRef.current.updatePermissionStatus(user.id, hasPermission);
    }
  }, [user?.id]);

  // 권한 확인 후 자동 시작
  const checkPermissionAndAutoStart = useCallback(async (areaType, areaId) => {
    if (!videoCall) return false;

    try {
      const permissions = await videoCall.checkPermissions();
      const hasPermission = permissions.video && permissions.audio;
      
      updatePermissionStatus(hasPermission);
      
      if (hasPermission) {
        return await checkAutoStartOnAreaEnter(areaType, areaId);
      } else {
        console.log('📹 카메라/마이크 권한이 없어 자동 시작을 건너뜁니다.');
        return false;
      }
    } catch (error) {
      console.error('📹 권한 확인 실패:', error);
      return false;
    }
  }, [videoCall, checkAutoStartOnAreaEnter, updatePermissionStatus]);

  // 수동 자동 시작 트리거
  const triggerAutoStart = useCallback(async (areaType, areaId) => {
    console.log(`📹 수동 자동 시작 트리거: ${areaType} 영역 ${areaId}`);
    return await checkAutoStartOnAreaEnter(areaType, areaId);
  }, [checkAutoStartOnAreaEnter]);

  // 캐시 정리
  const clearCache = useCallback(() => {
    managerRef.current.clearAllCache();
  }, []);

  // 통계 정보 가져오기
  const getStats = useCallback(() => {
    return managerRef.current.getStats();
  }, []);

  // 디버그 정보 출력
  const debug = useCallback(() => {
    managerRef.current.debug();
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  // 권한 변경 감지
  useEffect(() => {
    if (videoCall && user?.id) {
      const checkPermission = async () => {
        try {
          const permissions = await videoCall.checkPermissions();
          const hasPermission = permissions.video && permissions.audio;
          updatePermissionStatus(hasPermission);
        } catch (error) {
          console.error('📹 권한 확인 실패:', error);
        }
      };

      checkPermission();
    }
  }, [videoCall, user?.id, updatePermissionStatus]);

  return {
    // 상태
    isAutoStarting,
    autoStartSettings,
    lastAutoStartResult,
    
    // 메서드
    setAutoStartEnabled,
    updateAutoStartSettings,
    checkAutoStartOnAreaEnter,
    checkPermissionAndAutoStart,
    triggerAutoStart,
    onAreaLeave,
    updatePermissionStatus,
    clearCache,
    getStats,
    debug
  };
};





