import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

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
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (backgroundImage) {
      const img = new Image()
      img.onload = () => {
        ctx.globalAlpha = layerOpacity.background || 1
        // 이미지를 (0, 0)부터 시작하도록 그림 - 잘림 방지
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)
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
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    ctx.globalAlpha = layerOpacity.privateAreas || 1
    
    if (layers.privateAreas) {
      layers.privateAreas.forEach(area => {
        ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)'
        ctx.lineWidth = 2
        
        ctx.fillRect(area.position.x, area.position.y, area.size.width, area.size.height)
        ctx.strokeRect(area.position.x, area.position.y, area.size.width, area.size.height)
      })
    }
    
    ctx.globalAlpha = 1
  }

  const drawEntities = () => {
    const canvas = entitiesCanvasRef.current
    if (!canvas) return
    
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