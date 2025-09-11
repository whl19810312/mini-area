/**
 * 사용자의 위치를 기반으로 현재 영역을 감지하는 함수
 * @param {Object} position - 사용자 위치 { x, y }
 * @param {Object} map - 맵 정보 { id, privateAreas, size }
 * @returns {Object} 영역 정보 { type, id, name }
 */
function detectUserArea(position, map) {
  if (!position || !map) {
    return { type: 'lobby', id: null, name: '로비' };
  }

  // 프라이빗 영역 감지 (우선순위 높음)
  if (map.privateAreas && Array.isArray(map.privateAreas)) {
    for (const area of map.privateAreas) {
      if (isInsideArea(position, area)) {
        return {
          type: 'private',
          id: area.id || `private_${area.x}_${area.y}`,
          name: area.name || `프라이빗 영역 ${area.id || ''}`
        };
      }
    }
  }

  // 맵 내부에 있으면 퍼블릭 영역
  if (isInsideMap(position, map)) {
    return {
      type: 'public',
      id: map.id,
      name: `퍼블릭 영역`
    };
  }

  // 기본값: 로비
  return { type: 'lobby', id: null, name: '로비' };
}

/**
 * 위치가 특정 영역 안에 있는지 확인
 * @param {Object} position - 위치 { x, y }
 * @param {Object} area - 영역 정보 { x, y, width, height }
 * @returns {boolean}
 */
function isInsideArea(position, area) {
  if (!area || typeof area.x !== 'number' || typeof area.y !== 'number' || 
      typeof area.width !== 'number' || typeof area.height !== 'number') {
    return false;
  }

  return (
    position.x >= area.x &&
    position.x <= area.x + area.width &&
    position.y >= area.y &&
    position.y <= area.y + area.height
  );
}

/**
 * 위치가 맵 안에 있는지 확인
 * @param {Object} position - 위치 { x, y }
 * @param {Object} map - 맵 정보 { size: { width, height } }
 * @returns {boolean}
 */
function isInsideMap(position, map) {
  if (!map || !map.size) {
    return false;
  }

  return (
    position.x >= 0 &&
    position.x <= map.size.width &&
    position.y >= 0 &&
    position.y <= map.size.height
  );
}

/**
 * 두 영역이 같은지 비교
 * @param {Object} area1 
 * @param {Object} area2 
 * @returns {boolean}
 */
function areAreasEqual(area1, area2) {
  if (!area1 || !area2) return false;
  return area1.type === area2.type && area1.id === area2.id;
}

/**
 * 영역 키 생성
 * @param {number} mapId 
 * @param {string} areaType 
 * @param {string|number} areaId 
 * @returns {string}
 */
function generateAreaKey(mapId, areaType, areaId = 'main') {
  return `${mapId}_${areaType}_${areaId}`;
}

module.exports = {
  detectUserArea,
  isInsideArea,
  isInsideMap,
  areAreasEqual,
  generateAreaKey
};