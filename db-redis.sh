#!/bin/bash

#############################################
# Mini Area PostgreSQL & Redis 관리 스크립트
# 
# 사용법: ./db-redis.sh [명령어]
#############################################

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 경로 설정
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 환경 변수 파일
ENV_FILE="$SCRIPT_DIR/.env"

# 데이터베이스 설정 (기본값)
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="mini_area"
DB_USER="postgres"
DB_PASSWORD="password"

# Redis 설정 (기본값)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# 백업 디렉토리
BACKUP_DIR="$SCRIPT_DIR/backups"
mkdir -p "$BACKUP_DIR"

# .env 파일에서 설정 로드
if [ -f "$ENV_FILE" ]; then
    source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | grep -v '^#')
fi

#############################################
# 유틸리티 함수
#############################################

log() {
    local level=$1
    shift
    local message="$@"
    
    case $level in
        ERROR)
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

check_postgres() {
    # PostgreSQL 프로세스 확인
    if pgrep -x "postgres" > /dev/null; then
        return 0
    else
        return 1
    fi
}

check_connection() {
    # 데이터베이스 연결 테스트
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1
    return $?
}

#############################################
# 데이터베이스 관리 함수
#############################################

start_database() {
    log INFO "PostgreSQL 시작 확인 중..."
    
    if check_postgres; then
        log SUCCESS "PostgreSQL이 이미 실행 중입니다"
        
        # 연결 테스트
        if check_connection; then
            log SUCCESS "데이터베이스 연결 성공"
        else
            log WARNING "PostgreSQL은 실행 중이지만 연결할 수 없습니다"
            log INFO "비밀번호를 확인하거나 PostgreSQL 설정을 확인하세요"
        fi
    else
        log WARNING "PostgreSQL이 실행되지 않고 있습니다"
        log INFO "시스템 관리자 권한이 필요합니다. 다음 명령을 실행하세요:"
        echo -e "${YELLOW}sudo systemctl start postgresql${NC}"
        echo -e "${YELLOW}또는${NC}"
        echo -e "${YELLOW}sudo service postgresql start${NC}"
    fi
}

stop_database() {
    log INFO "PostgreSQL 중지..."
    
    if ! check_postgres; then
        log INFO "PostgreSQL이 실행되지 않고 있습니다"
        return 0
    fi
    
    log WARNING "PostgreSQL 중지는 시스템 관리자 권한이 필요합니다"
    log INFO "다음 명령을 실행하세요:"
    echo -e "${YELLOW}sudo systemctl stop postgresql${NC}"
    echo -e "${YELLOW}또는${NC}"
    echo -e "${YELLOW}sudo service postgresql stop${NC}"
}

status_database() {
    echo -e "${CYAN}데이터베이스 상태${NC}"
    echo "────────────────────────────────────────"
    
    # PostgreSQL 프로세스 상태
    echo -n "PostgreSQL 프로세스: "
    if check_postgres; then
        echo -e "${GREEN}● 실행 중${NC}"
        
        # 프로세스 정보
        ps aux | grep postgres | head -3 | while read line; do
            echo "  $line" | cut -c1-100
        done
    else
        echo -e "${RED}● 중지됨${NC}"
    fi
    
    echo
    
    # 연결 테스트
    echo -n "데이터베이스 연결: "
    if check_connection; then
        echo -e "${GREEN}● 성공${NC}"
        
        # 데이터베이스 정보
        echo
        echo "데이터베이스 정보:"
        echo "  호스트: $DB_HOST:$DB_PORT"
        echo "  사용자: $DB_USER"
        echo "  데이터베이스: $DB_NAME"
        
        # 데이터베이스 크기
        local db_size=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)
        if [ -n "$db_size" ]; then
            echo "  크기: $db_size"
        fi
        
        # 테이블 수
        local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        if [ -n "$table_count" ]; then
            echo "  테이블 수: $table_count"
        fi
    else
        echo -e "${RED}● 실패${NC}"
        echo
        echo "연결 실패 원인:"
        echo "  - PostgreSQL이 실행되지 않음"
        echo "  - 잘못된 비밀번호"
        echo "  - 네트워크/방화벽 설정"
        echo "  - PostgreSQL 설정 (pg_hba.conf)"
    fi
}

