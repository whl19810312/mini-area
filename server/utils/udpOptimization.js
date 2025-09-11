// UDP 최적화를 위한 유틸리티
// Socket.IO에서 실시간성이 중요한 이벤트들을 UDP-like 방식으로 처리

// UDP가 유리한 통신 타입들
export const UDP_ADVANTAGEOUS_EVENTS = {
  // 실시간 위치 업데이트 (패킷 손실 허용)
  POSITION_UPDATE: 'update-position',
  USER_POSITION: 'user-position',
  
  // 실시간 마우스 커서 위치
  CURSOR_POSITION: 'cursor-position',
  
  // 실시간 화상회의 상태 (음성/비디오 토글)
  MEDIA_STATE: 'media-state-update',
  
  // 실시간 채팅 타이핑 표시
  TYPING_INDICATOR: 'typing',
  
  // 실시간 게임 상태 (점수, 체력 등)
  GAME_STATE: 'game-state',
  
  // 실시간 애니메이션 동기화
  ANIMATION_SYNC: 'animation-sync'
};

// TCP가 필요한 통신 타입들 (신뢰성 중요)
export const TCP_REQUIRED_EVENTS = {
  // 채팅 메시지 (손실되면 안됨)
  CHAT_MESSAGE: 'chat-message',
  
  // 사용자 입장/퇴장
  USER_JOIN: 'user-joined',
  USER_LEAVE: 'user-left',
  
  // 방 생성/삭제
  ROOM_CREATED: 'room-created',
  ROOM_DELETED: 'room-deleted',
  
  // 인증 관련
  AUTHENTICATION: 'authenticate',
  
  // 파일 전송
  FILE_TRANSFER: 'file-transfer',
  
  // 중요한 알림
  NOTIFICATION: 'notification'
};

// UDP 최적화 설정
export const UDP_CONFIG = {
  // 위치 업데이트 최적화
  POSITION: {
    // 전송 빈도 (ms) - UDP는 더 자주 보낼 수 있음
    UPDATE_INTERVAL: 16, // 60fps
    // 배치 크기 - 여러 업데이트를 한 번에 전송
    BATCH_SIZE: 5,
    // 압축 사용 여부
    USE_COMPRESSION: true,
    // 우선순위 (높을수록 먼저 전송)
    PRIORITY: 1
  },
  
  // 마우스 커서 최적화
  CURSOR: {
    UPDATE_INTERVAL: 33, // 30fps
    BATCH_SIZE: 3,
    USE_COMPRESSION: false,
    PRIORITY: 2
  },
  
  // 미디어 상태 최적화
  MEDIA: {
    UPDATE_INTERVAL: 100, // 10fps
    BATCH_SIZE: 1,
    USE_COMPRESSION: false,
    PRIORITY: 3
  }
};

// UDP 스타일 이벤트 처리기
export class UDPOptimizedEmitter {
  constructor(socket) {
    this.socket = socket;
    this.eventQueues = new Map();
    this.lastSent = new Map();
    this.compression = new Map();
    
    // 주기적으로 큐 처리
    this.processInterval = setInterval(() => {
      this.processQueues();
    }, 16); // 60fps로 처리
  }
  
  // UDP 스타일로 이벤트 전송 (최신 상태만 유지)
  emitUDP(eventType, data, config = {}) {
    const settings = { ...UDP_CONFIG.POSITION, ...config };
    
    // 큐가 없으면 생성
    if (!this.eventQueues.has(eventType)) {
      this.eventQueues.set(eventType, []);
    }
    
    const queue = this.eventQueues.get(eventType);
    
    // UDP 스타일: 최신 데이터만 유지 (이전 데이터 덮어쓰기)
    if (settings.PRIORITY === 1) {
      // 위치 데이터 등 높은 우선순위: 최신 것만 유지
      queue.length = 0;
      queue.push({ data, timestamp: Date.now(), settings });
    } else {
      // 다른 데이터: 배치 크기만큼 유지
      queue.push({ data, timestamp: Date.now(), settings });
      if (queue.length > settings.BATCH_SIZE) {
        queue.shift();
      }
    }
  }
  
