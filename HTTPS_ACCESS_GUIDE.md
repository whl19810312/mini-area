# 🔒 Mini Area HTTPS 접속 가이드

## 📋 현재 설정

- **클라이언트**: HTTPS (포트 5174) - 자체 서명 인증서 사용
- **서버**: HTTPS (포트 7000) - 자체 서명 인증서 사용
- **WebSocket**: WSS (클라이언트) → WSS (서버)

## 🚀 빠른 시작

### 1. SSL 인증서 생성
```bash
./generate-ssl.sh
```

### 2. 통합 HTTPS 시작 (권장)
```bash
./start-https.sh
```

### 3. 브라우저 접속
- **클라이언트**: https://localhost:5174
- **서버**: https://localhost:7000

## 🌐 접속 방법

### 로컬 접속
```bash
# 클라이언트 (HTTPS)
https://localhost:5174

# 서버 (HTTPS)
https://localhost:7000
```

### LAN 접속 (다른 PC에서)
```bash
# LAN IP 확인
hostname -I

# 클라이언트 (HTTPS)
https://192.168.200.103:5174

# 서버 (HTTPS)
https://192.168.200.103:7000
```

## 🔧 개별 시작

### 서버만 HTTPS 시작
```bash
./restart.sh
```

### 클라이언트만 HTTPS 시작
```bash
./start-client.sh
```

### 개발 모드
```bash
cd client
npm run dev:https
```

### 프로덕션 빌드
```bash
./build-client.sh
cd client
npm run preview:https
```

## ⚠️ 브라우저 보안 경고 해결

### Chrome/Edge
1. "고급" 버튼 클릭
2. "안전하지 않은 사이트로 이동" 클릭
3. 또는 주소창에 `thisisunsafe` 입력

### Firefox
1. "고급" 버튼 클릭
2. "위험을 수락하고 계속" 클릭
3. 또는 "예외 추가" → "보안 예외 확인"

### Safari
1. "고급" 버튼 클릭
2. "이 웹사이트 방문" 클릭

## 🔗 포트 정보

| 서비스 | HTTP 포트 | HTTPS 포트 |
|--------|-----------|------------|
| 서버 | 7000 | 7000 |
| 클라이언트 개발 | 5173 | 5174 |
| 클라이언트 프리뷰 | 4173 | 4174 |

## 🔧 문제 해결

### 1. "사이트에 연결할 수 없습니다" 오류
- SSL 인증서 확인: `ls -la ssl/`
- 브라우저 캐시 삭제
- 시크릿/프라이빗 모드로 접속

### 2. 카메라/마이크 접근 안됨
- HTTPS로 접속했는지 확인
- 브라우저 권한 허용
- WebRTC 지원 확인

### 3. WebSocket 연결 안됨
- 브라우저 콘솔(F12)에서 오류 확인
- 방화벽 설정 확인
- 네트워크 연결 상태 확인

## 📱 모바일 접속

### Android Chrome
- `https://192.168.200.103:5174` 접속
- 보안 경고 시 "고급" → "안전하지 않은 사이트로 이동"

### iOS Safari
- `https://192.168.200.103:5174` 접속
- 보안 경고 시 "고급" → "이 웹사이트 방문"

## 🛠️ 개발자 도구

### 서버 상태 확인
```bash
# 서버 상태 확인
curl -k https://localhost:7000/health

# 클라이언트 상태 확인
curl -k https://localhost:5174
```

### 포트 사용 확인
```bash
# 포트 사용 확인
netstat -tulpn | grep :5174
netstat -tulpn | grep :7000
```

## 🔄 설정 변경 시

서버나 클라이언트 설정을 변경한 후:
1. `Ctrl+C`로 서버/클라이언트 중지
2. `./start-https.sh`로 재시작
3. 브라우저 새로고침

## 📞 지원

문제가 지속되면:
1. 브라우저 콘솔(F12) 오류 메시지 확인
2. 터미널 로그 확인
3. SSL 인증서 재생성: `./generate-ssl.sh`
4. 네트워크 연결 상태 확인
