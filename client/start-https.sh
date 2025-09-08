#!/bin/bash

# Mini Area 클라이언트 HTTPS 개발 서버 시작 스크립트 (클라이언트 내부)

echo "🚀 Mini Area 클라이언트 HTTPS 개발 서버 시작..."

# SSL 인증서 확인
SSL_CERT="ssl/cert.pem"
SSL_KEY="ssl/key.pem"

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    echo "❌ SSL 인증서를 찾을 수 없습니다: $SSL_CERT, $SSL_KEY"
    echo "📝 SSL 인증서를 생성하려면 다음 명령을 실행하세요:"
    echo "   cd .. && ./generate-ssl.sh && cp ssl/* client/ssl/"
    echo ""
    echo "🔗 HTTP 모드로 시작합니다..."
    npm run dev
    exit 1
fi

echo "✅ SSL 인증서 확인 완료"
echo "🔒 HTTPS 모드로 개발 서버를 시작합니다..."

# 환경 변수 설정
export VITE_SERVER_IP=${VITE_SERVER_IP:-"localhost"}
export VITE_SERVER_PORT=${VITE_SERVER_PORT:-"7000"}

echo "🌐 서버 IP: $VITE_SERVER_IP"
echo "🔌 서버 포트: $VITE_SERVER_PORT"
echo "🔗 클라이언트 HTTPS 포트: 5174"
echo ""

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
fi

# HTTPS 모드로 개발 서버 시작
echo "🚀 Vite 개발 서버 시작 중..."
npm run dev:https

echo "✅ 클라이언트 HTTPS 개발 서버가 시작되었습니다!"
echo "🌐 접속 URL: https://localhost:5174"
echo "📱 LAN 접속: https://$(hostname -I | awk '{print $1}'):5174"





