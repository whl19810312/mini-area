const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Map = sequelize.define('Map', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  creatorInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '방 생성자의 사용자 정보 (username, id 등)'
  },
  creatorMapIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '해당 생성자가 만든 몇 번째 맵인지 (1부터 시작)'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  publicLink: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  backgroundLayer: {
    type: DataTypes.JSON,
    allowNull: true
  },
  walls: {
    type: DataTypes.JSON,
    allowNull: true
  },
  privateAreas: {
    type: DataTypes.JSON,
    allowNull: true
  },
  spawnPoints: {
    type: DataTypes.JSON,
    allowNull: true
  },
  foregroundLayer: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '전경 오브젝트 레이어 (시작점 위에 렌더링)'
  },
  currentUsers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'maps',
  timestamps: true
});

// 관계 설정
Map.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });
User.hasMany(Map, { as: 'maps', foreignKey: 'creatorId' });

module.exports = Map; 