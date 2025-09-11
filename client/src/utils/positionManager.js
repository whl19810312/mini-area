class PositionManager {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.token = localStorage.getItem('token');
    this.clientId = this.generateClientId();
    
    // 이동 상태 관리
    this.isMoving = false;
    this.lastPosition = null;
    this.movementStartTime = null;
    
    // 위치 업데이트 큐 (실시간 전송용)
    this.positionQueue = [];
    this.isProcessingQueue = false;
    
    // 영역 정보 캐시
    this.currentAreaInfo = null;
    
    this.startPositionBroadcast();
    this.startHeartbeat();
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // UDP 에뮬레이션: 실시간 위치 업데이트 (HTTP POST, 응답 불필요)
  async sendPositionUpdate(position, mapId, direction) {
    try {
      // 현재 위치의 영역 계산
      const currentArea = this.calculateArea(position, mapId);
      
      // 빠른 HTTP POST 요청 (응답 기다리지 않음)
      fetch(`${this.apiBaseUrl}/api/position/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          type: 'position_update',
          clientId: this.clientId,
          payload: {
            position: position,
            mapId: mapId,
            direction: direction,
            currentArea: currentArea, // 영역 정보 추가
            timestamp: Date.now()
          }
        }),
        // UDP 특성 에뮬레이션: 빠른 전송, 응답 무시
        keepalive: false
      }).catch(() => {}); // 오류 무시 (UDP 특성)
      
    } catch (error) {
      // UDP 특성: 오류 무시
    }
  }

  // TCP 에뮬레이션: 영역 정보 요청 (HTTP POST, 응답 필요)
  async sendAreaRequest(position, mapId, finalDirection) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/position/area`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          type: 'movement_end',
          clientId: this.clientId,
          payload: {
            position: position,
            mapId: mapId,
            finalDirection: finalDirection,
            movementDuration: Date.now() - this.movementStartTime,
            timestamp: Date.now()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.handleAreaResponse(data);
        return data;
      } else {
        console.error('영역 정보 요청 실패:', response.status);
        return null;
      }
    } catch (error) {
      console.error('영역 정보 요청 오류:', error);
      return null;
    }
  }

  handleAreaResponse(data) {
    const { finalPosition, areaInfo, timestamp } = data.payload || {};
    
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
      
      // 이동 시작을 실시간으로 전송
      this.sendPositionUpdate(position, mapId, direction);
      
      console.log('🏃 이동 시작:', { position, mapId, direction });
    }
  }

  // 실시간 위치 업데이트 (이동 중)
  updatePosition(position, mapId, direction) {
    if (this.isMoving) {
      // 이동 중일 때만 큐에 추가
      this.positionQueue.push({
        position: position,
        mapId: mapId,
        direction: direction,
        timestamp: Date.now()
      });
    }
  }

  // 이동 완료
  async endMovement(finalPosition, mapId, finalDirection) {
    if (this.isMoving) {
      console.log('🛑 이동 완료:', { finalPosition, mapId, finalDirection });
      
      // 마지막 UDP 업데이트 - 정지 상태임을 알림
      this.sendPositionUpdate(finalPosition, mapId, finalDirection);
      
      // TCP로 최종 위치 및 영역 정보 요청
      const areaInfo = await this.sendAreaRequest(finalPosition, mapId, finalDirection);
      
      this.isMoving = false;
      return areaInfo;
    }
    return null;
  }

  // 위치 정보 브로드캐스트 시작 (실시간)
  startPositionBroadcast() {
    setInterval(() => {
      if (this.positionQueue.length > 0 && !this.isProcessingQueue && this.isMoving) {
        this.isProcessingQueue = true;
        
        // 큐에서 최신 위치 정보만 전송 (대역폭 절약)
        const latestPosition = this.positionQueue[this.positionQueue.length - 1];
        this.positionQueue = []; // 큐 초기화
        
        this.sendPositionUpdate(
          latestPosition.position,
          latestPosition.mapId,
          latestPosition.direction
        );
        
        setTimeout(() => {
          this.isProcessingQueue = false;
        }, 50); // 50ms 후 다음 전송 허용
      }
    }, 100); // 100ms마다 체크 (10fps)
  }

  // Heartbeat 전송
  async sendHeartbeat() {
    try {
      fetch(`${this.apiBaseUrl}/api/position/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          clientId: this.clientId,
          timestamp: Date.now()
        }),
        keepalive: true
      }).catch(() => {}); // 오류 무시
    } catch (error) {
      // Heartbeat 오류 무시
    }
  }

  // Heartbeat 시작
  startHeartbeat() {
    // 30초마다 heartbeat
    setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
    
    // 초기 heartbeat
    this.sendHeartbeat();
  }

  // 영역 정보만 요청 (이동과 무관하게)
  async requestAreaInfo(position, mapId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/position/area-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          position: position,
          mapId: mapId
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.areaInfo;
      }
    } catch (error) {
      console.error('영역 정보 요청 오류:', error);
    }
    return null;
  }

  // 현재 영역 정보 반환
  getCurrentAreaInfo() {
    return this.currentAreaInfo;
  }

  // 이동 상태 확인
  getMovementStatus() {
    return {
      isMoving: this.isMoving,
      lastPosition: this.lastPosition,
      currentArea: this.currentAreaInfo,
      movementDuration: this.isMoving ? Date.now() - this.movementStartTime : 0
    };
  }

  // 이벤트 핸들러 설정
  setMovementCompleteHandler(handler) {
    this.onMovementComplete = handler;
  }

  // 영역 계산 로직
  calculateArea(position, mapId) {
    const { x, y } = position;
    
    // 맵별 영역 경계 설정
    const mapAreas = this.getMapAreaBoundaries(mapId);
    
    // 각 영역과의 거리를 계산하여 가장 가까운 영역 결정
    for (const area of mapAreas) {
      if (this.isPositionInArea(position, area)) {
        return {
          area: area.type,
          name: area.name,
          id: area.id,
          type: area.type,
          boundaries: area.boundaries,
          description: area.description
        };
      }
    }
    
    // 어떤 영역에도 속하지 않으면 퍼블릭 영역으로 간주
    return {
      area: 'public',
      name: '퍼블릭 영역',
      type: 'public',
      boundaries: null,
      description: '일반 공개 영역입니다.'
    };
  }

  // 맵별 영역 경계 정의
  getMapAreaBoundaries(mapId) {
    // 실제 구현에서는 서버나 설정 파일에서 가져와야 함
    const defaultAreas = [
      {
        id: 'private_1',
        type: 'private',
        name: '프라이빗 룸 1',
        boundaries: { x1: 100, y1: 100, x2: 200, y2: 200 },
        description: '소규모 프라이빗 미팅룸'
      },
      {
        id: 'private_2',
        type: 'private',
        name: '프라이빗 룸 2', 
        boundaries: { x1: 300, y1: 100, x2: 400, y2: 200 },
        description: '중간 규모 프라이빗 미팅룸'
      },
      {
        id: 'near_wall_1',
        type: 'near_wall',
        name: '벽 근처 영역 1',
        boundaries: { x1: 0, y1: 0, x2: 50, y2: 600 },
        description: '왼쪽 벽 근처'
      },
      {
        id: 'near_wall_2', 
        type: 'near_wall',
        name: '벽 근처 영역 2',
        boundaries: { x1: 750, y1: 0, x2: 800, y2: 600 },
        description: '오른쪽 벽 근처'
      }
    ];
    
    return defaultAreas;
  }

  // 위치가 특정 영역 안에 있는지 확인
  isPositionInArea(position, area) {
    if (!area.boundaries) return false;
    
    const { x, y } = position;
    const { x1, y1, x2, y2 } = area.boundaries;
    
    return x >= Math.min(x1, x2) && 
           x <= Math.max(x1, x2) && 
           y >= Math.min(y1, y2) && 
           y <= Math.max(y1, y2);
  }

  // 통계 정보
  getStats() {
    return {
      clientId: this.clientId,
      queueSize: this.positionQueue.length,
      isProcessing: this.isProcessingQueue,
      movementStatus: this.getMovementStatus(),
      currentCalculatedArea: this.lastPosition ? this.calculateArea(this.lastPosition, 1) : null
    };
  }
}

export default PositionManager;