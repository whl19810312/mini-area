const express = require('express');
const Character = require('../models/Character');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// 사용자의 캐릭터 목록 조회 (중복 정리 포함)
router.get('/', auth, async (req, res) => {
  try {
    const characters = await Character.findAll({
      where: { userId: req.user.id },
      include: [{
        model: User,
        as: 'owner',
        attributes: ['username', 'profile']
      }],
      order: [['updatedAt', 'DESC']] // 최신 업데이트 순으로 정렬
    });
    
    // 중복 캐릭터 정리: 사용자당 하나만 유지 (가장 최근 것)
    if (characters.length > 1) {
      console.log(`🧹 사용자 ${req.user.id}의 중복 캐릭터 정리: ${characters.length}개 → 1개`);
      
      const keepCharacter = characters[0]; // 가장 최근 캐릭터 유지
      const deleteCharacters = characters.slice(1); // 나머지 삭제
      
      // 중복 캐릭터들 삭제
      for (const char of deleteCharacters) {
        await char.destroy();
        console.log(`🗑️ 중복 캐릭터 삭제: ${char.name} (ID: ${char.id})`);
      }
      
      // 정리된 캐릭터 목록 반환
      res.json({
        success: true,
        characters: [keepCharacter],
        message: `중복 캐릭터가 정리되었습니다. (${deleteCharacters.length}개 삭제)`
      });
    } else {
      res.json({
        success: true,
        characters
      });
    }
  } catch (error) {
    console.error('캐릭터 목록 조회 오류:', error)
    res.status(500).json({
      success: false,
      message: '캐릭터 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 캐릭터 조회
router.get('/:id', auth, async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['username', 'profile']
        }
      ]
    });
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: '캐릭터를 찾을 수 없습니다.'
      });
    }
    
    // 본인의 캐릭터만 조회 가능
    if (character.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '캐릭터를 조회할 권한이 없습니다.'
      });
    }
    
    res.json({
      success: true,
      character
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '캐릭터 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 캐릭터 배치 조회 (다른 사용자들의 캐릭터 정보)
router.post('/batch', auth, async (req, res) => {
  try {
    const { characterIds } = req.body;
    
    if (!characterIds || !Array.isArray(characterIds)) {
      return res.status(400).json({
        success: false,
        message: '캐릭터 ID 목록이 필요합니다.'
      });
    }
    
    const characters = await Character.findAll({
      where: { id: characterIds },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['username', 'profile']
        }
      ]
    });
    
    res.json(characters);
  } catch (error) {
    console.error('캐릭터 배치 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '캐릭터 배치 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 새 캐릭터 생성
router.post('/', auth, async (req, res) => {
  try {
    const { name, appearance, currentMap, images, size } = req.body;
    
    // 사용자의 기존 캐릭터 확인 (사용자당 하나의 캐릭터만 허용)
    const existingCharacter = await Character.findOne({
      where: {
        userId: req.user.id
      }
    });
    
    let character;
    if (existingCharacter) {
      // 기존 캐릭터가 있으면 업데이트 (이름도 업데이트)
      await existingCharacter.update({
        name,
        appearance,
        images: images || existingCharacter.images || { down: null, up: null, left: null, right: null },
        size: size || existingCharacter.size || 32,
        currentMapId: currentMap
      });
      character = existingCharacter;
    } else {
      // 새 캐릭터 생성
      character = await Character.create({
        name,
        userId: req.user.id,
        appearance,
        images: images || { down: null, up: null, left: null, right: null },
        size: size || 32,
        currentMapId: currentMap
      });
    }
    
    res.status(201).json({
      success: true,
      message: existingCharacter ? '캐릭터가 업데이트되었습니다.' : '캐릭터가 생성되었습니다.',
      character
    });
  } catch (error) {
    console.error('캐릭터 생성 오류:', error)
    res.status(500).json({
      success: false,
      message: '캐릭터 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 캐릭터 업데이트
router.put('/:id', auth, async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: '캐릭터를 찾을 수 없습니다.'
      });
    }
    
    // 본인의 캐릭터만 수정 가능
    if (character.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '캐릭터를 수정할 권한이 없습니다.'
      });
    }
    
    await character.update(req.body);
    
    res.json({
      success: true,
      message: '캐릭터가 업데이트되었습니다.',
      character
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '캐릭터 업데이트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});



// 캐릭터 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        message: '캐릭터를 찾을 수 없습니다.'
      });
    }
    
    // 본인의 캐릭터만 삭제 가능
    if (character.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '캐릭터를 삭제할 권한이 없습니다.'
      });
    }
    
    await character.destroy();
    
    res.json({
      success: true,
      message: '캐릭터가 삭제되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '캐릭터 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router; 