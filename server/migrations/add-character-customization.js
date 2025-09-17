const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Adding customization column...');
      // customization 컬럼 추가
      await queryInterface.addColumn('characters', 'customization', {
        type: DataTypes.JSON,
        defaultValue: {
          gender: 'male',
          skinTone: 'light',
          hair: {
            style: 'short_messy',
            color: '#8B4513'
          },
          face: {
            eyes: 'normal',
            eyeColor: '#4B4B4D',
            nose: 'normal',
            mouth: 'smile'
          },
          clothing: {
            hat: null,
            top: 'basic_shirt',
            bottom: 'basic_pants',
            shoes: 'sneakers',
            accessories: []
          },
          equipment: {
            weapon: null,
            shield: null,
            gloves: null,
            belt: null
          }
        }
      });

      console.log('🔄 Adding imageGeneratedAt column...');
      // imageGeneratedAt 컬럼 추가
      await queryInterface.addColumn('characters', 'imageGeneratedAt', {
        type: DataTypes.DATE,
        allowNull: true
      });

      console.log('🔄 Adding isDefault column...');
      // isDefault 컬럼 추가
      await queryInterface.addColumn('characters', 'isDefault', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });

      console.log('🔄 Adding characterType column...');
      // characterType 컬럼을 VARCHAR로 추가
      await queryInterface.addColumn('characters', 'characterType', {
        type: DataTypes.STRING(20),
        defaultValue: 'custom'
      });

      console.log('🔄 Updating size column default...');
      // size 기본값을 64로 변경
      await queryInterface.changeColumn('characters', 'size', {
        type: DataTypes.INTEGER,
        defaultValue: 64
      });

      console.log('✅ Character customization migration completed successfully');
    } catch (error) {
      console.error('❌ Character customization migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // 컬럼 제거
      await queryInterface.removeColumn('characters', 'customization');
      await queryInterface.removeColumn('characters', 'imageGeneratedAt');
      await queryInterface.removeColumn('characters', 'isDefault');
      await queryInterface.removeColumn('characters', 'characterType');

      // size 기본값을 원래대로 복원
      await queryInterface.changeColumn('characters', 'size', {
        type: DataTypes.INTEGER,
        defaultValue: 32
      });

      console.log('✅ Character customization migration rollback completed');
    } catch (error) {
      console.error('❌ Character customization migration rollback failed:', error);
      throw error;
    }
  }
};