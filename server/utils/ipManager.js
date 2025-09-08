const User = require('../models/User');

// IP 주소 추출 함수
const getClientIp = (req) => {
  // 다양한 헤더에서 IP 주소 확인
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.headers['x-client-ip'] || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress || 
             req.ip || 
             'unknown';
  
  // IPv6 링크 로컬 주소를 IPv4로 변환
  if (ip.includes('::ffff:')) {
    return ip.split('::ffff:')[1];
  }
  
  return ip;
};

// User-Agent 파싱 함수
const parseUserAgent = (userAgent) => {
  if (!userAgent) return {};
  
  // 간단한 User-Agent 파싱
  const info = {
    browser: 'Unknown',
    os: 'Unknown',
    device: 'Unknown'
  };
  
  // 브라우저 감지
  if (userAgent.includes('Chrome')) info.browser = 'Chrome';
  else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
  else if (userAgent.includes('Safari')) info.browser = 'Safari';
  else if (userAgent.includes('Edge')) info.browser = 'Edge';
  
  // OS 감지
  if (userAgent.includes('Windows')) info.os = 'Windows';
  else if (userAgent.includes('Mac')) info.os = 'macOS';
  else if (userAgent.includes('Linux')) info.os = 'Linux';
  else if (userAgent.includes('Android')) info.os = 'Android';
  else if (userAgent.includes('iOS')) info.os = 'iOS';
  
  // 디바이스 감지
  if (userAgent.includes('Mobile')) info.device = 'Mobile';
  else if (userAgent.includes('Tablet')) info.device = 'Tablet';
  else info.device = 'Desktop';
  
  return info;
};

// IP 히스토리 업데이트
const updateIpHistory = async (userId, newIp, userAgent) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) return;
    
    const connectionInfo = parseUserAgent(userAgent);
    const timestamp = new Date();
    
    // 새로운 IP 기록 생성
    const newIpRecord = {
      ip: newIp,
      timestamp: timestamp,
      userAgent: userAgent,
      connectionInfo: connectionInfo
    };
    
    // 기존 IP 히스토리 가져오기
    let ipHistory = user.ipHistory || [];
    
    // 같은 IP가 이미 있는지 확인
    const existingIndex = ipHistory.findIndex(record => record.ip === newIp);
    if (existingIndex !== -1) {
      // 기존 기록 업데이트
      ipHistory[existingIndex] = {
        ...ipHistory[existingIndex],
        timestamp: timestamp,
        userAgent: userAgent,
        connectionInfo: connectionInfo
      };
    } else {
      // 새로운 IP 추가
      ipHistory.unshift(newIpRecord);
      
      // 최근 10개만 유지
      if (ipHistory.length > 10) {
        ipHistory = ipHistory.slice(0, 10);
      }
    }
    
    // 사용자 정보 업데이트
    await user.update({
      lastLoginIp: user.currentIp || newIp,
      currentIp: newIp,
      ipHistory: ipHistory,
      connectionInfo: connectionInfo
    });
    
    console.log(`📊 IP 정보 업데이트: 사용자 ${user.username} (${newIp})`);
    
  } catch (error) {
    console.error('IP 히스토리 업데이트 실패:', error);
  }
};

// IP 정보 조회
const getUserIpInfo = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) return null;
    
    return {
      currentIp: user.currentIp,
      lastLoginIp: user.lastLoginIp,
      ipHistory: user.ipHistory || [],
      connectionInfo: user.connectionInfo || {}
    };
  } catch (error) {
    console.error('IP 정보 조회 실패:', error);
    return null;
  }
};

// IP 기반 연결 최적화 정보 생성
const generateConnectionOptimization = (ipInfo) => {
  const optimization = {
    useRelay: false,
    preferredServers: [],
    connectionType: 'direct'
  };
  
  if (!ipInfo || !ipInfo.currentIp) return optimization;
  
  const currentIp = ipInfo.currentIp;
  
  // 사설 IP 주소인 경우 릴레이 서버 사용 권장
  if (currentIp.startsWith('192.168.') || 
      currentIp.startsWith('10.') || 
      currentIp.startsWith('172.')) {
    optimization.useRelay = true;
    optimization.connectionType = 'relay';
  }
  
  // 지역별 최적 서버 선택 (간단한 예시)
  if (currentIp.startsWith('203.') || currentIp.startsWith('210.')) {
    optimization.preferredServers = [
      'stun:stun.kr.google.com:19302',
      'stun:stun.l.google.com:19302'
    ];
  } else {
    optimization.preferredServers = [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302'
    ];
  }
  
  return optimization;
};

module.exports = {
  getClientIp,
  parseUserAgent,
  updateIpHistory,
  getUserIpInfo,
  generateConnectionOptimization
};
