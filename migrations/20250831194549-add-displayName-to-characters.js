'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // displayName 컬럼 추가
    await queryInterface.addColumn('characters', 'displayName', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
      validate: {
        len: [2, 20]
      },
      comment: '캐릭터 위에 표시되는 고유 이름'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // displayName 컬럼 제거
    await queryInterface.removeColumn('characters', 'displayName');
  }
};