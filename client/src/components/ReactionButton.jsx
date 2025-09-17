import React, { useState } from 'react';
import '../styles/ReactionButton.css';

const ReactionButton = ({ reactions = {}, currentUserReaction, onReactionChange, postId }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  const reactionTypes = [
    { emoji: '❤️', name: 'love', label: '좋아요' },
    { emoji: '😂', name: 'laugh', label: '웃긴' },
    { emoji: '😮', name: 'wow', label: '놀라워' },
    { emoji: '😢', name: 'sad', label: '슬퍼' },
    { emoji: '😡', name: 'angry', label: '화나' },
    { emoji: '👍', name: 'like', label: '좋음' },
    { emoji: '🔥', name: 'fire', label: '멋져' },
    { emoji: '🎉', name: 'celebrate', label: '축하' }
  ];

  const getTotalReactions = () => {
    return Object.values(reactions).reduce((sum, count) => sum + count, 0);
  };

  const handleReactionClick = (reactionName) => {
    onReactionChange(postId, reactionName);
    setShowReactionPicker(false);
  };

  const handleQuickReaction = () => {
    if (currentUserReaction) {
      // 이미 반응했으면 취소
      onReactionChange(postId, null);
    } else {
      // 기본 좋아요
      onReactionChange(postId, 'love');
    }
  };

  const getTopReactions = () => {
    return Object.entries(reactions)
      .filter(([_, count]) => count > 0)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
  };

  return (
    <div className="reaction-button-container">
      <div className="reaction-actions">
        <button
          className={`quick-reaction-btn ${currentUserReaction ? 'reacted' : ''}`}
          onClick={handleQuickReaction}
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setTimeout(() => setShowReactionPicker(false), 200)}
        >
          {currentUserReaction 
            ? reactionTypes.find(r => r.name === currentUserReaction)?.emoji 
            : '❤️'
          }
          <span className="reaction-count">{getTotalReactions()}</span>
        </button>

        {showReactionPicker && (
          <div 
            className="reaction-picker"
            onMouseEnter={() => setShowReactionPicker(true)}
            onMouseLeave={() => setShowReactionPicker(false)}
          >
            {reactionTypes.map((reaction) => (
              <button
                key={reaction.name}
                className={`reaction-option ${currentUserReaction === reaction.name ? 'selected' : ''}`}
                onClick={() => handleReactionClick(reaction.name)}
                title={reaction.label}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {getTotalReactions() > 0 && (
        <div className="reactions-summary">
          {getTopReactions().map(([reactionName, count]) => {
            const reaction = reactionTypes.find(r => r.name === reactionName);
            return (
              <span key={reactionName} className="reaction-summary-item">
                {reaction?.emoji} {count}
              </span>
            );
          })}
          {getTotalReactions() > 3 && (
            <span className="more-reactions">
              +{getTotalReactions() - getTopReactions().reduce((sum, [,count]) => sum + count, 0)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ReactionButton;