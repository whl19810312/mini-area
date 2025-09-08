#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}       온라인 사용자 정보만 초기화${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}이 스크립트는 서버를 재시작하여 메모리상의 사용자 정보만 초기화합니다.${NC}"
echo -e "${YELLOW}데이터베이스는 변경하지 않습니다.${NC}"
echo ""

# 서버 프로세스 찾기
SERVER_PID=$(pgrep -f "node.*server")

if [ -n "$SERVER_PID" ]; then
    echo -e "${BLUE}[1/2] 기존 서버 종료 중...${NC}"
    echo -e "서버 PID: $SERVER_PID"
    
    # SIGTERM 시그널 전송 (정상 종료)
    kill -TERM $SERVER_PID 2>/dev/null
    
    # 최대 5초 대기
    for i in {1..5}; do
        if ! kill -0 $SERVER_PID 2>/dev/null; then
            echo -e "${GREEN}✓ 서버가 정상적으로 종료되었습니다${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # 여전히 실행 중이면 강제 종료
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo ""
        echo -e "${YELLOW}강제 종료 중...${NC}"
        kill -KILL $SERVER_PID 2>/dev/null
        sleep 1
    fi
else
    echo -e "${YELLOW}실행 중인 서버를 찾을 수 없습니다.${NC}"
fi

echo ""
echo -e "${BLUE}[2/2] 서버 시작 중...${NC}"

cd "$PROJECT_ROOT"

if [ -f "package.json" ]; then
    # 서버 시작
    nohup npm start > server.log 2>&1 &
    NEW_PID=$!
    
    echo -e "새 서버 PID: $NEW_PID"
    echo -n "서버 시작 대기 중"
    
    # 서버 시작 대기 (최대 10초)
    for i in {1..10}; do
        echo -n "."
        sleep 1
        
        # 로그 파일에서 서버 시작 메시지 확인
        if grep -q "서버가.*실행 중" server.log 2>/dev/null || \
           grep -q "Server.*running" server.log 2>/dev/null || \
           grep -q "HTTPS.*7000" server.log 2>/dev/null; then
            echo ""
            echo -e "${GREEN}✓ 서버가 성공적으로 시작되었습니다!${NC}"
            break
        fi
    done
    
    echo ""
    
    # 서버 상태 확인
    if kill -0 $NEW_PID 2>/dev/null; then
        echo -e "${GREEN}✓ 서버 프로세스가 실행 중입니다${NC}"
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}       온라인 사용자 정보 초기화 완료!${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}서버 로그 확인:${NC} tail -f server.log"
        echo -e "${YELLOW}서버 상태 확인:${NC} ps aux | grep node"
    else
        echo -e "${RED}✗ 서버 시작 실패${NC}"
        echo -e "${YELLOW}서버 로그를 확인해주세요: cat server.log${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ package.json을 찾을 수 없습니다${NC}"
    echo -e "${YELLOW}프로젝트 루트 디렉토리: $PROJECT_ROOT${NC}"
    exit 1
fi