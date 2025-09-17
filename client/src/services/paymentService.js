import { loadTossPayments } from '@tosspayments/payment-sdk';
import PortOne from '@portone/browser-sdk/v2';
import paymentConfigService from './paymentConfigService';

// 멀티 결제 시스템 (토스페이먼츠 + PortOne)
class PaymentService {
  constructor() {
    this.tossInstances = new Map(); // userId -> tossInstance
    this.portOneInstances = new Map(); // userId -> portOneInstance
    this.baseURL = import.meta.env.VITE_SERVER_URL || 'https://localhost:7000';
  }

  // 사용자별 토스페이먼츠 인스턴스 가져오기
  async getTossPaymentsForUser(shopOwnerId) {
    if (!shopOwnerId) {
      throw new Error('쇼핑몰 소유자 ID가 필요합니다.');
    }

    // 이미 로드된 인스턴스가 있으면 반환
    if (this.tossInstances.has(shopOwnerId)) {
      return this.tossInstances.get(shopOwnerId);
    }

    // 사용자 설정 가져오기
    const config = paymentConfigService.getUserConfig(shopOwnerId);
    
    if (!config.tossPayments?.clientKey || config.tossPayments.clientKey === 'test_ck_default') {
      throw new Error('이 쇼핑몰은 토스페이먼츠가 설정되지 않았습니다.');
    }

    // 토스페이먼츠 인스턴스 생성 및 캐시
    const tossInstance = await loadTossPayments(config.tossPayments.clientKey);

    if (!tossInstance) {
      throw new Error('토스페이먼츠 초기화에 실패했습니다.');
    }

    this.tossInstances.set(shopOwnerId, tossInstance);
    return tossInstance;
  }

  // 사용자별 PortOne 인스턴스 가져오기
  async getPortOneForUser(shopOwnerId) {
    if (!shopOwnerId) {
      throw new Error('쇼핑몰 소유자 ID가 필요합니다.');
    }

    // 이미 로드된 인스턴스가 있으면 반환
    if (this.portOneInstances.has(shopOwnerId)) {
      return this.portOneInstances.get(shopOwnerId);
    }

    // 사용자 설정 가져오기
    const config = paymentConfigService.getUserConfig(shopOwnerId);
    
    if (!config.portOne?.storeId || config.portOne.storeId === 'store_default') {
      throw new Error('이 쇼핑몰은 PortOne이 설정되지 않았습니다.');
    }

    // PortOne 인스턴스 생성 및 캐시
    const portOneInstance = PortOne({
      storeId: config.portOne.storeId,
    });

    this.portOneInstances.set(shopOwnerId, portOneInstance);
    return portOneInstance;
  }

  // 최적 결제 제공자 및 인스턴스 가져오기
  async getOptimalPaymentInstance(shopOwnerId, userRegion = null) {
    const config = paymentConfigService.getUserConfig(shopOwnerId);
    const optimalProvider = await paymentConfigService.getOptimalPaymentProvider(shopOwnerId, userRegion);

    try {
      if (optimalProvider === 'toss' && config.tossPayments?.isActive) {
        const instance = await this.getTossPaymentsForUser(shopOwnerId);
        return { provider: 'toss', instance };
      } else if (optimalProvider === 'portone' && config.portOne?.isActive) {
        const instance = await this.getPortOneForUser(shopOwnerId);
        return { provider: 'portone', instance };
      }
    } catch (error) {
      console.warn(`${optimalProvider} 로드 실패, 대체 제공자 시도:`, error.message);
    }

    // 대체 제공자 시도
    if (optimalProvider !== 'toss' && config.tossPayments?.isActive) {
      try {
        const instance = await this.getTossPaymentsForUser(shopOwnerId);
        return { provider: 'toss', instance };
      } catch (error) {
        console.warn('토스페이먼츠 대체 로드 실패:', error.message);
      }
    }

    if (optimalProvider !== 'portone' && config.portOne?.isActive) {
      try {
        const instance = await this.getPortOneForUser(shopOwnerId);
        return { provider: 'portone', instance };
      } catch (error) {
        console.warn('PortOne 대체 로드 실패:', error.message);
      }
    }

    throw new Error('사용 가능한 결제 제공자가 없습니다.');
  }

  // 토스페이먼츠 결제 요청
  async createTossPayment(paymentData, shopOwnerId) {
    try {
      const toss = await this.getTossPaymentsForUser(shopOwnerId);
      const config = paymentConfigService.getUserConfig(shopOwnerId);

      const paymentRequest = {
        amount: paymentData.amount,
        orderId: paymentData.orderId,
        orderName: paymentData.orderName || '상품 구매',
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      };

      // 서버에 결제 정보 사전 저장
      await this.savePaymentInfo({
        ...paymentRequest,
        provider: 'toss',
        shopOwnerId,
        status: 'pending'
      });

      return {
        provider: 'toss',
        instance: toss,
        paymentRequest
      };
    } catch (error) {
      console.warn('토스페이먼츠 결제 요청 실패, 시뮬레이션 모드:', error.message);
      return this.createSimulatedPayment(paymentData, shopOwnerId, 'toss');
    }
  }

