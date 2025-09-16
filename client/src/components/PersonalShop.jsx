import React, { useState, useEffect } from 'react';
import './PersonalShop.css';

const PersonalShop = ({ isOpen, onClose, userId, username }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [externalLinks, setExternalLinks] = useState([]);
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [newLink, setNewLink] = useState({ name: '', url: '', description: '' });

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
      setProducts(sampleProducts);
      // 로컬 스토리지에서 외부 링크 불러오기
      const savedLinks = localStorage.getItem(`externalLinks_${userId}`);
      if (savedLinks) {
        setExternalLinks(JSON.parse(savedLinks));
      } else {
        setExternalLinks(defaultExternalLinks);
      }
    }
  }, [isOpen, userId]);

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handlePurchase = async () => {
    if (cart.length === 0) return;
    
    setIsLoading(true);
    try {
      // 여기에 실제 결제 API 호출 추가
      await new Promise(resolve => setTimeout(resolve, 2000)); // 시뮬레이션
      
      alert('구매가 완료되었습니다!');
      setCart([]);
      setActiveTab('products');
    } catch (error) {
      alert('구매 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
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
            <h2>🛍️ {username}의 개인 쇼핑몰</h2>
            <p>아바타 커스터마이징 & 디지털 아이템</p>
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
              <div className="my-items-grid">
                <div className="item-category">
                  <h3>👔 내 의상</h3>
                  <div className="items-list">
                    <div className="owned-item">기본 의상</div>
                  </div>
                </div>
                <div className="item-category">
                  <h3>😎 내 이모티콘</h3>
                  <div className="items-list">
                    <div className="owned-item">기본 이모티콘 팩</div>
                  </div>
                </div>
                <div className="item-category">
                  <h3>🏠 내 테마</h3>
                  <div className="items-list">
                    <div className="owned-item">기본 테마</div>
                  </div>
                </div>
              </div>
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

                <div className="setting-group">
                  <h4>💳 결제 설정</h4>
                  <p>결제 방식과 배송 정보를 설정합니다.</p>
                  <div className="payment-options">
                    <label>
                      <input type="checkbox" defaultChecked />
                      신용카드 결제
                    </label>
                    <label>
                      <input type="checkbox" defaultChecked />
                      계좌이체
                    </label>
                    <label>
                      <input type="checkbox" />
                      가상화폐 결제
                    </label>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalShop;