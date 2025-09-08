import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMetaverse } from '../contexts/MetaverseContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import '../styles/Sidebar.css'

const Sidebar = ({ 
  open, 
  onClose, 
  maps: mapsProps, 
  currentMap: currentMapProps, 
  onMapSelect
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { 
    maps: contextMaps, 
    currentMap: contextCurrentMap, 
    fetchMyMaps, 
    fetchMaps,
    selectMap,
    debugMaps,
    forceRefreshMaps,
    mapParticipants,
    serverMapsList,
    allUsersInfo,
    createMap
  } = useMetaverse()
  
  // props가 있으면 props 사용, 없으면 서버 목록 사용, 없으면 context 사용
  const maps = mapsProps || serverMapsList || contextMaps
  const currentMap = currentMapProps || contextCurrentMap
  const [isHovered, setIsHovered] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({
    create: false,
    myMaps: false,
    publicMaps: false
  })
  const [editingMapId, setEditingMapId] = useState(null)
  const [editingMapName, setEditingMapName] = useState('')
  const [tempMaps, setTempMaps] = useState([])

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchMyMaps()
  }, [fetchMyMaps])

  const handleMapSelect = (map) => {
    if (onMapSelect) {
      onMapSelect(map)
    } else {
      selectMap(map)
      // URL 업데이트
      navigate(`/metaverse/${map.id || map._id}`)
    }
  }

  // 입장 버튼 클릭 시 맵 선택
  const handleEnterMap = (map) => {
    console.log('🎯 입장 버튼 클릭:', {
      mapId: map.id || map._id,
      mapName: map.name
    })
    
    // 맵 선택
    selectMap(map)
    
    // URL 업데이트
    navigate(`/metaverse/${map.id || map._id}`)
  }

  const handleCreateMap = async () => {
    const roomName = prompt('새 방 이름을 입력하세요:')
    if (!roomName || roomName.trim() === '') {
      return
    }
    
    try {
      const newMap = await createMap({
        name: roomName.trim(),
        createdBy: user?.id || user?.username
      })
      
      if (newMap && newMap.id) {
        navigate(`/metaverse/edit/${newMap.id}`)
      }
    } catch (error) {
      console.error('방 생성 실패:', error)
      alert('방 생성에 실패했습니다.')
    }
  }

  const handleEditMap = (map) => {
    console.log('✏️ Editing room:', map)
    navigate(`/metaverse/edit/${map.id || map._id}`, { 
      state: { 
        map,
        isEdit: true
      }
    })
  }

  const handleDeleteMap = async (map) => {
    // 더 안전한 확인 다이얼로그
    const isConfirmed = window.confirm(
      `정말로 "${map.name}" 가상공간을 삭제하시겠습니까?\n\n` +
      `⚠️ 이 작업은 되돌릴 수 없습니다.\n` +
      `• 가상공간의 모든 데이터가 영구적으로 삭제됩니다.\n` +
      `• 현재 입장 중인 사용자들이 강제로 나가게 됩니다.\n\n` +
      `삭제하려면 "확인"을 클릭하세요.`
    )
    
    if (!isConfirmed) {
      return
    }

    try {
      console.log('🗑️ 가상공간 삭제 시도:', map.name, map.id || map._id)
      
      const response = await axios.delete(`/api/maps/${map.id || map._id}`)
      
      if (response.status === 200) {
        toast.success(`"${map.name}" 가상공간이 성공적으로 삭제되었습니다.`)
        
        // 목록 새로고침
        fetchMyMaps()
        forceRefreshMaps()
        
        console.log('✅ 가상공간 삭제 완료:', map.name)
      }
    } catch (error) {
      console.error('❌ 가상공간 삭제 실패:', error)
      
      if (error.response?.status === 403) {
        toast.error('삭제 권한이 없습니다. 본인이 만든 가상공간만 삭제할 수 있습니다.')
      } else if (error.response?.status === 404) {
        toast.error('가상공간을 찾을 수 없습니다.')
      } else {
        toast.error('가상공간 삭제 중 오류가 발생했습니다.')
      }
    }
  }

  const handleDeleteTempMap = (tempMap) => {
    if (!window.confirm(`Are you sure you want to delete the temporary room \"${tempMap.name}\"?`)) {
      return
    }
    
    setTempMaps(prev => prev.filter(tm => tm.id !== tempMap.id))
    toast.success('Temporary room deleted successfully.')
  }

  const handleEditName = (map) => {
    setEditingMapId(map.id || map._id)
    setEditingMapName(map.name)
  }

  const handleSaveName = async (map) => {
    try {
      const response = await axios.put(`/api/maps/${map.id || map._id}`, {
        name: editingMapName
      })
      
      if (response.status === 200) {
        toast.success('Room name changed successfully.')
        fetchMyMaps()
        setEditingMapId(null)
        setEditingMapName('')
      }
    } catch (error) {
      console.error('Failed to change room name:', error)
      toast.error('Failed to change room name.')
    }
  }

  const handleCancelEdit = () => {
    setEditingMapId(null)
    setEditingMapName('')
  }

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Separate my rooms and public rooms
  const myMaps = maps.filter(map => map.createdBy === user?.id)
  const publicMaps = maps.filter(map => map.isPublic && map.createdBy !== user?.id)

  return (
    <>
      {/* 오버레이 */}
      {open && (
        <div 
          className="sidebar-overlay" 
          onClick={onClose}
        />
      )}

      {/* 사이드바 */}
      <div 
        className={`sidebar ${open ? 'open' : ''} ${isHovered ? 'hovered' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          if (!open) {
            setIsHovered(false)
          }
        }}
      >
        <div className="sidebar-header">
          <h2>Rooms</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="sidebar-content">
          <div className="tab-content">
            <p>You can create or enter a room.</p>
            
            {/* Create a new room */}
            <div className="create-section">
              <div className="section-header-with-toggle">
                <h4>Create a New Room</h4>
                <button 
                  className="toggle-btn"
                  onClick={() => toggleSection('create')}
                  title={collapsedSections.create ? '펼치기' : '접기'}
                >
                  {collapsedSections.create ? '▼' : '▲'}
                </button>
              </div>
              {!collapsedSections.create && (
                <div className="section-content">
                  <button 
                    onClick={handleCreateMap}
                    className="create-btn primary"
                  >
                    🎨 Create a New Room
                  </button>
                  
                  {tempMaps.length > 0 && (
                    <div className="temp-maps-section">
                      <h5>Temporary Rooms ({tempMaps.length})</h5>
                      <div className="map-list">
                        {tempMaps.map((tempMap) => (
                          <div 
                            key={`temp-map-${tempMap.id}`} 
                            className="map-item temp-map-item"
                          >
                            <div 
                              className="map-content"
                              onClick={() => handleMapSelect(tempMap)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="map-thumbnail">
                                <div className="map-thumbnail-placeholder">
                                  🎨
                                </div>
                              </div>
                              <div className="map-info">
                                <h4 className="temp-map-name">{tempMap.name}</h4>
                                <p>Temporary Room</p>
                                <p>크기: {tempMap.size?.width} x {tempMap.size?.height}</p>
                              </div>
                            </div>
                            <div className="map-actions" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => handleEnterMap(tempMap)}
                                className="enter-btn"
                                title="Enter Room"
                              >
                                입장
                              </button>
                              <button 
                                onClick={() => handleEditMap(tempMap)}
                                className="edit-btn"
                                title="Edit Room"
                              >
                                편집
                              </button>
                              <button 
                                onClick={() => handleDeleteTempMap(tempMap)}
                                className="delete-btn"
                                title="Delete Temporary Room"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* My Rooms */}
            <div className="my-maps-section">
              <div className="section-header-with-toggle">
                <h4>My Rooms ({myMaps.length})</h4>
                <button 
                  className="toggle-btn"
                  onClick={() => toggleSection('myMaps')}
                  title={collapsedSections.myMaps ? '펼치기' : '접기'}
                >
                  {collapsedSections.myMaps ? '▼' : '▲'}
                </button>
              </div>
              {!collapsedSections.myMaps && (
                <div className="section-content">
                  {myMaps.length === 0 ? (
                    <div className="empty-maps-container">
                      <p>You don't have any rooms.</p>
                      <button 
                        onClick={handleCreateMap}
                        className="create-btn secondary"
                      >
                        🎨 Create your first room
                      </button>
                    </div>
                  ) : (
                    <div className="map-list">
                      {myMaps.map((map) => (
                        <div 
                          key={`my-map-${map.id || map._id}`} 
                          className={`map-item ${currentMap && (currentMap.id || currentMap._id) === (map.id || map._id) ? 'current' : ''}`}
                        >
                          <div 
                            className="map-content"
                            onClick={() => handleMapSelect(map)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="map-thumbnail">
                              {map.backgroundLayer?.image?.data ? (
                                <img 
                                  src={`data:${map.backgroundLayer.image.contentType};base64,${map.backgroundLayer.image.data}`}
                                  alt={map.name}
                                  className="map-thumbnail-image"
                                />
                              ) : (
                                <div className="map-thumbnail-placeholder">
                                  🎨
                                </div>
                              )}
                            </div>
                            <div className="map-info">
                              {editingMapId === (map.id || map._id) ? (
                                <div className="name-edit-container">
                                  <input
                                    type="text"
                                    value={editingMapName}
                                    onChange={(e) => setEditingMapName(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveName(map)
                                      } else if (e.key === 'Escape') {
                                        handleCancelEdit()
                                      }
                                    }}
                                    className="name-edit-input"
                                    autoFocus
                                  />
                                  <div className="name-edit-buttons">
                                    <button 
                                      onClick={() => handleSaveName(map)}
                                      className="save-name-btn"
                                      title="저장"
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      onClick={handleCancelEdit}
                                      className="cancel-name-btn"
                                      title="취소"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <h4 
                                  onClick={() => map.createdBy === user?.id && handleEditName(map)}
                                  className={`map-name-editable ${map.createdBy === user?.id ? 'editable' : ''}`}
                                  title={map.createdBy === user?.id ? '클릭하여 이름 변경' : ''}
                                >
                                  {map.name} {map.createdBy === user?.id && '✏️'}
                                </h4>
                              )}
                              <p>{map.description}</p>
                              <p>크기: {map.size?.width} x {map.size?.height}</p>
                              <p className="creator-info">👤 제작자: {map.creator?.username || '알 수 없음'}</p>
                              <p className="participants-info">
                                👥 입실 인원: {allUsersInfo?.mapParticipantCounts?.[map.id || map._id] || 0}명
                              </p>
                              {map.publicLink && (
                                <p className="public-link">
                                  🔗 공개 링크: {map.publicLink}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="map-actions" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handleEnterMap(map)}
                              className="enter-btn"
                              title="Enter Room"
                            >
                              입장
                            </button>
                            {map.createdBy === user?.id && (
                              <button 
                                onClick={() => handleEditMap(map)}
                                className="edit-btn"
                                title="Edit Room"
                              >
                                편집
                              </button>
                            )}
                            {map.createdBy === user?.id && (
                              <button 
                                onClick={() => handleDeleteMap(map)}
                                className="delete-btn"
                                title="Delete Room"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Public Rooms */}
            <div className="public-section">
              <div className="section-header-with-toggle">
                <h4>Room List ({publicMaps.length})</h4>
                <button 
                  className="toggle-btn"
                  onClick={() => toggleSection('publicMaps')}
                  title={collapsedSections.publicMaps ? '펼치기' : '접기'}
                >
                  {collapsedSections.publicMaps ? '▼' : '▲'}
                </button>
              </div>
              {!collapsedSections.publicMaps && (
                <div className="section-content">
                  {publicMaps.length === 0 ? (
                    <div className="empty-maps-container">
                      <p>There are no public rooms.</p>
                      <div className="refresh-actions">
                        <button 
                          onClick={() => {
                            console.log('🔄 Attempting to refresh room list')
                            debugMaps()
                            forceRefreshMaps()
                          }}
                          className="refresh-btn"
                          title="Refresh Room List"
                        >
                          🔄 새로고침
                        </button>
                        <button 
                          onClick={() => {
                            console.log('🔍 Printing room list debug info')
                            debugMaps()
                          }}
                          className="debug-btn"
                          title="디버그 정보 출력"
                        >
                          🔍 디버그
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="map-list">
                      {publicMaps.map((map) => (
                        <div 
                          key={`public-map-${map.id || map._id}`} 
                          className={`map-item ${currentMap && (currentMap.id || currentMap._id) === (map.id || map._id) ? 'current' : ''}`}
                        >
                          <div 
                            className="map-content"
                            onClick={() => handleMapSelect(map)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="map-thumbnail">
                              {map.backgroundLayer?.image?.data ? (
                                <img 
                                  src={`data:${map.backgroundLayer.image.contentType};base64,${map.backgroundLayer.image.data}`}
                                  alt={map.name}
                                  className="map-thumbnail-image"
                                />
                              ) : (
                                <div className="map-thumbnail-placeholder">
                                  🎨
                                </div>
                              )}
                            </div>
                            <div className="map-info">
                              <h4>{map.name}</h4>
                              <p>{map.description}</p>
                              <p>크기: {map.size?.width} x {map.size?.height}</p>
                              <p className="creator-info">👤 제작자: {map.creator?.username || '알 수 없음'}</p>
                              <p className="participants-info">
                                👥 입실 인원: {allUsersInfo?.mapParticipantCounts?.[map.id || map._id] || 0}명
                              </p>
                              {map.publicLink && (
                                <p className="public-link">
                                  🔗 공개 링크: {map.publicLink}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="map-actions" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handleEnterMap(map)}
                              className="enter-btn"
                              title="Enter Room"
                            >
                              입장
                            </button>
                            {map.createdBy === user?.id && (
                              <button 
                                onClick={() => handleEditMap(map)}
                                className="edit-btn"
                                title="Edit Room"
                              >
                                편집
                              </button>
                            )}
                            {map.createdBy === user?.id && (
                              <button 
                                onClick={() => handleDeleteMap(map)}
                                className="delete-btn"
                                title="Delete Room"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar 