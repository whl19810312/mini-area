#!/bin/bash

#############################################
# Mini Area 통합 관리 시스템
# 
# 모든 기능을 하나로 통합한 단일 관리 스크립트
# 사용법: ./miniarea.sh [명령어] [옵션]
#############################################

set -e

# 버전 정보
VERSION="3.0.0"
PLATFORM_NAME="Mini Area Platform"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 경로 설정
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 디렉토리 설정
LOG_DIR="$SCRIPT_DIR/logs"
BACKUP_DIR="$SCRIPT_DIR/backups"
CONFIG_DIR="$SCRIPT_DIR/configs"
TEMP_DIR="$SCRIPT_DIR/temp"
PID_DIR="$SCRIPT_DIR/.pids"
SSL_DIR="$SCRIPT_DIR/ssl"
UPLOADS_DIR="$SCRIPT_DIR/uploads"
RECORDINGS_DIR="$SCRIPT_DIR/recordings"

# 로그 파일
MAIN_LOG="$LOG_DIR/miniarea.log"
INSTALL_LOG="$LOG_DIR/install.log"
SERVICE_LOG="$LOG_DIR/services.log"
ERROR_LOG="$LOG_DIR/error.log"

# PID 파일
SERVER_PID="$PID_DIR/server.pid"
CLIENT_PID="$PID_DIR/client.pid"
REDIS_PID="$PID_DIR/redis.pid"
POSTGRES_PID="$PID_DIR/postgres.pid"
JANUS_PID="$PID_DIR/janus.pid"

# 서비스 포트
PORT_SERVER=7000
PORT_CLIENT=5173
PORT_POSTGRES=5432
PORT_REDIS=6379
PORT_JANUS_WS=8188
PORT_JANUS_HTTP=8088

# 설정 파일
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"

#############################################
# 초기화
#############################################

init_directories() {
    mkdir -p "$LOG_DIR" "$BACKUP_DIR" "$CONFIG_DIR" "$TEMP_DIR" "$PID_DIR" "$SSL_DIR"
    mkdir -p "$UPLOADS_DIR" "$RECORDINGS_DIR"
}

init_directories

#############################################
# 유틸리티 함수
#############################################

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$MAIN_LOG"
    
    case $level in
        ERROR)
            echo "[$timestamp] $message" >> "$ERROR_LOG"
            echo -e "${RED}✗ $message${NC}"
            ;;
        SUCCESS)
            echo -e "${GREEN}✓ $message${NC}"
            ;;
        WARNING)
            echo -e "${YELLOW}⚠ $message${NC}"
            ;;
        INFO)
            echo -e "${CYAN}ℹ $message${NC}"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

print_header() {
    clear
    echo -e "${PURPLE}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                                                                    ║${NC}"
    echo -e "${PURPLE}║${WHITE}              Mini Area Platform Manager v${VERSION}                  ${PURPLE}║${NC}"
    echo -e "${PURPLE}║${WHITE}                   통합 관리 시스템                                  ${PURPLE}║${NC}"
    echo -e "${PURPLE}║                                                                    ║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

print_menu() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}주요 명령어${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "  ${GREEN}install${NC}          전체 시스템 초기 설정 및 설치"
    echo -e "  ${GREEN}start${NC}            모든 서비스 시작"
    echo -e "  ${GREEN}stop${NC}             모든 서비스 중지"
    echo -e "  ${GREEN}restart${NC}          모든 서비스 재시작"
    echo -e "  ${GREEN}status${NC}           서비스 상태 확인"
    echo
    echo -e "${WHITE}개별 서비스 관리${NC}"
    echo -e "  ${BLUE}./db-redis.sh${NC}    데이터베이스 & Redis 관리 (별도 스크립트)"
    echo -e "                   사용법: ./db-redis.sh help"
    echo
    echo -e "  ${BLUE}redis${NC}            Redis 관리는 ./db-redis.sh 사용"
    echo
    echo -e "  ${BLUE}server start${NC}     Node.js 서버 시작"
    echo -e "  ${BLUE}server stop${NC}      Node.js 서버 중지"
    echo -e "  ${BLUE}server logs${NC}      서버 로그 보기"
    echo
    echo -e "  ${BLUE}client start${NC}     React 클라이언트 시작"
    echo -e "  ${BLUE}client stop${NC}      React 클라이언트 중지"
    echo -e "  ${BLUE}client build${NC}     클라이언트 빌드"
    echo -e "  ${BLUE}client logs${NC}      클라이언트 로그 보기"
    echo
    echo -e "  ${BLUE}janus start${NC}      Janus Gateway 시작"
    echo -e "  ${BLUE}janus stop${NC}       Janus Gateway 중지"
    echo -e "  ${BLUE}janus logs${NC}       Janus 로그 보기"
    echo
    echo -e "${WHITE}모니터링 & 진단${NC}"
    echo -e "  ${YELLOW}monitor${NC}          실시간 모니터링 대시보드"
    echo -e "  ${YELLOW}logs${NC}             통합 로그 보기"
    echo -e "  ${YELLOW}health${NC}           헬스 체크"
    echo -e "  ${YELLOW}doctor${NC}           시스템 진단"
    echo -e "  ${YELLOW}fix${NC}              자동 문제 해결"
    echo -e "  ${YELLOW}test${NC}             연결 테스트"
    echo
    echo -e "${WHITE}유지보수${NC}"
    echo -e "  ${PURPLE}backup${NC}           전체 백업"
    echo -e "  ${PURPLE}restore${NC}          백업 복원"
    echo -e "  ${PURPLE}update${NC}           시스템 업데이트"
    echo -e "  ${PURPLE}clean${NC}            캐시 및 로그 정리"
    echo -e "  ${PURPLE}reset${NC}            시스템 초기화"
    echo -e "  ${PURPLE}config${NC}           설정 편집"
    echo
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "사용법: ${GREEN}./miniarea.sh [명령어] [옵션]${NC}"
    echo -e "도움말: ${GREEN}./miniarea.sh help${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_command() {
    command -v $1 &> /dev/null
}

get_ip() {
    ip addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d'/' -f1 | head -n1 || echo "localhost"
}

check_port() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
}

