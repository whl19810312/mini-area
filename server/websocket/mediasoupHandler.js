const mediasoupService = require('../services/mediasoupService');
const BaseHandler = require('./baseHandler');

class MediaSoupHandler extends BaseHandler {
  constructor(io) {
    super(io);
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    await mediasoupService.initialize();
    this.initialized = true;
    this.log('MediaSoup handler initialized');
  }

  handleConnection(socket) {
    this.logWebRTC(`MediaSoup handler for socket ${socket.id}`);

    // 방 생성
    socket.on('mediasoup:createRoom', async (data, callback) => {
      try {
        const { roomId } = data;
        const room = await mediasoupService.createRoom(roomId, socket.userId || socket.id);
        
        callback({
          success: true,
          room: {
            id: room.id,
            participantCount: room.participantCount
          }
        });
      } catch (error) {
        this.logWebRTCError('Error creating room:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // 방 참가
    socket.on('mediasoup:joinRoom', async (data, callback) => {
      try {
        const { roomId, userName } = data;
        const peerId = socket.userId || socket.id;
        
        // 방 참가
        await mediasoupService.joinRoom(roomId, peerId, userName || 'Anonymous');
        
        // Socket.IO 룸 참가
        socket.join(`room:${roomId}`);
        socket.roomId = roomId;
        socket.peerId = peerId;
        
        // 방 정보 가져오기
        const roomInfo = mediasoupService.getRoomInfo(roomId);
        
        // 다른 참가자들에게 알림
        socket.to(`room:${roomId}`).emit('mediasoup:peerJoined', {
          peerId,
          userName,
          participantCount: roomInfo.participantCount
        });
        
        callback({
          success: true,
          room: roomInfo
        });
      } catch (error) {
        this.logWebRTCError('Error joining room:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // Router RTP Capabilities 가져오기
    socket.on('mediasoup:getRouterRtpCapabilities', async (data, callback) => {
      try {
        const { roomId } = data;
        const room = mediasoupService.getRoom(roomId);
        
        if (!room) {
          throw new Error('Room not found');
        }
        
        callback({
          success: true,
          rtpCapabilities: room.router.rtpCapabilities
        });
      } catch (error) {
        this.logWebRTCError('Error getting router capabilities:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // WebRTC Transport 생성
    socket.on('mediasoup:createTransport', async (data, callback) => {
      try {
        const { roomId, direction } = data;
        const peerId = socket.peerId;
        
        const transportInfo = await mediasoupService.createWebRtcTransport(
          roomId,
          peerId,
          direction
        );
        
        callback({
          success: true,
          transport: transportInfo
        });
      } catch (error) {
        this.logWebRTCError('Error creating transport:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // Transport 연결
    socket.on('mediasoup:connectTransport', async (data, callback) => {
      try {
        const { roomId, transportId, dtlsParameters } = data;
        const peerId = socket.peerId;
        
        await mediasoupService.connectTransport(
          roomId,
          peerId,
          transportId,
          dtlsParameters
        );
        
        callback({ success: true });
      } catch (error) {
        this.logWebRTCError('Error connecting transport:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // Produce (미디어 송신)
    socket.on('mediasoup:produce', async (data, callback) => {
      try {
        const { roomId, transportId, kind, rtpParameters, appData } = data;
        const peerId = socket.peerId;
        
        const producer = await mediasoupService.produce(
          roomId,
          peerId,
          transportId,
          kind,
          rtpParameters,
          appData
        );
        
        // 다른 참가자들에게 새 프로듀서 알림
        socket.to(`room:${roomId}`).emit('mediasoup:newProducer', {
          producerId: producer.id,
          peerId: producer.peerId,
          kind: producer.kind
        });
        
        callback({
          success: true,
          producerId: producer.id
        });
      } catch (error) {
        this.logWebRTCError('Error producing:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // Consume (미디어 수신)
    socket.on('mediasoup:consume', async (data, callback) => {
      try {
        const { roomId, producerId, rtpCapabilities } = data;
        const peerId = socket.peerId;
        
        const consumer = await mediasoupService.consume(
          roomId,
          peerId,
          producerId,
          rtpCapabilities
        );
        
        callback({
          success: true,
          consumer
        });
      } catch (error) {
        this.logWebRTCError('Error consuming:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // Consumer resume
    socket.on('mediasoup:resumeConsumer', async (data, callback) => {
      try {
        const { roomId, consumerId } = data;
        const room = mediasoupService.getRoom(roomId);
        const peer = room.peers.get(socket.peerId);
        const consumer = peer.consumers.get(consumerId);
        
        await consumer.resume();
        
        callback({ success: true });
      } catch (error) {
        this.logWebRTCError('Error resuming consumer:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // Producer pause
    socket.on('mediasoup:pauseProducer', async (data, callback) => {
      try {
        const { roomId, producerId } = data;
        const room = mediasoupService.getRoom(roomId);
        const peer = room.peers.get(socket.peerId);
        const producer = peer.producers.get(producerId);
        
        await producer.pause();
        
        // 다른 참가자들에게 알림
        socket.to(`room:${roomId}`).emit('mediasoup:producerPaused', {
          producerId
        });
        
        callback({ success: true });
      } catch (error) {
        this.logWebRTCError('Error pausing producer:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // Producer resume
    socket.on('mediasoup:resumeProducer', async (data, callback) => {
      try {
        const { roomId, producerId } = data;
        const room = mediasoupService.getRoom(roomId);
        const peer = room.peers.get(socket.peerId);
        const producer = peer.producers.get(producerId);
        
        await producer.resume();
        
        // 다른 참가자들에게 알림
        socket.to(`room:${roomId}`).emit('mediasoup:producerResumed', {
          producerId
        });
        
        callback({ success: true });
      } catch (error) {
        this.logWebRTCError('Error resuming producer:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // 방 나가기
    socket.on('mediasoup:leaveRoom', async (data, callback) => {
      try {
        const roomId = socket.roomId;
        const peerId = socket.peerId;
        
        if (roomId && peerId) {
          await mediasoupService.leaveRoom(roomId, peerId);
          
          // Socket.IO 룸에서 나가기
          socket.leave(`room:${roomId}`);
          
          // 다른 참가자들에게 알림
          socket.to(`room:${roomId}`).emit('mediasoup:peerLeft', {
            peerId
          });
          
          delete socket.roomId;
          delete socket.peerId;
        }
        
        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        this.logWebRTCError('Error leaving room:', error);
        if (callback) {
          callback({
            success: false,
            error: error.message
          });
        }
      }
    });

    // 방 정보 가져오기
    socket.on('mediasoup:getRoomInfo', async (data, callback) => {
      try {
        const { roomId } = data;
        const roomInfo = mediasoupService.getRoomInfo(roomId);
        
        callback({
          success: true,
          room: roomInfo
        });
      } catch (error) {
        this.logWebRTCError('Error getting room info:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // 모든 방 목록 가져오기
    socket.on('mediasoup:getAllRooms', async (data, callback) => {
      try {
        const rooms = mediasoupService.getAllRooms();
        
        callback({
          success: true,
          ...rooms
        });
      } catch (error) {
        this.logWebRTCError('Error getting all rooms:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });

    // 연결 종료 시 정리
    socket.on('disconnect', async () => {
      if (socket.roomId && socket.peerId) {
        await mediasoupService.leaveRoom(socket.roomId, socket.peerId);
        
        // 다른 참가자들에게 알림
        socket.to(`room:${socket.roomId}`).emit('mediasoup:peerLeft', {
          peerId: socket.peerId
        });
      }
    });
  }
}

module.exports = MediaSoupHandler;