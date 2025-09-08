import React, { useRef, useEffect, useState } from 'react'
import MultiLayerCanvas from './MultiLayerCanvas'
import '../styles/MetaverseBase.css'

const MetaverseBase = ({ 
  mode = 'view', // 'view', 'create', 'edit'
  mapData = null,
  onSave = null,
  onExit = null,
  children
}) => {
  const [currentMap, setCurrentMap] = useState(mapData)
  const [showControls, setShowControls] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    // 키보드 단축키
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onExit) {
        onExit()
      }
      if (e.key === 'F2') {
        setShowControls(!showControls)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit, showControls])

  const getBackgroundImage = () => {
    if (!currentMap) return null
    
    // 배경 이미지 데이터 추출
    const bgData = currentMap.backgroundImage || 
                   currentMap.backgroundLayer?.image?.data ||
                   currentMap.backgroundLayer?.image
    
    if (!bgData) return null
    
    // Base64 데이터 처리
    if (typeof bgData === 'string') {
      return bgData.startsWith('data:') ? bgData : `data:image/png;base64,${bgData}`
    }
    
    if (bgData.data) {
      const contentType = bgData.contentType || 'image/png'
      return bgData.data.startsWith('data:') 
        ? bgData.data 
        : `data:${contentType};base64,${bgData.data}`
    }
    
    return null
  }

  const getModeTitle = () => {
    switch(mode) {
      case 'create': return '공간 생성'
      case 'edit': return '공간 편집'
      default: return currentMap?.name || '공간'
    }
  }

  const getModeColor = () => {
    switch(mode) {
      case 'create': return '#00ff00'
      case 'edit': return '#ffff00'
      default: return '#00ffff'
    }
  }

  return (
    <div className="metaverse-base-container">
      {/* 상단 BBS 스타일 헤더 */}
      <div className="metaverse-bbs-header" style={{ borderColor: getModeColor() }}>
        <div className="header-left">
          <span style={{ color: getModeColor() }}>
            [{mode.toUpperCase()}] {getModeTitle()}
          </span>
        </div>
        <div className="header-center">
          MINI AREA METAVERSE SYSTEM
        </div>
        <div className="header-right">
          {new Date().toLocaleTimeString('ko-KR')}
        </div>
      </div>

      {/* 메인 캔버스 영역 */}
      <div className="metaverse-canvas-area">
        <MultiLayerCanvas
          ref={canvasRef}
          width={1000}
          height={1000}
          backgroundImage={getBackgroundImage()}
          layers={{
            background: currentMap?.backgroundLayer,
            walls: currentMap?.walls || [],
            privateAreas: currentMap?.privateAreas || [],
            entities: currentMap?.entities || []
          }}
          isEditMode={mode === 'edit' || mode === 'create'}
          showTransition={false}
          onCanvasReady={(canvas) => {
            console.log('Canvas ready in mode:', mode)
          }}
        />
      </div>

      {/* 모드별 UI 오버레이 */}
      <div className="metaverse-ui-overlay">
        {children}
      </div>

      {/* 하단 상태바 */}
      <div className="metaverse-bbs-footer">
        <div className="footer-left">
          {mode === 'view' && '[TAB] 메뉴 | [ESC] 나가기'}
          {mode === 'create' && '[S] 저장 | [ESC] 취소'}
          {mode === 'edit' && '[S] 저장 | [R] 초기화 | [ESC] 취소'}
        </div>
        <div className="footer-center">
          {currentMap?.currentUsers || 0} / {currentMap?.maxUsers || 10} 접속
        </div>
        <div className="footer-right">
          좌표: X:0 Y:0
        </div>
      </div>

      {/* 컨트롤 패널 (F2로 토글) */}
      {showControls && (
        <div className="metaverse-control-panel">
          <div className="control-header">
            컨트롤 패널 [F2 닫기]
          </div>
          <div className="control-body">
            {mode === 'create' && (
              <>
                <button onClick={() => console.log('배경 업로드')}>배경 이미지 업로드</button>
                <button onClick={() => console.log('벽 그리기')}>벽 그리기</button>
                <button onClick={() => console.log('프라이빗 영역')}>프라이빗 영역</button>
              </>
            )}
            {mode === 'edit' && (
              <>
                <button onClick={() => console.log('배경 변경')}>배경 변경</button>
                <button onClick={() => console.log('벽 수정')}>벽 수정</button>
                <button onClick={() => console.log('설정')}>공간 설정</button>
              </>
            )}
            {mode === 'view' && (
              <>
                <button onClick={() => console.log('채팅')}>채팅</button>
                <button onClick={() => console.log('사용자 목록')}>사용자 목록</button>
                <button onClick={() => console.log('화면공유')}>화면공유</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MetaverseBase