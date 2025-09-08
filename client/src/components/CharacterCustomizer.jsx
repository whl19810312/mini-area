import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMetaverse } from '../contexts/MetaverseContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import './CharacterCustomizer.css'

const CharacterCustomizer = ({ isOpen, onClose }) => {
  const { currentCharacter, createCharacter, selectCharacter, fetchCharacters, updateCharacter, characters } = useMetaverse()
  const { user, socket } = useAuth()
  const location = useLocation()
  const isWaitingRoom = location.pathname === '/metaverse/waiting-room'
  const [appearance, setAppearance] = useState({
    head: '😊',    // 머리/얼굴 이모지
    body: '👕',    // 몸/상의 이모지  
    arms: '💪',    // 팔 이모지
    legs: '👖'     // 다리/하의 이모지
  })

  // 필요 없는 모달 열림/닫힘 로그 제거

  // 이모지 옵션들 (중복 제거)
  const emojiOptions = {
    head: ['😊', '😄', '😃', '😀', '😉', '😋', '😎', '🤔', '😴', '😍', '🥰', '😇', '🤠', '👻', '🤖', '👽', '🙂', '😐', '😑', '😶'],
    body: ['👕', '👔', '🥋', '🦺', '👚', '🎽', '🧥', '🥼', '👘' ],
    arms: ['💪', '👐', '🤲', '🙌', '👏', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '👍', '👎', '👊', '✊'],
    legs: ['👖', '🩳']
  }

  // 현재 캐릭터 정보 로드
  useEffect(() => {
    if (isOpen && currentCharacter) {
      if (currentCharacter.appearance) {
        setAppearance(currentCharacter.appearance)
      }
    }
  }, [isOpen, currentCharacter])

  // 이모지 부분 변경 핸들러
  const handleEmojiChange = (part, emoji) => {
    setAppearance(prev => ({
      ...prev,
      [part]: emoji
    }))
  }

  // 캐릭터 저장
  const handleSaveCharacter = async () => {
    // 대기실에서는 캐릭터 관련 명령(저장/선택/소켓 알림) 수행하지 않음
    if (isWaitingRoom) {
      toast('대기실에서는 캐릭터 저장이 적용되지 않습니다.');
      return;
    }
    try {
      const userName = user?.username || '사용자'
      
      const characterData = {
        name: userName,
        appearance: appearance,
        size: 32
      }
      
      // 기존 사용자 이름 캐릭터가 있는지 확인
      const existingCharacter = characters.find(char => char.name === userName)
      
      let savedCharacter
      if (existingCharacter) {
        // 기존 캐릭터 업데이트
        savedCharacter = await updateCharacter(existingCharacter.id, characterData)
      } else {
        // 새 캐릭터 생성
        savedCharacter = await createCharacter(characterData)
      }
      
      
      if (savedCharacter) {
        // 캐릭터 목록 새로고침 및 선택
        if (!isWaitingRoom) {
          await fetchCharacters()
          selectCharacter(savedCharacter)
        }
        
        // 대기실에서는 캐릭터 관련 실시간 명령 불필요 → 소켓 알림 생략
        if (socket && !isWaitingRoom) {
          socket.emit('character-updated', {
            characterId: savedCharacter.id,
            appearance: appearance
          })
        }
        
        toast.success('캐릭터가 저장되고 적용되었습니다!')
        onClose()
      } else {
        toast.error('캐릭터 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('캐릭터 저장 오류:', error)
      toast.error('캐릭터 저장에 실패했습니다: ' + error.message)
    }
  }

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) {
    return null
  }

  // 불필요한 렌더링 로그 제거

  return (
    <div className="character-customizer-overlay">
      <div className="character-customizer-modal">
        <div className="modal-header">
          <h2>캐릭터 커스터마이징</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {/* 캐릭터 설정 */}
          <div className="character-section">
            <h3>이모지 캐릭터 커스터마이징</h3>
            
            {/* 캐릭터 미리보기 */}
            <div className="emoji-preview-container">
              <div className="emoji-character-preview">
                <div className="emoji-part head">{appearance.head}</div>
                <div className="emoji-part body">{appearance.body}</div>
                <div className="emoji-part arms">{appearance.arms}</div>
                <div className="emoji-part legs">{appearance.legs}</div>
              </div>
            </div>

            {/* 이모지 선택 옵션들 */}
            <div className="emoji-options-container">
              {/* 머리 선택 */}
              <div className="emoji-option-group">
                <label>머리/얼굴:</label>
                <div className="emoji-grid">
                  {emojiOptions.head.map((emoji, index) => (
                    <button
                      key={`head-${index}`}
                      className={`emoji-btn ${appearance.head === emoji ? 'selected' : ''}`}
                      onClick={() => handleEmojiChange('head', emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* 몸 선택 */}
              <div className="emoji-option-group">
                <label>몸/상의:</label>
                <div className="emoji-grid">
                  {emojiOptions.body.map((emoji, index) => (
                    <button
                      key={`body-${index}`}
                      className={`emoji-btn ${appearance.body === emoji ? 'selected' : ''}`}
                      onClick={() => handleEmojiChange('body', emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* 팔 선택 */}
              <div className="emoji-option-group">
                <label>팔:</label>
                <div className="emoji-grid">
                  {emojiOptions.arms.map((emoji, index) => (
                    <button
                      key={`arms-${index}`}
                      className={`emoji-btn ${appearance.arms === emoji ? 'selected' : ''}`}
                      onClick={() => handleEmojiChange('arms', emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* 다리 선택 */}
              <div className="emoji-option-group">
                <label>다리/하의:</label>
                <div className="emoji-grid">
                  {emojiOptions.legs.map((emoji, index) => (
                    <button
                      key={`legs-${index}`}
                      className={`emoji-btn ${appearance.legs === emoji ? 'selected' : ''}`}
                      onClick={() => handleEmojiChange('legs', emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="action-buttons">
            <button className="save-btn" onClick={handleSaveCharacter}>
              캐릭터 저장
            </button>
            <button className="cancel-btn" onClick={onClose}>
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CharacterCustomizer 
