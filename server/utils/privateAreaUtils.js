// Private Area 관련 서버사이드 유틸리티 함수들

/**
 * 시작점과 끝점으로부터 사각형 정보 계산
 * @param {Object} start - 시작점 {x, y}
 * @param {Object} end - 끝점 {x, y}
 * @returns {Object} 사각형 정보 {position, size}
 */
const calculateRectFromPoints = (start, end) => {
  if (!start || !end) return null;
  
  return {
    position: {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y)
    },
    size: {
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y)
    }
  };
};

/**
 * Private Area 데이터 정규화
 * 이전 버전(position/size)과 새 버전(start/end) 모두 지원
 * @param {Object} area - Private Area 객체
 * @returns {Object} 정규화된 Private Area 객체
 */
const normalizePrivateArea = (area) => {
  if (!area) return null;
  
  // 이미 start/end가 있는 경우
  if (area.start && area.end) {
    const rect = calculateRectFromPoints(area.start, area.end);
    return {
      ...area,
      position: rect.position,
      size: rect.size
    };
  }
  
  // position/size만 있는 경우 (이전 버전)
  if (area.position && area.size) {
    return {
      ...area,
      start: { ...area.position },
      end: {
        x: area.position.x + area.size.width,
        y: area.position.y + area.size.height
      }
    };
  }
  
  return area;
};

/**
 * Private Area 배열 정규화
 * @param {Array} areas - Private Area 배열
 * @returns {Array} 정규화된 Private Area 배열
 */
const normalizePrivateAreas = (areas) => {
  if (!Array.isArray(areas)) return [];
  return areas.map(area => normalizePrivateArea(area));
};

/**
 * 점이 Private Area 내부에 있는지 확인
 * @param {Object} point - 확인할 점 {x, y}
 * @param {Object} area - Private Area 객체
 * @returns {boolean} 내부에 있으면 true
 */
const isPointInPrivateArea = (point, area) => {
  if (!point || !area) return false;
  
  const normalizedArea = normalizePrivateArea(area);
  if (!normalizedArea.position || !normalizedArea.size) return false;
  
  return point.x >= normalizedArea.position.x && 
         point.x <= normalizedArea.position.x + normalizedArea.size.width &&
         point.y >= normalizedArea.position.y && 
         point.y <= normalizedArea.position.y + normalizedArea.size.height;
};

module.exports = {
  calculateRectFromPoints,
  normalizePrivateArea,
  normalizePrivateAreas,
  isPointInPrivateArea
};