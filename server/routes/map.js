const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const Map = require('../models/Map');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { generatePublicLink, validatePublicLink } = require('../utils/linkGenerator');

const router = express.Router();

// Image upload settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/maps';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files can be uploaded.'));
    }
  }
});

// Get active room list (only spaces with users)
router.get('/active', auth, async (req, res) => {
  try {
    const metaverseHandler = req.metaverseHandler || req.app.get('metaverseHandler');

    // 우선 WebSocket 핸들러의 실시간 데이터로 활성 맵 계산
    if (metaverseHandler && metaverseHandler.mapsList) {
      const mapsArray = Array.from(metaverseHandler.mapsList.values());
      const active = mapsArray.filter(m => (m.participantCount || 0) > 0);

      // DB에서 추가 정보 보강
      const activeIds = active.map(m => m.id);
      const dbMaps = await Map.findAll({
        where: { id: activeIds },
        include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }]
      });

      const dbMapById = new Map(dbMaps.map(m => [m.id, m]));
      const result = active.map(m => {
        const db = dbMapById.get(m.id);
        return {
          id: m.id,
          name: m.name,
          description: db?.description || null,
          currentUsers: m.participantCount || 0,
          isActive: (m.participantCount || 0) > 0,
          creator: db?.creator ? { id: db.creator.id, username: db.creator.username } : null,
          createdAt: db?.createdAt || null,
          updatedAt: db?.updatedAt || null
        };
      });

      return res.json({ success: true, maps: result });
    }

    // 핸들러가 없으면 DB 기준으로 대체 (현재 사용자 수 컬럼 기준)
    const fallbackActive = await Map.findAll({
      where: { currentUsers: { [Op.gt]: 0 } },
      include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }]
    });

    const result = fallbackActive.map(map => ({
      id: map.id,
      name: map.name,
      description: map.description,
      currentUsers: map.currentUsers,
      isActive: true,
      creator: map.creator ? { id: map.creator.id, username: map.creator.username } : null,
      createdAt: map.createdAt,
      updatedAt: map.updatedAt
    }));

    return res.json({ success: true, maps: result });
  } catch (error) {
    console.error('Failed to get active room list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load the active room list.'
    });
  }
});

// Get room list with lobby and room user counts
router.get('/', auth, async (req, res) => {
  try {
    const { sort = 'createdAt', page = 1, limit = 20, type = 'all' } = req.query;
    
    let orderOption = [];
    switch (sort) {
      case 'name':
        orderOption = [['name', 'ASC']];
        break;
      case 'createdAt':
        orderOption = [['createdAt', 'DESC']];
        break;
      case 'updatedAt':
        orderOption = [['updatedAt', 'DESC']];
        break;
      default:
        orderOption = [['createdAt', 'DESC']];
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = {};
    
    // Filter by type
    switch (type) {
      case 'my':
        whereClause = { creatorId: req.user.id };
        break;
      case 'public':
        whereClause = { isPublic: true };
        break;
      case 'all':
      default:
        whereClause = {
          [Op.or]: [
            { creatorId: req.user.id },
            { isPublic: true }
          ]
        };
        break;
    }
    
    const { count: total, rows: maps } = await Map.findAndCountAll({
      where: whereClause,
      order: orderOption,
      offset: offset,
      limit: parseInt(limit),
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    // WebSocket 핸들러에서 실시간 사용자 수 정보 가져오기
    const metaverseHandler = req.metaverseHandler || req.app.get('metaverseHandler');
    const lobbyUsers = metaverseHandler ? metaverseHandler.getLobbyUsers() : [];
    const mapUsers = metaverseHandler ? metaverseHandler.getMapUsers() : {};

    // 각 맵에 실시간 사용자 수 정보 추가
    const mapsWithUserCounts = maps.map(map => {
      const mapUserCount = mapUsers[map.id] || 0;
      const mapData = map.toJSON();
      
      // creatorInfo가 없으면 기존 creator 관계에서 가져오기
      if (!mapData.creatorInfo && mapData.creator) {
        mapData.creatorInfo = {
          id: mapData.creator.id,
          username: mapData.creator.username,
          email: mapData.creator.email
        };
      }
      
      return {
        ...mapData,
        currentUsers: mapUserCount,
        participantCount: mapUserCount,  // participantCount 필드 추가
        lobbyUsers: lobbyUsers.length
      };
    });
    
    res.json({
      success: true,
      maps: mapsWithUserCounts,
      lobbyUsers: lobbyUsers.length,
      lobbyParticipantCount: lobbyUsers.length,  // 대기실 참가자 수 추가
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting room list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room list.',
      error: error.message
    });
  }
});

// Enter room (increase user count)
router.post('/:id/enter', auth, async (req, res) => {
  try {
    const map = await Map.findByPk(req.params.id);
    
    if (!map) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    
    const currentUsers = await map.addUser();
    
    res.json({ success: true, message: 'Entered the room.', currentUsers });
  } catch (error) {
    console.error('Failed to enter room:', error);
    res.status(500).json({ success: false, message: 'Failed to enter room.' });
  }
});

// Leave room (decrease user count)
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const map = await Map.findByPk(req.params.id);
    
    if (!map) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    
    const currentUsers = await map.removeUser();
    
    res.json({ success: true, message: 'Left the room.', currentUsers, isActive: map.isActive });
  } catch (error) {
    console.error('Failed to leave room:', error);
    res.status(500).json({ success: false, message: 'Failed to leave room.' });
  }
});

