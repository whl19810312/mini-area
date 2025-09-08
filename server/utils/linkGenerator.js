const crypto = require('crypto');

// 공개 링크 생성 함수
const generatePublicLink = (mapName, mapId) => {
  // 맵 이름과 ID를 조합하여 고유한 해시 생성
  const combined = `${mapName}-${mapId}-${Date.now()}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  
  // 8자리 짧은 코드 생성
  const shortCode = hash.substring(0, 8);
  
  return shortCode;
};

// 링크 유효성 검사 함수
const validatePublicLink = (link) => {
  // 8자리 16진수 문자열인지 확인
  const linkRegex = /^[a-f0-9]{8}$/;
  return linkRegex.test(link);
};

// QR 코드 URL 생성 함수
const generateQRCodeUrl = (publicLink, baseUrl) => {
  const fullUrl = `${baseUrl}/join/${publicLink}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}`;
};

module.exports = {
  generatePublicLink,
  validatePublicLink,
  generateQRCodeUrl
};
