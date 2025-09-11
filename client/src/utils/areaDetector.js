/**
 * 위치 기반 영역 판별 함수
 * 주어진 위치(x, y)가 어느 영역에 속하는지 판별합니다.
 * 
 * @param {Object} position - 판별할 위치 { x: number, y: number }
 * @param {Array} privateAreas - 프라이빗 영역 배열
 * @returns {Object} 판별 결과
 * - areaType: 'public' | 'private'
 * - areaIndex: 퍼블릭(0) 또는 프라이빗(1~n)
 * - areaInfo: 영역 상세 정보
 */
export function detectAreaByPosition(position, privateAreas = []) {
  // 반복 로깅 방지 - 필요시에만 로깅

  // 입력 유효성 검사
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    console.error('❌ [영역판별] 잘못된 위치 데이터:', position);
    return {
      areaType: 'public',
      areaIndex: 0,
      areaInfo: {
        type: 'public',
        name: '퍼블릭 영역',
        error: 'Invalid position data'
      }
    };
  }

  // 프라이빗 영역이 없는 경우
  if (!Array.isArray(privateAreas) || privateAreas.length === 0) {
    return {
      areaType: 'public',
      areaIndex: 0,
      areaInfo: {
        type: 'public',
        name: '퍼블릭 영역',
        position
      }
    };
  }

  // 각 프라이빗 영역을 순회하며 체크
  for (let i = 0; i < privateAreas.length; i++) {
    const area = privateAreas[i];
    const isInside = isPositionInsideArea(position, area);
    
    if (isInside) {
      return {
        areaType: 'private',
        areaIndex: i + 1, // 1부터 시작
        areaInfo: {
          type: 'private',
          id: area.id || `private_${i + 1}`,
          name: area.name || `프라이빗 영역 ${i + 1}`,
          index: i,
          area: area,
          position
        }
      };
    }
  }

  // 모든 프라이빗 영역에 속하지 않으면 퍼블릭
  return {
    areaType: 'public',
    areaIndex: 0,
    areaInfo: {
      type: 'public',
      id: 'public',
      name: '퍼블릭 영역',
      position
    }
  };
}

/**
 * 위치가 특정 영역 안에 있는지 확인하는 함수
 * 다양한 좌표 형식을 지원합니다.
 * 
 * @param {Object} position - 위치 { x, y }
 * @param {Object} area - 영역 정보
 * @returns {boolean}
 */
function isPositionInsideArea(position, area) {
  if (!area) {
    return false;
  }

  // 영역 좌표 추출
  let startX, startY, endX, endY;

  // 1. position + size 형식
  if (area.position && area.size) {
    startX = area.position.x;
    startY = area.position.y;
    endX = startX + area.size.width;
    endY = startY + area.size.height;
  }
  // 2. x, y, width, height 형식
  else if (area.x !== undefined && area.y !== undefined && 
           area.width !== undefined && area.height !== undefined) {
    startX = area.x;
    startY = area.y;
    endX = startX + area.width;
    endY = startY + area.height;
  }
  // 3. 이미 정규화된 startX, startY, endX, endY 형식
  else if (area.startX !== undefined && area.startY !== undefined && 
           area.endX !== undefined && area.endY !== undefined) {
    startX = area.startX;
    startY = area.startY;
    endX = area.endX;
    endY = area.endY;
  }
  else {
    return false;
  }

  // 좌표 유효성 검사
  if (startX === undefined || startY === undefined || 
      endX === undefined || endY === undefined) {
    return false;
  }

  // 좌표 검사 실행
  return (
    position.x >= startX &&
    position.x <= endX &&
    position.y >= startY &&
    position.y <= endY
  );
}

/**
 * 간단한 영역 판별 함수 (숫자만 반환)
 * 
 * @param {Object} position - 위치 { x, y }
 * @param {Array} privateAreas - 프라이빗 영역 배열
 * @returns {number} 퍼블릭(0) 또는 프라이빗(1~n)
 */
export function getAreaIndex(position, privateAreas = []) {
  const result = detectAreaByPosition(position, privateAreas);
  return result.areaIndex;
}

/**
 * 영역 타입만 반환하는 함수
 * 
 * @param {Object} position - 위치 { x, y }
 * @param {Array} privateAreas - 프라이빗 영역 배열
 * @returns {string} 'public' | 'private'
 */
export function getAreaType(position, privateAreas = []) {
  const result = detectAreaByPosition(position, privateAreas);
  return result.areaType;
}

/**
 * 테스트 함수
 */
export function testAreaDetection() {
  console.log('🧪 [테스트] 영역 판별 테스트 시작');

  const testPrivateAreas = [
    {
      id: 'area1',
      name: '회의실 A',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 150 }
    },
    {
      id: 'area2',
      name: '휴게실',
      x: 400,
      y: 200,
      width: 150,
      height: 100
    }
  ];

  const testPositions = [
    { x: 50, y: 50, expected: 'public' },    // 퍼블릭 영역
    { x: 150, y: 150, expected: 'private' }, // 회의실 A
    { x: 450, y: 230, expected: 'private' }, // 휴게실
    { x: 350, y: 350, expected: 'public' }   // 퍼블릭 영역
  ];

  testPositions.forEach((test, index) => {
    const result = detectAreaByPosition(
      { x: test.x, y: test.y }, 
      testPrivateAreas
    );
    
    console.log(`🧪 테스트 ${index + 1}:`, {
      position: `(${test.x}, ${test.y})`,
      expected: test.expected,
      actual: result.areaType,
      areaIndex: result.areaIndex,
      passed: result.areaType === test.expected ? '✅' : '❌'
    });
  });

  console.log('🧪 [테스트] 영역 판별 테스트 완료');
}

export default {
  detectAreaByPosition,
  getAreaIndex,
  getAreaType,
  testAreaDetection
};