setup_database() {
    log INFO "데이터베이스 설정 시작..."
    
    # PostgreSQL 실행 확인
    if ! check_postgres; then
        log ERROR "PostgreSQL이 실행되지 않고 있습니다"
        log INFO "./db.sh start 명령을 먼저 실행하세요"
        return 1
    fi
    
    # 연결 테스트
    if ! check_connection; then
        log ERROR "데이터베이스에 연결할 수 없습니다"
        log INFO "PostgreSQL 설정과 비밀번호를 확인하세요"
        return 1
    fi
    
    # 데이터베이스 존재 확인
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log SUCCESS "데이터베이스 '$DB_NAME'이 이미 존재합니다"
    else
        # 데이터베이스 생성
        log INFO "데이터베이스 '$DB_NAME' 생성 중..."
        PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        if [ $? -eq 0 ]; then
            log SUCCESS "데이터베이스 '$DB_NAME' 생성 완료"
        else
            log ERROR "데이터베이스 생성 실패"
            return 1
        fi
    fi
    
    # 테이블 생성 (Node.js 스크립트 실행)
    if [ -f "server/init-db.js" ]; then
        log INFO "테이블 초기화 중..."
        node server/init-db.js
        log SUCCESS "테이블 초기화 완료"
    elif [ -f "package.json" ] && grep -q "setup-db" package.json; then
        log INFO "npm run setup-db 실행 중..."
        npm run setup-db
        log SUCCESS "데이터베이스 설정 완료"
    else
        log WARNING "데이터베이스 초기화 스크립트를 찾을 수 없습니다"
    fi
}

backup_database() {
    log INFO "데이터베이스 백업 시작..."
    
    # 연결 테스트
    if ! check_connection; then
        log ERROR "데이터베이스에 연결할 수 없습니다"
        return 1
    fi
    
    local backup_file="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    log INFO "백업 파일: $backup_file"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$backup_file"
    
    if [ $? -eq 0 ] && [ -f "$backup_file" ]; then
        # 압축
        gzip "$backup_file"
        log SUCCESS "데이터베이스 백업 완료: ${backup_file}.gz"
        
        # 백업 파일 크기
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        log INFO "백업 크기: $size"
    else
        log ERROR "데이터베이스 백업 실패"
        return 1
    fi
}

