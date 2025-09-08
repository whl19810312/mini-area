#!/bin/bash

#############################################
# SSL 인증서 통합 관리 스크립트
# 
# 모든 서비스에서 사용하는 SSL 인증서를 중앙에서 관리
# 사용법: ./ssl-manager.sh [명령어]
#############################################

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 경로 설정
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SSL_DIR="$SCRIPT_DIR/ssl"

# SSL 파일 경로
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"
SERVER_CERT="$SSL_DIR/server.crt"
SERVER_KEY="$SSL_DIR/server.key"
KEYSTORE_JKS="$SSL_DIR/keystore.jks"
KEYSTORE_P12="$SSL_DIR/keystore.p12"

# 로깅 함수
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)
            echo -e "${GREEN}[INFO]${NC} ${message}"
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} ${message}"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${message}"
            ;;
        *)
            echo "${message}"
            ;;
    esac
}

# SSL 디렉토리 생성
create_ssl_dir() {
    if [ ! -d "$SSL_DIR" ]; then
        mkdir -p "$SSL_DIR"
        log INFO "SSL 디렉토리 생성: $SSL_DIR"
    fi
}

# SSL 인증서 생성
generate_cert() {
    create_ssl_dir
    
    log INFO "자체 서명 SSL 인증서 생성 중..."
    
    # 기본 인증서 생성 (cert.pem, key.pem)
    openssl req -x509 -newkey rsa:4096 -nodes \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -days 365 \
        -subj "/C=KR/ST=Seoul/L=Seoul/O=MiniArea/OU=Development/CN=localhost"
    
    # 서버용 인증서 복사 (server.crt, server.key)
    cp "$CERT_FILE" "$SERVER_CERT"
    cp "$KEY_FILE" "$SERVER_KEY"
    
    # 권한 설정
    chmod 600 "$KEY_FILE" "$SERVER_KEY"
    chmod 644 "$CERT_FILE" "$SERVER_CERT"
    
    log INFO "SSL 인증서 생성 완료"
    log INFO "  - 인증서: $CERT_FILE"
    log INFO "  - 개인키: $KEY_FILE"
    log INFO "  - 유효기간: 365일"
}

# Java KeyStore 생성 (OpenVidu, Janus 등을 위한)
generate_keystore() {
    create_ssl_dir
    
    if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
        log WARN "SSL 인증서가 없습니다. 먼저 생성합니다."
        generate_cert
    fi
    
    log INFO "Java KeyStore 생성 중..."
    
    # PKCS12 형식으로 변환
    openssl pkcs12 -export \
        -in "$CERT_FILE" \
        -inkey "$KEY_FILE" \
        -out "$KEYSTORE_P12" \
        -name "miniarea" \
        -passout pass:miniarea123
    
    # JKS 형식으로 변환 (Java 8 호환)
    keytool -importkeystore \
        -srckeystore "$KEYSTORE_P12" \
        -srcstoretype PKCS12 \
        -srcstorepass miniarea123 \
        -destkeystore "$KEYSTORE_JKS" \
        -deststoretype JKS \
        -deststorepass miniarea123 \
        -noprompt 2>/dev/null || true
    
    chmod 600 "$KEYSTORE_P12" "$KEYSTORE_JKS"
    
    log INFO "KeyStore 생성 완료"
    log INFO "  - PKCS12: $KEYSTORE_P12"
    log INFO "  - JKS: $KEYSTORE_JKS"
    log INFO "  - 비밀번호: miniarea123"
}

# 인증서 정보 표시
show_info() {
    if [ ! -f "$CERT_FILE" ]; then
        log ERROR "SSL 인증서가 없습니다. 'generate' 명령으로 먼저 생성하세요."
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}=== SSL 인증서 정보 ===${NC}"
    echo ""
    
    # 인증서 정보 파싱
    openssl x509 -in "$CERT_FILE" -noout -text | grep -E "Subject:|Issuer:|Not Before:|Not After:" | sed 's/^[ ]*//'
    
    echo ""
    echo -e "${BLUE}=== 파일 목록 ===${NC}"
    echo ""
    ls -la "$SSL_DIR"
    
    echo ""
    echo -e "${BLUE}=== 서비스별 SSL 경로 ===${NC}"
    echo ""
    echo "Node.js 서버:"
    echo "  - cert: $CERT_FILE"
    echo "  - key: $KEY_FILE"
    echo ""
    echo "Vite 클라이언트:"
    echo "  - cert: $CERT_FILE"
    echo "  - key: $KEY_FILE"
    echo ""
    echo "Java 기반 서비스 (OpenVidu, Janus):"
    echo "  - keystore: $KEYSTORE_JKS"
    echo "  - password: miniarea123"
}

