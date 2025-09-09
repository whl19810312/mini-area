require('dotenv').config();

// 방과 참가자 수 제한 설정 (.env에서 읽기)
module.exports = {
  p2p: {
    MAX_ROOMS: parseInt(process.env.P2P_MAX_ROOMS) || 1000,              // P2P 최대 방 개수
    MAX_PARTICIPANTS_PER_ROOM: parseInt(process.env.P2P_MAX_PARTICIPANTS_PER_ROOM) || 10 // P2P 방당 최대 참가자 수
  },
  mediasoup: {
    MAX_ROOMS: parseInt(process.env.MEDIASOUP_MAX_ROOMS) || 400,                // MediaSoup 최대 방 개수
    MAX_PARTICIPANTS_PER_ROOM: parseInt(process.env.MEDIASOUP_MAX_PARTICIPANTS_PER_ROOM) || 100 // MediaSoup 방당 최대 참가자 수
  }
};