restore_database() {
    log INFO "데이터베이스 복원..."
    
    # 백업 파일 목록
    local backups=($(ls -t "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null))
    
    if [ ${#backups[@]} -eq 0 ]; then
        log ERROR "백업 파일이 없습니다"
        return 1
    fi
    
    echo "사용 가능한 백업:"
    for i in "${!backups[@]}"; do
        local backup_name=$(basename "${backups[$i]}")
        local backup_date=$(echo $backup_name | sed 's/db_backup_\(.*\)\.sql\.gz/\1/' | sed 's/_/ /')
        local backup_size=$(du -h "${backups[$i]}" | cut -f1)
        echo "  $((i+1))) $backup_date ($backup_size)"
    done
    
    echo
    read -p "복원할 백업 선택 (1-${#backups[@]}): " choice
    
    if [ "$choice" -ge 1 ] && [ "$choice" -le "${#backups[@]}" ]; then
        local selected_backup="${backups[$((choice-1))]}"
        
        echo -e "${YELLOW}주의: 현재 데이터베이스가 삭제되고 백업으로 대체됩니다.${NC}"
        read -p "계속하시겠습니까? (y/n): " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            # 현재 DB 백업
            log INFO "현재 데이터베이스 백업 중..."
            backup_database
            
            # 압축 해제
            local temp_sql="/tmp/restore_$(date +%s).sql"
            gunzip -c "$selected_backup" > "$temp_sql"
            
            # 데이터베이스 재생성
            log INFO "데이터베이스 재생성 중..."
            PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null
            PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
            
            # 복원
            log INFO "데이터 복원 중..."
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" < "$temp_sql"
            
            rm "$temp_sql"
            
            if [ $? -eq 0 ]; then
                log SUCCESS "데이터베이스 복원 완료"
            else
                log ERROR "데이터베이스 복원 실패"
                return 1
            fi
        else
            log INFO "복원 취소됨"
        fi
    else
        log ERROR "잘못된 선택"
        return 1
    fi
}

query_database() {
    log INFO "데이터베이스 쿼리 모드"
    
    if ! check_connection; then
        log ERROR "데이터베이스에 연결할 수 없습니다"
        return 1
    fi
    
    log SUCCESS "PostgreSQL 연결됨 (종료: \\q)"
    echo
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
}

list_tables() {
    log INFO "테이블 목록 조회 중..."
    
    if ! check_connection; then
        log ERROR "데이터베이스에 연결할 수 없습니다"
        return 1
    fi
    
    echo
    echo "데이터베이스: $DB_NAME"
    echo "────────────────────────────────────────"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt"
}

#############################################
# Redis 관리 함수
#############################################

check_redis() {
    # Redis 프로세스 확인
    if pgrep -x "redis-server" > /dev/null; then
        return 0
    else
        return 1
    fi
}

check_redis_connection() {
    # Redis 연결 테스트
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping > /dev/null 2>&1
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1
    fi
    return $?
}

start_redis() {
    log INFO "Redis 시작 확인 중..."
    
    if check_redis; then
        log SUCCESS "Redis가 이미 실행 중입니다"
        
        # 연결 테스트
        if check_redis_connection; then
            log SUCCESS "Redis 연결 성공"
        else
            log WARNING "Redis는 실행 중이지만 연결할 수 없습니다"
            log INFO "Redis 설정을 확인하세요"
        fi
    else
        log WARNING "Redis가 실행되지 않고 있습니다"
        log INFO "시스템 관리자 권한이 필요합니다. 다음 명령을 실행하세요:"
        echo -e "${YELLOW}sudo systemctl start redis-server${NC}"
        echo -e "${YELLOW}또는${NC}"
        echo -e "${YELLOW}sudo service redis-server start${NC}"
        echo -e "${YELLOW}또는${NC}"
        echo -e "${YELLOW}redis-server --daemonize yes${NC}"
    fi
}

stop_redis() {
    log INFO "Redis 중지..."
    
    if ! check_redis; then
        log INFO "Redis가 실행되지 않고 있습니다"
        return 0
    fi
    
    log WARNING "Redis 중지는 시스템 관리자 권한이 필요합니다"
    log INFO "다음 명령을 실행하세요:"
    echo -e "${YELLOW}sudo systemctl stop redis-server${NC}"
    echo -e "${YELLOW}또는${NC}"
    echo -e "${YELLOW}sudo service redis-server stop${NC}"
    echo -e "${YELLOW}또는${NC}"
    echo -e "${YELLOW}redis-cli shutdown${NC}"
}

status_redis() {
    echo -e "${CYAN}Redis 상태${NC}"
    echo "────────────────────────────────────────"
    
    # Redis 프로세스 상태
    echo -n "Redis 프로세스: "
    if check_redis; then
        echo -e "${GREEN}● 실행 중${NC}"
        
        # 프로세스 정보
        ps aux | grep redis-server | grep -v grep | head -1 | while read line; do
            echo "  $line" | cut -c1-100
        done
    else
        echo -e "${RED}● 중지됨${NC}"
    fi
    
    echo
    
    # 연결 테스트
    echo -n "Redis 연결: "
    if check_redis_connection; then
        echo -e "${GREEN}● 성공${NC}"
        
        # Redis 정보
        echo
        echo "Redis 정보:"
        echo "  호스트: $REDIS_HOST:$REDIS_PORT"
        
        # Redis 버전
        local redis_version=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --version 2>/dev/null | awk '{print $2}')
        if [ -n "$redis_version" ]; then
            echo "  버전: $redis_version"
        fi
        
        # 메모리 사용량
        if [ -z "$REDIS_PASSWORD" ]; then
            local memory_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        else
            local memory_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        fi
        if [ -n "$memory_info" ]; then
            echo "  메모리 사용: $memory_info"
        fi
        
        # 키 개수
        if [ -z "$REDIS_PASSWORD" ]; then
            local key_count=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" DBSIZE 2>/dev/null | awk '{print $2}')
        else
            local key_count=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" DBSIZE 2>/dev/null | awk '{print $2}')
        fi
        if [ -n "$key_count" ]; then
            echo "  키 개수: $key_count"
        fi
    else
        echo -e "${RED}● 실패${NC}"
        echo
        echo "연결 실패 원인:"
        echo "  - Redis가 실행되지 않음"
        echo "  - 잘못된 비밀번호"
        echo "  - 네트워크/방화벽 설정"
        echo "  - Redis 설정 (redis.conf)"
    fi
}

redis_cli() {
    log INFO "Redis CLI 모드"
    
    if ! check_redis_connection; then
        log ERROR "Redis에 연결할 수 없습니다"
        return 1
    fi
    
    log SUCCESS "Redis 연결됨 (종료: exit)"
    echo
    
    if [ -z "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD"
    fi
}

flush_redis() {
    log WARNING "Redis 데이터 삭제"
    
    if ! check_redis_connection; then
        log ERROR "Redis에 연결할 수 없습니다"
        return 1
    fi
    
    echo -e "${YELLOW}주의: 모든 Redis 데이터가 삭제됩니다.${NC}"
    read -p "계속하시겠습니까? (y/n): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        if [ -z "$REDIS_PASSWORD" ]; then
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" FLUSHALL
        else
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" FLUSHALL
        fi
        log SUCCESS "Redis 데이터 삭제 완료"
    else
        log INFO "취소됨"
    fi
}

#############################################
# 도움말
#############################################

show_help() {
    echo -e "${CYAN}Mini Area PostgreSQL & Redis 관리${NC}"
    echo "────────────────────────────────────────"
    echo
    echo "사용법: ./db-redis.sh [명령어]"
    echo
    echo -e "${WHITE}PostgreSQL 명령어:${NC}"
    echo -e "  ${GREEN}start${NC}       PostgreSQL 시작/확인"
    echo -e "  ${GREEN}stop${NC}        PostgreSQL 중지 안내"
    echo -e "  ${GREEN}status${NC}      데이터베이스 상태 확인"
    echo -e "  ${GREEN}setup${NC}       데이터베이스 초기 설정"
    echo -e "  ${GREEN}backup${NC}      데이터베이스 백업"
    echo -e "  ${GREEN}restore${NC}     데이터베이스 복원"
    echo -e "  ${GREEN}query${NC}       PostgreSQL 쿼리 모드"
    echo -e "  ${GREEN}tables${NC}      테이블 목록 보기"
    echo
    echo -e "${WHITE}Redis 명령어:${NC}"
    echo -e "  ${GREEN}redis-start${NC}  Redis 시작/확인"
    echo -e "  ${GREEN}redis-stop${NC}   Redis 중지 안내"
    echo -e "  ${GREEN}redis-status${NC} Redis 상태 확인"
    echo -e "  ${GREEN}redis-cli${NC}    Redis CLI 모드"
    echo -e "  ${GREEN}redis-flush${NC}  Redis 데이터 삭제"
    echo
    echo -e "${WHITE}통합 명령어:${NC}"
    echo -e "  ${GREEN}all-start${NC}   모든 서비스 시작"
    echo -e "  ${GREEN}all-stop${NC}    모든 서비스 중지"
    echo -e "  ${GREEN}all-status${NC}  모든 서비스 상태"
    echo -e "  ${GREEN}help${NC}        도움말 표시"
    echo
    echo "PostgreSQL 설정:"
    echo "  호스트: $DB_HOST:$DB_PORT"
    echo "  사용자: $DB_USER"
    echo "  데이터베이스: $DB_NAME"
    echo
    echo "Redis 설정:"
    echo "  호스트: $REDIS_HOST:$REDIS_PORT"
    echo
    echo "참고:"
    echo "  - 시작/중지는 시스템 권한이 필요할 수 있습니다"
    echo "  - 설정은 .env 파일에서 읽어옵니다"
    echo "  - 백업은 $BACKUP_DIR 디렉토리에 저장됩니다"
}

#############################################
# 메인 처리
#############################################

case "$1" in
    # PostgreSQL 명령어
    start)
        start_database
        ;;
    stop)
        stop_database
        ;;
    status)
        status_database
        ;;
    setup)
        setup_database
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database
        ;;
    query|psql)
        query_database
        ;;
    tables|list)
        list_tables
        ;;
    
    # Redis 명령어
    redis-start)
        start_redis
        ;;
    redis-stop)
        stop_redis
        ;;
    redis-status)
        status_redis
        ;;
    redis-cli)
        redis_cli
        ;;
    redis-flush)
        flush_redis
        ;;
    
    # 통합 명령어
    all-start)
        echo -e "${CYAN}모든 서비스 시작${NC}"
        echo "────────────────────────────────────────"
        echo
        start_database
        echo
        start_redis
        ;;
    all-stop)
        echo -e "${CYAN}모든 서비스 중지${NC}"
        echo "────────────────────────────────────────"
        echo
        stop_redis
        echo
        stop_database
        ;;
    all-status)
        echo -e "${CYAN}모든 서비스 상태${NC}"
        echo "────────────────────────────────────────"
        echo
        status_database
        echo
        status_redis
        ;;
    
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}알 수 없는 명령어: $1${NC}"
        echo
        show_help
        exit 1
        ;;
esac

exit 0