# 환경 변수 설정 가이드

## 필수 설정

### 서버 기본 설정
```env
PORT=7000                    # 서버 포트
NODE_ENV=development         # development | production
LOG_LEVEL=info              # debug | info | warn | error
```

### 보안 설정 (반드시 변경 필요!)
```env
JWT_SECRET=your-jwt-secret-key-here-change-this-in-production
SESSION_SECRET=your-session-secret-key-here-change-this-in-production
```

### 데이터베이스 설정
```env
DB_HOST=localhost           # PostgreSQL 호스트
DB_PORT=5432               # PostgreSQL 포트
DB_USER=postgres            # 데이터베이스 사용자
DB_PASSWORD=password        # 데이터베이스 비밀번호
DB_NAME=metaverse          # 데이터베이스 이름
```

## WebRTC 설정

### 모드 선택
```env
WEBRTC_MODE=mediasoup       # 'p2p' 또는 'mediasoup'
```

### P2P 모드 설정
```env
P2P_MAX_ROOMS=1000                    # 최대 방 개수
P2P_MAX_PARTICIPANTS_PER_ROOM=10      # 방당 최대 인원
```

### MediaSoup 모드 설정
```env
MEDIASOUP_MAX_ROOMS=400                # 최대 방 개수
MEDIASOUP_MAX_PARTICIPANTS_PER_ROOM=100 # 방당 최대 인원
MEDIASOUP_LISTEN_IP=0.0.0.0            # 리스닝 IP
MEDIASOUP_ANNOUNCED_IP=192.168.200.106  # 공인 IP (중요!)
MEDIASOUP_PORT=3000                     # MediaSoup 포트
```

## 이메일 설정

### 개발 환경 (MailDev)
```env
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USER=test@example.com
EMAIL_PASS=password
```

### 프로덕션 환경 (Gmail)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password  # 앱 비밀번호 사용
```

## 프론트엔드 설정
```env
FRONTEND_URL=http://localhost:5173      # 프론트엔드 URL
CLIENT_URL=http://localhost:5173        # 클라이언트 URL
```

## OAuth 설정 (선택)
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 로그 레벨 설명

| 레벨 | 설명 | 사용 시기 |
|------|------|----------|
| `debug` | 상세한 디버깅 정보 | 개발/디버깅 시 |
| `info` | 일반 정보 메시지 | 기본값, 일반 운영 |
| `warn` | 경고 메시지 | 주의가 필요한 상황 |
| `error` | 에러 메시지만 | 프로덕션 최소 로깅 |

## 환경별 권장 설정

### 개발 환경
```env
NODE_ENV=development
LOG_LEVEL=debug
WEBRTC_MODE=p2p
P2P_MAX_ROOMS=100
P2P_MAX_PARTICIPANTS_PER_ROOM=4
```

### 테스트 환경
```env
NODE_ENV=development
LOG_LEVEL=info
WEBRTC_MODE=mediasoup
MEDIASOUP_MAX_ROOMS=50
MEDIASOUP_MAX_PARTICIPANTS_PER_ROOM=20
```

### 프로덕션 환경
```env
NODE_ENV=production
LOG_LEVEL=warn
WEBRTC_MODE=mediasoup
MEDIASOUP_MAX_ROOMS=400
MEDIASOUP_MAX_PARTICIPANTS_PER_ROOM=100
MEDIASOUP_ANNOUNCED_IP=your.public.ip.address  # 반드시 실제 공인 IP로 변경!
```

## 보안 주의사항

1. **JWT_SECRET과 SESSION_SECRET는 반드시 변경**
   - 최소 32자 이상의 랜덤 문자열 사용
   - 예: `openssl rand -base64 32`

2. **데이터베이스 비밀번호 보안**
   - 강력한 비밀번호 사용
   - 프로덕션 환경에서는 환경 변수로 관리

3. **MediaSoup IP 설정**
   - MEDIASOUP_ANNOUNCED_IP는 실제 서버의 공인 IP로 설정
   - NAT 환경에서는 포트 포워딩 필요

4. **.env 파일 관리**
   - 절대 Git에 커밋하지 않기
   - .env.example 파일만 커밋
   - 프로덕션 환경에서는 환경 변수 관리 시스템 사용

## 문제 해결

### WebRTC 연결 실패
- MEDIASOUP_ANNOUNCED_IP가 올바른지 확인
- 방화벽에서 MediaSoup 포트(3000) 및 RTC 포트(10000-10100) 열기

### 로그가 생성되지 않음
- logs/ 디렉토리 권한 확인
- LOG_LEVEL 설정 확인

### 이메일 전송 실패
- Gmail의 경우 "보안 수준이 낮은 앱 액세스" 허용 또는 앱 비밀번호 사용
- 포트가 방화벽에 막혀있지 않은지 확인