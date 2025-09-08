#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}       로그인 사용자 정보 초기화 스크립트${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# PostgreSQL 연결 정보
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="metaverse_db"
DB_USER="metaverse_user"
DB_PASSWORD="meta123!@#"

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}[경고] 이 작업은 다음 항목들을 초기화합니다:${NC}"
echo -e "  • 모든 사용자의 입실 정보"
echo -e "  • 현재 위치 및 맵 정보"
echo -e "  • 온라인/오프라인 상태"
echo -e "  • 캐릭터 위치 정보"
echo ""

# 확인 메시지
read -p "정말로 모든 로그인 사용자 정보를 초기화하시겠습니까? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}취소되었습니다.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[1/3] PostgreSQL 데이터베이스 초기화 중...${NC}"

# UserStatus 테이블 초기화 (모든 사용자를 오프라인으로)
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF 2>/dev/null
-- UserStatus 테이블 업데이트
UPDATE "UserStatuses" SET 
    "isOnline" = false,
    "currentMapId" = NULL,
    "lastActivity" = NOW(),
    "updatedAt" = NOW()
WHERE "isOnline" = true;

-- UserRoomEntries 테이블 초기화 (모든 입실 정보 삭제)
DELETE FROM "UserRoomEntries";

-- 결과 확인
SELECT COUNT(*) as offline_users FROM "UserStatuses" WHERE "isOnline" = false;
SELECT COUNT(*) as online_users FROM "UserStatuses" WHERE "isOnline" = true;
SELECT COUNT(*) as room_entries FROM "UserRoomEntries";
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 데이터베이스 초기화 완료${NC}"
else
    echo -e "${RED}✗ 데이터베이스 초기화 실패${NC}"
fi

echo ""
echo -e "${BLUE}[2/3] Redis 캐시 초기화 중...${NC}"

# Redis가 실행 중인지 확인
if command -v redis-cli &> /dev/null; then
    # Redis 캐시 초기화 (사용자 세션 관련 키 삭제)
    redis-cli <<EOF 2>/dev/null
EVAL "return redis.call('del', 'defaultKey', unpack(redis.call('keys', 'user:*')))" 0
EVAL "return redis.call('del', 'defaultKey', unpack(redis.call('keys', 'session:*')))" 0
EVAL "return redis.call('del', 'defaultKey', unpack(redis.call('keys', 'map:*:users')))" 0
FLUSHDB
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Redis 캐시 초기화 완료${NC}"
    else
        echo -e "${YELLOW}⚠ Redis 캐시 초기화 부분 실패 (서비스가 실행 중이 아닐 수 있음)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Redis가 설치되어 있지 않음 - 건너뜀${NC}"
fi

echo ""
echo -e "${BLUE}[3/3] 서버 재시작 중...${NC}"

# 서버 프로세스 찾기 및 재시작
SERVER_PID=$(pgrep -f "node.*server")

if [ -n "$SERVER_PID" ]; then
    echo -e "${YELLOW}기존 서버 프로세스 종료 중 (PID: $SERVER_PID)...${NC}"
    kill -TERM $SERVER_PID 2>/dev/null
    sleep 2
    
    # 강제 종료가 필요한 경우
    if kill -0 $SERVER_PID 2>/dev/null; then
        kill -KILL $SERVER_PID 2>/dev/null
    fi
fi

# 서버 재시작
cd "$PROJECT_ROOT"
if [ -f "package.json" ]; then
    echo -e "${YELLOW}서버를 다시 시작하는 중...${NC}"
    nohup npm start > server.log 2>&1 &
    NEW_PID=$!
    sleep 3
    
    # 서버가 정상적으로 시작되었는지 확인
    if kill -0 $NEW_PID 2>/dev/null; then
        echo -e "${GREEN}✓ 서버가 성공적으로 재시작되었습니다 (PID: $NEW_PID)${NC}"
    else
        echo -e "${RED}✗ 서버 시작 실패${NC}"
        echo -e "${YELLOW}수동으로 'npm start' 명령을 실행해주세요.${NC}"
    fi
else
    echo -e "${RED}✗ package.json을 찾을 수 없습니다${NC}"
    echo -e "${YELLOW}프로젝트 루트 디렉토리에서 수동으로 서버를 시작해주세요.${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       로그인 사용자 정보 초기화 완료!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}초기화된 항목:${NC}"
echo -e "  • 모든 사용자 오프라인 상태로 변경"
echo -e "  • 모든 입실 정보 삭제"
echo -e "  • Redis 캐시 초기화"
echo -e "  • 서버 재시작"
echo ""
echo -e "${BLUE}모든 사용자는 다시 로그인하여 입실해야 합니다.${NC}"