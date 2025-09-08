// 공통 에러 처리 유틸리티
const handleError = (res, error, defaultMessage = '서버 오류가 발생했습니다.') => {
  console.error('Error:', error);
  
  // Sequelize 에러 처리
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: '이미 존재하는 데이터입니다.'
    });
  }
  
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: '입력 데이터가 올바르지 않습니다.',
      errors: error.errors.map(e => e.message)
    });
  }
  
  // JWT 에러 처리
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '토큰이 만료되었습니다.'
    });
  }
  
  // 기본 에러 응답
  res.status(500).json({
    success: false,
    message: defaultMessage,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// 권한 확인 유틸리티
const checkPermission = (resource, userId, resourceUserId) => {
  if (userId !== resourceUserId) {
    throw new Error('권한이 없습니다.');
  }
};

// 리소스 존재 확인 유틸리티
const checkResourceExists = (resource, resourceName = '리소스') => {
  if (!resource) {
    throw new Error(`${resourceName}을 찾을 수 없습니다.`);
  }
};

module.exports = {
  handleError,
  checkPermission,
  checkResourceExists
};


