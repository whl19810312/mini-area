const { Sequelize } = require('sequelize');
const { getConfig } = require('./serverConfig');

class DatabaseManager {
  constructor() {
    this.sequelize = null;
    this.models = {};
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
    
    this.initialize();
  }

  // 데이터베이스 초기화
  initialize() {
    const config = getConfig();
    
    // Sequelize 인스턴스 생성
    this.sequelize = new Sequelize(
      process.env.DB_NAME || 'mini_area',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'password',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: config.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        }
      }
    );
    
    // 모델 로드
    this.loadModels();
    
    // 연결 테스트
    this.testConnection();
  }

  // 모델 로드
  loadModels() {
    try {
      // User 모델
      this.models.User = require('../models/User');
      
      // Map 모델
      this.models.Map = require('../models/Map');
      
      // Character 모델
      this.models.Character = require('../models/Character');
      
      // 모델 간 관계 설정
      this.setupAssociations();
      
      console.log('✅ 데이터베이스 모델 로드 완료');
    } catch (error) {
      console.error('❌ 데이터베이스 모델 로드 실패:', error);
      throw error;
    }
  }

  // 모델 간 관계 설정 (모델 파일에서 이미 설정됨)
  setupAssociations() {
    // 관계는 각 모델 파일에서 이미 설정되어 있음
    console.log('✅ 모델 관계 설정 완료 (모델 파일에서 설정됨)');
  }

  // 연결 테스트
  async testConnection() {
    try {
      await this.sequelize.authenticate();
      this.isConnected = true;
      this.connectionRetries = 0;
      console.log('✅ PostgreSQL 데이터베이스 연결 성공');
      
      // 데이터베이스 동기화
      await this.syncDatabase();
    } catch (error) {
      this.isConnected = false;
      console.error('❌ PostgreSQL 연결 실패:', error.message);
      
      // 재연결 시도
      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        console.log(`재연결 시도 ${this.connectionRetries}/${this.maxRetries}...`);
        setTimeout(() => this.testConnection(), 5000);
      } else {
        console.error('최대 재연결 시도 횟수 초과');
        throw error;
      }
    }
  }

  // 데이터베이스 동기화
  async syncDatabase() {
    try {
      const config = getConfig();
      const syncOptions = {
        alter: config.NODE_ENV === 'development',
        force: false
      };
      
      await this.sequelize.sync(syncOptions);
      console.log('✅ 데이터베이스 테이블 동기화 완료');
    } catch (error) {
      console.error('❌ 데이터베이스 동기화 실패:', error);
      throw error;
    }
  }

  // 트랜잭션 시작
  async beginTransaction() {
    return await this.sequelize.transaction();
  }

  // 트랜잭션 커밋
  async commitTransaction(transaction) {
    await transaction.commit();
  }

  // 트랜잭션 롤백
  async rollbackTransaction(transaction) {
    await transaction.rollback();
  }

  // 모델 가져오기
  getModel(name) {
    return this.models[name];
  }

  // 모든 모델 가져오기
  getAllModels() {
    return this.models;
  }

  // Sequelize 인스턴스 가져오기
  getSequelize() {
    return this.sequelize;
  }

  // 연결 상태 확인
  isDatabaseConnected() {
    return this.isConnected;
  }

  // 데이터베이스 통계 가져오기
  async getDatabaseStats() {
    try {
      const stats = {};
      
      // 각 모델의 레코드 수 가져오기
      for (const [modelName, model] of Object.entries(this.models)) {
        stats[modelName] = await model.count();
      }
      
      // 데이터베이스 크기 정보
      const [results] = await this.sequelize.query(`
        SELECT 
          pg_database_size(current_database()) as database_size,
          pg_size_pretty(pg_database_size(current_database())) as database_size_pretty
      `);
      
      stats.databaseSize = results[0];
      
      return stats;
    } catch (error) {
      console.error('데이터베이스 통계 가져오기 실패:', error);
      return null;
    }
  }

  // 데이터베이스 백업 (개발용)
  async backupDatabase() {
    try {
      const { exec } = require('child_process');
      const config = getConfig();
      
      if (config.NODE_ENV === 'production') {
        console.warn('프로덕션 환경에서는 백업을 수행하지 않습니다.');
        return;
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `./backups/backup-${timestamp}.sql`;
      
      const command = `pg_dump -h ${process.env.DB_HOST || 'localhost'} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'mini_area'} > ${backupPath}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('백업 실패:', error);
        } else {
          console.log(`✅ 데이터베이스 백업 완료: ${backupPath}`);
        }
      });
    } catch (error) {
      console.error('백업 준비 실패:', error);
    }
  }

  // 데이터베이스 연결 종료
  async closeConnection() {
    try {
      if (this.sequelize) {
        await this.sequelize.close();
        this.isConnected = false;
        console.log('✅ 데이터베이스 연결 종료');
      }
    } catch (error) {
      console.error('❌ 데이터베이스 연결 종료 실패:', error);
    }
  }

  // 연결 상태 모니터링
  startHealthCheck() {
    setInterval(async () => {
      try {
        await this.sequelize.authenticate();
        if (!this.isConnected) {
          this.isConnected = true;
          console.log('✅ 데이터베이스 연결 복구됨');
        }
      } catch (error) {
        if (this.isConnected) {
          this.isConnected = false;
          console.error('❌ 데이터베이스 연결 끊어짐:', error.message);
        }
      }
    }, 30000); // 30초마다 체크
  }
}

module.exports = DatabaseManager;

