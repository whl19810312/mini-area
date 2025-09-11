import { useState, useEffect, useCallback } from 'react';

const useAreaDetection = (currentMap, characterPosition, socket, user) => {
  const [currentArea, setCurrentArea] = useState({
    type: 'public', // 'public', 'private' (로비는 존재하지 않음)
    id: 'public_unknown', // 기본값도 null이 아닌 값으로 설정
    name: '퍼블릭 영역',
    status: 'online'
  });

  // 영역 감지 함수
  const detectCurrentArea = useCallback((position, map) => {
    console.log('🌐 [영역감지] 시작:', {
      position: position,
      mapId: map?.id,
      mapName: map?.name,
      privateAreasCount: map?.privateAreas?.length || 0,
      privateAreas: map?.privateAreas
    });

    if (!position || !map) {
      console.log('❌ [영역감지] 위치나 맵 정보 없음');
      // 위치나 맵 정보가 없으면 퍼블릭 영역으로 기본 설정
      return { 
        type: 'public', 
        id: `public_${map?.id || 'unknown'}`, // 퍼블릭 영역 prefix 추가
        name: map?.name || '퍼블릭 영역' 
      };
    }

    // 프라이빗 영역 감지
    if (map.privateAreas && Array.isArray(map.privateAreas)) {
      console.log('🔍 [영역감지] 프라이빗 영역들 검사 시작:', map.privateAreas.length, '개');
      
      for (let i = 0; i < map.privateAreas.length; i++) {
        const area = map.privateAreas[i];
        console.log(`🔍 [영역감지] 프라이빗 영역 ${i + 1}/${map.privateAreas.length} 검사:`, area);
        
        if (isInsideArea(position, area)) {
          const result = {
            type: 'private',
            id: area.id || `private_${area.x}_${area.y}`,
            name: area.name || `프라이빗 영역 ${area.id}`
          };
          console.log('✅ [영역감지] 프라이빗 영역에 속함:', result);
          return result;
        }
      }
      console.log('❌ [영역감지] 모든 프라이빗 영역 검사 완료 - 해당 없음');
    } else {
      console.log('❌ [영역감지] 프라이빗 영역 데이터 없음:', {
        hasPrivateAreas: !!map.privateAreas,
        isArray: Array.isArray(map.privateAreas)
      });
    }

    // 프라이빗 영역에 속하지 않으면 퍼블릭 영역
    const result = {
      type: 'public',
      id: `public_${map.id}`, // 퍼블릭 영역도 고유 ID 할당
      name: map.name || '퍼블릭 영역'
    };
    console.log('✅ [영역감지] 퍼블릭 영역으로 분류:', result);
    return result;
  }, []);

  // 영역 안에 있는지 확인하는 함수 (시작점/끝점 방식 지원)
  const isInsideArea = (position, area) => {
    console.log('🔍 [좌표검사] 위치 검사:', {
      position: position,
      area: area,
      areaId: area?.id,
      areaName: area?.name
    });

    // 이미 검증된 영역인지 확인
    if (area?.isValid === false) {
      console.log('❌ [좌표검사] 유효하지 않은 영역:', area.error);
      return false;
    }

    // 영역 좌표 추출 - position(시작점) + size(크기) = startPoint + endPoint
    let startX, startY, endX, endY, areaWidth, areaHeight;

    // 1. 이미 정규화된 좌표가 있는 경우 (MetaverseScene에서 처리된 경우)
    if (area.startX !== undefined && area.startY !== undefined && 
        area.endX !== undefined && area.endY !== undefined) {
      startX = area.startX;
      startY = area.startY;
      endX = area.endX;
      endY = area.endY;
      areaWidth = area.width;
      areaHeight = area.height;
    }
    // 2. position(시작점)과 size(크기)로 끝점 계산
    else if (area.position && area.size) {
      startX = area.position.x;
      startY = area.position.y;
      areaWidth = area.size.width;
      areaHeight = area.size.height;
      endX = startX + areaWidth;
      endY = startY + areaHeight;
    }
    // 3. 직접 x,y,width,height 방식
    else if (area.x !== undefined && area.y !== undefined && area.width && area.height) {
      startX = area.x;
      startY = area.y;
      areaWidth = area.width;
      areaHeight = area.height;
      endX = startX + areaWidth;
      endY = startY + areaHeight;
    }
    else {
      console.log('❌ [좌표검사] 프라이빗 영역 좌표 데이터 부족:', {
        hasArea: !!area,
        availableFields: Object.keys(area || {}),
        expectedFormat: 'position: {x, y} + size: {width, height}',
        note: '모든 영역이 퍼블릭 영역으로 처리됩니다.'
      });
      return false;
    }

    // 유효한 좌표인지 확인
    if (startX === undefined || startY === undefined || endX === undefined || endY === undefined || 
        !areaWidth || !areaHeight || areaWidth <= 0 || areaHeight <= 0) {
      console.log('❌ [좌표검사] 유효하지 않은 좌표값:', {
        startX, startY, endX, endY,
        width: areaWidth,
        height: areaHeight
      });
      return false;
    }

    // 좌표 검사 실행 (시작점~끝점 범위 내 포함 여부)
    const isInside = (
      position.x >= startX &&
      position.x <= endX &&
      position.y >= startY &&
      position.y <= endY
    );

    console.log('📍 [좌표검사] 결과:', {
      position: `(${position.x}, ${position.y})`,
      areaBounds: `시작점(${startX}, ${startY}) ~ 끝점(${endX}, ${endY})`,
      areaSize: `${areaWidth} x ${areaHeight}`,
      areaId: area.id,
      areaName: area.name,
      isInside: isInside,
      checks: {
        xMin: position.x >= startX,
        xMax: position.x <= endX,
        yMin: position.y >= startY,
        yMax: position.y <= endY
      }
    });

    return isInside;
  };

  // 맵 안에 있는지 확인하는 함수
  const isInsideMap = (position, map) => {
    if (!map || !map.size) {
      return false;
    }

    return (
      position.x >= 0 &&
      position.x <= map.size.width &&
      position.y >= 0 &&
      position.y <= map.size.height
    );
  };

  // 맵 변경 시 즉시 영역 감지 (입실 시 자동 영역 검사)
  useEffect(() => {
    if (!currentMap || !characterPosition) return;

    // 입실 시 즉시 영역 감지
    const newArea = detectCurrentArea(characterPosition, currentMap);
    const updatedArea = {
      ...newArea,
      status: determineStatus(newArea.type)
    };

    // 영역이 변경된 경우 업데이트 (항상 퍼블릭 또는 프라이빗)
    if (newArea.type !== currentArea.type ||
        newArea.id !== currentArea.id ||
        newArea.name !== currentArea.name) {
      
      setCurrentArea(updatedArea);

      // 서버에 영역 변경 알림
      if (socket && user) {
        socket.emit('area-changed', {
          userId: user.id,
          username: user.username,
          areaType: updatedArea.type,
          areaId: updatedArea.id,
          areaName: updatedArea.name,
          status: updatedArea.status,
          position: characterPosition,
          mapId: currentMap.id,
          timestamp: Date.now()
        });
      }

      console.log('🌍 [입실] 즉시 영역 감지:', {
        from: currentArea,
        to: updatedArea,
        position: characterPosition,
        mapId: currentMap.id
      });
    }
  }, [currentMap?.id, characterPosition?.x, characterPosition?.y]);

  // 영역 변화 감지 및 업데이트 (위치 이동 시)
  useEffect(() => {
    console.log('🔄 [useEffect] 위치 변화 감지 트리거:', {
      hasCharacterPosition: !!characterPosition,
      hasCurrentMap: !!currentMap,
      characterPosition,
      currentMapId: currentMap?.id
    });

    if (!characterPosition || !currentMap) {
      console.log('❌ [useEffect] 위치나 맵 정보 없어서 종료');
      return;
    }

    console.log('🔄 [useEffect] 영역 감지 시작:', {
      currentPosition: characterPosition,
      currentAreaBefore: currentArea
    });

    const newArea = detectCurrentArea(characterPosition, currentMap);
    
    console.log('🔄 [useEffect] 감지된 새 영역:', {
      newArea,
      currentArea,
      willChange: newArea.type !== currentArea.type ||
                 newArea.id !== currentArea.id ||
                 newArea.name !== currentArea.name
    });
    
    // 영역이 변경된 경우에만 업데이트
    if (
      newArea.type !== currentArea.type ||
      newArea.id !== currentArea.id ||
      newArea.name !== currentArea.name
    ) {
      const updatedArea = {
        ...newArea,
        status: determineStatus(newArea.type)
      };

      console.log('✅ [useEffect] 영역 업데이트 실행:', {
        from: currentArea,
        to: updatedArea
      });

      setCurrentArea(updatedArea);

      // 서버에 영역 변경 알림
      if (socket && user) {
        socket.emit('area-changed', {
          userId: user.id,
          username: user.username,
          areaType: updatedArea.type,
          areaId: updatedArea.id,
          areaName: updatedArea.name,
          status: updatedArea.status,
          position: characterPosition,
          mapId: currentMap.id,
          timestamp: Date.now()
        });
      }

      console.log('🌍 [이동] 영역 변경 감지:', {
        from: currentArea,
        to: updatedArea,
        position: characterPosition
      });
    } else {
      console.log('❌ [useEffect] 영역 변화 없음 - 업데이트 스킵');
    }
  }, [characterPosition, currentMap, currentArea, detectCurrentArea, socket, user]);

  // 상태 결정 함수
  const determineStatus = (areaType) => {
    switch (areaType) {
      case 'private':
        return 'in-private-area';
      case 'public':
      default:
        return 'in-map';
    }
  };

  // 수동으로 영역 설정하는 함수
  const setArea = useCallback((areaType, areaId = null, areaName = null) => {
    const updatedArea = {
      type: areaType,
      id: areaId,
      name: areaName,
      status: determineStatus(areaType)
    };

    setCurrentArea(updatedArea);

    // 서버에 영역 변경 알림
    if (socket && user) {
      socket.emit('area-changed', {
        userId: user.id,
        username: user.username,
        areaType: updatedArea.type,
        areaId: updatedArea.id,
        areaName: updatedArea.name,
        status: updatedArea.status,
        position: characterPosition,
        mapId: currentMap?.id,
        timestamp: Date.now()
      });
    }

    console.log('🌍 수동 영역 설정:', updatedArea);
  }, [socket, user, characterPosition, currentMap]);

  // 영역 정보 조회 함수
  const getAreaInfo = useCallback(() => {
    return {
      ...currentArea,
      isPrivate: currentArea.type === 'private',
      isPublic: currentArea.type === 'public',
      isLobby: currentArea.type === 'lobby',
      displayName: currentArea.name || getDefaultAreaName(currentArea.type)
    };
  }, [currentArea]);

  // 기본 영역 이름 반환
  const getDefaultAreaName = (type) => {
    switch (type) {
      case 'private':
        return '프라이빗 영역';
      case 'public':
      default:
        return '퍼블릭 영역';
    }
  };

  return {
    currentArea,
    setArea,
    getAreaInfo,
    isPrivate: currentArea.type === 'private',
    isPublic: currentArea.type === 'public'
  };
};

export default useAreaDetection;