confirm() {
    local message=$1
    echo -e "${YELLOW}$message (y/n)${NC}"
    read -p "> " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

#############################################
# 시스템 요구사항 체크
#############################################

check_system_requirements() {
    log INFO "시스템 요구사항 확인 중..."
    
    local errors=0
    
    # OS 확인
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log SUCCESS "운영체제: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log SUCCESS "운영체제: macOS"
    else
        log ERROR "지원되지 않는 운영체제: $OSTYPE"
        ((errors++))
    fi
    
    # 메모리 확인
    local total_mem=$(free -m 2>/dev/null | awk 'NR==2{print $2}' || sysctl hw.memsize 2>/dev/null | awk '{print $2/1024/1024}')
    if [ -n "$total_mem" ] && [ "$total_mem" -ge 2048 ]; then
        log SUCCESS "메모리: ${total_mem}MB"
    else
        log WARNING "메모리 부족: 최소 2GB 필요 (현재: ${total_mem}MB)"
    fi
    
    # 디스크 공간 확인
    local available_space=$(df -m . | awk 'NR==2{print $4}')
    if [ "$available_space" -ge 5120 ]; then
        log SUCCESS "디스크 공간: ${available_space}MB"
    else
        log WARNING "디스크 공간 부족: 최소 5GB 필요 (현재: ${available_space}MB)"
    fi
    
    # 필수 명령어 확인
    local required_commands=("git" "curl" "wget" "tar" "make")
    for cmd in "${required_commands[@]}"; do
        if check_command $cmd; then
            log SUCCESS "$cmd: 설치됨"
        else
            log ERROR "$cmd: 설치 필요"
            ((errors++))
        fi
    done
    
    return $errors
}

#############################################
# 설치 함수
#############################################

install_nodejs() {
    log INFO "Node.js 설치 확인 중..."
    
    if check_command node; then
        local node_version=$(node -v)
        log SUCCESS "Node.js 설치됨: $node_version"
        
        # 버전 확인
        local required_version=16
        local current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$current_version" -lt "$required_version" ]; then
            log WARNING "Node.js 버전 업그레이드 필요 (현재: v$current_version, 필요: v$required_version+)"
            
            if confirm "Node.js를 업그레이드하시겠습니까?"; then
                install_nodejs_via_nvm
            fi
        fi
    else
        log WARNING "Node.js가 설치되어 있지 않습니다"
        if confirm "Node.js를 설치하시겠습니까?"; then
            install_nodejs_via_nvm
        else
            return 1
        fi
    fi
    
    # npm 확인
    if check_command npm; then
        local npm_version=$(npm -v)
        log SUCCESS "npm 설치됨: v$npm_version"
    else
        log ERROR "npm이 설치되어 있지 않습니다"
        return 1
    fi
}

install_nodejs_via_nvm() {
    log INFO "NVM을 통해 Node.js 설치 중..."
    
    # NVM 설치
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # NVM 로드
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Node.js 18 LTS 설치
    nvm install 18
    nvm use 18
    nvm alias default 18
    
    log SUCCESS "Node.js 18 LTS 설치 완료"
}

install_postgresql() {
    log INFO "PostgreSQL 설치 확인 중..."
    
    if check_command psql; then
        local pg_version=$(psql --version | awk '{print $3}')
        log SUCCESS "PostgreSQL 설치됨: $pg_version"
    else
        log WARNING "PostgreSQL이 설치되어 있지 않습니다"
        
        if confirm "PostgreSQL을 설치하시겠습니까?"; then
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                # Ubuntu/Debian
                sudo apt-get update
                sudo apt-get install -y postgresql postgresql-contrib
                sudo systemctl start postgresql
                sudo systemctl enable postgresql
            elif [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                brew install postgresql
                brew services start postgresql
            fi
            
            log SUCCESS "PostgreSQL 설치 완료"
        else
            return 1
        fi
    fi
}

install_redis() {
    log INFO "Redis 설치 확인 중..."
    
    if check_command redis-server; then
        local redis_version=$(redis-server --version | awk '{print $3}' | cut -d'=' -f2)
        log SUCCESS "Redis 설치됨: $redis_version"
    else
        log WARNING "Redis가 설치되어 있지 않습니다"
        
        if confirm "Redis를 설치하시겠습니까?"; then
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                # Ubuntu/Debian
                sudo apt-get update
                sudo apt-get install -y redis-server
                sudo systemctl start redis-server
                sudo systemctl enable redis-server
            elif [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                brew install redis
                brew services start redis
            fi
            
            log SUCCESS "Redis 설치 완료"
        else
            return 1
        fi
    fi
}

install_docker() {
    log INFO "Docker 설치 확인 중..."
    
    if check_command docker; then
        local docker_version=$(docker --version | awk '{print $3}' | cut -d',' -f1)
        log SUCCESS "Docker 설치됨: $docker_version"
    else
        log WARNING "Docker가 설치되어 있지 않습니다"
        
        if confirm "Docker를 설치하시겠습니까?"; then
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                # Docker 설치 스크립트
                curl -fsSL https://get.docker.com -o get-docker.sh
                sudo sh get-docker.sh
                sudo usermod -aG docker $USER
                rm get-docker.sh
                
                # Docker Compose 설치
                sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                sudo chmod +x /usr/local/bin/docker-compose
            elif [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                log INFO "Docker Desktop을 https://www.docker.com/products/docker-desktop 에서 다운로드하세요"
                return 1
            fi
            
            log SUCCESS "Docker 설치 완료"
        else
            return 1
        fi
    fi
    
    # Docker Compose 확인
    if check_command docker-compose; then
        local compose_version=$(docker-compose --version | awk '{print $3}' | cut -d',' -f1)
        log SUCCESS "Docker Compose 설치됨: $compose_version"
    fi
}

install_dependencies() {
    log INFO "npm 패키지 설치 중..."
    
    # 서버 의존성
    if [ -f "package.json" ]; then
        log INFO "서버 패키지 설치 중..."
        npm install --production >> "$INSTALL_LOG" 2>&1 &
        spinner $!
        log SUCCESS "서버 패키지 설치 완료"
    fi
    
    # 클라이언트 의존성
    if [ -d "client" ] && [ -f "client/package.json" ]; then
        log INFO "클라이언트 패키지 설치 중..."
        (cd client && npm install >> "$INSTALL_LOG" 2>&1) &
        spinner $!
        log SUCCESS "클라이언트 패키지 설치 완료"
    fi
}

#############################################
# 데이터베이스 관리
#############################################

setup_database() {
    log INFO "데이터베이스 설정 중..."
    
    # PostgreSQL 상태 확인
    if ! check_port $PORT_POSTGRES; then
        log WARNING "PostgreSQL이 실행 중이지 않습니다. 시작 중..."
        start_postgres
    fi
    
    # 데이터베이스 생성
    log INFO "데이터베이스 생성 중..."
    
    # .env 파일에서 DB 정보 읽기
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
        
        # 데이터베이스 존재 확인
        if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
            log SUCCESS "데이터베이스 '$DB_NAME'이 이미 존재합니다"
        else
            # 데이터베이스 생성
            PGPASSWORD="$DB_PASSWORD" createdb -h localhost -U "$DB_USER" "$DB_NAME" 2>/dev/null || {
                log WARNING "기본 사용자로 데이터베이스 생성 실패. postgres 사용자로 시도 중..."
                sudo -u postgres createdb "$DB_NAME"
                sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
            }
            log SUCCESS "데이터베이스 '$DB_NAME' 생성 완료"
        fi
        
        # 테이블 마이그레이션
        log INFO "데이터베이스 마이그레이션 실행 중..."
        npm run setup-db 2>/dev/null || {
            log WARNING "마이그레이션 스크립트 실행 실패. 수동으로 테이블 생성 중..."
            node server/init-db.js 2>/dev/null || true
        }
        log SUCCESS "데이터베이스 설정 완료"
    else
        log ERROR ".env 파일을 찾을 수 없습니다"
        return 1
    fi
}

backup_database() {
    log INFO "데이터베이스 백업 중..."
    
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
        
        local backup_file="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
        
        PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U "$DB_USER" "$DB_NAME" > "$backup_file"
        
        if [ -f "$backup_file" ]; then
            # 압축
            gzip "$backup_file"
            log SUCCESS "데이터베이스 백업 완료: ${backup_file}.gz"
        else
            log ERROR "데이터베이스 백업 실패"
            return 1
        fi
    else
        log ERROR ".env 파일을 찾을 수 없습니다"
        return 1
    fi
}

restore_database() {
    log INFO "데이터베이스 복원..."
    
    # 백업 파일 목록 표시
    local backups=($(ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null))
    
    if [ ${#backups[@]} -eq 0 ]; then
        log ERROR "백업 파일이 없습니다"
        return 1
    fi
    
    echo "사용 가능한 백업:"
    for i in "${!backups[@]}"; do
        local backup_name=$(basename "${backups[$i]}")
        echo "  $((i+1))) $backup_name"
    done
    
    read -p "복원할 백업 선택 (1-${#backups[@]}): " choice
    
    if [ "$choice" -ge 1 ] && [ "$choice" -le "${#backups[@]}" ]; then
        local selected_backup="${backups[$((choice-1))]}"
        
        if confirm "정말로 데이터베이스를 복원하시겠습니까? 현재 데이터는 모두 삭제됩니다."; then
            source "$ENV_FILE"
            
            # 현재 DB 백업
            backup_database
            
            # 압축 해제
            local temp_sql="$TEMP_DIR/restore.sql"
            gunzip -c "$selected_backup" > "$temp_sql"
            
            # 복원
            PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" "$DB_NAME" < "$temp_sql"
            
            rm "$temp_sql"
            log SUCCESS "데이터베이스 복원 완료"
        fi
    else
        log ERROR "잘못된 선택"
        return 1
    fi
}

#############################################
# 서비스 관리 함수
#############################################

start_postgres() {
    log INFO "PostgreSQL 시작 중..."
    
    if check_port $PORT_POSTGRES; then
        log SUCCESS "PostgreSQL이 이미 실행 중입니다"
        return 0
    fi
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    fi
    
    sleep 2
    
    if check_port $PORT_POSTGRES; then
        log SUCCESS "PostgreSQL 시작 완료"
    else
        log ERROR "PostgreSQL 시작 실패"
        return 1
    fi
}

stop_postgres() {
    log INFO "PostgreSQL 중지 중..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl stop postgresql
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services stop postgresql
    fi
    
    log SUCCESS "PostgreSQL 중지 완료"
}

start_redis() {
    log INFO "Redis 시작 중..."
    
    if check_port $PORT_REDIS; then
        log SUCCESS "Redis가 이미 실행 중입니다"
        return 0
    fi
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start redis-server
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start redis
    else
        redis-server --daemonize yes --dir "$SCRIPT_DIR/redis-data" --logfile "$LOG_DIR/redis.log"
    fi
    
    sleep 1
    
    if check_port $PORT_REDIS; then
        log SUCCESS "Redis 시작 완료"
    else
        log ERROR "Redis 시작 실패"
        return 1
    fi
}

stop_redis() {
    log INFO "Redis 중지 중..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl stop redis-server
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services stop redis
    else
        redis-cli shutdown 2>/dev/null || true
    fi
    
    log SUCCESS "Redis 중지 완료"
}

start_server() {
    log INFO "Node.js 서버 시작 중..."
    
    if [ -f "$SERVER_PID" ]; then
        local pid=$(cat "$SERVER_PID")
        if ps -p $pid > /dev/null 2>&1; then
            log SUCCESS "서버가 이미 실행 중입니다 (PID: $pid)"
            return 0
        fi
    fi
    
    # 환경 변수 로드
    if [ -f "$ENV_FILE" ]; then
        set -a
        source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | grep -v '^#')
        set +a
    fi
    
    # 서버 시작
    nohup npm run server > "$LOG_DIR/server.log" 2>&1 &
    local pid=$!
    echo $pid > "$SERVER_PID"
    
    sleep 3
    
    if ps -p $pid > /dev/null 2>&1; then
        log SUCCESS "서버 시작 완료 (PID: $pid)"
        log INFO "서버 URL: https://localhost:$PORT_SERVER"
    else
        log ERROR "서버 시작 실패"
        tail -10 "$LOG_DIR/server.log"
        return 1
    fi
}

stop_server() {
    log INFO "Node.js 서버 중지 중..."
    
    if [ -f "$SERVER_PID" ]; then
        local pid=$(cat "$SERVER_PID")
        if ps -p $pid > /dev/null 2>&1; then
            kill -TERM $pid 2>/dev/null
            sleep 2
            
            # 강제 종료
            if ps -p $pid > /dev/null 2>&1; then
                kill -KILL $pid 2>/dev/null
            fi
            
            rm -f "$SERVER_PID"
            log SUCCESS "서버 중지 완료"
        else
            rm -f "$SERVER_PID"
            log INFO "서버가 실행 중이지 않습니다"
        fi
    else
        # PID 파일이 없으면 프로세스 이름으로 종료
        pkill -f "node.*server/index.js" 2>/dev/null || true
        log SUCCESS "서버 프로세스 정리 완료"
    fi
}

start_client() {
    log INFO "React 클라이언트 시작 중..."
    
    if [ -f "$CLIENT_PID" ]; then
        local pid=$(cat "$CLIENT_PID")
        if ps -p $pid > /dev/null 2>&1; then
            log SUCCESS "클라이언트가 이미 실행 중입니다 (PID: $pid)"
            return 0
        fi
    fi
    
    # 클라이언트 시작
    cd client
    nohup npm run dev > "$LOG_DIR/client.log" 2>&1 &
    local pid=$!
    echo $pid > "$CLIENT_PID"
    cd ..
    
    sleep 5
    
    if ps -p $pid > /dev/null 2>&1; then
        log SUCCESS "클라이언트 시작 완료 (PID: $pid)"
        log INFO "클라이언트 URL: https://localhost:$PORT_CLIENT"
    else
        log ERROR "클라이언트 시작 실패"
        tail -10 "$LOG_DIR/client.log"
        return 1
    fi
}

stop_client() {
    log INFO "React 클라이언트 중지 중..."
    
    if [ -f "$CLIENT_PID" ]; then
        local pid=$(cat "$CLIENT_PID")
        if ps -p $pid > /dev/null 2>&1; then
            kill -TERM $pid 2>/dev/null
            rm -f "$CLIENT_PID"
            log SUCCESS "클라이언트 중지 완료"
        else
            rm -f "$CLIENT_PID"
            log INFO "클라이언트가 실행 중이지 않습니다"
        fi
    else
        # PID 파일이 없으면 프로세스 이름으로 종료
        pkill -f "vite" 2>/dev/null || true
        log SUCCESS "클라이언트 프로세스 정리 완료"
    fi
}

build_client() {
    log INFO "React 클라이언트 빌드 중..."
    
    cd client
    npm run build >> "$LOG_DIR/build.log" 2>&1
    cd ..
    
    if [ -d "client/dist" ]; then
        log SUCCESS "클라이언트 빌드 완료"
        log INFO "빌드 출력: client/dist"
    else
        log ERROR "클라이언트 빌드 실패"
        tail -10 "$LOG_DIR/build.log"
        return 1
    fi
}

start_janus() {
    log INFO "Janus Gateway 시작 중..."
    
    if ! check_command docker; then
        log WARNING "Docker가 설치되어 있지 않아 Janus를 시작할 수 없습니다"
        return 1
    fi
    
    if docker ps | grep -q janus-gateway; then
        log SUCCESS "Janus Gateway가 이미 실행 중입니다"
        return 0
    fi
    
    # Docker Compose 파일 확인
    if [ ! -f "docker-compose-janus.yml" ]; then
        log WARNING "Janus Docker Compose 파일이 없습니다"
        return 1
    fi
    
    # Janus 시작
    export DOCKER_IP=$(get_ip)
    docker-compose -f docker-compose-janus.yml up -d
    
    sleep 3
    
    if docker ps | grep -q janus-gateway; then
        log SUCCESS "Janus Gateway 시작 완료"
        log INFO "Janus WebSocket: ws://$DOCKER_IP:$PORT_JANUS_WS"
    else
        log ERROR "Janus Gateway 시작 실패"
        docker logs janus-gateway 2>&1 | tail -10
        return 1
    fi
}

stop_janus() {
    log INFO "Janus Gateway 중지 중..."
    
    if [ -f "docker-compose-janus.yml" ]; then
        docker-compose -f docker-compose-janus.yml down
        log SUCCESS "Janus Gateway 중지 완료"
    else
        docker stop janus-gateway 2>/dev/null || true
        docker rm janus-gateway 2>/dev/null || true
        log SUCCESS "Janus 컨테이너 정리 완료"
    fi
}

start_all_services() {
    print_header
    echo -e "${CYAN}모든 서비스를 시작합니다...${NC}"
    echo
    
    local failed=0
    
    # 1. 데이터베이스 & Redis (별도 스크립트로 관리)
    log INFO "데이터베이스와 Redis는 ./db-redis.sh all-start 명령으로 시작하세요"
    echo
    
    # 3. Janus (선택적)
    if [ -f "docker-compose-janus.yml" ]; then
        start_janus || log WARNING "Janus 시작 실패 (선택적 서비스)"
        echo
    fi
    
    # 4. Node.js 서버
    start_server || ((failed++))
    echo
    
    # 5. React 클라이언트
    start_client || ((failed++))
    echo
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                    모든 서비스가 시작되었습니다!                     ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
        echo
        show_access_info
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                일부 서비스 시작에 실패했습니다                       ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════════════╝${NC}"
        echo
        log INFO "./miniarea.sh status 명령으로 상태를 확인하세요"
    fi
}

stop_all_services() {
    print_header
    echo -e "${CYAN}모든 서비스를 중지합니다...${NC}"
    echo
    
    stop_client
    stop_server
    stop_janus
    log INFO "데이터베이스와 Redis는 ./db-redis.sh all-stop 명령으로 중지하세요"
    
    echo
    log SUCCESS "모든 서비스가 중지되었습니다"
}

restart_all_services() {
    stop_all_services
    echo
    sleep 3
    start_all_services
}

#############################################
# 상태 확인 함수
#############################################

check_service_status() {
    local service_name=$1
    local port=$2
    local pid_file=$3
    
    echo -n "  $service_name: "
    
    if [ -n "$pid_file" ] && [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}● 실행 중${NC} (PID: $pid)"
            return 0
        fi
    fi
    
    if [ -n "$port" ] && check_port $port; then
        echo -e "${GREEN}● 실행 중${NC} (포트: $port)"
        return 0
    fi
    
    echo -e "${RED}● 중지됨${NC}"
    return 1
}

show_status() {
    print_header
    echo -e "${CYAN}서비스 상태${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    
    echo -e "${WHITE}주요 서비스${NC}"
    check_service_status "PostgreSQL" "$PORT_POSTGRES" ""
    check_service_status "Redis" "$PORT_REDIS" ""
    check_service_status "Node.js Server" "$PORT_SERVER" "$SERVER_PID"
    check_service_status "React Client" "$PORT_CLIENT" "$CLIENT_PID"
    
    # Janus 상태 (Docker)
    echo -n "  Janus Gateway: "
    if docker ps 2>/dev/null | grep -q janus-gateway; then
        echo -e "${GREEN}● 실행 중${NC} (Docker)"
    else
        echo -e "${YELLOW}● 중지됨${NC} (선택적)"
    fi
    
    echo
    echo -e "${WHITE}네트워크 포트${NC}"
    echo "  사용 중인 포트:"
    netstat -tuln 2>/dev/null | grep -E ":(${PORT_SERVER}|${PORT_CLIENT}|${PORT_POSTGRES}|${PORT_REDIS}|${PORT_JANUS_WS}|${PORT_JANUS_HTTP})" | while read line; do
        local port=$(echo $line | awk '{print $4}' | rev | cut -d: -f1 | rev)
        case $port in
            $PORT_SERVER) echo "    • $port: Node.js Server" ;;
            $PORT_CLIENT) echo "    • $port: React Client" ;;
            $PORT_POSTGRES) echo "    • $port: PostgreSQL" ;;
            $PORT_REDIS) echo "    • $port: Redis" ;;
            $PORT_JANUS_WS) echo "    • $port: Janus WebSocket" ;;
            $PORT_JANUS_HTTP) echo "    • $port: Janus HTTP" ;;
        esac
    done
    
    echo
    echo -e "${WHITE}시스템 리소스${NC}"
    echo -n "  CPU 사용률: "
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 || echo "N/A"
    
    echo -n "  메모리 사용: "
    free -h 2>/dev/null | grep "^Mem" | awk '{print $3 " / " $2}' || echo "N/A"
    
    echo -n "  디스크 사용: "
    df -h . | tail -1 | awk '{print $3 " / " $2 " (" $5 ")"}' || echo "N/A"
    
    echo
    show_access_info
}

