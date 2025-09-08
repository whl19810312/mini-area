const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function addEmailVerificationFields() {
  try {
    console.log('이메일 인증 필드 확인 중...');
    
    // 기존 필드 확인
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('emailVerified', 'emailVerificationToken', 'emailVerificationExpires')
    `);
    
    const existingColumns = results.map(row => row.column_name);
    console.log('기존 필드:', existingColumns);
    
    // emailVerified 필드 추가 (없는 경우에만)
    if (!existingColumns.includes('emailverified')) {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN emailVerified BOOLEAN DEFAULT FALSE
      `);
      console.log('✓ emailVerified 필드 추가 완료');
    } else {
      console.log('✓ emailVerified 필드 이미 존재');
    }
    
    // emailVerificationToken 필드 추가 (없는 경우에만)
    if (!existingColumns.includes('emailverificationtoken')) {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN emailVerificationToken VARCHAR(255) NULL
      `);
      console.log('✓ emailVerificationToken 필드 추가 완료');
    } else {
      console.log('✓ emailVerificationToken 필드 이미 존재');
    }
    
    // emailVerificationExpires 필드 추가 (없는 경우에만)
    if (!existingColumns.includes('emailverificationexpires')) {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN emailVerificationExpires TIMESTAMP NULL
      `);
      console.log('✓ emailVerificationExpires 필드 추가 완료');
    } else {
      console.log('✓ emailVerificationExpires 필드 이미 존재');
    }
    
    console.log('모든 이메일 인증 필드가 준비되었습니다.');
  } catch (error) {
    console.error('마이그레이션 오류:', error);
    throw error;
  }
}

// 스크립트가 직접 실행될 때만 마이그레이션 실행
if (require.main === module) {
  addEmailVerificationFields()
    .then(() => {
      console.log('마이그레이션이 완료되었습니다.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('마이그레이션 실패:', error);
      process.exit(1);
    });
}

module.exports = { addEmailVerificationFields };
