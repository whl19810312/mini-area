#!/bin/bash

# Mini Area 관리 스크립트
# 서버와 클라이언트 통합 관리

# set -e 제거 - 오류 발생시에도 스크립트 계속 실행

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_PID_FILE="$PROJECT_DIR/.server.pid"
CLIENT_PID_FILE="$PROJECT_DIR/.client.pid"
LOG_DIR="$PROJECT_DIR/logs"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR" 2>/dev/null || true

# 헬프 메시지
show_help() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}              Mini Area 관리 스크립트                    ${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}사용법:${NC} ./miniarea.sh [명령어]"
    echo ""
    echo -e "${GREEN}[전체 관리]${NC}"
    echo "  start         - 전체 시작 (서버 + 클라이언트)"
    echo "  stop          - 전체 중지"
    echo "  restart       - 전체 재시작"
    echo ""
    echo -e "${GREEN}[서버 관리]${NC}"
    echo "  server-start  - 서버만 시작"
    echo "  server-stop   - 서버만 중지"
    echo "  server-restart- 서버만 재시작"
    echo ""
    echo -e "${GREEN}[클라이언트 관리]${NC}"
    echo "  client-start  - 클라이언트만 시작"
    echo "  client-stop   - 클라이언트만 중지"
    echo "  client-restart- 클라이언트만 재시작"
    echo ""
    echo -e "${GREEN}[상태 및 설치]${NC}"
    echo "  status        - 전체 상태 확인"
    echo "  install       - 의존성 설치"
    echo "  db-status     - 데이터베이스 상태 확인"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 의존성 설치
install_dependencies() {
    echo -e "${BLUE}📦 의존성 설치 시작...${NC}"
    
    # Node.js 버전 확인
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js가 설치되어 있지 않습니다.${NC}"
        echo "Node.js 16.0.0 이상을 설치해주세요."
        return 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    echo -e "${GREEN}✅ Node.js 버전: v$NODE_VERSION${NC}"
    
    # 서버 의존성 설치
    echo -e "${YELLOW}📦 서버 의존성 설치 중...${NC}"
    npm install || {
        echo -e "${RED}❌ 서버 의존성 설치 실패${NC}"
    }
    
    # 클라이언트 의존성 설치
    echo -e "${YELLOW}📦 클라이언트 의존성 설치 중...${NC}"
    if [ -d "client" ]; then
        cd client && npm install || {
            echo -e "${RED}❌ 클라이언트 의존성 설치 실패${NC}"
        }
        cd ..
    else
        echo -e "${YELLOW}⚠️  client 디렉토리가 없습니다${NC}"
    fi
    
    # .env 파일 생성 (없을 경우)
    if [ ! -f .env ]; then
        echo -e "${YELLOW}📝 서버 .env 파일 생성 중...${NC}"
        if [ -f .env.example ]; then
            cp .env.example .env
        else
            cat > .env << EOF
# Server Configuration
PORT=7000
SESSION_SECRET=your-secret-key-$(openssl rand -hex 16 2>/dev/null || echo "change-me")

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=miniarea
DB_USER=postgres
DB_PASSWORD=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secret
JWT_SECRET=jwt-secret-$(openssl rand -hex 32 2>/dev/null || echo "change-me")

# STUN/TURN Servers
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=
TURN_USERNAME=
TURN_PASSWORD=
EOF
        fi
        echo -e "${GREEN}✅ 서버 .env 파일 생성 완료${NC}"
    fi
    
    # 클라이언트 .env 파일 생성 (없을 경우)
    if [ ! -f client/.env ] && [ -d "client" ]; then
        echo -e "${YELLOW}📝 클라이언트 .env 파일 생성 중...${NC}"
        cat > client/.env << EOF
# API URLs
VITE_API_URL=https://localhost:7000
VITE_WS_URL=wss://localhost:7000

# Application Settings
VITE_APP_NAME=Mini Area
VITE_MAX_USERS_PER_ROOM=10
VITE_ENABLE_DEBUG=false
EOF
        echo -e "${GREEN}✅ 클라이언트 .env 파일 생성 완료${NC}"
    fi
    
    # 데이터베이스 초기화
    echo -e "${YELLOW}🗄️  데이터베이스 초기화 중...${NC}"
    if [ -f server/init-db.js ]; then
        cd server && node init-db.js 2>/dev/null || {
            echo -e "${YELLOW}⚠️  데이터베이스 초기화 실패. PostgreSQL이 실행 중인지 확인하세요.${NC}"
        }
        cd ..
    else
        echo -e "${YELLOW}⚠️  init-db.js 파일이 없습니다. 건너뛰기...${NC}"
    fi
    
    echo -e "${GREEN}✅ 설치 완료!${NC}"
    return 0
}

