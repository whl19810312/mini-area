#!/bin/bash

# 환경 변수 설정 스크립트
# .env 파일 생성 및 일관성 있는 환경 설정 관리

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 기본 설정값
DEFAULT_DB_HOST="localhost"
DEFAULT_DB_PORT="5432"
DEFAULT_DB_USER="postgres"
DEFAULT_DB_PASSWORD="password"
DEFAULT_DB_NAME="metaverse"
DEFAULT_SERVER_PORT="7000"
DEFAULT_CLIENT_PORT="5173"

# 사용자 입력 함수
prompt_user() {
    local prompt_message="$1"
    local default_value="$2"
    local user_input
    
    if [ -n "$default_value" ]; then
        read -p "$prompt_message [$default_value]: " user_input
        echo "${user_input:-$default_value}"
    else
        read -p "$prompt_message: " user_input
        echo "$user_input"
    fi
}

# 비밀번호 입력 함수
prompt_password() {
    local prompt_message="$1"
    local default_value="$2"
    local user_input
    
    if [ -n "$default_value" ]; then
        read -s -p "$prompt_message [$default_value]: " user_input
        echo
        echo "${user_input:-$default_value}"
    else
        read -s -p "$prompt_message: " user_input
        echo
        echo "$user_input"
    fi
}

# 환경 설정 수집
collect_environment_config() {
    log_info "환경 설정을 수집합니다..."
    
    echo
    echo "=== 데이터베이스 설정 ==="
    DB_HOST=$(prompt_user "PostgreSQL 호스트" "$DEFAULT_DB_HOST")
    DB_PORT=$(prompt_user "PostgreSQL 포트" "$DEFAULT_DB_PORT")
    DB_USER=$(prompt_user "PostgreSQL 사용자명" "$DEFAULT_DB_USER")
    DB_PASSWORD=$(prompt_password "PostgreSQL 비밀번호" "$DEFAULT_DB_PASSWORD")
    DB_NAME=$(prompt_user "데이터베이스 이름" "$DEFAULT_DB_NAME")
    
    echo
    echo "=== 서버 설정 ==="
    SERVER_PORT=$(prompt_user "서버 포트" "$DEFAULT_SERVER_PORT")
    
    # 네트워크 인터페이스에서 IP 자동 감지
    DEFAULT_SERVER_IP=$(ip route get 8.8.8.8 | awk -F"src " 'NR==1{split($2,a," ");print a[1]}')
    SERVER_IP=$(prompt_user "서버 IP (LAN 접속용)" "$DEFAULT_SERVER_IP")
    
    echo
    echo "=== JWT 및 세션 설정 ==="
    JWT_SECRET=$(prompt_user "JWT 시크릿 키" "$(openssl rand -base64 32)")
    SESSION_SECRET=$(prompt_user "세션 시크릿 키" "$(openssl rand -base64 32)")
    
    echo
    echo "=== Agora 설정 (WebRTC용) ==="
    AGORA_APP_ID=$(prompt_user "Agora App ID" "")
    AGORA_CERTIFICATE=$(prompt_user "Agora Certificate" "")
    
    echo
    echo "=== 이메일 설정 ==="
    echo "1) 로컬 개발 (MailHog)"
    echo "2) Gmail SMTP"
    echo "3) Postfix (로컬 서버)"
    EMAIL_CHOICE=$(prompt_user "이메일 설정 선택 (1-3)" "1")
    
    case $EMAIL_CHOICE in
        1)
            EMAIL_HOST="localhost"
            EMAIL_PORT="1025"
            EMAIL_USER="test@example.com"
            EMAIL_PASS="password"
            USE_POSTFIX="false"
            ;;
        2)
            EMAIL_HOST="smtp.gmail.com"
            EMAIL_PORT="587"
            EMAIL_USER=$(prompt_user "Gmail 주소" "")
            EMAIL_PASS=$(prompt_password "Gmail 앱 비밀번호" "")
            USE_POSTFIX="false"
            ;;
        3)
            EMAIL_HOST="localhost"
            EMAIL_PORT="25"
            EMAIL_USER="noreply@$(hostname)"
            EMAIL_PASS=""
            USE_POSTFIX="true"
            ;;
        *)
            log_warning "잘못된 선택입니다. 기본값(로컬 개발)을 사용합니다."
            EMAIL_HOST="localhost"
            EMAIL_PORT="1025"
            EMAIL_USER="test@example.com"
            EMAIL_PASS="password"
            USE_POSTFIX="false"
            ;;
    esac
}

# 서버 .env 파일 생성
create_server_env() {
    log_info "서버 .env 파일을 생성합니다..."
    
    cat > .env << EOF
# 서버 설정
PORT=${SERVER_PORT}
NODE_ENV=development

# 서버 IP 설정 (LAN 접속용)
SERVER_IP=${SERVER_IP}
SERVER_PORT=${SERVER_PORT}

# JWT 설정
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# PostgreSQL 데이터베이스 설정
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

# 이메일 설정
EMAIL_HOST=${EMAIL_HOST}
EMAIL_PORT=${EMAIL_PORT}
EMAIL_USER=${EMAIL_USER}
EMAIL_PASS=${EMAIL_PASS}

# Postfix 설정
USE_POSTFIX=${USE_POSTFIX}

# 프론트엔드 URL
FRONTEND_URL=http://localhost:${DEFAULT_CLIENT_PORT}
CLIENT_URL=http://localhost:${DEFAULT_CLIENT_PORT}

# Google OAuth 설정
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Agora 설정
AGORA_APP_ID=${AGORA_APP_ID}
AGORA_CERTIFICATE=${AGORA_CERTIFICATE}

# STUN/TURN 서버
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=
TURN_USERNAME=
TURN_PASSWORD=
EOF

    log_success "서버 .env 파일이 생성되었습니다."
}

