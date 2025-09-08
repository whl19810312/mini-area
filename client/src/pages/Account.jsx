import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useModemSound from '../hooks/useModemSound'
import toast from 'react-hot-toast'
import '../styles/Account.css'

const Account = () => {
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTyping, setShowTyping] = useState(false)
  const [typingText, setTypingText] = useState('')
  
  const { login, register, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { playModemConnect } = useModemSound()
  
  // Check for mode from URL or state
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const modeParam = searchParams.get('mode')
    if (modeParam === 'register') {
      setMode('register')
    }
  }, [location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'register') {
      // 비밀번호 유효성 검사
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,15}$/
      if (!passwordRegex.test(formData.password)) {
        setError('비밀번호는 6-15자의 영문, 숫자, 특수문자를 포함해야 합니다.')
        setLoading(false)
        return
      }

      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.')
        setLoading(false)
        return
      }
    }

    // 모뎀 접속음 재생
    playModemConnect()

    try {
      if (mode === 'register') {
        const result = await register(formData.username, formData.password, formData.email)
        
        if (result && result.success) {
          toast.success('계정이 생성되었습니다! 로그인해 주세요.')
          setMode('login')
          setFormData({ ...formData, password: '', confirmPassword: '' })
        } else if (result && result.error) {
          setError(result.error)
        } else {
          setError('계정 생성에 실패했습니다. 다시 시도해 주세요.')
        }
      } else {
        // 로그인
        const result = await login(formData.username, formData.password)
        
        if (result === true) {
          // 타이핑 효과
          setShowTyping(true)
          const dialCommand = 'ATDT 01410'
          let currentIndex = 0
          
          const typeInterval = setInterval(() => {
            if (currentIndex < dialCommand.length) {
              setTypingText(dialCommand.substring(0, currentIndex + 1))
              currentIndex++
            } else {
              clearInterval(typeInterval)
              setTimeout(() => {
                playModemConnect()
              }, 200)
              setTimeout(() => {
                navigate('/waiting-room', { replace: true })
              }, 1500)
            }
          }, 150)
        } else {
          setError('로그인에 실패했습니다. 아이디와 비밀번호를 확인해 주세요.')
        }
      }
    } catch (error) {
      setError('오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      email: ''
    })
  }

  return (
    <div className="account-container">
      <div className="account-scanlines"></div>
      
      <div className="account-header">
        <div className="account-logo">
          <div className="logo-text">MINI AREA</div>
          <div className="logo-subtitle">Virtual Space Terminal</div>
        </div>
        <div className="connection-info">
          <span className="status-indicator"></span>
          <span>Connected: 192.168.200.106:7000</span>
          <span className="separator">|</span>
          <span>Protocol: HTTPS</span>
          <span className="separator">|</span>
          <span>Status: Ready</span>
        </div>
      </div>
      
      <div className="account-main">
        <div className="account-card">
          <div className="card-header">
            <div className="card-tabs">
              <button 
                className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => setMode('login')}
              >
                로그인
              </button>
              <button 
                className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => setMode('register')}
              >
                계정 생성
              </button>
            </div>
            <div className="card-decoration">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
          
          <div className="card-body">
            {showTyping ? (
              <div className="typing-container">
                <div className="typing-text">{typingText}</div>
                <div className="typing-cursor">_</div>
                <div className="connecting-text">연결 중...</div>
              </div>
            ) : (
              <>
                <div className="form-title">
                  {mode === 'login' ? 'SYSTEM ACCESS' : 'NEW ACCOUNT'}
                </div>
                
                {error && (
                  <div className="error-message">
                    <span className="error-icon">⚠</span>
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="account-form">
                  <div className="form-group">
                    <label htmlFor="username">
                      <span className="label-icon">👤</span>
                      사용자명
                    </label>
                    <input
                      id="username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      placeholder="사용자명 입력"
                      className="form-input"
                      autoComplete="username"
                    />
                  </div>
                  
                  {mode === 'register' && (
                    <div className="form-group">
                      <label htmlFor="email">
                        <span className="label-icon">📧</span>
                        이메일 (선택)
                      </label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="example@email.com"
                        className="form-input"
                        autoComplete="email"
                      />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label htmlFor="password">
                      <span className="label-icon">🔐</span>
                      비밀번호
                    </label>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder={mode === 'register' ? '6-15자, 영문+숫자+특수문자' : '비밀번호 입력'}
                      className="form-input"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    {mode === 'register' && (
                      <div className="form-hint">
                        비밀번호는 6-15자의 영문, 숫자, 특수문자를 포함해야 합니다
                      </div>
                    )}
                  </div>
                  
                  {mode === 'register' && (
                    <div className="form-group">
                      <label htmlFor="confirmPassword">
                        <span className="label-icon">🔐</span>
                        비밀번호 확인
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="비밀번호 재입력"
                        className="form-input"
                        autoComplete="new-password"
                      />
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="submit-btn"
                  >
                    {loading ? (
                      <span className="loading">
                        <span className="loading-dot">.</span>
                        <span className="loading-dot">.</span>
                        <span className="loading-dot">.</span>
                      </span>
                    ) : (
                      mode === 'login' ? '접속' : '계정 생성'
                    )}
                  </button>
                </form>
                
                <div className="form-footer">
                  <p>
                    {mode === 'login' ? (
                      <>
                        계정이 없으신가요?{' '}
                        <button onClick={switchMode} className="link-btn">
                          계정 생성
                        </button>
                      </>
                    ) : (
                      <>
                        이미 계정이 있으신가요?{' '}
                        <button onClick={switchMode} className="link-btn">
                          로그인
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="account-footer">
        <div className="footer-info">
          <span>© 2024 MINI AREA</span>
          <span className="separator">|</span>
          <span>Virtual Space System v1.0</span>
          <span className="separator">|</span>
          <span>All rights reserved</span>
        </div>
      </div>
    </div>
  )
}

export default Account