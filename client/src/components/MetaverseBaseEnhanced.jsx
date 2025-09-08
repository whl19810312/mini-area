import React, { useRef, useEffect, useState } from 'react'
import MultiLayerCanvas from './MultiLayerCanvas'
import '../styles/MetaverseBaseEnhanced.css'

const MetaverseBaseEnhanced = ({ 
  mode = 'view', // 'view', 'create', 'edit'
  mapData = null,
  onSave = null,
  onExit = null,
  children
}) => {
  const [currentMap, setCurrentMap] = useState({
    name: mapData?.name || '새 공간',
    backgroundImage: mapData?.backgroundImage || null,
    walls: mapData?.walls || [],
    privateAreas: mapData?.privateAreas || [],
    spawnPoints: mapData?.spawnPoints || [],
    size: mapData?.size || { width: 1000, height: 1000 },
    backgroundLayer: mapData?.backgroundLayer || null,
    entities: mapData?.entities || []
  })
  
  const [showSplitScreen, setShowSplitScreen] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [selectedTool, setSelectedTool] = useState('select')
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const [editingWallIndex, setEditingWallIndex] = useState(null)
  const [editingAreaIndex, setEditingAreaIndex] = useState(null)
  
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  // mapData가 변경될 때 currentMap 업데이트
  useEffect(() => {
    if (mapData) {
      setCurrentMap({
        name: mapData.name || '새 공간',
        backgroundImage: mapData.backgroundImage || null,
        walls: mapData.walls || [],
        privateAreas: mapData.privateAreas || [],
        spawnPoints: mapData.spawnPoints || [],
        size: mapData.size || { width: 1000, height: 1000 },
        backgroundLayer: mapData.backgroundLayer || null,
        entities: mapData.entities || []
      })
    }
  }, [mapData])

  useEffect(() => {
    // 진입 애니메이션
    const timer = setTimeout(() => {
      setShowSplitScreen(false)
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [])

  const handleExit = () => {
    // 닫기 애니메이션
    setIsClosing(true)
    setShowSplitScreen(true)
    
    setTimeout(() => {
      if (onExit) onExit()
    }, 1500)
  }

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setCurrentMap(prev => ({
          ...prev,
          backgroundImage: event.target.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || mode === 'view') return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (selectedTool === 'wall') {
      if (!isDrawing) {
        setDrawStart({ x, y })
        setIsDrawing(true)
      } else {
        // 벽 추가
        const newWall = {
          start: drawStart,
          end: { x, y }
        }
        setCurrentMap(prev => ({
          ...prev,
          walls: [...prev.walls, newWall]
        }))
        setIsDrawing(false)
        setDrawStart(null)
      }
    } else if (selectedTool === 'private') {
      if (!isDrawing) {
        setDrawStart({ x, y })
        setIsDrawing(true)
      } else {
        // 프라이빗 영역 추가
        const newArea = {
          position: {
            x: Math.min(drawStart.x, x),
            y: Math.min(drawStart.y, y)
          },
          size: {
            width: Math.abs(x - drawStart.x),
            height: Math.abs(y - drawStart.y)
          }
        }
        setCurrentMap(prev => ({
          ...prev,
          privateAreas: [...prev.privateAreas, newArea]
        }))
        setIsDrawing(false)
        setDrawStart(null)
      }
    } else if (selectedTool === 'spawn') {
      // 시작점 설정
      setCurrentMap(prev => ({
        ...prev,
        spawnPoints: [{ x, y }]
      }))
    }
  }

  const deleteWall = (index) => {
    setCurrentMap(prev => ({
      ...prev,
      walls: prev.walls.filter((_, i) => i !== index)
    }))
  }

  const deletePrivateArea = (index) => {
    setCurrentMap(prev => ({
      ...prev,
      privateAreas: prev.privateAreas.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    if (onSave) {
      await onSave(currentMap)
    }
  }

  const getBackgroundImage = () => {
    if (!currentMap.backgroundImage) return null
    
    if (typeof currentMap.backgroundImage === 'string') {
      return currentMap.backgroundImage
    }
    
    if (currentMap.backgroundImage?.data) {
      const contentType = currentMap.backgroundImage.contentType || 'image/png'
      return currentMap.backgroundImage.data.startsWith('data:') 
        ? currentMap.backgroundImage.data 
        : `data:${contentType};base64,${currentMap.backgroundImage.data}`
    }
    
    return null
  }

  return (
    <div className="metaverse-base-enhanced">
      {/* 화면 전환 효과 */}
      {showSplitScreen && (
        <div className={`split-screen-effect ${isClosing ? 'closing' : 'opening'}`}>
          <div className="split-left"></div>
          <div className="split-right"></div>
          <div className="split-text">
            {isClosing ? 'EXITING...' : 'LOADING...'}
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="metaverse-content">
        {/* 캔버스 영역 */}
        <div className="canvas-container" onClick={handleCanvasClick}>
          <MultiLayerCanvas
            ref={canvasRef}
            width={currentMap.size?.width || 1000}
            height={currentMap.size?.height || 1000}
            backgroundImage={getBackgroundImage()}
            layers={{
              background: currentMap.backgroundLayer,
              walls: currentMap.walls || [],
              privateAreas: currentMap.privateAreas || [],
              entities: currentMap.entities || []
            }}
            layerOpacity={
              mode === 'view' ? {
                background: 1.0,      // 배경만 보이기
                walls: 0.0,          // 벽 숨기기
                privateAreas: 0.0,   // 프라이빗 영역 숨기기
                spawnPoints: 0.0     // 시작점 숨기기
              } : {
                background: 1.0,      // 모두 100% 불투명
                walls: 1.0,
                privateAreas: 1.0,
                spawnPoints: 1.0
              }
            }
            isEditMode={mode === 'edit' || mode === 'create'}
            showTransition={false}
          />
          
          {/* 그리기 중 미리보기 */}
          {isDrawing && drawStart && (
            <div 
              className="drawing-preview"
              style={{
                position: 'absolute',
                left: drawStart.x,
                top: drawStart.y,
                pointerEvents: 'none'
              }}
            >
              {selectedTool === 'wall' && <div className="wall-preview">벽 그리기 중...</div>}
              {selectedTool === 'private' && <div className="area-preview">영역 그리기 중...</div>}
            </div>
          )}
        </div>

        {/* UI 레이어 6 - 모드별 UI */}
        <div className="ui-layer">
          {/* 상단 정보 바 */}
          <div className="top-bar">
            <div className="mode-indicator">
              [{mode.toUpperCase()}] {currentMap.name}
            </div>
            <div className="coordinates">
              좌표: X:0 Y:0
            </div>
          </div>

          {/* 도구 패널 (생성/편집 모드) */}
          {(mode === 'create' || mode === 'edit') && (
            <div className="tools-panel">
              <h3>도구</h3>
              
              {/* 배경 업로드 */}
              <div className="tool-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  style={{ display: 'none' }}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="tool-button"
                >
                  배경 이미지 업로드
                </button>
              </div>

              {/* 그리기 도구 */}
              <div className="tool-section">
                <button 
                  onClick={() => setSelectedTool('select')}
                  className={`tool-button ${selectedTool === 'select' ? 'active' : ''}`}
                >
                  선택
                </button>
                <button 
                  onClick={() => setSelectedTool('wall')}
                  className={`tool-button ${selectedTool === 'wall' ? 'active' : ''}`}
                >
                  가상벽 그리기
                </button>
                <button 
                  onClick={() => setSelectedTool('private')}
                  className={`tool-button ${selectedTool === 'private' ? 'active' : ''}`}
                >
                  프라이빗 영역
                </button>
                <button 
                  onClick={() => setSelectedTool('spawn')}
                  className={`tool-button ${selectedTool === 'spawn' ? 'active' : ''}`}
                >
                  시작점 설정
                </button>
              </div>

              {/* 편집 목록 */}
              <div className="tool-section">
                <h4>가상벽 목록</h4>
                <div className="item-list">
                  {currentMap.walls.map((wall, index) => (
                    <div key={index} className="list-item">
                      <span>벽 {index + 1}</span>
                      <button onClick={() => deleteWall(index)}>삭제</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tool-section">
                <h4>프라이빗 영역</h4>
                <div className="item-list">
                  {currentMap.privateAreas.map((area, index) => (
                    <div key={index} className="list-item">
                      <span>영역 {index + 1}</span>
                      <button onClick={() => deletePrivateArea(index)}>삭제</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 하단 컨트롤 */}
          <div className="bottom-controls">
            {(mode === 'create' || mode === 'edit') && (
              <button onClick={handleSave} className="control-button save-button">
                저장
              </button>
            )}
            <button onClick={handleExit} className="control-button exit-button">
              나가기
            </button>
          </div>

          {/* 추가 UI (children) */}
          {children}
        </div>
      </div>
    </div>
  )
}

export default MetaverseBaseEnhanced