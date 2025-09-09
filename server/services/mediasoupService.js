const mediasoup = require('mediasoup');
const config = require('../config/webrtcConfig');
const roomLimits = require('../config/roomLimits');
const logger = require('../utils/logger');

class MediaSoupService {
  constructor() {
    this.workers = [];
    this.rooms = new Map();
    this.currentWorkerIdx = 0;
    
    // 방 제한 설정
    this.MAX_ROOMS = roomLimits.mediasoup.MAX_ROOMS;
    this.MAX_PARTICIPANTS_PER_ROOM = roomLimits.mediasoup.MAX_PARTICIPANTS_PER_ROOM;
  }

  async initialize() {
    try {
      const numWorkers = require('os').cpus().length;
      logger.info(`MediaSoup: Creating ${numWorkers} workers...`);
      logger.info(`   - Max rooms: ${this.MAX_ROOMS}`);
      logger.info(`   - Max participants per room: ${this.MAX_PARTICIPANTS_PER_ROOM}`);

      for (let i = 0; i < numWorkers; i++) {
        const worker = await mediasoup.createWorker({
          rtcMinPort: config.mediasoup.worker.rtcMinPort,
          rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
          logLevel: config.mediasoup.worker.logLevel,
          logTags: config.mediasoup.worker.logTags
        });

        worker.on('died', error => {
          logger.error('MediaSoup worker died:', error);
          setTimeout(() => process.exit(1), 2000);
        });

        this.workers.push(worker);
      }

      logger.info('MediaSoup initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize MediaSoup:', error);
      throw error;
    }
  }

  getNextWorker() {
    const worker = this.workers[this.currentWorkerIdx % this.workers.length];
    this.currentWorkerIdx++;
    return worker;
  }

  async createRoom(roomId, creatorId) {
    // 방 개수 제한 체크
    if (this.rooms.size >= this.MAX_ROOMS) {
      throw new Error(`Maximum number of rooms (${this.MAX_ROOMS}) reached`);
    }

    // 이미 존재하는 방인지 체크
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    const worker = this.getNextWorker();
    const router = await worker.createRouter({
      mediaCodecs: config.mediasoup.router.mediaCodecs
    });

    const room = {
      id: roomId,
      router: router,
      peers: new Map(),
      creatorId: creatorId,
      createdAt: new Date(),
      participantCount: 0
    };

    this.rooms.set(roomId, room);
    logger.webrtc.info(`Room created: ${roomId} by ${creatorId}`);
    
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  async joinRoom(roomId, peerId, peerName) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // 참가자 수 제한 체크
    if (room.participantCount >= this.MAX_PARTICIPANTS_PER_ROOM) {
      throw new Error(`Room is full (max ${this.MAX_PARTICIPANTS_PER_ROOM} participants)`);
    }

    // 이미 참가한 사용자인지 체크
    if (room.peers.has(peerId)) {
      return room.peers.get(peerId);
    }

    const peer = {
      id: peerId,
      name: peerName,
      joinedAt: new Date(),
      transports: new Map(),
      producers: new Map(),
      consumers: new Map()
    };

    room.peers.set(peerId, peer);
    room.participantCount++;
    
    logger.webrtc.info(`${peerName} joined room ${roomId} (${room.participantCount}/${this.MAX_PARTICIPANTS_PER_ROOM})`);
    
    return peer;
  }

  async createWebRtcTransport(roomId, peerId, direction) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const peer = room.peers.get(peerId);
    if (!peer) {
      throw new Error('Peer not found in room');
    }

    const transport = await room.router.createWebRtcTransport({
      listenIps: config.mediasoup.webRtcTransport.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
      maxIncomingBitrate: config.mediasoup.webRtcTransport.maxIncomingBitrate
    });

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    transport.on('close', () => {
      logger.webrtc.debug('Transport closed');
    });

    peer.transports.set(transport.id, transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  }

