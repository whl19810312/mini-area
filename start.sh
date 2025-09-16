#!/bin/bash

# Mini Area 개발 서버 시작 스크립트

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Mini Area 개발 서버를 시작합니다...${NC}\n"

# 환경 변수 확인
check_env() {
    echo -e "${YELLOW}📋 환경 설정 확인 중...${NC}"
    
    if [ ! -f "server/.env" ]; then
        echo -e "${RED}❌ server/.env 파일이 없습니다. install.sh를 먼저 실행하세요.${NC}"
        exit 1
    fi
    
    if [ ! -f "client/.env" ]; then
        echo -e "${RED}❌ client/.env 파일이 없습니다. install.sh를 먼저 실행하세요.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 환경 설정 확인 완료${NC}"
}

# 서비스 상태 확인
check_services() {
    echo -e "${YELLOW}🔍 필수 서비스 상태 확인 중...${NC}"
    
    # PostgreSQL 확인
    if ! pgrep -x "postgres" > /dev/null; then
        echo -e "${RED}❌ PostgreSQL이 실행되지 않았습니다. 시작합니다...${NC}"
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo systemctl start postgresql
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew services start postgresql
        fi
    else
        echo -e "${GREEN}✅ PostgreSQL 실행 중${NC}"
    fi
    
    # Redis 확인
    if ! pgrep -x "redis-server" > /dev/null; then
        echo -e "${RED}❌ Redis가 실행되지 않았습니다. 시작합니다...${NC}"
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo systemctl start redis-server
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew services start redis
        fi
    else
        echo -e "${GREEN}✅ Redis 실행 중${NC}"
    fi
}

# 개발 모드 시작
start_dev() {
    echo -e "\n${BLUE}🎯 개발 모드로 서버를 시작합니다...${NC}\n"
    
    # 로그 디렉토리 생성
    mkdir -p logs
    
    # tmux 세션 확인 및 생성
    if command -v tmux &> /dev/null; then
        echo -e "${YELLOW}📺 tmux 세션으로 서버를 시작합니다...${NC}"
        
        # 기존 세션 종료
        tmux kill-session -t miniarea 2>/dev/null || true
        
        # 새 세션 생성
        tmux new-session -d -s miniarea
        
        # 서버 창
        tmux rename-window -t miniarea:0 'server'
        tmux send-keys -t miniarea:server 'cd server && npm run dev' Enter
        
        # 클라이언트 창
        tmux new-window -t miniarea -n 'client'
        tmux send-keys -t miniarea:client 'cd client && npm run dev' Enter
        
        # 로그 창
        tmux new-window -t miniarea -n 'logs'
        tmux send-keys -t miniarea:logs 'tail -f logs/*.log server/logs/*.log 2>/dev/null || echo "로그 파일 대기 중..."' Enter
        
        echo -e "\n${GREEN}✅ 서버가 시작되었습니다!${NC}"
        echo -e "${YELLOW}📱 클라이언트: https://localhost:5173${NC}"
        echo -e "${YELLOW}🔧 API 서버: https://localhost:7000${NC}"
        echo -e "\n${BLUE}tmux 세션에 연결하려면: tmux attach -t miniarea${NC}"
        echo -e "${BLUE}세션을 종료하려면: ./stop.sh${NC}"
        
    else
        echo -e "${YELLOW}⚠️  tmux가 없습니다. 개별 터미널에서 실행하세요:${NC}"
        echo -e "${BLUE}터미널 1: cd server && npm run dev${NC}"
        echo -e "${BLUE}터미널 2: cd client && npm run dev${NC}"
        
        # 백그라운드에서 서버만 시작
        echo -e "\n${YELLOW}🔧 서버를 백그라운드에서 시작합니다...${NC}"
        cd server
        npm run dev > ../logs/server.log 2>&1 &
        SERVER_PID=$!
        echo $SERVER_PID > ../logs/server.pid
        cd ..
        
        echo -e "${GREEN}✅ 서버 시작됨 (PID: $SERVER_PID)${NC}"
        echo -e "${YELLOW}클라이언트는 수동으로 시작하세요: cd client && npm run dev${NC}"
    fi
}

# 프로덕션 모드 시작
start_prod() {
    echo -e "\n${BLUE}🏭 프로덕션 모드로 서버를 시작합니다...${NC}\n"
    
    # 클라이언트 빌드
    echo -e "${YELLOW}🔨 클라이언트 빌드 중...${NC}"
    cd client
    npm run build
    cd ..
    
    # PM2로 시작
    if command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js --env production
        echo -e "${GREEN}✅ 프로덕션 서버가 시작되었습니다!${NC}"
        echo -e "${YELLOW}📊 상태 확인: pm2 status${NC}"
        echo -e "${YELLOW}📋 로그 확인: pm2 logs${NC}"
    else
        echo -e "${RED}❌ PM2가 설치되지 않았습니다. install.sh를 먼저 실행하세요.${NC}"
        exit 1
    fi
}

# 메인 함수
main() {
    check_env
    check_services
    
    # 인자에 따른 모드 선택
    case "${1:-dev}" in
        "dev"|"development")
            start_dev
            ;;
        "prod"|"production")
            start_prod
            ;;
        *)
            echo -e "${RED}❌ 알 수 없는 모드: $1${NC}"
            echo -e "${YELLOW}사용법: $0 [dev|prod]${NC}"
            exit 1
            ;;
    esac
}

# 도움말
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Mini Area 서버 시작 스크립트"
    echo ""
    echo "사용법: $0 [모드]"
    echo ""
    echo "모드:"
    echo "  dev, development   개발 모드 (기본값)"
    echo "  prod, production   프로덕션 모드"
    echo ""
    echo "예제:"
    echo "  $0              # 개발 모드로 시작"
    echo "  $0 dev          # 개발 모드로 시작"
    echo "  $0 prod         # 프로덕션 모드로 시작"
    exit 0
fi

main "$@"