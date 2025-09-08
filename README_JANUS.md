# Janus VideoRoom 영역별 화상회의 시스템

## 개요
Janus Gateway의 VideoRoom 플러그인과 janode를 사용하여 구현한 영역별 화상회의 시스템입니다.
사용자가 공개 영역과 각 프라이빗 영역을 이동할 때 자동으로 해당 영역의 화상회의 룸으로 전환됩니다.

## 주요 기능

### 1. 영역별 화상회의
- **공개 영역**: 모든 사용자가 참여 가능한 기본 화상회의 룸
- **프라이빗 영역**: 각 영역별로 독립된 화상회의 룸
- **자동 전환**: 사용자가 영역을 이동하면 자동으로 해당 영역의 화상회의 룸으로 전환

### 2. 실시간 WebRTC 통신
- 고품질 영상/음성 통신
- 낮은 지연시간
- P2P 및 SFU 방식 지원

## 설치 및 실행

### 1. Janus Gateway 설치 (Docker 방식)

```bash
# Janus Gateway 시작
./start-janus.sh

# Janus Gateway 종료
./stop-janus.sh
```

### 2. 서버 실행

```bash
# 의존성 설치
npm install

# 서버 시작
npm run server
```

### 3. 클라이언트 실행

```bash
# 클라이언트 디렉토리로 이동
cd client

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

## 시스템 구조

```
┌─────────────────────────────────────────────────┐
│                   Client (React)                 │
│  ┌──────────────┐  ┌─────────────────────────┐ │
│  │JanusVideoRoom│  │   useJanusWebRTC Hook    │ │
│  │  Component   │  │  (WebRTC 연결 관리)      │ │
│  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────┘
                         │
                    WebSocket/HTTP
                         │
┌─────────────────────────────────────────────────┐
│                 Server (Node.js)                 │
│  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ janusService │  │  janusAreaHandler       │ │
│  │   (janode)   │  │  (영역 관리)            │ │
│  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────┘
                         │
                    WebSocket
                         │
┌─────────────────────────────────────────────────┐
│              Janus Gateway                       │
│         (VideoRoom Plugin)                       │
└─────────────────────────────────────────────────┘
```

## API 엔드포인트

### REST API

- `POST /api/janus/join-room` - 룸 참가
- `POST /api/janus/leave-room` - 룸 나가기
- `POST /api/janus/switch-room` - 룸 전환
- `POST /api/janus/configure-publisher` - Publisher 설정
- `POST /api/janus/ice-candidate` - ICE Candidate 전송
- `GET /api/janus/room-participants` - 참가자 목록 조회
- `POST /api/janus/create-area-room` - 영역 룸 생성
- `DELETE /api/janus/area-room` - 영역 룸 삭제
- `GET /api/janus/status` - Janus 서버 상태 확인

### WebSocket 이벤트

#### 클라이언트 → 서버
- `janus:join-public` - 공개 영역 참가
- `janus:join-area` - 프라이빗 영역 참가
- `janus:switch-area` - 영역 전환
- `janus:leave-area` - 영역 나가기
- `janus:update-position` - 위치 업데이트

#### 서버 → 클라이언트
- `janus:joined-public` - 공개 영역 참가 완료
- `janus:joined-area` - 프라이빗 영역 참가 완료
- `janus:switched-area` - 영역 전환 완료
- `janus:left-area` - 영역 나가기 완료
- `janus:user-joined` - 다른 사용자 참가 알림
- `janus:user-left` - 다른 사용자 나감 알림

## 사용 방법

### 클라이언트 통합 예제

```javascript
import { useJanusWebRTC } from '../hooks/useJanusWebRTC';
import JanusVideoRoom from '../components/JanusVideoRoom';

function MetaverseApp() {
  const [showVideoRoom, setShowVideoRoom] = useState(false);
  const [currentArea, setCurrentArea] = useState('public');

  // 영역 이동 시 화상회의 룸 전환
  const handleAreaChange = (newArea) => {
    setCurrentArea(newArea);
    // JanusVideoRoom 컴포넌트가 자동으로 룸 전환 처리
  };

  return (
    <div>
      {showVideoRoom && (
        <JanusVideoRoom
          roomType={currentArea === 'public' ? 'public' : 'area'}
          roomInfo={{
            metaverseId: 1,
            areaId: currentArea.id,
            areaName: currentArea.name
          }}
          onLeave={() => setShowVideoRoom(false)}
        />
      )}
    </div>
  );
}
```

## 환경 변수 설정

`.env` 파일에 다음 설정 추가:

```env
# Janus Gateway Configuration
JANUS_URL=ws://localhost:8188
JANUS_SECRET=
JANUS_API_SECRET=
```

## 문제 해결

### Janus Gateway 연결 실패
1. Janus가 실행 중인지 확인: `docker ps | grep janus`
2. 포트가 열려있는지 확인: `netstat -an | grep 8188`
3. 방화벽 설정 확인

### WebRTC 연결 실패
1. HTTPS 환경인지 확인 (WebRTC는 HTTPS 필요)
2. STUN/TURN 서버 설정 확인
3. 브라우저 미디어 권한 확인

### 영역 전환 시 화면이 안 나옴
1. 네트워크 연결 상태 확인
2. 브라우저 콘솔에서 에러 확인
3. 서버 로그 확인: `docker logs janus-gateway`

## 성능 최적화

### 권장 설정
- **Publishers**: 영역당 최대 50명
- **Bitrate**: 256kbps (영역), 128kbps (공개)
- **Video Codec**: VP8 (호환성), VP9 (품질)
- **Audio Codec**: Opus

### 네트워크 최적화
- TURN 서버 사용 (NAT 환경)
- 적응형 비트레이트 설정
- FEC (Forward Error Correction) 활성화

## 보안 고려사항

1. **인증**: JWT 토큰 기반 인증
2. **암호화**: DTLS-SRTP 사용
3. **권한**: 영역별 접근 권한 관리
4. **Rate Limiting**: API 요청 제한

## 라이선스
MIT License