import React, { useState, useEffect, useRef } from 'react'
import './ChatWindow.css'

const ChatWindow = ({ currentArea, isVisible, onSendMessage, messages = [], onlineUsers = [] }) => {
  const [message, setMessage] = useState('')
  const [chatMode, setChatMode] = useState('area') // 'area', 'global', 'private'
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState('') // 선택된 userId 별도 저장
  const [unreadCounts, setUnreadCounts] = useState({}) // 사용자별 읽지 않은 메시지 수
  const messagesEndRef = useRef(null)

  // 필터링된 메시지 계산
  const filteredMessages = messages.filter(msg => {
    // 쪽지 모드일 때는 선택된 사용자와의 대화만 표시
    if (chatMode === 'private' && selectedUserId) {
      if (msg.type !== 'private') return false;
      
      // 내가 보낸 쪽지: toUserId가 선택된 사용자와 일치
      // 내가 받은 쪽지: fromUserId가 선택된 사용자와 일치
      const isToSelected = msg.isSent && (
        String(msg.toUserId) === String(selectedUserId) ||
        msg.toUsername === selectedUser?.username
      );
      const isFromSelected = msg.isReceived && (
        String(msg.fromUserId) === String(selectedUserId) ||
        msg.fromUsername === selectedUser?.username
      );
      
      return isToSelected || isFromSelected;
    }
    
    // 쪽지 모드가 아니면 해당 모드의 메시지만 표시
    if (chatMode === 'private') {
      return msg.type === 'private';
    } else if (chatMode === 'global') {
      return msg.type === 'global';
    } else {
      // area 모드: area 메시지와 type이 없는 메시지(기본값) 표시
      return msg.type === 'area' || !msg.type || msg.type === 'user' || msg.type === 'other';
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [filteredMessages])
  
  // 선택된 사용자 정보 업데이트
  useEffect(() => {
    if (selectedUserId && onlineUsers.length > 0) {
      const user = onlineUsers.find(u => u.userId === selectedUserId)
      if (user) {
        setSelectedUser(user)
        // 선택한 사용자의 읽지 않은 메시지 수 초기화
        setUnreadCounts(prev => ({
          ...prev,
          [selectedUserId]: 0
        }))
      }
    }
  }, [onlineUsers, selectedUserId])
  
  // 새 쪽지 메시지가 도착했을 때 읽지 않은 수 업데이트
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.type === 'private' && lastMessage.isReceived) {
      const senderId = lastMessage.fromUserId
      // 현재 선택된 사용자가 아닌 경우에만 카운트 증가
      if (String(senderId) !== String(selectedUserId)) {
        setUnreadCounts(prev => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1
        }))
      }
    }
  }, [messages, selectedUserId])

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted:', { message, chatMode, selectedUserId, selectedUser })
    
    if (message.trim()) {
      // 1:1 모드에서 대상이 선택되지 않았으면 경고
      if (chatMode === 'private' && (!selectedUserId || !selectedUser)) {
        alert('쪽지를 보낼 대상을 먼저 선택해주세요.')
        return
      }
      
      const targetId = chatMode === 'private' ? (selectedUserId || selectedUser?.userId || null) : null
      console.log('Calling onSendMessage with:', { message, chatMode, targetId })
      onSendMessage(message, chatMode, targetId)
      setMessage('')
    }
  }

  const getAreaTypeText = () => {
    switch(chatMode) {
      case 'global':
        return '🌐 전체 채팅'
      case 'private':
        return selectedUser ? `💌 1:1 쪽지 → ${selectedUser.username}` : '💌 1:1 쪽지 (대상 선택)'
      case 'area':
      default:
        return `🗨️ 영역 채팅${currentArea?.mapName ? ` - ${currentArea.mapName}` : ''}`
    }
  }
  
  const handleModeChange = (newMode) => {
    setChatMode(newMode)
    if (newMode !== 'private') {
      setSelectedUser(null)
      setSelectedUserId('')
    }
  }

  if (!isVisible) return null

  return (
    <div 
      className="chat-window"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="chat-header">
        <h3>{getAreaTypeText()}</h3>
        <div className="chat-mode-selector">
          <button 
            className={`mode-btn ${chatMode === 'area' ? 'active' : ''}`}
            onClick={() => handleModeChange('area')}
            title="같은 영역 사용자들과 채팅"
          >
            영역
          </button>
          <button 
            className={`mode-btn ${chatMode === 'global' ? 'active' : ''}`}
            onClick={() => handleModeChange('global')}
            title="모든 사용자와 채팅"
          >
            전체
          </button>
          <button 
            className={`mode-btn ${chatMode === 'private' ? 'active' : ''}`}
            onClick={() => handleModeChange('private')}
            title="특정 사용자에게 쪽지 보내기"
          >
            쪽지
          </button>
        </div>
      </div>
      
      {/* 쪽지 모드일 때 사용자 선택 */}
      {chatMode === 'private' && (
        <div className="user-selector" style={{
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <label style={{ marginRight: '10px', fontSize: '14px' }}>쪽지 받을 사람:</label>
          <select 
            value={selectedUserId} 
            onChange={(e) => {
              const userId = e.target.value
              setSelectedUserId(userId)
              if (userId) {
                // userId를 문자열과 숫자 모두로 비교
                const user = onlineUsers.find(u => 
                  u.userId === userId || 
                  u.userId === parseInt(userId) || 
                  String(u.userId) === String(userId)
                )
                console.log('Selected user:', user, 'from userId:', userId, 'onlineUsers:', onlineUsers)
                setSelectedUser(user)
              } else {
                setSelectedUser(null)
              }
            }}
            className="user-select-dropdown"
            style={{
              padding: '5px 10px',
              borderRadius: '5px',
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              color: '#333'
            }}
          >
            <option value="">대상을 선택하세요...</option>
            {onlineUsers.map(user => (
              <option key={user.userId} value={user.userId}>
                {user.username}
              </option>
            ))}
          </select>
          {selectedUser && selectedUserId && (
            <span style={{ marginLeft: '10px', color: '#4CAF50', fontSize: '13px' }}>
              ✓ {selectedUser.username}님에게 쪽지를 보냅니다
            </span>
          )}
        </div>
      )}
      
      <div className="chat-messages">
        {/* 쪽지 모드에서 사용자를 선택하지 않았을 때 안내 메시지 */}
        {chatMode === 'private' && !selectedUserId && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px'
          }}>
            쪽지를 보낼 사용자를 선택해주세요
          </div>
        )}
        
        {/* 쪽지 모드에서 대화 내역이 없을 때 */}
        {chatMode === 'private' && selectedUserId && filteredMessages.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px'
          }}>
            {selectedUser?.username}님과의 대화가 없습니다.<br />
            첫 메시지를 보내보세요!
          </div>
        )}
        
        {filteredMessages.map((msg, index) => {
          // 쪽지 메시지인지 확인
          const isPrivateMessage = msg.type === 'private'
          const messageStyle = isPrivateMessage ? {
            background: msg.isSent ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)',
            borderLeft: msg.isSent ? '3px solid #4CAF50' : '3px solid #2196F3',
            marginLeft: msg.isSent ? '20px' : '0',
            marginRight: msg.isSent ? '0' : '20px',
          } : {}
          
          return (
            <div 
              key={msg.messageId || `msg-${index}`} 
              className={`message ${msg.type || 'user'}`}
              style={messageStyle}
            >
              <div className="message-header">
                <span className="username">
                  {msg.type === 'private' && msg.isReceived ? (
                    <>💌 받은 쪽지: {msg.fromUsername || msg.username}</>
                  ) : msg.type === 'private' && msg.isSent ? (
                    <>💌 보낸 쪽지: {msg.toUsername || '대상'}님에게</>
                  ) : (
                    msg.username
                  )}
                </span>
                <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              {msg.content && msg.content.trim() !== '' && (
                <div className="message-content">{msg.content}</div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            chatMode === 'private' 
              ? (selectedUserId && selectedUser ? `${selectedUser.username}님에게 쪽지 보내기...` : '먼저 쪽지 받을 사람을 선택하세요...')
              : chatMode === 'global' 
                ? '전체 메시지를 입력하세요...'
                : '영역 메시지를 입력하세요...'
          }
          className="chat-input"
          disabled={chatMode === 'private' && (!selectedUserId || !selectedUser)}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={chatMode === 'private' && (!selectedUserId || !selectedUser)}
        >
          {chatMode === 'private' ? '쪽지 보내기' : '전송'}
        </button>
      </form>
    </div>
  )
}

export default ChatWindow 