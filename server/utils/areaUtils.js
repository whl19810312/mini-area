// 영역 관련 유틸리티 함수들

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

/**
 * 점이 어떤 타입의 영역에 있는지 확인
 * @param {Object} point - 확인할 점 {x, y}
 * @param {Array} privateAreas - Private Area 배열
 * @returns {string} 영역 타입 ('public', 'private', 'restricted')
 */
const getAreaTypeAtPoint = (point, privateAreas = []) => {
  if (!point || !Array.isArray(privateAreas)) return 'public';
  
  const normalizedAreas = normalizePrivateAreas(privateAreas);
  
  for (const area of normalizedAreas) {
    if (isPointInPrivateArea(point, area)) {
      // area.type이 있으면 사용, 없으면 기본값 'private'
      return area.type || 'private';
    }
  }
  
  return 'public';
};

/**
 * 점이 있는 Private Area 찾기
 * @param {Object} point - 확인할 점 {x, y}
 * @param {Array} privateAreas - Private Area 배열
 * @returns {Object|null} 해당 영역 객체 또는 null
 */
const findPrivateAreaAtPoint = (point, privateAreas = []) => {
  if (!point || !Array.isArray(privateAreas)) return null;
  
  const normalizedAreas = normalizePrivateAreas(privateAreas);
  
  for (const area of normalizedAreas) {
    if (isPointInPrivateArea(point, area)) {
      return area;
    }
  }
  
  return null;
};

/**
 * 영역 정보를 한국어로 반환
 * @param {string} areaType - 영역 타입
 * @param {Object} area - 영역 객체 (optional)
 * @returns {string} 한국어 영역 설명
 */
const getAreaDescription = (areaType, area = null) => {
  switch (areaType) {
    case 'public':
      return '공개 영역';
    case 'private':
      return area?.name ? `${area.name} (프라이빗 영역)` : '프라이빗 영역';
    case 'restricted':
      return area?.name ? `${area.name} (제한 영역)` : '제한 영역';
    default:
      return '알 수 없는 영역';
  }
};

module.exports = {
  normalizePrivateArea,
  calculateRectFromPoints,
  normalizePrivateAreas,
  isPointInPrivateArea,
  getAreaTypeAtPoint,
  findPrivateAreaAtPoint,
  getAreaDescription
};