show_access_info() {
    local ip=$(get_ip)
    
    echo -e "${WHITE}접속 정보${NC}"
    echo -e "${CYAN}────────────────────────────────────────────────────────────────────${NC}"
    echo -e "  클라이언트:    ${GREEN}https://localhost:${PORT_CLIENT}${NC}"
    echo -e "  서버 API:      ${GREEN}https://localhost:${PORT_SERVER}${NC}"
    echo -e "  외부 접속:     ${GREEN}https://${ip}:${PORT_CLIENT}${NC}"
    
    if docker ps 2>/dev/null | grep -q janus-gateway; then
        echo -e "  Janus WS:      ${GREEN}ws://${ip}:${PORT_JANUS_WS}${NC}"
    fi
    echo -e "${CYAN}────────────────────────────────────────────────────────────────────${NC}"
}

#############################################
# 모니터링 함수
#############################################

monitor_realtime() {
    print_header
    echo -e "${CYAN}실시간 모니터링 (Ctrl+C로 종료)${NC}"
    echo
    
    while true; do
        clear
        print_header
        echo -e "${CYAN}실시간 모니터링 - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo
        
        # 서비스 상태
        echo -e "${WHITE}서비스 상태${NC}"
        check_service_status "PostgreSQL" "$PORT_POSTGRES" ""
        check_service_status "Redis" "$PORT_REDIS" ""
        check_service_status "Node.js Server" "$PORT_SERVER" "$SERVER_PID"
        check_service_status "React Client" "$PORT_CLIENT" "$CLIENT_PID"
        echo
        
        # CPU 사용률 Top 5
        echo -e "${WHITE}CPU 사용률 Top 5${NC}"
        ps aux | sort -rn -k 3 | head -6 | tail -5 | awk '{printf "  %-20s %5s%%\n", substr($11,1,20), $3}'
        echo
        
        # 메모리 사용률 Top 5
        echo -e "${WHITE}메모리 사용률 Top 5${NC}"
        ps aux | sort -rn -k 4 | head -6 | tail -5 | awk '{printf "  %-20s %5s%%\n", substr($11,1,20), $4}'
        echo
        
        # 최근 로그
        echo -e "${WHITE}최근 로그 (server.log)${NC}"
        if [ -f "$LOG_DIR/server.log" ]; then
            tail -5 "$LOG_DIR/server.log" | sed 's/^/  /'
        else
            echo "  로그 파일 없음"
        fi
        
        echo
        echo -e "${YELLOW}5초 후 새로고침...${NC}"
        sleep 5
    done
}

