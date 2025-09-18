#!/bin/bash

# PostgreSQL 설정 및 데이터베이스 초기화 스크립트
# 일관성 있는 PostgreSQL 환경 구성을 위한 스크립트

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 환경 변수 로드
if [ -f ".env" ]; then
    source .env
    log_info ".env 파일에서 환경 변수를 로드했습니다."
else
    log_warning ".env 파일이 없습니다. 기본값을 사용합니다."
fi

# 기본값 설정
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}
DB_NAME=${DB_NAME:-metaverse}

log_info "PostgreSQL 설정 시작..."
log_info "Host: $DB_HOST"
log_info "Port: $DB_PORT"
log_info "User: $DB_USER"
log_info "Database: $DB_NAME"

# PostgreSQL 서비스 확인
check_postgres_service() {
    log_info "PostgreSQL 서비스 상태 확인 중..."
    
    if systemctl is-active --quiet postgresql; then
        log_success "PostgreSQL 서비스가 실행 중입니다."
        return 0
    else
        log_warning "PostgreSQL 서비스가 실행되지 않고 있습니다."
        
        # PostgreSQL 서비스 시작 시도
        log_info "PostgreSQL 서비스를 시작합니다..."
        if sudo systemctl start postgresql; then
            log_success "PostgreSQL 서비스가 시작되었습니다."
            return 0
        else
            log_error "PostgreSQL 서비스 시작에 실패했습니다."
            return 1
        fi
    fi
}

# PostgreSQL 설치 확인 및 설치
install_postgresql() {
    log_info "PostgreSQL 설치 상태 확인 중..."
    
    if command -v psql &> /dev/null; then
        log_success "PostgreSQL이 이미 설치되어 있습니다."
        return 0
    fi
    
    log_info "PostgreSQL을 설치합니다..."
    
    # Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        log_success "PostgreSQL 설치가 완료되었습니다."
        
    # CentOS/RHEL
    elif command -v yum &> /dev/null; then
        sudo yum install -y postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
        log_success "PostgreSQL 설치가 완료되었습니다."
        
    else
        log_error "지원되지 않는 운영체제입니다. PostgreSQL을 수동으로 설치해주세요."
        exit 1
    fi
}

# 데이터베이스 사용자 생성
create_database_user() {
    log_info "데이터베이스 사용자 생성 중..."
    
    # postgres 사용자로 전환하여 명령 실행
    sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || {
        log_info "사용자 '$DB_USER'를 생성합니다..."
        sudo -u postgres createuser --superuser --createdb --createrole --login "$DB_USER"
        sudo -u postgres psql -c "ALTER USER $DB_USER PASSWORD '$DB_PASSWORD';"
        log_success "사용자 '$DB_USER'가 생성되었습니다."
    }
    
    log_success "데이터베이스 사용자가 준비되었습니다."
}

# 데이터베이스 생성
create_databases() {
    log_info "데이터베이스 생성 중..."
    
    # 메인 데이터베이스
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME" || {
        log_info "데이터베이스 '$DB_NAME'를 생성합니다..."
        PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        log_success "데이터베이스 '$DB_NAME'가 생성되었습니다."
    }
    
    # 개발용 데이터베이스
    DEV_DB_NAME="${DB_NAME}_dev"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DEV_DB_NAME" || {
        log_info "개발용 데이터베이스 '$DEV_DB_NAME'를 생성합니다..."
        PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DEV_DB_NAME"
        log_success "개발용 데이터베이스 '$DEV_DB_NAME'가 생성되었습니다."
    }
    
    # 테스트용 데이터베이스
    TEST_DB_NAME="${DB_NAME}_test"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$TEST_DB_NAME" || {
        log_info "테스트용 데이터베이스 '$TEST_DB_NAME'를 생성합니다..."
        PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB_NAME"
        log_success "테스트용 데이터베이스 '$TEST_DB_NAME'가 생성되었습니다."
    }
    
    log_success "모든 데이터베이스가 생성되었습니다."
}

# 데이터베이스 연결 테스트
test_connection() {
    log_info "데이터베이스 연결 테스트 중..."
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" &> /dev/null; then
        log_success "데이터베이스 연결 테스트가 성공했습니다."
        
        # PostgreSQL 버전 정보 출력
        PG_VERSION=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | head -n 1)
        log_info "PostgreSQL 버전: $PG_VERSION"
    else
        log_error "데이터베이스 연결 테스트가 실패했습니다."
        exit 1
    fi
}

# PostgreSQL 설정 파일 업데이트 (선택사항)
configure_postgresql() {
    log_info "PostgreSQL 설정 최적화 중..."
    
    PG_CONFIG_PATH=$(sudo -u postgres psql -t -P format=unaligned -c "SHOW config_file;")
    PG_HBA_PATH=$(sudo -u postgres psql -t -P format=unaligned -c "SHOW hba_file;")
    
    log_info "PostgreSQL 설정 파일: $PG_CONFIG_PATH"
    log_info "PostgreSQL HBA 파일: $PG_HBA_PATH"
    
    # pg_hba.conf 백업 및 설정 (로컬 연결 허용)
    if [ -f "$PG_HBA_PATH" ]; then
        sudo cp "$PG_HBA_PATH" "${PG_HBA_PATH}.backup"
        log_info "pg_hba.conf 파일이 백업되었습니다."
        
        # 로컬 연결을 위한 설정 추가 (이미 있는지 확인)
        if ! sudo grep -q "local   all             all                                     md5" "$PG_HBA_PATH"; then
            echo "local   all             all                                     md5" | sudo tee -a "$PG_HBA_PATH" > /dev/null
            log_info "로컬 연결 설정이 추가되었습니다."
        fi
    fi
    
    # PostgreSQL 서비스 재시작
    log_info "PostgreSQL 서비스를 재시작합니다..."
    sudo systemctl restart postgresql
    log_success "PostgreSQL 설정이 완료되었습니다."
}

# 마이그레이션 실행
run_migrations() {
    log_info "데이터베이스 마이그레이션 실행 중..."
    
    if [ -d "migrations" ] && [ -n "$(ls -A migrations 2>/dev/null)" ]; then
        # Knex가 설치되어 있는지 확인
        if command -v npx knex &> /dev/null || [ -f "node_modules/.bin/knex" ]; then
            log_info "Knex 마이그레이션을 실행합니다..."
            npx knex migrate:latest --env development
            log_success "마이그레이션이 완료되었습니다."
        else
            log_warning "Knex가 설치되지 않았습니다. npm install을 먼저 실행해주세요."
        fi
    else
        log_warning "마이그레이션 파일이 없습니다. 스키마를 수동으로 생성해주세요."
    fi
}

# 메인 실행 함수
main() {
    log_info "=== PostgreSQL 설정 스크립트 시작 ==="
    
    # PostgreSQL 설치 확인
    install_postgresql
    
    # PostgreSQL 서비스 확인
    check_postgres_service
    
    # 설정 파일 업데이트
    configure_postgresql
    
    # 데이터베이스 사용자 생성
    create_database_user
    
    # 데이터베이스 생성
    create_databases
    
    # 연결 테스트
    test_connection
    
    # 마이그레이션 실행
    run_migrations
    
    log_success "=== PostgreSQL 설정이 완료되었습니다! ==="
    log_info "데이터베이스 정보:"
    log_info "  Host: $DB_HOST"
    log_info "  Port: $DB_PORT"
    log_info "  User: $DB_USER"
    log_info "  Main Database: $DB_NAME"
    log_info "  Dev Database: ${DB_NAME}_dev"
    log_info "  Test Database: ${DB_NAME}_test"
}

# 스크립트 실행
main "$@"