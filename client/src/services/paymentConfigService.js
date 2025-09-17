// 멀티 결제 시스템 설정 관리 서비스 (토스페이먼츠 + PortOne)
class PaymentConfigService {
  constructor() {
    this.configs = new Map(); // userId -> paymentConfig
    this.loadConfigs();
  }

  // 로컬 스토리지에서 설정 로드
  loadConfigs() {
    try {
      const savedConfigs = localStorage.getItem('payment_user_configs');
      if (savedConfigs) {
        const parsed = JSON.parse(savedConfigs);
        this.configs = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('결제 설정 로드 실패:', error);
    }
  }

  // 로컬 스토리지에 설정 저장
  saveConfigs() {
    try {
      const configObj = Object.fromEntries(this.configs);
      localStorage.setItem('payment_user_configs', JSON.stringify(configObj));
    } catch (error) {
      console.error('결제 설정 저장 실패:', error);
    }
  }

  // 사용자별 결제 설정 저장
  setUserConfig(userId, config) {
    const userConfig = {
      // 토스페이먼츠 설정
      tossPayments: {
        clientKey: config.tossPayments?.clientKey || '',
        secretKey: config.tossPayments?.secretKey || '',
        isActive: config.tossPayments?.isActive || false
      },
      // PortOne 설정
      portOne: {
        storeId: config.portOne?.storeId || '',
        channelKey: config.portOne?.channelKey || '',
        isActive: config.portOne?.isActive || false
      },
      // 기본 설정
      preferredProvider: config.preferredProvider || 'toss', // 'toss' | 'portone'
      autoSelectByRegion: config.autoSelectByRegion || true, // 지역별 자동 선택
      createdAt: config.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.configs.set(userId, userConfig);
    this.saveConfigs();
    
    console.log(`✅ 사용자 ${userId}의 결제 설정 저장됨:`, userConfig);
  }

  // 사용자별 결제 설정 조회
  getUserConfig(userId) {
    const config = this.configs.get(userId);
    if (!config) {
      // 환경 변수 확인
      const hasTossKey = !!import.meta.env.VITE_TOSS_CLIENT_KEY;
      const hasPortOneKeys = !!(import.meta.env.VITE_PORTONE_STORE_ID && import.meta.env.VITE_PORTONE_CHANNEL_KEY);
      
      // 기본 설정 반환 (개발/테스트용)
      return {
        tossPayments: {
          clientKey: import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_default',
          secretKey: '',
          isActive: hasTossKey // 환경 변수가 있으면 자동 활성화
        },
        portOne: {
          storeId: import.meta.env.VITE_PORTONE_STORE_ID || 'store_default',
          channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY || 'channel_default',
          isActive: hasPortOneKeys // 환경 변수가 있으면 자동 활성화
        },
        preferredProvider: 'toss',
        autoSelectByRegion: true,
        isDefault: true
      };
    }
    return { ...config, isDefault: false };
  }

  // 방 소유자별 결제 설정 조회
  getRoomOwnerConfig(roomData) {
    const ownerId = roomData?.creatorId || roomData?.creator?.id || roomData?.userId;
    if (!ownerId) {
      console.warn('방 소유자 정보를 찾을 수 없습니다:', roomData);
      return this.getDefaultConfig();
    }

    const config = this.getUserConfig(ownerId);
    console.log(`🏠 방 소유자 ${ownerId}의 결제 설정:`, {
      hasTossConfig: config.tossPayments?.isActive,
      hasPortOneConfig: config.portOne?.isActive,
      preferredProvider: config.preferredProvider,
      roomData
    });

    return config;
  }

  // 기본 설정 반환
  getDefaultConfig() {
    return {
      tossPayments: {
        clientKey: import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_default',
        secretKey: '',
        isActive: false
      },
      portOne: {
        storeId: import.meta.env.VITE_PORTONE_STORE_ID || 'store_default',
        channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY || 'channel_default',
        isActive: false
      },
      preferredProvider: 'toss',
      autoSelectByRegion: true,
      isDefault: true
    };
  }

  // 지역 기반 결제 제공자 선택
  getPaymentProviderByRegion(userRegion = 'KR') {
    // 한국인 경우 토스페이먼츠, 해외인 경우 PortOne
    return userRegion === 'KR' ? 'toss' : 'portone';
  }

  // 사용자 위치 기반 최적 결제 제공자 선택
  async getOptimalPaymentProvider(userId, userRegion = null) {
    const config = this.getUserConfig(userId);
    
    // 자동 선택이 비활성화된 경우 선호 제공자 사용
    if (!config.autoSelectByRegion) {
      return config.preferredProvider;
    }

    // 사용자 지역 정보가 없으면 브라우저 언어로 추정
    if (!userRegion) {
      userRegion = this.detectUserRegion();
    }

    const suggestedProvider = this.getPaymentProviderByRegion(userRegion);
    
    // 제안된 제공자가 활성화되어 있는지 확인
    if (suggestedProvider === 'toss' && config.tossPayments?.isActive) {
      return 'toss';
    } else if (suggestedProvider === 'portone' && config.portOne?.isActive) {
      return 'portone';
    }

    // 제안된 제공자가 비활성화된 경우 활성화된 다른 제공자 찾기
    if (config.tossPayments?.isActive) return 'toss';
    if (config.portOne?.isActive) return 'portone';

    return config.preferredProvider;
  }

  // 사용자 지역 감지
  detectUserRegion() {
    // 브라우저 언어 설정으로 지역 추정
    const language = navigator.language || navigator.userLanguage || 'en-US';
    
    if (language.startsWith('ko')) return 'KR';
    if (language.startsWith('ja')) return 'JP';
    if (language.startsWith('zh')) return 'CN';
    
    return 'INTL'; // 기타 해외
  }

  // 결제 가능 여부 확인
  canProcessPayments(userId, provider = null) {
    const config = this.getUserConfig(userId);
    
    if (provider === 'toss') {
      return config.tossPayments?.isActive && 
             config.tossPayments?.clientKey && 
             config.tossPayments?.clientKey !== 'test_ck_default';
    } else if (provider === 'portone') {
      return config.portOne?.isActive && 
             config.portOne?.storeId && 
             config.portOne?.storeId !== 'store_default';
    }

    // 특정 제공자가 지정되지 않은 경우 하나라도 활성화되어 있으면 true
    return this.canProcessPayments(userId, 'toss') || 
           this.canProcessPayments(userId, 'portone');
  }

  // 설정 유효성 검사
  validateConfig(config) {
    const errors = [];

    // 토스페이먼츠 설정 검사
    if (config.tossPayments?.isActive) {
      if (!config.tossPayments.clientKey) {
        errors.push('토스페이먼츠 클라이언트 키가 필요합니다.');
      } else if (!config.tossPayments.clientKey.startsWith('test_ck_') && 
                 !config.tossPayments.clientKey.startsWith('live_ck_')) {
        errors.push('올바른 토스페이먼츠 클라이언트 키 형식이 아닙니다.');
      }
    }

    // PortOne 설정 검사
    if (config.portOne?.isActive) {
      if (!config.portOne.storeId) {
        errors.push('PortOne 스토어 ID가 필요합니다.');
      }
      if (!config.portOne.channelKey) {
        errors.push('PortOne 채널 키가 필요합니다.');
      }
    }

    // 최소 하나의 결제 제공자는 활성화되어야 함
    if (!config.tossPayments?.isActive && !config.portOne?.isActive) {
      errors.push('최소 하나의 결제 제공자를 활성화해야 합니다.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 테스트용 설정 생성
  createTestConfig(userId) {
    const testConfig = {
      tossPayments: {
        clientKey: 'test_ck_' + Math.random().toString(36).substr(2, 50),
        secretKey: 'test_sk_' + Math.random().toString(36).substr(2, 50),
        isActive: true
      },
      portOne: {
        storeId: 'store_' + Math.random().toString(36).substr(2, 16),
        channelKey: 'channel_' + Math.random().toString(36).substr(2, 32),
        isActive: true
      },
      preferredProvider: 'toss',
      autoSelectByRegion: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.setUserConfig(userId, testConfig);
    return testConfig;
  }

  // 설정 통계
  getConfigStats() {
    const allConfigs = Array.from(this.configs.values());
    return {
      totalUsers: this.configs.size,
      tossActiveUsers: allConfigs.filter(c => c.tossPayments?.isActive).length,
      portOneActiveUsers: allConfigs.filter(c => c.portOne?.isActive).length,
      bothActiveUsers: allConfigs.filter(c => c.tossPayments?.isActive && c.portOne?.isActive).length,
      configuredUsers: allConfigs.length
    };
  }

  // 사용자 설정 삭제
  removeUserConfig(userId) {
    this.configs.delete(userId);
    this.saveConfigs();
  }

  // 모든 설정 조회 (관리자용)
  getAllConfigs() {
    return Object.fromEntries(this.configs);
  }
}

// 싱글톤 인스턴스 생성
const paymentConfigService = new PaymentConfigService();

export default paymentConfigService;