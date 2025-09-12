import React, { useState, useEffect, useRef } from 'react';
import './SpeechBubbleInput.css';

const SpeechBubbleInput = ({ isVisible, onSendMessage, onClose }) => {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="speech-bubble-input-overlay" onClick={onClose}>
      <div className="speech-bubble-input-container" onClick={(e) => e.stopPropagation()}>
        <div className="speech-bubble-input-header">
          <span>💭 말풍선 메시지</span>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="speech-bubble-input-form">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="말풍선으로 표시할 메시지를 입력하세요..."
            rows={3}
            maxLength={100}
            className="speech-bubble-input-textarea"
          />
          <div className="speech-bubble-input-actions">
            <span className="character-count">{text.length}/100</span>
            <div>
              <button type="button" onClick={onClose} className="cancel-button">
                취소
              </button>
              <button type="submit" disabled={!text.trim()} className="send-button">
                전송
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpeechBubbleInput;