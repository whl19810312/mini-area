const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// 데이터베이스 연결 설정
const pool = new Pool({
  host: 'localhost',
  database: 'metaverse',
  user: 'postgres',
  password: 'password',
  port: 5432,
});

async function updatePassword(email, newPassword) {
  try {
    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, username, email',
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ 비밀번호 변경 완료:', result.rows[0]);
    } else {
      console.log('❌ 해당 이메일을 가진 사용자를 찾을 수 없습니다:', email);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// 실행
const email = process.argv[2] || 'test2@test.com';
const password = process.argv[3] || '1';
updatePassword(email, password);