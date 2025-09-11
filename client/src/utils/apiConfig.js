import axios from 'axios'

// 서버 IP 자동 감지 함수 - 현재 호스트 사용
const getServerIP = () => {
  // 환경 변수에서 서버 IP 가져오기 (개발 환경에서는 import.meta.env 사용)
  if (import.meta.env.VITE_SERVER_IP) {
    return import.meta.env.VITE_SERVER_IP;
  }
  
  // 브라우저에서 현재 호스트 사용 (LAN 접속 지원)
  return window.location.hostname;
};

// 클라이언트 HTTPS 여부 확인
const isClientHTTPS = () => {
  // Vite 빌드 시 정의된 환경 변수 확인
  if (typeof __IS_HTTPS__ !== 'undefined') {
    return __IS_HTTPS__;
  }
  
  // 브라우저에서 현재 프로토콜 확인
  return window.location.protocol === 'https:';
};

// API 기본 URL 설정 함수 (클라이언트 HTTPS → 서버 HTTPS)
export const getApiBaseURL = () => {
  const isHTTPS = isClientHTTPS();
  
  // 개발 환경에서는 서버 URL 직접 사용 (프록시 문제 해결)
  if (import.meta.env.DEV) {
    const serverIP = getServerIP();
    const serverPort = import.meta.env.VITE_SERVER_PORT || '7000';
    return `https://${serverIP}:${serverPort}`; // HTTPS 클라이언트 → HTTPS 서버 직접 연결
  }
  
  // 프로덕션 환경에서는 HTTPS URL 사용
  const serverIP = getServerIP();
  const serverPort = import.meta.env.VITE_SERVER_PORT || '7000';
  
  return `https://${serverIP}:${serverPort}`; // HTTPS → HTTPS
};

// axios 기본 설정 (화상통신 최적화)
export const configureAxios = () => {
  const baseURL = getApiBaseURL();
  const isHTTPS = isClientHTTPS();
  
  axios.defaults.baseURL = baseURL;
  
  // 화상통신용 타임아웃 설정
  axios.defaults.timeout = 30000; // 30초
  axios.defaults.maxContentLength = 100 * 1024 * 1024; // 100MB
  
  // HTTPS 환경에서 자체 서명 인증서 허용 (브라우저에서는 불필요)
  if (isHTTPS && typeof window === 'undefined') {
    // Node.js 환경에서만 httpsAgent 설정
    const https = require('https');
    axios.defaults.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  // Authorization 헤더 전역 설정 (중복 설정 방지)
  if (!configureAxios._tokenInterceptorAttached) {
    axios.interceptors.request.use((config) => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        console.log('🔐 API 요청 인터셉터 - Token:', token ? `${token.substring(0, 20)}...` : '없음');
        if (token) {
          config.headers = config.headers || {};
          if (!config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔐 Authorization 헤더 추가됨');
          }
        } else {
          console.warn('⚠️ Token이 없습니다 - 로그인이 필요할 수 있습니다');
        }
      } catch (error) {
        console.error('❌ API 요청 인터셉터 오류:', error);
      }
      return config;
    });
    
    // 응답 인터셉터 추가 - 401 에러 처리
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error('❌ 401 Unauthorized - Token이 유효하지 않거나 만료되었습니다');
          
          // 토큰 관련 정보 로그
          const token = localStorage.getItem('token');
          console.error('현재 저장된 Token:', token ? `${token.substring(0, 20)}...` : '없음');
          
          // 토큰이 만료되었으므로 로컬스토리지에서 제거
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // 로그인 페이지가 아닌 경우에만 리다이렉트
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            console.log('🚪 토큰 만료로 인한 자동 로그아웃 - 로그인 페이지로 이동');
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000); // 1초 후 리다이렉트 (에러 메시지를 볼 수 있도록)
          }
        }
        return Promise.reject(error);
      }
    );
    
    configureAxios._tokenInterceptorAttached = true;
  }
  
  console.log(`🔗 API Base URL 설정 (클라이언트 ${isHTTPS ? 'HTTPS' : 'HTTP'} → 서버 HTTPS):`, baseURL);
  return baseURL;
};

// Socket.IO URL 설정 함수 (클라이언트 HTTPS → 서버 WSS)
export const getWebSocketURL = () => {
  const isHTTPS = isClientHTTPS();
  
  // 개발 환경에서는 현재 호스트 사용 (LAN 접속 지원)
  if (import.meta.env.DEV) {
    // 클라이언트는 HTTPS이므로 서버도 WSS 사용
    const host = window.location.hostname;
    const serverPort = import.meta.env.VITE_SERVER_PORT || '7000';
    return `wss://${host}:${serverPort}`; // HTTPS 클라이언트 → WSS 서버
  }
  
  // 프로덕션 환경에서는 WSS URL 사용
  const serverIP = getServerIP();
  const serverPort = import.meta.env.VITE_SERVER_PORT || '7000';
  
  // HTTPS 환경에서는 WSS 사용 (WebRTC 필수)
  return `wss://${serverIP}:${serverPort}`; // WSS → WSS
};

// WebRTC 연결 상태 확인
export const checkWebRTCSupport = () => {
  const isHTTPS = isClientHTTPS();
  const support = {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    RTCPeerConnection: !!window.RTCPeerConnection,
    RTCSessionDescription: !!window.RTCSessionDescription,
    RTCIceCandidate: !!window.RTCIceCandidate,
    https: isHTTPS,
    wss: isHTTPS,
    secure: isHTTPS // WebRTC는 HTTPS 환경에서만 완전 지원
  };
  
  console.log('🎥 WebRTC 지원 상태:', support);
  
  // HTTPS가 아닌 경우 경고
  if (!isHTTPS) {
    console.warn('⚠️ WebRTC는 HTTPS 환경에서만 완전히 지원됩니다. 일부 기능이 제한될 수 있습니다.');
  }
  
  return support;
};