# 서버 시작
start_server() {
    echo -e "${BLUE}🚀 서버 시작 중...${NC}"
    
    # 이미 실행 중인지 확인
    if [ -f "$SERVER_PID_FILE" ]; then
        PID=$(cat "$SERVER_PID_FILE" 2>/dev/null)
        if [ ! -z "$PID" ] && ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  서버가 이미 실행 중입니다 (PID: $PID)${NC}"
            return 0
        fi
    fi
    
    # 포트 확인
    PORT_PID=$(lsof -ti:7000 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo -e "${YELLOW}⚠️  포트 7000이 이미 사용 중입니다 (PID: $PORT_PID)${NC}"
        return 0
    fi
    
    # 서버 시작
    if [ -f server/index.js ]; then
        nohup node server/index.js > "$LOG_DIR/server.log" 2>&1 &
        SERVER_PID=$!
        echo $SERVER_PID > "$SERVER_PID_FILE"
        
        sleep 2
        
        if ps -p $SERVER_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 서버 시작 완료 (PID: $SERVER_PID)${NC}"
            echo -e "${BLUE}   주소: https://localhost:7000${NC}"
        else
            echo -e "${RED}❌ 서버 시작 실패${NC}"
            rm -f "$SERVER_PID_FILE"
            return 1
        fi
    else
        echo -e "${RED}❌ server/index.js 파일이 없습니다${NC}"
        return 1
    fi
    
    return 0
}

# 서버 중지
stop_server() {
    echo -e "${BLUE}🛑 서버 중지 중...${NC}"
    
    local stopped=false
    
    # PID 파일로 중지
    if [ -f "$SERVER_PID_FILE" ]; then
        PID=$(cat "$SERVER_PID_FILE" 2>/dev/null)
        if [ ! -z "$PID" ] && ps -p $PID > /dev/null 2>&1; then
            kill $PID 2>/dev/null || true
            sleep 2
            
            # 강제 종료 필요시
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID 2>/dev/null || true
            fi
            
            echo -e "${GREEN}✅ 서버 중지 완료${NC}"
            stopped=true
        fi
        rm -f "$SERVER_PID_FILE"
    fi
    
    # 포트 기준으로 중지
    PORT_PID=$(lsof -ti:7000 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        kill $PORT_PID 2>/dev/null || true
        echo -e "${GREEN}✅ 서버 프로세스 중지 완료${NC}"
        stopped=true
    fi
    
    if [ "$stopped" = false ]; then
        echo -e "${YELLOW}⚠️  실행 중인 서버가 없습니다${NC}"
    fi
    
    return 0
}

# 서버 재시작
restart_server() {
    echo -e "${BLUE}🔄 서버 재시작 중...${NC}"
    stop_server
    sleep 1
    start_server
    return 0
}

# 클라이언트 시작
start_client() {
    echo -e "${BLUE}🎨 클라이언트 시작 중...${NC}"
    
    # 이미 실행 중인지 확인
    CLIENT_PORT_PID=$(lsof -ti:5173 2>/dev/null)
    if [ ! -z "$CLIENT_PORT_PID" ]; then
        echo -e "${YELLOW}⚠️  클라이언트가 이미 실행 중입니다 (PID: $CLIENT_PORT_PID)${NC}"
        return 0
    fi
    
    # 클라이언트 디렉토리 확인
    if [ ! -d "client" ]; then
        echo -e "${RED}❌ client 디렉토리가 없습니다${NC}"
        return 1
    fi
    
    # 클라이언트 개발 서버 시작
    cd client
    nohup npm run dev > "$LOG_DIR/client.log" 2>&1 &
    CLIENT_PID=$!
    echo $CLIENT_PID > "$CLIENT_PID_FILE"
    cd ..
    
    sleep 3
    
    CLIENT_PORT_PID=$(lsof -ti:5173 2>/dev/null)
    if [ ! -z "$CLIENT_PORT_PID" ]; then
        echo -e "${GREEN}✅ 클라이언트 시작 완료 (PID: $CLIENT_PORT_PID)${NC}"
        echo -e "${BLUE}   주소: http://localhost:5173${NC}"
    else
        echo -e "${RED}❌ 클라이언트 시작 실패${NC}"
        rm -f "$CLIENT_PID_FILE"
        return 1
    fi
    
    return 0
}

# 클라이언트 중지
stop_client() {
    echo -e "${BLUE}🛑 클라이언트 중지 중...${NC}"
    
    local stopped=false
    
    # PID 파일로 중지
    if [ -f "$CLIENT_PID_FILE" ]; then
        PID=$(cat "$CLIENT_PID_FILE" 2>/dev/null)
        if [ ! -z "$PID" ] && ps -p $PID > /dev/null 2>&1; then
            kill $PID 2>/dev/null || true
            stopped=true
        fi
        rm -f "$CLIENT_PID_FILE"
    fi
    
    # 포트 5173 프로세스 중지
    CLIENT_PORT_PID=$(lsof -ti:5173 2>/dev/null)
    if [ ! -z "$CLIENT_PORT_PID" ]; then
        kill $CLIENT_PORT_PID 2>/dev/null || true
        echo -e "${GREEN}✅ 클라이언트 중지 완료${NC}"
        stopped=true
    else
        if [ "$stopped" = false ]; then
            echo -e "${YELLOW}⚠️  실행 중인 클라이언트가 없습니다${NC}"
        fi
    fi
    
    return 0
}

# 클라이언트 재시작
restart_client() {
    echo -e "${BLUE}🔄 클라이언트 재시작 중...${NC}"
    stop_client
    sleep 1
    start_client
    return 0
}

# 전체 시작
start_all() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}                    전체 서비스 시작                      ${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    start_server
    echo ""
    start_client
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 모든 서비스 시작 프로세스 완료!${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    return 0
}

# 전체 중지
stop_all() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}                    전체 서비스 중지                      ${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    stop_server
    stop_client
    
    echo ""
    echo -e "${GREEN}✅ 모든 서비스 중지 프로세스 완료${NC}"
    return 0
}

# 전체 재시작
restart_all() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}                   전체 서비스 재시작                     ${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    stop_all
    sleep 2
    start_all
    return 0
}