show_logs() {
    local service=$1
    
    case $service in
        server)
            log INFO "서버 로그 표시 (Ctrl+C로 종료)"
            tail -f "$LOG_DIR/server.log" 2>/dev/null || log ERROR "서버 로그 파일이 없습니다"
            ;;
        client)
            log INFO "클라이언트 로그 표시 (Ctrl+C로 종료)"
            tail -f "$LOG_DIR/client.log" 2>/dev/null || log ERROR "클라이언트 로그 파일이 없습니다"
            ;;
        redis)
            log INFO "Redis 로그 표시 (Ctrl+C로 종료)"
            tail -f "$LOG_DIR/redis.log" 2>/dev/null || log ERROR "Redis 로그 파일이 없습니다"
            ;;
        postgres)
            log INFO "PostgreSQL 로그 표시 (Ctrl+C로 종료)"
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                sudo tail -f /var/log/postgresql/*.log 2>/dev/null
            else
                log WARNING "PostgreSQL 로그 위치를 확인하세요"
            fi
            ;;
        janus)
            log INFO "Janus 로그 표시 (Ctrl+C로 종료)"
            docker logs -f janus-gateway 2>&1
            ;;
        all|"")
            log INFO "모든 로그 표시 (Ctrl+C로 종료)"
            tail -f "$LOG_DIR"/*.log 2>/dev/null
            ;;
        *)
            log ERROR "알 수 없는 서비스: $service"
            log INFO "사용 가능: server, client, redis, postgres, janus, all"
            ;;
    esac
}

#############################################
# 헬스 체크 함수
#############################################

health_check() {
    print_header
    echo -e "${CYAN}시스템 헬스 체크${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    
    local health_score=100
    local issues=()
    
    # 1. 서비스 체크
    echo -e "${WHITE}서비스 상태 검사${NC}"
    
    if ! check_port $PORT_POSTGRES; then
        ((health_score-=20))
        issues+=("PostgreSQL이 실행되지 않음")
        echo -e "  PostgreSQL: ${RED}✗${NC}"
    else
        echo -e "  PostgreSQL: ${GREEN}✓${NC}"
    fi
    
    if ! check_port $PORT_REDIS; then
        ((health_score-=15))
        issues+=("Redis가 실행되지 않음")
        echo -e "  Redis: ${RED}✗${NC}"
    else
        echo -e "  Redis: ${GREEN}✓${NC}"
    fi
    
    if ! check_port $PORT_SERVER; then
        ((health_score-=25))
        issues+=("Node.js 서버가 실행되지 않음")
        echo -e "  Node.js Server: ${RED}✗${NC}"
    else
        echo -e "  Node.js Server: ${GREEN}✓${NC}"
        
        # API 헬스 체크
        if curl -sk -f "https://localhost:$PORT_SERVER/api/health" > /dev/null 2>&1; then
            echo -e "  API Health: ${GREEN}✓${NC}"
        else
            ((health_score-=10))
            issues+=("API 헬스 체크 실패")
            echo -e "  API Health: ${RED}✗${NC}"
        fi
    fi
    
    if ! check_port $PORT_CLIENT; then
        ((health_score-=20))
        issues+=("React 클라이언트가 실행되지 않음")
        echo -e "  React Client: ${RED}✗${NC}"
    else
        echo -e "  React Client: ${GREEN}✓${NC}"
    fi
    
    echo
    
    # 2. 리소스 체크
    echo -e "${WHITE}시스템 리소스 검사${NC}"
    
    # 메모리 체크
    local mem_usage=$(free 2>/dev/null | grep Mem | awk '{print int($3/$2 * 100)}')
    if [ -n "$mem_usage" ]; then
        if [ "$mem_usage" -gt 90 ]; then
            ((health_score-=10))
            issues+=("메모리 사용률이 90% 초과")
            echo -e "  메모리: ${RED}${mem_usage}%${NC}"
        elif [ "$mem_usage" -gt 80 ]; then
            ((health_score-=5))
            issues+=("메모리 사용률이 80% 초과")
            echo -e "  메모리: ${YELLOW}${mem_usage}%${NC}"
        else
            echo -e "  메모리: ${GREEN}${mem_usage}%${NC}"
        fi
    fi
    
    # 디스크 체크
    local disk_usage=$(df . | tail -1 | awk '{print int($5)}')
    if [ "$disk_usage" -gt 90 ]; then
        ((health_score-=10))
        issues+=("디스크 사용률이 90% 초과")
        echo -e "  디스크: ${RED}${disk_usage}%${NC}"
    elif [ "$disk_usage" -gt 80 ]; then
        ((health_score-=5))
        issues+=("디스크 사용률이 80% 초과")
        echo -e "  디스크: ${YELLOW}${disk_usage}%${NC}"
    else
        echo -e "  디스크: ${GREEN}${disk_usage}%${NC}"
    fi
    
    echo
    
    # 3. 파일 체크
    echo -e "${WHITE}필수 파일 검사${NC}"
    
    if [ ! -f "$ENV_FILE" ]; then
        ((health_score-=15))
        issues+=(".env 파일이 없음")
        echo -e "  .env: ${RED}✗${NC}"
    else
        echo -e "  .env: ${GREEN}✓${NC}"
    fi
    
    if [ ! -f "package.json" ]; then
        ((health_score-=10))
        issues+=("package.json 파일이 없음")
        echo -e "  package.json: ${RED}✗${NC}"
    else
        echo -e "  package.json: ${GREEN}✓${NC}"
    fi
    
    if [ ! -d "node_modules" ]; then
        ((health_score-=10))
        issues+=("node_modules가 설치되지 않음")
        echo -e "  node_modules: ${RED}✗${NC}"
    else
        echo -e "  node_modules: ${GREEN}✓${NC}"
    fi
    
    echo
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 헬스 점수 표시
    echo
    if [ $health_score -ge 90 ]; then
        echo -e "${GREEN}헬스 점수: ${health_score}/100 - 매우 좋음${NC}"
    elif [ $health_score -ge 70 ]; then
        echo -e "${YELLOW}헬스 점수: ${health_score}/100 - 양호${NC}"
    elif [ $health_score -ge 50 ]; then
        echo -e "${YELLOW}헬스 점수: ${health_score}/100 - 주의 필요${NC}"
    else
        echo -e "${RED}헬스 점수: ${health_score}/100 - 문제 있음${NC}"
    fi
    
    # 발견된 문제 표시
    if [ ${#issues[@]} -gt 0 ]; then
        echo
        echo -e "${WHITE}발견된 문제:${NC}"
        for issue in "${issues[@]}"; do
            echo -e "  ${YELLOW}• $issue${NC}"
        done
        
        echo
        echo -e "${CYAN}문제 해결을 위해 './miniarea.sh fix' 명령을 실행하세요${NC}"
    else
        echo
        echo -e "${GREEN}시스템이 정상적으로 작동 중입니다!${NC}"
    fi
}

#############################################
# 진단 및 수정 함수
#############################################

system_doctor() {
    print_header
    echo -e "${CYAN}시스템 진단을 시작합니다...${NC}"
    echo
    
    local problems=0
    
    # 1. 필수 프로그램 확인
    echo -e "${WHITE}필수 프로그램 확인${NC}"
    local required_commands=("node" "npm" "git" "psql" "redis-cli")
    for cmd in "${required_commands[@]}"; do
        if check_command $cmd; then
            echo -e "  $cmd: ${GREEN}✓ 설치됨${NC}"
        else
            echo -e "  $cmd: ${RED}✗ 설치 필요${NC}"
            ((problems++))
        fi
    done
    echo
    
    # 2. 설정 파일 확인
    echo -e "${WHITE}설정 파일 확인${NC}"
    local config_files=(".env" "package.json" "client/package.json")
    for file in "${config_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  $file: ${GREEN}✓ 존재${NC}"
        else
            echo -e "  $file: ${RED}✗ 없음${NC}"
            ((problems++))
        fi
    done
    echo
    
    # 3. 포트 충돌 확인
    echo -e "${WHITE}포트 충돌 확인${NC}"
    local ports=($PORT_SERVER $PORT_CLIENT $PORT_POSTGRES $PORT_REDIS)
    for port in "${ports[@]}"; do
        if check_port $port; then
            local process=$(lsof -i :$port | tail -1 | awk '{print $1}')
            echo -e "  포트 $port: ${YELLOW}사용 중 ($process)${NC}"
        else
            echo -e "  포트 $port: ${GREEN}✓ 사용 가능${NC}"
        fi
    done
    echo
    
    # 4. 디렉토리 권한 확인
    echo -e "${WHITE}디렉토리 권한 확인${NC}"
    local dirs=("$LOG_DIR" "$BACKUP_DIR" "$UPLOADS_DIR" "$RECORDINGS_DIR")
    for dir in "${dirs[@]}"; do
        if [ -w "$dir" ]; then
            echo -e "  $dir: ${GREEN}✓ 쓰기 가능${NC}"
        else
            echo -e "  $dir: ${RED}✗ 쓰기 불가${NC}"
            ((problems++))
        fi
    done
    echo
    
    # 진단 결과
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if [ $problems -eq 0 ]; then
        echo -e "${GREEN}시스템 진단 완료: 문제가 발견되지 않았습니다${NC}"
    else
        echo -e "${YELLOW}시스템 진단 완료: ${problems}개의 문제가 발견되었습니다${NC}"
        echo -e "${CYAN}문제 해결을 위해 './miniarea.sh fix' 명령을 실행하세요${NC}"
    fi
}

auto_fix() {
    print_header
    echo -e "${CYAN}자동 문제 해결을 시작합니다...${NC}"
    echo
    
    # 1. 디렉토리 생성 및 권한 수정
    log INFO "디렉토리 생성 및 권한 수정 중..."
    init_directories
    chmod -R 755 "$LOG_DIR" "$BACKUP_DIR" "$UPLOADS_DIR" "$RECORDINGS_DIR" 2>/dev/null
    log SUCCESS "디렉토리 권한 수정 완료"
    echo
    
    # 2. .env 파일 생성
    if [ ! -f "$ENV_FILE" ]; then
        log INFO ".env 파일 생성 중..."
        if [ -f "$ENV_EXAMPLE" ]; then
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            log SUCCESS ".env 파일 생성 완료 (.env.example에서 복사)"
        else
            create_default_env
            log SUCCESS ".env 파일 생성 완료 (기본값)"
        fi
    fi
    echo
    
    # 3. npm 패키지 재설치
    if [ ! -d "node_modules" ] || [ ! -d "client/node_modules" ]; then
        log INFO "npm 패키지 재설치 중..."
        install_dependencies
    fi
    echo
    
    # 4. 데이터베이스 재설정
    if ! check_port $PORT_POSTGRES; then
        log INFO "PostgreSQL 시작 시도 중..."
        start_postgres
    fi
    echo
    
    # 5. Redis 재시작
    if ! check_port $PORT_REDIS; then
        log INFO "Redis 시작 시도 중..."
        start_redis
    fi
    echo
    
    # 6. SSL 인증서 생성
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        log INFO "SSL 인증서 생성 중..."
        openssl req -x509 -newkey rsa:4096 -nodes -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" -days 365 \
            -subj "/C=KR/ST=Seoul/L=Seoul/O=MiniArea/CN=localhost" 2>/dev/null
        log SUCCESS "SSL 인증서 생성 완료"
    fi
    echo
    
    log SUCCESS "자동 문제 해결 완료"
    echo
    log INFO "시스템 상태를 다시 확인하려면 './miniarea.sh health' 명령을 실행하세요"
}

#############################################
# 백업 및 복원
#############################################

backup_system() {
    print_header
    echo -e "${CYAN}시스템 백업을 시작합니다...${NC}"
    echo
    
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # 1. 데이터베이스 백업
    log INFO "데이터베이스 백업 중..."
    backup_database
    
    # 2. 설정 파일 백업
    log INFO "설정 파일 백업 중..."
    cp "$ENV_FILE" "$backup_path/" 2>/dev/null
    cp -r janus-config "$backup_path/" 2>/dev/null
    cp docker-compose*.yml "$backup_path/" 2>/dev/null
    
    # 3. 업로드 파일 백업
    log INFO "업로드 파일 백업 중..."
    if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A $UPLOADS_DIR)" ]; then
        tar -czf "$backup_path/uploads.tar.gz" -C "$SCRIPT_DIR" uploads/
    fi
    
    # 4. 백업 정보 저장
    cat > "$backup_path/backup_info.txt" << EOF
백업 일시: $(date)
백업 이름: $backup_name
시스템 버전: $VERSION
Node.js 버전: $(node -v)
PostgreSQL 버전: $(psql --version | awk '{print $3}')
Redis 버전: $(redis-server --version | awk '{print $3}' | cut -d'=' -f2)
EOF
    
    # 5. 전체 백업 압축
    log INFO "백업 압축 중..."
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_name"
    cd - > /dev/null
    
    log SUCCESS "백업 완료: $BACKUP_DIR/${backup_name}.tar.gz"
    
    # 오래된 백업 정리
    log INFO "오래된 백업 정리 중..."
    find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +30 -delete
    log SUCCESS "30일 이상 된 백업 삭제 완료"
}

restore_system() {
    print_header
    echo -e "${CYAN}시스템 복원${NC}"
    echo
    
    # 백업 목록 표시
    local backups=($(ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null))
    
    if [ ${#backups[@]} -eq 0 ]; then
        log ERROR "백업 파일이 없습니다"
        return 1
    fi
    
    echo "사용 가능한 백업:"
    for i in "${!backups[@]}"; do
        local backup_name=$(basename "${backups[$i]}" .tar.gz)
        local backup_date=$(echo $backup_name | cut -d'_' -f2,3 | sed 's/_/ /')
        local backup_size=$(du -h "${backups[$i]}" | cut -f1)
        echo "  $((i+1))) $backup_date ($backup_size)"
    done
    echo
    
    read -p "복원할 백업 선택 (1-${#backups[@]}): " choice
    
    if [ "$choice" -ge 1 ] && [ "$choice" -le "${#backups[@]}" ]; then
        local selected_backup="${backups[$((choice-1))]}"
        
        if confirm "정말로 시스템을 복원하시겠습니까? 현재 데이터는 백업됩니다."; then
            # 현재 상태 백업
            log INFO "현재 상태를 백업 중..."
            backup_system
            
            # 백업 압축 해제
            local temp_restore="$TEMP_DIR/restore_$(date +%s)"
            mkdir -p "$temp_restore"
            tar -xzf "$selected_backup" -C "$temp_restore"
            
            local backup_name=$(basename "$selected_backup" .tar.gz)
            local restore_path="$temp_restore/$backup_name"
            
            # 서비스 중지
            log INFO "서비스 중지 중..."
            stop_all_services
            
            # 설정 파일 복원
            log INFO "설정 파일 복원 중..."
            cp "$restore_path/.env" . 2>/dev/null
            cp -r "$restore_path/janus-config" . 2>/dev/null
            cp "$restore_path"/docker-compose*.yml . 2>/dev/null
            
            # 데이터베이스 복원
            log INFO "데이터베이스 복원 중..."
            if [ -f "$BACKUP_DIR"/db_backup_*.sql.gz ]; then
                restore_database
            fi
            
            # 업로드 파일 복원
            if [ -f "$restore_path/uploads.tar.gz" ]; then
                log INFO "업로드 파일 복원 중..."
                rm -rf "$UPLOADS_DIR"
                tar -xzf "$restore_path/uploads.tar.gz" -C "$SCRIPT_DIR"
            fi
            
            # 임시 파일 정리
            rm -rf "$temp_restore"
            
            log SUCCESS "시스템 복원 완료"
            
            # 서비스 재시작
            if confirm "서비스를 다시 시작하시겠습니까?"; then
                start_all_services
            fi
        fi
    else
        log ERROR "잘못된 선택"
        return 1
    fi
}

#############################################
# 환경 설정 함수
#############################################

create_default_env() {
    cat > "$ENV_FILE" << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/mini_area
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mini_area
DB_USER=postgres
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=your-very-secure-jwt-secret-key-change-this
SESSION_SECRET=your-session-secret-key-change-this

# Server Configuration
NODE_ENV=development
PORT=7000
SERVER_URL=https://localhost:7000
CLIENT_URL=https://localhost:5173

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# WebRTC Configuration (Optional)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Janus Gateway Configuration (Optional)
JANUS_URL=ws://localhost:8188
JANUS_SECRET=
JANUS_API_SECRET=

# Security Configuration
CORS_ORIGIN=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
}

edit_config() {
    print_header
    echo -e "${CYAN}설정 파일 편집${NC}"
    echo
    echo "1) .env (환경 변수)"
    echo "2) package.json (서버 설정)"
    echo "3) client/package.json (클라이언트 설정)"
    echo "4) docker-compose-janus.yml (Janus Docker 설정)"
    echo
    read -p "편집할 파일 선택 (1-4): " choice
    
    case $choice in
        1) ${EDITOR:-nano} "$ENV_FILE" ;;
        2) ${EDITOR:-nano} package.json ;;
        3) ${EDITOR:-nano} client/package.json ;;
        4) ${EDITOR:-nano} docker-compose-janus.yml ;;
        *) echo -e "${RED}잘못된 선택입니다${NC}" ;;
    esac
}

#############################################
# 초기 설정 함수
#############################################

initial_setup() {
    print_header
    echo -e "${CYAN}Mini Area 플랫폼 초기 설정을 시작합니다${NC}"
    echo
    
    # 1. 시스템 요구사항 체크
    log INFO "1단계: 시스템 요구사항 확인"
    check_system_requirements
    echo
    
    # 2. 필수 프로그램 설치
    log INFO "2단계: 필수 프로그램 설치"
    install_nodejs
    install_postgresql
    install_redis
    install_docker
    echo
    
    # 3. 프로젝트 의존성 설치
    log INFO "3단계: 프로젝트 의존성 설치"
    install_dependencies
    echo
    
    # 4. 환경 설정
    log INFO "4단계: 환경 설정"
    if [ ! -f "$ENV_FILE" ]; then
        log INFO ".env 파일이 없습니다. 생성 중..."
        create_default_env
        log SUCCESS ".env 파일 생성 완료"
    fi
    echo
    
    # 5. 데이터베이스 초기화
    log INFO "5단계: 데이터베이스 초기화"
    setup_database
    echo
    
    # 6. SSL 인증서 생성 (개발용)
    log INFO "6단계: SSL 인증서 확인"
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        log INFO "SSL 인증서 생성 중..."
        openssl req -x509 -newkey rsa:4096 -nodes -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" -days 365 \
            -subj "/C=KR/ST=Seoul/L=Seoul/O=MiniArea/CN=localhost"
        log SUCCESS "SSL 인증서 생성 완료"
    else
        log SUCCESS "SSL 인증서가 이미 존재합니다"
    fi
    echo
    
    # 완료
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    초기 설정이 완료되었습니다!                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "서비스를 시작하려면:"
    echo -e "  ${CYAN}./miniarea.sh start${NC}"
    echo
    echo -e "도움말을 보려면:"
    echo -e "  ${CYAN}./miniarea.sh help${NC}"
}

#############################################
# 테스트 함수
#############################################

test_connection() {
    print_header
    echo -e "${CYAN}연결 테스트를 시작합니다...${NC}"
    echo
    
    local ip=$(get_ip)
    
    # 1. PostgreSQL 테스트
    echo -n "PostgreSQL (localhost:$PORT_POSTGRES): "
    if PGPASSWORD="${DB_PASSWORD:-password}" psql -h localhost -U "${DB_USER:-postgres}" -d "${DB_NAME:-mini_area}" -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 연결 성공${NC}"
    else
        echo -e "${RED}✗ 연결 실패${NC}"
    fi
    
    # 2. Redis 테스트
    echo -n "Redis (localhost:$PORT_REDIS): "
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 연결 성공${NC}"
    else
        echo -e "${RED}✗ 연결 실패${NC}"
    fi
    
    # 3. Node.js 서버 테스트
    echo -n "Node.js 서버 (https://localhost:$PORT_SERVER): "
    if curl -sk -f "https://localhost:$PORT_SERVER/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 연결 성공${NC}"
    else
        echo -e "${RED}✗ 연결 실패${NC}"
    fi
    
    # 4. React 클라이언트 테스트
    echo -n "React 클라이언트 (https://localhost:$PORT_CLIENT): "
    if curl -sk -f "https://localhost:$PORT_CLIENT" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 연결 성공${NC}"
    else
        echo -e "${RED}✗ 연결 실패${NC}"
    fi
    
    # 5. Janus 테스트 (선택적)
    if docker ps 2>/dev/null | grep -q janus-gateway; then
        echo -n "Janus WebSocket (ws://$ip:$PORT_JANUS_WS): "
        if timeout 2 bash -c "echo > /dev/tcp/$ip/$PORT_JANUS_WS" 2>/dev/null; then
            echo -e "${GREEN}✓ 연결 성공${NC}"
        else
            echo -e "${RED}✗ 연결 실패${NC}"
        fi
    fi
    
    echo
}

#############################################
# 메인 처리
#############################################

# 명령어 처리
case "$1" in
    install)
        initial_setup
        ;;
    start)
        start_all_services
        ;;
    stop)
        stop_all_services
        ;;
    restart)
        restart_all_services
        ;;
    status)
        show_status
        ;;
    
    # 데이터베이스 명령 (별도 스크립트로 이동)
    db)
        log INFO "데이터베이스와 Redis 관리는 ./db-redis.sh 스크립트를 사용하세요"
        log INFO "사용법: ./db-redis.sh [명령어]"
        log INFO "도움말: ./db-redis.sh help"
        ;;
    
    # Redis 명령 (별도 스크립트로 이동)
    redis)
        log INFO "Redis 관리는 ./db-redis.sh 스크립트를 사용하세요"
        log INFO "사용법: ./db-redis.sh redis-start | redis-stop | redis-status"
        ;;
    
    # 서버 명령
    server)
        case "$2" in
            start) start_server ;;
            stop) stop_server ;;
            logs) show_logs server ;;
            *) log ERROR "사용법: ./miniarea.sh server [start|stop|logs]" ;;
        esac
        ;;
    
    # 클라이언트 명령
    client)
        case "$2" in
            start) start_client ;;
            stop) stop_client ;;
            build) build_client ;;
            logs) show_logs client ;;
            *) log ERROR "사용법: ./miniarea.sh client [start|stop|build|logs]" ;;
        esac
        ;;
    
    # Janus 명령
    janus)
        case "$2" in
            start) start_janus ;;
            stop) stop_janus ;;
            logs) show_logs janus ;;
            *) log ERROR "사용법: ./miniarea.sh janus [start|stop|logs]" ;;
        esac
        ;;
    
    # 모니터링 명령
    monitor)
        monitor_realtime
        ;;
    logs)
        show_logs "$2"
        ;;
    health)
        health_check
        ;;
    doctor)
        system_doctor
        ;;
    fix)
        auto_fix
        ;;
    test)
        test_connection
        ;;
    
    # 유지보수 명령
    backup)
        backup_system
        ;;
    restore)
        restore_system
        ;;
    update)
        log INFO "시스템 업데이트 중..."
        git pull
        install_dependencies
        log SUCCESS "업데이트 완료"
        ;;
    clean)
        log INFO "시스템 정리 중..."
        find "$LOG_DIR" -name "*.log" -mtime +7 -delete
        rm -rf "$TEMP_DIR"/*
        npm cache clean --force
        cd client && npm cache clean --force && cd ..
        log SUCCESS "정리 완료"
        ;;
    reset)
        if confirm "정말로 시스템을 초기화하시겠습니까? 모든 데이터가 삭제됩니다."; then
            stop_all_services
            rm -rf node_modules client/node_modules
            rm -rf "$LOG_DIR"/* "$PID_DIR"/*
            log WARNING "시스템이 초기화되었습니다"
            log INFO "다시 설정하려면 './miniarea.sh install' 명령을 실행하세요"
        fi
        ;;
    config)
        edit_config
        ;;
    
    # 도움말
    help|--help|-h)
        print_header
        print_menu
        ;;
    version|--version|-v)
        echo "Mini Area Platform Manager v$VERSION"
        ;;
    *)
        print_header
        if [ -n "$1" ]; then
            echo -e "${RED}알 수 없는 명령어: $1${NC}"
            echo
        fi
        print_menu
        ;;
esac

# 로그 기록
log INFO "명령 실행: $0 $@"