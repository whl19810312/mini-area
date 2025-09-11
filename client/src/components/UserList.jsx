import React, { useState, useEffect } from 'react'
import './UserList.css'

const UserList = ({ onlineUsers = [], onSendMessage, onInviteUser, onRequestUserInfo }) => {
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserInfo, setShowUserInfo] = useState(false)
  const [userInfo, setUserInfo] = useState(null)

  const handleUserClick = (user) => {
    setSelectedUser(user)
    setShowUserInfo(true)
    if (onRequestUserInfo) {
      onRequestUserInfo(user.userId)
    }
  }

  const handleSendPrivateMessage = (userId) => {
    const message = prompt('개인 메시지를 입력하세요:')
    if (message && onSendMessage) {
      onSendMessage(userId, message)
    }
  }

  const handleInviteToPrivateArea = (userId) => {
    if (onInviteUser) {
      onInviteUser(userId, 'private-area', { privateAreaId: 'current' })
    }
  }

  const handleInviteToVideoCall = (userId) => {
    if (onInviteUser) {
      onInviteUser(userId, 'video-call', {})
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#4CAF50'
      case 'in-map':
        return '#2196F3'
      case 'in-private-area':
        return '#FF9800'
      case 'offline':
        return '#9E9E9E'
      default:
        return '#757575'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return '온라인'
      case 'in-map':
        return 'Room'
      case 'in-private-area':
        return '프라이빗 영역'
      case 'offline':
        return '오프라인'
      default:
        return '알 수 없음'
    }
  }

  return (
    <div className="user-list-container">
      <h3>온라인 사용자 ({onlineUsers.length})</h3>
      
      <div className="user-list">
        {onlineUsers.map((user) => (
          <div 
            key={user.userId} 
            className={`user-item ${selectedUser?.userId === user.userId ? 'selected' : ''}`}
            onClick={() => handleUserClick(user)}
          >
            <div className="user-avatar">
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(user.status) }}
              />
            </div>
            <div className="user-info">
              <div className="username">{user.username}</div>
              <div className="status">{getStatusText(user.status)}</div>
              {/* 계산된 영역 정보 표시 */}
              {user.calculatedAreaInfo && (
                <div className="area-info">
                  {user.calculatedAreaType === 'public' && '🌍 퍼블릭 영역'}
                  {user.calculatedAreaType === 'private' && `🔒 프라이빗 영역 ${user.calculatedAreaIndex}`}
                  {user.calculatedAreaType === 'lobby' && '🏠 로비'}
                </div>
              )}
              {/* 기존 currentArea는 fallback으로 유지 */}
              {!user.calculatedAreaInfo && user.currentArea && (
                <div className="area-info">
                  {user.currentArea === 'map' && '🗺️ Room'}
                  {user.currentArea === 'private' && '🔒 프라이빗 영역'}
                  {user.currentArea === 'lobby' && '🏠 로비'}
                </div>
              )}
              {user.position && (
                <div className="position-info">
                  📍 ({Math.round(user.position.x)}, {Math.round(user.position.y)})
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showUserInfo && selectedUser && (
        <div className="user-actions">
          <h4>{selectedUser.username}님</h4>
          
          {/* 사용자 상세 정보 */}
          <div className="user-details">
            {selectedUser.characterInfo && (
              <div className="character-info">
                <strong>캐릭터:</strong> {selectedUser.characterInfo.name}
                {selectedUser.characterInfo.appearance && (
                  <div>🎨 커스텀 캐릭터</div>
                )}
                {selectedUser.characterInfo.images && (
                  <div>🖼️ 이미지 캐릭터</div>
                )}
              </div>
            )}
            
            {selectedUser.position && (
              <div className="position-details">
                <strong>위치:</strong> ({Math.round(selectedUser.position.x)}, {Math.round(selectedUser.position.y)})
              </div>
            )}
            
            {selectedUser.direction && (
              <div className="direction-details">
                <strong>방향:</strong> {selectedUser.direction}
              </div>
            )}
            
            {selectedUser.currentArea && (
              <div className="area-details">
                <strong>현재 영역:</strong> {
                  selectedUser.currentArea === 'map' ? '🗺️ Room' :
                  selectedUser.currentArea === 'private' ? '🔒 프라이빗 영역' :
                  '🏠 로비'
                }
              </div>
            )}
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={() => handleSendPrivateMessage(selectedUser.userId)}
              className="action-btn message-btn"
            >
              개인 메시지
            </button>
            <button 
              onClick={() => handleInviteToPrivateArea(selectedUser.userId)}
              className="action-btn invite-btn"
            >
              프라이빗 영역 초대
            </button>
            <button 
              onClick={() => handleInviteToVideoCall(selectedUser.userId)}
              className="action-btn video-btn"
            >
              화상통화 초대
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserList
