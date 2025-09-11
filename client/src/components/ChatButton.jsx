import React from 'react';
import './ChatButton.css';

const ChatButton = ({ onClick }) => {
  return (
    <button 
      className="chat-button-floating"
      onClick={onClick}
      title="빠른 채팅 (Enter)"
    >
      💬
    </button>
  );
};

export default ChatButton;