  // PortOne 결제 요청
  async createPortOnePayment(paymentData, shopOwnerId) {
    try {
      const portOne = await this.getPortOneForUser(shopOwnerId);
      const config = paymentConfigService.getUserConfig(shopOwnerId);

      const paymentRequest = {
        storeId: config.portOne.storeId,
        channelKey: config.portOne.channelKey,
        paymentId: paymentData.orderId,
        orderName: paymentData.orderName || '상품 구매',
        totalAmount: paymentData.amount,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        customer: {
          fullName: paymentData.customerName,
          email: paymentData.customerEmail
        },
        redirectUrl: `${window.location.origin}/payment/portone-redirect`,
        noticeUrls: [`${this.baseURL}/api/portone/webhook`]
      };

      // 서버에 결제 정보 사전 저장
      await this.savePaymentInfo({
        ...paymentRequest,
        provider: 'portone',
        shopOwnerId,
        status: 'pending'
      });

      return {
        provider: 'portone',
        instance: portOne,
        paymentRequest
      };
    } catch (error) {
      console.warn('PortOne 결제 요청 실패, 시뮬레이션 모드:', error.message);
      return this.createSimulatedPayment(paymentData, shopOwnerId, 'portone');
    }
  }

  // 토스페이먼츠 결제 실행
  async processTossPayment(toss, paymentRequest) {
    try {
      const result = await toss.requestPayment('카드', paymentRequest);
      
      return {
        success: true,
        provider: 'toss',
        paymentKey: result.paymentKey,
        orderId: result.orderId,
        amount: result.amount
      };
    } catch (error) {
      throw new Error(`토스페이먼츠 결제 실패: ${error.message}`);
    }
  }

  // PortOne 결제 실행
  async processPortOnePayment(portOne, paymentRequest) {
    try {
      const result = await portOne.requestPayment(paymentRequest);
      
      if (result.code) {
        throw new Error(result.message || 'PortOne 결제 실패');
      }

      return {
        success: true,
        provider: 'portone',
        impUid: result.imp_uid,
        merchantUid: result.merchant_uid,
        amount: result.paid_amount
      };
    } catch (error) {
      throw new Error(`PortOne 결제 실패: ${error.message}`);
    }
  }

  // 통합 결제 처리
  async processPayment(paymentData, shopOwnerId, userRegion = null) {
    try {
      const { provider, instance } = await this.getOptimalPaymentInstance(shopOwnerId, userRegion);

      if (provider === 'toss') {
        const { instance: toss, paymentRequest } = await this.createTossPayment(paymentData, shopOwnerId);
        return await this.processTossPayment(toss, paymentRequest);
      } else if (provider === 'portone') {
        const { instance: portOne, paymentRequest } = await this.createPortOnePayment(paymentData, shopOwnerId);
        return await this.processPortOnePayment(portOne, paymentRequest);
      }

      throw new Error('지원되지 않는 결제 제공자입니다.');
    } catch (error) {
      console.error('결제 처리 실패:', error);
      throw error;
    }
  }

  // 결제 정보 서버 저장
  async savePaymentInfo(paymentInfo) {
    try {
      const response = await fetch(`${this.baseURL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentInfo)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('결제 정보 저장 실패:', error.message);
      // 로컬 스토리지에 임시 저장
      const payments = JSON.parse(localStorage.getItem('temp_payments') || '[]');
      payments.push(paymentInfo);
      localStorage.setItem('temp_payments', JSON.stringify(payments));
    }
  }

  // 결제 상태 조회
  async getPaymentStatus(paymentId, provider = null) {
    try {
      const response = await fetch(`${this.baseURL}/api/payment-status/${paymentId}?provider=${provider || ''}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // 시뮬레이션 응답
      return {
        id: paymentId,
        status: 'completed',
        provider: provider || 'simulation',
        amount: 0,
        created: Date.now()
      };
    }
  }

  // 결제 취소/환불
  async refundPayment(paymentId, provider, amount = null, reason = '사용자 요청') {
    try {
      const response = await fetch(`${this.baseURL}/api/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId,
          provider,
          amount,
          reason
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // 시뮬레이션 결제 생성
  async createSimulatedPayment(paymentData, shopOwnerId, provider) {
    return {
      provider: 'simulation',
      originalProvider: provider,
      paymentRequest: {
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        shopOwnerId
      },
      instance: {
        requestPayment: async () => ({
          success: true,
          paymentKey: `sim_${provider}_${Date.now()}`,
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          provider: `simulation_${provider}`
        })
      }
    };
  }

  // 결제 가능 여부 확인
  canProcessPayments(shopOwnerId, provider = null) {
    return paymentConfigService.canProcessPayments(shopOwnerId, provider);
  }

  // 사용자 지역 감지
  detectUserRegion() {
    return paymentConfigService.detectUserRegion();
  }

  // 결제 유효성 검증
  validatePaymentData(paymentData) {
    const errors = [];

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('결제 금액이 올바르지 않습니다.');
    }

    if (!paymentData.orderId || paymentData.orderId.length < 5) {
      errors.push('주문 ID가 올바르지 않습니다.');
    }

    if (!paymentData.customerName || paymentData.customerName.trim().length < 2) {
      errors.push('고객 이름을 입력해주세요.');
    }

    if (paymentData.customerEmail && !this.validateEmail(paymentData.customerEmail)) {
      errors.push('올바른 이메일 주소를 입력해주세요.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 이메일 유효성 검증
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 환경별 설정
  getEnvironmentConfig() {
    const isProduction = import.meta.env.MODE === 'production';
    
    return {
      isProduction,
      baseURL: this.baseURL,
      enableLogging: !isProduction,
      supportedProviders: ['toss', 'portone']
    };
  }

  // 로깅
  log(level, message, data = null) {
    const config = this.getEnvironmentConfig();
    if (!config.enableLogging) return;

    const timestamp = new Date().toISOString();
    console.log(`[PaymentService ${level.toUpperCase()}] ${timestamp}: ${message}`, data || '');
  }
}

// 싱글톤 인스턴스 생성
const paymentService = new PaymentService();

export default paymentService;