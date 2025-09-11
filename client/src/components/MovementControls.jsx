import React from 'react';
import './MovementControls.css';

const MovementControls = ({ onMove, onOpenChat }) => {
  const handleMove = (direction) => {
    const moveSpeed = 10;
    const movements = {
      up: { x: 0, y: -moveSpeed },
      down: { x: 0, y: moveSpeed },
      left: { x: -moveSpeed, y: 0 },
      right: { x: moveSpeed, y: 0 }
    };

    onMove(movements[direction], direction);
  };

  return (
    <div className="movement-controls">
      {/* 채팅 버튼 */}
      <button 
        className="chat-button"
        onClick={onOpenChat}
        title="빠른 채팅 (Enter)"
      >
        💬
      </button>

      {/* 이동 화살표 */}
      <div className="movement-arrows">
        <button 
          className="arrow-button arrow-up"
          onClick={() => handleMove('up')}
          title="위로 이동"
        >
          ↑
        </button>
        
        <div className="arrow-middle">
          <button 
            className="arrow-button arrow-left"
            onClick={() => handleMove('left')}
            title="왼쪽으로 이동"
          >
            ←
          </button>
          <button 
            className="arrow-button arrow-right"
            onClick={() => handleMove('right')}
            title="오른쪽으로 이동"
          >
            →
          </button>
        </div>
        
        <button 
          className="arrow-button arrow-down"
          onClick={() => handleMove('down')}
          title="아래로 이동"
        >
          ↓
        </button>
      </div>
    </div>
  );
};

export default MovementControls;