// Private Area 관련 유틸리티 함수들

/**
 * 시작점과 끝점으로부터 사각형 정보 계산
 * @param {Object} start - 시작점 {x, y}
 * @param {Object} end - 끝점 {x, y}
 * @returns {Object} 사각형 정보 {position, size}
 */
export const calculateRectFromPoints = (start, end) => {
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
export const normalizePrivateArea = (area) => {
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
export const normalizePrivateAreas = (areas) => {
  if (!Array.isArray(areas)) return [];
  return areas.map(area => normalizePrivateArea(area));
};

/**
 * 점이 Private Area 내부에 있는지 확인
 * @param {Object} point - 확인할 점 {x, y}
 * @param {Object} area - Private Area 객체
 * @returns {boolean} 내부에 있으면 true
 */
export const isPointInPrivateArea = (point, area) => {
  if (!point || !area) return false;
  
  const normalizedArea = normalizePrivateArea(area);
  if (!normalizedArea.position || !normalizedArea.size) return false;
  
  return point.x >= normalizedArea.position.x && 
         point.x <= normalizedArea.position.x + normalizedArea.size.width &&
         point.y >= normalizedArea.position.y && 
         point.y <= normalizedArea.position.y + normalizedArea.size.height;
};

/**
 * 두 Private Area가 겹치는지 확인
 * @param {Object} area1 - 첫 번째 Private Area
 * @param {Object} area2 - 두 번째 Private Area
 * @returns {boolean} 겹치면 true
 */
export const doPrivateAreasOverlap = (area1, area2) => {
  const norm1 = normalizePrivateArea(area1);
  const norm2 = normalizePrivateArea(area2);
  
  if (!norm1 || !norm2) return false;
  
  const rect1 = {
    left: norm1.position.x,
    right: norm1.position.x + norm1.size.width,
    top: norm1.position.y,
    bottom: norm1.position.y + norm1.size.height
  };
  
  const rect2 = {
    left: norm2.position.x,
    right: norm2.position.x + norm2.size.width,
    top: norm2.position.y,
    bottom: norm2.position.y + norm2.size.height
  };
  
  return !(rect1.right < rect2.left || 
           rect1.left > rect2.right || 
           rect1.bottom < rect2.top || 
           rect1.top > rect2.bottom);
};

/**
 * 점이 어떤 타입의 영역에 있는지 확인
 * @param {Object} point - 확인할 점 {x, y}
 * @param {Array} privateAreas - Private Area 배열
 * @returns {string} 영역 타입 ('public', 'private', 'restricted')
 */
export const getAreaTypeAtPoint = (point, privateAreas = []) => {
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
 * 무지개 색상 팔레트 (ROYGBIV 순서)
 */
const RAINBOW_COLORS = [
  { name: 'Red', fill: 'rgba(255, 99, 132, 0.3)', stroke: 'rgba(255, 99, 132, 0.8)' },      // 빨강
  { name: 'Orange', fill: 'rgba(255, 159, 64, 0.3)', stroke: 'rgba(255, 159, 64, 0.8)' },   // 주황
  { name: 'Yellow', fill: 'rgba(255, 205, 86, 0.3)', stroke: 'rgba(255, 205, 86, 0.8)' },   // 노랑
  { name: 'Green', fill: 'rgba(75, 192, 192, 0.3)', stroke: 'rgba(75, 192, 192, 0.8)' },     // 초록
  { name: 'Blue', fill: 'rgba(54, 162, 235, 0.3)', stroke: 'rgba(54, 162, 235, 0.8)' },      // 파랑
  { name: 'Indigo', fill: 'rgba(153, 102, 255, 0.3)', stroke: 'rgba(153, 102, 255, 0.8)' }, // 남색
  { name: 'Violet', fill: 'rgba(255, 99, 255, 0.3)', stroke: 'rgba(255, 99, 255, 0.8)' }    // 보라
];

/**
 * 확장 색상 팔레트 (무지개 색상 수를 초과하는 경우 사용)
 */
const EXTENDED_COLORS = [
  { name: 'Pink', fill: 'rgba(255, 192, 203, 0.3)', stroke: 'rgba(255, 192, 203, 0.8)' },
  { name: 'Cyan', fill: 'rgba(0, 255, 255, 0.3)', stroke: 'rgba(0, 255, 255, 0.8)' },
  { name: 'Lime', fill: 'rgba(50, 205, 50, 0.3)', stroke: 'rgba(50, 205, 50, 0.8)' },
  { name: 'Magenta', fill: 'rgba(255, 0, 255, 0.3)', stroke: 'rgba(255, 0, 255, 0.8)' },
  { name: 'Teal', fill: 'rgba(0, 128, 128, 0.3)', stroke: 'rgba(0, 128, 128, 0.8)' },
  { name: 'Navy', fill: 'rgba(0, 0, 128, 0.3)', stroke: 'rgba(0, 0, 128, 0.8)' },
  { name: 'Maroon', fill: 'rgba(128, 0, 0, 0.3)', stroke: 'rgba(128, 0, 0, 0.8)' },
  { name: 'Olive', fill: 'rgba(128, 128, 0, 0.3)', stroke: 'rgba(128, 128, 0, 0.8)' }
];

/**
 * 랜덤 색상 생성
 * @returns {Object} 색상 객체 {name, fill, stroke}
 */
const generateRandomColor = () => {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  
  return {
    name: `Random-${r}-${g}-${b}`,
    fill: `rgba(${r}, ${g}, ${b}, 0.3)`,
    stroke: `rgba(${r}, ${g}, ${b}, 0.8)`
  };
};

/**
 * 프라이빗 영역 번호에 따른 색상 반환 (1부터 시작)
 * 1=빨강, 2=주황, 3=노랑, 4=초록, 5=파랑, 6=남색, 7=보라, 8이상=랜덤색
 * @param {number} areaNumber - 프라이빗 영역 번호 (1부터 시작)
 * @returns {Object} 색상 객체 {name, fill, stroke}
 */
export const getPrivateAreaColor = (areaNumber) => {
  // 1부터 시작하므로 인덱스는 -1
  const index = areaNumber - 1;
  
  if (index >= 0 && index < RAINBOW_COLORS.length) {
    return RAINBOW_COLORS[index];
  }
  
  // 무지개 색상을 초과하는 경우 랜덤 색상 생성
  return generateRandomColor();
};

/**
 * 모든 사용 가능한 색상 개수 반환
 * @returns {number} 총 색상 개수
 */
export const getTotalAvailableColors = () => {
  return RAINBOW_COLORS.length + EXTENDED_COLORS.length;
};

/**
 * 무지개 색상 정보 반환
 * @returns {Array} 무지개 색상 배열
 */
export const getRainbowColors = () => {
  return [...RAINBOW_COLORS];
};

/**
 * 영역 타입에 따른 이름표 배경색 반환
 * @param {string} areaType - 영역 타입 ('public', 'private', 'restricted')
 * @param {boolean} isCurrentUser - 현재 사용자인지 여부
 * @param {number} privateAreaNumber - 프라이빗 영역인 경우 번호 (1부터 시작)
 * @returns {string} 배경색 (rgba 형식)
 */
export const getNametagBackgroundColor = (areaType, isCurrentUser = false, privateAreaNumber = 1) => {
  if (areaType === 'private') {
    const color = getPrivateAreaColor(privateAreaNumber);
    return color.fill;
  }
  
  const colors = {
    public: isCurrentUser ? 'rgba(76, 175, 80, 0.3)' : 'rgba(33, 150, 243, 0.3)', // 초록/파랑 70% 투명
    restricted: isCurrentUser ? 'rgba(231, 76, 60, 0.3)' : 'rgba(231, 76, 60, 0.3)' // 빨강 70% 투명
  };
  
  return colors[areaType] || colors.public;
};