import React from 'react';
import './SpeechBubbleButton.css';

const SpeechBubbleButton = ({ onClick }) => {
  return (
    <button 
      className="speech-bubble-button-floating"
      onClick={onClick}
      title="말풍선 텍스트 입력"
    >
      💭
    </button>
  );
};

export default SpeechBubbleButton;