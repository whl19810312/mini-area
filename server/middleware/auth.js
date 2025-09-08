const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')
    console.log('Auth 미들웨어 - Authorization 헤더:', authHeader ? '존재' : '없음')
    
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth 미들웨어 - 토큰이 없음')
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }
    
    console.log('Auth 미들웨어 - 토큰 확인:', token.substring(0, 20) + '...')
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    console.log('Auth 미들웨어 - 토큰 디코딩 성공, userId:', decoded.userId)
    
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      console.log('Auth 미들웨어 - 사용자를 찾을 수 없음, userId:', decoded.userId)
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }
    
    console.log('Auth 미들웨어 - 인증 성공, 사용자:', user.username)
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth 미들웨어 - 오류:', error.message)
    res.status(401).json({
      success: false,
      message: '인증에 실패했습니다.',
      error: error.message
    });
  }
};

module.exports = auth; 