# 인증서 검증
verify_cert() {
    if [ ! -f "$CERT_FILE" ]; then
        log ERROR "SSL 인증서가 없습니다."
        return 1
    fi
    
    log INFO "SSL 인증서 검증 중..."
    
    # 인증서 유효성 검사
    if openssl x509 -in "$CERT_FILE" -noout -checkend 0; then
        log INFO "인증서가 유효합니다."
        
        # 만료일 확인
        EXPIRY=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
        log INFO "만료일: $EXPIRY"
        
        # 30일 이내 만료 경고
        if ! openssl x509 -in "$CERT_FILE" -noout -checkend 2592000; then
            log WARN "인증서가 30일 이내에 만료됩니다. 갱신을 고려하세요."
        fi
    else
        log ERROR "인증서가 만료되었습니다. 재생성이 필요합니다."
        return 1
    fi
}

# 인증서 백업
backup_cert() {
    if [ ! -f "$CERT_FILE" ]; then
        log ERROR "백업할 인증서가 없습니다."
        exit 1
    fi
    
    BACKUP_DIR="$SCRIPT_DIR/backups/ssl"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/ssl_backup_$TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    log INFO "SSL 인증서 백업 중..."
    cp -r "$SSL_DIR"/* "$BACKUP_PATH/"
    
    log INFO "백업 완료: $BACKUP_PATH"
}

# 인증서 복원
restore_cert() {
    local BACKUP_PATH=$1
    
    if [ -z "$BACKUP_PATH" ]; then
        log ERROR "백업 경로를 지정하세요."
        echo "사용법: $0 restore <백업경로>"
        exit 1
    fi
    
    if [ ! -d "$BACKUP_PATH" ]; then
        log ERROR "백업 디렉토리가 존재하지 않습니다: $BACKUP_PATH"
        exit 1
    fi
    
    log INFO "SSL 인증서 복원 중..."
    
    # 기존 인증서 백업
    if [ -f "$CERT_FILE" ]; then
        backup_cert
    fi
    
    # 복원
    cp -r "$BACKUP_PATH"/* "$SSL_DIR/"
    
    log INFO "복원 완료"
    verify_cert
}

# 인증서 삭제
clean_cert() {
    log WARN "모든 SSL 인증서를 삭제합니다."
    read -p "계속하시겠습니까? (y/N): " confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -f "$SSL_DIR"/*
        log INFO "SSL 인증서가 삭제되었습니다."
    else
        log INFO "취소되었습니다."
    fi
}

# 도움말 표시
show_help() {
    echo ""
    echo -e "${BLUE}SSL 인증서 관리 스크립트${NC}"
    echo ""
    echo "사용법: $0 [명령어] [옵션]"
    echo ""
    echo "명령어:"
    echo "  generate    - 새 SSL 인증서 생성"
    echo "  keystore    - Java KeyStore 생성 (OpenVidu, Janus용)"
    echo "  info        - 인증서 정보 표시"
    echo "  verify      - 인증서 유효성 검증"
    echo "  backup      - 인증서 백업"
    echo "  restore     - 인증서 복원"
    echo "  clean       - 모든 인증서 삭제"
    echo "  help        - 도움말 표시"
    echo ""
    echo "예제:"
    echo "  $0 generate              # 새 인증서 생성"
    echo "  $0 keystore              # KeyStore 생성"
    echo "  $0 info                  # 인증서 정보 확인"
    echo "  $0 backup                # 현재 인증서 백업"
    echo "  $0 restore /path/to/backup  # 백업에서 복원"
    echo ""
}

# 메인 실행
main() {
    case "$1" in
        generate)
            generate_cert
            ;;
        keystore)
            generate_keystore
            ;;
        info)
            show_info
            ;;
        verify)
            verify_cert
            ;;
        backup)
            backup_cert
            ;;
        restore)
            restore_cert "$2"
            ;;
        clean)
            clean_cert
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            if [ -z "$1" ]; then
                show_help
            else
                log ERROR "알 수 없는 명령어: $1"
                show_help
                exit 1
            fi
            ;;
    esac
}

# 스크립트 실행
main "$@"