# 클라이언트 .env 파일 생성
create_client_env() {
    log_info "클라이언트 .env 파일을 생성합니다..."
    
    # 클라이언트 디렉토리 확인
    if [ -d "client" ]; then
        cat > client/.env << EOF
# Client Environment Configuration

# API URLs
VITE_API_URL=http://${SERVER_IP}:${SERVER_PORT}
VITE_WS_URL=ws://${SERVER_IP}:${SERVER_PORT}
VITE_SERVER_URL=http://${SERVER_IP}:${SERVER_PORT}

# Application Settings
VITE_APP_NAME=Mini Area
VITE_MAX_USERS_PER_ROOM=10
VITE_ENABLE_DEBUG=false

# TURN Server Configuration (optional)
VITE_TURN_URL=turn:your-turn-server.com:3478
VITE_TURN_USERNAME=your-turn-username
VITE_TURN_PASSWORD=your-turn-password

# 멀티 결제 시스템 설정

# 토스페이먼츠 (국내 고객용)
VITE_TOSS_CLIENT_KEY=test_ck_your_toss_client_key_here

# PortOne (해외 고객용)
VITE_PORTONE_STORE_ID=store_your_portone_store_id_here
VITE_PORTONE_CHANNEL_KEY=channel_your_portone_channel_key_here
EOF
        log_success "클라이언트 .env 파일이 생성되었습니다."
    else
        log_warning "클라이언트 디렉토리가 없습니다. 클라이언트 .env 파일을 건너뜁니다."
    fi
}

# 설정 검증
validate_config() {
    log_info "설정을 검증합니다..."
    
    # 포트 중복 확인
    if [ "$SERVER_PORT" = "$DEFAULT_CLIENT_PORT" ]; then
        log_warning "서버 포트와 클라이언트 포트가 동일합니다. 충돌이 발생할 수 있습니다."
    fi
    
    # 필수 설정 확인
    if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
        log_error "데이터베이스 설정이 불완전합니다."
        return 1
    fi
    
    if [ -z "$JWT_SECRET" ] || [ -z "$SESSION_SECRET" ]; then
        log_error "보안 키 설정이 불완전합니다."
        return 1
    fi
    
    log_success "설정 검증이 완료되었습니다."
}

# 설정 요약 출력
print_config_summary() {
    log_info "=== 설정 요약 ==="
    echo "데이터베이스:"
    echo "  Host: $DB_HOST:$DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo
    echo "서버:"
    echo "  IP: $SERVER_IP"
    echo "  Port: $SERVER_PORT"
    echo
    echo "이메일:"
    echo "  Host: $EMAIL_HOST:$EMAIL_PORT"
    echo "  User: $EMAIL_USER"
    echo "  Postfix: $USE_POSTFIX"
    echo
    echo "보안:"
    echo "  JWT Secret: ${JWT_SECRET:0:10}..."
    echo "  Session Secret: ${SESSION_SECRET:0:10}..."
    
    if [ -n "$AGORA_APP_ID" ]; then
        echo
        echo "Agora:"
        echo "  App ID: ${AGORA_APP_ID:0:10}..."
    fi
}

# 메인 실행 함수
main() {
    log_info "=== 환경 설정 스크립트 시작 ==="
    
    # 기존 .env 파일 백업
    if [ -f ".env" ]; then
        cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "기존 .env 파일을 백업했습니다."
    fi
    
    if [ -f "client/.env" ]; then
        cp client/.env "client/.env.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "기존 클라이언트 .env 파일을 백업했습니다."
    fi
    
    # 대화형 모드 vs 자동 모드
    if [ "$1" = "--auto" ]; then
        log_info "자동 모드로 기본값을 사용하여 설정합니다..."
        
        # 기본값 설정
        DB_HOST="$DEFAULT_DB_HOST"
        DB_PORT="$DEFAULT_DB_PORT"
        DB_USER="$DEFAULT_DB_USER"
        DB_PASSWORD="$DEFAULT_DB_PASSWORD"
        DB_NAME="$DEFAULT_DB_NAME"
        SERVER_PORT="$DEFAULT_SERVER_PORT"
        SERVER_IP=$(ip route get 8.8.8.8 | awk -F"src " 'NR==1{split($2,a," ");print a[1]}')
        JWT_SECRET=$(openssl rand -base64 32)
        SESSION_SECRET=$(openssl rand -base64 32)
        EMAIL_HOST="localhost"
        EMAIL_PORT="1025"
        EMAIL_USER="test@example.com"
        EMAIL_PASS="password"
        USE_POSTFIX="false"
        AGORA_APP_ID=""
        AGORA_CERTIFICATE=""
        
    else
        # 대화형 설정 수집
        collect_environment_config
    fi
    
    # 설정 검증
    validate_config
    
    # .env 파일 생성
    create_server_env
    create_client_env
    
    # 설정 요약 출력
    print_config_summary
    
    log_success "=== 환경 설정이 완료되었습니다! ==="
    log_info "다음 단계:"
    log_info "1. ./scripts/postgres-setup.sh 실행으로 PostgreSQL 설정"
    log_info "2. npm install로 의존성 설치"
    log_info "3. ./start.sh로 서버 시작"
}

# 도움말 출력
show_help() {
    echo "사용법: $0 [OPTIONS]"
    echo
    echo "옵션:"
    echo "  --auto    대화형 입력 없이 기본값으로 자동 설정"
    echo "  --help    이 도움말 출력"
    echo
    echo "예시:"
    echo "  $0              # 대화형 모드로 설정"
    echo "  $0 --auto       # 기본값으로 자동 설정"
}

# 명령행 인수 처리
case "$1" in
    --help|-h)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac