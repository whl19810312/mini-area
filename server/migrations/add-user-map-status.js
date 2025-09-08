const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('users', 'currentMapId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
      });
      console.log('✅ currentMapId 컬럼 추가 완료');
    } catch (error) {
      if (error.parent?.code === '42701') {
        console.log('ℹ️ currentMapId 컬럼이 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    try {
      await queryInterface.addColumn('users', 'lastPosition', {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null
      });
      console.log('✅ lastPosition 컬럼 추가 완료');
    } catch (error) {
      if (error.parent?.code === '42701') {
        console.log('ℹ️ lastPosition 컬럼이 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    try {
      await queryInterface.addColumn('users', 'lastDirection', {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: 'down'
      });
      console.log('✅ lastDirection 컬럼 추가 완료');
    } catch (error) {
      if (error.parent?.code === '42701') {
        console.log('ℹ️ lastDirection 컬럼이 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    try {
      await queryInterface.addColumn('users', 'lastActivity', {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      });
      console.log('✅ lastActivity 컬럼 추가 완료');
    } catch (error) {
      if (error.parent?.code === '42701') {
        console.log('ℹ️ lastActivity 컬럼이 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    console.log('✅ 사용자 입실 상태 필드 추가 완료');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'currentMapId');
    await queryInterface.removeColumn('users', 'lastPosition');
    await queryInterface.removeColumn('users', 'lastDirection');
    await queryInterface.removeColumn('users', 'lastActivity');

    console.log('✅ 사용자 입실 상태 필드 제거 완료');
  }
};
