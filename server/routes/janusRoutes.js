const express = require('express');
const router = express.Router();
const janusService = require('../services/janusService');
const authMiddleware = require('../middleware/auth');

// 룸 참가
router.post('/join-room', authMiddleware, async (req, res) => {
  try {
    const { roomType, roomInfo } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    const result = await janusService.joinRoom(userId, username, roomType, roomInfo);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('룸 참가 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 룸 나가기
router.post('/leave-room', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await janusService.leaveRoom(userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('룸 나가기 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 룸 전환
router.post('/switch-room', authMiddleware, async (req, res) => {
  try {
    const { fromRoomType, toRoomType, roomInfo } = req.body;
    const userId = req.user.id;

    const result = await janusService.switchRoom(userId, fromRoomType, toRoomType, roomInfo);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('룸 전환 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Publisher 설정 (SDP Offer 처리)
router.post('/configure-publisher', authMiddleware, async (req, res) => {
  try {
    const { offer } = req.body;
    const userId = req.user.id;

    const result = await janusService.configurePublisher(userId, offer);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Publisher 설정 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ICE Candidate 처리
router.post('/ice-candidate', authMiddleware, async (req, res) => {
  try {
    const { candidate } = req.body;
    const userId = req.user.id;

    const result = await janusService.handleIceCandidate(userId, candidate);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('ICE candidate 처리 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 룸 참가자 목록 조회
router.get('/room-participants', authMiddleware, async (req, res) => {
  try {
    const { roomType, metaverseId, areaId } = req.query;
    
    const roomInfo = metaverseId && areaId ? { metaverseId, areaId } : {};
    const participants = await janusService.getRoomParticipants(roomType, roomInfo);
    
    res.json({
      success: true,
      data: participants
    });
  } catch (error) {
    console.error('참가자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 영역 룸 생성
router.post('/create-area-room', authMiddleware, async (req, res) => {
  try {
    const { metaverseId, areaId, areaName } = req.body;
    
    const roomId = await janusService.createAreaRoom(metaverseId, areaId, areaName);
    
    res.json({
      success: true,
      data: { roomId }
    });
  } catch (error) {
    console.error('영역 룸 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 영역 룸 삭제
router.delete('/area-room', authMiddleware, async (req, res) => {
  try {
    const { metaverseId, areaId } = req.body;
    
    const result = await janusService.destroyAreaRoom(metaverseId, areaId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('영역 룸 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Janus 서버 상태 확인
router.get('/status', async (req, res) => {
  try {
    const isConnected = janusService.connection !== null;
    
    res.json({
      success: true,
      data: {
        connected: isConnected,
        url: process.env.JANUS_URL || 'ws://localhost:8188'
      }
    });
  } catch (error) {
    console.error('상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;