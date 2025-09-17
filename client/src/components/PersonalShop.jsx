import React, { useState, useEffect } from 'react';
import './PersonalShop.css';
import paymentService from '../services/paymentService';
import MultiPayment from './MultiPayment';
import paymentConfigService from '../services/paymentConfigService';

const PersonalShop = ({ isOpen, onClose, userId, username, currentMap, roomData }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [externalLinks, setExternalLinks] = useState([]);
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [newLink, setNewLink] = useState({ name: '', url: '', description: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    image: '',
    category: 'avatar',
    description: '',
    stock: '',
    tags: []
  });
  const [orders, setOrders] = useState([]);
  const [salesData, setSalesData] = useState({
    todayVisitors: 24,
    totalSales: 156,
    totalRevenue: 2340000,
    monthlyRevenue: 890000
  });

  // 쇼핑몰 정보
  const [shopInfo, setShopInfo] = useState({
    ownerId: null,
    ownerName: '',
    isOwnShop: false,
    canManage: false,
    paymentEnabled: false
  });

  // 메타버스 전용 상품 데이터
  const sampleProducts = [
    {
      id: 1,
      name: '홀로그램 아바타 스킨',
      price: 25000,
      image: '✨',
      category: 'avatar',
      description: '미래적인 홀로그램 효과가 적용된 프리미엄 아바타 스킨',
      stock: 10,
      featured: true,
      tags: ['신상품', 'VIP']
    },
    {
      id: 2,
      name: '메타버스 전용 이모지',
      price: 12000,
      image: '🤖',
      category: 'emoticon',
      description: '메타버스에서만 사용 가능한 특별한 3D 이모지 50개 세트',
      stock: 50,
      tags: ['인기상품']
    },
    {
      id: 3,
      name: '프라이빗 가상 공간',
      price: 45000,
      image: '🏰',
      category: 'space',
      description: '나만의 개인 가상 공간 - 사이버펑크 테마',
      stock: 5,
      featured: true,
      tags: ['한정판', '프리미엄']
    },
    {
      id: 4,
      name: '네온 프로필 테두리',
      price: 18000,
      image: '💫',
      category: 'effect',
      description: '화려한 네온 효과의 프로필 테두리 20종 패키지',
      stock: 30,
      tags: ['화제상품']
    },
    {
      id: 5,
      name: '보이스 모듈레이터',
      price: 22000,
      image: '🎙️',
      category: 'voice',
      description: '음성 변조 효과 - 로봇, 외계인 등 10가지 음성 효과',
      stock: 15,
      featured: true,
      tags: ['신기술']
    },
    {
      id: 6,
      name: '레인보우 채팅 버블',
      price: 15000,
      image: '💬',
      category: 'chat',
      description: '무지개색으로 변하는 동적 채팅 말풍선',
      stock: 100,
      tags: ['베스트셀러']
    },
    {
      id: 7,
      name: '텔레포트 이펙트',
      price: 35000,
      image: '⚡',
      category: 'effect',
      description: '이동 시 번개 효과가 나타나는 특별한 텔레포트 이펙트',
      stock: 8,
      featured: true,
      tags: ['한정판', '특별 효과']
    },
    {
      id: 8,
      name: '가상 펫 컴패니언',
      price: 28000,
      image: '🐉',
      category: 'companion',
      description: '나를 따라다니는 귀여운 드래곤 펫 (AI 상호작용 가능)',
      stock: 20,
      tags: ['AI', '동반자']
    }
  ];

  // 기본 외부 쇼핑몰 링크
  const defaultExternalLinks = [
    {
      id: 1,
      name: '스마트스토어',
      url: 'https://smartstore.naver.com',
      description: '네이버 스마트스토어에서 운영하는 개인 쇼핑몰',
      icon: '🛍️'
    },
    {
      id: 2,
      name: '인스타그램 샵',
      url: 'https://www.instagram.com/shop',
      description: '인스타그램 쇼핑 기능',
      icon: '📸'
    },
    {
      id: 3,
      name: '쿠팡 스토어',
      url: 'https://www.coupang.com',
      description: '쿠팡 파트너스 스토어',
      icon: '📦'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      initializeShopInfo();
      loadShopData();
    }
  }, [isOpen, userId, currentMap, roomData]);

  // 쇼핑몰 정보 초기화
  const initializeShopInfo = () => {
    const mapData = currentMap || roomData;
    const ownerId = mapData?.creatorId || mapData?.creator?.id || mapData?.userId;
    const ownerName = mapData?.createdBy || mapData?.creator?.username || username;
    
    const isOwnShop = ownerId === userId;
    const canManage = isOwnShop || isAdmin;
    const paymentEnabled = paymentConfigService.canProcessPayments(ownerId);

    console.log('🏪 쇼핑몰 정보 초기화:', {
      mapData,
      ownerId,
      ownerName,
      currentUserId: userId,
      isOwnShop,
      canManage,
      paymentEnabled
    });

    setShopInfo({
      ownerId,
      ownerName,
      isOwnShop,
      canManage,
      paymentEnabled
    });
  };

  const loadShopData = async () => {
    setIsLoading(true);
    try {
      // 상품 데이터 로드
      // 쇼핑몰 소유자의 상품 데이터 로드
      const shopOwnerId = shopInfo.ownerId || userId;
      const savedProducts = localStorage.getItem(`products_${shopOwnerId}`);
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      } else {
        setProducts(sampleProducts);
        localStorage.setItem(`products_${shopOwnerId}`, JSON.stringify(sampleProducts));
      }
      
      // 사용자별 장바구니 복원 (구매자의 장바구니)
      const savedCart = localStorage.getItem(`cart_${userId}`);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      
      // 쇼핑몰 소유자의 외부 링크 불러오기
      const savedLinks = localStorage.getItem(`externalLinks_${shopOwnerId}`);
      if (savedLinks) {
        setExternalLinks(JSON.parse(savedLinks));
      } else {
        setExternalLinks(defaultExternalLinks);
        localStorage.setItem(`externalLinks_${shopOwnerId}`, JSON.stringify(defaultExternalLinks));
      }
    } catch (error) {
      console.error('쇼핑몰 데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    let newCart;
    if (existingItem) {
      newCart = cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    setCart(newCart);
    localStorage.setItem(`cart_${userId}`, JSON.stringify(newCart));
    
    // 성공 알림 (토스트 메시지)
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      z-index: 3000;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
      animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = `${product.name}이(가) 장바구니에 추가되었습니다!`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.id !== productId);
    setCart(newCart);
    localStorage.setItem(`cart_${userId}`, JSON.stringify(newCart));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      const newCart = cart.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      );
      setCart(newCart);
      localStorage.setItem(`cart_${userId}`, JSON.stringify(newCart));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handlePurchase = async () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  // 멀티 결제 성공 처리
  const handlePaymentSuccess = (result) => {
    const total = getTotalPrice();
    
    // 구매한 아이템을 "내 아이템"에 추가
    const purchasedItems = localStorage.getItem(`myItems_${userId}`) || '[]';
    const currentItems = JSON.parse(purchasedItems);
    const newItems = cart.map(item => ({
      id: `${Date.now()}_${item.id}`,
      name: item.name,
      category: item.category,
      image: item.image,
      purchaseDate: new Date().toISOString(),
      quantity: item.quantity,
      paymentId: result.paymentKey || result.impUid || result.orderId,
      transactionId: result.paymentKey || result.impUid || result.orderId,
      provider: result.provider
    }));
    localStorage.setItem(`myItems_${userId}`, JSON.stringify([...currentItems, ...newItems]));

    // 주문 기록 추가
    const newOrder = {
      id: result.paymentKey || result.impUid || result.orderId,
      date: new Date().toLocaleDateString(),
      amount: total,
      items: cart.length,
      status: 'completed',
      transactionId: result.paymentKey || result.impUid || result.orderId,
      provider: result.provider,
      processingFee: Math.floor(total * 0.025), // 2.5% 수수료
      netAmount: Math.floor(total * 0.975)
    };
    const currentOrders = JSON.parse(localStorage.getItem(`orders_${userId}`) || '[]');
    localStorage.setItem(`orders_${userId}`, JSON.stringify([...currentOrders, newOrder]));

    // 매출 데이터 업데이트
    setSalesData(prev => ({
      ...prev,
      totalSales: prev.totalSales + cart.length,
      totalRevenue: prev.totalRevenue + total,
      monthlyRevenue: prev.monthlyRevenue + total
    }));
    
    // 장바구니 비우기
    setCart([]);
    localStorage.setItem(`cart_${userId}`, '[]');
    
    // 모달 닫기 및 내 아이템 탭으로 이동
    setShowPaymentModal(false);
    setActiveTab('myitems');
    
    // 성공 알림
    showPaymentSuccessNotification(result);
  };

  // 멀티 결제 에러 처리
  const handlePaymentError = (error) => {
    console.error('결제 실패:', error);
    
    // 에러 알림
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      z-index: 3000;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
      animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = `결제 실패: ${error}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  };

  // 멀티 결제 취소 처리
  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
  };

  // 결제 성공 알림 표시
  const showPaymentSuccessNotification = (result) => {
    const providerName = {
      'toss': '토스페이먼츠',
      'portone': 'PortOne',
      'simulation_toss': '토스페이먼츠 (시뮬레이션)',
      'simulation_portone': 'PortOne (시뮬레이션)'
    }[result.provider] || '결제 시스템';

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 30px 40px;
      border-radius: 20px;
      z-index: 3000;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      animation: bounceIn 0.5s ease-out;
      font-size: 18px;
      max-width: 400px;
    `;
    notification.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
      <div>${providerName} 결제가 완료되었습니다!</div>
      <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">
        결제 ID: ${result.paymentKey || result.impUid || result.orderId}
      </div>
      <div style="font-size: 14px; margin-top: 5px; opacity: 0.9;">
        구매한 아이템은 '내 아이템'에서 확인할 수 있습니다.
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  };

  const processPayment = async () => {
    const total = getTotalPrice();
    
    // 결제 데이터 유효성 검사
    const validation = paymentService.validatePaymentData({
      ...paymentForm,
      amount: total
    });

    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    setPaymentProgress({ step: 'processing', message: '결제를 진행하고 있습니다...', paymentId: null, transactionId: null });
    setIsLoading(true);

    try {
      // 1단계: 결제 요청 생성
      const paymentData = {
        amount: total,
        orderId: `order_${userId}_${Date.now()}`,
        customerName: paymentForm.cardHolder,
        customerEmail: `${userId}@miniarea.com`,
        cardNumber: paymentForm.cardNumber,
        expiryDate: paymentForm.expiryDate,
        cvv: paymentForm.cvv,
        cardHolder: paymentForm.cardHolder
      };

      paymentService.log('info', '결제 요청 시작', paymentData);
      
      const paymentRequest = await paymentService.createPaymentRequest(paymentData);
      
      if (!paymentRequest.success) {
        throw new Error(paymentRequest.message || '결제 요청 생성 실패');
      }

      setPaymentProgress({ 
        step: 'processing', 
        message: '결제 승인을 처리하고 있습니다...', 
        paymentId: paymentRequest.payment_id,
        transactionId: null 
      });

      // 2단계: 결제 승인 처리
      const confirmationData = {
        amount: total,
        order_items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const paymentResult = await paymentService.processPayment(paymentRequest.payment_id, confirmationData);

      if (!paymentResult.success) {
        throw new Error(paymentResult.message || '결제 처리 실패');
      }

      // 3단계: 결제 성공 처리
      paymentService.log('info', '결제 완료', paymentResult);

      setPaymentProgress({ 
        step: 'success', 
        message: '결제가 성공적으로 완료되었습니다!', 
        paymentId: paymentResult.payment_id,
        transactionId: paymentResult.transaction_id 
      });

      // 구매한 아이템을 "내 아이템"에 추가
      await handlePurchaseSuccess(paymentResult);

    } catch (error) {
      paymentService.log('error', '결제 실패', error.message);
      
      setPaymentProgress({ 
        step: 'error', 
        message: error.message || '결제 중 오류가 발생했습니다.', 
        paymentId: null,
        transactionId: null 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 결제 성공 후 처리
  const handlePurchaseSuccess = async (paymentResult) => {
    const total = getTotalPrice();
    
    // 구매한 아이템을 "내 아이템"에 추가
    const purchasedItems = localStorage.getItem(`myItems_${userId}`) || '[]';
    const currentItems = JSON.parse(purchasedItems);
    const newItems = cart.map(item => ({
      id: `${Date.now()}_${item.id}`,
      name: item.name,
      category: item.category,
      image: item.image,
      purchaseDate: new Date().toISOString(),
      quantity: item.quantity,
      paymentId: paymentResult.payment_id,
      transactionId: paymentResult.transaction_id
    }));
    localStorage.setItem(`myItems_${userId}`, JSON.stringify([...currentItems, ...newItems]));

    // 주문 기록 추가
    const newOrder = {
      id: paymentResult.payment_id,
      date: new Date().toLocaleDateString(),
      amount: total,
      items: cart.length,
      status: 'completed',
      transactionId: paymentResult.transaction_id,
      processingFee: paymentResult.processing_fee || 0,
      netAmount: paymentResult.net_amount || total
    };
    const currentOrders = JSON.parse(localStorage.getItem(`orders_${userId}`) || '[]');
    localStorage.setItem(`orders_${userId}`, JSON.stringify([...currentOrders, newOrder]));

    // 매출 데이터 업데이트
    setSalesData(prev => ({
      ...prev,
      totalSales: prev.totalSales + cart.length,
      totalRevenue: prev.totalRevenue + total,
      monthlyRevenue: prev.monthlyRevenue + total
    }));
    
    // 결제 폼 초기화
    setPaymentForm({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardHolder: '',
      bankAccount: '',
      bankName: '',
      accountHolder: '',
      walletAddress: '',
      walletType: 'bitcoin'
    });
    
    // 장바구니 비우기
    setCart([]);
    localStorage.setItem(`cart_${userId}`, '[]');
    
    // 3초 후 모달 닫기 및 내 아이템 탭으로 이동
    setTimeout(() => {
      setShowPaymentModal(false);
      setPaymentProgress({ step: 'form', message: '', paymentId: null, transactionId: null });
      setActiveTab('myitems');
      
      // 성공 알림
      showSuccessNotification(paymentResult);
    }, 3000);
  };

  // 성공 알림 표시
  const showSuccessNotification = (paymentResult) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 30px 40px;
      border-radius: 20px;
      z-index: 3000;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      animation: bounceIn 0.5s ease-out;
      font-size: 18px;
      max-width: 400px;
    `;
    notification.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
      <div>구매가 완료되었습니다!</div>
      <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">
        거래번호: ${paymentResult.transaction_id}
      </div>
      <div style="font-size: 14px; margin-top: 5px; opacity: 0.9;">
        구매한 아이템은 '내 아이템'에서 확인할 수 있습니다.
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  };

  // 결제 재시도
  const retryPayment = () => {
    setPaymentProgress({ step: 'form', message: '', paymentId: null, transactionId: null });
  };

  // 결제 취소
  const cancelPayment = async () => {
    if (paymentProgress.paymentId) {
      try {
        await paymentService.cancelPayment(paymentProgress.paymentId, '사용자 취소');
      } catch (error) {
        console.error('결제 취소 실패:', error);
      }
    }
    
    setShowPaymentModal(false);
    setPaymentProgress({ step: 'form', message: '', paymentId: null, transactionId: null });
  };

  // 외부 링크 관리 함수들
  const saveExternalLinks = (links) => {
    localStorage.setItem(`externalLinks_${userId}`, JSON.stringify(links));
    setExternalLinks(links);
  };

  const addExternalLink = () => {
    if (!newLink.name || !newLink.url) {
      alert('쇼핑몰 이름과 URL을 입력해주세요.');
      return;
    }

    // URL 형식 검증
    try {
      new URL(newLink.url.startsWith('http') ? newLink.url : `https://${newLink.url}`);
    } catch {
      alert('올바른 URL 형식이 아닙니다.');
      return;
    }

    const updatedLinks = [...externalLinks, {
      ...newLink,
      id: Date.now(),
      url: newLink.url.startsWith('http') ? newLink.url : `https://${newLink.url}`,
      icon: '🔗'
    }];
    
    saveExternalLinks(updatedLinks);
    setNewLink({ name: '', url: '', description: '' });
  };

  const removeExternalLink = (linkId) => {
    const updatedLinks = externalLinks.filter(link => link.id !== linkId);
    saveExternalLinks(updatedLinks);
  };

  const openExternalLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 이모지 선택기 상태
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 결제 관련 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('credit-card');
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
    bankAccount: '',
    bankName: '',
    accountHolder: '',
    walletAddress: '',
    walletType: 'bitcoin'
  });
  const [paymentProgress, setPaymentProgress] = useState({
    step: 'form', // 'form', 'processing', 'success', 'error'
    message: '',
    paymentId: null,
    transactionId: null
  });

  // 이모지 목록
  const emojiCategories = {
    'avatar': ['✨', '👤', '💎', '🌟', '👑', '💫', '🎭', '🦄'],
    'emoticon': ['🤖', '😎', '🥳', '😍', '🤩', '😊', '😄', '🤗'],
    'space': ['🏰', '🌍', '🌎', '🌏', '🏝️', '🗻', '⛩️', '🎪'],
    'effect': ['💫', '⚡', '🌈', '✨', '💥', '🔥', '❄️', '💧'],
    'voice': ['🎙️', '🎵', '🎶', '📢', '📻', '🔊', '🔉', '🔈'],
    'chat': ['💬', '💭', '💌', '📝', '📨', '💝', '🎉', '🎊'],
    'companion': ['🐉', '🦋', '🐾', '🦊', '🐺', '🐸', '🌸', '🌺']
  };

  // 선택한 카테고리의 이모지 가져오기
  const getCurrentEmojis = () => {
    const category = editingProduct === 'new' ? newProduct.category : editingProduct.category;
    return emojiCategories[category] || emojiCategories['avatar'];
  };

  // 이모지 선택 처리
  const selectEmoji = (emoji) => {
    updateProductField('image', emoji);
    setShowEmojiPicker(false);
  };

  // 결제 폼 업데이트
  const updatePaymentForm = (field, value) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  // 카드 번호 포맷팅
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // 유효기간 포맷팅
  const formatExpiryDate = (value) => {
    const v = value.replace(/\D+/g, '');
    const matches = v.match(/(\d{0,2})(\d{0,2})/);
    if (!matches) return '';
    return [matches[1], matches[2]].filter(x => x).join('/');
  };

  // 관리자 함수들
  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdmin(true);
      setAdminPassword('');
      
      // 주문 데이터 로드
      const savedOrders = localStorage.getItem(`orders_${userId}`) || '[]';
      setOrders(JSON.parse(savedOrders));
    } else {
      alert('잘못된 비밀번호입니다.');
      setAdminPassword('');
    }
  };

  const updateProductStock = (productId, newStock) => {
    const updatedProducts = products.map(product =>
      product.id === productId ? { ...product, stock: newStock } : product
    );
    setProducts(updatedProducts);
    localStorage.setItem(`products_${userId}`, JSON.stringify(updatedProducts));
  };

  const deleteProduct = (productId) => {
    if (window.confirm('정말 이 상품을 삭제하시겠습니까?')) {
      const updatedProducts = products.filter(product => product.id !== productId);
      setProducts(updatedProducts);
      localStorage.setItem(`products_${userId}`, JSON.stringify(updatedProducts));
    }
  };

  const updateProductField = (field, value) => {
    if (editingProduct === 'new') {
      setNewProduct({ ...newProduct, [field]: value });
    } else {
      setEditingProduct({ ...editingProduct, [field]: value });
    }
  };

  const saveProduct = () => {
    if (editingProduct === 'new') {
      if (!newProduct.name || !newProduct.price || !newProduct.description) {
        alert('필수 정보를 모두 입력해주세요.');
        return;
      }
      
      const product = {
        ...newProduct,
        id: Date.now(),
        price: parseInt(newProduct.price) || 0,
        stock: parseInt(newProduct.stock) || 0,
        featured: false,
        tags: ['신상품']
      };
      
      const updatedProducts = [...products, product];
      setProducts(updatedProducts);
      localStorage.setItem(`products_${userId}`, JSON.stringify(updatedProducts));
      setNewProduct({
        name: '',
        price: '',
        image: '',
        category: 'avatar',
        description: '',
        stock: '',
        tags: []
      });
    } else {
      const updatedProducts = products.map(product =>
        product.id === editingProduct.id ? editingProduct : product
      );
      setProducts(updatedProducts);
      localStorage.setItem(`products_${userId}`, JSON.stringify(updatedProducts));
    }
    
    setEditingProduct(null);
  };

  const updateOrderStatus = (orderId, newStatus) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem(`orders_${userId}`, JSON.stringify(updatedOrders));
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="personal-shop-overlay">
      <div className="personal-shop-modal">
        {/* 헤더 */}
        <div className="shop-header">
          <div className="shop-title">
            <h2>🛍️ {shopInfo.ownerName || username}의 개인 쇼핑몰</h2>
            <p>아바타 커스터마이징 & 디지털 아이템</p>
            {!shopInfo.isOwnShop && (
              <div className="visitor-badge">
                👥 방문 중 • 운영자: {shopInfo.ownerName}
              </div>
            )}
            {shopInfo.paymentEnabled ? (
              <div className="payment-status enabled">
                ✅ 결제 시스템 활성화
              </div>
            ) : (
              <div className="payment-status disabled">
                ⚠️ 결제 시스템 미설정
              </div>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="shop-tabs">
          <button 
            className={`tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            🛒 상품 ({filteredProducts.length})
          </button>
          <button 
            className={`tab ${activeTab === 'external' ? 'active' : ''}`}
            onClick={() => setActiveTab('external')}
          >
            🔗 외부쇼핑몰 ({externalLinks.length})
          </button>
          <button 
            className={`tab ${activeTab === 'cart' ? 'active' : ''}`}
            onClick={() => setActiveTab('cart')}
          >
            🛍️ 장바구니 ({cart.length})
          </button>
          <button 
            className={`tab ${activeTab === 'myitems' ? 'active' : ''}`}
            onClick={() => setActiveTab('myitems')}
          >
            💎 내 아이템
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ 설정
          </button>
          <button 
            className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
            style={{ display: isAdmin ? 'block' : 'none' }}
          >
            🔧 관리자
          </button>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="shop-content">
          {activeTab === 'products' && (
            <div className="products-tab">
              {/* 검색 바 */}
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="상품 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button>🔍</button>
              </div>

              {/* 상품 그리드 */}
              <div className="products-grid">
                {filteredProducts.map(product => (
                  <div key={product.id} className="product-card">
                    <div className="product-image">{product.image}</div>
                    <div className="product-info">
                      <h3>{product.name}</h3>
                      <p className="product-description">{product.description}</p>
                      <div className="product-details">
                        <span className="price">{product.price.toLocaleString()}원</span>
                        <span className="stock">재고: {product.stock}개</span>
                      </div>
                      <button 
                        className="add-to-cart-btn"
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                      >
                        {product.stock === 0 ? '품절' : '장바구니 담기'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cart' && (
            <div className="cart-tab">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <p>🛍️ 장바구니가 비어있습니다</p>
                  <button onClick={() => setActiveTab('products')}>
                    상품 보러가기
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cart.map(item => (
                      <div key={item.id} className="cart-item">
                        <div className="item-image">{item.image}</div>
                        <div className="item-details">
                          <h4>{item.name}</h4>
                          <p>{item.price.toLocaleString()}원</p>
                        </div>
                        <div className="quantity-controls">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                        </div>
                        <div className="item-total">
                          {(item.price * item.quantity).toLocaleString()}원
                        </div>
                        <button 
                          className="remove-btn"
                          onClick={() => removeFromCart(item.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="cart-summary">
                    <div className="total-price">
                      총 금액: {getTotalPrice().toLocaleString()}원
                    </div>
                    <button 
                      className="purchase-btn"
                      onClick={handlePurchase}
                      disabled={isLoading}
                    >
                      {isLoading ? '결제 중...' : '구매하기'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'external' && (
            <div className="external-tab">
              <div className="external-header">
                <h3>🔗 외부 쇼핑몰 바로가기</h3>
                <p>내가 운영하는 다른 쇼핑몰들을 등록하고 방문자들이 쉽게 접근할 수 있도록 해보세요!</p>
              </div>

              {/* 외부 링크 목록 */}
              <div className="external-links-grid">
                {externalLinks.map(link => (
                  <div key={link.id} className="external-link-card">
                    <div className="link-header">
                      <span className="link-icon">{link.icon}</span>
                      <h4>{link.name}</h4>
                      <button 
                        className="remove-link-btn"
                        onClick={() => removeExternalLink(link.id)}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="link-description">{link.description}</p>
                    <div className="link-url">{link.url}</div>
                    <button 
                      className="visit-link-btn"
                      onClick={() => openExternalLink(link.url)}
                    >
                      🚀 방문하기
                    </button>
                  </div>
                ))}
              </div>

              {/* 새 링크 추가 */}
              <div className="add-link-section">
                <h4>새 쇼핑몰 추가</h4>
                <div className="add-link-form">
                  <input
                    type="text"
                    placeholder="쇼핑몰 이름 (예: 내 네이버 스마트스토어)"
                    value={newLink.name}
                    onChange={(e) => setNewLink({...newLink, name: e.target.value})}
                  />
                  <input
                    type="url"
                    placeholder="URL (예: https://smartstore.naver.com/mystore)"
                    value={newLink.url}
                    onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                  />
                  <textarea
                    placeholder="설명 (선택사항)"
                    value={newLink.description}
                    onChange={(e) => setNewLink({...newLink, description: e.target.value})}
                    rows="2"
                  />
                  <button className="add-link-btn" onClick={addExternalLink}>
                    ➕ 쇼핑몰 추가
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'myitems' && (
            <div className="myitems-tab">
              {(() => {
                const myItems = JSON.parse(localStorage.getItem(`myItems_${userId}`) || '[]');
                const groupedItems = myItems.reduce((acc, item) => {
                  if (!acc[item.category]) acc[item.category] = [];
                  acc[item.category].push(item);
                  return acc;
                }, {});

                const categoryIcons = {
                  avatar: '✨',
                  emoticon: '😎',
                  space: '🏰', 
                  effect: '💫',
                  voice: '🎙️',
                  chat: '💬',
                  companion: '🐉'
                };

                const categoryNames = {
                  avatar: '아바타 스킨',
                  emoticon: '이모티콘',
                  space: '가상 공간',
                  effect: '특수 효과',
                  voice: '음성 효과',
                  chat: '채팅 효과',
                  companion: '컴패니언'
                };

                return (
                  <div className="my-items-grid">
                    {Object.keys(groupedItems).length === 0 ? (
                      <div className="no-items">
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
                        <h3>아직 구매한 아이템이 없습니다</h3>
                        <p>상품을 구매하면 여기에서 확인할 수 있습니다.</p>
                        <button 
                          onClick={() => setActiveTab('products')}
                          style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '25px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            marginTop: '15px'
                          }}
                        >
                          상품 보러가기
                        </button>
                      </div>
                    ) : (
                      Object.entries(groupedItems).map(([category, items]) => (
                        <div key={category} className="item-category">
                          <h3>
                            {categoryIcons[category] || '🎁'} {categoryNames[category] || category}
                            <span className="item-count">({items.length}개)</span>
                          </h3>
                          <div className="items-list">
                            {items.map((item, index) => (
                              <div key={`${item.id}_${index}`} className="owned-item">
                                <div className="item-icon">{item.image}</div>
                                <div className="item-info">
                                  <div className="item-name">{item.name}</div>
                                  <div className="item-date">
                                    {new Date(item.purchaseDate).toLocaleDateString()}
                                  </div>
                                  {item.quantity > 1 && (
                                    <div className="item-quantity">x{item.quantity}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-tab">
              <div className="settings-section">
                <h3>⚙️ 쇼핑몰 설정</h3>
                
                <div className="setting-group">
                  <h4>🔗 외부 쇼핑몰 바로가기</h4>
                  <p>메인 쇼핑몰 탭에서 외부 쇼핑몰을 관리할 수 있습니다.</p>
                  <button 
                    className="setting-btn"
                    onClick={() => setActiveTab('external')}
                  >
                    외부 쇼핑몰 관리하기
                  </button>
                </div>

                {/* 멀티 결제 설정 */}
                {shopInfo.isOwnShop && (
                  <MultiPaymentSettingsSection 
                    shopOwnerId={shopInfo.ownerId}
                    onConfigUpdate={() => {
                      initializeShopInfo(); // 설정 업데이트 후 쇼핑몰 정보 새로고침
                    }}
                  />
                )}

                <div className="setting-group">
                  <h4>💳 결제 시스템 상태</h4>
                  <div className="payment-status-detail">
                    {shopInfo.paymentEnabled ? (
                      <div className="status-enabled">
                        <span className="status-icon">✅</span>
                        <span>결제 시스템이 활성화되어 있습니다.</span>
                      </div>
                    ) : (
                      <div className="status-disabled">
                        <span className="status-icon">⚠️</span>
                        <span>결제 시스템이 설정되지 않았습니다.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="setting-group">
                  <h4>📦 배송 설정</h4>
                  <div className="shipping-settings">
                    <label>
                      기본 배송비:
                      <input type="number" defaultValue="3000" /> 원
                    </label>
                    <label>
                      무료배송 기준:
                      <input type="number" defaultValue="50000" /> 원 이상
                    </label>
                  </div>
                </div>

                <div className="setting-group">
                  <h4>🎨 쇼핑몰 테마</h4>
                  <div className="theme-options">
                    <button className="theme-btn active">🌟 기본 테마</button>
                    <button className="theme-btn">🌙 다크 테마</button>
                    <button className="theme-btn">🌸 핑크 테마</button>
                    <button className="theme-btn">🌊 블루 테마</button>
                  </div>
                </div>

                <div className="setting-group">
                  <h4>📊 통계 및 분석</h4>
                  <div className="stats-info">
                    <div className="stat-item">
                      <span>오늘 방문자</span>
                      <strong>24명</strong>
                    </div>
                    <div className="stat-item">
                      <span>총 판매량</span>
                      <strong>156개</strong>
                    </div>
                    <div className="stat-item">
                      <span>총 매출</span>
                      <strong>2,340,000원</strong>
                    </div>
                  </div>
                </div>

                <div className="setting-group">
                  <h4>📢 마케팅 설정</h4>
                  <label>
                    <input type="checkbox" defaultChecked />
                    신상품 알림 허용
                  </label>
                  <label>
                    <input type="checkbox" />
                    할인 정보 이메일 발송
                  </label>
                  <label>
                    <input type="checkbox" />
                    SNS 자동 홍보
                  </label>
                </div>

                <div className="setting-group">
                  <h4>🔧 관리자 도구</h4>
                  <p>상품, 주문, 매출 등을 관리할 수 있는 관리자 패널에 접근하세요.</p>
                  <button 
                    className="setting-btn admin-access-btn"
                    onClick={() => setActiveTab('admin')}
                    style={{
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      color: 'white'
                    }}
                  >
                    🔧 관리자 패널 접근
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <div className="admin-tab">
              <div className="admin-header">
                <h3>🔧 관리자 패널</h3>
                <button 
                  className="logout-admin-btn"
                  onClick={() => {
                    setIsAdmin(false);
                    setActiveTab('products');
                    setAdminPassword('');
                  }}
                >
                  로그아웃
                </button>
              </div>

              <div className="admin-sections">
                {/* 상품 관리 */}
                <div className="admin-section">
                  <h4>📦 상품 관리</h4>
                  <div className="admin-actions">
                    <button 
                      className="admin-btn primary"
                      onClick={() => setEditingProduct('new')}
                    >
                      ➕ 새 상품 추가
                    </button>
                  </div>
                  
                  <div className="products-table">
                    <div className="table-header">
                      <span>상품</span>
                      <span>가격</span>
                      <span>재고</span>
                      <span>카테고리</span>
                      <span>관리</span>
                    </div>
                    {products.map(product => (
                      <div key={product.id} className="table-row">
                        <div className="product-cell">
                          <span className="product-emoji">{product.image}</span>
                          {product.name}
                        </div>
                        <div>{product.price.toLocaleString()}원</div>
                        <div>
                          <input 
                            type="number" 
                            value={product.stock}
                            onChange={(e) => updateProductStock(product.id, parseInt(e.target.value))}
                            className="stock-input"
                          />
                        </div>
                        <div>{product.category}</div>
                        <div className="action-buttons">
                          <button 
                            className="edit-btn"
                            onClick={() => setEditingProduct(product)}
                          >
                            ✏️
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => deleteProduct(product.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 주문 관리 */}
                <div className="admin-section">
                  <h4>📋 주문 관리</h4>
                  <div className="orders-list">
                    {orders.length === 0 ? (
                      <div className="no-orders">
                        <p>아직 주문이 없습니다.</p>
                      </div>
                    ) : (
                      orders.map(order => (
                        <div key={order.id} className="order-item">
                          <div className="order-info">
                            <span className="order-id">주문 #{order.id}</span>
                            <span className="order-date">{order.date}</span>
                            <span className="order-amount">{order.amount.toLocaleString()}원</span>
                          </div>
                          <div className="order-status">
                            <select 
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            >
                              <option value="pending">대기중</option>
                              <option value="processing">처리중</option>
                              <option value="completed">완료</option>
                              <option value="cancelled">취소</option>
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 매출 분석 */}
                <div className="admin-section">
                  <h4>📊 매출 분석</h4>
                  <div className="analytics-grid">
                    <div className="analytics-card">
                      <h5>오늘 방문자</h5>
                      <div className="analytics-value">{salesData.todayVisitors}명</div>
                    </div>
                    <div className="analytics-card">
                      <h5>총 판매량</h5>
                      <div className="analytics-value">{salesData.totalSales}개</div>
                    </div>
                    <div className="analytics-card">
                      <h5>이번 달 매출</h5>
                      <div className="analytics-value">{salesData.monthlyRevenue.toLocaleString()}원</div>
                    </div>
                    <div className="analytics-card">
                      <h5>총 매출</h5>
                      <div className="analytics-value">{salesData.totalRevenue.toLocaleString()}원</div>
                    </div>
                  </div>
                </div>

                {/* 재고 관리 */}
                <div className="admin-section">
                  <h4>📈 재고 현황</h4>
                  <div className="inventory-grid">
                    {products.map(product => (
                      <div key={product.id} className="inventory-card">
                        <div className="inventory-header">
                          <span className="product-emoji">{product.image}</span>
                          <span className="product-name">{product.name}</span>
                        </div>
                        <div className="inventory-status">
                          <div className={`stock-level ${product.stock <= 5 ? 'low' : product.stock <= 10 ? 'medium' : 'high'}`}>
                            재고: {product.stock}개
                          </div>
                          <div className="stock-actions">
                            <button 
                              className="stock-btn"
                              onClick={() => updateProductStock(product.id, product.stock + 10)}
                            >
                              +10
                            </button>
                            <button 
                              className="stock-btn"
                              onClick={() => updateProductStock(product.id, Math.max(0, product.stock - 5))}
                            >
                              -5
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 관리자 로그인 모달 */}
          {activeTab === 'admin' && !isAdmin && (
            <div className="admin-login">
              <div className="login-form">
                <h3>🔐 관리자 로그인</h3>
                <p>관리자 패널에 접근하려면 비밀번호를 입력하세요.</p>
                <input
                  type="password"
                  placeholder="관리자 비밀번호"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
                <div className="login-actions">
                  <button 
                    className="login-btn"
                    onClick={handleAdminLogin}
                  >
                    로그인
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => setActiveTab('products')}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 상품 편집 모달 */}
          {editingProduct && (
            <div className="product-edit-modal">
              <div className="edit-form">
                <h3>{editingProduct === 'new' ? '새 상품 추가' : '상품 편집'}</h3>
                <div className="form-grid">
                  <input
                    type="text"
                    placeholder="상품명"
                    value={editingProduct === 'new' ? newProduct.name : editingProduct.name}
                    onChange={(e) => updateProductField('name', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="가격"
                    value={editingProduct === 'new' ? newProduct.price : editingProduct.price}
                    onChange={(e) => updateProductField('price', parseInt(e.target.value))}
                  />
                  <div className="emoji-input-container">
                    <div className="emoji-preview">
                      <span className="current-emoji">
                        {editingProduct === 'new' ? newProduct.image || '🎁' : editingProduct.image || '🎁'}
                      </span>
                      <button 
                        type="button"
                        className="emoji-select-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        이모지 선택
                      </button>
                    </div>
                    {showEmojiPicker && (
                      <div className="emoji-picker">
                        <div className="emoji-picker-header">
                          <h4>이모지를 선택하세요</h4>
                          <button 
                            type="button"
                            className="close-picker-btn"
                            onClick={() => setShowEmojiPicker(false)}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="emoji-grid">
                          {getCurrentEmojis().map((emoji, index) => (
                            <button
                              key={index}
                              type="button"
                              className="emoji-option"
                              onClick={() => selectEmoji(emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <select
                    value={editingProduct === 'new' ? newProduct.category : editingProduct.category}
                    onChange={(e) => updateProductField('category', e.target.value)}
                  >
                    <option value="avatar">아바타</option>
                    <option value="emoticon">이모티콘</option>
                    <option value="space">공간</option>
                    <option value="effect">효과</option>
                    <option value="voice">음성</option>
                    <option value="chat">채팅</option>
                    <option value="companion">컴패니언</option>
                  </select>
                  <input
                    type="number"
                    placeholder="재고"
                    value={editingProduct === 'new' ? newProduct.stock : editingProduct.stock}
                    onChange={(e) => updateProductField('stock', parseInt(e.target.value))}
                  />
                  <textarea
                    placeholder="상품 설명"
                    value={editingProduct === 'new' ? newProduct.description : editingProduct.description}
                    onChange={(e) => updateProductField('description', e.target.value)}
                    rows="3"
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    className="save-btn"
                    onClick={saveProduct}
                  >
                    {editingProduct === 'new' ? '추가' : '저장'}
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => setEditingProduct(null)}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 멀티 결제 모달 */}
          {showPaymentModal && (
            <div className="payment-modal">
              {shopInfo.paymentEnabled ? (
                <MultiPayment
                  amount={getTotalPrice()}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={handlePaymentCancel}
                  shopOwnerId={shopInfo.ownerId}
                  roomData={currentMap || roomData}
                />
              ) : (
                <div className="payment-disabled">
                  <h3>결제 시스템 미설정</h3>
                  <p>이 쇼핑몰은 아직 결제 시스템이 설정되지 않았습니다.</p>
                  {shopInfo.isOwnShop ? (
                    <div>
                      <p>설정 탭에서 토스페이먼츠 또는 PortOne 결제를 설정해주세요.</p>
                      <button 
                        onClick={() => {
                          setShowPaymentModal(false);
                          setActiveTab('settings');
                        }}
                        className="setup-payment-btn"
                      >
                        결제 설정하기
                      </button>
                    </div>
                  ) : (
                    <p>쇼핑몰 운영자가 결제 시스템을 설정해야 합니다.</p>
                  )}
                  <button onClick={handlePaymentCancel} className="cancel-button">
                    닫기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 멀티 결제 설정 컴포넌트
const MultiPaymentSettingsSection = ({ shopOwnerId, onConfigUpdate }) => {
  const [paymentConfig, setPaymentConfig] = useState({
    tossPayments: { clientKey: '', secretKey: '', isActive: false },
    portOne: { storeId: '', channelKey: '', isActive: false },
    preferredProvider: 'toss',
    autoSelectByRegion: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('toss');

  useEffect(() => {
    // 현재 설정 로드
    const currentConfig = paymentConfigService.getUserConfig(shopOwnerId);
    setPaymentConfig(currentConfig);
  }, [shopOwnerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 설정 유효성 검사
      const validation = paymentConfigService.validateConfig(paymentConfig);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }

      // 설정 저장
      paymentConfigService.setUserConfig(shopOwnerId, paymentConfig);
      setIsEditing(false);
      onConfigUpdate();
      
      // 성공 알림
      showSuccessNotification('결제 설정이 저장되었습니다!');
    } catch (error) {
      alert('설정 저장 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfig = () => {
    // 테스트 설정 생성
    const testConfig = paymentConfigService.createTestConfig(shopOwnerId);
    setPaymentConfig(testConfig);
    onConfigUpdate();
    showSuccessNotification('테스트 설정이 생성되었습니다!');
  };

  const showSuccessNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      z-index: 3000;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const updateTossConfig = (field, value) => {
    setPaymentConfig(prev => ({
      ...prev,
      tossPayments: { ...prev.tossPayments, [field]: value }
    }));
  };

  const updatePortOneConfig = (field, value) => {
    setPaymentConfig(prev => ({
      ...prev,
      portOne: { ...prev.portOne, [field]: value }
    }));
  };

  return (
    <div className="setting-group payment-settings">
      <h4>💳 결제 시스템 설정</h4>
      <p>토스페이먼츠(국내)와 PortOne(해외) 결제 연동 설정</p>
      
      {isEditing ? (
        <div className="payment-config-form">
          {/* 결제 제공자 탭 */}
          <div className="provider-tabs">
            <button 
              type="button"
              className={`provider-tab ${activeTab === 'toss' ? 'active' : ''}`}
              onClick={() => setActiveTab('toss')}
            >
              💳 토스페이먼츠
            </button>
            <button 
              type="button"
              className={`provider-tab ${activeTab === 'portone' ? 'active' : ''}`}
              onClick={() => setActiveTab('portone')}
            >
              🌍 PortOne
            </button>
          </div>

          {/* 토스페이먼츠 설정 */}
          {activeTab === 'toss' && (
            <div className="provider-config">
              <h5>토스페이먼츠 설정 (국내 고객 추천)</h5>
              <div className="form-group">
                <label>클라이언트 키 *</label>
                <input
                  type="text"
                  value={paymentConfig.tossPayments.clientKey}
                  onChange={(e) => updateTossConfig('clientKey', e.target.value)}
                  placeholder="test_ck_... 또는 live_ck_..."
                />
              </div>
              <div className="form-group">
                <label>시크릿 키</label>
                <input
                  type="password"
                  value={paymentConfig.tossPayments.secretKey}
                  onChange={(e) => updateTossConfig('secretKey', e.target.value)}
                  placeholder="test_sk_... 또는 live_sk_..."
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={paymentConfig.tossPayments.isActive}
                    onChange={(e) => updateTossConfig('isActive', e.target.checked)}
                  />
                  토스페이먼츠 활성화
                </label>
              </div>
            </div>
          )}

          {/* PortOne 설정 */}
          {activeTab === 'portone' && (
            <div className="provider-config">
              <h5>PortOne 설정 (해외 고객 추천)</h5>
              <div className="form-group">
                <label>스토어 ID *</label>
                <input
                  type="text"
                  value={paymentConfig.portOne.storeId}
                  onChange={(e) => updatePortOneConfig('storeId', e.target.value)}
                  placeholder="store_..."
                />
              </div>
              <div className="form-group">
                <label>채널 키 *</label>
                <input
                  type="text"
                  value={paymentConfig.portOne.channelKey}
                  onChange={(e) => updatePortOneConfig('channelKey', e.target.value)}
                  placeholder="channel_..."
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={paymentConfig.portOne.isActive}
                    onChange={(e) => updatePortOneConfig('isActive', e.target.checked)}
                  />
                  PortOne 활성화
                </label>
              </div>
            </div>
          )}

          {/* 공통 설정 */}
          <div className="common-settings">
            <h5>공통 설정</h5>
            <div className="form-group">
              <label>선호하는 결제 제공자</label>
              <select
                value={paymentConfig.preferredProvider}
                onChange={(e) => setPaymentConfig({...paymentConfig, preferredProvider: e.target.value})}
              >
                <option value="toss">토스페이먼츠</option>
                <option value="portone">PortOne</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={paymentConfig.autoSelectByRegion}
                  onChange={(e) => setPaymentConfig({...paymentConfig, autoSelectByRegion: e.target.checked})}
                />
                지역별 자동 선택 (국내: 토스페이먼츠, 해외: PortOne)
              </label>
            </div>
          </div>
          
          <div className="payment-actions">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="save-btn"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="cancel-btn"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="payment-config-display">
          <div className="config-status">
            <span className="config-label">토스페이먼츠:</span>
            <span className={`config-value ${paymentConfig.tossPayments?.isActive ? 'active' : 'inactive'}`}>
              {paymentConfig.tossPayments?.isActive ? '활성화됨' : '비활성화됨'}
            </span>
          </div>
          
          <div className="config-status">
            <span className="config-label">PortOne:</span>
            <span className={`config-value ${paymentConfig.portOne?.isActive ? 'active' : 'inactive'}`}>
              {paymentConfig.portOne?.isActive ? '활성화됨' : '비활성화됨'}
            </span>
          </div>
          
          <div className="config-detail">
            <span className="config-label">선호 제공자:</span>
            <span className="config-value">
              {paymentConfig.preferredProvider === 'toss' ? '토스페이먼츠' : 'PortOne'}
            </span>
          </div>
          
          <div className="payment-actions">
            <button onClick={() => setIsEditing(true)} className="edit-btn">
              설정 편집
            </button>
            <button onClick={handleTestConfig} className="test-btn">
              테스트 설정 생성
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalShop;