const User = require('./server/models/User');
const sequelize = require('./server/config/database');

async function updateUserVerification() {
  try {
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
    
    const user = await User.findOne({ where: { username: 'whl19810312' } });
    
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없습니다: whl19810312');
      return;
    }
    
    console.log('👤 현재 사용자 정보:');
    console.log('  - ID:', user.id);
    console.log('  - Username:', user.username);
    console.log('  - Email:', user.email);
    console.log('  - Phone:', user.phoneNumber);
    console.log('  - Email Verified:', user.emailVerified);
    console.log('  - Phone Verified:', user.phoneVerified);
    
    // Validation을 우회하여 직접 SQL로 업데이트
    await sequelize.query(`
      UPDATE users 
      SET 
        email = 'whl19810312@gmail.com',
        phoneNumber = '01027093906',
        emailVerified = 1,
        phoneVerified = 1,
        emailVerificationToken = NULL,
        emailVerificationExpires = NULL,
        phoneVerificationToken = NULL,
        phoneVerificationExpires = NULL,
        updatedAt = NOW()
      WHERE username = 'whl19810312'
    `);
    
    console.log('\n✅ 사용자 인증 정보 업데이트 완료:');
    console.log('  - Email: whl19810312@gmail.com (인증됨)');
    console.log('  - Phone: 01027093906 (인증됨)');
    
    // 업데이트된 정보 확인
    const updatedUser = await User.findOne({ where: { username: 'whl19810312' } });
    console.log('\n📋 업데이트된 사용자 정보:');
    console.log('  - Email:', updatedUser.email);
    console.log('  - Phone:', updatedUser.phoneNumber);
    console.log('  - Email Verified:', updatedUser.emailVerified);
    console.log('  - Phone Verified:', updatedUser.phoneVerified);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

updateUserVerification();
