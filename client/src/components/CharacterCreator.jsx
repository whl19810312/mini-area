import React, { useState, useRef, useEffect } from 'react'
import './CharacterCreator.css'

const CharacterCreator = ({ onSave, onClose }) => {
  const [characterData, setCharacterData] = useState({
    name: '',
    head: '😊',
    body: '👕',
    arms: '👐',
    legs: '👖',
    size: 32
  })
  
  const canvasRef = useRef(null)
  const [characters, setCharacters] = useState({
    down: null,
    up: null,
    left: null,
    right: null
  })

  // 이모지 옵션들
  const emojiOptions = {
    heads: ['😊', '😄', '😃', '😀', '😉', '😋', '😎', '🤔', '😴', '😍', '🥰', '😇', '🤠', '👻', '🤖', '👽'],
    bodies: ['👕', '👔', '👗', '👘', '🥋', '👚', '👛', '👜', '👝', '🛍️', '🎒', '👞', '👟', '🥾', '🥿', '👠'],
    arms: ['👐', '🤲', '🙌', '👏', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '👍', '👎', '👊', '✊', '🤛'],
    legs: ['👖', '👗', '👘', '🥋', '👚', '👛', '👜', '👝', '🛍️', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡']
  }

  const directions = [
    { key: 'down', label: '아래쪽' },
    { key: 'up', label: '위쪽' },
    { key: 'left', label: '왼쪽' },
    { key: 'right', label: '오른쪽' }
  ]

  // 캐릭터 그리기
  const drawCharacter = (direction) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const size = characterData.size
    
    // 캔버스 초기화
    ctx.clearRect(0, 0, size, size)
    
    // 투명 배경 설정 (완전 투명)
    ctx.clearRect(0, 0, size, size)
    
    // 머리
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#000000'
    ctx.fillText(characterData.head, size/2, size/4)
    
    // 몸
    ctx.font = '10px Arial'
    ctx.fillText(characterData.body, size/2, size/2)
    
    // 팔
    ctx.font = '8px Arial'
    if (direction === 'left') {
      ctx.fillText(characterData.arms, size/4, size/2)
    } else if (direction === 'right') {
      ctx.fillText(characterData.arms, size*3/4, size/2)
    } else {
      ctx.fillText(characterData.arms, size/3, size/2)
      ctx.fillText(characterData.arms, size*2/3, size/2)
    }
    
    // 다리
    ctx.font = '8px Arial'
    ctx.fillText(characterData.legs, size/2, size*3/4)
    
    // 투명 배경으로 PNG 이미지 생성
    const imageData = canvas.toDataURL('image/png')
    setCharacters(prev => ({
      ...prev,
      [direction]: imageData
    }))
  }

  // 설정 변경 시 모든 방향 캐릭터 다시 그리기
  useEffect(() => {
    directions.forEach(dir => {
      drawCharacter(dir.key)
    })
  }, [characterData.head, characterData.body, characterData.arms, characterData.legs, characterData.size])

  // 캐릭터 저장
  const handleSave = () => {
    if (!characterData.name.trim()) {
      alert('캐릭터 이름을 입력해주세요.')
      return
    }
    
    // 모든 방향이 생성되었는지 확인
    const allGenerated = directions.every(dir => characters[dir.key])
    if (!allGenerated) {
      alert('캐릭터 생성 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    
    // 이미지를 base64 문자열로 변환 (data:image/png;base64, 부분 제거)
    const imagesAsBase64 = {}
    directions.forEach(dir => {
      if (characters[dir.key]) {
        // data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA... 형태에서 base64 부분만 추출
        const base64Data = characters[dir.key].split(',')[1]
        imagesAsBase64[dir.key] = base64Data
      }
    })
    
    onSave({
      name: characterData.name,
      images: imagesAsBase64,
      size: characterData.size
    })
  }

  return (
    <div className="character-creator-overlay">
      <div className="character-creator">
        <h2>이모지 기반 캐릭터 생성기</h2>
        
        <div className="creator-content">
          <div className="controls">
            <div className="form-group">
              <label>캐릭터 이름:</label>
              <input
                type="text"
                value={characterData.name}
                onChange={(e) => setCharacterData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="캐릭터 이름을 입력하세요"
              />
            </div>
            
            <div className="form-group">
              <label>머리:</label>
              <select
                value={characterData.head}
                onChange={(e) => setCharacterData(prev => ({ ...prev, head: e.target.value }))}
              >
                {emojiOptions.heads.map(emoji => (
                  <option key={emoji} value={emoji}>{emoji}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>몸:</label>
              <select
                value={characterData.body}
                onChange={(e) => setCharacterData(prev => ({ ...prev, body: e.target.value }))}
              >
                {emojiOptions.bodies.map(emoji => (
                  <option key={emoji} value={emoji}>{emoji}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>팔:</label>
              <select
                value={characterData.arms}
                onChange={(e) => setCharacterData(prev => ({ ...prev, arms: e.target.value }))}
              >
                {emojiOptions.arms.map(emoji => (
                  <option key={emoji} value={emoji}>{emoji}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>다리:</label>
              <select
                value={characterData.legs}
                onChange={(e) => setCharacterData(prev => ({ ...prev, legs: e.target.value }))}
              >
                {emojiOptions.legs.map(emoji => (
                  <option key={emoji} value={emoji}>{emoji}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>크기:</label>
              <input
                type="range"
                min="16"
                max="64"
                value={characterData.size}
                onChange={(e) => setCharacterData(prev => ({ ...prev, size: parseInt(e.target.value) }))}
              />
              <span>{characterData.size}px</span>
            </div>
          </div>
          
          <div className="preview">
            <h3>미리보기</h3>
            <canvas
              ref={canvasRef}
              width={characterData.size}
              height={characterData.size}
              style={{ border: '1px solid #ccc' }}
            />
          </div>
          

        </div>
        
        <div className="creator-buttons">
          <button onClick={handleSave} className="save-btn">
            캐릭터 저장
          </button>
          <button onClick={onClose} className="cancel-btn">
            취소
          </button>
        </div>
      </div>
    </div>
  )
}

export default CharacterCreator 