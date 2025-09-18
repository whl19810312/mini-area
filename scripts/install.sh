#!/bin/bash

# Mini Area 전체 설치 스크립트
# PostgreSQL 설정부터 애플리케이션 설치까지 원스톱 설치

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 시스템 요구사항 확인
check_system_requirements() {
    log_step "시스템 요구사항을 확인합니다..."
    
    # Node.js 확인
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_info "Node.js 버전: $NODE_VERSION"
        
        # Node.js 버전 확인 (v16 이상 권장)
        NODE_MAJOR_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -lt 16 ]; then
            log_warning "Node.js v16 이상을 권장합니다. 현재 버전: $NODE_VERSION"
        fi
    else
        log_error "Node.js가 설치되지 않았습니다."
        log_info "Node.js 설치 중..."
        
        # Node.js 설치
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v yum &> /dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs npm
        else
            log_error "지원되지 않는 운영체제입니다. Node.js를 수동으로 설치해주세요."
            exit 1
        fi
        
        log_success "Node.js 설치가 완료되었습니다."
    fi
    
    # npm 확인
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_info "npm 버전: $NPM_VERSION"
    else
        log_error "npm이 설치되지 않았습니다."
        exit 1
    fi
    
    # Git 확인
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        log_info "Git 버전: $GIT_VERSION"
    else
        log_warning "Git이 설치되지 않았습니다. 버전 관리를 위해 Git 설치를 권장합니다."
    fi
    
    # PostgreSQL 확인
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version)
        log_info "PostgreSQL 버전: $PSQL_VERSION"
    else
        log_info "PostgreSQL이 설치되지 않았습니다. 설치 스크립트에서 처리됩니다."
    fi
    
    log_success "시스템 요구사항 확인이 완료되었습니다."
}

