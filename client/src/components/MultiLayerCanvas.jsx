import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { getPrivateAreaColor } from '../utils/privateAreaUtils'

const MultiLayerCanvas = forwardRef(({ 
  width, 
  height, 
  backgroundImage,
  layers = {},
  layerOpacity = {},
  isEditMode = false,
  showTransition = false,
  enableLightning = false,
  onSizeChange
}, ref) => {
  const canvasRef = useRef(null)
  const backgroundCanvasRef = useRef(null)
  const wallsCanvasRef = useRef(null)
  const areasCanvasRef = useRef(null)
  const entitiesCanvasRef = useRef(null)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    redraw: () => drawAll()
  }))

  const drawAll = () => {
    drawBackground()
    drawWalls()
    drawPrivateAreas()
    drawEntities()
  }

  const drawBackground = () => {
    const canvas = backgroundCanvasRef.current
    if (!canvas) return
    
    // 캔버스 크기를 명시적으로 설정
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (backgroundImage) {
      const img = new Image()
      img.onload = () => {
        ctx.globalAlpha = layerOpacity.background || 1
        // 이미지를 캔버스 전체 크기에 맞춰 그리기
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        ctx.globalAlpha = 1
        
        if (onSizeChange && (img.width !== canvas.width || img.height !== canvas.height)) {
          onSizeChange({ width: img.width, height: img.height })
        }
      }
      img.src = backgroundImage
    }
  }

  const drawWalls = () => {
    const canvas = wallsCanvasRef.current
    if (!canvas) return
    
    // 캔버스 크기를 명시적으로 설정
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    ctx.globalAlpha = layerOpacity.walls || 1
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 3
    
    if (layers.walls) {
      layers.walls.forEach(wall => {
        ctx.beginPath()
        ctx.moveTo(wall.start.x, wall.start.y)
        ctx.lineTo(wall.end.x, wall.end.y)
        ctx.stroke()
      })
    }
    
    ctx.globalAlpha = 1
  }

  const drawPrivateAreas = () => {
    const canvas = areasCanvasRef.current
    if (!canvas) return
    
    // 캔버스 크기를 명시적으로 설정
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    ctx.globalAlpha = layerOpacity.privateAreas || 1
    
    if (layers.privateAreas) {
      layers.privateAreas.forEach((area, index) => {
        // 프라이빗 영역별 무지개 색상 적용
        const color = getPrivateAreaColor(index)
        ctx.fillStyle = color.fill
        ctx.strokeStyle = color.stroke
        ctx.lineWidth = 2
        
        ctx.fillRect(area.position.x, area.position.y, area.size.width, area.size.height)
        ctx.strokeRect(area.position.x, area.position.y, area.size.width, area.size.height)
        
        // 영역 번호와 색상명 표시
        const centerX = area.position.x + area.size.width / 2
        const centerY = area.position.y + area.size.height / 2
        const labelText = `영역 ${index + 1}`
        const colorText = color.name
        
        // 텍스트 배경
        ctx.font = 'bold 14px Arial'
        const textWidth = Math.max(ctx.measureText(labelText).width, ctx.measureText(colorText).width)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillRect(centerX - textWidth/2 - 5, centerY - 15, textWidth + 10, 30)
        
        // 텍스트 그리기
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(labelText, centerX, centerY - 7)
        ctx.font = '12px Arial'
        ctx.fillText(colorText, centerX, centerY + 7)
      })
    }
    
    ctx.globalAlpha = 1
  }

  const drawEntities = () => {
    const canvas = entitiesCanvasRef.current
    if (!canvas) return
    
    // 캔버스 크기를 명시적으로 설정
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    ctx.globalAlpha = layerOpacity.spawnPoints || 1
    
    if (layers.entities) {
      layers.entities.forEach(entity => {
        if (entity.type === 'spawn' && entity.position) {
          // 시작점은 별도의 DOM 엘리먼트로 렌더링하므로 여기서는 표시하지 않음
        }
      })
    }
    
    ctx.globalAlpha = 1
  }

  useEffect(() => {
    drawAll()
  }, [backgroundImage, layers, layerOpacity, width, height])

  const canvasStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    pointerEvents: isEditMode ? 'none' : 'auto'
  }

  return (
    <div ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <canvas 
        ref={backgroundCanvasRef}
        width={width}
        height={height}
        style={{ ...canvasStyle, zIndex: 1 }}
      />
      <canvas 
        ref={areasCanvasRef}
        width={width}
        height={height}
        style={{ ...canvasStyle, zIndex: 2 }}
      />
      <canvas 
        ref={wallsCanvasRef}
        width={width}
        height={height}
        style={{ ...canvasStyle, zIndex: 3 }}
      />
      <canvas 
        ref={entitiesCanvasRef}
        width={width}
        height={height}
        style={{ ...canvasStyle, zIndex: 4 }}
      />
    </div>
  )
})

MultiLayerCanvas.displayName = 'MultiLayerCanvas'

export default MultiLayerCanvas