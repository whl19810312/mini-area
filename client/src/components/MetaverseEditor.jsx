import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import MultiLayerCanvas from './MultiLayerCanvas'
import '../styles/MetaverseEditor.css'

const MetaverseEditor = forwardRef(({ 
  mode = 'create', // 'create' or 'edit'
  initialData = null,
  onSave = null,
  onExit = null
}, ref) => {
  // 맵 데이터
  const [mapData, setMapData] = useState({
    name: initialData?.name || '새 공간',
    description: initialData?.description || '',
    backgroundImage: initialData?.backgroundImage || initialData?.imageUrl || '/images/default-space-bg.svg',
    walls: initialData?.walls || [],
    privateAreas: initialData?.privateAreas || [],
    spawnPoints: initialData?.spawnPoints || [],
    size: initialData?.size || { width: 1000, height: 1000 },
    maxUsers: initialData?.maxUsers || 10,
    isPublic: initialData?.isPublic !== undefined ? initialData.isPublic : true
  })

  // 편집 상태
  const [selectedTool, setSelectedTool] = useState('select')
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const [currentDrawing, setCurrentDrawing] = useState(null)
  const [selectedItemIndex, setSelectedItemIndex] = useState(null)
  const [selectedItemType, setSelectedItemType] = useState(null)
  
  // 패닝 상태
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  
  // 줌 상태
  const [zoomScale, setZoomScale] = useState(1)
  const [zoomOrigin, setZoomOrigin] = useState({ x: 0, y: 0 })
  
  // UI 상태
  const [showSettings, setShowSettings] = useState(false)
  const [showLayerPanel, setShowLayerPanel] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // 사이드바 상태
  const [sidebarPosition, setSidebarPosition] = useState({ x: 10, y: 60 })
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)
  
  // 레이어 투명도 상태
  const [layerOpacity, setLayerOpacity] = useState({
    background: 1.0,     // 배경 100%
    walls: 1.0,          // 벽 100%
    privateAreas: 1.0,   // 프라이빗 영역 100%
    spawnPoints: 1.0     // 시작점 100%
  })

  // 화면 전환
  const [showSplitScreen, setShowSplitScreen] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const sidebarRef = useRef(null)

  useImperativeHandle(ref, () => ({
    getMapData: () => mapData,
    reset: () => resetEditor()
  }))

  useEffect(() => {
    // 진입 애니메이션 - 즉시 숨김
    setShowSplitScreen(false)
    console.log('MetaverseEditor mounted, mode:', mode)
    console.log('MapData:', mapData)
    console.log('fileInputRef 초기화 확인:', fileInputRef.current)
  }, [])

  // 캔버스 좌표 - 화면 전체 기준 (0,0)부터 시작 + 패닝 오프셋 및 줌 스케일 적용
  const getCanvasCoordinates = (e) => {
    // 마우스 좌표를 캔버스 좌표로 변환 (줌과 패닝 고려)
    const x = Math.round((e.clientX - panOffset.x) / zoomScale)
    const y = Math.round((e.clientY - panOffset.y) / zoomScale)
    
    console.log('🎯 좌표 계산:', { 
      mouse: `(${e.clientX}, ${e.clientY})`,
      panOffset: `(${panOffset.x}, ${panOffset.y})`,
      zoomScale: zoomScale,
      result: `(${x}, ${y})`,
      windowSize: `${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`
    })
    
    return { x, y }
  }

  // 배경 이미지 업로드
  const handleBackgroundUpload = (e) => {
    console.log('handleBackgroundUpload 호출됨')
    const file = e.target.files[0]
    console.log('선택된 파일:', file)
    
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        console.log('파일 읽기 완료')
        const img = new Image()
        img.onload = () => {
          console.log('이미지 로드 완료:', img.width, 'x', img.height)
          setMapData(prev => ({
            ...prev,
            backgroundImage: event.target.result,
            size: { width: img.width, height: img.height }
          }))
        }
        img.onerror = (error) => {
          console.error('이미지 로드 실패:', error)
        }
        img.src = event.target.result
      }
      reader.onerror = (error) => {
        console.error('파일 읽기 실패:', error)
      }
      reader.readAsDataURL(file)
    }
  }

  // 마우스 이벤트 핸들러
  const handleMouseDown = (e) => {
    // 오른쪽 클릭 - 패닝
    if (e.button === 2) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      return
    }
    
    if (mode === 'view') return
    
    // 왼쪽 클릭 - 도구 사용
    if (e.button === 0) {
      const coords = getCanvasCoordinates(e)
      
      if (selectedTool === 'select') {
        // 선택 도구 - 기존 아이템 선택
        selectItemAt(coords)
      } else if (selectedTool === 'wall') {
        setIsDrawing(true)
        setDrawStart(coords)
        setCurrentDrawing({ type: 'wall', start: coords, end: coords })
      } else if (selectedTool === 'private') {
        setIsDrawing(true)
        setDrawStart(coords)
        setCurrentDrawing({ type: 'area', start: coords, end: coords })
      } else if (selectedTool === 'spawn') {
        // 시작점 바로 설정
        setMapData(prev => ({
          ...prev,
          spawnPoints: [coords]
        }))
      } else if (selectedTool === 'editWall') {
        // 벽 편집 모드 - 가까운 벽 선택
        for (let i = 0; i < mapData.walls.length; i++) {
          const wall = mapData.walls[i]
          if (isPointNearLine(coords, wall.start, wall.end, 10)) {
            setSelectedItemIndex(i)
            setSelectedItemType('wall')
            console.log('벽 선택됨:', i)
            break
          }
        }
      } else if (selectedTool === 'editArea') {
        // 영역 편집 모드 - 영역 선택
        for (let i = 0; i < mapData.privateAreas.length; i++) {
          const area = mapData.privateAreas[i]
          if (isPointInRect(coords, area.position, area.size)) {
            setSelectedItemIndex(i)
            setSelectedItemType('area')
            console.log('영역 선택됨:', i)
            break
          }
        }
      } else if (selectedTool === 'delete') {
        // 삭제 도구
        deleteItemAt(coords)
      }
    }
  }

  const handleMouseMove = (e) => {
    // 패닝 중
    if (isPanning) {
      const newOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }
      setPanOffset(newOffset)
      return
    }
    
    // 그리기 중
    if (!isDrawing || !drawStart) return
    
    const coords = getCanvasCoordinates(e)
    
    if (selectedTool === 'wall') {
      setCurrentDrawing({ type: 'wall', start: drawStart, end: coords })
    } else if (selectedTool === 'private') {
      setCurrentDrawing({ type: 'area', start: drawStart, end: coords })
    }
  }

  // 마우스 휠 이벤트 핸들러 - 줌
  const handleWheel = (e) => {
    e.preventDefault()
    
    // 줌 스케일 계산 (휠 위: 확대, 휠 아래: 축소)
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(0.1, zoomScale * delta), 5) // 최소 0.1배, 최대 5배
    
    // 마우스 위치를 중심으로 줌
    const mouseX = e.clientX
    const mouseY = e.clientY
    
    // 줌 전후의 마우스 위치가 동일하도록 panOffset 조정
    const scaleDiff = newScale - zoomScale
    const newPanOffset = {
      x: panOffset.x - (mouseX - panOffset.x) * scaleDiff / zoomScale,
      y: panOffset.y - (mouseY - panOffset.y) * scaleDiff / zoomScale
    }
    
    setZoomScale(newScale)
    setPanOffset(newPanOffset)
  }

  const handleMouseUp = (e) => {
    // 패닝 종료
    if (isPanning) {
      setIsPanning(false)
      return
    }
    
    if (!isDrawing || !drawStart) return
    
    // currentDrawing이 있으면 그대로 사용 (점선 미리보기와 동일한 값)
    // currentDrawing이 없으면 현재 마우스 위치 사용
    if (!currentDrawing) {
      const coords = getCanvasCoordinates(e)
      setCurrentDrawing({ 
        type: selectedTool === 'wall' ? 'wall' : 'area', 
        start: drawStart, 
        end: coords 
      })
    }
    
    if (selectedTool === 'wall' && currentDrawing) {
      // 벽 추가 - currentDrawing의 정확한 좌표 사용
      const newWall = { 
        start: { ...currentDrawing.start }, 
        end: { ...currentDrawing.end }
      }
      console.log('🧱 새 벽 추가:', {
        start: `(${newWall.start.x}, ${newWall.start.y})`,
        end: `(${newWall.end.x}, ${newWall.end.y})`
      })
      setMapData(prev => {
        const updated = {
          ...prev,
          walls: [...prev.walls, newWall]
        }
        console.log('📊 전체 벽 개수:', updated.walls.length)
        return updated
      })
    } else if (selectedTool === 'private' && currentDrawing) {
      // 프라이빗 영역 추가 - currentDrawing의 정확한 좌표 사용
      const newArea = {
        position: {
          x: Math.min(currentDrawing.start.x, currentDrawing.end.x),
          y: Math.min(currentDrawing.start.y, currentDrawing.end.y)
        },
        size: {
          width: Math.abs(currentDrawing.end.x - currentDrawing.start.x),
          height: Math.abs(currentDrawing.end.y - currentDrawing.start.y)
        }
      }
      console.log('🔒 새 프라이빗 영역 추가:', newArea)
      setMapData(prev => ({
        ...prev,
        privateAreas: [...prev.privateAreas, newArea]
      }))
    }
    
    setIsDrawing(false)
    setDrawStart(null)
    setCurrentDrawing(null)
  }

  // 아이템 선택
  const selectItemAt = (coords) => {
    // 벽 선택
    for (let i = 0; i < mapData.walls.length; i++) {
      const wall = mapData.walls[i]
      if (isPointNearLine(coords, wall.start, wall.end, 10)) {
        setSelectedItemIndex(i)
        setSelectedItemType('wall')
        return
      }
    }
    
    // 프라이빗 영역 선택
    for (let i = 0; i < mapData.privateAreas.length; i++) {
      const area = mapData.privateAreas[i]
      if (isPointInRect(coords, area.position, area.size)) {
        setSelectedItemIndex(i)
        setSelectedItemType('area')
        return
      }
    }
    
    // 아무것도 선택 안됨
    setSelectedItemIndex(null)
    setSelectedItemType(null)
  }

  // 아이템 삭제
  const deleteItemAt = (coords) => {
    // 벽 삭제
    for (let i = 0; i < mapData.walls.length; i++) {
      const wall = mapData.walls[i]
      if (isPointNearLine(coords, wall.start, wall.end, 10)) {
        deleteWall(i)
        return
      }
    }
    
    // 프라이빗 영역 삭제
    for (let i = 0; i < mapData.privateAreas.length; i++) {
      const area = mapData.privateAreas[i]
      if (isPointInRect(coords, area.position, area.size)) {
        deletePrivateArea(i)
        return
      }
    }
  }

  // 점이 선 근처에 있는지 확인
  const isPointNearLine = (point, lineStart, lineEnd, threshold) => {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y
    
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1
    
    if (lenSq !== 0) param = dot / lenSq
    
    let xx, yy
    
    if (param < 0) {
      xx = lineStart.x
      yy = lineStart.y
    } else if (param > 1) {
      xx = lineEnd.x
      yy = lineEnd.y
    } else {
      xx = lineStart.x + param * C
      yy = lineStart.y + param * D
    }
    
    const dx = point.x - xx
    const dy = point.y - yy
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    return distance <= threshold
  }

  // 점이 사각형 안에 있는지 확인
  const isPointInRect = (point, rectPos, rectSize) => {
    return point.x >= rectPos.x && 
           point.x <= rectPos.x + rectSize.width &&
           point.y >= rectPos.y && 
           point.y <= rectPos.y + rectSize.height
  }

  // 벽 삭제
  const deleteWall = (index) => {
    setMapData(prev => ({
      ...prev,
      walls: prev.walls.filter((_, i) => i !== index)
    }))
    if (selectedItemIndex === index && selectedItemType === 'wall') {
      setSelectedItemIndex(null)
      setSelectedItemType(null)
    }
  }

  // 프라이빗 영역 삭제
  const deletePrivateArea = (index) => {
    setMapData(prev => ({
      ...prev,
      privateAreas: prev.privateAreas.filter((_, i) => i !== index)
    }))
    if (selectedItemIndex === index && selectedItemType === 'area') {
      setSelectedItemIndex(null)
      setSelectedItemType(null)
    }
  }

  // 전체 초기화
  const resetEditor = () => {
    if (window.confirm('모든 변경사항이 삭제됩니다. 계속하시겠습니까?')) {
      setMapData({
        name: '새 공간',
        description: '',
        backgroundImage: null,
        walls: [],
        privateAreas: [],
        spawnPoints: [],
        size: { width: 1000, height: 1000 },
        maxUsers: 10,
        isPublic: true
      })
      setSelectedItemIndex(null)
      setSelectedItemType(null)
    }
  }

  // 사이드바 드래그 시작
  const handleSidebarDragStart = (e) => {
    if (e.target.classList.contains('sidebar-header')) {
      setIsDraggingSidebar(true)
      const rect = sidebarRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  // 사이드바 드래그 중
  const handleSidebarDragMove = (e) => {
    if (isDraggingSidebar) {
      setSidebarPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }

  // 사이드바 드래그 종료
  const handleSidebarDragEnd = () => {
    setIsDraggingSidebar(false)
  }

  // 전역 마우스 이벤트 등록
  useEffect(() => {
    if (isDraggingSidebar) {
      window.addEventListener('mousemove', handleSidebarDragMove)
      window.addEventListener('mouseup', handleSidebarDragEnd)
      
      return () => {
        window.removeEventListener('mousemove', handleSidebarDragMove)
        window.removeEventListener('mouseup', handleSidebarDragEnd)
      }
    }
  }, [isDraggingSidebar, dragOffset])

  // 투명 이미지 생성 함수
  const createTransparentImage = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width || 1000;
    canvas.height = height || 1000;
    const ctx = canvas.getContext('2d');
    
    // 완전 투명한 캔버스 (알파값 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // base64 문자열로 변환
    return canvas.toDataURL('image/png');
  }

  // 저장
  const handleSave = async () => {
    if (!mapData.name.trim()) {
      alert('공간 이름을 입력해주세요')
      return
    }
    
    setIsSaving(true)
    try {
      // 전경 이미지가 없으면 투명 이미지 생성
      let finalMapData = { ...mapData };
      
      if (!finalMapData.foregroundImage && !finalMapData.frontImage) {
        console.log('전경 이미지가 없음 - 투명 이미지 생성 중...');
        const transparentImage = createTransparentImage(
          finalMapData.size?.width || 1000,
          finalMapData.size?.height || 1000
        );
        
        finalMapData.foregroundImage = transparentImage;
        finalMapData.frontImage = transparentImage;
        
        console.log('투명 전경 이미지 생성 완료');
      }
      
      if (onSave) {
        await onSave(finalMapData)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // 나가기
  const handleExit = () => {
    if (window.confirm('저장하지 않은 변경사항이 있습니다. 나가시겠습니까?')) {
      setIsClosing(true)
      setShowSplitScreen(true)
      
      setTimeout(() => {
        if (onExit) onExit()
      }, 1500)
    }
  }

  return (
    <div className="metaverse-editor">
      {/* 화면 전환 효과 */}
      {showSplitScreen && (
        <div className={`split-screen-effect ${isClosing ? 'closing' : 'opening'}`}>
          <div className="split-left"></div>
          <div className="split-right"></div>
          <div className="split-text">
            {isClosing ? 'EXITING...' : 'LOADING EDITOR...'}
          </div>
        </div>
      )}

      {/* 메인 에디터 */}
      <div className="editor-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* 플로팅 사이드바 */}
        <div 
          ref={sidebarRef}
          className="tools-panel" 
          style={{ 
            position: 'absolute',
            left: sidebarPosition.x,
            top: sidebarPosition.y,
            width: isSidebarMinimized ? '50px' : '300px', 
            maxHeight: '80vh',
            background: 'rgba(0, 0, 0, 0.95)', 
            border: '2px solid #00ff00',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'block',
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(0, 255, 0, 0.3)',
            transition: 'width 0.3s ease'
          }}
        >
          <div 
            className="sidebar-header panel-header" 
            style={{ 
              background: '#222', 
              padding: '10px', 
              borderBottom: '2px solid #00ff00',
              cursor: 'move',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              userSelect: 'none'
            }}
            onMouseDown={handleSidebarDragStart}
          >
            <h3 style={{ 
              margin: 0, 
              color: '#00ff00', 
              fontSize: isSidebarMinimized ? '12px' : '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {isSidebarMinimized ? '☰' : (mode === 'create' ? '공간 만들기' : '공간 편집')}
            </h3>
            <button
              onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
              style={{
                background: 'transparent',
                border: '1px solid #00ff00',
                color: '#00ff00',
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: '12px',
                borderRadius: '3px'
              }}
            >
              {isSidebarMinimized ? '▶' : '◀'}
            </button>
          </div>
          
          {!isSidebarMinimized && (
            <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 50px)' }}>

          {/* 기본 설정 */}
          <div className="tool-section" style={{ 
            padding: '15px', 
            borderBottom: '1px solid #333',
            color: '#00ff00'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00ffff' }}>기본 설정</h4>
            <input
              type="text"
              placeholder="공간 이름"
              value={mapData.name}
              onChange={(e) => setMapData(prev => ({ ...prev, name: e.target.value }))}
              className="input-field"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '10px',
                background: '#1a1a1a',
                color: '#00ff00',
                border: '1px solid #00ff00',
                fontSize: '12px',
                fontFamily: 'Courier New, monospace'
              }}
            />
            <textarea
              placeholder="설명"
              value={mapData.description}
              onChange={(e) => setMapData(prev => ({ ...prev, description: e.target.value }))}
              className="input-field"
              rows="3"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '10px',
                background: '#1a1a1a',
                color: '#00ff00',
                border: '1px solid #00ff00',
                fontSize: '12px',
                fontFamily: 'Courier New, monospace',
                resize: 'vertical'
              }}
            />
            <div className="input-row" style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00ff00', fontSize: '12px' }}>
                최대 인원:
                <input
                  type="number"
                  value={mapData.maxUsers}
                  onChange={(e) => setMapData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 10 }))}
                  min="1"
                  max="50"
                  className="input-field small"
                  style={{
                    width: '60px',
                    padding: '5px',
                    background: '#1a1a1a',
                    color: '#00ff00',
                    border: '1px solid #00ff00',
                    fontSize: '12px'
                  }}
                />
              </label>
            </div>
            <div className="input-row" style={{ marginBottom: '10px' }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00ff00', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={mapData.isPublic}
                  onChange={(e) => setMapData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  style={{
                    cursor: 'pointer'
                  }}
                />
                공개 공간
              </label>
            </div>
          </div>

          {/* 배경 이미지 */}
          <div className="tool-section" style={{ 
            padding: '15px', 
            borderBottom: '1px solid #333'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00ffff' }}>배경 이미지</h4>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBackgroundUpload}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => {
                console.log('업로드 버튼 클릭됨')
                console.log('fileInputRef.current:', fileInputRef.current)
                if (fileInputRef.current) {
                  fileInputRef.current.click()
                } else {
                  console.error('fileInputRef.current가 null입니다')
                }
              }}
              className="tool-button"
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1a1a',
                color: '#00ff00',
                border: '1px solid #00ff00',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              이미지 업로드
            </button>
            {mapData.backgroundImage && (
              <div className="image-info">
                크기: {mapData.size.width} x {mapData.size.height}
              </div>
            )}
          </div>

          {/* 그리기 도구 */}
          <div className="tool-section" style={{ 
            padding: '15px', 
            borderBottom: '1px solid #333'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00ffff' }}>그리기 도구</h4>
            <div className="tool-buttons" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginTop: '10px'
            }}>
              <button 
                onClick={() => setSelectedTool('select')}
                style={{
                  padding: '10px',
                  background: selectedTool === 'select' ? '#00ff00' : '#1a1a1a',
                  color: selectedTool === 'select' ? '#000' : '#00ff00',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                선택
              </button>
              <button 
                onClick={() => setSelectedTool('wall')}
                style={{
                  padding: '10px',
                  background: selectedTool === 'wall' ? '#00ff00' : '#1a1a1a',
                  color: selectedTool === 'wall' ? '#000' : '#00ff00',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                벽 그리기
              </button>
              <button 
                onClick={() => setSelectedTool('private')}
                style={{
                  padding: '10px',
                  background: selectedTool === 'private' ? '#00ff00' : '#1a1a1a',
                  color: selectedTool === 'private' ? '#000' : '#00ff00',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                프라이빗 영역
              </button>
              <button 
                onClick={() => setSelectedTool('spawn')}
                style={{
                  padding: '10px',
                  background: selectedTool === 'spawn' ? '#00ff00' : '#1a1a1a',
                  color: selectedTool === 'spawn' ? '#000' : '#00ff00',
                  border: '1px solid #00ff00',
                  cursor: 'pointer'
                }}
              >
                시작점
              </button>
              <button 
                onClick={() => setSelectedTool('editWall')}
                style={{
                  padding: '10px',
                  background: selectedTool === 'editWall' ? '#ffff00' : '#1a1a1a',
                  color: selectedTool === 'editWall' ? '#000' : '#ffff00',
                  border: '1px solid #ffff00',
                  cursor: 'pointer'
                }}
              >
                벽 편집
              </button>
              <button 
                onClick={() => setSelectedTool('editArea')}
                style={{
                  padding: '10px',
                  background: selectedTool === 'editArea' ? '#00ffff' : '#1a1a1a',
                  color: selectedTool === 'editArea' ? '#000' : '#00ffff',
                  border: '1px solid #00ffff',
                  cursor: 'pointer'
                }}
              >
                영역 편집
              </button>
              <button 
                onClick={() => setSelectedTool('delete')}
                style={{
                  padding: '10px',
                  background: selectedTool === 'delete' ? '#ff0000' : '#1a1a1a',
                  color: selectedTool === 'delete' ? '#fff' : '#ff0000',
                  border: '1px solid #ff0000',
                  cursor: 'pointer'
                }}
              >
                삭제
              </button>
            </div>
          </div>



          {/* 레이어 투명도 조절 */}
          <div className="tool-section" style={{ 
            padding: '15px', 
            borderBottom: '1px solid #333'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00ffff' }}>레이어 투명도</h4>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: '#00ff00', fontSize: '12px' }}>
                배경: {Math.round(layerOpacity.background * 100)}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={layerOpacity.background * 100}
                onChange={(e) => setLayerOpacity(prev => ({ 
                  ...prev, 
                  background: e.target.value / 100 
                }))}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: '#00ff00', fontSize: '12px' }}>
                벽: {Math.round(layerOpacity.walls * 100)}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={layerOpacity.walls * 100}
                onChange={(e) => setLayerOpacity(prev => ({ 
                  ...prev, 
                  walls: e.target.value / 100 
                }))}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: '#00ff00', fontSize: '12px' }}>
                프라이빗 영역: {Math.round(layerOpacity.privateAreas * 100)}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={layerOpacity.privateAreas * 100}
                onChange={(e) => setLayerOpacity(prev => ({ 
                  ...prev, 
                  privateAreas: e.target.value / 100 
                }))}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>
          </div>

          {/* 아이템 목록 */}
          <div className="tool-section">
            <h4>벽 ({mapData.walls.length})</h4>
            <div className="item-list">
              {mapData.walls.map((wall, index) => (
                <div 
                  key={index} 
                  className={`list-item ${selectedItemIndex === index && selectedItemType === 'wall' ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedItemIndex(index)
                    setSelectedItemType('wall')
                  }}
                >
                  <span>벽 {index + 1}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteWall(index)
                    }}
                    className="delete-btn"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="tool-section">
            <h4>프라이빗 영역 ({mapData.privateAreas.length})</h4>
            <div className="item-list">
              {mapData.privateAreas.map((area, index) => (
                <div 
                  key={index} 
                  className={`list-item ${selectedItemIndex === index && selectedItemType === 'area' ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedItemIndex(index)
                    setSelectedItemType('area')
                  }}
                >
                  <span>영역 {index + 1}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePrivateArea(index)
                    }}
                    className="delete-btn"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* 액션 버튼들 - 사이드바 하단 */}
          <div style={{
            padding: '15px',
            borderTop: '2px solid #00ff00',
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <button 
              onClick={resetEditor}
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1a1a',
                color: '#ffff00',
                border: '1px solid #ffff00',
                cursor: 'pointer',
                fontSize: '13px',
                borderRadius: '4px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ffff00'
                e.target.style.color = '#000'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#1a1a1a'
                e.target.style.color = '#ffff00'
              }}
            >
              🔄 초기화
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '12px',
                background: isSaving ? '#333' : '#00ff00',
                color: isSaving ? '#666' : '#000',
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '4px',
                transition: 'all 0.3s ease'
              }}
            >
              {isSaving ? '저장 중...' : '💾 저장'}
            </button>
            <button 
              onClick={handleExit}
              style={{
                width: '100%',
                padding: '12px',
                background: '#ff3333',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '4px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#ff5555'}
              onMouseLeave={(e) => e.target.style.background = '#ff3333'}
            >
              ❌ 취소
            </button>
          </div>
            </div>
          )}
        </div>

        {/* 줌 인디케이터 */}
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#00ff00',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #00ff00',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1001,
          userSelect: 'none'
        }}>
          Zoom: {Math.round(zoomScale * 100)}%
        </div>

        {/* 캔버스 영역 - 전체 화면 */}
        <div className="canvas-area" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          zIndex: 1
        }}>
          <div 
            ref={canvasContainerRef}
            className="canvas-container"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              cursor: (selectedTool === 'wall' || selectedTool === 'private') ? 'crosshair' : (isDrawing ? 'crosshair' : (isPanning ? 'grabbing' : 'default')),
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
              transformOrigin: '0 0'
            }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onMouseLeave={() => {
              setIsDrawing(false)
              setCurrentDrawing(null)
              setIsPanning(false)
            }}
          >
            <MultiLayerCanvas
              ref={canvasRef}
              width={document.documentElement.clientWidth || window.innerWidth}
              height={document.documentElement.clientHeight || window.innerHeight}
              backgroundImage={mapData.backgroundImage}
              layers={{
                background: null,
                walls: mapData.walls,
                privateAreas: mapData.privateAreas,
                entities: mapData.spawnPoints?.map(point => ({
                  type: 'spawn',
                  position: point
                })) || []
              }}
              layerOpacity={layerOpacity}
              isEditMode={true}
              showTransition={false}
              enableLightning={false}
              onSizeChange={(newSize) => {
                setMapData(prev => ({
                  ...prev,
                  size: newSize
                }))
              }}
            />
            
            {/* 현재 그리기 중인 요소 미리보기 */}
            {currentDrawing && (
            <svg 
              className="drawing-preview" 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: (document.documentElement.clientWidth || window.innerWidth) / zoomScale,
                height: (document.documentElement.clientHeight || window.innerHeight) / zoomScale,
                pointerEvents: 'none',
                zIndex: 100
              }}
              viewBox={`0 0 ${(document.documentElement.clientWidth || window.innerWidth) / zoomScale} ${(document.documentElement.clientHeight || window.innerHeight) / zoomScale}`}
            >
              {currentDrawing.type === 'wall' && (
                <line
                  x1={currentDrawing.start.x}
                  y1={currentDrawing.start.y}
                  x2={currentDrawing.end.x}
                  y2={currentDrawing.end.y}
                  stroke="red"
                  strokeWidth={3 / zoomScale}
                  strokeDasharray={`${5 / zoomScale},${5 / zoomScale}`}
                  strokeOpacity="0.8"
                />
              )}
              {currentDrawing.type === 'area' && (
                <rect
                  x={Math.min(currentDrawing.start.x, currentDrawing.end.x)}
                  y={Math.min(currentDrawing.start.y, currentDrawing.end.y)}
                  width={Math.abs(currentDrawing.end.x - currentDrawing.start.x)}
                  height={Math.abs(currentDrawing.end.y - currentDrawing.start.y)}
                  fill="blue"
                  fillOpacity="0.2"
                  stroke="blue"
                  strokeOpacity="0.5"
                  strokeWidth={2 / zoomScale}
                  strokeDasharray={`${5 / zoomScale},${5 / zoomScale}`}
                />
              )}
            </svg>
            )}

            {/* 시작점 표시 - 핀 스타일 */}
            {mapData.spawnPoints?.map((point, index) => (
              <div
                key={index}
                className="spawn-point-marker"
                style={{
                  position: 'absolute',
                  left: point.x - 15 / zoomScale,  // 핀 중심 조정 (줌 스케일 적용)
                  top: point.y - 40 / zoomScale,   // 핀 끝이 정확한 위치에 오도록 조정 (줌 스케일 적용)
                  width: `${30 / zoomScale}px`,
                  height: `${40 / zoomScale}px`,
                  zIndex: 101,
                  pointerEvents: 'none'
                }}
              >
                {/* 핀 SVG */}
                <svg width={30 / zoomScale} height={40 / zoomScale} viewBox="0 0 30 40" style={{ display: 'block' }}>
                  {/* 핀 바늘 (아래쪽 뾰족한 부분) */}
                  <path 
                    d="M 15 40 L 12 25 L 18 25 Z" 
                    fill="#333"
                    stroke="#000"
                    strokeWidth="0.5"
                  />
                  {/* 붉은 구슬 */}
                  <circle 
                    cx="15" 
                    cy="15" 
                    r="12" 
                    fill="#ff0000"
                    stroke="#800000"
                    strokeWidth="1"
                  />
                  {/* 구슬 하이라이트 */}
                  <ellipse 
                    cx="12" 
                    cy="10" 
                    rx="5" 
                    ry="4" 
                    fill="rgba(255, 255, 255, 0.6)"
                  />
                  {/* 시작점 텍스트 */}
                  <text 
                    x="15" 
                    y="19" 
                    textAnchor="middle" 
                    fill="white" 
                    fontSize="10" 
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    S
                  </text>
                </svg>
              </div>
            ))}
            
            {/* 프라이빗 영역 이름 표시 */}
            {mapData.privateAreas?.map((area, index) => (
              <div
                key={`area-label-${index}`}
                style={{
                  position: 'absolute',
                  left: area.position.x + area.size.width / 2,
                  top: area.position.y + area.size.height / 2,
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0, 0, 255, 0.8)',
                  color: 'white',
                  padding: `${4 / zoomScale}px ${8 / zoomScale}px`,
                  borderRadius: `${4 / zoomScale}px`,
                  fontSize: `${12 / zoomScale}px`,
                  fontWeight: 'bold',
                  fontFamily: 'sans-serif',
                  zIndex: 102,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  border: `${1 / zoomScale}px solid rgba(255, 255, 255, 0.5)`,
                  boxShadow: `0 ${2 / zoomScale}px ${4 / zoomScale}px rgba(0, 0, 0, 0.3)`
                }}
              >
                프라이빗 영역 {index + 1}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
})

export default MetaverseEditor