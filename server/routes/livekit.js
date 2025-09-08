const express = require('express');
const router = express.Router();

// LiveKit server token minting (lazy-load SDK to avoid startup require issues)
// Requires: npm i livekit-server-sdk

router.post('/token', async (req, res) => {
  try {
    let AccessToken;
    try {
      ({ AccessToken } = require('livekit-server-sdk'));
    } catch (e) {
      return res.status(500).json({ success: false, message: 'LiveKit server SDK not installed on server. Run: npm i livekit-server-sdk' });
    }

    const { userId, roomName } = req.body || {};
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return res.status(400).json({
        success: false,
        message: 'LIVEKIT env vars not configured',
        details: {
          LIVEKIT_URL: !!livekitUrl,
          LIVEKIT_API_KEY: !!apiKey,
          LIVEKIT_API_SECRET: !!apiSecret
        }
      });
    }

    const at = new AccessToken(apiKey, apiSecret, { identity: String(userId || 'guest_' + Date.now()) });
    at.addGrant({ room: roomName || 'default', roomJoin: true, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();

    return res.json({ success: true, token, url: livekitUrl, room: roomName || 'default' });
  } catch (err) {
    console.error('LiveKit token mint error:', err);
    return res.status(500).json({ success: false, message: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
});

module.exports = router;


