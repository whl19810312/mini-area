# Mini Area 데이터베이스 설정 가이드

이 문서는 Mini Area 프로젝트의 데이터베이스 초기 설정 및 관리 방법을 설명합니다.

## 📋 목차

- [사전 요구사항](#사전-요구사항)
- [빠른 설정](#빠른-설정)
- [상세 설정](#상세-설정)
- [데이터베이스 관리](#데이터베이스-관리)
- [문제 해결](#문제-해결)

## 🔧 사전 요구사항

### 1. PostgreSQL 설치

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

### 2. Node.js 설치
- Node.js 16.x 이상 필요
- https://nodejs.org에서 다운로드

### 3. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 설정하세요:

```bash
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=metaverse

# JWT 설정
JWT_SECRET=your-jwt-secret-key

# 이메일 설정 (선택사항)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 🚀 빠른 설정

### 자동 완전 설정 (권장)

```bash
# 실행 권한 부여 (최초 1회)
chmod +x quick-setup.sh

# 모든 설정을 자동으로 수행
./quick-setup.sh
```

이 스크립트는 다음 작업을 자동으로 수행합니다:
- ✅ npm 의존성 설치
- ✅ 데이터베이스 테이블 생성
- ✅ 인덱스 생성
- ✅ 테스트 사용자 생성
- ✅ 샘플 맵 생성
- ✅ 샘플 캐릭터 생성
- ✅ 데이터베이스 통계 업데이트

**생성되는 테스트 계정:**
- 이메일: `test@example.com`
- 비밀번호: `password123`

## 🔧 상세 설정

### 1. 수동 설정 (선택사항)

```bash
# 실행 권한 부여
chmod +x setup-database.sh

# 상세 설정 실행 (각 단계별 선택 가능)
./setup-database.sh
```

이 스크립트는 다음 작업을 단계별로 수행합니다:
- PostgreSQL 서비스 상태 확인
- 데이터베이스 연결 테스트
- Node.js 환경 확인
- npm 의존성 설치
- 데이터베이스 및 테이블 생성
- 데이터베이스 권한 설정
- 인덱스 생성
- 테스트 데이터 생성 (선택사항)

### 2. 수동 설정

```bash
# 1. 의존성 설치
npm install

# 2. PostgreSQL에 데이터베이스 생성
sudo -u postgres psql -c "CREATE DATABASE metaverse;"

# 3. 서버 실행 (테이블 자동 생성)
npm run server
```

## 🛠 데이터베이스 관리

### 기본 명령어

```bash
# 실행 권한 부여 (최초 1회)
chmod +x db-utils.sh

# 데이터베이스 상태 확인
./db-utils.sh status

# 사용자 목록 조회
./db-utils.sh users list

# 데이터베이스 백업
./db-utils.sh backup

# 도움말 보기
./db-utils.sh help
```

### 백업 및 복원

```bash
# 백업 생성
./db-utils.sh backup
# 출력: backup_metaverse_20231201_120000.sql

# 백업에서 복원
./db-utils.sh restore backup_metaverse_20231201_120000.sql
```

### 사용자 관리

```bash
# 사용자 목록 조회
./db-utils.sh users list

# 새 사용자 생성
./db-utils.sh users create

# 사용자 삭제
./db-utils.sh users delete user@example.com
```

### 데이터베이스 초기화

```bash
# ⚠️ 주의: 모든 데이터가 삭제됩니다!
./db-utils.sh reset
```

## 📊 데이터베이스 구조

### 주요 테이블

| 테이블명 | 설명 | 주요 컬럼 |
|---------|------|----------|
| `users` | 사용자 정보 | id, username, email, password, emailVerified, isActive |
| `maps` | 가상 공간 정보 | id, name, description, creatorId, isPublic, maxParticipants |
| `characters` | 캐릭터 정보 | id, name, appearance, userId, isDefault |

### 관계

- `users` ← `maps` (creatorId)
- `users` ← `characters` (userId)

### 인덱스

자동으로 생성되는 인덱스들:
- `idx_users_email` - 이메일 검색 최적화
- `idx_users_username` - 사용자명 검색 최적화
- `idx_maps_creator_id` - 맵 생성자 검색 최적화
- `idx_maps_is_public` - 공개 맵 필터링 최적화
- `idx_characters_user_id` - 사용자별 캐릭터 검색 최적화

## 🎯 생성되는 샘플 데이터

### 샘플 맵
1. **환영 공간** - 기본 환영 공간
2. **회의실** - 팀 회의/협업 공간 (프로젝트 A, B 구역 포함)
3. **카페** - 편안한 대화 공간 (창가, 중앙, 구석 자리)

### 샘플 캐릭터
1. **기본 캐릭터** - 기본 제공 캐릭터
2. **비즈니스맨** - 정장 스타일
3. **캐주얼** - 편안한 캐주얼 스타일

## 🔍 문제 해결

### 1. PostgreSQL 연결 실패

```bash
# PostgreSQL 서비스 상태 확인
sudo systemctl status postgresql

# 서비스 시작
sudo systemctl start postgresql

# 연결 테스트
psql -h localhost -U postgres -d postgres
```

### 2. 권한 문제

```bash
# PostgreSQL 사용자 권한 설정
sudo -u postgres psql
CREATE USER your_user WITH PASSWORD 'your_password';
ALTER USER your_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE metaverse TO your_user;
```

### 3. 포트 충돌

```bash
# PostgreSQL 포트 확인
sudo netstat -tlnp | grep 5432

# 다른 포트 사용 시 .env 파일 수정
DB_PORT=5433
```

### 4. Node.js 모듈 오류

```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

### 5. 테이블이 존재하지 않는 오류

```bash
# 데이터베이스 재설정
./quick-setup.sh

# 또는 수동으로 테이블 생성
node -e "
const sequelize = require('./server/config/database');
sequelize.sync({ force: true }).then(() => {
  console.log('테이블 생성 완료');
  process.exit(0);
});
"
```

## 📝 로그 확인

### 서버 로그
```bash
# 서버 실행 로그
npm run server

# 백그라운드 실행 시 로그 파일 확인
tail -f server.log
```

### PostgreSQL 로그
```bash
# Ubuntu/Debian
sudo tail -f /var/log/postgresql/postgresql-*.log

# CentOS/RHEL
sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

## 🚀 운영 환경 배포

### 1. 환경 변수 설정
```bash
# 운영 환경용 .env 파일 생성
cp .env.example .env.production

# 보안 설정 강화
NODE_ENV=production
DB_PASSWORD=strong_random_password
JWT_SECRET=very_long_random_string
```

### 2. 데이터베이스 최적화
```sql
-- 추가 인덱스 생성
CREATE INDEX idx_users_created_at ON users("createdAt");
CREATE INDEX idx_maps_current_users ON maps("currentUsers");

-- 통계 업데이트
ANALYZE;
```

### 3. 백업 자동화
```bash
# crontab에 추가 (매일 새벽 2시 백업)
0 2 * * * /path/to/mini_area/db-utils.sh backup
```

## 📞 지원

문제가 발생하거나 도움이 필요한 경우:

1. 먼저 이 문서의 [문제 해결](#문제-해결) 섹션을 확인하세요
2. 서버 로그와 PostgreSQL 로그를 확인하세요
3. GitHub Issues에 문제를 보고하세요

---

**참고**: 이 스크립트들은 개발 환경을 위해 설계되었습니다. 운영 환경에서는 추가적인 보안 설정이 필요할 수 있습니다.
