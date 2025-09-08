# mini area 프로젝트

## 개요
3D mini area 환경에서 사용자들이 상호작용할 수 있는 웹 애플리케이션입니다.

## 주요 기능
- 3D mini area 환경
- 사용자 인증 및 이메일 인증
- 실시간 채팅
- 비디오 통화
- 캐릭터 커스터마이징
- 지도 편집

## 이메일 인증 시스템

### 이메일 인증 기능
- 회원가입 후 이메일 인증을 통해 계정 활성화
- 24시간 유효한 인증 토큰
- 이메일 인증 재전송 기능
- 인증 완료 전까지 로그인 제한

### Postfix 설정 (로컬 이메일 서버)
- Ubuntu 서버에서 Postfix를 사용한 로컬 이메일 전송
- `.env` 파일에서 `USE_POSTFIX=true` 설정
- 실제 이메일로 인증 메일 전송

### 자체 이메일 시스템 (개발 환경)
- 개발 환경에서는 자체 이메일 시스템이 사용됩니다
- 이메일은 `server/emails/` 디렉토리에 JSON 파일로 저장됩니다
- 콘솔에서 이메일 내용을 확인할 수 있습니다

### Gmail 설정 (프로덕션 환경)
- 프로덕션 환경에서는 Gmail SMTP를 사용합니다
- `.env` 파일에서 `EMAIL_USER`와 `EMAIL_PASS` 설정이 필요합니다

## 설치 방법

### 1. 저장소 클론
```bash
git clone <repository-url>
cd meta
```

### 2. 설치 스크립트 실행
```bash
chmod +x install.sh
./install.sh
```

### 3. 환경 변수 설정
```bash
cp env.example .env
# .env 파일을 편집하여 필요한 설정을 수정하세요
```

### 4. 데이터베이스 마이그레이션 (이메일 인증 필드 추가)
```bash
node run-migration.js
```

### 5. 서버 시작
```bash
npm run dev
```

### 6. 클라이언트 시작
```bash
cd client
npm run dev
```

## 이메일 시스템 테스트

### Postfix 테스트
```bash
# test-postfix.js 파일에서 이메일 주소 수정 후 실행
node test-postfix.js
```

### 개발 환경 이메일 확인
```bash
# 저장된 이메일 확인
ls -la server/emails/

# API를 통한 이메일 목록 조회
curl http://localhost:7000/api/user/emails
```

## 프로덕션 환경 설정

### Gmail 앱 비밀번호 설정
1. Google 계정 설정에서 2단계 인증 활성화
2. 앱 비밀번호 생성: https://myaccount.google.com/apppasswords
3. `.env` 파일에 설정 추가:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

## 기술 스택
- **Backend**: Node.js, Express, Sequelize, SQLite
- **Frontend**: React, Three.js, Vite
- **Authentication**: JWT, Passport.js
- **Email**: Nodemailer (자체 시스템 + Gmail)
- **Real-time**: Socket.io

## 라이센스
MIT License 