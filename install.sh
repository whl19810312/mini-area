#!/bin/bash

# Mini Area 메타버스 플랫폼 자동 설치 스크립트
# 작성자: Claude Code
# 버전: 1.0.0

set -e  # 오류 발생 시 즉시 종료

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 로고 출력
print_logo() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║               🌟 Mini Area Installer 🌟                  ║"
    echo "║                                                          ║"
    echo "║        메타버스 플랫폼 자동 설치 및 설정 도구               ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 진행상황 표시
print_step() {
    echo -e "\n${BLUE}[$(date '+%H:%M:%S')] 📦 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 시스템 정보 확인
check_system() {
    print_step "시스템 정보 확인 중..."
    
    # OS 확인
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if [ -f /etc/debian_version ]; then
            DISTRO="debian"
            PKG_MANAGER="apt"
        elif [ -f /etc/redhat-release ]; then
            DISTRO="redhat"
            PKG_MANAGER="yum"
        elif [ -f /etc/arch-release ]; then
            DISTRO="arch"
            PKG_MANAGER="pacman"
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        PKG_MANAGER="brew"
    else
        OS="unknown"
    fi
    
    print_success "OS: $OS, 배포판: ${DISTRO:-"N/A"}, 패키지 매니저: $PKG_MANAGER"
    
    # 아키텍처 확인
    ARCH=$(uname -m)
    print_success "아키텍처: $ARCH"
    
    # 메모리 확인
    if [[ "$OS" == "linux" ]]; then
        MEMORY=$(free -h | awk '/^Mem:/ {print $2}')
        print_success "메모리: $MEMORY"
    elif [[ "$OS" == "macos" ]]; then
        MEMORY=$(system_profiler SPHardwareDataType | grep "Memory:" | awk '{print $2 $3}')
        print_success "메모리: $MEMORY"
    fi
}

# 필수 도구 설치
install_system_dependencies() {
    print_step "시스템 종속성 설치 중..."
    
    case $PKG_MANAGER in
        "apt")
            sudo apt update
            sudo apt install -y curl wget git unzip software-properties-common
            ;;
        "yum")
            sudo yum update -y
            sudo yum install -y curl wget git unzip epel-release
            ;;
        "pacman")
            sudo pacman -Syu --noconfirm
            sudo pacman -S --noconfirm curl wget git unzip
            ;;
        "brew")
            brew update
            brew install curl wget git
            ;;
        *)
            print_error "지원하지 않는 패키지 매니저입니다: $PKG_MANAGER"
            exit 1
            ;;
    esac
    
    print_success "시스템 종속성 설치 완료"
}

# Node.js 설치
install_nodejs() {
    print_step "Node.js 설치 확인 중..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js가 이미 설치되어 있습니다: $NODE_VERSION"
        
        # 버전 확인 (v16 이상 필요)
        MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
        if [ "$MAJOR_VERSION" -lt 16 ]; then
            print_warning "Node.js 버전이 너무 낮습니다. v16 이상 권장됩니다."
            read -p "Node.js를 업데이트하시겠습니까? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_nodejs_fresh
            fi
        fi
    else
        print_warning "Node.js가 설치되지 않았습니다."
        install_nodejs_fresh
    fi
    
    # npm 버전 확인
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm 버전: $NPM_VERSION"
    fi
}

install_nodejs_fresh() {
    print_step "Node.js 최신 LTS 버전 설치 중..."
    
    # NodeSource 저장소 사용 (Linux)
    if [[ "$OS" == "linux" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        case $PKG_MANAGER in
            "apt")
                sudo apt-get install -y nodejs
                ;;
            "yum")
                sudo yum install -y nodejs npm
                ;;
        esac
    elif [[ "$OS" == "macos" ]]; then
        brew install node
    fi
    
    print_success "Node.js 설치 완료: $(node --version)"
}

# PostgreSQL 설치
install_postgresql() {
    print_step "PostgreSQL 설치 확인 중..."
    
    if command -v psql &> /dev/null; then
        PG_VERSION=$(psql --version | awk '{print $3}')
        print_success "PostgreSQL이 이미 설치되어 있습니다: $PG_VERSION"
    else
        print_warning "PostgreSQL이 설치되지 않았습니다."
        install_postgresql_fresh
    fi
}