  // 큐 처리 (주기적으로 호출)
  processQueues() {
    // 우선순위별로 정렬된 이벤트 타입들
    const sortedEvents = Array.from(this.eventQueues.keys())
      .map(eventType => {
        const queue = this.eventQueues.get(eventType);
        const priority = queue.length > 0 ? queue[0].settings.PRIORITY : 99;
        return { eventType, priority };
      })
      .sort((a, b) => a.priority - b.priority);
    
    // 각 이벤트 타입별로 처리
    for (const { eventType } of sortedEvents) {
      this.processEventQueue(eventType);
    }
  }
  
  // 특정 이벤트 큐 처리
  processEventQueue(eventType) {
    const queue = this.eventQueues.get(eventType);
    if (!queue || queue.length === 0) return;
    
    const now = Date.now();
    const lastSent = this.lastSent.get(eventType) || 0;
    const settings = queue[0].settings;
    
    // 전송 간격 체크
    if (now - lastSent < settings.UPDATE_INTERVAL) return;
    
    // 배치로 전송
    const batch = queue.splice(0, settings.BATCH_SIZE);
    
    if (batch.length === 1) {
      // 단일 이벤트
      this.socket.emit(eventType, batch[0].data);
    } else if (batch.length > 1) {
      // 배치 이벤트
      const batchData = batch.map(item => item.data);
      this.socket.emit(eventType + '-batch', {
        events: batchData,
        count: batchData.length,
        timestamp: now
      });
    }
    
    this.lastSent.set(eventType, now);
  }
  
  // 압축된 데이터 전송
  emitCompressed(eventType, data) {
    // 간단한 JSON 압축 (실제로는 더 고급 압축 알고리즘 사용 가능)
    const compressed = this.compressData(data);
    this.socket.emit(eventType + '-compressed', compressed);
  }
  
  // 데이터 압축 (간단한 예시)
  compressData(data) {
    // 실제로는 LZ4, Snappy 등의 고성능 압축 라이브러리 사용
    const jsonString = JSON.stringify(data);
    
    // 반복되는 키 제거
    const compressed = jsonString
      .replace(/"position"/g, '"p"')
      .replace(/"direction"/g, '"d"')
      .replace(/"username"/g, '"u"')
      .replace(/"timestamp"/g, '"t"')
      .replace(/"characterInfo"/g, '"c"');
    
    return {
      data: compressed,
      compressed: true,
      originalSize: jsonString.length,
      compressedSize: compressed.length
    };
  }
  
  // 해제
  destroy() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    this.eventQueues.clear();
    this.lastSent.clear();
  }
}

// 서버측 UDP 최적화 처리기
export class ServerUDPOptimizer {
  constructor(io) {
    this.io = io;
    this.clientQueues = new Map(); // 클라이언트별 전송 큐
    this.roomStates = new Map(); // 방별 상태 캐시
    
    // 주기적으로 상태 전송
    this.broadcastInterval = setInterval(() => {
      this.broadcastRoomStates();
    }, 50); // 20fps로 상태 브로드캐스트
  }
  
  // 방 상태 업데이트 (UDP 스타일)
  updateRoomState(roomId, stateType, data) {
    if (!this.roomStates.has(roomId)) {
      this.roomStates.set(roomId, new Map());
    }
    
    const roomState = this.roomStates.get(roomId);
    
    // 상태 타입별로 최신 데이터만 유지
    roomState.set(stateType, {
      data,
      timestamp: Date.now()
    });
  }
  
