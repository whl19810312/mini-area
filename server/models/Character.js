const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Character = sequelize.define('Character', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },
  appearance: {
    type: DataTypes.JSON,
    defaultValue: {
      head: '😊',    // 머리/얼굴 이모지
      body: '👕',    // 몸/상의 이모지  
      arms: '💪',    // 팔 이모지
      legs: '👖'     // 다리/하의 이모지
    },
    comment: '이모지 기반 캐릭터 외형 (머리, 몸, 팔, 다리)'
  },
  // 4방향 이미지 저장 (base64 문자열)
  images: {
    type: DataTypes.JSON,
    defaultValue: {
      down: null,
      up: null,
      left: null,
      right: null
    },
    comment: '4방향 캐릭터 이미지 (base64 문자열)'
  },
  size: {
    type: DataTypes.INTEGER,
    defaultValue: 32,
    comment: '캐릭터 크기 (픽셀)'
  },
  position: {
    type: DataTypes.JSON,
    defaultValue: { x: 0, y: 0 }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  currentMapId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'characters',
  timestamps: true
});

// 관계 설정
Character.belongsTo(User, { as: 'owner', foreignKey: 'userId' });
User.hasMany(Character, { as: 'characters', foreignKey: 'userId' });

module.exports = Character; 