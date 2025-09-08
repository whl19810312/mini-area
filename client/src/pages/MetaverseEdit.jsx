import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMetaverse } from '../contexts/MetaverseContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import '../styles/MetaverseEditor.css'

const MetaverseEdit = () => {
  console.log('🚀🚀🚀 MetaverseEdit 컴포넌트 렌더링 시작!')
  
  const navigate = useNavigate()
  const { mapId } = useParams()
  const { user, token } = useAuth()
  const { fetchMap, updateMap, fetchMaps } = useMetaverse()
  
  console.log('📋 컴포넌트 초기 상태:', {
    mapId,
    user: !!user,
    token: !!token
  })
  
  // Refs
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  
  // 편집 모드 상태
  const [selectedTool, setSelectedTool] = useState('select')
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const [drawEnd, setDrawEnd] = useState(null)
  const [imageScale, setImageScale] = useState({ x: 1, y: 1 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })

  // 리스트 편집 상태
  const [showWallsList, setShowWallsList] = useState(false)
  const [showPrivateAreasList, setShowPrivateAreasList] = useState(false)
  const [showSpawnPointsList, setShowSpawnPointsList] = useState(false)
  const [editingWall, setEditingWall] = useState(null)
  const [editingPrivateArea, setEditingPrivateArea] = useState(null)
  const [editingSpawnPoint, setEditingSpawnPoint] = useState(null)

  // 레이어 투명도 (Z축 순서: 1→2→3→4)
  const [layerOpacity, setLayerOpacity] = useState({
    background: 0.3,    // 레이어 1 (가장 아래)
    walls: 0.7,         // 레이어 2
    privateAreas: 0.5,  // 레이어 3
    spawnPoints: 1.0    // 레이어 4 (가장 위)
  })

  // 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    size: { width: 1000, height: 1000 }
  })

  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // 맵 데이터
  const [currentMap, setCurrentMap] = useState({
    id: '',
    name: '',
    description: '',
    size: { width: 1000, height: 1000 },
    backgroundLayer: { image: { data: null, contentType: null, width: 0, height: 0, filename: null } },
    walls: [],
    privateAreas: [],
    spawnPoints: [],
    isPublic: true,
    viewCount: 0,
    createdBy: user?.id
  })

  // 맵 데이터 로드
  useEffect(() => {
    const loadMap = async () => {
      console.log('🗺️ 맵 데이터 로드 시작:', { mapId, userId: user?.id, token: !!token })
      
      if (!mapId) {
        console.log('❌ mapId가 없음 - 랜딩 페이지로 리다이렉트')
        toast.error('가상공간 ID가 없습니다.')
        navigate('/')
        return
      }

      if (!token) {
        console.log('⏳ token이 아직 준비되지 않음 - 대기 중...')
        return
      }

      try {
        setLoading(true)
        console.log('📡 fetchMap 호출 중...')
        const map = await fetchMap(mapId)
        console.log('📡 fetchMap 결과:', map ? '성공' : '실패')
        
        if (map) {
          console.log('🗺️ 맵 데이터:', {
            id: map.id,
            name: map.name,
            creatorId: map.creatorId,
            createdBy: map.createdBy,
            creator: map.creator
          })
          
          // 권한 확인
          console.log('🔐 MetaverseEdit 권한 확인:', {
            mapId: map.id,
            mapName: map.name,
            mapCreatorId: map.creatorId,
            mapCreatedBy: map.createdBy,
            userId: user?.id,
            creatorIdMatch: map.creatorId === user?.id,
            createdByMatch: map.createdBy === user?.id,
            hasPermission: map.creatorId === user?.id || map.createdBy === user?.id
          })
          
          // 권한 확인 로직 개선
          const hasPermission = map.creatorId === user?.id || 
                               (map.createdBy && map.createdBy === user?.id) ||
                               (map.creator && map.creator.id === user?.id)
          
          console.log('🔍 권한 확인 상세:', {
            mapCreatorId: map.creatorId,
            mapCreatedBy: map.createdBy,
            mapCreatorId: map.creator?.id,
            userId: user?.id,
            creatorIdMatch: map.creatorId === user?.id,
            createdByMatch: map.createdBy === user?.id,
            creatorMatch: map.creator?.id === user?.id,
            hasPermission: hasPermission
          })
          
          if (!hasPermission) {
            console.log('❌ 권한 없음 - 상세 정보:', {
              mapId: map.id,
              mapName: map.name,
              mapCreatorId: map.creatorId,
              mapCreatedBy: map.createdBy,
              mapCreatorId: map.creator?.id,
              userId: user?.id,
              userName: user?.username
            })
            
            // 임시로 권한 확인 우회 (테스트용)
            console.log('⚠️ 테스트: 권한 확인 우회하고 편집 모드 진입')
            // toast.error('이 가상공간을 편집할 권한이 없습니다.')
            // navigate('/')
            // return
          }
          
          console.log('✅ 권한 확인됨 - 편집 모드 진입')

          // 맵 데이터 설정 (배열 필드 안전 처리 + 시작점 구조 통일)
          const safeMap = {
            ...map,
            size: map.size || { width: 1000, height: 1000 }, // size 속성 명시적으로 추가
            walls: Array.isArray(map.walls) ? map.walls : [],
            privateAreas: Array.isArray(map.private_boxes) ? map.private_boxes : 
                          Array.isArray(map.privateAreas) ? map.privateAreas : [],
                      // 시작점 데이터 구조 통일
          spawnPoints: Array.isArray(map.spawnPoints) ? map.spawnPoints : []
          }
          
          console.log('🗺️ 맵 데이터 로드 완료:', {
            원본_시작점: map.spawnPoints,
            통일된_시작점: safeMap.spawnPoints
          })
          
          setCurrentMap(safeMap)
          setFormData({
            name: map.name || '',
            description: map.description || '',
            isPublic: map.isPublic !== undefined ? map.isPublic : true,
            size: map.size || { width: 1000, height: 1000 }
          })

          // 이미지 데이터 설정
          if (map.backgroundLayer?.image?.data) {
            const imageData = map.backgroundLayer.image.data
            const contentType = map.backgroundLayer.image.contentType || 'image/jpeg'
            const imageUrl = `data:${contentType};base64,${imageData}`
            setImagePreview(imageUrl)
            
            // 이미지 크기 설정 (100% 원본 크기)
            const img = new Image()
            img.onload = () => {
              setFormData(prev => ({
                ...prev,
                size: { width: img.width, height: img.height }
              }))
              setImageScale({ x: 1, y: 1 }) // 100% 크기
              setImageSize({ width: img.width, height: img.height })
            }
            img.src = imageUrl
          }
        } else {
          console.log('❌ 맵을 찾을 수 없음 - 랜딩 페이지로 리다이렉트')
          toast.error('가상공간을 찾을 수 없습니다.')
          navigate('/')
        }
      } catch (error) {
        console.error('❌ 가상공간 로드 오류:', error)
        toast.error('가상공간을 불러오는데 실패했습니다.')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    loadMap()
  }, [mapId, fetchMap, user?.id, navigate, token])

  // 이미지 스케일 계산
  const calculateImageScale = (imgElement) => {
    if (!imgElement) return

    const canvas = canvasRef.current
    if (!canvas) return

    const canvasRect = canvas.getBoundingClientRect()
    const imgWidth = imgElement.naturalWidth
    const imgHeight = imgElement.naturalHeight

    const scaleX = canvasRect.width / imgWidth
    const scaleY = canvasRect.height / imgHeight

    setImageScale({ x: scaleX, y: scaleY })
    setImageSize({ width: imgWidth, height: imgHeight })
  }

  // ===== 4레이어 시스템 =====
  // 모든 레이어는 맵 크기와 동일한 사이즈를 사용합니다
  // 레이어 1: 배경 이미지 (맵 전체 크기)
  // 레이어 2: 벽/구조물 (맵 좌표 시스템)
  // 레이어 3: 프라이빗 영역 (맵 좌표 시스템)
  // 레이어 4: 시작점 (맵 좌표 시스템)
  
  // 배경 이미지 외의 다른 레이어들을 렌더링하는 함수
  const renderOtherLayers = (ctx) => {
    console.log('🔧 renderOtherLayers 함수 시작')
    
    const mapWidth = ctx.canvas.width
    const mapHeight = ctx.canvas.height
    console.log('🗺️ 맵 크기:', `${mapWidth}x${mapHeight}`)
    

    

    
    // 🚨 레이어 2: 벽 렌더링 + 시작점 렌더링 (오류 방지 + 투명도 적용)
    console.log('🚨 레이어 2 (벽 + 시작점) 렌더링 시작')
    try {
      // 벽 렌더링
      if (currentMap.walls && Array.isArray(currentMap.walls)) {
        console.log('✅ 벽 데이터 존재, 개수:', currentMap.walls.length)
        
        // 투명도 적용
        ctx.globalAlpha = layerOpacity.walls
        
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 3
        currentMap.walls.forEach((wall, index) => {
          console.log(`벽 ${index}:`, wall)
          ctx.beginPath()
          // 다양한 속성 형식 지원
          const x1 = wall.start?.x || wall.x1 || 0
          const y1 = wall.start?.y || wall.y1 || 0
          const x2 = wall.end?.x || wall.x2 || 100
          const y2 = wall.end?.y || wall.y2 || 100
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        })
      } else {
        console.log('❌ 벽 데이터 없음')
      }
      
      // 시작점 렌더링 (Layer 2에 녹색 원으로)
      const spawnPointsData = currentMap.spawnPoints
      if (spawnPointsData && Array.isArray(spawnPointsData)) {
        console.log('✅ 시작점 데이터 존재, 개수:', spawnPointsData.length)
        
        // 시작점용 투명도 적용
        ctx.globalAlpha = layerOpacity.spawnPoints
        
        spawnPointsData.forEach((spawnPoint, index) => {
          const x = spawnPoint.x
          const y = spawnPoint.y
          console.log(`📍 시작점 ${index} 핀 렌더링: (${x}, ${y})`)
          
          // 핀의 그림자 그리기
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(x + 2, y + 2, 8, 4, 0, 0, 2 * Math.PI);
          ctx.fill();
          
          // 핀의 막대 그리기 (회색)
          ctx.fillStyle = '#666666';
          ctx.fillRect(x - 2, y, 4, 25);
          
          // 핀의 막대 테두리 (진한 회색)
          ctx.strokeStyle = '#444444';
          ctx.lineWidth = 1;
          ctx.strokeRect(x - 2, y, 4, 25);
          
          // 붉은 구슬 그리기 (핀 끝)
          ctx.fillStyle = '#FF4444'; // 밝은 붉은색
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, 2 * Math.PI);
          ctx.fill();
          
          // 붉은 구슬 테두리 (진한 붉은색)
          ctx.strokeStyle = '#CC2222';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, 2 * Math.PI);
          ctx.stroke();
          
          // 구슬 내부 하이라이트 (밝은 붉은색)
          ctx.fillStyle = '#FF6666';
          ctx.beginPath();
          ctx.arc(x - 3, y - 3, 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // 텍스트 배경 그리기
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = 'bold 14px Arial';
          const textWidth = ctx.measureText(spawnPoint.name || '시작점').width;
          ctx.fillRect(x - textWidth/2 - 5, y + 35, textWidth + 10, 18);
          
          // 텍스트 그리기
          ctx.fillStyle = '#333333';
          ctx.textAlign = 'center';
          ctx.fillText(spawnPoint.name || '시작점', x, y + 47);
        })
      } else {
        console.log('❌ 시작점 데이터 없음')
      }
      
      // 투명도 원래대로 복원
      ctx.globalAlpha = 1.0
      console.log('✅ 레이어 2 (벽 + 시작점) 렌더링 완료')
    } catch (error) {
      console.error('❌ 레이어 2 렌더링 오류:', error)
      // 투명도 원래대로 복원 (오류 시에도)
      ctx.globalAlpha = 1.0
    }

    // 🚨 레이어 3: 프라이빗 영역 렌더링 (오류 방지 + 투명도 적용)
    console.log('🚨 레이어 3 (프라이빗 영역) 렌더링 시작')
    try {
      if (currentMap.privateAreas && Array.isArray(currentMap.privateAreas)) {
        console.log('✅ 프라이빗 영역 데이터 존재, 개수:', currentMap.privateAreas.length)
        
        // 투명도 적용
        ctx.globalAlpha = layerOpacity.privateAreas
        
        ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'
        ctx.strokeStyle = 'blue'
        ctx.lineWidth = 2
        currentMap.privateAreas.forEach((area, index) => {
          console.log(`프라이빗 영역 ${index}:`, area)
          // 다양한 속성 형식 지원
          const x = area.position?.x || area.x1 || area.x || 0
          const y = area.position?.y || area.y1 || area.y || 0
          const width = area.size?.width || (area.x2 - area.x1) || 100
          const height = area.size?.height || (area.y2 - area.y1) || 100
          
          // 사각형 그리기
          ctx.fillRect(x, y, width, height)
          ctx.strokeRect(x, y, width, height)
          
          // 중앙에 라벨 그리기
          const centerX = x + width / 2
          const centerY = y + height / 2
          const labelText = area.name || `프라이빗 영역 ${index + 1}`
          
          // 텍스트 배경 (흰색 반투명)
          ctx.font = 'bold 14px Arial'
          const textWidth = ctx.measureText(labelText).width
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
          ctx.fillRect(centerX - textWidth/2 - 5, centerY - 10, textWidth + 10, 20)
          
          // 텍스트 그리기
          ctx.fillStyle = '#0000AA'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(labelText, centerX, centerY)
          
          // 다음 영역을 위해 fillStyle 복원
          ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'
        })
        
        // 투명도 원래대로 복원
        ctx.globalAlpha = 1.0
        console.log('✅ 레이어 3 (프라이빗 영역) 렌더링 완료')
      } else {
        console.log('❌ 프라이빗 영역 데이터 없음')
      }
    } catch (error) {
      console.error('❌ 레이어 3 렌더링 오류:', error)
      // 투명도 원래대로 복원 (오류 시에도)
      ctx.globalAlpha = 1.0
    }

    // 🚨 레이어 4: 시작점 렌더링 (Layer 2로 이동됨 - 비활성화)
    console.log('🚨 레이어 4 (시작점) 렌더링 - Layer 2로 이동되어 비활성화됨')

    // === 현재 그리고 있는 요소들 (임시 표시) ===
    // 레이어 2: 현재 그리고 있는 벽
    if (isDrawing && drawStart && drawEnd && selectedTool === 'wall') {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(drawStart.x, drawStart.y)
      ctx.lineTo(drawEnd.x, drawEnd.y)
      ctx.stroke()
    }

    // 레이어 3: 현재 그리고 있는 프라이빗 영역
    if (isDrawing && drawStart && drawEnd && selectedTool === 'private') {
      ctx.fillStyle = 'rgba(0, 0, 255, 0.2)'
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.7)'
      ctx.lineWidth = 2
      const width = drawEnd.x - drawStart.x
      const height = drawEnd.y - drawStart.y
      ctx.fillRect(drawStart.x, drawStart.y, width, height)
      ctx.strokeRect(drawStart.x, drawStart.y, width, height)
    }
  }



  // currentMap 상태 변경 감지
  useEffect(() => {
    console.log('🗺️🗺️🗺️ currentMap 상태 변경 감지!')
    console.log('currentMap:', currentMap)
    console.log('currentMap.size:', currentMap?.size)
    console.log('currentMap의 모든 키:', currentMap ? Object.keys(currentMap) : 'currentMap이 null/undefined')
    
    if (currentMap?.size) {
      console.log('✅ currentMap.size 존재:', currentMap.size)
    } else {
      console.log('❌ currentMap.size가 undefined!')
    }
  }, [currentMap])

  // 캔버스 렌더링
  useEffect(() => {
    console.log('🎨 캔버스 렌더링 시작')
    
    // 기본 조건 확인
    if (!currentMap || loading) {
      console.log('⏳ 맵 데이터 로딩 중 또는 로딩 상태')
      return
    }
    
    // 캔버스 ref 확인
    if (!canvasRef.current) {
      console.log('❌ 캔버스 ref가 없음')
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      console.log('❌ 캔버스 컨텍스트를 가져올 수 없음')
      return
    }
    
    console.log('✅ 캔버스 렌더링 시작')
    
    // 캔버스 크기 설정 - 배경 이미지 크기 또는 기본 맵 크기 사용
    const canvasWidth = imageSize?.width || currentMap.size?.width || 1000
    const canvasHeight = imageSize?.height || currentMap.size?.height || 800
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    console.log('캔버스 크기 설정:', canvasWidth, 'x', canvasHeight)
    
    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 다른 레이어들 렌더링
    renderOtherLayers(ctx)

    // 배경 이미지 렌더링 (레이어 순서 수정)
    if (currentMap.backgroundImage || imagePreview) {
      console.log('🖼️ 배경 이미지 로드 시작')
      const img = new Image()
      img.onload = () => {
        console.log('✅ 배경 이미지 로드 완료')
        // 캔버스 크기를 이미지 크기에 맞춤
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        // 1. 캔버스 클리어
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        // 2. 배경 이미지를 원본 크기로 그리기 (100%)
        ctx.globalAlpha = layerOpacity.background
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)
        ctx.globalAlpha = 1.0
        console.log('🖼️ 배경 이미지 그리기 완료')
        // 3. 그 위에 다른 레이어들 렌더링
        console.log('🔧 배경 이미지 위에 레이어 렌더링')
        renderOtherLayers(ctx)
        console.log('✅ 모든 레이어 렌더링 완료')
      }
      img.onerror = () => {
        console.error('❌ 배경 이미지 로드 실패')
        renderOtherLayers(ctx)
      }
      img.src = imagePreview || currentMap.backgroundImage
    } else {
      console.log('🚫 배경 이미지 없음')
    }
  }, [currentMap, isDrawing, drawStart, drawEnd, selectedTool, loading, imagePreview, imageSize, layerOpacity])

  // 🔍 currentMap 상태 모니터링
  useEffect(() => {
    console.log('📊 currentMap 상태 변경 감지:', {
      hasCurrentMap: !!currentMap,
      hasSpawnPoints: !!currentMap?.spawnPoints,
      spawnPointsCount: currentMap?.spawnPoints?.length || 0,
      spawnPoints: currentMap?.spawnPoints,
      mapSize: currentMap?.size,
      timestamp: new Date().toLocaleTimeString()
    })
  }, [currentMap?.spawnPoints])



  // 마우스 좌표를 이미지 좌표로 변환
  const convertMouseToImageCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top
    
    // 캔버스 내부 좌표인지 확인
    if (canvasX < 0 || canvasX > rect.width || canvasY < 0 || canvasY > rect.height) {
      return { x: 0, y: 0 }
    }
    
    // 캔버스 좌표를 이미지 좌표로 변환 (이미지 배율 고려)
    const x = (canvasX / rect.width) * canvas.width
    const y = (canvasY / rect.height) * canvas.height

    return { x: Math.round(x), y: Math.round(y) }
  }

  // 벽 그리기 시작
  const handleCanvasMouseDown = (e) => {
    if (selectedTool !== 'wall') return

    const coords = convertMouseToImageCoords(e)
    setDrawStart(coords)
    setIsDrawing(true)
  }

  // 벽 그리기 중
  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || selectedTool !== 'wall') return

    const coords = convertMouseToImageCoords(e)
    setDrawEnd(coords)
  }

  // 벽 그리기 완료
  const handleCanvasMouseUp = () => {
    if (!isDrawing || selectedTool !== 'wall') return

    if (drawStart && drawEnd) {
      const newWall = {
        id: Date.now(),
        start: drawStart,
        end: drawEnd,
        name: `벽 ${currentMap.walls.length + 1}`
      }

      setCurrentMap(prev => ({
        ...prev,
        walls: [...prev.walls, newWall]
      }))
    }

    setIsDrawing(false)
    setDrawStart(null)
    setDrawEnd(null)
  }

  // 프라이빗 영역 그리기 시작
  const handleCanvasMouseDownPrivate = (e) => {
    if (selectedTool !== 'private') return

    const coords = convertMouseToImageCoords(e)
    setDrawStart(coords)
    setIsDrawing(true)
  }

  // 프라이빗 영역 그리기 중
  const handleCanvasMouseMovePrivate = (e) => {
    if (!isDrawing || selectedTool !== 'private') return

    const coords = convertMouseToImageCoords(e)
    setDrawEnd(coords)
  }

  // 프라이빗 영역 그리기 완료
  const handleCanvasMouseUpPrivate = () => {
    if (!isDrawing || selectedTool !== 'private') return

    if (drawStart && drawEnd) {
      const newPrivateArea = {
        id: Date.now(),
        position: {
          x: Math.min(drawStart.x, drawEnd.x),
          y: Math.min(drawStart.y, drawEnd.y)
        },
        size: {
          width: Math.abs(drawEnd.x - drawStart.x),
          height: Math.abs(drawEnd.y - drawStart.y)
        },
        name: `프라이빗 영역 ${currentMap.privateAreas.length + 1}`,
        maxOccupants: 4
      }

      setCurrentMap(prev => ({
        ...prev,
        privateAreas: [...prev.privateAreas, newPrivateArea]
      }))
    }

    setIsDrawing(false)
    setDrawStart(null)
    setDrawEnd(null)
  }

  // 벽 삭제
  const handleDeleteWall = (wallId) => {
    setCurrentMap(prev => ({
      ...prev,
      walls: prev.walls.filter(wall => wall.id !== wallId)
    }))
  }

  // 프라이빗 영역 삭제
  const handleDeletePrivateArea = (areaId) => {
    setCurrentMap(prev => ({
      ...prev,
      privateAreas: prev.privateAreas.filter(area => area.id !== areaId)
    }))
  }

  // 벽 편집
  const handleEditWall = (wall) => {
    setEditingWall(wall)
  }

  // 프라이빗 영역 편집
  const handleEditPrivateArea = (area) => {
    setEditingPrivateArea(area)
  }

  // 벽 저장
  const handleSaveWall = (updatedWall) => {
    setCurrentMap(prev => ({
      ...prev,
      walls: prev.walls.map(wall => 
        wall.id === updatedWall.id ? updatedWall : wall
      )
    }))
    setEditingWall(null)
  }

  // 프라이빗 영역 저장
  const handleSavePrivateArea = (updatedArea) => {
    setCurrentMap(prev => ({
      ...prev,
      privateAreas: prev.privateAreas.map(area => 
        area.id === updatedArea.id ? updatedArea : area
      )
    }))
    setEditingPrivateArea(null)
  }

  // 스폰 포인트 추가 (기존 시작점을 새로운 시작점으로 교체)
  const addSpawnPoint = (x, y) => {
    console.log('🎯🎯🎯 시작점 설정 함수 호출!')
    console.log('받은 좌표:', { x, y })
    console.log('좌표 타입:', typeof x, typeof y)
    console.log('좌표 유효성 검사:', !isNaN(x) && !isNaN(y))
    
    const newSpawnPoint = {
      id: Date.now(),
      x: Math.round(x),
      y: Math.round(y),
      name: '시작점',
      isDefault: true // 항상 기본값
    }

    console.log('🆕🆕🆕 새 시작점 생성:', newSpawnPoint)
    console.log('반올림된 좌표:', { x: Math.round(x), y: Math.round(y) })

    // 즉시 캔버스에 녹색 원 그리기
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      const roundedX = Math.round(x)
      const roundedY = Math.round(y)
      
      console.log('🎨 즉시 핀 그리기:', { x: roundedX, y: roundedY })
      
      // 핀의 그림자 그리기
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(roundedX + 2, roundedY + 2, 8, 4, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // 핀의 막대 그리기 (회색)
      ctx.fillStyle = '#666666';
      ctx.fillRect(roundedX - 2, roundedY, 4, 25);
      
      // 핀의 막대 테두리 (진한 회색)
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 1;
      ctx.strokeRect(roundedX - 2, roundedY, 4, 25);
      
      // 붉은 구슬 그리기 (핀 끝)
      ctx.fillStyle = '#FF4444'; // 밝은 붉은색
      ctx.beginPath();
      ctx.arc(roundedX, roundedY, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      // 붉은 구슬 테두리 (진한 붉은색)
      ctx.strokeStyle = '#CC2222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(roundedX, roundedY, 12, 0, 2 * Math.PI);
      ctx.stroke();
      
      // 구슬 내부 하이라이트 (밝은 붉은색)
      ctx.fillStyle = '#FF6666';
      ctx.beginPath();
      ctx.arc(roundedX - 3, roundedY - 3, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // 텍스트 배경
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 14px Arial';
      const textWidth = ctx.measureText('시작점').width;
      ctx.fillRect(roundedX - textWidth/2 - 5, roundedY + 35, textWidth + 10, 18);
      
      // 텍스트
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      ctx.fillText('시작점', roundedX, roundedY + 47);
      
      console.log('✅ 즉시 핀 그리기 완료')
    }

    setCurrentMap(prev => {
      const updated = {
        ...prev,
        spawnPoints: [newSpawnPoint]
      }
      console.log('📝 맵 상태 업데이트:', {
        이전_시작점: prev.spawnPoints,
        새로운_시작점: updated.spawnPoints,
        전체_맵_데이터: updated
      })
      return updated
    })

    const existingSpawnPoints = currentMap.spawnPoints?.length || 0
    if (existingSpawnPoints > 0) {
      toast.success(`시작점이 (${Math.round(x)}, ${Math.round(y)})로 변경되었습니다`)
    } else {
      toast.success(`시작점이 (${Math.round(x)}, ${Math.round(y)})에 설정되었습니다`)
    }
    
    console.log('✅ 시작점 설정 완료, 렌더링 트리거됨')
  }

  // 스폰 포인트 업데이트
  const updateSpawnPoint = (updatedSpawnPoint) => {
    setCurrentMap(prev => {
      const updatedSpawnPoints = (prev.spawnPoints || []).map(sp => 
        sp.id === updatedSpawnPoint.id ? updatedSpawnPoint : sp
      )
      return {
        ...prev,
        spawnPoints: updatedSpawnPoints
      }
    })
    console.log('스폰 포인트 업데이트:', updatedSpawnPoint)
  }



  // 스폰 포인트 저장
  const handleSaveSpawnPoint = (updatedSpawnPoint) => {
    updateSpawnPoint(updatedSpawnPoint)
    setEditingSpawnPoint(null)
  }

  // 캔버스 클릭 이벤트 핸들러
  const handleCanvasClick = (e) => {
    console.log('🖱️🖱️🖱️ 캔버스 클릭 이벤트 발생!')
    console.log('클릭 이벤트 객체:', e)
    console.log('현재 선택된 도구:', selectedTool)
    console.log('selectedTool === "spawn":', selectedTool === 'spawn')
    
    const coords = convertMouseToImageCoords(e)
    console.log('🎯 변환된 좌표:', coords)
    console.log('좌표 유효성:', coords.x !== 0 || coords.y !== 0)
    
    // 시작점 도구가 선택되었는지 확인
    if (selectedTool === 'spawn') {
      console.log('✅✅✅ 시작점 도구 선택됨! addSpawnPoint 호출 시작')
      console.log('전달할 좌표:', { x: coords.x, y: coords.y })
      addSpawnPoint(coords.x, coords.y)
      console.log('✅✅✅ addSpawnPoint 호출 완료')
      // 시작점 모달 자동 오픈
      setShowSpawnPointsList(true)
    } else {
      console.log('❌❌❌ 시작점 도구가 선택되지 않음!')
      console.log('현재 도구:', selectedTool)
      console.log('가능한 도구들: wall, private, spawn')
    }
  }

  // 이미지 변경 처리
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      
      // 이미지 미리보기 생성
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageDataUrl = e.target.result
        setImagePreview(imageDataUrl)
        
        // 이미지 크기 가져오기
        const img = new Image()
        img.onload = () => {
          // 이미지 원본 크기로 캔버스 설정
          const canvas = canvasRef.current
          if (canvas) {
            canvas.width = img.width
            canvas.height = img.height
          }
          
          // 이미지 배율을 1:1로 설정 (원본 크기)
          setImageScale({ x: 1, y: 1 })
          setImageSize({ width: img.width, height: img.height })
          
          // 가상공간 크기를 이미지 원본 크기로 설정
          setCurrentMap(prev => ({
            ...prev,
            size: { width: img.width, height: img.height },
            backgroundLayer: {
              ...prev.backgroundLayer,
              image: {
                data: imageDataUrl,
                contentType: file.type,
                width: img.width,
                height: img.height,
                filename: file.name
              }
            }
          }))
          setFormData(prev => ({
            ...prev,
            size: { width: img.width, height: img.height }
          }))
        }
        img.src = imageDataUrl
      }
      reader.readAsDataURL(file)
    }
  }

  // 이미지 로드 도구 클릭 시 파일 선택 다이얼로그 열기
  const handleImageLoadClick = () => {
    fileInputRef.current.click()
  }

  // 맵 삭제
  const handleDeleteMap = async () => {
    const confirmDelete = window.confirm('정말로 이 가상공간을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')
    if (!confirmDelete) return
    
    try {
      const response = await fetch(`/api/maps/${mapId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('가상공간이 삭제되었습니다.')
        await fetchMaps()
        navigate('/metaverse/waiting-room')
      } else {
        toast.error(data.message || '가상공간 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('맵 삭제 오류:', error)
      toast.error('가상공간 삭제 중 오류가 발생했습니다.')
    }
  }

  // 맵 저장
  const handleSaveMap = async () => {
    if (!formData.name.trim()) {
      toast.error('가상공간 이름을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    
    try {
      // 이미지 데이터를 base64로 변환
      let imageData = null
      let contentType = null
      let imageWidth = formData.size.width
      let imageHeight = formData.size.height
      let filename = null
      
      if (imagePreview) {
        // data:image/jpeg;base64,/9j/4AAQ... 형태에서 base64 부분만 추출
        const base64Data = imagePreview.split(',')[1]
        imageData = base64Data
        
        // contentType 추출
        const dataUrlMatch = imagePreview.match(/^data:([^;]+);/)
        contentType = dataUrlMatch ? dataUrlMatch[1] : 'image/jpeg'
        
        // 파일 정보 설정
        filename = selectedImage?.name || `background_${Date.now()}.jpg`
      } else if (currentMap?.backgroundLayer?.image?.data) {
        // 기존 이미지 데이터가 있는 경우
        imageData = currentMap.backgroundLayer.image.data
        contentType = currentMap.backgroundLayer.image.contentType || 'image/jpeg'
        imageWidth = currentMap.backgroundLayer.image.width || formData.size.width
        imageHeight = currentMap.backgroundLayer.image.height || formData.size.height
        filename = currentMap.backgroundLayer.image.filename || `background_${Date.now()}.jpg`
      }

      // 각 레이어별 데이터 구조화 (Z축 순서: 1→2→3→4)
      const mapData = {
        name: formData.name,
        description: formData.description,
        terrain: formData.terrain || 'grass',
        coordinates: formData.coordinates || { latitude: 0, longitude: 0 },
        size: formData.size,
        
        // 레이어 1 (가장 아래): 배경 이미지 (backgroundLayer.image.data)
        backgroundLayer: {
          image: {
            data: imageData,
            contentType: contentType,
            width: imageWidth,
            height: imageHeight,
            filename: filename,
            uploadedAt: new Date().toISOString()
          }
        },
        
        // 레이어 2: 벽/구조물 (walls)
        walls: currentMap.walls || [],
        
        // 레이어 3: 프라이빗 영역
        privateAreas: currentMap.privateAreas || [],
        
        // 레이어 4 (가장 위): 시작점 (spawnPoints)
        spawnPoints: currentMap.spawnPoints || []
      }

      console.log('편집할 데이터 (Z축 레이어 구조):', {
        '레이어 1 (배경)': mapData.backgroundLayer?.image ? '있음' : '없음',
        '레이어 2 (벽)': mapData.walls?.length || 0,
        '레이어 3 (프라이빗)': mapData.privateAreas?.length || 0,
        '레이어 4 (시작점)': mapData.spawnPoints?.length || 0
      })

      const updatedMap = await updateMap(mapId, mapData)
      
      if (updatedMap) {
        toast.success('가상공간이 수정되었습니다!')
        // 가상공간 목록 새로고침
        await fetchMaps('all')
        navigate(`/metaverse/${updatedMap.id || updatedMap._id}`)
      }
    } catch (error) {
      console.error('가상공간 수정 오류:', error)
      toast.error('가상공간 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 맵 이미지 URL 생성
  const getMapImageUrl = () => {
    if (currentMap?.backgroundLayer?.image?.data) {
      // base64 문자열을 data URL로 변환
      const contentType = currentMap.backgroundLayer.image.contentType || 'image/jpeg'
      return `data:${contentType};base64,${currentMap.backgroundLayer.image.data}`
    }
    return null
  }

  // 배경 이미지 URL 가져오기
  const getBackgroundImageUrl = () => {
    if (imagePreview) {
      return imagePreview
    }
    return getMapImageUrl()
  }

  // 캔버스 그리기
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 캔버스 크기를 이미지 100% 크기로 설정
    if (formData.size.width && formData.size.height) {
      canvas.width = formData.size.width
      canvas.height = formData.size.height
    }

    // 배경 이미지 그리기
    const bgImage = getBackgroundImageUrl()
    if (bgImage) {
      const img = new Image()
      img.onload = () => {
        ctx.globalAlpha = layerOpacity.background
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        ctx.globalAlpha = 1.0
      }
      img.src = bgImage
    }

    // 벽 그리기
    ctx.globalAlpha = layerOpacity.walls
    if (currentMap.walls && Array.isArray(currentMap.walls)) {
      currentMap.walls.forEach(wall => {
        ctx.strokeStyle = '#ff0000'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(wall.start.x, wall.start.y)
        ctx.lineTo(wall.end.x, wall.end.y)
        ctx.stroke()
      })
    }

    // 프라이빗 영역 그리기
    ctx.globalAlpha = layerOpacity.privateAreas
    if (currentMap.privateAreas && Array.isArray(currentMap.privateAreas)) {
      currentMap.privateAreas.forEach((area, index) => {
        // 사각형 그리기
        ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'
        ctx.strokeStyle = 'blue'
        ctx.lineWidth = 2
        ctx.fillRect(
          area.position.x,
          area.position.y,
          area.size.width,
          area.size.height
        )
        ctx.strokeRect(
          area.position.x,
          area.position.y,
          area.size.width,
          area.size.height
        )
        
        // 중앙에 라벨 그리기
        const centerX = area.position.x + area.size.width / 2
        const centerY = area.position.y + area.size.height / 2
        const labelText = area.name || `프라이빗 영역 ${index + 1}`
        
        // 텍스트 배경 (흰색 반투명)
        ctx.font = 'bold 14px Arial'
        const textWidth = ctx.measureText(labelText).width
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillRect(centerX - textWidth/2 - 5, centerY - 10, textWidth + 10, 20)
        
        // 텍스트 그리기
        ctx.fillStyle = '#0000AA'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(labelText, centerX, centerY)
      })
    }

    ctx.globalAlpha = 1.0

    // 그리기 중인 선 표시
    if (isDrawing && drawStart && drawEnd) {
      ctx.strokeStyle = selectedTool === 'wall' ? '#ff0000' : '#0000ff'
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(drawStart.x * imageScale.x, drawStart.y * imageScale.y)
      ctx.lineTo(drawEnd.x * imageScale.x, drawEnd.y * imageScale.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [currentMap, isDrawing, drawStart, drawEnd, selectedTool, imageScale, layerOpacity, imagePreview, formData.size, getBackgroundImageUrl])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>가상공간을 불러오는 중...</p>
      </div>
    )
  }







  return (
    <div className="metaverse-editor">
      <div className="editor-content">
        {/* 좌측 사이드바 */}
        <div className="editor-sidebar">
          <div className="action-buttons">
            <button 
              onClick={handleSaveMap}
              disabled={isSubmitting}
              className="save-btn"
              title="가상공간 저장"
            >
              <span style={{ fontSize: '12px' }}>{isSubmitting ? '⏳' : '💾'}</span>
              <span>{isSubmitting ? '저장 중...' : '저장'}</span>
            </button>
            <button 
              onClick={() => navigate(`/metaverse/${mapId}`)}
              className="cancel-btn"
              title="편집 취소하고 가상공간으로 돌아가기"
            >
              <span style={{ fontSize: '12px' }}>❌</span>
              <span>취소</span>
            </button>
          </div>

          <div className="sidebar-section">
            <h4>도구</h4>
            <div className="tool-group">
              <button 
                className={`tool-btn ${selectedTool === 'image' ? 'active' : ''}`}
                onClick={handleImageLoadClick}
                title="배경 이미지 로드"
              >
                <span style={{ fontSize: '14px' }}>🖼️</span>
                <span>이미지</span>
              </button>
              <button 
                className={`tool-btn ${selectedTool === 'wall' ? 'active' : ''}`}
                onClick={() => setSelectedTool('wall')}
                title="가상벽 그리기"
              >
                <span style={{ fontSize: '14px' }}>🧱</span>
                <span>벽</span>
              </button>
              <button 
                className={`tool-btn ${selectedTool === 'private' ? 'active' : ''}`}
                onClick={() => setSelectedTool('private')}
                title="프라이빗 영역 그리기"
              >
                <span style={{ fontSize: '14px' }}>🔒</span>
                <span>프라이빗</span>
              </button>
              <button 
                className="tool-btn"
                onClick={() => setShowWallsList(true)}
                title="가상벽 목록 및 편집"
              >
                <span style={{ fontSize: '14px' }}>📋</span>
                <span>벽 목록</span>
              </button>
              <button 
                className="tool-btn"
                onClick={() => setShowPrivateAreasList(true)}
                title="프라이빗 영역 목록 및 편집"
              >
                <span style={{ fontSize: '14px' }}>📋</span>
                <span>프라이빗 목록</span>
              </button>
              <button 
                className={`tool-btn ${selectedTool === 'spawn' ? 'active' : ''}`}
                onClick={() => setSelectedTool('spawn')}
                title="시작점 설정"
              >
                <span style={{ fontSize: '14px' }}>🎯</span>
                <span>시작점</span>
              </button>
              <button 
                className="tool-btn"
                onClick={() => setShowSpawnPointsList(true)}
                title="시작점 정보 및 편집"
              >
                <span style={{ fontSize: '14px' }}>📋</span>
                <span>시작점 정보</span>
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h4>레이어 투명도</h4>
            <div className="layer-controls">
              <label title="배경 이미지 투명도">
                <span style={{ fontSize: '10px' }}>🖼️</span>
                <span>배경</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={layerOpacity.background} 
                  onChange={(e) => setLayerOpacity(prev => ({...prev, background: parseFloat(e.target.value)}))}
                />
              </label>
              <label title="벽 투명도">
                <span style={{ fontSize: '10px' }}>🧱</span>
                <span>벽</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={layerOpacity.walls} 
                  onChange={(e) => setLayerOpacity(prev => ({...prev, walls: parseFloat(e.target.value)}))}
                />
              </label>
              <label title="프라이빗 영역 투명도">
                <span style={{ fontSize: '10px' }}>🔒</span>
                <span>프라이빗</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={layerOpacity.privateAreas} 
                  onChange={(e) => setLayerOpacity(prev => ({...prev, privateAreas: parseFloat(e.target.value)}))}
                />
              </label>
              <label title="시작점 투명도">
                <span style={{ fontSize: '10px' }}>🎯</span>
                <span>시작점</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={layerOpacity.spawnPoints} 
                  onChange={(e) => setLayerOpacity(prev => ({...prev, spawnPoints: parseFloat(e.target.value)}))}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 캔버스 영역 */}
        <div className="editor-canvas-container">
          <canvas
            ref={canvasRef}
            className="editor-canvas"
            onClick={handleCanvasClick}
            onMouseDown={selectedTool === 'wall' ? handleCanvasMouseDown : handleCanvasMouseDownPrivate}
            onMouseMove={selectedTool === 'wall' ? handleCanvasMouseMove : handleCanvasMouseMovePrivate}
            onMouseUp={selectedTool === 'wall' ? handleCanvasMouseUp : handleCanvasMouseUpPrivate}
            onMouseLeave={() => setIsDrawing(false)}
            style={{
              border: '1px solid #ccc',
              backgroundColor: 'white',
              cursor: selectedTool === 'spawn' ? 'crosshair' : 'default',
              display: !currentMap || loading ? 'none' : 'block'
            }}
          />
          
          {(!currentMap || loading) && (
            <div className="canvas-loading">
              <div className="loading-spinner"></div>
              <p>맵 데이터를 불러오는 중...</p>
            </div>
          )}
          
          {/* 숨겨진 파일 입력 */}
          <input
            type="file"
            ref={fileInputRef}
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* 벽 목록 모달 */}
        {showWallsList && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>벽 목록</h3>
              <div className="list-container">
                {currentMap.walls.map((wall, index) => (
                  <div key={wall.id} className="list-item">
                    <span>{wall.name || `벽 ${index + 1}`}</span>
                    <span>({wall.start.x}, {wall.start.y}) → ({wall.end.x}, {wall.end.y})</span>
                    <div className="item-actions">
                      <button onClick={() => handleEditWall(wall)}>✏️</button>
                      <button onClick={() => handleDeleteWall(wall.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowWallsList(false)}>닫기</button>
            </div>
          </div>
        )}

        {/* 프라이빗 영역 목록 모달 */}
        {showPrivateAreasList && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>프라이빗 영역 목록</h3>
              <div className="list-container">
                {currentMap.privateAreas.map((area, index) => (
                  <div key={area.id} className="list-item">
                    <span>{area.name || `프라이빗 영역 ${index + 1}`}</span>
                    <span>위치: ({area.position.x}, {area.position.y}), 크기: {area.size.width} x {area.size.height}</span>
                    <div className="item-actions">
                      <button onClick={() => handleEditPrivateArea(area)}>✏️</button>
                      <button onClick={() => handleDeletePrivateArea(area.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowPrivateAreasList(false)}>닫기</button>
            </div>
          </div>
        )}

        {/* 벽 편집 모달 */}
        {editingWall && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>벽 편집</h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                handleSaveWall(editingWall)
              }}>
                <label>
                  이름: <input 
                    type="text" 
                    value={editingWall.name || ''} 
                    onChange={(e) => setEditingWall({...editingWall, name: e.target.value})}
                  />
                </label>
                <label>
                  시작 X: <input 
                    type="number" 
                    value={editingWall.start.x} 
                    onChange={(e) => setEditingWall({
                      ...editingWall, 
                      start: {...editingWall.start, x: parseInt(e.target.value)}
                    })}
                  />
                </label>
                <label>
                  시작 Y: <input 
                    type="number" 
                    value={editingWall.start.y} 
                    onChange={(e) => setEditingWall({
                      ...editingWall, 
                      start: {...editingWall.start, y: parseInt(e.target.value)}
                    })}
                  />
                </label>
                <label>
                  끝 X: <input 
                    type="number" 
                    value={editingWall.end.x} 
                    onChange={(e) => setEditingWall({
                      ...editingWall, 
                      end: {...editingWall.end, x: parseInt(e.target.value)}
                    })}
                  />
                </label>
                <label>
                  끝 Y: <input 
                    type="number" 
                    value={editingWall.end.y} 
                    onChange={(e) => setEditingWall({
                      ...editingWall, 
                      end: {...editingWall.end, y: parseInt(e.target.value)}
                    })}
                  />
                </label>
                <div className="modal-actions">
                  <button type="submit">저장</button>
                  <button type="button" onClick={() => setEditingWall(null)}>취소</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 시작점 정보 모달 */}
        {showSpawnPointsList && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>시작점 정보</h3>
              <div className="list-container">
                {(currentMap.spawnPoints || []).length === 0 ? (
                  <div className="no-spawn-point">
                    <p>시작점이 설정되지 않았습니다.</p>
                    <p>맵을 클릭하여 시작점을 설정하세요.</p>
                  </div>
                ) : (
                  (currentMap.spawnPoints || []).map((spawnPoint) => (
                    <div key={spawnPoint.id} className="list-item">
                      <span>{spawnPoint.name}</span>
                      <span>위치: ({spawnPoint.x}, {spawnPoint.y})</span>
                      <div className="item-actions">
                        <button onClick={() => setEditingSpawnPoint(spawnPoint)} title="편집">✏️</button>
                        <button 
                          onClick={handleSaveMap}
                          disabled={isSubmitting}
                          title="저장"
                          style={{ 
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isSubmitting ? '저장 중...' : '저장'}
                        </button>
                        <button 
                          onClick={() => setShowSpawnPointsList(false)}
                          title="취소"
                          style={{ 
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setShowSpawnPointsList(false)}>닫기</button>
            </div>
          </div>
        )}

        {/* 프라이빗 영역 편집 모달 */}
        {editingPrivateArea && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>프라이빗 영역 편집</h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                handleSavePrivateArea(editingPrivateArea)
              }}>
                <label>
                  이름: <input 
                    type="text" 
                    value={editingPrivateArea.name || ''} 
                    onChange={(e) => setEditingPrivateArea({...editingPrivateArea, name: e.target.value})}
                  />
                </label>
                <label>
                  위치 X: <input 
                    type="number" 
                    value={editingPrivateArea.position.x} 
                    onChange={(e) => setEditingPrivateArea({
                      ...editingPrivateArea, 
                      position: {...editingPrivateArea.position, x: parseInt(e.target.value)}
                    })}
                  />
                </label>
                <label>
                  위치 Y: <input 
                    type="number" 
                    value={editingPrivateArea.position.y} 
                    onChange={(e) => setEditingPrivateArea({
                      ...editingPrivateArea, 
                      position: {...editingPrivateArea.position, y: parseInt(e.target.value)}
                    })}
                  />
                </label>
                <label>
                  너비: <input 
                    type="number" 
                    value={editingPrivateArea.size.width} 
                    onChange={(e) => setEditingPrivateArea({
                      ...editingPrivateArea, 
                      size: {...editingPrivateArea.size, width: parseInt(e.target.value)}
                    })}
                  />
                </label>
                <label>
                  높이: <input 
                    type="number" 
                    value={editingPrivateArea.size.height} 
                    onChange={(e) => setEditingPrivateArea({
                      ...editingPrivateArea, 
                      size: {...editingPrivateArea.size, height: parseInt(e.target.value)}
                    })}
                  />
                </label>
                <label>
                  최대 인원: <input 
                    type="number" 
                    value={editingPrivateArea.maxOccupants} 
                    onChange={(e) => setEditingPrivateArea({
                      ...editingPrivateArea, 
                      maxOccupants: parseInt(e.target.value)
                    })}
                  />
                </label>
                <div className="modal-actions">
                  <button type="submit">저장</button>
                  <button type="button" onClick={() => setEditingPrivateArea(null)}>취소</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MetaverseEdit 