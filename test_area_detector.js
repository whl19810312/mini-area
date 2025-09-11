// 간단한 Node.js 테스트 파일
const fs = require('fs');
const path = require('path');

// 클라이언트 측 코드를 Node.js에서 실행하기 위한 처리
const areaDetectorPath = path.join(__dirname, 'client/src/utils/areaDetector.js');
let areaDetectorCode = fs.readFileSync(areaDetectorPath, 'utf8');

// ES6 import/export를 CommonJS로 변환
areaDetectorCode = areaDetectorCode
  .replace(/export function/g, 'function')
  .replace(/export \{[^}]+\}/g, '')
  .replace(/export default[^;]+;/g, '');

// console.log를 Node.js용으로 유지
eval(areaDetectorCode);

// module.exports 추가
module.exports = {
  detectAreaByPosition,
  getAreaIndex,
  getAreaType,
  testAreaDetection
};

console.log('🧪 영역 판별 함수 테스트 시작\n');

// 테스트 데이터 설정
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
  },
  {
    id: 'area3',
    name: '개인실',
    startX: 50,
    startY: 300,
    endX: 180,
    endY: 400
  }
];

console.log('📋 테스트용 프라이빗 영역:');
testPrivateAreas.forEach((area, i) => {
  console.log(`  ${i + 1}. ${area.name} (${area.id})`);
});
console.log('');

// 테스트 케이스
const testCases = [
  // 퍼블릭 영역 테스트
  { position: { x: 50, y: 50 }, expected: { type: 'public', index: 0 }, description: '맨 왼쪽 위 (퍼블릭)' },
  { position: { x: 350, y: 350 }, expected: { type: 'public', index: 0 }, description: '중앙 아래 (퍼블릭)' },
  
  // 회의실 A 테스트 (position + size)
  { position: { x: 150, y: 150 }, expected: { type: 'private', index: 1 }, description: '회의실 A 내부' },
  { position: { x: 100, y: 100 }, expected: { type: 'private', index: 1 }, description: '회의실 A 시작점' },
  { position: { x: 300, y: 250 }, expected: { type: 'private', index: 1 }, description: '회의실 A 끝점' },
  { position: { x: 99, y: 150 }, expected: { type: 'public', index: 0 }, description: '회의실 A 바로 밖' },
  
  // 휴게실 테스트 (x, y, width, height)
  { position: { x: 450, y: 230 }, expected: { type: 'private', index: 2 }, description: '휴게실 내부' },
  { position: { x: 400, y: 200 }, expected: { type: 'private', index: 2 }, description: '휴게실 시작점' },
  { position: { x: 550, y: 300 }, expected: { type: 'private', index: 2 }, description: '휴게실 끝점' },
  { position: { x: 399, y: 230 }, expected: { type: 'public', index: 0 }, description: '휴게실 바로 밖' },
  
  // 개인실 테스트 (startX, startY, endX, endY)
  { position: { x: 100, y: 350 }, expected: { type: 'private', index: 3 }, description: '개인실 내부' },
  { position: { x: 50, y: 300 }, expected: { type: 'private', index: 3 }, description: '개인실 시작점' },
  { position: { x: 180, y: 400 }, expected: { type: 'private', index: 3 }, description: '개인실 끝점' },
  { position: { x: 49, y: 350 }, expected: { type: 'public', index: 0 }, description: '개인실 바로 밖' }
];

console.log('🧪 테스트 실행:');
console.log(''.padEnd(80, '='));

let passCount = 0;
let totalCount = testCases.length;

testCases.forEach((testCase, index) => {
  const result = detectAreaByPosition(testCase.position, testPrivateAreas);
  
  const passed = result.areaType === testCase.expected.type && 
                 result.areaIndex === testCase.expected.index;
  
  if (passed) passCount++;
  
  console.log(`테스트 ${(index + 1).toString().padStart(2, '0')}: ${testCase.description.padEnd(20, ' ')} | ` +
              `위치(${testCase.position.x.toString().padStart(3, ' ')}, ${testCase.position.y.toString().padStart(3, ' ')}) | ` +
              `예상: ${testCase.expected.type}(${testCase.expected.index}) | ` +
              `실제: ${result.areaType}(${result.areaIndex}) | ` +
              `${passed ? '✅ 통과' : '❌ 실패'}`);
});

console.log(''.padEnd(80, '='));
console.log(`🎯 테스트 결과: ${passCount}/${totalCount} 통과 (${Math.round(passCount/totalCount*100)}%)`);

// 간단한 API 테스트
console.log('\n📝 간단한 API 테스트:');
const testPosition = { x: 150, y: 150 };

console.log(`위치 (${testPosition.x}, ${testPosition.y}) 테스트:`);
console.log(`- getAreaIndex(): ${getAreaIndex(testPosition, testPrivateAreas)}`);
console.log(`- getAreaType(): ${getAreaType(testPosition, testPrivateAreas)}`);

const fullResult = detectAreaByPosition(testPosition, testPrivateAreas);
console.log(`- 상세 정보:`, JSON.stringify(fullResult.areaInfo, null, 2));

console.log('\n🎉 모든 테스트 완료!');