# 상태 확인
check_status() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}                    서비스 상태 확인                      ${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # 서버 상태
    echo -e "${YELLOW}[서버 상태]${NC}"
    SERVER_RUNNING=false
    if [ -f "$SERVER_PID_FILE" ]; then
        PID=$(cat "$SERVER_PID_FILE" 2>/dev/null)
        if [ ! -z "$PID" ] && ps -p $PID > /dev/null 2>&1; then
            echo -e "${GREEN}  ✅ 실행 중 (PID: $PID)${NC}"
            SERVER_RUNNING=true
        else
            echo -e "${RED}  ❌ 중지됨${NC}"
        fi
    else
        PORT_PID=$(lsof -ti:7000 2>/dev/null)
        if [ ! -z "$PORT_PID" ]; then
            echo -e "${GREEN}  ✅ 실행 중 (PID: $PORT_PID)${NC}"
            SERVER_RUNNING=true
        else
            echo -e "${RED}  ❌ 중지됨${NC}"
        fi
    fi
    
    # 클라이언트 상태
    echo ""
    echo -e "${YELLOW}[클라이언트 상태]${NC}"
    CLIENT_RUNNING=false
    CLIENT_PORT_PID=$(lsof -ti:5173 2>/dev/null)
    if [ ! -z "$CLIENT_PORT_PID" ]; then
        echo -e "${GREEN}  ✅ 실행 중 (PID: $CLIENT_PORT_PID)${NC}"
        CLIENT_RUNNING=true
    else
        echo -e "${RED}  ❌ 중지됨${NC}"
    fi
    
    # PostgreSQL 상태
    echo ""
    echo -e "${YELLOW}[PostgreSQL 상태]${NC}"
    if command -v systemctl &> /dev/null; then
        if systemctl is-active --quiet postgresql 2>/dev/null; then
            echo -e "${GREEN}  ✅ 실행 중${NC}"
        else
            echo -e "${RED}  ❌ 중지됨${NC}"
        fi
    else
        # macOS 또는 systemctl이 없는 경우
        if command -v pg_isready &> /dev/null; then
            if pg_isready -q 2>/dev/null; then
                echo -e "${GREEN}  ✅ 실행 중${NC}"
            else
                echo -e "${RED}  ❌ 중지됨${NC}"
            fi
        else
            echo -e "${YELLOW}  ⚠️  상태 확인 불가${NC}"
        fi
    fi
    
    # Redis 상태
    echo ""
    echo -e "${YELLOW}[Redis 상태]${NC}"
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}  ✅ 실행 중${NC}"
        else
            echo -e "${YELLOW}  ⚠️  중지됨 또는 접근 불가${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠️  Redis가 설치되지 않음${NC}"
    fi
    
    # 접속 정보
    if [ "$SERVER_RUNNING" = true ] || [ "$CLIENT_RUNNING" = true ]; then
        echo ""
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}[접속 주소]${NC}"
        
        if [ "$SERVER_RUNNING" = true ]; then
            echo -e "${BLUE}  🌐 서버: https://localhost:7000${NC}"
        fi
        
        if [ "$CLIENT_RUNNING" = true ]; then
            echo -e "${BLUE}  🌐 클라이언트: http://localhost:5173${NC}"
        fi
    fi
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    return 0
}

