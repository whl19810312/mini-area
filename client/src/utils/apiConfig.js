import axios from 'axios'

// 서버 IP 자동 감지 함수
const getServerIP = () => {
  // 환경 변수에서 서버 IP 가져오기
  if (import.meta.env.VITE_SERVER_IP) {
    return import.meta.env.VITE_SERVER_IP;
  }
  
  // 브라우저에서 현재 호스트 사용
  return window.location.hostname;
};

// API 기본 URL 설정 함수
export const getApiBaseURL = () => {
  // 개발 환경에서는 HTTPS 서버 URL 사용 (WebRTC 요구사항)
  if (import.meta.env.DEV) {
    const serverIP = getServerIP();
    const serverPort = import.meta.env.VITE_SERVER_PORT || '7000';
    return `https://${serverIP}:${serverPort}`;
  }
  
  // 프로덕션 환경에서도 HTTPS URL 사용
  const serverIP = getServerIP();
  const serverPort = import.meta.env.VITE_SERVER_PORT || '7000';
  
  return `https://${serverIP}:${serverPort}`;
};

// axios 기본 설정
export const configureAxios = () => {
  const baseURL = getApiBaseURL();
  const isHttps = baseURL.startsWith('https://');
  
  axios.defaults.baseURL = baseURL;
  axios.defaults.timeout = 30000; // 30초 (HTTPS는 더 오래 걸릴 수 있음)
  axios.defaults.maxContentLength = 100 * 1024 * 1024; // 100MB
  
  // HTTPS 환경에서 자체 서명 인증서 허용 (Node.js 환경에서만)
  if (isHttps && typeof window === 'undefined') {
    const https = require('https');
    axios.defaults.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  // Authorization 헤더 전역 설정
  if (!configureAxios._tokenInterceptorAttached) {
    axios.interceptors.request.use((config) => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          config.headers = config.headers || {};
          if (!config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (_) {}
      return config;
    });
    configureAxios._tokenInterceptorAttached = true;
  }
  
  console.log(`🔗 API Base URL 설정 (클라이언트 ${isHttps ? 'HTTPS' : 'HTTP'} → 서버 HTTPS):`, baseURL);
  return baseURL;
};

// Socket.IO URL 설정 함수
export const getWebSocketURL = () => {
  // 개발 환경에서는 현재 호스트 사용
  if (import.meta.env.DEV) {
    const host = window.location.hostname;
    const serverPort = import.meta.env.VITE_SERVER_PORT || '7000';
    return `wss://${host}:${serverPort}`;
  }
  
  // 프로덕션 환경에서는 WS URL 사용
  const serverIP = getServerIP();
  const serverPort = import.meta.env.VITE_SERVER_PORT || '7000';
  
  return `wss://${serverIP}:${serverPort}`;
};