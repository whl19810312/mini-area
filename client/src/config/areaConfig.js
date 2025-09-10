// 영역 설정 - 명확한 좌표와 크기로 정의
export const areaDefinitions = {
  // 맵별 영역 정의 - 실제 캔버스 크기에 맞게 조정
  'lobby': {
    areas: [
      {
        id: 'meeting-room-1',
        name: '회의실 1',
        type: 'private',
        x: 50,
        y: 50,
        width: 250,
        height: 200,
        color: 'rgba(255, 0, 0, 0.3)',
        borderColor: 'rgba(255, 0, 0, 0.8)'
      },
      {
        id: 'meeting-room-2', 
        name: '회의실 2',
        type: 'private',
        x: 550,
        y: 50,
        width: 250,
        height: 200,
        color: 'rgba(0, 255, 0, 0.3)',
        borderColor: 'rgba(0, 255, 0, 0.8)'
      },
      {
        id: 'conference-room',
        name: '대회의실',
        type: 'private',
        x: 300,
        y: 350,
        width: 300,
        height: 250,
        color: 'rgba(0, 0, 255, 0.3)',
        borderColor: 'rgba(0, 0, 255, 0.8)'
      },
      {
        id: 'lounge',
        name: '라운지',
        type: 'private',
        x: 50,
        y: 350,
        width: 200,
        height: 250,
        color: 'rgba(128, 0, 128, 0.3)',
        borderColor: 'rgba(128, 0, 128, 0.8)'
      },
      {
        id: 'kitchen',
        name: '탕비실',
        type: 'private',
        x: 650,
        y: 350,
        width: 150,
        height: 250,
        color: 'rgba(255, 165, 0, 0.3)',
        borderColor: 'rgba(255, 165, 0, 0.8)'
      }
    ]
  },
  'office': {
    areas: [
      {
        id: 'office-room-1',
        name: '사무실 1',
        type: 'private',
        x: 50,
        y: 50,
        width: 300,
        height: 200,
        color: 'rgba(128, 0, 128, 0.3)',
        borderColor: 'rgba(128, 0, 128, 0.8)'
      },
      {
        id: 'conference-room',
        name: '대회의실',
        type: 'private',
        x: 450,
        y: 150,
        width: 250,
        height: 250,
        color: 'rgba(255, 165, 0, 0.3)',
        borderColor: 'rgba(255, 165, 0, 0.8)'
      }
    ]
  },
  'default': {
    areas: [
      {
        id: 'default-area',
        name: '기본 영역',
        type: 'public',
        x: 0,
        y: 0,
        width: 1000,
        height: 1000,
        color: 'transparent',
        borderColor: 'transparent'
      }
    ]
  }
};

// 영역 감지 헬퍼 함수
export const detectArea = (position, mapId) => {
  if (!position) return { id: 'public', name: '공용 영역', type: 'public' };
  
  // 맵 ID를 문자열로 변환
  const mapIdStr = String(mapId || 'lobby').toLowerCase();
  
  // 맵 ID 매칭 시도 (유연하게)
  let mapAreas = areaDefinitions[mapId];
  
  // 정확한 매칭이 없으면 다른 시도
  if (!mapAreas) {
    // lobby 관련 맵들
    if (mapIdStr.includes('lobby') || mapIdStr === '1' || !mapId) {
      mapAreas = areaDefinitions['lobby'];
    } 
    // office 관련 맵들
    else if (mapIdStr.includes('office') || mapIdStr === '2') {
      mapAreas = areaDefinitions['office'];
    } 
    // 기본값으로 lobby 사용
    else {
      mapAreas = areaDefinitions['lobby'];
    }
  }
  
  // 프라이빗 영역부터 체크 (우선순위가 높음)
  for (const area of mapAreas.areas) {
    if (area.type === 'private') {
      const inArea = position.x >= area.x && 
                     position.x <= area.x + area.width &&
                     position.y >= area.y && 
                     position.y <= area.y + area.height;
      
      if (inArea) {
        return {
          id: area.id,
          name: area.name,
          type: area.type
        };
      }
    }
  }
  
  // 프라이빗 영역이 아니면 공용 영역
  return {
    id: 'public',
    name: '공용 영역',
    type: 'public'
  };
};

// 디버그용 - 모든 영역 가져오기
export const getAreasForMap = (mapId) => {
  return areaDefinitions[mapId]?.areas || areaDefinitions['default'].areas;
};