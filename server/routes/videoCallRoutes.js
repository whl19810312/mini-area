const express = require('express');
const router = express.Router();
const livekitService = require('../services/livekitService');
const auth = require('../middleware/auth');

// Get token for global video call
router.post('/token/global', auth, async (req, res) => {
  try {
    const { metaverseId } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!metaverseId) {
      return res.status(400).json({ error: 'Metaverse ID is required' });
    }

    const tokenData = await livekitService.createGlobalRoomToken(
      metaverseId,
      userId,
      username
    );

    res.json({
      success: true,
      data: tokenData,
    });
  } catch (error) {
    console.error('Error creating global room token:', error);
    res.status(500).json({ error: 'Failed to create video call token' });
  }
});

// Get token for area-based video call
router.post('/token/area', auth, async (req, res) => {
  try {
    const { metaverseId, areaId } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!metaverseId || !areaId) {
      return res.status(400).json({ error: 'Metaverse ID and Area ID are required' });
    }

    const tokenData = await livekitService.createAreaRoomToken(
      metaverseId,
      areaId,
      userId,
      username
    );

    res.json({
      success: true,
      data: tokenData,
    });
  } catch (error) {
    console.error('Error creating area room token:', error);
    res.status(500).json({ error: 'Failed to create video call token' });
  }
});

// Get token for 1:1 video call
router.post('/token/one-on-one', auth, async (req, res) => {
  try {
    const { callId, targetUserId } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!callId) {
      return res.status(400).json({ error: 'Call ID is required' });
    }

    const tokenData = await livekitService.createOneOnOneRoomToken(
      callId,
      userId,
      username
    );

    // Optionally notify the target user about the call
    if (targetUserId) {
      // Emit socket event or send notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${targetUserId}`).emit('incoming_call', {
          callId,
          callerId: userId,
          callerName: username,
        });
      }
    }

    res.json({
      success: true,
      data: tokenData,
    });
  } catch (error) {
    console.error('Error creating one-on-one room token:', error);
    res.status(500).json({ error: 'Failed to create video call token' });
  }
});

// Leave video call
router.post('/leave', auth, async (req, res) => {
  try {
    const { roomName } = req.body;
    const userId = req.user.id;

    // Notify other participants via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(roomName).emit('participant_left', {
        userId,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Successfully left the video call',
    });
  } catch (error) {
    console.error('Error leaving video call:', error);
    res.status(500).json({ error: 'Failed to leave video call' });
  }
});

module.exports = router;