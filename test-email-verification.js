#!/usr/bin/env node
const axios = require('axios');

// API 설정
axios.defaults.baseURL = 'https://localhost:7000';
axios.defaults.httpsAgent = new (require('https').Agent)({
  rejectUnauthorized: false
});

async function testEmailVerification() {
  console.log('🧪 이메일 인증 테스트 시작...\n');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testUsername = `user_${Date.now()}`;
  const testPassword = 'Test123!@#';
  
  try {
    // 1. 회원가입 시도
    console.log('1️⃣ 회원가입 요청...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Username: ${testUsername}`);
    
    const registerResponse = await axios.post('/api/auth/register', {
      username: testUsername,
      email: testEmail,
      password: testPassword
    });
    
    console.log('✅ 회원가입 성공!');
    console.log('   응답:', registerResponse.data);
    
    if (registerResponse.data.needsEmailVerification) {
      console.log('\n📧 이메일 인증이 필요합니다.');
      console.log('   개발 환경에서는 이메일이 server/emails 폴더에 저장됩니다.');
      
      // 2. 저장된 이메일에서 인증 코드 확인
      console.log('\n2️⃣ 저장된 이메일 확인 중...');
      const fs = require('fs');
      const path = require('path');
      const emailDir = path.join(__dirname, 'server/emails');
      
      if (fs.existsSync(emailDir)) {
        const files = fs.readdirSync(emailDir)
          .filter(file => file.endsWith('.json'))
          .sort((a, b) => b.localeCompare(a)); // 최신 파일 먼저
        
        if (files.length > 0) {
          const latestEmail = JSON.parse(
            fs.readFileSync(path.join(emailDir, files[0]), 'utf8')
          );
          
          // HTML에서 4자리 코드 추출
          const codeMatch = latestEmail.html.match(/>(\d{4})</);
          if (codeMatch) {
            const verificationCode = codeMatch[1];
            console.log(`✅ 인증 코드 발견: ${verificationCode}`);
            
            // 3. 인증 코드로 이메일 인증
            console.log('\n3️⃣ 인증 코드 검증 중...');
            const verifyResponse = await axios.post('/api/auth/verify-code', {
              email: testEmail,
              code: verificationCode
            });
            
            console.log('✅ 이메일 인증 성공!');
            console.log('   응답:', verifyResponse.data);
            
            if (verifyResponse.data.token) {
              console.log('\n🎉 테스트 완료! 토큰을 받았습니다.');
              console.log(`   Token: ${verifyResponse.data.token.substring(0, 50)}...`);
              
              // 4. 로그인 테스트
              console.log('\n4️⃣ 로그인 테스트...');
              const loginResponse = await axios.post('/api/auth/login', {
                email: testEmail,
                password: testPassword
              });
              
              console.log('✅ 로그인 성공!');
              console.log('   User:', loginResponse.data.user);
            }
          } else {
            console.log('❌ 이메일에서 인증 코드를 찾을 수 없습니다.');
          }
        } else {
          console.log('❌ 저장된 이메일이 없습니다.');
        }
      } else {
        console.log('❌ 이메일 저장 디렉토리가 없습니다.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.response?.data || error.message);
  }
}

// 테스트 실행
testEmailVerification();