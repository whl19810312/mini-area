// PostgreSQL 데이터베이스 설정 파일
// 모든 환경에서 일관성 있는 데이터베이스 설정을 제공

const config = {
  // 기본 데이터베이스 설정
  default: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'metaverse',
    
    // 연결 풀 설정
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    
    // 마이그레이션 설정
    migrations: {
      directory: '../migrations',
      tableName: 'knex_migrations'
    },
    
    // SSL 설정 (프로덕션)
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },

  // 개발 환경
  development: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'metaverse_dev',
    
    pool: {
      min: 2,
      max: 5
    },
    
    migrations: {
      directory: '../migrations',
      tableName: 'knex_migrations'
    }
  },

  // 테스트 환경
  test: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'metaverse_test',
    
    pool: {
      min: 1,
      max: 3
    },
    
    migrations: {
      directory: '../migrations',
      tableName: 'knex_migrations'
    }
  },

  // 프로덕션 환경
  production: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'metaverse',
    
    pool: {
      min: 5,
      max: 20
    },
    
    migrations: {
      directory: '../migrations',
      tableName: 'knex_migrations'
    },
    
    ssl: { rejectUnauthorized: false }
  }
};

// 현재 환경에 따른 설정 반환
const currentEnv = process.env.NODE_ENV || 'development';
const currentConfig = config[currentEnv] || config.default;

module.exports = {
  ...currentConfig,
  allConfigs: config
};