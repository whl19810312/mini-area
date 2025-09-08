import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/LandingPage.css'

const LandingPage = () => {
  const navigate = useNavigate()
  const [logoAnimation, setLogoAnimation] = useState(false)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // 로고 애니메이션
    setTimeout(() => {
      setLogoAnimation(true)
    }, 500)
    
    // 버튼 표시
    setTimeout(() => {
      setShowButton(true)
    }, 1500)
  }, [])

  const handleBBSClick = () => {
    // 바로 로그인 페이지로 이동
    navigate('/bbs-login')
  }

  return (
    <div className="landing-page">
      {/* 배경 그리드 효과 */}
      <div className="grid-background"></div>
      
      {/* 메인 컨테이너 */}
      <div className="landing-container">
        {/* 하늘소 이미지 */}
        <div className={`beetle-container ${logoAnimation ? 'animated' : ''}`}>
          <svg 
            className="beetle-svg"
            width="200" 
            height="250" 
            viewBox="0 0 200 250" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 하늘소 본체 */}
            <ellipse cx="100" cy="150" rx="40" ry="60" fill="#2a2a2a" stroke="#000" strokeWidth="2"/>
            
            {/* 하늘소 머리 */}
            <ellipse cx="100" cy="100" rx="25" ry="20" fill="#1a1a1a" stroke="#000" strokeWidth="2"/>
            
            {/* 하늘소 더듬이 (특징적인 긴 더듬이) */}
            <path d="M 85 95 Q 70 80 55 60 Q 50 55 45 45" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M 115 95 Q 130 80 145 60 Q 150 55 155 45" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/>
            
            {/* 더듬이 마디 */}
            <circle cx="75" cy="85" r="2" fill="#000"/>
            <circle cx="65" cy="70" r="2" fill="#000"/>
            <circle cx="55" cy="60" r="2" fill="#000"/>
            <circle cx="125" cy="85" r="2" fill="#000"/>
            <circle cx="135" cy="70" r="2" fill="#000"/>
            <circle cx="145" cy="60" r="2" fill="#000"/>
            
            {/* 하늘소 다리 6개 */}
            {/* 왼쪽 다리 */}
            <path d="M 70 120 L 50 110 L 40 120" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M 70 145 L 45 140 L 35 150" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M 70 170 L 50 175 L 40 185" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
            
            {/* 오른쪽 다리 */}
            <path d="M 130 120 L 150 110 L 160 120" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M 130 145 L 155 140 L 165 150" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M 130 170 L 150 175 L 160 185" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
            
            {/* 하늘소 날개 무늬 */}
            <ellipse cx="100" cy="140" rx="20" ry="30" fill="none" stroke="#444" strokeWidth="1" opacity="0.5"/>
            <ellipse cx="100" cy="160" rx="15" ry="20" fill="none" stroke="#444" strokeWidth="1" opacity="0.5"/>
            
            {/* 하늘소 눈 */}
            <circle cx="90" cy="100" r="5" fill="#fff"/>
            <circle cx="110" cy="100" r="5" fill="#fff"/>
            <circle cx="90" cy="100" r="3" fill="#000"/>
            <circle cx="110" cy="100" r="3" fill="#000"/>
            
            {/* 광택 효과 */}
            <ellipse cx="95" cy="130" rx="15" ry="25" fill="url(#shine)" opacity="0.3"/>
            
            <defs>
              <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* MINI-AREA 로고 */}
        <div className={`logo-container ${logoAnimation ? 'animated' : ''}`}>
          <div className="logo-text">
            <span className="logo-mini">MINI</span>
            <span className="logo-dash">-</span>
            <span className="logo-area">AREA</span>
          </div>
          <div className="logo-subtitle">
            Virtual Space Communication System
          </div>
          <div className="logo-version">
            Version 2.0.0
          </div>
        </div>

        {/* BBS 접속 버튼 */}
        {showButton && (
          <div className="button-container">
            <button 
              className="bbs-button"
              onClick={handleBBSClick}
            >
              <span className="button-bracket">[</span>
              <span className="button-text">BBS 접속</span>
              <span className="button-bracket">]</span>
            </button>
            
            <div className="button-hint">
              Click to connect to BBS system
            </div>
          </div>
        )}

        {/* 하단 정보 */}
        <div className="landing-footer">
          <div className="footer-line">
            ════════════════════════════════════════════════════════
          </div>
          <div className="footer-info">
            <span>© 2024 MINI-AREA</span>
            <span className="separator">│</span>
            <span>PC Communication Style Virtual Space</span>
            <span className="separator">│</span>
            <span>Best viewed in Chrome/Firefox</span>
          </div>
          <div className="footer-line">
            ════════════════════════════════════════════════════════
          </div>
        </div>
      </div>

      {/* CRT 효과 오버레이 */}
      <div className="crt-overlay"></div>
      
      {/* 스캔라인 효과 */}
      <div className="scanlines"></div>
    </div>
  )
}

export default LandingPage