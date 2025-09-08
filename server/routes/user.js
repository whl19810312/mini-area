const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getStoredEmails } = require('../utils/emailService');

const router = express.Router();

// 현재 사용자 정보 조회
router.get('/me', auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: '인증 정보가 유효하지 않습니다.'
      });
    }
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 사용자 프로필 업데이트
router.put('/profile', auth, async (req, res) => {
  try {
    const { nickname, bio, avatar } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (nickname) user.profile.nickname = nickname;
    if (bio) user.profile.bio = bio;
    if (avatar) user.profile.avatar = avatar;
    
    await user.save();
    
    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '프로필 업데이트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 온라인 사용자 목록 조회
router.get('/online', auth, async (req, res) => {
  try {
    const onlineUsers = await User.findAll({
      where: { isOnline: true },
      attributes: ['username', 'profile', 'lastSeen'],
      order: [['lastSeen', 'DESC']]
    });
    
    res.json({
      success: true,
      users: onlineUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '온라인 사용자 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 모든 로그인 사용자 정보 조회 (WebSocket Handler 사용)
router.get('/logged-in-users', auth, async (req, res) => {
  try {
    const metaverseHandler = req.metaverseHandler || req.app.get('metaverseHandler');
    
    if (!metaverseHandler) {
      return res.status(500).json({
        success: false,
        message: 'WebSocket 핸들러를 찾을 수 없습니다.'
      });
    }
    
    // WebSocket 핸들러에서 로그인 사용자 정보 가져오기
    const allLoggedInUsers = Array.from(metaverseHandler.loggedInUsers.values());
    const socketUsers = Array.from(metaverseHandler.socketUsers.values());
    const maps = Array.from(metaverseHandler.maps.entries());
    
    // 맵별 사용자 수 계산 (실제 맵에 있는 사용자만 계산)
    const mapUserCounts = {};
    maps.forEach(([mapId, socketIds]) => {
      if (mapId !== 'wait') {
        mapUserCounts[mapId] = socketIds.size;
      }
    });
    
    // 실제 맵에 있는 사용자 수도 확인
    allLoggedInUsers.forEach(user => {
      if (user.mapId && user.mapId !== 'wait' && user.mapId !== null) {
        if (!mapUserCounts[user.mapId]) {
          mapUserCounts[user.mapId] = 0;
        }
      }
    });
    
    // 온라인/오프라인 사용자 분류
    const onlineUsers = allLoggedInUsers.filter(user => user.isOnline);
    const offlineUsers = allLoggedInUsers.filter(user => !user.isOnline);
    
    // 대기실 사용자 (mapId가 'wait'인 사용자)
    const lobbyUsers = allLoggedInUsers.filter(user => !user.mapId || user.mapId === null || user.mapId === 'wait');
    
    // 맵별 사용자 리스트 ('wait'를 제외한 실제 맵 ID만)
    const mapUsers = {};
    allLoggedInUsers.forEach(user => {
      if (user.mapId && user.mapId !== null && user.mapId !== 'wait') {
        if (!mapUsers[user.mapId]) {
          mapUsers[user.mapId] = [];
        }
        mapUsers[user.mapId].push({
          id: user.id,
          username: user.username,
          isOnline: user.isOnline,
          position: user.위치,
          direction: user.방향,
          joinedAt: user.입장시간
        });
      }
    });
    
    res.json({
      success: true,
      allUsers: allLoggedInUsers,
      onlineCount: onlineUsers.length,
      offlineCount: offlineUsers.length,
      lobbyCount: lobbyUsers.length,
      mapUserCounts: mapUserCounts,
      mapUsers: mapUsers,
      totalUsers: allLoggedInUsers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('로그인 사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 사용자 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 사용자 검색
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: '검색어를 입력해주세요.'
      });
    }
    
    const { Op } = require('sequelize');
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: `%${q}%` } },
          { profile: { nickname: { [Op.iLike]: `%${q}%` } } }
        ]
      },
      attributes: ['username', 'profile', 'isOnline', 'lastSeen'],
      limit: 10
    });
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '사용자 검색 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 사용자 정보 조회
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['username', 'profile', 'isOnline', 'lastSeen', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 저장된 이메일 목록 조회 (개발용)
router.get('/emails', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: '이 API는 개발 환경에서만 사용할 수 있습니다.'
      });
    }
    
    const emails = getStoredEmails();
    
    res.json({
      success: true,
      emails: emails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '이메일 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router; 