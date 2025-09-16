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
      loadShopData();
    }
  }, [isOpen, userId]);

  const loadShopData = async () => {
    setIsLoading(true);
    try {
      // 상품 데이터 로드
      setProducts(sampleProducts);
      
      // 사용자별 장바구니 복원
      const savedCart = localStorage.getItem(`cart_${userId}`);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      
      // 로컬 스토리지에서 외부 링크 불러오기
      const savedLinks = localStorage.getItem(`externalLinks_${userId}`);
      if (savedLinks) {
        setExternalLinks(JSON.parse(savedLinks));
      } else {
        setExternalLinks(defaultExternalLinks);
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
    
    const total = getTotalPrice();
    const confirmed = window.confirm(
      `총 ${total.toLocaleString()}원의 상품을 구매하시겠습니까?\n\n구매 완료 후 해당 아이템들이 "내 아이템"에서 확인 가능합니다.`
    );
    
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      // 결제 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 구매한 아이템을 "내 아이템"에 추가
      const purchasedItems = localStorage.getItem(`myItems_${userId}`) || '[]';
      const currentItems = JSON.parse(purchasedItems);
      const newItems = cart.map(item => ({
        id: `${Date.now()}_${item.id}`,
        name: item.name,
        category: item.category,
        image: item.image,
        purchaseDate: new Date().toISOString(),
        quantity: item.quantity
      }));
      localStorage.setItem(`myItems_${userId}`, JSON.stringify([...currentItems, ...newItems]));

      // 주문 기록 추가
      const newOrder = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        amount: total,
        items: cart.length,
        status: 'pending'
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
      
      // 성공 알림
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
      `;
      notification.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
        <div>구매가 완료되었습니다!</div>
        <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">구매한 아이템은 '내 아이템'에서 확인할 수 있습니다.</div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 4000);
      
      setActiveTab('myitems');
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
                  <input
                    type="text"
                    placeholder="이미지 (이모지)"
                    value={editingProduct === 'new' ? newProduct.image : editingProduct.image}
                    onChange={(e) => updateProductField('image', e.target.value)}
                  />
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
        </div>
      </div>
    </div>
  );
};

export default PersonalShop;