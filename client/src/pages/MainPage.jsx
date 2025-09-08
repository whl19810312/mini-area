import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/MainPage.css'

function MainPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleEnterMetaverse = () => {
    window.location.href = '/metaverse/waiting-room'
  }

  return (
    <div className="main-page">
      <div className="sky-background">
        <div className="clouds">
          <div className="cloud cloud1"></div>
          <div className="cloud cloud2"></div>
          <div className="cloud cloud3"></div>
        </div>
        
        <div className="mini-area-text">
          <h1>MINI AREA</h1>
          <p>당신만의 가상공간을 만들어보세요</p>
        </div>

        <div className="main-buttons">
          <button 
            className="enter-metaverse-btn"
            onClick={handleEnterMetaverse}
          >
            가상공간 입장
          </button>
          
          <button 
            className="logout-btn"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>

        <div className="user-info">
          <p>환영합니다, {user?.username || '사용자'}님!</p>
        </div>
      </div>
    </div>
  )
}

export default MainPage
