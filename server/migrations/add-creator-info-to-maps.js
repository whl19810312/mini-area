const sequelize = require('../config/database');
const Map = require('../models/Map');
const User = require('../models/User');

async function migrateCreatorInfo() {
  try {
    console.log('🔄 맵 생성자 정보 마이그레이션 시작...');
    
    // 모든 맵을 가져와서 생성자 정보 업데이트
    const maps = await Map.findAll({
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    console.log(`📊 총 ${maps.length}개의 맵을 처리합니다.`);
    
    for (const map of maps) {
      if (map.creator) {
        // 생성자 정보가 있으면 JSON 필드에 저장
        await map.update({
          creatorInfo: {
            id: map.creator.id,
            username: map.creator.username,
            email: map.creator.email
          }
        });
        console.log(`✅ 맵 "${map.name}" (ID: ${map.id}) 생성자 정보 업데이트 완료`);
      } else {
        console.log(`⚠️ 맵 "${map.name}" (ID: ${map.id}) 생성자 정보 없음`);
      }
    }
    
    console.log('🎉 맵 생성자 정보 마이그레이션 완료!');
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    throw error;
  }
}

// 마이그레이션 실행
if (require.main === module) {
  migrateCreatorInfo()
    .then(() => {
      console.log('마이그레이션이 성공적으로 완료되었습니다.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('마이그레이션 실패:', error);
      process.exit(1);
    });
}

module.exports = migrateCreatorInfo;
