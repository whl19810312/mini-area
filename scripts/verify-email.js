const { Pool } = require('pg');

// 데이터베이스 연결 설정
const pool = new Pool({
  host: 'localhost',
  database: 'metaverse',
  user: 'postgres',
  password: 'password',
  port: 5432,
});

async function verifyEmail(email) {
  try {
    const result = await pool.query(
      'UPDATE users SET "emailVerified" = true WHERE email = $1 RETURNING id, username, email, "emailVerified"',
      [email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ 이메일 인증 완료:', result.rows[0]);
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
const email = process.argv[2] || 'test1@test.com';
verifyEmail(email);