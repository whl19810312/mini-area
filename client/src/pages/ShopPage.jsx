import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PersonalShop from '../components/PersonalShop';
import '../styles/ShopPage.css';

const ShopPage = () => {
  const { user } = useAuth();

  return (
    <div className="shop-page">
      <div className="shop-page-header">
        <div className="header-content">
          <h1>🛍️ 개인 쇼핑몰</h1>
          <p>메타버스 전용 아이템과 디지털 굿즈를 만나보세요</p>
        </div>
        <button 
          className="close-page-btn"
          onClick={() => window.close()}
          title="창 닫기"
        >
          ✕
        </button>
      </div>
      
      <div className="shop-container">
        <PersonalShop
          isOpen={true}
          onClose={() => window.close()}
          userId={user?.id || 'guest'}
          username={user?.username || '게스트'}
        />
      </div>
    </div>
  );
};

export default ShopPage;