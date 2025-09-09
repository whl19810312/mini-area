# WebRTC 설정 가이드

## 환경 설정 (.env)

`.env` 파일에서 WebRTC 모드와 제한 사항을 설정할 수 있습니다:

```env
# WebRTC Mode Configuration
# Options: 'p2p' (peer-to-peer) or 'mediasoup' (SFU server)
WEBRTC_MODE=p2p

# P2P Mode Configuration
P2P_MAX_ROOMS=1000                    # P2P 최대 방 개수
P2P_MAX_PARTICIPANTS_PER_ROOM=10      # P2P 방당 최대 참가자 수

# MediaSoup Mode Configuration
MEDIASOUP_MAX_ROOMS=400                # MediaSoup 최대 방 개수
MEDIASOUP_MAX_PARTICIPANTS_PER_ROOM=100 # MediaSoup 방당 최대 참가자 수
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=192.168.200.103  # 실제 서버 IP로 변경
MEDIASOUP_PORT=3000
```

## 모드별 특징

### P2P 모드
- **기본 제한**: 최대 1,000개 방, 방당 최대 10명
- **장점**: 낮은 서버 부하, 직접 연결로 낮은 지연시간
- **단점**: 참가자가 많을수록 클라이언트 부하 증가
- **적합한 경우**: 소규모 그룹 통화 (2-10명)

### MediaSoup 모드
- **기본 제한**: 최대 400개 방, 방당 최대 100명
- **장점**: 대규모 그룹 지원, 안정적인 품질, 서버가 미디어 중계
- **단점**: 서버 리소스 사용량 높음
- **적합한 경우**: 대규모 그룹 통화, 방송형 스트리밍

## 제한 값 커스터마이징

`.env` 파일에서 각 모드의 제한 값을 자유롭게 변경할 수 있습니다:

### 소규모 서비스 예시
```env
P2P_MAX_ROOMS=100
P2P_MAX_PARTICIPANTS_PER_ROOM=4
MEDIASOUP_MAX_ROOMS=50
MEDIASOUP_MAX_PARTICIPANTS_PER_ROOM=20
```

### 대규모 서비스 예시
```env
P2P_MAX_ROOMS=5000
P2P_MAX_PARTICIPANTS_PER_ROOM=6
MEDIASOUP_MAX_ROOMS=1000
MEDIASOUP_MAX_PARTICIPANTS_PER_ROOM=200
```

## 서버 시작

```bash
# 패키지 설치
npm install

# 서버 시작
npm run server
```

서버 시작 시 선택된 모드와 제한 설정이 콘솔에 표시됩니다.