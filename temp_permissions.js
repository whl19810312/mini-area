const sequelize = require('./server/config/database');

async function setupPermissions() {
  try {
    await sequelize.authenticate();
    
    console.log('🔄 데이터베이스 권한 설정 중...');
    
    // 현재 사용자에게 모든 권한 부여
    const dbName = process.env.DB_NAME || 'metaverse';
    const dbUser = process.env.DB_USER || 'postgres';
    
    await sequelize.query(\`GRANT ALL PRIVILEGES ON DATABASE "\${dbName}" TO "\${dbUser}";\`);
    await sequelize.query(\`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "\${dbUser}";\`);
    await sequelize.query(\`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "\${dbUser}";\`);
    await sequelize.query(\`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "\${dbUser}";\`);
    await sequelize.query(\`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "\${dbUser}";\`);
    
    console.log('✅ 데이터베이스 권한 설정 완료');
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ 권한 설정 오류:', error.message);
  }
}

setupPermissions();