# 데이터베이스 상태
check_db_status() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}                  데이터베이스 상태 확인                  ${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # PostgreSQL 상태
    echo -e "${YELLOW}[PostgreSQL]${NC}"
    PG_RUNNING=false
    
    if command -v systemctl &> /dev/null; then
        if systemctl is-active --quiet postgresql 2>/dev/null; then
            echo -e "${GREEN}  ✅ 서비스: 실행 중${NC}"
            PG_RUNNING=true
        else
            echo -e "${RED}  ❌ 서비스: 중지됨${NC}"
        fi
    elif command -v pg_isready &> /dev/null; then
        if pg_isready -q 2>/dev/null; then
            echo -e "${GREEN}  ✅ 서비스: 실행 중${NC}"
            PG_RUNNING=true
        else
            echo -e "${RED}  ❌ 서비스: 중지됨${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠️  PostgreSQL 상태 확인 불가${NC}"
    fi
    
    # 연결 테스트
    if [ "$PG_RUNNING" = true ] && [ -f .env ]; then
        source .env 2>/dev/null
        if [ ! -z "$DB_NAME" ]; then
            export PGPASSWORD=$DB_PASSWORD
            if psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -d ${DB_NAME:-miniarea} -c "\l" > /dev/null 2>&1; then
                echo -e "${GREEN}  ✅ 연결: 성공${NC}"
                echo -e "${BLUE}  📊 데이터베이스: ${DB_NAME:-miniarea}${NC}"
                echo -e "${BLUE}  👤 사용자: ${DB_USER:-postgres}${NC}"
                echo -e "${BLUE}  🏠 호스트: ${DB_HOST:-localhost}:${DB_PORT:-5432}${NC}"
            else
                echo -e "${RED}  ❌ 연결: 실패${NC}"
                echo -e "${YELLOW}  ⚠️  .env 파일의 데이터베이스 설정을 확인하세요${NC}"
            fi
            unset PGPASSWORD
        fi
    elif [ "$PG_RUNNING" = false ]; then
        echo ""
        echo -e "${YELLOW}  PostgreSQL을 시작하려면:${NC}"
        if command -v systemctl &> /dev/null; then
            echo -e "${CYAN}    sudo systemctl start postgresql${NC}"
        else
            echo -e "${CYAN}    brew services start postgresql (macOS)${NC}"
        fi
    fi
    
    # Redis 상태
    echo ""
    echo -e "${YELLOW}[Redis]${NC}"
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}  ✅ 서비스: 실행 중${NC}"
            echo -e "${GREEN}  ✅ 연결: 성공${NC}"
        else
            echo -e "${YELLOW}  ⚠️  서비스: 중지됨 또는 접근 불가${NC}"
            echo ""
            echo -e "${YELLOW}  Redis를 시작하려면:${NC}"
            if command -v systemctl &> /dev/null; then
                echo -e "${CYAN}    sudo systemctl start redis${NC}"
            else
                echo -e "${CYAN}    brew services start redis (macOS)${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}  ⚠️  Redis가 설치되지 않음${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    return 0
}

# 메인 스크립트
main() {
    case "$1" in
        # 전체 관리
        start)
            start_all
            ;;
        stop)
            stop_all
            ;;
        restart)
            restart_all
            ;;
        
        # 서버 관리
        server-start)
            start_server
            ;;
        server-stop)
            stop_server
            ;;
        server-restart)
            restart_server
            ;;
        
        # 클라이언트 관리
        client-start)
            start_client
            ;;
        client-stop)
            stop_client
            ;;
        client-restart)
            restart_client
            ;;
        
        # 상태 및 설치
        status)
            check_status
            ;;
        install)
            install_dependencies
            ;;
        db-status)
            check_db_status
            ;;
        
        # 도움말
        help|"")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 알 수 없는 명령어: $1${NC}"
            echo ""
            show_help
            return 1
            ;;
    esac
    
    return $?
}

# 스크립트 실행
main "$@"
exit $?