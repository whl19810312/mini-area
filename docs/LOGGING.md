# 로깅 시스템 가이드

## 개요

모든 로그는 `./logs` 디렉토리에 자동으로 저장됩니다.

## 로그 파일 구조

```
logs/
├── application-YYYY-MM-DD.log  # 일반 애플리케이션 로그
├── error-YYYY-MM-DD.log        # 에러 전용 로그
├── webrtc-YYYY-MM-DD.log       # WebRTC 관련 로그
└── http-YYYY-MM-DD.log         # HTTP 요청 로그
```

## 로그 레벨

`.env` 파일에서 로그 레벨 설정:

```env
LOG_LEVEL=info  # debug, info, warn, error
```

### 로그 레벨 설명
- `debug`: 상세한 디버깅 정보
- `info`: 일반 정보성 메시지 (기본값)
- `warn`: 경고 메시지
- `error`: 에러 메시지만

## 로그 로테이션

- **보관 기간**: 
  - 일반 로그: 14일
  - WebRTC 로그: 7일
  - HTTP 로그: 7일
- **파일 크기 제한**: 20MB
- **압축**: 오래된 로그는 자동으로 gzip 압축

## 개발 환경 vs 프로덕션

### 개발 환경 (`NODE_ENV=development`)
- 콘솔에 컬러 로그 출력
- 디버그 레벨 로그 활성화
- 파일과 콘솔 모두 출력

### 프로덕션 환경 (`NODE_ENV=production`)
- 파일에만 로그 저장
- 콘솔 출력 비활성화
- JSON 형식으로 저장

## 로그 사용 예시

### 서버 코드에서 로거 사용

```javascript
const logger = require('./utils/logger');

// 일반 로그
logger.info('Server started');
logger.error('Connection failed', error);
logger.warn('Memory usage high');
logger.debug('Debug information');

// WebRTC 전용 로그
logger.webrtc.info('Room created', { roomId: '123' });
logger.webrtc.error('Media negotiation failed');

// HTTP 로그
logger.http('GET /api/users');
```

## 로그 모니터링

### 실시간 로그 확인

```bash
# 모든 로그 실시간 확인
tail -f logs/application-*.log

# 에러만 확인
tail -f logs/error-*.log

# WebRTC 로그만 확인
tail -f logs/webrtc-*.log
```

### 로그 검색

```bash
# 특정 날짜의 로그 검색
grep "error" logs/application-2024-01-01.log

# 최근 에러 확인
grep -i "error" logs/error-*.log | tail -20
```

## 로그 정리

오래된 로그는 자동으로 삭제되지만, 수동으로 정리하려면:

```bash
# 30일 이상 된 로그 삭제
find logs/ -name "*.log.gz" -mtime +30 -delete

# 모든 로그 삭제 (주의!)
rm -rf logs/*
```

## 주의사항

1. `logs/` 디렉토리는 Git에 포함되지 않음 (.gitignore)
2. 디스크 공간 모니터링 필요 (특히 프로덕션)
3. 민감한 정보는 로그에 포함하지 않기
4. 정기적인 로그 백업 권장