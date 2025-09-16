const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // creatorMapIndex 컬럼 추가
    await queryInterface.addColumn('maps', 'creatorMapIndex', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '해당 생성자가 만든 몇 번째 맵인지 (1부터 시작)'
    });

    // 기존 맵들에 대해 creatorMapIndex 값 설정
    const maps = await queryInterface.sequelize.query(
      'SELECT id, "creatorId", "createdAt" FROM maps ORDER BY "creatorId", "createdAt"',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 생성자별로 그룹화하고 순서 설정
    const creatorGroups = {};
    maps.forEach(map => {
      if (!creatorGroups[map.creatorId]) {
        creatorGroups[map.creatorId] = [];
      }
      creatorGroups[map.creatorId].push(map);
    });

    // 각 생성자의 맵들에 순서 설정
    for (const creatorId in creatorGroups) {
      const creatorMaps = creatorGroups[creatorId];
      for (let i = 0; i < creatorMaps.length; i++) {
        await queryInterface.sequelize.query(
          'UPDATE maps SET "creatorMapIndex" = :index WHERE id = :id',
          {
            replacements: { index: i + 1, id: creatorMaps[i].id },
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('maps', 'creatorMapIndex');
  }
};