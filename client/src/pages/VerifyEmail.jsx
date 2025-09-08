import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Auth.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('유효하지 않은 인증 링크입니다.');
    }
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await axios.get(`/api/auth/verify-email/${token}`);
      
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
      } else {
        setStatus('error');
        setMessage(response.data.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || '이메일 인증 중 오류가 발생했습니다.');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('이메일 주소를 입력해주세요.');
      return;
    }

    setResendLoading(true);
    try {
      const response = await axios.post('/api/auth/resend-verification', { email });
      
      if (response.data.success) {
        setMessage('인증 이메일이 재전송되었습니다. 이메일을 확인해주세요.');
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || '이메일 재전송 중 오류가 발생했습니다.');
    } finally {
      setResendLoading(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="verifying">
            <div className="loading-spinner"></div>
            <h3>이메일 인증 중...</h3>
            <p>잠시만 기다려주세요.</p>
          </div>
        );

      case 'success':
        return (
          <div className="success">
            <div className="success-icon">✓</div>
            <h3>이메일 인증 완료!</h3>
            <p>{message}</p>
            <div className="verification-actions">
              <button 
                onClick={() => navigate('/login')} 
                className="auth-button"
              >
                로그인하기
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="error">
            <div className="error-icon">✗</div>
            <h3>인증 실패</h3>
            <p>{message}</p>
            
            <div className="resend-section">
              <p>인증 이메일을 다시 받으시겠습니까?</p>
              <input
                type="email"
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
              <button 
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="auth-button"
              >
                {resendLoading ? '전송 중...' : '인증 이메일 재전송'}
              </button>
            </div>
            
            <div className="verification-actions">
              <button 
                onClick={() => navigate('/login')} 
                className="auth-button secondary"
              >
                로그인 페이지로 이동
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {renderContent()}
      </div>
    </div>
  );
};

export default VerifyEmail;
