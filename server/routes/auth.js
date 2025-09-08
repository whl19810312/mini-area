const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Op } = require('sequelize');
const User = require('../models/User');
const { 
  sendEmailVerification, 
  generateEmailVerificationToken, 
  getEmailVerificationExpires 
} = require('../utils/emailService');

const router = express.Router();

// JWT 토큰 생성
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'your-jwt-secret',
    { expiresIn: '7d' }
  );
};

// Google OAuth 설정 (환경변수가 있을 때만)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ where: { googleId: profile.id } });
      
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value,
          profile: {
            avatar: profile.photos[0].value,
            nickname: profile.displayName
          }
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// 회원가입
router.post('/register', async (req, res) => {
  try {
    console.log('🔍 회원가입 요청 데이터:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
      ip: req.ip
    });
    
    const { username, email, password } = req.body;
    
    // 기존 사용자 확인
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username }
        ]
      }
    });
    
    if (existingUser) {
      // 이메일이 같은 경우
      if (existingUser.email === email) {
        // 이메일 인증이 안된 경우 기존 계정 삭제하고 새로 생성
        if (!existingUser.emailVerified) {
          console.log('🔄 미인증 계정 삭제 후 재생성:', {
            userId: existingUser.id,
            email: existingUser.email,
            username: existingUser.username
          });
          
          await existingUser.destroy();
          console.log('✅ 기존 미인증 계정 삭제 완료');
        } else {
          // 이미 인증된 이메일인 경우 재전송 옵션 제공
          console.log('📧 이미 인증된 이메일 - 재전송 옵션 제공:', { email });
          return res.status(400).json({
            success: false,
            message: '이미 가입된 이메일입니다.',
            canResend: true,
            email: email
          });
        }
      }
      // 사용자명이 같은 경우 (이메일은 다름)
      else if (existingUser.username === username) {
        console.log('❌ 회원가입 실패 - 이미 사용 중인 사용자명:', { username });
        return res.status(400).json({
          success: false,
          message: '이미 사용 중인 사용자명입니다.'
        });
      }
    }
    
    // 이메일 인증 토큰 생성
    const verificationToken = generateEmailVerificationToken();
    const verificationExpires = getEmailVerificationExpires();
    
    // 새 사용자 생성 (개발 환경에서는 자동 인증 처리)
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const user = await User.create({
      username,
      email,
      password,
      isActive: isDevelopment, // 개발 환경에서는 바로 활성화
      emailVerified: isDevelopment, // 개발 환경에서는 바로 인증 완료
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });
    
    // 이메일 인증 메일 전송 (개발 환경에서도 실제 이메일 전송)
    const emailSent = await sendEmailVerification(email, username, verificationToken);
    
    if (!emailSent) {
      // 이메일 전송 실패 시 사용자 삭제
      await user.destroy();
      return res.status(500).json({
        success: false,
        message: '이메일 인증 메일 전송에 실패했습니다. 다시 시도해주세요.'
      });
    }
    
    // 개발 환경에서는 자동 인증 완료 메시지
    const message = isDevelopment 
      ? '회원가입이 완료되었습니다. (개발 환경: 이메일 인증이 자동으로 처리되었습니다.)'
      : '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.';
    
    res.status(201).json({
      success: true,
      message: message,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 로그인 요청:', { email, password: password ? '제공됨' : '없음' });
    
    const user = await User.findOne({ where: { email } });
    
    console.log('👤 사용자 조회 결과:', user ? `ID: ${user.id}, Username: ${user.username}, EmailVerified: ${user.emailVerified}, IsActive: ${user.isActive}` : '사용자를 찾을 수 없음');
    
    if (!user) {
      console.log('❌ 로그인 실패: 사용자를 찾을 수 없음');
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    console.log('🔑 비밀번호 검증 결과:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ 로그인 실패: 비밀번호가 올바르지 않음');
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }
    
    // 이메일 인증 확인 (개발 환경에서는 자동 인증 처리)
    console.log('📧 이메일 인증 확인:', { emailVerified: user.emailVerified, NODE_ENV: process.env.NODE_ENV });
    
    if (!user.emailVerified) {
      // 개발 환경에서는 자동으로 이메일 인증 처리
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 개발 환경: 이메일 인증 자동 처리');
        user.emailVerified = true;
        user.isActive = true;
        await user.save();
        console.log('✅ 개발 환경: 이메일 인증 자동 완료');
      } else {
        console.log('❌ 로그인 실패: 이메일 인증 필요');
        return res.status(401).json({
          success: false,
          message: '이메일 인증이 필요합니다. 이메일을 확인하여 인증을 완료해주세요.',
          needsEmailVerification: true
        });
      }
    }
    
    // 계정 활성화 확인
    console.log('✅ 계정 활성화 확인:', { isActive: user.isActive });
    
    if (!user.isActive) {
      console.log('❌ 로그인 실패: 계정이 비활성화됨');
      return res.status(401).json({
        success: false,
        message: '계정이 비활성화되어 있습니다. 관리자에게 문의하세요.'
      });
    }
    
    const token = generateToken(user);
    
    console.log('✅ 로그인 성공:', { userId: user.id, username: user.username });
    
    res.json({
      success: true,
      message: '로그인이 완료되었습니다.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error)
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// Google OAuth 로그인
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

// 사용자 목록 조회 (관리자용)
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 현재 로그인된 사용자 정보 조회
router.get('/user/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'email', 'isActive', 'emailVerified', 'createdAt', 'profile']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    console.log('👤 현재 사용자 정보 조회:', { userId: user.id, username: user.username });
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('현재 사용자 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 사용자 조회
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'isActive', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 이메일 인증
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 이메일 인증 요청:', { token: token.substring(0, 20) + '...' });
    
    // 토큰으로 사용자 찾기 (만료 시간 체크 없이)
    const user = await User.findOne({
      where: {
        emailVerificationToken: token
      }
    });
    
    console.log('👤 사용자 검색 결과:', { 
      found: !!user, 
      userId: user?.id, 
      email: user?.email,
      token: user?.emailVerificationToken?.substring(0, 20) + '...',
      expires: user?.emailVerificationExpires,
      currentTime: new Date()
    });
    
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없음');
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 인증 토큰입니다.'
      });
    }
    
    // 만료 시간 체크
    if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
      console.log('❌ 토큰 만료:', { 
        expires: user.emailVerificationExpires, 
        current: new Date() 
      });
      return res.status(400).json({
        success: false,
        message: '만료된 인증 토큰입니다. 새로운 인증 이메일을 요청해주세요.'
      });
    }
    
    console.log('✅ 토큰 유효성 확인 완료, 인증 진행');
    
    // 이메일 인증 완료
    await user.update({
      emailVerified: true,
      isActive: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });
    
    console.log('✅ 이메일 인증 완료:', { userId: user.id, email: user.email });
    
    res.json({
      success: true,
      message: '이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.'
    });
  } catch (error) {
    console.error('❌ 이메일 인증 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 이메일 인증 재전송
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('📧 이메일 인증 재전송 요청:', { email });
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없음:', { email });
      return res.status(404).json({
        success: false,
        message: '해당 이메일로 가입된 계정을 찾을 수 없습니다.'
      });
    }
    
    console.log('👤 사용자 정보:', {
      userId: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified
    });
    
    if (user.emailVerified) {
      console.log('📧 이미 인증된 계정 - 재전송 허용:', { email });
      // 이미 인증된 계정도 재전송 허용 (사용자가 이메일을 받지 못했을 수 있음)
    }
    
    // 새로운 인증 토큰 생성
    const verificationToken = generateEmailVerificationToken();
    const verificationExpires = getEmailVerificationExpires();
    
    console.log('🔄 새로운 토큰 생성:', {
      token: verificationToken.substring(0, 20) + '...',
      expires: verificationExpires
    });
    
    await user.update({
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });
    
    console.log('✅ 사용자 토큰 업데이트 완료');
    
    // 이메일 재전송
    const emailSent = await sendEmailVerification(email, user.username, verificationToken);
    
    if (!emailSent) {
      console.log('❌ 이메일 전송 실패:', { email });
      return res.status(500).json({
        success: false,
        message: '이메일 전송에 실패했습니다. 다시 시도해주세요.'
      });
    }
    
    // 개발 환경에서는 자동으로 이메일 인증 처리
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 개발 환경: 이메일 인증 자동 처리');
      await user.update({
        emailVerified: true,
        isActive: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });
      console.log('✅ 개발 환경: 이메일 인증 자동 완료');
    }
    
    console.log('✅ 인증 이메일 재전송 성공:', { email });
    
    const message = process.env.NODE_ENV === 'development'
      ? '인증 이메일이 재전송되었습니다. (개발 환경: 이메일 인증이 자동으로 처리되었습니다.)'
      : '인증 이메일이 재전송되었습니다.';
    
    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('❌ 이메일 재전송 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 계정 삭제
router.delete('/delete-account', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    console.log('🗑️ 계정 삭제 요청:', { userId: user.id, username: user.username, email: user.email });
    
    // 계정 삭제 (실제 삭제 대신 비활성화)
    await user.update({
      isActive: false,
      deletedAt: new Date()
    });
    
    console.log('✅ 계정 삭제 완료:', { userId: user.id, username: user.username });
    
    res.json({
      success: true,
      message: '계정이 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('계정 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 비밀번호 확인 (방 삭제 등에 사용)
router.post('/verify-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { password } = req.body;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: '비밀번호를 입력해주세요.'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    // 비밀번호 확인
    const isPasswordValid = await user.validatePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '비밀번호가 일치하지 않습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '비밀번호가 확인되었습니다.'
    });
  } catch (error) {
    console.error('비밀번호 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 로그아웃
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
      const user = await User.findByPk(decoded.userId);
    }
    
    res.json({
      success: true,
      message: '로그아웃이 완료되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router; 