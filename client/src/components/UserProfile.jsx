import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/UserProfile.css';

const UserProfile = () => {
  const { user, token, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.success) {
          setProfileData(response.data.user);
        } else {
          setError('프로필 정보를 가져올 수 없습니다.');
        }
      } catch (error) {
        console.error('프로필 조회 오류:', error);
        setError('프로필 정보를 가져오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="user-profile">
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>프로필 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile">
        <div className="profile-error">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="user-profile">
        <div className="profile-error">
          <p>프로필 정보가 없습니다.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getNetworkType = (ip) => {
    if (!ip) return '알 수 없음';
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return '내부 네트워크';
    }
    return '외부 네트워크';
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const success = await deleteAccount();
      if (success) {
        navigate('/');
      }
    } catch (error) {
      console.error('계정 삭제 오류:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>👤 사용자 프로필</h2>
      </div>

      <div className="profile-section">
        <h3>📋 기본 정보</h3>
        <div className="profile-info">
          <div className="info-item">
            <span className="label">사용자명:</span>
            <span className="value">{profileData.username}</span>
          </div>
          <div className="info-item">
            <span className="label">이메일:</span>
            <span className="value">{profileData.email}</span>
          </div>
          <div className="info-item">
            <span className="label">가입일:</span>
            <span className="value">{formatDate(profileData.createdAt)}</span>
          </div>
          <div className="info-item">
            <span className="label">계정 상태:</span>
            <span className={`value status ${profileData.isActive ? 'active' : 'inactive'}`}>
              {profileData.isActive ? '활성' : '비활성'}
            </span>
          </div>
          <div className="info-item">
            <span className="label">이메일 인증:</span>
            <span className={`value status ${profileData.emailVerified ? 'verified' : 'unverified'}`}>
              {profileData.emailVerified ? '인증됨' : '미인증'}
            </span>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3>🌐 연결 정보</h3>
        <div className="profile-info">
          <div className="info-item">
            <span className="label">현재 IP:</span>
            <span className="value ip-info">
              {profileData.currentIp || '알 수 없음'}
              <span className="network-type">
                ({getNetworkType(profileData.currentIp)})
              </span>
            </span>
          </div>
          <div className="info-item">
            <span className="label">이전 로그인 IP:</span>
            <span className="value ip-info">
              {profileData.lastLoginIp || '알 수 없음'}
              <span className="network-type">
                ({getNetworkType(profileData.lastLoginIp)})
              </span>
            </span>
          </div>
          {profileData.connectionInfo && (
            <>
              <div className="info-item">
                <span className="label">브라우저:</span>
                <span className="value">{profileData.connectionInfo.browser || '알 수 없음'}</span>
              </div>
              <div className="info-item">
                <span className="label">운영체제:</span>
                <span className="value">{profileData.connectionInfo.os || '알 수 없음'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {profileData.ipHistory && profileData.ipHistory.length > 0 && (
        <div className="profile-section">
          <h3>📊 IP 접속 히스토리</h3>
          <div className="ip-history">
            {profileData.ipHistory.map((entry, index) => (
              <div key={index} className="ip-history-item">
                <div className="ip-entry">
                  <span className="ip-address">{entry.ip}</span>
                  <span className="ip-timestamp">{formatDate(entry.timestamp)}</span>
                </div>
                {entry.connectionInfo && (
                  <div className="ip-details">
                    <span className="browser">{entry.connectionInfo.browser}</span>
                    <span className="os">{entry.connectionInfo.os}</span>
                    {entry.connectionInfo.isMobile && (
                      <span className="mobile-badge">📱</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {profileData.connectionOptimization && (
        <div className="profile-section">
          <h3>⚡ 연결 최적화</h3>
          <div className="profile-info">
            <div className="info-item">
              <span className="label">네트워크 타입:</span>
              <span className="value">{profileData.connectionOptimization.networkType || '알 수 없음'}</span>
            </div>
            <div className="info-item">
              <span className="label">ICE 정책:</span>
              <span className="value">{profileData.connectionOptimization.iceTransportPolicy || 'all'}</span>
            </div>
            <div className="info-item">
              <span className="label">STUN 서버:</span>
              <span className="value">
                {profileData.connectionOptimization.iceServers?.length || 0}개 설정됨
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="profile-section danger-zone">
        <h3>⚠️ 위험 영역</h3>
        <div className="danger-actions">
          <div className="danger-warning">
            <p>⚠️ 계정 삭제는 되돌릴 수 없는 작업입니다. 모든 데이터가 영구적으로 삭제됩니다.</p>
          </div>
          <button 
            className="delete-account-btn"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? '삭제 중...' : '🗑️ 계정 삭제'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