// Access room via public link (no auth required)
router.get('/public/:link', async (req, res) => {
  try {
    const { link } = req.params;
    
    if (!validatePublicLink(link)) {
      return res.status(400).json({ success: false, message: 'Invalid public link.' });
    }
    
    const map = await Map.findOne({
      where: { publicLink: link, isPublic: true },
      include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }]
    });
    
    if (!map) {
      return res.status(404).json({ success: false, message: 'Room for the public link not found.' });
    }
    
    res.json({ success: true, map });
  } catch (error) {
    console.error('Failed to get room by public link:', error);
    res.status(500).json({ success: false, message: 'Failed to load the room.' });
  }
});

// Get a single map
router.get('/:id', auth, async (req, res) => {
  console.log('🔍 서버: 맵 조회 요청:', { mapId: req.params.id, userId: req.user.id })
  
  try {
    const map = await Map.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['username'] }]
    });
    
    console.log('🔍 서버: 맵 조회 결과:', map ? '성공' : '실패')
    
    if (!map) {
      console.log('❌ 서버: 맵을 찾을 수 없음')
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    
    console.log('✅ 서버: 맵 조회 성공:', { id: map.id, name: map.name, creatorId: map.creatorId })
    res.json({ success: true, map });
  } catch (error) {
    console.error('❌ 서버: 맵 조회 오류:', error);
    res.status(500).json({ success: false, message: 'Failed to get room.', error: error.message });
  }
});

// Create a new map
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic, walls, privateAreas, spawnPoints, backgroundLayer, size } = req.body;
    
    // 해당 생성자가 만든 맵의 개수를 조회하여 다음 순서 결정
    const existingMapsCount = await Map.count({
      where: { creatorId: req.user.id }
    });
    const nextMapIndex = existingMapsCount + 1;
    
    const mapData = {
      name,
      description,
      isPublic: true, // 항상 공개로 설정
      creatorId: req.user.id,
      creatorMapIndex: nextMapIndex,
      creatorInfo: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      },
      size: size || { width: 1000, height: 1000 },
      walls: walls || [],
      privateAreas: privateAreas || [],
      spawnPoints: spawnPoints || [{ x: 500, y: 500 }]
    };

    // Background layer image data processing
    if (backgroundLayer?.image) {
      mapData.backgroundLayer = backgroundLayer;
    }

    const newMap = await Map.create(mapData);
    
    // Broadcast the new map to all clients via WebSocket
    req.metaverseHandler.addMap(newMap.toJSON());

    res.status(201).json({ success: true, message: 'Room created successfully.', map: newMap });
  } catch (error) {
    console.error('Error creating room:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'A room with the same name already exists.' });
    }
    
    res.status(500).json({ success: false, message: 'An error occurred while creating the room.', error: error.message });
  }
});

// Edit a map
router.put('/:id', auth, async (req, res) => {
  try {
    const map = await Map.findByPk(req.params.id);
    
    if (!map) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    
    if (map.creatorId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this room.' });
    }
    
    const { name, description, isPublic, walls, privateAreas, spawnPoints, backgroundLayer, size } = req.body;
    
    map.name = name || map.name;
    map.description = description || map.description;
    map.isPublic = isPublic === undefined ? map.isPublic : isPublic;
    map.creatorInfo = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    };
    map.walls = walls || map.walls;
    map.privateAreas = privateAreas || map.privateAreas;
    map.spawnPoints = spawnPoints || map.spawnPoints;
    map.size = size || map.size;
    
    // Background layer image data processing
    if (backgroundLayer?.image) {
      map.backgroundLayer = backgroundLayer;
    }
    
    await map.save();
    
    // Broadcast the updated map to all clients via WebSocket
    req.metaverseHandler.updateMap(map.toJSON());
    
    res.json({ success: true, message: 'Room has been updated.', map });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, message: 'An error occurred while updating the room.', error: error.message });
  }
});

// Delete a map
router.delete('/:id', auth, async (req, res) => {
  try {
    const map = await Map.findByPk(req.params.id);
    
    if (!map) {
      return res.status(404).json({ 
        success: false, 
        message: '가상공간을 찾을 수 없습니다.' 
      });
    }
    
    if (map.creatorId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: '본인이 만든 가상공간만 삭제할 수 있습니다.' 
      });
    }
    
    const mapId = req.params.id;
    const mapName = map.name;
    
    await map.destroy();

    // WebSocket을 통해 모든 클라이언트에게 삭제 알림
    req.metaverseHandler.deleteMap(mapId);
    
    res.status(200).json({ 
      success: true, 
      message: `"${mapName}" 가상공간이 성공적으로 삭제되었습니다.` 
    });
  } catch (error) {
    console.error('가상공간 삭제 중 오류 발생:', error);
    res.status(500).json({ 
      success: false, 
      message: '가상공간 삭제 중 오류가 발생했습니다.', 
      error: error.message 
    });
  }
});

// Upload image for a map
router.post('/:id/upload-image', auth, upload.single('image'), async (req, res) => {
    try {
        const map = await Map.findByPk(req.params.id);
        if (!map) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        if (map.creatorId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You do not have permission to edit this room.' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Image file is required.' });
        }

        const sharp = require('sharp');
        const imageInfo = await sharp(req.file.path).metadata();
        const imageBuffer = fs.readFileSync(req.file.path);
        fs.unlinkSync(req.file.path);

        map.backgroundLayer = {
            image: {
                data: imageBuffer.toString('base64'),
                contentType: req.file.mimetype,
                filename: req.file.originalname,
                width: imageInfo.width,
                height: imageInfo.height,
                uploadedAt: new Date()
            }
        };

        await map.save();

        req.metaverseHandler.updateMap(map.toJSON());

        res.json({ success: true, message: 'Image uploaded successfully.', map });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ success: false, message: 'Image upload error.', error: error.message });
    }
});

module.exports = router;