const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const auth = require('../middleware/auth');

const router = express.Router();

// Agora 설정
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_CERTIFICATE;

// 토큰 만료 시간 (1시간)
const TOKEN_EXPIRATION_TIME = 3600;

// Agora RTC 토큰 생성
router.post('/token', auth, async (req, res) => {
  try {
    const { channelName, userId, role = 'publisher' } = req.body;

    if (!channelName || !userId) {
      return res.status(400).json({
        success: false,
        message: 'channelName and userId are required'
      });
    }

    if (!APP_ID || !APP_CERTIFICATE) {
      console.error('Agora configuration missing:', { APP_ID: !!APP_ID, APP_CERTIFICATE: !!APP_CERTIFICATE });
      return res.status(500).json({
        success: false,
        message: 'Agora configuration not found'
      });
    }

    // 역할 설정 (publisher 또는 subscriber)
    const rtcRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    
    // 현재 시간부터 1시간 후 만료
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expireTime = currentTimestamp + TOKEN_EXPIRATION_TIME;

    // UID를 숫자로 변환 (0이면 모든 UID에 유효한 토큰)
    const numericUid = 0; // 0은 모든 UID에 유효
    
    // 토큰 생성
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      numericUid,
      rtcRole,
      expireTime
    );

    console.log('🎫 Agora 토큰 생성 성공:', {
      channelName,
      userId,
      role: rtcRole,
      expireTime: new Date(expireTime * 1000).toISOString()
    });

    res.json({
      success: true,
      token,
      expireTime,
      appId: APP_ID
    });

  } catch (error) {
    console.error('❌ Agora 토큰 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Agora token',
      error: error.message
    });
  }
});

// 토큰 갱신
router.post('/refresh-token', auth, async (req, res) => {
  try {
    const { channelName, userId, role = 'publisher' } = req.body;

    if (!channelName || !userId) {
      return res.status(400).json({
        success: false,
        message: 'channelName and userId are required'
      });
    }

    // 토큰 재생성 (같은 로직)
    const rtcRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expireTime = currentTimestamp + TOKEN_EXPIRATION_TIME;

    // UID를 숫자로 변환 (0이면 모든 UID에 유효한 토큰)
    const numericUid = 0; // 0은 모든 UID에 유효
    
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      numericUid,
      rtcRole,
      expireTime
    );

    console.log('🔄 Agora 토큰 갱신 성공:', { channelName, userId });

    res.json({
      success: true,
      token,
      expireTime
    });

  } catch (error) {
    console.error('❌ Agora 토큰 갱신 실패:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh Agora token',
      error: error.message
    });
  }
});

module.exports = router;