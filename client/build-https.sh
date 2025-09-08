#!/bin/bash

# Mini Area 클라이언트 HTTPS 빌드 스크립트 (클라이언트 내부)

echo "🔨 Mini Area 클라이언트 HTTPS 빌드..."

# SSL 인증서 확인
SSL_CERT="ssl/cert.pem"
SSL_KEY="ssl/key.pem"

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    echo "❌ SSL 인증서를 찾을 수 없습니다: $SSL_CERT, $SSL_KEY"
    echo "📝 SSL 인증서를 생성하려면 다음 명령을 실행하세요:"
    echo "   cd .. && ./generate-ssl.sh && cp ssl/* client/ssl/"
    echo ""
    echo "🔗 HTTP 모드로 빌드합니다..."
    npm run build
    exit 1
fi

echo "✅ SSL 인증서 확인 완료"
echo "🔒 HTTPS 모드로 클라이언트를 빌드합니다..."

# 환경 변수 설정
export VITE_SERVER_IP=${VITE_SERVER_IP:-"localhost"}
export VITE_SERVER_PORT=${VITE_SERVER_PORT:-"7000"}

echo "🌐 서버 IP: $VITE_SERVER_IP"
echo "🔌 서버 포트: $VITE_SERVER_PORT"
echo ""

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
fi

# HTTPS 모드로 빌드
echo "🔨 프로덕션 빌드 시작..."
npm run build:https

if [ $? -eq 0 ]; then
    echo "✅ 클라이언트 빌드 완료!"
    echo "📁 빌드 결과: dist/"
    echo ""
    echo "🚀 빌드된 클라이언트를 시작하려면:"
    echo "   npm run preview:https"
    echo ""
    echo "🌐 접속 URL: https://localhost:4174"
    echo "📱 LAN 접속: https://$(hostname -I | awk '{print $1}'):4174"
else
    echo "❌ 클라이언트 빌드 실패!"
    exit 1
fi