# 프로젝트 구조 확인
check_project_structure() {
    log_step "프로젝트 구조를 확인합니다..."
    
    # 필수 디렉토리 생성
    local required_dirs=("scripts" "config" "logs" "migrations" ".pids")
    
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "디렉토리 '$dir'를 생성했습니다."
        fi
    done
    
    # 스크립트 실행 권한 설정
    chmod +x scripts/*.sh 2>/dev/null || true
    chmod +x *.sh 2>/dev/null || true
    
    log_success "프로젝트 구조 확인이 완료되었습니다."
}

# 환경 설정
setup_environment() {
    log_step "환경 설정을 시작합니다..."
    
    if [ ! -f ".env" ]; then
        log_info "환경 설정 파일이 없습니다. 설정을 생성합니다..."
        
        # 대화형 모드 vs 자동 모드 선택
        if [ "$1" = "--auto" ]; then
            ./scripts/env-setup.sh --auto
        else
            echo "환경 설정 모드를 선택하세요:"
            echo "1) 대화형 설정 (권장)"
            echo "2) 기본값으로 자동 설정"
            read -p "선택 (1-2): " setup_choice
            
            case $setup_choice in
                1)
                    ./scripts/env-setup.sh
                    ;;
                2)
                    ./scripts/env-setup.sh --auto
                    ;;
                *)
                    log_info "기본값으로 자동 설정을 진행합니다."
                    ./scripts/env-setup.sh --auto
                    ;;
            esac
        fi
    else
        log_info ".env 파일이 이미 존재합니다."
        
        if [ "$1" != "--auto" ]; then
            read -p "환경 설정을 다시 하시겠습니까? (y/N): " reset_env
            if [ "$reset_env" = "y" ] || [ "$reset_env" = "Y" ]; then
                ./scripts/env-setup.sh
            fi
        fi
    fi
    
    # 환경 변수 로드
    source .env
    
    log_success "환경 설정이 완료되었습니다."
}

# PostgreSQL 설정
setup_postgresql() {
    log_step "PostgreSQL 설정을 시작합니다..."
    
    if [ -f "scripts/postgres-setup.sh" ]; then
        ./scripts/postgres-setup.sh
    else
        log_error "PostgreSQL 설정 스크립트를 찾을 수 없습니다."
        exit 1
    fi
    
    log_success "PostgreSQL 설정이 완료되었습니다."
}

# 의존성 설치
install_dependencies() {
    log_step "의존성을 설치합니다..."
    
    # 서버 의존성 설치
    log_info "서버 의존성을 설치합니다..."
    npm install
    
    # 클라이언트 의존성 설치
    if [ -d "client" ]; then
        log_info "클라이언트 의존성을 설치합니다..."
        cd client
        npm install
        cd ..
    else
        log_warning "클라이언트 디렉토리가 없습니다."
    fi
    
    log_success "의존성 설치가 완료되었습니다."
}

# 데이터베이스 마이그레이션
run_migrations() {
    log_step "데이터베이스 마이그레이션을 실행합니다..."
    
    # Sequelize CLI를 통한 마이그레이션 실행
    if command -v npx sequelize-cli &> /dev/null || [ -f "node_modules/.bin/sequelize-cli" ]; then
        log_info "Sequelize 마이그레이션을 실행합니다..."
        
        # 데이터베이스 생성 (필요한 경우)
        npx sequelize-cli db:create --env development || log_warning "데이터베이스가 이미 존재하거나 생성에 실패했습니다."
        
        # 마이그레이션 실행
        npx sequelize-cli db:migrate --env development || log_warning "마이그레이션 실행에 실패했습니다."
        
        # 시드 데이터 실행 (선택사항)
        if [ -f "seeders" ]; then
            read -p "시드 데이터를 실행하시겠습니까? (y/N): " run_seeds
            if [ "$run_seeds" = "y" ] || [ "$run_seeds" = "Y" ]; then
                npx sequelize-cli db:seed:all --env development || log_warning "시드 데이터 실행에 실패했습니다."
            fi
        fi
        
    elif command -v npx knex &> /dev/null || [ -f "node_modules/.bin/knex" ]; then
        log_info "Knex 마이그레이션을 실행합니다..."
        npx knex migrate:latest --env development || log_warning "마이그레이션 실행에 실패했습니다."
        
    else
        log_warning "마이그레이션 도구를 찾을 수 없습니다. 수동으로 데이터베이스 스키마를 생성해주세요."
    fi
    
    log_success "데이터베이스 설정이 완료되었습니다."
}

# SSL 인증서 생성 (개발용)
setup_ssl_certificates() {
    log_step "개발용 SSL 인증서를 생성합니다..."
    
    if [ ! -d "ssl" ]; then
        mkdir ssl
    fi
    
    if [ ! -f "ssl/server.key" ] || [ ! -f "ssl/server.crt" ]; then
        log_info "자체 서명된 SSL 인증서를 생성합니다..."
        
        # 자체 서명된 인증서 생성
        openssl req -x509 -newkey rsa:4096 -keyout ssl/server.key -out ssl/server.crt -days 365 -nodes \
            -subj "/C=KR/ST=Seoul/L=Seoul/O=MiniArea/OU=Development/CN=localhost"
        
        chmod 600 ssl/server.key
        chmod 644 ssl/server.crt
        
        log_success "SSL 인증서가 생성되었습니다."
        log_warning "이 인증서는 개발 전용입니다. 프로덕션에서는 인증된 SSL 인증서를 사용하세요."
    else
        log_info "SSL 인증서가 이미 존재합니다."
    fi
}

# 서비스 테스트
test_installation() {
    log_step "설치를 테스트합니다..."
    
    # 데이터베이스 연결 테스트
    log_info "데이터베이스 연결을 테스트합니다..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_success "데이터베이스 연결 테스트 성공"
    else
        log_error "데이터베이스 연결 테스트 실패"
        return 1
    fi
    
    # Node.js 서버 시작 테스트 (간단한 구문 검사)
    if [ -f "server/app.js" ]; then
        log_info "서버 코드 구문 검사 중..."
        if node -c server/app.js &> /dev/null; then
            log_success "서버 코드 구문 검사 통과"
        else
            log_warning "서버 코드에 구문 오류가 있을 수 있습니다."
        fi
    fi
    
    # 클라이언트 빌드 테스트
    if [ -d "client" ]; then
        log_info "클라이언트 빌드 테스트 중..."
        cd client
        if npm run build &> /dev/null; then
            log_success "클라이언트 빌드 테스트 통과"
            # 빌드 파일 정리 (개발 환경에서는 불필요)
            rm -rf dist
        else
            log_warning "클라이언트 빌드에 실패했습니다."
        fi
        cd ..
    fi
    
    log_success "설치 테스트가 완료되었습니다."
}

# 설치 후 안내
print_post_install_guide() {
    log_success "=== Mini Area 설치가 완료되었습니다! ==="
    echo
    echo "다음 단계:"
    echo
    echo "1. 서버 시작:"
    echo "   ./start.sh"
    echo
    echo "2. 개발 모드로 시작 (서버 + 클라이언트):"
    echo "   npm run dev"
    echo
    echo "3. 서버만 시작:"
    echo "   npm start"
    echo
    echo "4. 클라이언트만 시작:"
    echo "   cd client && npm run dev"
    echo
    echo "5. 서버 중지:"
    echo "   ./stop.sh"
    echo
    echo "접속 정보:"
    echo "- 클라이언트: http://localhost:5173"
    echo "- 서버 API: http://${SERVER_IP:-localhost}:${SERVER_PORT:-7000}"
    echo
    echo "로그 파일:"
    echo "- 서버: logs/server.log"
    echo "- 클라이언트: logs/client.log"
    echo
    echo "문제 해결:"
    echo "- 포트 충돌: netstat -tlnp | grep :7000"
    echo "- 데이터베이스 상태: ./scripts/postgres-setup.sh"
    echo "- 로그 확인: tail -f logs/server.log"
    echo
    log_info "설치 가이드는 README.md 파일을 참조하세요."
}

# 에러 핸들링
handle_error() {
    log_error "설치 중 오류가 발생했습니다. 라인 $1에서 실패했습니다."
    log_info "로그를 확인하고 다시 시도해주세요."
    exit 1
}

# 에러 트랩 설정
trap 'handle_error ${LINENO}' ERR

# 메인 실행 함수
main() {
    # 스크립트 시작 시간 기록
    START_TIME=$(date +%s)
    
    log_info "=== Mini Area 설치 스크립트 시작 ==="
    log_info "시작 시간: $(date)"
    
    # 루트 디렉토리 확인
    if [ ! -f "package.json" ]; then
        log_error "package.json 파일을 찾을 수 없습니다. 프로젝트 루트 디렉토리에서 실행해주세요."
        exit 1
    fi
    
    # 설치 단계 실행
    check_system_requirements
    check_project_structure
    setup_environment "$@"
    setup_postgresql
    install_dependencies
    setup_ssl_certificates
    run_migrations
    test_installation
    
    # 설치 완료 시간 계산
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log_success "설치가 완료되었습니다! (소요 시간: ${DURATION}초)"
    print_post_install_guide
}

# 도움말 출력
show_help() {
    echo "Mini Area 설치 스크립트"
    echo
    echo "사용법: $0 [OPTIONS]"
    echo
    echo "옵션:"
    echo "  --auto    대화형 입력 없이 자동으로 설치"
    echo "  --help    이 도움말 출력"
    echo
    echo "예시:"
    echo "  $0              # 대화형 설치"
    echo "  $0 --auto       # 자동 설치"
    echo
    echo "설치 과정:"
    echo "1. 시스템 요구사항 확인"
    echo "2. 환경 설정 (.env 파일 생성)"
    echo "3. PostgreSQL 설정 및 데이터베이스 생성"
    echo "4. 의존성 설치 (서버 + 클라이언트)"
    echo "5. SSL 인증서 생성 (개발용)"
    echo "6. 데이터베이스 마이그레이션"
    echo "7. 설치 테스트"
    echo
    echo "문제 발생 시:"
    echo "- 로그 확인: logs/ 디렉토리"
    echo "- 수동 설정: scripts/ 디렉토리의 개별 스크립트 실행"
    echo "- 권한 문제: sudo 권한으로 실행"
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