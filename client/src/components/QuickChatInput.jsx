import React, { useState, useRef, useEffect } from 'react';
import './QuickChatInput.css';

const QuickChatInput = ({ isVisible, onSendMessage, onClose }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim(), 'area'); // 기본적으로 영역 채팅
      setMessage('');
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="quick-chat-overlay" onClick={onClose}>
      <div className="quick-chat-container" onClick={(e) => e.stopPropagation()}>
        <div className="quick-chat-header">
          <span>💬 빠른 채팅</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="quick-chat-form">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Enter: 전송, ESC: 닫기)"
            className="quick-chat-input"
            maxLength={100}
          />
          <button type="submit" className="send-btn" disabled={!message.trim()}>
            전송
          </button>
        </form>
        <div className="quick-chat-hint">
          입력한 메시지가 캐릭터 머리 위에 말풍선으로 표시됩니다
        </div>
      </div>
    </div>
  );
};

export default QuickChatInput;