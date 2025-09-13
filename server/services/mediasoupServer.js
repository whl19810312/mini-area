const mediasoup = require('mediasoup');

class MediaSoupServer {
  constructor() {
    this.worker = null;
    this.router = null;
    this.transports = new Map(); // socketId -> { sendTransport, receiveTransport }
    this.producers = new Map(); // socketId -> Map<kind, producer>
    this.consumers = new Map(); // socketId -> Map<consumerId, consumer>
    this.connectedTransports = new Set(); // transportId -> 연결된 Transport ID 추적
  }

  async initialize() {
    console.log('📹 [MediaSoup] 서버 초기화 시작...');
    
    try {
      // MediaSoup Worker 생성
      this.worker = await mediasoup.createWorker({
        logLevel: 'warn',
        logTags: [
          'info',
          'ice',
          'dtls',
          'rtp',
          'srtp',
          'rtcp',
        ],
        rtcMinPort: 10000,
        rtcMaxPort: 20000
      });

      this.worker.on('died', (error) => {
        console.error('📹 [MediaSoup] Worker 종료:', error);
        process.exit(1);
      });

      console.log('📹 [MediaSoup] Worker PID:', this.worker.pid);

      // MediaSoup Router 생성
      this.router = await this.worker.createRouter({
        mediaCodecs: [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
          },
          {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters: {
              'x-google-start-bitrate': 1000,
            },
          },
          {
            kind: 'video',
            mimeType: 'video/VP9',
            clockRate: 90000,
            parameters: {
              'profile-id': 2,
              'x-google-start-bitrate': 1000,
            },
          },
          {
            kind: 'video',
            mimeType: 'video/h264',
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '4d0032',
              'level-asymmetry-allowed': 1,
              'x-google-start-bitrate': 1000,
            },
          },
        ],
      });

      console.log('📹 [MediaSoup] Router 생성 완료');
      console.log('📹 [MediaSoup] 서버 초기화 완료');
      
