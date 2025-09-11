import { useState, useEffect, useRef } from 'react';
import PositionManager from '../utils/positionManager';

export const usePositionTracking = (apiBaseUrl, currentMapId) => {
  const [positionManager] = useState(() => new PositionManager(apiBaseUrl));
  const [isMoving, setIsMoving] = useState(false);
  const [currentAreaInfo, setCurrentAreaInfo] = useState(null);
  const [movementStats, setMovementStats] = useState({
    totalMoves: 0,
    totalDistance: 0,
    averageSpeed: 0
  });

  const lastPositionRef = useRef(null);
  const moveStartTimeRef = useRef(null);

  useEffect(() => {
    // 이동 완료 핸들러 설정
    positionManager.setMovementCompleteHandler((finalPosition, areaInfo) => {
      setIsMoving(false);
      setCurrentAreaInfo(areaInfo);
      
      // 통계 업데이트
      if (lastPositionRef.current && moveStartTimeRef.current) {
        const distance = calculateDistance(lastPositionRef.current, finalPosition);
        const duration = Date.now() - moveStartTimeRef.current;
        const speed = duration > 0 ? distance / duration : 0;

        setMovementStats(prev => ({
          totalMoves: prev.totalMoves + 1,
          totalDistance: prev.totalDistance + distance,
          averageSpeed: (prev.averageSpeed + speed) / 2
        }));
      }

      console.log('🎯 이동 완료:', { finalPosition, areaInfo });
    });

    return () => {
      // 정리
      positionManager.close?.();
    };
  }, [positionManager]);

  // 이동 시작
  const startMovement = (position, direction) => {
    if (!isMoving && currentMapId) {
      setIsMoving(true);
      moveStartTimeRef.current = Date.now();
      lastPositionRef.current = position;
      
      positionManager.startMovement(position, currentMapId, direction);
      console.log('🏃 이동 시작:', { position, direction, mapId: currentMapId });
    }
  };

  // 실시간 위치 업데이트
  const updatePosition = (position, direction) => {
    if (isMoving && currentMapId) {
      positionManager.updatePosition(position, currentMapId, direction);
      
      // 로컬 상태에서는 즉시 반영 (부드러운 UX)
      lastPositionRef.current = position;
    }
  };

  // 이동 완료
  const endMovement = async (finalPosition, finalDirection) => {
    if (isMoving && currentMapId) {
      console.log('🛑 이동 종료:', { finalPosition, finalDirection, mapId: currentMapId });
      
      const areaInfo = await positionManager.endMovement(
        finalPosition, 
        currentMapId, 
        finalDirection
      );
      
      // 상태는 핸들러에서 업데이트됨
      return areaInfo;
    }
    return null;
  };

  // 영역 정보 요청
  const requestAreaInfo = async (position) => {
    if (currentMapId) {
      return await positionManager.requestAreaInfo(position, currentMapId);
    }
    return null;
  };

  // 현재 상태 반환
  const getStatus = () => {
    return {
      isMoving,
      currentAreaInfo,
      movementStats,
      positionManagerStats: positionManager.getStats(),
      lastPosition: lastPositionRef.current
    };
  };

  return {
    // 상태
    isMoving,
    currentAreaInfo,
    movementStats,
    
    // 액션
    startMovement,
    updatePosition,
    endMovement,
    requestAreaInfo,
    getStatus,
    
    // 내부 매니저 (필요시 직접 접근)
    positionManager
  };
};

// 유틸리티 함수
function calculateDistance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export default usePositionTracking;