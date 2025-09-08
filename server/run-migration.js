const { Sequelize } = require('sequelize');
const path = require('path');

// 데이터베이스 연결
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'metaverse',
  logging: false
});

async function runMigration() {
  try {
    console.log('🔄 마이그레이션 시작...');
    
    // 마이그레이션 파일 실행
    const migration = require('./migrations/add-user-map-status');
    
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    
    console.log('✅ 마이그레이션 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

runMigration();
