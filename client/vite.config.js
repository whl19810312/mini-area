import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// 환경 변수에서 서버 IP 가져오기
const SERVER_IP = process.env.VITE_SERVER_IP || 'localhost'
const SERVER_PORT = process.env.VITE_SERVER_PORT || '7000'

// SSL 인증서 경로 (클라이언트 ssl 폴더 사용)
const SSL_CERT_PATH = path.join(__dirname, 'ssl/cert.pem')
const SSL_KEY_PATH = path.join(__dirname, 'ssl/key.pem')

// SSL 인증서 존재 여부 확인
const hasSSL = fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // 0.0.0.0 바인딩 (LAN 접속용)
    port: 5173,          // 기본 포트
    strictPort: false,   // 포트 충돌 시 자동 변경 허용
    
    // HTTPS 설정 (SSL 인증서가 있는 경우)
    ...(hasSSL && {
      https: {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH)
      },
      port: 5174  // HTTPS 포트
    }),
    
    proxy: {
      '/api': {
        target: `https://${SERVER_IP}:${SERVER_PORT}`, // HTTPS → HTTPS (서버)
        changeOrigin: true,
        secure: false // 자체 서명 인증서 허용
      },
      // WebSocket 프록시 (화상통신용)
      '/private-area': {
        target: `wss://${SERVER_IP}:${SERVER_PORT}`, // WSS → WSS (서버)
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  },
  // 화상통신 최적화 설정
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          webrtc: ['socket.io-client']
        }
      }
    }
  },
  // 환경 변수 설정
  define: {
    __IS_HTTPS__: hasSSL
  }
}) 