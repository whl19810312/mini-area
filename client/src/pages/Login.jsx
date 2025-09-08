import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import '../styles/Auth.css'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResendOption, setShowResendOption] = useState(false)
  const [resending, setResending] = useState(false)
  
  const { login, resendVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // URL 파라미터에서 중복 로그인 여부 확인
  const urlParams = new URLSearchParams(location.search)
  const duplicateLogin = urlParams.get('duplicate')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(formData.email, formData.password)
      
      if (result && typeof result === 'object' && result.needsEmailVerification) {
        setError('이메일 인증이 필요합니다. 이메일을 확인하여 인증을 완료해주세요.')
        // 이메일 인증 재전송 옵션 제공
        setShowResendOption(true)
      } else if (result === true) {
        // 리다이렉트 처리
        const redirectTo = location.state?.redirectTo || location.state?.from?.pathname || '/'
        navigate(redirectTo, { replace: true })
      } else {
        setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.')
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

  const handleResendVerification = async () => {
    setResending(true)
    try {
      const result = await resendVerification(formData.email)
      
      if (result.success) {
        setError('인증 이메일이 재전송되었습니다. 이메일을 확인해주세요.')
        setShowResendOption(false)
      } else {
        setError(result.error || '이메일 재전송에 실패했습니다.')
      }
    } catch (error) {
      setError('이메일 재전송 중 오류가 발생했습니다.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>mini area 로그인</h1>
        <p className="auth-subtitle">가상공간을 만들어보세요!</p>
        
        {location.state?.message && (
          <div className="info-message">
            {location.state.message}
          </div>
        )}
        
        {duplicateLogin && (
          <div className="warning-message">
            ⚠️ 이미 다른 창에서 로그인되어 있습니다. 기존 연결을 종료한 후 다시 시도해주세요.
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        {showResendOption && (
          <div className="resend-verification">
            <p>이메일을 받지 못하셨나요?</p>
            <button 
              type="button" 
              onClick={handleResendVerification}
              disabled={resending}
              className="resend-btn"
            >
              {resending ? '전송 중...' : '인증 이메일 재전송'}
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="이메일을 입력하세요"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="비밀번호를 입력하세요"
              className="form-input"
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>계정이 없으신가요? <Link to="/register">회원가입</Link></p>
        </div>
      </div>
    </div>
  )
}

export default Login 