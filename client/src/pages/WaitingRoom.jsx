import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMetaverse } from '../contexts/MetaverseContext'
import CharacterCustomizer from '../components/CharacterCustomizer'
import '../styles/WaitingRoom.css'

const WaitingRoom = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { maps, fetchMaps, loading, updateMap, createMap, socket } = useMetaverse()

  const [editingMapId, setEditingMapId] = useState(null)
  const [editName, setEditName] = useState('')
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    fetchMaps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // 전체화면 상태 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [])

  // 대기실에 있는 동안 heartbeat 전송 (10초마다)
  useEffect(() => {
    if (!socket || !user) return;

    // 즉시 대기실 상태로 업데이트
    const updateToLobby = () => {
      socket.emit('update-lobby-status', {
        userId: user.id,
        username: user.username,
        mapId: 'wait',
        입실공간: '대기실'
      });
    };

    // Heartbeat 전송 함수
    const sendHeartbeat = () => {
      socket.emit('waiting-room-heartbeat');
      console.log('💓 대기실 heartbeat 전송');
    };

    // 처음 진입 시 즉시 업데이트
    updateToLobby();

    // 10초마다 heartbeat 전송
    const heartbeatInterval = setInterval(sendHeartbeat, 10000);

    // 대기실 사용자 목록 업데이트 수신
    const handleWaitingRoomUpdate = (data) => {
      console.log('📢 대기실 사용자 목록 업데이트:', data);
      // 필요 시 UI 업데이트 로직 추가
    };

    socket.on('waiting-room-users-updated', handleWaitingRoomUpdate);

    // 컴포넌트 언마운트 시 정리
    return () => {
      clearInterval(heartbeatInterval);
      socket.off('waiting-room-users-updated', handleWaitingRoomUpdate);
    };
  }, [socket, user])

  // 모든 방을 표시 (모두 공개)
  const allVisibleMaps = Array.isArray(maps) ? maps : []
  const filteredMaps = allVisibleMaps.filter(m => (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filteredMaps.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIdx = (currentPage - 1) * pageSize
  const visibleMaps = filteredMaps.slice(startIdx, startIdx + pageSize)
  const rows = Array.from({ length: pageSize }).map((_, i) => visibleMaps[i] || null)
  const lobbyCount = (maps?.lobbyParticipantCount) || 0

  const isCreator = (map) => map.creatorId === user?.id || map.createdBy === user?.id || map.creator?.id === user?.id

  const handleRefresh = () => {
    fetchMaps()
  }

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const applySearch = () => {
    setSearchQuery(searchInput)
  }

  const beginEdit = (map) => {
    if (!isCreator(map)) return
    setEditingMapId(map.id)
    setEditName(map.name)
  }

  const cancelEdit = () => {
    setEditingMapId(null)
    setEditName('')
  }

  const saveEdit = async (map) => {
    if (!editName.trim()) return
    try {
      await updateMap(map.id, { name: editName.trim() })
      setEditingMapId(null)
      setEditName('')
      fetchMaps()
    } catch (_) {}
  }

  const handleDeleteMap = async (map, e) => {
    e.stopPropagation()
    
    // 삭제 확인 다이얼로그
    const confirmDelete = window.confirm(
      `⚠️ 방 삭제 확인\n\n` +
      `방 이름: ${map.name}\n` +
      `현재 참가자: ${map.participantCount || 0}명\n\n` +
      `정말로 이 방을 삭제하시겠습니까?\n` +
      `이 작업은 되돌릴 수 없습니다.`
    )
    if (!confirmDelete) return
    
    // 두 번째 확인 (중요한 작업이므로)
    const finalConfirm = window.confirm(
      `🔴 최종 확인\n\n` +
      `"${map.name}" 방을 완전히 삭제합니다.\n` +
      `계속하시겠습니까?`
    )
    if (!finalConfirm) return
    
    try {
      const token = localStorage.getItem('token')
      
      // 방 삭제 API 호출
      const deleteResponse = await fetch(`/api/maps/${map.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (deleteResponse.ok) {
        alert('✅ 방이 성공적으로 삭제되었습니다.')
        fetchMaps()
      } else {
        let errorMessage = '알 수 없는 오류'
        try {
          const contentType = deleteResponse.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const data = await deleteResponse.json()
            errorMessage = data.message || errorMessage
          } else {
            errorMessage = `서버 오류 (${deleteResponse.status})`
          }
        } catch (parseError) {
          console.error('응답 파싱 오류:', parseError)
          errorMessage = `서버 오류 (${deleteResponse.status})`
        }
        alert(`❌ 방 삭제 실패: ${errorMessage}`)
      }
    } catch (error) {
      console.error('방 삭제 오류:', error)
      alert('❌ 방 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleCreateRoom = async () => {
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

  if (loading) {
    return (
      <div className="waiting-room">
        <div className="loading">방 목록을 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="waiting-room">
      <div className="waiting-room-header compact" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
        <div className="header-top compact">
          <h1 className="title-compact">Waiting Room</h1>
          <div className="header-actions">
            <input
              className="search-input"
              placeholder="가상공간 검색"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearch() }}
              style={{ 
                padding: '5px 8px', 
                borderRadius: 14, 
                border: '1px solid rgba(255,255,255,0.3)', 
                marginRight: 4,
                fontSize: '0.85rem',
                width: '120px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff'
              }}
            />
            <button className="icon-btn" title="검색" onClick={applySearch} style={{ marginRight: 4 }}>🔍</button>
            <button
              className="icon-btn fullscreen-btn"
              title={isFullscreen ? "전체화면 종료" : "전체화면"}
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(err => {
                    console.log(`전체화면 오류: ${err.message}`);
                  });
                } else {
                  document.exitFullscreen();
                }
              }}
              style={{ marginRight: 4 }}
            >
              {isFullscreen ? '🔳' : '🔲'}
            </button>
            <button
              className="icon-btn refresh-btn"
              title="새로고침"
              onClick={handleRefresh}
            >
              🔄
            </button>
            <button
              className="icon-btn character-btn"
              title="캐릭터 설정"
              onClick={() => setShowCustomizer(true)}
            >
              👤
            </button>
            <button
              className="create-room-btn"
              title="새 방 만들기"
              onClick={handleCreateRoom}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginLeft: '6px'
              }}
            >
              ✨ 새 방 만들기
            </button>
          </div>
        </div>
        <div className="header-stats">
          <span>대기실 인원: <strong>{lobbyCount}</strong></span>
          <span>입실 인원 합계: <strong>{Array.isArray(maps) ? maps.reduce((sum, m) => sum + (m.participantCount || 0), 0) : 0}</strong></span>
        </div>
      </div>

      <div className="waiting-room-main" style={{ paddingLeft: 0 }}>
        <div className="map-selection" style={{ width: '100%' }}>
          <div className="flip-board" style={{ minHeight: 'calc(100vh - 90px)' }}>
            {filteredMaps.length === 0 && (
              <div className="flip-empty">표시할 가상공간이 없습니다.</div>
            )}
            {rows.map((map, idx) => (
              map ? (
                <div
                  key={map.id}
                  className="flip-row single-line"
                  onClick={() => navigate(`/metaverse/${map.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    ':hover': { background: 'rgba(255, 255, 255, 0.05)' }
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="room-info-left" style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                    <span className="room-number" style={{ color: '#888', fontSize: '14px', minWidth: '30px' }}>#{idx + 1}</span>
                    <div className="room-name-section" style={{ minWidth: '200px', flex: 1 }}>
                      {editingMapId === map.id ? (
                        <div className="name-edit-container" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            className="name-edit-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(map)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              color: 'white',
                              flex: 1
                            }}
                          />
                          <button className="save-name-btn" onClick={() => saveEdit(map)} style={{ padding: '4px 8px', borderRadius: '4px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>✓</button>
                          <button className="cancel-name-btn" onClick={cancelEdit} style={{ padding: '4px 8px', borderRadius: '4px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}>✗</button>
                        </div>
                      ) : (
                        <span className="room-name" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                          {map.name}
                        </span>
                      )}
                    </div>
                    <span className="room-creator" style={{ color: '#aaa', fontSize: '14px', minWidth: '120px' }}>
                      👤 {map.creatorInfo?.username || map.creator?.username || '알 수 없음'}
                    </span>
                    <span className="room-participants" style={{ color: '#4CAF50', fontSize: '14px', minWidth: '80px' }}>
                      👥 {map.participantCount || 0}명
                    </span>
                  </div>
                  
                  <div className="room-info-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCreator(map) && (
                      <>
                        <button
                          className="control-btn edit-btn"
                          title="방 이름 수정"
                          onClick={(e) => { e.stopPropagation(); beginEdit(map) }}
                          style={{
                            background: 'rgba(76, 175, 80, 0.2)',
                            border: '1px solid rgba(76, 175, 80, 0.5)',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#4CAF50',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(76, 175, 80, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(76, 175, 80, 0.2)';
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          className="control-btn settings-btn"
                          title="방 설정 편집"
                          onClick={(e) => { e.stopPropagation(); navigate(`/metaverse/edit/${map.id}`) }}
                          style={{
                            background: 'rgba(33, 150, 243, 0.2)',
                            border: '1px solid rgba(33, 150, 243, 0.5)',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#2196F3',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(33, 150, 243, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(33, 150, 243, 0.2)';
                          }}
                        >
                          ⚙️
                        </button>
                        <button
                          className="control-btn delete-btn"
                          title="방 삭제"
                          onClick={(e) => handleDeleteMap(map, e)}
                          style={{
                            background: 'rgba(244, 67, 54, 0.2)',
                            border: '1px solid rgba(244, 67, 54, 0.5)',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#f44336',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(244, 67, 54, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(244, 67, 54, 0.2)';
                          }}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    <button
                      className="enter-room-btn"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '6px 16px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s',
                        marginLeft: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      입장 →
                    </button>
                  </div>
                </div>
              ) : (
                <div key={`placeholder-${idx}`} className="flip-row placeholder" style={{ opacity: 0.35 }}>
                  <div className="flip-cell name"><span className="flip-text"> </span></div>
                  <div className="flip-cell creator"> </div>
                  <div className="flip-cell counts"> </div>
                </div>
              )
            ))}
          </div>
          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0' }}>
            <button className="icon-btn" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>⬅ 이전 리스트</button>
            <span style={{ color: '#fff' }}>{currentPage} / {totalPages}</span>
            <button className="icon-btn" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>다음 리스트 ➡</button>
          </div>
        </div>
      </div>

      {showCustomizer && (
        <CharacterCustomizer
          isOpen={showCustomizer}
          onClose={() => setShowCustomizer(false)}
        />
      )}
    </div>
  )
}

export default WaitingRoom
