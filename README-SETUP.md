# Mini Area 설정 가이드

PostgreSQL 및 환경 설정의 일관성을 위한 자동화된 설정 시스템입니다.

## 🚀 빠른 설치 (권장)

전체 설치를 원스톱으로 진행:

```bash
./scripts/install.sh
```

자동 설치 (대화형 입력 없음):

```bash
./scripts/install.sh --auto
```

## 📋 단계별 설치

### 1. 환경 설정

```bash
# 대화형 환경 설정
./scripts/env-setup.sh

# 기본값으로 자동 설정
./scripts/env-setup.sh --auto
```

### 2. PostgreSQL 설정

```bash
./scripts/postgres-setup.sh
```

## 📁 생성된 파일들

### 설정 파일
- `config/database.config.js` - 데이터베이스 설정 중앙 관리
- `.env` - 서버 환경 변수
- `client/.env` - 클라이언트 환경 변수

### 스크립트
- `scripts/install.sh` - 전체 설치 스크립트
- `scripts/env-setup.sh` - 환경 설정 스크립트
- `scripts/postgres-setup.sh` - PostgreSQL 설정 스크립트

## 🔧 환경 설정 항목

### 데이터베이스
- **호스트**: PostgreSQL 서버 주소 (기본: localhost)
- **포트**: PostgreSQL 포트 (기본: 5432)
- **사용자**: 데이터베이스 사용자명 (기본: postgres)
- **비밀번호**: 데이터베이스 비밀번호
- **데이터베이스 이름**: 메인 데이터베이스명 (기본: metaverse)

### 서버
- **포트**: 서버 포트 (기본: 7000)
- **IP**: LAN 접속용 서버 IP (자동 감지)

### 보안
- **JWT Secret**: JWT 토큰 암호화 키 (자동 생성)
- **Session Secret**: 세션 암호화 키 (자동 생성)

### 이메일 설정
1. **로컬 개발** (MailHog): localhost:1025
2. **Gmail SMTP**: Gmail 앱 비밀번호 사용
3. **Postfix**: 로컬 메일 서버

### WebRTC (Agora)
- **App ID**: Agora 앱 ID
- **Certificate**: Agora 인증서

## 🗄️ 데이터베이스 구성

자동으로 생성되는 데이터베이스:
- `metaverse` - 메인 프로덕션 데이터베이스
- `metaverse_dev` - 개발 환경용
- `metaverse_test` - 테스트 환경용

## 📊 데이터베이스 설정 파일 사용법

```javascript
// server/config/database.js
const dbConfig = require('../config/database.config');

// 현재 환경 설정 사용
const db = new Pool(dbConfig);

// 특정 환경 설정 사용
const testDb = new Pool(dbConfig.allConfigs.test);
```

## 🔍 문제 해결

### 포트 충돌 확인
```bash
netstat -tlnp | grep :7000
```

### PostgreSQL 서비스 상태
```bash
sudo systemctl status postgresql
```

### 데이터베이스 연결 테스트
```bash
PGPASSWORD=your_password psql -h localhost -U postgres -d metaverse -c "SELECT version();"
```

### 로그 확인
```bash
tail -f logs/server.log
tail -f logs/client.log
```

## 🚀 서버 시작

### 전체 시스템 시작
```bash
./start.sh
```

### 개발 모드 (Hot Reload)
```bash
npm run dev
```

### 서버만 시작
```bash
npm start
```

### 클라이언트만 시작
```bash
cd client && npm run dev
```

## 🛑 서버 중지

```bash
./stop.sh
```

## 📝 환경별 설정

### 개발 환경
```bash
NODE_ENV=development npm start
```

### 프로덕션 환경
```bash
NODE_ENV=production npm start
```

### 테스트 환경
```bash
NODE_ENV=test npm test
```

## 🔐 SSL 인증서

개발용 자체 서명된 SSL 인증서가 `ssl/` 디렉토리에 자동 생성됩니다.

프로덕션에서는 Let's Encrypt 등의 인증된 SSL 인증서를 사용하세요.

## 🎯 접속 정보

- **클라이언트**: http://localhost:5173
- **서버 API**: http://YOUR_SERVER_IP:7000
- **WebSocket**: ws://YOUR_SERVER_IP:7000

## 📞 지원

문제가 발생하면:
1. 로그 파일 확인 (`logs/` 디렉토리)
2. 각 스크립트를 개별적으로 실행하여 문제 구간 파악
3. 권한 문제 시 `sudo` 권한으로 실행

## 🔄 업데이트

새로운 환경 변수 추가 시:
1. `scripts/env-setup.sh` 수정
2. `config/database.config.js` 업데이트
3. `.env.example` 파일 업데이트