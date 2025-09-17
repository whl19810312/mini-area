import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CharacterCreator from '../components/CharacterCreator';
import '../styles/CharacterCreatorPage.css';

const CharacterCreatorPage = () => {
  const { user } = useAuth();
  const [isCreatorOpen, setIsCreatorOpen] = useState(true);

  const handleCharacterCreate = (characterData) => {
    // 캐릭터 데이터를 로컬 스토리지에 저장
    const userCharacters = JSON.parse(localStorage.getItem('user_characters') || '{}');
    const userId = user?.id || 'guest';
    
    if (!userCharacters[userId]) {
      userCharacters[userId] = [];
    }
    
    userCharacters[userId].push(characterData);
    localStorage.setItem('user_characters', JSON.stringify(userCharacters));
    
    // 현재 활성 캐릭터로 설정
    localStorage.setItem('current_character', JSON.stringify(characterData));
    
    // 부모 창에 알림 (메타버스가 열려있다면)
    if (window.opener && window.opener.updateCharacter) {
      window.opener.updateCharacter(characterData);
    }
    
    alert(`캐릭터 "${characterData.name}"이(가) 생성되었습니다!`);
    setIsCreatorOpen(false);
    
    // 약간의 지연 후 창 닫기
    setTimeout(() => {
      window.close();
    }, 1000);
  };

  const handleClose = () => {
    setIsCreatorOpen(false);
    window.close();
  };

  return (
    <div className="character-creator-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🎨 캐릭터 생성기</h1>
          <p>나만의 고유한 메타버스 캐릭터를 만들어보세요</p>
        </div>
        <button 
          className="close-page-btn"
          onClick={() => window.close()}
          title="창 닫기"
        >
          ✕
        </button>
      </div>

      {isCreatorOpen && (
        <CharacterCreator
          onCharacterCreate={handleCharacterCreate}
          onClose={handleClose}
        />
      )}

      {!isCreatorOpen && (
        <div className="creation-complete">
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>캐릭터 생성 완료!</h2>
            <p>새로운 캐릭터가 생성되었습니다.</p>
            <p>잠시 후 이 창이 자동으로 닫힙니다.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreatorPage;