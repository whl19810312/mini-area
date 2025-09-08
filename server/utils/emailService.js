const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 이메일 저장 디렉토리
const EMAIL_STORAGE_DIR = path.join(__dirname, '../emails');

// 이메일 저장 디렉토리 생성
const ensureEmailDirectory = () => {
  if (!fs.existsSync(EMAIL_STORAGE_DIR)) {
    fs.mkdirSync(EMAIL_STORAGE_DIR, { recursive: true });
  }
};

// 이메일 전송을 위한 transporter 설정
const createTransporter = () => {
  // Postfix 사용 설정
  if (process.env.USE_POSTFIX === 'true') {
    console.log('Postfix를 사용하여 이메일을 전송합니다.');
    return nodemailer.createTransport({ 
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail'
    });
  }

  // 개발 환경에서는 자체 이메일 시스템 사용
  if (process.env.NODE_ENV === 'development') {
    console.log('개발 환경: 자체 이메일 시스템을 사용합니다.');
    return {
      sendMail: async (mailOptions) => {
        return await sendLocalEmail(mailOptions);
      }
    };
  }

  // 프로덕션 환경에서는 Gmail 사용
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('이메일 환경변수가 설정되지 않았습니다. EMAIL_USER와 EMAIL_PASS를 설정해주세요.');
    return null;
  }

  console.log('Gmail을 사용하여 이메일을 전송합니다.');
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// 로컬 이메일 전송 (파일로 저장)
const sendLocalEmail = async (mailOptions) => {
  ensureEmailDirectory();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const emailFileName = `email_${timestamp}.json`;
  const emailFilePath = path.join(EMAIL_STORAGE_DIR, emailFileName);
  
  const emailData = {
    id: `email_${Date.now()}`,
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
    timestamp: new Date().toISOString(),
    messageId: `local_${Date.now()}@localhost`
  };
  
  try {
    fs.writeFileSync(emailFilePath, JSON.stringify(emailData, null, 2));
    console.log(`이메일이 저장되었습니다: ${emailFilePath}`);
    
    // 콘솔에 이메일 내용 출력
    console.log('\n=== 자체 이메일 시스템 ===');
    console.log(`받는 사람: ${mailOptions.to}`);
    console.log(`제목: ${mailOptions.subject}`);
    console.log('내용:');
    console.log(mailOptions.html);
    console.log('========================\n');
    
    return {
      messageId: emailData.messageId,
      response: 'Email saved locally'
    };
  } catch (error) {
    console.error('이메일 저장 실패:', error);
    throw error;
  }
};

const transporter = createTransporter();

// 비밀번호 재설정 이메일 전송
const sendPasswordResetEmail = async (email, username, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@metaverse.local',
    to: email,
            subject: 'mini area 비밀번호 재설정',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">비밀번호 재설정</h2>
        <p>안녕하세요, <strong>${username}</strong>님!</p>
        <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            비밀번호 재설정
          </a>
        </div>
        <p>또는 아래 링크를 브라우저에 복사하여 붙여넣기 하세요:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px;">
          이 링크는 1시간 후에 만료됩니다.<br>
          비밀번호 재설정을 요청하지 않으셨다면 무시하셔도 됩니다.
        </p>
      </div>
    `
  };

  try {
    if (!transporter) {
      console.error('이메일 transporter가 설정되지 않았습니다.');
      return false;
    }
    
    const result = await transporter.sendMail(mailOptions);
    console.log('비밀번호 재설정 이메일 전송 성공:', email);
    
    // 이메일 전송 성공 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('이메일 전송 성공 - 메시지 ID:', result.messageId);
      console.log('저장된 이메일 확인: ls -la server/emails/');
    }
    
    return true;
  } catch (error) {
    console.error('이메일 전송 실패:', error);
    return false;
  }
};

// 저장된 이메일 목록 조회
const getStoredEmails = () => {
  ensureEmailDirectory();
  
  try {
    const files = fs.readdirSync(EMAIL_STORAGE_DIR);
    const emails = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(EMAIL_STORAGE_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return emails;
  } catch (error) {
    console.error('저장된 이메일 조회 실패:', error);
    return [];
  }
};

// 이메일 인증 토큰 생성
const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// 이메일 인증 토큰 만료 시간 설정 (24시간)
const getEmailVerificationExpires = () => {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간
};

// 이메일 인증 이메일 전송
const sendEmailVerification = async (email, username, token) => {
  // 동적으로 프론트엔드 URL 설정 (LAN 접속 지원)
  const serverIP = process.env.SERVER_IP || '192.168.200.103';
  const frontendUrl = `http://${serverIP}:5173`;
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@metaverse.local',
    to: email,
            subject: 'mini area 이메일 인증',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">이메일 인증</h2>
        <p>안녕하세요, <strong>${username}</strong>님!</p>
        <p>mini area 계정을 완성하기 위해 이메일 인증이 필요합니다. 아래 버튼을 클릭하여 이메일을 인증해주세요.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            이메일 인증하기
          </a>
        </div>
        <p>또는 아래 링크를 브라우저에 복사하여 붙여넣기 하세요:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px;">
          이 링크는 24시간 후에 만료됩니다.<br>
          계정을 생성하지 않으셨다면 무시하셔도 됩니다.
        </p>
      </div>
    `
  };

  try {
    if (!transporter) {
      console.error('이메일 transporter가 설정되지 않았습니다.');
      return false;
    }
    
    const result = await transporter.sendMail(mailOptions);
    console.log('이메일 인증 이메일 전송 성공:', email);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('이메일 전송 성공 - 메시지 ID:', result.messageId);
    }
    
    return true;
  } catch (error) {
    console.error('이메일 인증 이메일 전송 실패:', error);
    return false;
  }
};

// Postfix 테스트 이메일 전송
const sendTestEmail = async (toEmail, fromEmail = 'test@your-domain.com') => {
  const testTransporter = nodemailer.createTransport({ 
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
  });

  const mailOptions = {
    from: fromEmail,
    to: toEmail,
    subject: 'Postfix 테스트 이메일',
    text: '로컬 Postfix로 발송된 테스트 이메일입니다.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Postfix 테스트 이메일</h2>
        <p>이 이메일은 로컬 Postfix 서버를 통해 전송되었습니다.</p>
        <p>전송 시간: ${new Date().toLocaleString('ko-KR')}</p>
        <p>테스트가 성공적으로 완료되었습니다!</p>
      </div>
    `
  };

  try {
    const result = await testTransporter.sendMail(mailOptions);
    console.log('Postfix 테스트 이메일 전송 성공:', result);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Postfix 테스트 이메일 전송 실패:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  getStoredEmails,
  sendTestEmail,
  sendEmailVerification,
  generateEmailVerificationToken,
  getEmailVerificationExpires
}; 