import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import paymentConfigService from '../services/paymentConfigService';
import './MultiPayment.css';

const MultiPayment = ({ amount, onSuccess, onError, onCancel, shopOwnerId, roomData }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState({
    customerName: '',
    customerEmail: '',
    orderId: `order_${shopOwnerId}_${Date.now()}`,
    orderName: '상품 구매'
  });
  const [shopOwnerInfo, setShopOwnerInfo] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [userRegion, setUserRegion] = useState('KR');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    initializePayment();
  }, [shopOwnerId, amount]);

  const initializePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // 쇼핑몰 소유자 정보 설정
      if (roomData) {
        const ownerName = roomData.createdBy || roomData.creator?.username || '쇼핑몰 운영자';
        setShopOwnerInfo({
          id: shopOwnerId,
          name: ownerName,
          roomName: roomData.name || '개인 쇼핑몰'
        });
      }

      // 결제 설정 조회
      const config = paymentConfigService.getUserConfig(shopOwnerId);
      setPaymentConfig(config);

      // 사용자 지역 감지
      const detectedRegion = paymentService.detectUserRegion();
      setUserRegion(detectedRegion);

      // 최적 결제 제공자 선택
      const optimalProvider = await paymentConfigService.getOptimalPaymentProvider(shopOwnerId, detectedRegion);
      setSelectedProvider(optimalProvider);

      console.log('💳 결제 시스템 초기화:', {
        shopOwnerId,
        config,
        detectedRegion,
        optimalProvider,
        환경변수: {
          VITE_TOSS_CLIENT_KEY: import.meta.env.VITE_TOSS_CLIENT_KEY,
          VITE_PORTONE_STORE_ID: import.meta.env.VITE_PORTONE_STORE_ID,
          VITE_PORTONE_CHANNEL_KEY: import.meta.env.VITE_PORTONE_CHANNEL_KEY
        }
      });

    } catch (err) {
      console.error('결제 초기화 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProvider) {
      onError('결제 방법을 선택해주세요.');
      return;
    }

    setProcessing(true);

    try {
      // 결제 데이터 유효성 검증
      const validation = paymentService.validatePaymentData({
        ...paymentData,
        amount
      });

      if (!validation.isValid) {
        throw new Error(validation.errors.join('\n'));
      }

      // 결제 처리
      const result = await paymentService.processPayment(
        {
          ...paymentData,
          amount,
          orderName: `${shopOwnerInfo?.roomName || '쇼핑몰'} 상품 구매`
        },
        shopOwnerId,
        userRegion
      );

      if (result.success) {
        onSuccess({
          ...result,
          orderId: paymentData.orderId,
          provider: result.provider,
          amount
        });
      } else {
        throw new Error(result.error || '결제 처리 중 오류가 발생했습니다.');
      }

    } catch (err) {
      console.error('결제 처리 실패:', err);
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="multi-payment-loading">결제 시스템 로딩 중...</div>;
  }

  if (error) {
    return (
      <div className="multi-payment-error">
        <h3>결제 시스템 오류</h3>
        <p>{error}</p>
        <button onClick={onCancel} className="cancel-button">
          닫기
        </button>
      </div>
    );
  }

  const canUseToss = paymentConfig?.tossPayments?.isActive;
  const canUsePortOne = paymentConfig?.portOne?.isActive;

  if (!canUseToss && !canUsePortOne) {
    return (
      <div className="payment-not-configured">
        <h3>결제 시스템 미설정</h3>
        <p>이 쇼핑몰은 아직 결제 시스템이 설정되지 않았습니다.</p>
        <button onClick={onCancel} className="cancel-button">
          닫기
        </button>
      </div>
    );
  }

  return (
    <div className="multi-payment-form">
      <h3>결제 정보</h3>
      
      {/* 쇼핑몰 정보 */}
      {shopOwnerInfo && (
        <div className="shop-info">
          <div className="shop-owner">
            <strong>🏪 {shopOwnerInfo.roomName}</strong>
          </div>
          <div className="shop-detail">
            운영자: {shopOwnerInfo.name}
          </div>
        </div>
      )}

      {/* 결제 제공자 선택 */}
      <div className="provider-selection">
        <h4>결제 방법 선택</h4>
        <div className="provider-options">
          {canUseToss && (
            <button
              type="button"
              className={`provider-option ${selectedProvider === 'toss' ? 'selected' : ''}`}
              onClick={() => handleProviderSelect('toss')}
            >
              <div className="provider-logo">💳</div>
              <div className="provider-info">
                <div className="provider-name">토스페이먼츠</div>
                <div className="provider-desc">국내 최적화 • 간편결제</div>
                {userRegion === 'KR' && <div className="recommended">🌟 추천</div>}
              </div>
            </button>
          )}
          
          {canUsePortOne && (
            <button
              type="button"
              className={`provider-option ${selectedProvider === 'portone' ? 'selected' : ''}`}
              onClick={() => handleProviderSelect('portone')}
            >
              <div className="provider-logo">🌍</div>
              <div className="provider-info">
                <div className="provider-name">PortOne</div>
                <div className="provider-desc">글로벌 지원 • 다양한 결제수단</div>
                {userRegion !== 'KR' && <div className="recommended">🌟 추천</div>}
              </div>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 고객 정보 */}
        <div className="customer-info">
          <div className="form-group">
            <label htmlFor="customerName">이름 *</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={paymentData.customerName}
              onChange={handleInputChange}
              required
              placeholder="홍길동"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="customerEmail">이메일</label>
            <input
              type="email"
              id="customerEmail"
              name="customerEmail"
              value={paymentData.customerEmail}
              onChange={handleInputChange}
              placeholder="hong@example.com"
            />
          </div>
        </div>

        {/* 결제 요약 */}
        <div className="payment-summary">
          <div className="amount">
            <span>결제 금액: </span>
            <strong>{amount.toLocaleString()}원</strong>
          </div>
          {selectedProvider && (
            <div className="selected-method">
              결제 방법: {selectedProvider === 'toss' ? '토스페이먼츠' : 'PortOne'}
            </div>
          )}
        </div>

        {/* 지역별 안내 */}
        <div className="region-notice">
          {userRegion === 'KR' ? (
            <div className="notice-domestic">
              🇰🇷 국내 고객으로 인식되어 토스페이먼츠를 추천합니다.
            </div>
          ) : (
            <div className="notice-international">
              🌍 해외 고객으로 인식되어 PortOne을 추천합니다.
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="button-group">
          <button 
            type="button" 
            onClick={onCancel}
            className="cancel-button"
            disabled={processing}
          >
            취소
          </button>
          
          <button
            type="submit"
            disabled={processing || !selectedProvider}
            className="pay-button"
          >
            {processing ? '결제 처리 중...' : `${amount.toLocaleString()}원 결제하기`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MultiPayment;