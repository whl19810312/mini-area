import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/Auth.css'

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resending, setResending] = useState(false)
  
  const { register, resendVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    try {
      const result = await register(formData.username, formData.email, formData.password)
      
      if (result && result.success && result.needsEmailVerification) {
        setRegisteredEmail(formData.email)
        setShowEmailVerification(true)
        setError('')
      } else if (result && result.success) {
        const redirectTo = location.state?.from?.pathname || '/'
        navigate(redirectTo, { replace: true })
      } else if (result && result.error) {
        // 서버에서 받은 구체적인 오류 메시지 표시
        setError(result.error)
        
        // 이미 가입된 이메일인 경우 재전송 옵션 제공
        if (result.errorDetails?.canResend) {
          setRegisteredEmail(result.errorDetails.email)
          setShowEmailVerification(true)
        }
      } else {
        setError('회원가입에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      setError('회원가입 중 오류가 발생했습니다.')
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
      const result = await resendVerification(registeredEmail)
      
      if (result.success) {
        setError('인증 이메일이 재전송되었습니다. 이메일을 확인해주세요.')
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
        {!showEmailVerification ? (
          <>
            <h1>mini area 회원가입</h1>
            <p className="auth-subtitle">가상공간을 만들어보세요!</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-group">
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="사용자명을 입력하세요"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <input
                  id="email"
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
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="비밀번호를 입력하세요"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="비밀번호를 다시 입력하세요"
                  className="form-input"
                />
              </div>
              
              <button type="submit" disabled={loading} className="auth-btn">
                {loading ? '회원가입 중...' : '회원가입'}
              </button>
            </form>
            
            <div className="auth-footer">
              <p>이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
            </div>
          </>
        ) : (
          <div className="email-verification-success">
            <div className="success-icon">✓</div>
            <h2>회원가입 완료!</h2>
            <p>이메일 인증이 필요합니다.</p>
            <p><strong>{registeredEmail}</strong>로 인증 이메일을 전송했습니다.</p>
            <p>이메일을 확인하여 인증을 완료해주세요.</p>
            
            <div className="verification-actions">
              <button 
                onClick={() => navigate('/login')} 
                className="auth-button"
              >
                로그인 페이지로 이동
              </button>
              <button 
                onClick={() => setShowEmailVerification(false)} 
                className="auth-button secondary"
              >
                다른 이메일로 다시 가입
              </button>
              <button 
                onClick={handleResendVerification}
                disabled={resending}
                className="auth-button resend"
              >
                {resending ? '전송 중...' : '인증 이메일 재전송'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Register 