  // 방 상태 브로드캐스트
  broadcastRoomStates() {
    this.roomStates.forEach((roomState, roomId) => {
      const updates = [];
      
      roomState.forEach((state, stateType) => {
        // 오래된 상태 제거 (1초 이상)
        if (Date.now() - state.timestamp > 1000) {
          roomState.delete(stateType);
          return;
        }
        
        updates.push({
          type: stateType,
          data: state.data,
          timestamp: state.timestamp
        });
      });
      
      if (updates.length > 0) {
        // 방의 모든 클라이언트에게 배치 업데이트 전송
        this.io.to(roomId).emit('room-state-batch', {
          roomId,
          updates,
          timestamp: Date.now()
        });
      }
    });
  }
  
  // 클라이언트별 우선순위 큐 관리
  addToClientQueue(socketId, eventType, data, priority = 1) {
    if (!this.clientQueues.has(socketId)) {
      this.clientQueues.set(socketId, []);
    }
    
    const queue = this.clientQueues.get(socketId);
    
    // 우선순위 큐에 삽입
    const event = { eventType, data, priority, timestamp: Date.now() };
    
    // 우선순위에 따라 삽입 위치 결정
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].priority > priority) {
        insertIndex = i;
        break;
      }
    }
    
    queue.splice(insertIndex, 0, event);
    
    // 큐 크기 제한
    if (queue.length > 100) {
      queue.splice(50); // 뒤쪽 절반 제거
    }
  }
  
  // 지연시간 기반 적응형 전송
  adaptiveTransmission(socket, data, estimatedLatency) {
    if (estimatedLatency < 50) {
      // 낮은 지연시간: 고빈도 전송
      this.highFrequencyTransmit(socket, data);
    } else if (estimatedLatency < 150) {
      // 중간 지연시간: 배치 전송
      this.batchTransmit(socket, data);
    } else {
      // 높은 지연시간: 압축 전송
      this.compressedTransmit(socket, data);
    }
  }
  
  highFrequencyTransmit(socket, data) {
    socket.emit('position-update', data);
  }
  
  batchTransmit(socket, data) {
    // 배치에 추가하고 나중에 전송
    this.addToBatch(socket.id, data);
  }
  
  compressedTransmit(socket, data) {
    const compressed = this.compressPositionData(data);
    socket.emit('position-update-compressed', compressed);
  }
  
  // 위치 데이터 압축
  compressPositionData(data) {
    // Float32Array 사용으로 데이터 크기 최소화
    const compressed = new Float32Array([
      data.position.x,
      data.position.y,
      data.timestamp || Date.now()
    ]);
    
    return {
      compressed: Array.from(compressed),
      direction: data.direction,
      userId: data.userId
    };
  }
  
  destroy() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }
    this.clientQueues.clear();
    this.roomStates.clear();
  }
}

// 네트워크 품질 기반 적응형 전송
export class AdaptiveNetworkHandler {
  constructor() {
    this.networkQuality = 'good'; // good, medium, poor
    this.packetLossRate = 0;
    this.latency = 0;
  }
  
  // 네트워크 품질 업데이트
  updateNetworkQuality(latency, packetLoss) {
    this.latency = latency;
    this.packetLossRate = packetLoss;
    
    if (latency < 50 && packetLoss < 0.01) {
      this.networkQuality = 'good';
    } else if (latency < 150 && packetLoss < 0.05) {
      this.networkQuality = 'medium';
    } else {
      this.networkQuality = 'poor';
    }
  }
  
  // 네트워크 품질에 따른 전송 설정 반환
  getTransmissionConfig() {
    switch (this.networkQuality) {
      case 'good':
        return {
          updateRate: 16, // 60fps
          batchSize: 1,
          useCompression: false,
          redundancy: 1
        };
      case 'medium':
        return {
          updateRate: 33, // 30fps
          batchSize: 3,
          useCompression: true,
          redundancy: 2 // 중요한 데이터 2번 전송
        };
      case 'poor':
        return {
          updateRate: 100, // 10fps
          batchSize: 5,
          useCompression: true,
          redundancy: 3 // 중요한 데이터 3번 전송
        };
      default:
        return {
          updateRate: 50,
          batchSize: 2,
          useCompression: true,
          redundancy: 1
        };
    }
  }
}