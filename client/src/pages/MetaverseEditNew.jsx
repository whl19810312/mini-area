import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MetaverseEditor from '../components/MetaverseEditor'
import { useMetaverse } from '../contexts/MetaverseContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const MetaverseEditNew = () => {
  const { mapId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fetchMap, updateMap } = useMetaverse()
  
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      toast.error('로그인이 필요합니다')
      navigate('/')
      return
    }

    loadMap()
  }, [user, mapId])

  const loadMap = async () => {
    try {
      const data = await fetchMap(mapId)
      if (!data) {
        toast.error('공간을 찾을 수 없습니다')
        navigate('/waiting-room')
        return
      }

      // 권한 확인
      if (data.createdBy !== user?.id && data.createdBy !== user?.username && !user?.isAdmin) {
        toast.error('편집 권한이 없습니다')
        navigate('/waiting-room')
        return
      }

      setMapData(data)
    } catch (error) {
      console.error('맵 로드 실패:', error)
      toast.error('공간 로드 실패')
      navigate('/waiting-room')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (updatedMapData) => {
    try {
      // 맵 업데이트 API 호출
      await updateMap(mapId, updatedMapData)
      
      toast.success(`"${updatedMapData.name}" 공간이 수정되었습니다`)
      navigate('/waiting-room')
    } catch (error) {
      console.error('맵 수정 실패:', error)
      toast.error('수정 실패: ' + error.message)
    }
  }

  const handleExit = () => {
    navigate('/waiting-room')
  }

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        color: '#00ff00',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Courier New, monospace',
        fontSize: '20px'
      }}>
        공간 로딩 중...
      </div>
    )
  }

  return (
    <MetaverseEditor
      mode="edit"
      initialData={mapData}
      onSave={handleSave}
      onExit={handleExit}
    />
  )
}

export default MetaverseEditNew