install_postgresql_fresh() {
    print_step "PostgreSQL 설치 중..."
    
    case $PKG_MANAGER in
        "apt")
            sudo apt install -y postgresql postgresql-contrib
            ;;
        "yum")
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
            ;;
        "pacman")
            sudo pacman -S --noconfirm postgresql
            sudo -u postgres initdb -D /var/lib/postgres/data
            ;;
        "brew")
            brew install postgresql
            ;;
    esac
    
    # PostgreSQL 서비스 시작
    if [[ "$OS" == "linux" ]]; then
        sudo systemctl enable postgresql
        sudo systemctl start postgresql
    elif [[ "$OS" == "macos" ]]; then
        brew services start postgresql
    fi
    
    print_success "PostgreSQL 설치 및 시작 완료"
}

# 데이터베이스 설정
setup_database() {
    print_step "데이터베이스 설정 중..."
    
    # 데이터베이스 및 사용자 생성
    sudo -u postgres psql -c "CREATE DATABASE miniarea;" 2>/dev/null || print_warning "데이터베이스 'miniarea'가 이미 존재합니다."
    sudo -u postgres psql -c "CREATE USER miniarea_user WITH ENCRYPTED PASSWORD 'miniarea_password';" 2>/dev/null || print_warning "사용자 'miniarea_user'가 이미 존재합니다."
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE miniarea TO miniarea_user;"
    
    print_success "데이터베이스 설정 완료"
}

# Redis 설치 (캐싱 및 세션 관리용)
install_redis() {
    print_step "Redis 설치 확인 중..."
    
    if command -v redis-server &> /dev/null; then
        print_success "Redis가 이미 설치되어 있습니다."
    else
        print_warning "Redis 설치 중..."
        
        case $PKG_MANAGER in
            "apt")
                sudo apt install -y redis-server
                ;;
            "yum")
                sudo yum install -y redis
                ;;
            "pacman")
                sudo pacman -S --noconfirm redis
                ;;
            "brew")
                brew install redis
                ;;
        esac
        
        # Redis 서비스 시작
        if [[ "$OS" == "linux" ]]; then
            sudo systemctl enable redis-server
            sudo systemctl start redis-server
        elif [[ "$OS" == "macos" ]]; then
            brew services start redis
        fi
        
        print_success "Redis 설치 및 시작 완료"
    fi
}

# Nginx 설치 (프로덕션 환경용)
install_nginx() {
    print_step "Nginx 설치 확인 중..."
    
    read -p "Nginx를 설치하시겠습니까? (프로덕션 환경 권장) (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v nginx &> /dev/null; then
            print_success "Nginx가 이미 설치되어 있습니다."
        else
            case $PKG_MANAGER in
                "apt")
                    sudo apt install -y nginx
                    ;;
                "yum")
                    sudo yum install -y nginx
                    ;;
                "pacman")
                    sudo pacman -S --noconfirm nginx
                    ;;
                "brew")
                    brew install nginx
                    ;;
            esac
            
            print_success "Nginx 설치 완료"
        fi
    fi
}

# PM2 설치 (프로세스 관리자)
install_pm2() {
    print_step "PM2 프로세스 매니저 설치 중..."
    
    if command -v pm2 &> /dev/null; then
        print_success "PM2가 이미 설치되어 있습니다."
    else
        npm install -g pm2
        print_success "PM2 설치 완료"
    fi
}

# 프로젝트 종속성 설치
install_project_dependencies() {
    print_step "프로젝트 종속성 설치 중..."
    
    # 서버 종속성 설치
    print_step "서버 종속성 설치 중..."
    cd server
    npm install
    cd ..
    
    # 클라이언트 종속성 설치
    print_step "클라이언트 종속성 설치 중..."
    cd client
    npm install
    cd ..
    
    print_success "모든 프로젝트 종속성 설치 완료"
}

