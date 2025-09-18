import React, { useState, useEffect } from 'react';
import './AvatarSelector.css';

// 간단한 아이콘 스타일의 아바타 데이터
const avatarOptions = [
  {
    id: 'male_business',
    name: '비즈니스맨',
    englishName: 'Businessman',
    icon: '👨‍💼',
    color: 'linear-gradient(135deg, #667eea, #764ba2)'
  },
  {
    id: 'female_business',
    name: '비즈니스우먼',
    englishName: 'Businesswoman',
    icon: '👩‍💼',
    color: 'linear-gradient(135deg, #f093fb, #f5576c)'
  },
  {
    id: 'male_developer',
    name: '개발자',
    englishName: 'Developer',
    icon: '👨‍💻',
    color: 'linear-gradient(135deg, #4facfe, #00f2fe)'
  },
  {
    id: 'female_developer',
    name: '개발자',
    englishName: 'Developer',
    icon: '👩‍💻',
    color: 'linear-gradient(135deg, #a8edea, #fed6e3)'
  },
  {
    id: 'male_student',
    name: '학생',
    englishName: 'Student',
    icon: '👨‍🎓',
    color: 'linear-gradient(135deg, #ffecd2, #fcb69f)'
  },
  {
    id: 'female_student',
    name: '학생',
    englishName: 'Student',
    icon: '👩‍🎓',
    color: 'linear-gradient(135deg, #a8edea, #fed6e3)'
  },
  {
    id: 'male_artist',
    name: '아티스트',
    englishName: 'Artist',
    icon: '👨‍🎨',
    color: 'linear-gradient(135deg, #ffecd2, #fcb69f)'
  },
  {
    id: 'female_artist',
    name: '아티스트',
    englishName: 'Artist',
    icon: '👩‍🎨',
    color: 'linear-gradient(135deg, #ff9a9e, #fecfef)'
  },
  {
    id: 'male_teacher',
    name: '선생님',
    englishName: 'Teacher',
    icon: '👨‍🏫',
    color: 'linear-gradient(135deg, #fddb92, #d1fdff)'
  },
  {
    id: 'female_teacher',
    name: '선생님',
    englishName: 'Teacher',
    icon: '👩‍🏫',
    color: 'linear-gradient(135deg, #ffecd2, #fcb69f)'
  },
  {
    id: 'male_casual',
    name: '캐주얼',
    englishName: 'Casual',
    icon: '🙋‍♂️',
    color: 'linear-gradient(135deg, #667eea, #764ba2)'
  },
  {
    id: 'female_casual',
    name: '캐주얼',
    englishName: 'Casual',
    icon: '🙋‍♀️',
    color: 'linear-gradient(135deg, #f093fb, #f5576c)'
  },
  {
    id: 'person_basic',
    name: '기본',
    englishName: 'Basic',
    icon: '👤',
    color: 'linear-gradient(135deg, #89f7fe, #66a6ff)'
  },
  {
    id: 'male_beard',
    name: '수염남',
    englishName: 'Bearded',
    icon: '🧔',
    color: 'linear-gradient(135deg, #667eea, #764ba2)'
  },
  {
    id: 'female_blonde',
    name: '금발',
    englishName: 'Blonde',
    icon: '👱‍♀️',
    color: 'linear-gradient(135deg, #ffeaa7, #fab1a0)'
  },
  {
    id: 'elderly_man',
    name: '어르신',
    englishName: 'Elderly',
    icon: '👨‍🦳',
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
                <div className="avatar-icon-display">
                  <span className="avatar-icon-main">{avatar.icon}</span>
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
              <div className="avatar-icon-display">
                <span className="avatar-icon-main">{selectedAvatar.icon}</span>
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