import React, { useState, useEffect } from 'react';
import './AvatarSelector.css';

// 전신 아바타 데이터 (하나의 완전한 이모지)
const avatarOptions = [
  {
    id: 'running_man',
    name: '달리는 남자',
    englishName: 'Running Man',
    fullBody: '🏃‍♂️',
    color: 'linear-gradient(135deg, #667eea, #764ba2)'
  },
  {
    id: 'running_woman',
    name: '달리는 여자',
    englishName: 'Running Woman',
    fullBody: '🏃‍♀️',
    color: 'linear-gradient(135deg, #f093fb, #f5576c)'
  },
  {
    id: 'walking_man',
    name: '걷는 남자',
    englishName: 'Walking Man',
    fullBody: '🚶‍♂️',
    color: 'linear-gradient(135deg, #4facfe, #00f2fe)'
  },
  {
    id: 'walking_woman',
    name: '걷는 여자',
    englishName: 'Walking Woman',
    fullBody: '🚶‍♀️',
    color: 'linear-gradient(135deg, #a8edea, #fed6e3)'
  },
  {
    id: 'dancing_man',
    name: '춤추는 남자',
    englishName: 'Dancing Man',
    fullBody: '🕺',
    color: 'linear-gradient(135deg, #ffecd2, #fcb69f)'
  },
  {
    id: 'dancing_woman',
    name: '춤추는 여자',
    englishName: 'Dancing Woman',
    fullBody: '💃',
    color: 'linear-gradient(135deg, #ff9a9e, #fecfef)'
  },
  {
    id: 'standing_man',
    name: '서있는 남자',
    englishName: 'Standing Man',
    fullBody: '🧍‍♂️',
    color: 'linear-gradient(135deg, #fddb92, #d1fdff)'
  },
  {
    id: 'standing_woman',
    name: '서있는 여자',
    englishName: 'Standing Woman',
    fullBody: '🧍‍♀️',
    color: 'linear-gradient(135deg, #ffecd2, #fcb69f)'
  },
  {
    id: 'gesturing_man',
    name: '손짓하는 남자',
    englishName: 'Gesturing Man',
    fullBody: '🙋‍♂️',
    color: 'linear-gradient(135deg, #667eea, #764ba2)'
  },
  {
    id: 'gesturing_woman',
    name: '손짓하는 여자',
    englishName: 'Gesturing Woman',
    fullBody: '🙋‍♀️',
    color: 'linear-gradient(135deg, #f093fb, #f5576c)'
  },
  {
    id: 'climbing_man',
    name: '등반하는 남자',
    englishName: 'Climbing Man',
    fullBody: '🧗‍♂️',
    color: 'linear-gradient(135deg, #ff6b35, #f7931e)'
  },
  {
    id: 'climbing_woman',
    name: '등반하는 여자',
    englishName: 'Climbing Woman',
    fullBody: '🧗‍♀️',
    color: 'linear-gradient(135deg, #ff758c, #ff7eb3)'
  },
  {
    id: 'kneeling_man',
    name: '무릎꿇은 남자',
    englishName: 'Kneeling Man',
    fullBody: '🧎‍♂️',
    color: 'linear-gradient(135deg, #ffeaa7, #fab1a0)'
  },
  {
    id: 'kneeling_woman',
    name: '무릎꿇은 여자',
    englishName: 'Kneeling Woman',
    fullBody: '🧎‍♀️',
    color: 'linear-gradient(135deg, #fd79a8, #fdcb6e)'
  },
  {
    id: 'levitating_man',
    name: '명상하는 남자',
    englishName: 'Levitating Man',
    fullBody: '🧘‍♂️',
    color: 'linear-gradient(135deg, #89f7fe, #66a6ff)'
  },
  {
    id: 'levitating_woman',
    name: '명상하는 여자',
    englishName: 'Levitating Woman',
    fullBody: '🧘‍♀️',
    color: 'linear-gradient(135deg, #ddd6fe, #e879f9)'
  }
];

const AvatarSelector = ({ isOpen, onClose, onSelect, currentAvatar }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || avatarOptions[0]);

  useEffect(() => {
    if (currentAvatar) {
      setSelectedAvatar(currentAvatar);
    }
  }, [currentAvatar]);

  const handleSelectAvatar = (avatar) => {
    setSelectedAvatar(avatar);
  };

  const handleConfirm = () => {
    onSelect(selectedAvatar);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="avatar-selector-overlay">
      <div className="avatar-selector-modal">
        <div className="avatar-selector-header">
          <h2>👥 아바타 선택 👥</h2>
          <p>마음에 드는 아바타를 선택해주세요</p>
        </div>

        <div className="avatar-grid">
          {avatarOptions.map((avatar) => (
            <div
              key={avatar.id}
              className={`avatar-item ${selectedAvatar?.id === avatar.id ? 'selected' : ''}`}
              onClick={() => handleSelectAvatar(avatar)}
              title={`${avatar.name} (${avatar.englishName})`}
            >
              <div 
                className="avatar-image"
                style={{ background: avatar.color }}
              >
                <div className="avatar-single-display">
                  <span className="avatar-fullbody-icon">{avatar.fullBody}</span>
                </div>
              </div>
              <div className="avatar-info">
                <div className="avatar-name">{avatar.name}</div>
                <div className="avatar-english">{avatar.englishName}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="avatar-preview">
          <h3>선택된 아바타</h3>
          <div className="preview-item">
            <div 
              className="preview-image"
              style={{ background: selectedAvatar.color }}
            >
              <div className="avatar-single-display preview-size">
                <span className="avatar-fullbody-icon preview-large">{selectedAvatar.fullBody}</span>
              </div>
            </div>
            <div className="preview-info">
              <div className="preview-name">{selectedAvatar.name}</div>
              <div className="preview-english">{selectedAvatar.englishName}</div>
            </div>
          </div>
        </div>

        <div className="avatar-selector-actions">
          <button className="cancel-btn" onClick={onClose}>
            취소
          </button>
          <button className="confirm-btn" onClick={handleConfirm}>
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
};

export { avatarOptions };
export default AvatarSelector;