# 환경 설정 파일 생성
create_env_files() {
    print_step "환경 설정 파일 생성 중..."
    
    # 서버 .env 파일
    if [ ! -f "server/.env" ]; then
        cat > server/.env << EOF
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_NAME=miniarea
DB_USER=miniarea_user
DB_PASSWORD=miniarea_password

# 서버 설정
PORT=7000
NODE_ENV=development

# JWT 설정
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379

# Agora 설정 (사용자가 입력해야 함)
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# 이메일 설정 (선택사항)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EOF
        print_success "서버 .env 파일 생성 완료"
    else
        print_warning "서버 .env 파일이 이미 존재합니다."
    fi
    
    # 클라이언트 .env 파일
    if [ ! -f "client/.env" ]; then
        cat > client/.env << EOF
# Vite 환경 변수
VITE_API_BASE_URL=https://localhost:7000
VITE_AGORA_APP_ID=your_agora_app_id
VITE_NODE_ENV=development
EOF
        print_success "클라이언트 .env 파일 생성 완료"
    else
        print_warning "클라이언트 .env 파일이 이미 존재합니다."
    fi
}

# SSL 인증서 생성 (개발용)
generate_ssl_certificates() {
    print_step "개발용 SSL 인증서 생성 중..."
    
    if [ ! -d "server/certs" ]; then
        mkdir -p server/certs
    fi
    
    if [ ! -f "server/certs/server.key" ] || [ ! -f "server/certs/server.crt" ]; then
        openssl req -x509 -newkey rsa:4096 -keyout server/certs/server.key -out server/certs/server.crt -days 365 -nodes -subj "/C=KR/ST=Seoul/L=Seoul/O=MiniArea/OU=Dev/CN=localhost"
        print_success "SSL 인증서 생성 완료"
    else
        print_warning "SSL 인증서가 이미 존재합니다."
    fi
}

# 데이터베이스 초기화
initialize_database() {
    print_step "데이터베이스 초기화 중..."
    
    cd server
    if [ -f "database/init.sql" ]; then
        PGPASSWORD=miniarea_password psql -h localhost -U miniarea_user -d miniarea -f database/init.sql
        print_success "데이터베이스 초기화 완료"
    else
        print_warning "데이터베이스 초기화 스크립트를 찾을 수 없습니다."
    fi
    cd ..
}