      return true;
    } catch (error) {
      console.error('📹 [MediaSoup] 서버 초기화 실패:', error);
      throw error;
    }
  }

  // RTP Capabilities 반환
  getRtpCapabilities() {
    if (!this.router) {
      throw new Error('Router가 초기화되지 않았습니다');
    }
    return this.router.rtpCapabilities;
  }

  // WebRTC Transport 생성
  async createWebRtcTransport(socketId) {
    console.log('📹 [MediaSoup] Transport 생성 시작:', socketId);

    try {
      const transport = await this.router.createWebRtcTransport({
        listenIps: [
          {
            ip: '0.0.0.0',
            announcedIp: null, // 로컬 네트워크에서는 null
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          console.log('📹 [MediaSoup] Transport 종료:', socketId);
          transport.close();
        }
      });

      transport.on('@close', () => {
        console.log('📹 [MediaSoup] Transport 닫힘:', socketId, transport.id);
        
        // Transport 닫힘 시 해당 Transport를 사용자 저장소에서 제거
        const userTransports = this.transports.get(socketId);
        if (userTransports) {
          let transportType = null;
          if (userTransports.sendTransport && userTransports.sendTransport.id === transport.id) {
            console.log('📹 [MediaSoup] SendTransport 저장소에서 제거:', socketId, transport.id);
            userTransports.sendTransport = null;
            transportType = 'send';
          }
          if (userTransports.receiveTransport && userTransports.receiveTransport.id === transport.id) {
            console.log('📹 [MediaSoup] ReceiveTransport 저장소에서 제거:', socketId, transport.id);
            userTransports.receiveTransport = null;
            transportType = 'receive';
          }
          
          // 클라이언트에게 Transport 닫힘 알림
          if (transportType && this.io) {
            const targetSocket = this.io.sockets.sockets.get(socketId);
            if (targetSocket) {
              targetSocket.emit('transport-closed', {
                transportId: transport.id,
                transportType: transportType
              });
              console.log('📹 [MediaSoup] 클라이언트에게 Transport 닫힘 알림 전송:', socketId, transportType);
            }
          }
        }
        // 연결된 Transport 추적에서 제거
        this.connectedTransports.delete(transport.id);
      });

      console.log('📹 [MediaSoup] Transport 생성 완료:', {
        socketId,
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });

      return {
        transport,
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        }
      };
    } catch (error) {
      console.error('📹 [MediaSoup] Transport 생성 실패:', error);
      throw error;
    }
  }

  // Transport 연결
  async connectTransport(socketId, transportId, dtlsParameters) {
    console.log('📹 [MediaSoup] Transport 연결:', { socketId, transportId });

    try {
      // 이미 연결된 Transport인지 확인
      if (this.connectedTransports.has(transportId)) {
        console.log('📹 [MediaSoup] Transport 이미 연결됨, 건너뜀:', { socketId, transportId });
        return { success: true };
      }

      const userTransports = this.transports.get(socketId);
      if (!userTransports) {
        console.error('📹 [MediaSoup] 사용자 Transport가 없음:', { socketId, transportId });
        throw new Error('Transport를 찾을 수 없습니다');
      }

      console.log('📹 [MediaSoup] 사용자 Transport 상태:', {
        socketId,
        transportId,
        hasSendTransport: !!userTransports.sendTransport,
        hasReceiveTransport: !!userTransports.receiveTransport,
        sendTransportId: userTransports.sendTransport?.id,
        receiveTransportId: userTransports.receiveTransport?.id,
        sendTransportClosed: userTransports.sendTransport?.closed,
        receiveTransportClosed: userTransports.receiveTransport?.closed
      });

      let transport = null;
      if (userTransports.sendTransport && userTransports.sendTransport.id === transportId) {
        transport = userTransports.sendTransport;
      } else if (userTransports.receiveTransport && userTransports.receiveTransport.id === transportId) {
        transport = userTransports.receiveTransport;
      }

      if (!transport) {
        console.error('📹 [MediaSoup] Transport ID가 일치하지 않음:', {
          socketId,
          requestedTransportId: transportId,
          availableTransports: {
            sendTransportId: userTransports.sendTransport?.id,
            receiveTransportId: userTransports.receiveTransport?.id
          }
        });
        throw new Error('해당 Transport를 찾을 수 없습니다');
      }

      // Transport가 이미 연결된 상태인지 확인 (connectionState 체크)
      if (transport.connectionState === 'connected') {
        console.log('📹 [MediaSoup] Transport 이미 연결된 상태:', { socketId, transportId, state: transport.connectionState });
        this.connectedTransports.add(transportId);
        return { success: true };
      }

      // Transport가 닫혀있거나 실패 상태인지 확인
      if (transport.closed || transport.connectionState === 'failed') {
        console.error('📹 [MediaSoup] Transport가 닫혀있거나 실패 상태:', { 
          socketId, 
          transportId, 
          closed: transport.closed,
          connectionState: transport.connectionState 
        });
        throw new Error('Transport가 닫혀있거나 실패 상태입니다');
      }

      try {
        await transport.connect({ dtlsParameters });
        
        // 연결 성공 시 추적 Set에 추가
        this.connectedTransports.add(transportId);
        console.log('📹 [MediaSoup] Transport 연결 완료:', { socketId, transportId, state: transport.connectionState });
        
        return { success: true };
      } catch (connectError) {
        // "connect() already called" 에러는 이미 연결된 것으로 간주
        if (connectError.message && connectError.message.includes('connect() already called')) {
          console.log('📹 [MediaSoup] Transport 이미 connect() 호출됨, 연결된 것으로 간주:', { socketId, transportId });
          this.connectedTransports.add(transportId);
          return { success: true };
        }
        throw connectError;
      }
      
    } catch (error) {
      console.error('📹 [MediaSoup] Transport 연결 실패:', error);
      throw error;
    }
  }

  // Producer 생성 중인 요청 추적
  pendingProducers = new Map();
  
  // Producer 생성
  async createProducer(socketId, transportId, rtpParameters, kind) {
    console.log('📹 [MediaSoup] Producer 생성:', { socketId, transportId, kind });
    
    // 기존 Producer가 있으면 먼저 정리
    const existingProducers = this.producers.get(socketId);
    if (existingProducers && existingProducers.has(kind)) {
      const existingProducer = existingProducers.get(kind);
      console.log('📹 [MediaSoup] 기존 Producer 정리:', { socketId, kind, producerId: existingProducer.id });
      try {
        existingProducer.close();
        existingProducers.delete(kind);
      } catch (closeError) {
        console.warn('📹 [MediaSoup] 기존 Producer 정리 실패:', closeError);
      }
    }
    
    // 중복 Producer 생성 요청 방지
    const requestKey = `${socketId}-${kind}`;
    if (this.pendingProducers.has(requestKey)) {
      console.log('📹 [MediaSoup] 중복 Producer 생성 요청 무시:', { socketId, kind });
      throw new Error(`${kind} Producer 생성이 이미 진행 중입니다`);
    }
    
    // 요청 시작 표시 (10초 후 자동 정리)
    this.pendingProducers.set(requestKey, true);
    setTimeout(() => {
      if (this.pendingProducers.has(requestKey)) {
        console.warn('📹 [MediaSoup] Producer 생성 타임아웃으로 pending 제거:', { socketId, kind });
        this.pendingProducers.delete(requestKey);
      }
    }, 10000);

    try {
      const userTransports = this.transports.get(socketId);
      
      console.log('📹 [MediaSoup] Producer 생성 전 Transport 상태 확인:', {
        socketId,
        kind,
        hasUserTransports: !!userTransports,
        hasSendTransport: !!userTransports?.sendTransport,
        sendTransportId: userTransports?.sendTransport?.id,
        sendTransportClosed: userTransports?.sendTransport?.closed,
        hasReceiveTransport: !!userTransports?.receiveTransport,
        receiveTransportId: userTransports?.receiveTransport?.id
      });
      
      if (!userTransports || !userTransports.sendTransport) {
        const error = new Error(`SendTransport를 찾을 수 없습니다. Transport 상태: ${JSON.stringify({
          hasUserTransports: !!userTransports,
          hasSendTransport: !!userTransports?.sendTransport,
          sendTransportClosed: userTransports?.sendTransport?.closed
        })}`);
        throw error;
      }
      
      if (userTransports.sendTransport.closed) {
        throw new Error('SendTransport가 이미 닫혀있습니다');
      }

      // 기존 동일한 종류의 Producer가 있으면 먼저 정리하여 MID 충돌 방지
      if (this.producers.has(socketId)) {
        const userProducers = this.producers.get(socketId);
        const existingProducer = userProducers.get(kind);
        if (existingProducer) {
          console.log('📹 [MediaSoup] 기존 Producer 정리 (MID 충돌 방지):', { 
            socketId, 
            kind, 
            existingProducerId: existingProducer.id,
            existingProducerClosed: existingProducer.closed
          });
          
          // Producer가 이미 닫혀있지 않은 경우에만 close 호출
          if (!existingProducer.closed) {
            existingProducer.close();
          }
          
          // Producer 맵에서 즉시 제거
          userProducers.delete(kind);
          
          // 추가적인 정리 시간을 위해 대기 (MediaSoup MID 해제 시간 확보)
          await new Promise(resolve => setTimeout(resolve, 200));
          
          console.log('📹 [MediaSoup] 기존 Producer 정리 완료, 새 Producer 생성 진행');
        }
      }

      let producer;
      try {
        // 다시 한번 transport 유효성 확인 (race condition 방지)
        if (!userTransports.sendTransport) {
          throw new Error('SendTransport가 Producer 생성 중 null이 되었습니다 (race condition)');
        }
        
        producer = await userTransports.sendTransport.produce({ 
          kind, 
          rtpParameters 
        });
      } catch (produceError) {
        // MID 충돌 에러 처리
        if (produceError.message && produceError.message.includes('MID already exists')) {
          console.log('📹 [MediaSoup] MID 충돌 감지, Transport 재생성으로 해결 시도:', {
            socketId,
            kind,
            error: produceError.message
          });
          
          // 기존 SendTransport 완전 제거
          if (userTransports.sendTransport) {
            userTransports.sendTransport.close();
            userTransports.sendTransport = null;
          }
          
          // 새 SendTransport 생성
          const { transport: newTransport } = await this.createWebRtcTransport(socketId);
          userTransports.sendTransport = newTransport;
          
          console.log('📹 [MediaSoup] MID 충돌 해결용 새 SendTransport 생성 완료:', newTransport.id);
          
          // 새 Transport로 Producer 재시도
          producer = await userTransports.sendTransport.produce({ 
            kind, 
            rtpParameters 
          });
          
          console.log('📹 [MediaSoup] MID 충돌 해결 완료, Producer 생성 성공');
        } else {
          throw produceError;
        }
      }

      // Producer 이벤트 핸들러
      producer.on('transportclose', () => {
        console.log('📹 [MediaSoup] Producer transport 닫힘:', { socketId, kind });
        producer.close();
      });

      producer.on('@close', () => {
        console.log('📹 [MediaSoup] Producer 닫힘:', { socketId, kind });
        this.removeProducer(socketId, kind);
      });

      // Producer 저장
      if (!this.producers.has(socketId)) {
        this.producers.set(socketId, new Map());
      }
      this.producers.get(socketId).set(kind, producer);

      console.log('📹 [MediaSoup] Producer 생성 완료:', {
        socketId,
        kind,
        producerId: producer.id
      });

      // 성공 시 pending 요청 제거
      this.pendingProducers.delete(requestKey);

      return {
        id: producer.id,
        kind: producer.kind
      };
    } catch (error) {
      console.error('📹 [MediaSoup] Producer 생성 실패:', error);
      
      // 실패 시에도 pending 요청 제거
      this.pendingProducers.delete(requestKey);
      
      throw error;
    }
  }

  // Consumer 생성
  async createConsumer(socketId, producerId, rtpCapabilities) {
    console.log('📹 [MediaSoup] Consumer 생성:', { socketId, producerId });

    try {
      const userTransports = this.transports.get(socketId);
      if (!userTransports || !userTransports.receiveTransport) {
        throw new Error('ReceiveTransport를 찾을 수 없습니다');
      }

      // Producer 검색
      let producer = null;
      let producerSocketId = null;

      for (const [sId, producers] of this.producers.entries()) {
        for (const [kind, p] of producers.entries()) {
          if (p.id === producerId) {
            producer = p;
            producerSocketId = sId;
            break;
          }
        }
        if (producer) break;
      }

      if (!producer) {
        throw new Error('Producer를 찾을 수 없습니다');
      }

      // Consumer 생성 가능 여부 확인
      if (!this.router.canConsume({
        producerId,
        rtpCapabilities,
      })) {
        throw new Error('Consumer 생성 불가');
      }

      const consumer = await userTransports.receiveTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // 처음에는 일시정지 상태로 생성
      });

      // Consumer 이벤트 핸들러
      consumer.on('transportclose', () => {
        console.log('📹 [MediaSoup] Consumer transport 닫힘:', socketId);
        consumer.close();
      });

      consumer.on('@close', () => {
        console.log('📹 [MediaSoup] Consumer 닫힌:', socketId);
        this.removeConsumer(socketId, consumer.id);
      });

      // Consumer 저장
      if (!this.consumers.has(socketId)) {
        this.consumers.set(socketId, new Map());
      }
      this.consumers.get(socketId).set(consumer.id, consumer);

      console.log('📹 [MediaSoup] Consumer 생성 완료:', {
        socketId,
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind
      });

      return {
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused
      };
    } catch (error) {
      console.error('📹 [MediaSoup] Consumer 생성 실패:', error);
      throw error;
    }
  }

  // Consumer 재개
  async resumeConsumer(socketId, consumerId) {
    console.log('📹 [MediaSoup] Consumer 재개:', { socketId, consumerId });

    try {
      const userConsumers = this.consumers.get(socketId);
      if (!userConsumers) {
        throw new Error('Consumer를 찾을 수 없습니다');
      }

      const consumer = userConsumers.get(consumerId);
      if (!consumer) {
        throw new Error('해당 Consumer를 찾을 수 없습니다');
      }

      await consumer.resume();
      console.log('📹 [MediaSoup] Consumer 재개 완료:', { socketId, consumerId });

      return { success: true };
    } catch (error) {
      console.error('📹 [MediaSoup] Consumer 재개 실패:', error);
      throw error;
    }
  }

  // 기존 Producer 목록 반환
  getExistingProducers(excludeSocketId = null) {
    const producerList = [];
    
    for (const [socketId, producers] of this.producers.entries()) {
      if (excludeSocketId && socketId === excludeSocketId) continue;
      
      for (const [kind, producer] of producers.entries()) {
        producerList.push({
          producerId: producer.id,
          userId: socketId,
          kind: kind
        });
      }
    }
    
    console.log('📹 [MediaSoup] 기존 Producer 목록:', producerList);
    return producerList;
  }

  // 사용자별 Transport 설정
  setUserTransports(socketId, sendTransport = null, receiveTransport = null) {
    if (!this.transports.has(socketId)) {
      this.transports.set(socketId, {});
    }
    
    const userTransports = this.transports.get(socketId);
    if (sendTransport) userTransports.sendTransport = sendTransport;
    if (receiveTransport) userTransports.receiveTransport = receiveTransport;
    
    console.log('📹 [MediaSoup] User Transport 설정:', {
      socketId,
      hasSend: !!userTransports.sendTransport,
      hasReceive: !!userTransports.receiveTransport
    });
  }

  // Producer 제거
  removeProducer(socketId, kind) {
    const userProducers = this.producers.get(socketId);
    if (userProducers && userProducers.has(kind)) {
      userProducers.delete(kind);
      if (userProducers.size === 0) {
        this.producers.delete(socketId);
      }
    }
  }

  // Consumer 제거
  removeConsumer(socketId, consumerId) {
    const userConsumers = this.consumers.get(socketId);
    if (userConsumers && userConsumers.has(consumerId)) {
      userConsumers.delete(consumerId);
      if (userConsumers.size === 0) {
        this.consumers.delete(socketId);
      }
    }
  }

  // 사용자 연결 해제 시 정리
  cleanupUser(socketId) {
    console.log('📹 [MediaSoup] 사용자 정리:', socketId);

    // Producer 정리
    const userProducers = this.producers.get(socketId);
    if (userProducers) {
      for (const [kind, producer] of userProducers.entries()) {
        console.log('📹 [MediaSoup] Producer 종료:', { socketId, kind, producerId: producer.id });
        producer.close();
      }
      this.producers.delete(socketId);
    }

    // Consumer 정리
    const userConsumers = this.consumers.get(socketId);
    if (userConsumers) {
      for (const [consumerId, consumer] of userConsumers.entries()) {
        console.log('📹 [MediaSoup] Consumer 종료:', { socketId, consumerId });
        consumer.close();
      }
      this.consumers.delete(socketId);
    }

    // Transport 정리
    const userTransports = this.transports.get(socketId);
    if (userTransports) {
      if (userTransports.sendTransport) {
        console.log('📹 [MediaSoup] SendTransport 종료:', socketId);
        // 연결된 Transport 추적에서 제거
        this.connectedTransports.delete(userTransports.sendTransport.id);
        userTransports.sendTransport.close();
      }
      if (userTransports.receiveTransport) {
        console.log('📹 [MediaSoup] ReceiveTransport 종료:', socketId);
        // 연결된 Transport 추적에서 제거
        this.connectedTransports.delete(userTransports.receiveTransport.id);
        userTransports.receiveTransport.close();
      }
      this.transports.delete(socketId);
    }
  }

  // 서버 종료
  async shutdown() {
    console.log('📹 [MediaSoup] 서버 종료 시작...');
    
    try {
      // 모든 사용자 정리
      for (const socketId of this.transports.keys()) {
        this.cleanupUser(socketId);
      }

      // Router 종료
      if (this.router) {
        this.router.close();
        this.router = null;
      }

      // Worker 종료
      if (this.worker) {
        this.worker.close();
        this.worker = null;
      }

      // 연결된 Transport 추적 정리
      this.connectedTransports.clear();

      console.log('📹 [MediaSoup] 서버 종료 완료');
    } catch (error) {
      console.error('📹 [MediaSoup] 서버 종료 오류:', error);
    }
  }

  // 상태 정보 반환
  getStats() {
    return {
      transports: this.transports.size,
      producers: Array.from(this.producers.values()).reduce((sum, producers) => sum + producers.size, 0),
      consumers: Array.from(this.consumers.values()).reduce((sum, consumers) => sum + consumers.size, 0),
      workerId: this.worker?.pid,
      routerId: this.router?.id
    };
  }
}

module.exports = MediaSoupServer;