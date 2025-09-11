import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import '../styles/AreaUserList.css';

const AreaUserList = ({ 
  currentArea, 
  allMapUsers, 
  currentUserArea, 
  currentUserId,
  socket,
  isVisible, 
  onClose 
}) => {
  const { user } = useAuth();
  const [areaUsers, setAreaUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userProfiles, setUserProfiles] = useState(new Map());
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userInteractionHistory, setUserInteractionHistory] = useState(new Map());

  // 영역 사용자 목록 요청
  const requestAreaUsers = () => {
    if (!socket || !currentArea) return;

    setLoading(true);
    socket.emit('get-area-users', {
      areaType: currentArea.type,
      areaId: currentArea.id
    });
  };

  // 영역 기반 그룹 상호작용 시작
  const startAreaInteraction = (interactionType = 'group_chat') => {
    if (!socket || !currentArea) return;

    if (areaUsers.length === 0) {
      toast.error('현재 영역에 다른 사용자가 없습니다.');
      return;
    }

    socket.emit('start-area-interaction', {
      areaType: currentArea.type,
      areaId: currentArea.id,
      interactionType
    });
  };

  // 사용자 상세 정보 요청
  const requestUserDetails = (userId) => {
    if (!socket || !userId || userId === currentUserId) return;
    
    socket.emit('request-user-profile', { targetUserId: userId });
    setSelectedUser(userId);
    setShowUserProfile(true);
  };

  // 실시간 사용자 상태 업데이트 브로드캐스트
  const broadcastUserStatus = (status, additionalInfo = {}) => {
    if (!socket) return;
    
    socket.emit('broadcast-user-status', {
      status,
      position: additionalInfo.position,
      activity: additionalInfo.activity,
      timestamp: Date.now()
    });
  };

  // 소켓 이벤트 리스너 설정
  useEffect(() => {
    if (!socket) return;

    const handleAreaUsersList = (data) => {
      console.log('📋 영역 사용자 목록 수신:', data);
      setAreaUsers(data.users || []);
      setLoading(false);
    };

    const handleUserProfileResponse = (data) => {
      console.log('👤 사용자 프로필 수신:', data);
      setUserProfiles(prev => new Map(prev.set(data.userId, data.profile)));
    };

    const handleUserStatusBroadcast = (data) => {
      console.log('📡 사용자 상태 브로드캐스트 수신:', data);
      // 실시간 사용자 상태 업데이트 처리
      setAreaUsers(prev => 
        prev.map(user => 
          user.userId === data.userId 
            ? { ...user, ...data.status, lastStatusUpdate: data.timestamp }
            : user
        )
      );
    };

    const handleUserInteractionHistory = (data) => {
      console.log('📝 사용자 상호작용 기록 수신:', data);
      setUserInteractionHistory(prev => new Map(prev.set(data.userId, data.history)));
    };

    const handleAreaInteractionInvitation = (data) => {
      console.log('🎪 영역 상호작용 초대 수신:', data);
      toast.success(`${data.invitedBy}님이 그룹 ${data.interactionType} 상호작용을 시작했습니다!`, {
        duration: 5000
      });
    };

    const handleAreaInteractionStarted = (data) => {
      console.log('✅ 영역 상호작용 시작됨:', data);
      toast.success(data.message);
    };

    const handleAreaInteractionError = (data) => {
      console.log('❌ 영역 상호작용 오류:', data);
      toast.error(data.message);
      setLoading(false);
    };

    socket.on('area-users-list', handleAreaUsersList);
    socket.on('user-profile-response', handleUserProfileResponse);
    socket.on('user-status-broadcast', handleUserStatusBroadcast);
    socket.on('user-interaction-history', handleUserInteractionHistory);
    socket.on('area-interaction-invitation', handleAreaInteractionInvitation);
    socket.on('area-interaction-started', handleAreaInteractionStarted);
    socket.on('area-interaction-error', handleAreaInteractionError);

    return () => {
      socket.off('area-users-list', handleAreaUsersList);
      socket.off('user-profile-response', handleUserProfileResponse);
      socket.off('user-status-broadcast', handleUserStatusBroadcast);
      socket.off('user-interaction-history', handleUserInteractionHistory);
      socket.off('area-interaction-invitation', handleAreaInteractionInvitation);
      socket.off('area-interaction-started', handleAreaInteractionStarted);
      socket.off('area-interaction-error', handleAreaInteractionError);
    };
  }, [socket]);

  // 영역이 변경될 때마다 자동으로 사용자 목록 요청
  useEffect(() => {
    if (isVisible && currentArea) {
      requestAreaUsers();
    }
  }, [isVisible, currentArea]);

  // 개인 메시지 전송
  const sendPrivateMessage = (targetUser) => {
    const message = prompt(`${targetUser.username}님에게 개인 메시지:`);
    if (message && socket) {
      socket.emit('send-private-message', {
        targetUserId: targetUser.userId,
        message: message
      });
      toast.success(`${targetUser.username}님에게 메시지를 전송했습니다.`);
    }
  };

  // 사용자 정보 표시 (향상된 버전)
  const UserItem = ({ userData, isCurrentUser }) => {
    const userProfile = userProfiles.get(userData.userId);
    const interactionHistory = userInteractionHistory.get(userData.userId);

    return (
      <div 
        className={`area-user-item ${isCurrentUser ? 'current-user' : ''}`}
        onClick={() => !isCurrentUser && requestUserDetails(userData.userId)}
      >
        <div className="user-avatar">
          <div 
            className="status-indicator"
            style={{ 
              backgroundColor: getStatusColor(userData.status)
            }}
          />
          {userData.characterInfo?.avatar && (
            <img 
              src={userData.characterInfo.avatar} 
              alt={userData.username}
              className="user-avatar-img"
            />
          )}
          {!userData.characterInfo?.avatar && (
            <div className="default-avatar">
              {getUserStatusIcon(userData)}
            </div>
          )}
          
          {/* 실시간 활동 표시 */}
          {userData.isInVideoCall && (
            <div className="activity-badge video-call">📹</div>
          )}
          {userData.isMoving && (
            <div className="activity-badge moving">🏃</div>
          )}
        </div>
        
        <div className="user-info">
          <div className="username">
            {userData.username}
            {isCurrentUser && <span className="current-user-label"> (나)</span>}
          </div>
          <div className="user-status">
            {getStatusText(userData.status)}
            {userData.lastStatusUpdate && (
              <span className="status-time">
                · {new Date(userData.lastStatusUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
          {userData.position && (
            <div className="user-position">
              📍 ({Math.round(userData.position.x)}, {Math.round(userData.position.y)})
            </div>
          )}
          
          {/* 추가 사용자 정보 */}
          {userProfile && (
            <div className="user-details">
              {userProfile.level && (
                <span className="user-level">Lv.{userProfile.level}</span>
              )}
              {userProfile.joinedDate && (
                <span className="join-date">
                  가입: {new Date(userProfile.joinedDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
          
          {/* 상호작용 기록 표시 */}
          {interactionHistory && (
            <div className="interaction-history">
              <span className="interaction-count">
                {interactionHistory.totalInteractions}회 상호작용
              </span>
            </div>
          )}
        </div>

        {!isCurrentUser && (
          <div className="user-actions">
            <button 
              className="action-btn message-btn"
              onClick={(e) => {
                e.stopPropagation();
                sendPrivateMessage(userData);
              }}
              title="개인 메시지"
            >
              💬
            </button>
            <button 
              className="action-btn profile-btn"
              onClick={(e) => {
                e.stopPropagation();
                requestUserDetails(userData.userId);
              }}
              title="프로필 보기"
            >
              👤
            </button>
          </div>
        )}
      </div>
    );
  };

  // 사용자 상태 아이콘
  const getUserStatusIcon = (userData) => {
    if (userData.userId === currentUserId) return '👤';
    if (userData.isActive === false) return '💤';
    if (userData.isInVideoCall) return '📹';
    if (userData.isMoving) return '🏃';
    return '👋';
  };

  // 상태 색상 반환
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'in-map': return '#2196F3';
      case 'in-private-area': return '#FF9800';
      case 'offline': return '#9E9E9E';
      default: return '#757575';
    }
  };

  // 상태 텍스트 반환
  const getStatusText = (status) => {
    switch (status) {
      case 'online': return '온라인';
      case 'in-map': return '맵 활동 중';
      case 'in-private-area': return '프라이빗 영역';
      case 'offline': return '오프라인';
      default: return '알 수 없음';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="area-user-list-overlay">
      <div className="area-user-list-container">
        <div className="area-user-list-header">
          <h3>
            {currentArea.name || `${currentArea.type} 영역`} 사용자 목록
            <span className="user-count">({areaUsers.length}명)</span>
          </h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="area-info">
          <div className="area-type-badge area-type-{currentArea.type}">
            {currentArea.type === 'private' && '🔒 프라이빗'}
            {currentArea.type === 'public' && '🌐 퍼블릭'}
            {currentArea.type === 'lobby' && '🏠 로비'}
          </div>
          {currentArea.id && (
            <div className="area-id">ID: {currentArea.id}</div>
          )}
        </div>

        {loading && (
          <div className="loading">
            <div className="loading-spinner">⏳</div>
            사용자 목록을 불러오는 중...
          </div>
        )}

        {!loading && (
          <>
            <div className="area-user-list">
              {areaUsers.length === 0 ? (
                <div className="no-users">
                  <p>현재 이 영역에 다른 사용자가 없습니다.</p>
                </div>
              ) : (
                areaUsers.map((userData) => (
                  <UserItem
                    key={userData.userId}
                    userData={userData}
                    isCurrentUser={userData.userId === user?.id}
                  />
                ))
              )}
            </div>

            {areaUsers.length > 1 && (
              <div className="area-actions">
                <h4>영역 상호작용</h4>
                <div className="action-buttons">
                  <button
                    className="interaction-btn group-chat-btn"
                    onClick={() => startAreaInteraction('group_chat')}
                  >
                    🗨️ 그룹 채팅 시작
                  </button>
                  <button
                    className="interaction-btn group-activity-btn"
                    onClick={() => startAreaInteraction('group_activity')}
                  >
                    🎮 그룹 활동 시작
                  </button>
                </div>
                <p className="interaction-info">
                  현재 영역의 모든 사용자({areaUsers.length}명)와 상호작용할 수 있습니다.
                </p>
              </div>
            )}
          </>
        )}

        <div className="area-user-list-footer">
          <button 
            className="refresh-btn"
            onClick={requestAreaUsers}
            disabled={loading}
          >
            🔄 새로고침
          </button>
          
          <button 
            className="broadcast-status-btn"
            onClick={() => broadcastUserStatus('active', { 
              position: user?.position,
              activity: 'browsing_users'
            })}
          >
            📡 상태 브로드캐스트
          </button>
        </div>
      </div>

      {/* 사용자 프로필 상세 모달 */}
      {showUserProfile && selectedUser && (
        <div className="user-profile-modal-overlay" onClick={() => setShowUserProfile(false)}>
          <div className="user-profile-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>사용자 프로필</h3>
              <button onClick={() => setShowUserProfile(false)}>✕</button>
            </div>
            
            <div className="profile-content">
              {userProfiles.get(selectedUser) ? (
                <UserProfileDetails 
                  userId={selectedUser}
                  profile={userProfiles.get(selectedUser)}
                  interactionHistory={userInteractionHistory.get(selectedUser)}
                />
              ) : (
                <div className="loading-profile">
                  <div className="loading-spinner">⏳</div>
                  프로필을 불러오는 중...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 사용자 프로필 상세 컴포넌트
const UserProfileDetails = ({ userId, profile, interactionHistory }) => {
  return (
    <div className="user-profile-details">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.characterInfo?.avatar ? (
            <img src={profile.characterInfo.avatar} alt={profile.username} />
          ) : (
            <div className="default-profile-avatar">👤</div>
          )}
        </div>
        <div className="profile-info">
          <h4>{profile.username}</h4>
          <p className="user-id">ID: {userId}</p>
          {profile.level && <p className="user-level">Level: {profile.level}</p>}
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-item">
          <span className="stat-label">가입일:</span>
          <span className="stat-value">
            {profile.joinedDate ? new Date(profile.joinedDate).toLocaleDateString() : '알 수 없음'}
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">마지막 접속:</span>
          <span className="stat-value">
            {profile.lastLoginDate ? new Date(profile.lastLoginDate).toLocaleString() : '알 수 없음'}
          </span>
        </div>

        <div className="stat-item">
          <span className="stat-label">총 플레이 시간:</span>
          <span className="stat-value">
            {profile.totalPlayTime ? `${Math.round(profile.totalPlayTime / 60)}분` : '알 수 없음'}
          </span>
        </div>
      </div>

      {interactionHistory && (
        <div className="interaction-stats">
          <h5>상호작용 기록</h5>
          <div className="interaction-summary">
            <div className="interaction-item">
              <span>총 상호작용:</span>
              <span>{interactionHistory.totalInteractions || 0}회</span>
            </div>
            <div className="interaction-item">
              <span>메시지 교환:</span>
              <span>{interactionHistory.messageCount || 0}회</span>
            </div>
            <div className="interaction-item">
              <span>화상통화:</span>
              <span>{interactionHistory.videoCallCount || 0}회</span>
            </div>
            <div className="interaction-item">
              <span>마지막 상호작용:</span>
              <span>
                {interactionHistory.lastInteraction 
                  ? new Date(interactionHistory.lastInteraction).toLocaleString()
                  : '없음'
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {profile.bio && (
        <div className="user-bio">
          <h5>소개</h5>
          <p>{profile.bio}</p>
        </div>
      )}
    </div>
  );
};

export default AreaUserList;