# 권한 설정
set_permissions() {
    print_step "파일 권한 설정 중..."
    
    # 실행 권한 부여
    chmod +x scripts/*.sh 2>/dev/null || true
    chmod +x server/scripts/*.sh 2>/dev/null || true
    
    # 로그 디렉토리 생성
    mkdir -p logs server/logs client/logs
    
    print_success "권한 설정 완료"
}

# 서비스 등록 (선택사항)
register_service() {
    print_step "시스템 서비스 등록..."
    
    read -p "시스템 서비스로 등록하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ "$OS" == "linux" ]]; then
            cat > /tmp/miniarea.service << EOF
[Unit]
Description=Mini Area Metaverse Platform
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which pm2) start ecosystem.config.js --no-daemon
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
            sudo mv /tmp/miniarea.service /etc/systemd/system/
            sudo systemctl daemon-reload
            sudo systemctl enable miniarea
            print_success "시스템 서비스 등록 완료"
        fi
    fi
}

# PM2 생태계 파일 생성
create_pm2_ecosystem() {
    print_step "PM2 생태계 파일 생성 중..."
    
    if [ ! -f "ecosystem.config.js" ]; then
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'miniarea-server',
      script: './server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 7000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 7000
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_file: './logs/server-combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF
        print_success "PM2 생태계 파일 생성 완료"
    else
        print_warning "PM2 생태계 파일이 이미 존재합니다."
    fi
}

# 최종 확인 및 실행 가이드
final_setup_guide() {
    print_step "설치 완료 및 실행 가이드"
    
    echo -e "\n${GREEN}🎉 Mini Area 설치가 완료되었습니다! 🎉${NC}\n"
    
    echo -e "${CYAN}다음 단계를 진행해주세요:${NC}\n"
    
    echo -e "${WHITE}1. Agora 설정${NC}"
    echo -e "   • server/.env 파일에서 AGORA_APP_ID와 AGORA_APP_CERTIFICATE를 설정하세요"
    echo -e "   • client/.env 파일에서 VITE_AGORA_APP_ID를 설정하세요"
    
    echo -e "\n${WHITE}2. 개발 서버 실행${NC}"
    echo -e "   ${YELLOW}# 서버 실행${NC}"
    echo -e "   cd server && npm run dev"
    echo -e "   ${YELLOW}# 클라이언트 실행 (새 터미널)${NC}"
    echo -e "   cd client && npm run dev"
    
    echo -e "\n${WHITE}3. 프로덕션 배포${NC}"
    echo -e "   ${YELLOW}# 클라이언트 빌드${NC}"
    echo -e "   cd client && npm run build"
    echo -e "   ${YELLOW}# PM2로 서버 시작${NC}"
    echo -e "   pm2 start ecosystem.config.js"
    
    echo -e "\n${WHITE}4. 접속 정보${NC}"
    echo -e "   • 개발 서버: https://localhost:5173"
    echo -e "   • API 서버: https://localhost:7000"
    echo -e "   • 데이터베이스: PostgreSQL (localhost:5432/miniarea)"
    
    echo -e "\n${WHITE}5. 유용한 명령어${NC}"
    echo -e "   • ${YELLOW}./start.sh${NC} - 개발 서버 시작"
    echo -e "   • ${YELLOW}./stop.sh${NC} - 서버 중지"
    echo -e "   • ${YELLOW}./logs.sh${NC} - 로그 확인"
    echo -e "   • ${YELLOW}pm2 status${NC} - PM2 상태 확인"
    echo -e "   • ${YELLOW}pm2 logs${NC} - PM2 로그 확인"
    
    echo -e "\n${RED}⚠️  중요 사항:${NC}"
    echo -e "   • 개발용 SSL 인증서가 생성되었습니다 (브라우저 경고 무시)"
    echo -e "   • 프로덕션 환경에서는 적절한 SSL 인증서를 사용하세요"
    echo -e "   • 데이터베이스 백업을 정기적으로 수행하세요"
    
    echo -e "\n${PURPLE}문제가 발생하면 로그를 확인하거나 GitHub 이슈를 등록해주세요.${NC}\n"
}

# 메인 설치 프로세스
main() {
    print_logo
    
    echo -e "${CYAN}Mini Area 메타버스 플랫폼 설치를 시작합니다...${NC}\n"
    
    # 시스템 확인
    check_system
    
    # 시스템 종속성 설치
    install_system_dependencies
    
    # Node.js 설치
    install_nodejs
    
    # 데이터베이스 설치
    install_postgresql
    setup_database
    
    # Redis 설치
    install_redis
    
    # Nginx 설치 (선택사항)
    install_nginx
    
    # PM2 설치
    install_pm2
    
    # 프로젝트 종속성 설치
    install_project_dependencies
    
    # 환경 설정 파일 생성
    create_env_files
    
    # SSL 인증서 생성
    generate_ssl_certificates
    
    # 데이터베이스 초기화
    initialize_database
    
    # 권한 설정
    set_permissions
    
    # PM2 생태계 파일 생성
    create_pm2_ecosystem
    
    # 서비스 등록 (선택사항)
    register_service
    
    # 최종 가이드
    final_setup_guide
}

# 인자 처리
case "${1:-}" in
    "--help"|"-h")
        echo "Mini Area 설치 스크립트"
        echo "사용법: $0 [옵션]"
        echo ""
        echo "옵션:"
        echo "  --help, -h     이 도움말 표시"
        echo "  --version, -v  버전 정보 표시"
        echo ""
        echo "예제:"
        echo "  $0              # 전체 설치 실행"
        echo "  $0 --help      # 도움말 표시"
        exit 0
        ;;
    "--version"|"-v")
        echo "Mini Area Installer v1.0.0"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo "알 수 없는 옵션: $1"
        echo "도움말을 보려면 $0 --help를 실행하세요."
        exit 1
        ;;
esac