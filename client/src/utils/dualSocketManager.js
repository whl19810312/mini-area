class DualSocketManager {
  constructor(serverHost, socketIOInstance) {
    this.serverHost = serverHost;
    this.socketIO = socketIOInstance;
    this.udpPort = 7001;
    this.tcpPort = 7002;
    
    // Socket.IO 네임스페이스를 UDP/TCP 에뮬레이션용으로 사용
    this.udpNamespace = null;
    this.tcpNamespace = null;
    
    this.token = localStorage.getItem('token');
    this.clientId = this.generateClientId();
    
    // 이동 상태 관리
    this.isMoving = false;
    this.lastPosition = null;
    this.movementStartTime = null;
    
    // 위치 업데이트 큐 (UDP용)
    this.positionQueue = [];
    this.isProcessingQueue = false;
    
    this.setupConnections();
    this.startPositionBroadcast();
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setupConnections() {
    // WebSocket을 이용한 UDP 에뮬레이션
    this.udpSocket = new WebSocket(`wss://${this.serverHost}:${this.udpPort}`);
    
    this.udpSocket.onopen = () => {
      console.log('🔵 UDP WebSocket 연결 성공');
      this.sendUDPMessage('heartbeat', {});
    };

    this.udpSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleUDPResponse(data);
      } catch (error) {
        console.error('UDP 메시지 파싱 오류:', error);
      }
    };

    this.udpSocket.onerror = (error) => {
      console.error('🔵 UDP WebSocket 오류:', error);
    };

    this.udpSocket.onclose = () => {
      console.log('🔵 UDP WebSocket 연결 종료');
      // 재연결 시도
      setTimeout(() => this.reconnectUDP(), 3000);
    };

    // WebSocket을 이용한 TCP 에뮬레이션
    this.tcpSocket = new WebSocket(`wss://${this.serverHost}:${this.tcpPort}`);

    this.tcpSocket.onopen = () => {
      console.log('🔴 TCP WebSocket 연결 성공');
      this.sendTCPMessage('register_client', { clientId: this.clientId });
    };

    this.tcpSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleTCPResponse(data);
      } catch (error) {
        console.error('TCP 메시지 파싱 오류:', error);
      }
    };

    this.tcpSocket.onerror = (error) => {
      console.error('🔴 TCP WebSocket 오류:', error);
    };

    this.tcpSocket.onclose = () => {
      console.log('🔴 TCP WebSocket 연결 종료');
      // 재연결 시도
      setTimeout(() => this.reconnectTCP(), 3000);
    };
  }

  reconnectUDP() {
    if (this.udpSocket.readyState === WebSocket.CLOSED) {
      this.udpSocket = new WebSocket(`wss://${this.serverHost}:${this.udpPort}`);
      this.setupUDPHandlers();
    }
  }

  reconnectTCP() {
    if (this.tcpSocket.readyState === WebSocket.CLOSED) {
      this.tcpSocket = new WebSocket(`wss://${this.serverHost}:${this.tcpPort}`);
      this.setupTCPHandlers();
    }
  }

  sendUDPMessage(type, payload) {
    if (this.udpSocket && this.udpSocket.readyState === WebSocket.OPEN) {
      const message = {
        type: type,
        token: this.token,
        clientId: this.clientId,
        payload: payload,
        timestamp: Date.now()
      };

      this.udpSocket.send(JSON.stringify(message));
    } else {
      console.warn('UDP 소켓이 연결되지 않았습니다.');
    }
  }

  sendTCPMessage(type, payload) {
    if (this.tcpSocket && this.tcpSocket.readyState === WebSocket.OPEN) {
      const message = {
        type: type,
        token: this.token,
        clientId: this.clientId,
        payload: payload,
        timestamp: Date.now()
      };

      this.tcpSocket.send(JSON.stringify(message));
    } else {
      console.warn('TCP 소켓이 연결되지 않았습니다.');
    }
  }

  handleUDPResponse(data) {
    switch (data.type) {
      case 'position_ack':
        // 위치 업데이트 확인
        break;
      case 'heartbeat_ack':
        // Heartbeat 응답
        break;
    }
  }

  handleTCPResponse(data) {
    switch (data.type) {
      case 'movement_complete':
        this.handleMovementComplete(data.payload);
        break;
      case 'registration_ack':
        console.log('🔴 TCP 클라이언트 등록 완료');
        break;
      case 'error':
        console.error('TCP 오류:', data.message);
        break;
    }
  }

  handleMovementComplete(payload) {
    const { finalPosition, areaInfo, timestamp } = payload;
    
    console.log('이동 완료:', {
      position: finalPosition,
      area: areaInfo,
      timestamp: new Date(timestamp)
    });

    // 이동 완료 이벤트 발생
    this.onMovementComplete?.(finalPosition, areaInfo);
    
    // 영역 정보를 로컬 상태에 저장
    this.currentAreaInfo = areaInfo;
    this.lastPosition = finalPosition;
    this.isMoving = false;
  }

  // 이동 시작
  startMovement(position, mapId, direction) {
    if (!this.isMoving) {
      this.isMoving = true;
      this.movementStartTime = Date.now();
      this.sendUDPMessage('movement_start', {
        position: position,
        mapId: mapId,
        direction: direction
      });
    }
  }

  // 실시간 위치 업데이트 (이동 중)
  updatePosition(position, mapId, direction) {
    if (this.isMoving) {
      this.positionQueue.push({
        position: position,
        mapId: mapId,
        direction: direction,
        timestamp: Date.now()
      });
    }
  }

  // 이동 완료
  endMovement(finalPosition, mapId, finalDirection) {
    if (this.isMoving) {
      this.isMoving = false;
      
      // TCP로 최종 위치 및 영역 정보 요청
      this.sendTCPMessage('movement_end', {
        position: finalPosition,
        mapId: mapId,
        finalDirection: finalDirection,
        movementDuration: Date.now() - this.movementStartTime
      });
    }
  }

  // 위치 정보 브로드캐스트 시작 (UDP)
  startPositionBroadcast() {
    setInterval(() => {
      if (this.positionQueue.length > 0 && !this.isProcessingQueue) {
        this.isProcessingQueue = true;
        
        // 큐에서 최신 위치 정보만 전송 (대역폭 절약)
        const latestPosition = this.positionQueue[this.positionQueue.length - 1];
        this.positionQueue = []; // 큐 초기화
        
        this.sendUDPMessage('position_update', latestPosition);
        
        setTimeout(() => {
          this.isProcessingQueue = false;
        }, 50); // 50ms 후 다음 전송 허용
      }
    }, 100); // 100ms마다 체크 (10fps)
  }

  // 영역 정보 요청 (TCP)
  requestAreaInfo(position, mapId) {
    this.sendTCPMessage('area_request', {
      position: position,
      mapId: mapId
    });
  }

  // Heartbeat 전송
  sendHeartbeat() {
    this.sendUDPMessage('heartbeat', {
      timestamp: Date.now()
    });
  }

  // Heartbeat 시작
  startHeartbeat() {
    setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // 30초마다 heartbeat
  }

  // 현재 영역 정보 반환
  getCurrentAreaInfo() {
    return this.currentAreaInfo;
  }

  // 연결 상태 확인
  getConnectionStatus() {
    return {
      udp: this.udpSocket ? this.udpSocket.readyState : WebSocket.CLOSED,
      tcp: this.tcpSocket ? this.tcpSocket.readyState : WebSocket.CLOSED
    };
  }

  // 이벤트 핸들러 설정
  setMovementCompleteHandler(handler) {
    this.onMovementComplete = handler;
  }

  // 소켓 종료
  close() {
    if (this.udpSocket) {
      this.udpSocket.close();
    }
    if (this.tcpSocket) {
      this.tcpSocket.close();
    }
  }
}

export default DualSocketManager;