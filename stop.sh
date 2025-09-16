#!/bin/bash

# Mini Area 서버 중지 스크립트

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🛑 Mini Area 서버를 중지합니다...${NC}\n"

# 개발 모드 중지
stop_dev() {
    echo -e "${YELLOW}🔧 개발 서버 중지 중...${NC}"
    
    # tmux 세션 종료
    if command -v tmux &> /dev/null; then
        tmux kill-session -t miniarea 2>/dev/null && echo -e "${GREEN}✅ tmux 세션 종료됨${NC}" || echo -e "${YELLOW}⚠️  tmux 세션이 없습니다${NC}"
    fi
    
    # PID 파일로 프로세스 종료
    if [ -f "logs/server.pid" ]; then
        SERVER_PID=$(cat logs/server.pid)
        if kill -0 $SERVER_PID 2>/dev/null; then
            kill $SERVER_PID
            echo -e "${GREEN}✅ 서버 프로세스 종료됨 (PID: $SERVER_PID)${NC}"
        fi
        rm -f logs/server.pid
    fi
    
    # Node.js 프로세스 종료 (안전장치)
    pkill -f "node.*server" 2>/dev/null && echo -e "${GREEN}✅ 남은 서버 프로세스 종료됨${NC}" || true
    pkill -f "vite.*dev" 2>/dev/null && echo -e "${GREEN}✅ 클라이언트 개발 서버 종료됨${NC}" || true
}

# 프로덕션 모드 중지
stop_prod() {
    echo -e "${YELLOW}🏭 프로덕션 서버 중지 중...${NC}"
    
    if command -v pm2 &> /dev/null; then
        pm2 stop ecosystem.config.js 2>/dev/null && echo -e "${GREEN}✅ PM2 프로세스 중지됨${NC}" || echo -e "${YELLOW}⚠️  실행 중인 PM2 프로세스가 없습니다${NC}"
        pm2 delete ecosystem.config.js 2>/dev/null && echo -e "${GREEN}✅ PM2 프로세스 삭제됨${NC}" || true
    else
        echo -e "${YELLOW}⚠️  PM2가 설치되지 않았습니다${NC}"
    fi
}

# 모든 관련 프로세스 강제 종료
force_stop() {
    echo -e "${RED}🔥 모든 관련 프로세스를 강제 종료합니다...${NC}"
    
    # Node.js 프로세스 강제 종료
    pkill -9 -f "node" 2>/dev/null && echo -e "${GREEN}✅ Node.js 프로세스 강제 종료됨${NC}" || true
    
    # PM2 데몬 종료
    if command -v pm2 &> /dev/null; then
        pm2 kill 2>/dev/null && echo -e "${GREEN}✅ PM2 데몬 종료됨${NC}" || true
    fi
    
    # 포트 점유 프로세스 확인 및 종료
    for port in 7000 5173; do
        PID=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$PID" ]; then
            kill -9 $PID 2>/dev/null && echo -e "${GREEN}✅ 포트 $port 프로세스 종료됨 (PID: $PID)${NC}" || true
        fi
    done
}

# 로그 정리
clean_logs() {
    if [[ "${1:-}" == "--clean-logs" ]]; then
        echo -e "${YELLOW}🧹 로그 파일 정리 중...${NC}"
        rm -rf logs/*.log server/logs/*.log client/logs/*.log 2>/dev/null || true
        echo -e "${GREEN}✅ 로그 파일 정리 완료${NC}"
    fi
}

# 상태 확인
check_status() {
    echo -e "\n${BLUE}📊 프로세스 상태 확인:${NC}"
    
    # Node.js 프로세스 확인
    NODE_PROCS=$(pgrep -f "node" 2>/dev/null || true)
    if [ -n "$NODE_PROCS" ]; then
        echo -e "${YELLOW}⚠️  실행 중인 Node.js 프로세스가 있습니다:${NC}"
        ps aux | grep -E "(node|npm)" | grep -v grep
    else
        echo -e "${GREEN}✅ Node.js 프로세스 없음${NC}"
    fi
    
    # PM2 상태 확인
    if command -v pm2 &> /dev/null; then
        PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[].pm2_env.status' 2>/dev/null || echo "")
        if [ -n "$PM2_STATUS" ] && [ "$PM2_STATUS" != "null" ]; then
            echo -e "${YELLOW}⚠️  PM2 프로세스 상태:${NC}"
            pm2 status
        else
            echo -e "${GREEN}✅ PM2 프로세스 없음${NC}"
        fi
    fi
    
    # 포트 점유 상태 확인
    echo -e "\n${BLUE}🔍 포트 사용 상태:${NC}"
    for port in 7000 5173; do
        if lsof -i:$port &>/dev/null; then
            echo -e "${YELLOW}⚠️  포트 $port 사용 중:${NC}"
            lsof -i:$port
        else
            echo -e "${GREEN}✅ 포트 $port 사용 가능${NC}"
        fi
    done
}

# 메인 함수
main() {
    case "${1:-normal}" in
        "dev"|"development")
            stop_dev
            ;;
        "prod"|"production")
            stop_prod
            ;;
        "force"|"--force")
            force_stop
            ;;
        "normal"|"")
            stop_dev
            stop_prod
            ;;
        "status"|"--status")
            check_status
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 알 수 없는 옵션: $1${NC}"
            echo -e "${YELLOW}사용법: $0 [옵션]${NC}"
            exit 1
            ;;
    esac
    
    clean_logs "$2"
    check_status
    
    echo -e "\n${GREEN}🎯 Mini Area 서버 중지 완료!${NC}"
}

# 도움말
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Mini Area 서버 중지 스크립트"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  dev, development   개발 서버만 중지"
    echo "  prod, production   프로덕션 서버만 중지"
    echo "  force, --force     모든 관련 프로세스 강제 종료"
    echo "  status, --status   프로세스 상태만 확인"
    echo "  --clean-logs       로그 파일도 함께 정리"
    echo ""
    echo "예제:"
    echo "  $0                 # 모든 서버 중지"
    echo "  $0 dev             # 개발 서버만 중지"
    echo "  $0 force           # 강제 종료"
    echo "  $0 status          # 상태 확인"
    echo "  $0 dev --clean-logs # 개발 서버 중지 + 로그 정리"
    exit 0
fi

main "$@"