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
  // 개발 환경에서는 서버 URL 직접 사용
  if (import.meta.env.DEV) {
    const serverIP = getServerIP();
    const serverPort = import.meta.env.VITE_SERVER_PORT || '3000';
    return `http://${serverIP}:${serverPort}`;
  }
  
  // 프로덕션 환경에서는 HTTP URL 사용
  const serverIP = getServerIP();
  const serverPort = import.meta.env.VITE_SERVER_PORT || '3000';
  
  return `http://${serverIP}:${serverPort}`;
};

// axios 기본 설정
export const configureAxios = () => {
  const baseURL = getApiBaseURL();
  
  axios.defaults.baseURL = baseURL;
  axios.defaults.timeout = 10000; // 10초
  axios.defaults.maxContentLength = 10 * 1024 * 1024; // 10MB

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
  
  console.log(`🔗 API Base URL 설정:`, baseURL);
  return baseURL;
};

// Socket.IO URL 설정 함수
export const getWebSocketURL = () => {
  // 개발 환경에서는 현재 호스트 사용
  if (import.meta.env.DEV) {
    const host = window.location.hostname;
    const serverPort = import.meta.env.VITE_SERVER_PORT || '3000';
    return `ws://${host}:${serverPort}`;
  }
  
  // 프로덕션 환경에서는 WS URL 사용
  const serverIP = getServerIP();
  const serverPort = import.meta.env.VITE_SERVER_PORT || '3000';
  
  return `ws://${serverIP}:${serverPort}`;
};