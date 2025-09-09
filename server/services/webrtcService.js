const webrtcConfig = require('../config/webrtcConfig');
const mediasoup = require('mediasoup');

class WebRTCService {
  constructor() {
    this.mode = webrtcConfig.mode;
    this.config = webrtcConfig;
    this.mediasoupWorkers = [];
    this.mediasoupRouters = new Map();
    this.rooms = new Map();
    
    console.log(`🎥 WebRTC Service initialized in ${this.mode.toUpperCase()} mode`);
  }

  async initialize() {
    if (this.mode === 'mediasoup') {
      await this.initializeMediasoup();
    } else {
      console.log('🎥 P2P mode activated - using direct peer connections');
    }
  }

  async initializeMediasoup() {
    try {
      const numWorkers = require('os').cpus().length;
      console.log(`🎥 Creating ${numWorkers} MediaSoup workers...`);

      for (let i = 0; i < numWorkers; i++) {
        const worker = await mediasoup.createWorker({
          rtcMinPort: this.config.mediasoup.worker.rtcMinPort,
          rtcMaxPort: this.config.mediasoup.worker.rtcMaxPort,
          logLevel: this.config.mediasoup.worker.logLevel,
          logTags: this.config.mediasoup.worker.logTags
        });

        worker.on('died', error => {
          console.error('MediaSoup worker died:', error);
          setTimeout(() => process.exit(1), 2000);
        });

        this.mediasoupWorkers.push(worker);
        
        const router = await worker.createRouter({
          mediaCodecs: this.config.mediasoup.router.mediaCodecs
        });
        
        this.mediasoupRouters.set(worker.pid, router);
      }

      console.log('✅ MediaSoup initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize MediaSoup:', error);
      throw error;
    }
  }

  getMode() {
    return this.mode;
  }

  getConfig() {
    if (this.mode === 'p2p') {
      return this.config.p2p;
    } else {
      return this.config.mediasoup;
    }
  }

  async createRoom(roomId) {
    if (this.mode === 'p2p') {
      this.rooms.set(roomId, {
        id: roomId,
        peers: new Map(),
        createdAt: new Date()
      });
      return this.rooms.get(roomId);
    } else {
      const worker = this.getNextWorker();
      const router = this.mediasoupRouters.get(worker.pid);
      
      const room = {
        id: roomId,
        router: router,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
        peers: new Map(),
        createdAt: new Date()
      };
      
      this.rooms.set(roomId, room);
      return room;
    }
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  async deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (this.mode === 'mediasoup') {
      room.transports.forEach(transport => transport.close());
      room.producers.forEach(producer => producer.close());
      room.consumers.forEach(consumer => consumer.close());
    }

    this.rooms.delete(roomId);
  }

  getNextWorker() {
    const worker = this.mediasoupWorkers[
      this.currentWorkerIdx % this.mediasoupWorkers.length
    ];
    this.currentWorkerIdx++;
    return worker;
  }

  currentWorkerIdx = 0;

  async createWebRtcTransport(roomId, peerId, direction) {
    if (this.mode !== 'mediasoup') {
      throw new Error('Transport creation is only available in MediaSoup mode');
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const transport = await room.router.createWebRtcTransport({
      listenIps: this.config.mediasoup.webRtcTransport.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 
        this.config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate
    });

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    const transportInfo = {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };

    room.transports.set(transport.id, {
      transport,
      peerId,
      direction
    });

    return transportInfo;
  }

  handleP2PSignaling(socket, io) {
    socket.on('offer', ({ offer, targetSocketId }) => {
      console.log(`📡 P2P: Relaying offer from ${socket.id} to ${targetSocketId}`);
      io.to(targetSocketId).emit('offer', {
        offer,
        socketId: socket.id
      });
    });

    socket.on('answer', ({ answer, targetSocketId }) => {
      console.log(`📡 P2P: Relaying answer from ${socket.id} to ${targetSocketId}`);
      io.to(targetSocketId).emit('answer', {
        answer,
        socketId: socket.id
      });
    });

    socket.on('ice-candidate', ({ candidate, targetSocketId }) => {
      console.log(`📡 P2P: Relaying ICE candidate from ${socket.id} to ${targetSocketId}`);
      io.to(targetSocketId).emit('ice-candidate', {
        candidate,
        socketId: socket.id
      });
    });
  }

  handleMediasoupSignaling(socket, io) {
    socket.on('get-router-rtp-capabilities', async ({ roomId }, callback) => {
      try {
        const room = this.rooms.get(roomId);
        if (!room) {
          return callback({ error: 'Room not found' });
        }
        callback({ rtpCapabilities: room.router.rtpCapabilities });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('create-transport', async ({ roomId, direction }, callback) => {
      try {
        const transportInfo = await this.createWebRtcTransport(
          roomId, 
          socket.id, 
          direction
        );
        callback(transportInfo);
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('connect-transport', async ({ transportId, dtlsParameters }, callback) => {
      try {
        const room = Array.from(this.rooms.values()).find(r => 
          r.transports.has(transportId)
        );
        
        if (!room) {
          return callback({ error: 'Transport not found' });
        }

        const { transport } = room.transports.get(transportId);
        await transport.connect({ dtlsParameters });
        callback({ success: true });
      } catch (error) {
        callback({ error: error.message });
      }
    });
  }
}

module.exports = new WebRTCService();