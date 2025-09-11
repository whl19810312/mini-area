import React from 'react';
import './SpeechBubble.css';

const SpeechBubble = ({ message, position, isVisible, onHide }) => {
  if (!isVisible || !message) return null;

  return (
    <div 
      className="speech-bubble"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y - 60}px`, // 캐릭터 머리 위 60px
        zIndex: 1000,
        pointerEvents: 'none' // 클릭 이벤트 차단
      }}
    >
      <div className="bubble-content">
        {message}
      </div>
      <div className="bubble-tail"></div>
    </div>
  );
};

export default SpeechBubble;