  async connectTransport(roomId, peerId, transportId, dtlsParameters) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error('Peer not found');

    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    await transport.connect({ dtlsParameters });
  }

  async produce(roomId, peerId, transportId, kind, rtpParameters, appData = {}) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const peer = room.peers.get(peerId);
    if (!peer) throw new Error('Peer not found');

    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: {
        ...appData,
        peerId,
        peerName: peer.name
      }
    });

    peer.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      producer.close();
      peer.producers.delete(producer.id);
    });

    // 다른 참가자들에게 새 프로듀서 알림
    return {
      id: producer.id,
      peerId: peerId,
      kind: kind
    };
  }

  async consume(roomId, consumerPeerId, producerId, rtpCapabilities) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const consumerPeer = room.peers.get(consumerPeerId);
    if (!consumerPeer) throw new Error('Consumer peer not found');

    // 프로듀서 찾기
    let producer = null;
    let producerPeer = null;
    
    for (const [peerId, peer] of room.peers) {
      if (peer.producers.has(producerId)) {
        producer = peer.producers.get(producerId);
        producerPeer = peer;
        break;
      }
    }

    if (!producer) throw new Error('Producer not found');

    // Router가 consume 가능한지 체크
    if (!room.router.canConsume({
      producerId: producer.id,
      rtpCapabilities
    })) {
      throw new Error('Cannot consume');
    }

    // Transport 찾기 (consume용 transport)
    const transport = [...consumerPeer.transports.values()].find(t => t.appData?.consuming);
    if (!transport) throw new Error('No consuming transport found');

    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: false,
      appData: {
        peerId: producerPeer.id,
        peerName: producerPeer.name
      }
    });

    consumer.on('transportclose', () => {
      consumer.close();
      consumerPeer.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      consumer.close();
      consumerPeer.consumers.delete(consumer.id);
    });

    consumerPeer.consumers.set(consumer.id, consumer);

    return {
      id: consumer.id,
      producerId: producer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      appData: consumer.appData
    };
  }

  async leaveRoom(roomId, peerId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(peerId);
    if (!peer) return;

    // 모든 consumer 정리
    for (const consumer of peer.consumers.values()) {
      consumer.close();
    }
    peer.consumers.clear();

    // 모든 producer 정리
    for (const producer of peer.producers.values()) {
      producer.close();
    }
    peer.producers.clear();

    // 모든 transport 정리
    for (const transport of peer.transports.values()) {
      transport.close();
    }
    peer.transports.clear();

    // peer 제거
    room.peers.delete(peerId);
    room.participantCount--;

    logger.webrtc.info(`Peer ${peerId} left room ${roomId} (${room.participantCount}/${this.MAX_PARTICIPANTS_PER_ROOM})`);

    // 방이 비었으면 삭제
    if (room.participantCount === 0) {
      room.router.close();
      this.rooms.delete(roomId);
      logger.webrtc.info(`Empty room ${roomId} deleted`);
    }
  }

  async deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // 모든 peer 정리
    for (const [peerId, peer] of room.peers) {
      await this.leaveRoom(roomId, peerId);
    }

    // router 정리
    room.router.close();
    
    // 방 삭제
    this.rooms.delete(roomId);
    logger.webrtc.info(`Room ${roomId} deleted`);
  }

  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      participantCount: room.participantCount,
      maxParticipants: this.MAX_PARTICIPANTS_PER_ROOM,
      participants: Array.from(room.peers.values()).map(peer => ({
        id: peer.id,
        name: peer.name,
        joinedAt: peer.joinedAt
      })),
      createdAt: room.createdAt
    };
  }

  getAllRooms() {
    const rooms = [];
    for (const [roomId, room] of this.rooms) {
      rooms.push({
        id: roomId,
        participantCount: room.participantCount,
        createdAt: room.createdAt
      });
    }
    return {
      rooms,
      totalRooms: this.rooms.size,
      maxRooms: this.MAX_ROOMS
    };
  }
}

module.exports = new MediaSoupService();