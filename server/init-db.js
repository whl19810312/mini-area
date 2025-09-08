const sequelize = require('./config/database');
const User = require('./models/User');
const Map = require('./models/Map');
const Character = require('./models/Character');

async function initializeDatabase() {
  try {
    // 데이터베이스 연결
    await sequelize.authenticate();
    console.log('PostgreSQL 연결 성공');
    
    // 테이블 생성
    await sequelize.sync({ force: true });
    console.log('기존 데이터 삭제 중...');
    console.log('기존 데이터 삭제 완료');
    
    // 테스트 사용자 생성
    console.log('테스트 사용자 생성 중...');
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      profile: {}
    });
    console.log('테스트 사용자 생성 완료:', testUser.username);
    
    // 테스트 방 생성
    console.log('테스트 방 생성 중...');
    const testMap = await Map.create({
      name: '테스트 방',
      description: '테스트용 방입니다.',
      creatorId: testUser.id,
      isPublic: true,
      publicLink: 'test12345',
      maxParticipants: 50,
      backgroundLayer: {
        image: {
          data: null,
          contentType: null,
          filename: null,
          width: 0,
          height: 0,
          uploadedAt: null
        }
      },
      walls: [],
      privateAreas: [],
      spawnPoints: []
    });
    console.log('테스트 방 생성 완료:', testMap.name);
    
    // 테스트 캐릭터 생성
    console.log('테스트 캐릭터 생성 중...');
    const testCharacter = await Character.create({
      name: '테스트 캐릭터',
      userId: testUser.id,
      appearance: {
        hair: { style: 'short', color: '#000000' },
        eyes: { color: '#000000' },
        skin: { color: '#f4d03f' },
        clothing: { top: 'shirt', bottom: 'pants', color: '#3498db' }
      },
      position: { x: 500, y: 500 },
      currentMapId: testMap.id
    });
    console.log('테스트 캐릭터 생성 완료:', testCharacter.name);
    
    console.log('데이터베이스 초기화 완료!');
    console.log('테스트 계정: test@example.com / password123');
    
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
  } finally {
    await sequelize.close();
    console.log('PostgreSQL 연결 종료');
  }
}

initializeDatabase(); 