# Janus Manager 사용 가이드

## 🚀 빠른 시작

```bash
# 1. 전체 시스템 설치
./janus-manager.sh install

# 2. 모든 서비스 시작
./janus-manager.sh start

# 3. 상태 확인
./janus-manager.sh status
```

## 📋 명령어 목록

### 🔧 설치 및 설정

| 명령어 | 설명 |
|--------|------|
| `install` | 모든 의존성 설치 및 초기 설정 |
| `config` | 설정 파일 편집 |
| `update` | 최신 버전으로 업데이트 |
| `uninstall` | 시스템 제거 |

### ▶️ 서비스 관리

| 명령어 | 설명 |
|--------|------|
| `start` | 모든 서비스 시작 (Janus, Server, Client) |
| `stop` | 모든 서비스 중지 |
| `restart` | 모든 서비스 재시작 |
| `status` | 모든 서비스 상태 확인 |

### 🎯 개별 서비스 제어

| 명령어 | 설명 |
|--------|------|
| `start-janus` | Janus Gateway만 시작 |
| `stop-janus` | Janus Gateway만 중지 |
| `start-server` | Node.js 서버만 시작 |
| `stop-server` | Node.js 서버만 중지 |
| `start-client` | React 클라이언트만 시작 |
| `stop-client` | React 클라이언트만 중지 |

### 📊 모니터링 및 로그

| 명령어 | 설명 |
|--------|------|
| `logs` | 모든 로그 확인 |
| `logs-janus` | Janus 로그만 확인 |
| `logs-server` | 서버 로그만 확인 |
| `logs-client` | 클라이언트 로그만 확인 |
| `monitor` | 실시간 모니터링 |
| `test` | 연결 테스트 |

### 🛠️ 유지보수

| 명령어 | 설명 |
|--------|------|
| `clean` | 캐시 및 임시 파일 정리 |
| `backup` | 설정 백업 |
| `restore` | 설정 복원 |

## 📖 상세 사용법

### 1. 최초 설치

```bash
# 시스템 요구사항 확인 및 설치
./janus-manager.sh install

# 설치 내용:
# - Docker & Docker Compose
# - Node.js (v18)
# - npm 패키지
# - Janus 설정 파일
```

### 2. 서비스 시작

```bash
# 모든 서비스 한번에 시작
./janus-manager.sh start

# 또는 개별적으로 시작
./janus-manager.sh start-janus    # Janus만
./janus-manager.sh start-server   # 서버만
./janus-manager.sh start-client   # 클라이언트만
```

### 3. 상태 모니터링

```bash
# 현재 상태 확인
./janus-manager.sh status

# 실시간 모니터링 (5초마다 새로고침)
./janus-manager.sh monitor

# 로그 확인
./janus-manager.sh logs           # 모든 로그
./janus-manager.sh logs-janus     # Janus 로그
./janus-manager.sh logs-server    # 서버 로그
```

### 4. 문제 해결

```bash
# 연결 테스트
./janus-manager.sh test

# 서비스 재시작
./janus-manager.sh restart

# 시스템 정리
./janus-manager.sh clean
```

### 5. 설정 관리

```bash
# 설정 파일 편집
./janus-manager.sh config

# 설정 백업
./janus-manager.sh backup

# 백업에서 복원
./janus-manager.sh restore
```

## 🌐 접속 정보

서비스 시작 후 다음 URL로 접속:

- **클라이언트**: https://localhost:5173
- **서버 API**: https://localhost:7000
- **Janus WebSocket**: ws://[IP]:8188
- **Janus HTTP API**: http://[IP]:8088/janus

## 🔍 문제 해결

### Janus가 시작되지 않는 경우

```bash
# Docker 상태 확인
docker ps -a

# Janus 로그 확인
./janus-manager.sh logs-janus

# Docker 재시작
sudo systemctl restart docker
```

### 서버가 시작되지 않는 경우

```bash
# 포트 사용 확인
lsof -i:7000

# 서버 로그 확인
./janus-manager.sh logs-server

# 의존성 재설치
npm install
```

### 클라이언트가 시작되지 않는 경우

```bash
# 포트 사용 확인
lsof -i:5173

# 클라이언트 로그 확인
./janus-manager.sh logs-client

# 클라이언트 의존성 재설치
cd client && npm install
```

## 📁 디렉토리 구조

```
mini_area/
├── janus-manager.sh        # 관리 스크립트
├── docker-compose-janus.yml # Docker 설정
├── janus-config/           # Janus 설정 파일
│   ├── janus.jcfg
│   ├── janus.plugin.videoroom.jcfg
│   └── janus.transport.websockets.jcfg
├── logs/                   # 로그 파일
│   ├── janus-manager.log
│   ├── server.log
│   └── client.log
├── backups/                # 백업 파일
└── .*.pid                  # PID 파일
```

## 🔒 보안 참고사항

1. **HTTPS 사용**: WebRTC는 HTTPS 환경에서만 작동
2. **방화벽 설정**: 필요한 포트만 열기
3. **인증 설정**: production 환경에서는 반드시 인증 설정
4. **정기 백업**: 중요 설정은 정기적으로 백업

## 💡 팁

- `Ctrl+C`로 로그 보기나 모니터링 종료
- 서비스 문제 시 `restart` 명령어 사용
- 정기적으로 `clean` 명령어로 시스템 정리
- 중요 변경 전 `backup` 명령어로 백업

## 📞 지원

문제가 발생하면:

1. `./janus-manager.sh test`로 연결 테스트
2. `./janus-manager.sh logs`로 로그 확인
3. `./janus-manager.sh status`로 상태 확인
4. 필요시 `./janus-manager.sh restart`로 재시작