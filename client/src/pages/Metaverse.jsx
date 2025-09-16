import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MetaverseScene from '../components/MetaverseScene'
import { useMetaverse } from '../contexts/MetaverseContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import '../styles/Metaverse.css'

const Metaverse = () => {
  const { mapId, link } = useParams()
  const navigate = useNavigate()
  const { 
    characters, 
    currentMap, 
    currentCharacter, 
    fetchMaps, 
    fetchMap,
    selectMap,
    selectCharacter,
    createEmojiCharacter,
    createOrUpdateCharacter
  } = useMetaverse()
  const { 
    user, 
    socket,
    hasMediaPermission, 
    localStream, 
    isCameraOn, 
    isMicrophoneOn,
    setLocalStream,
    setIsCameraOn,
    setIsMicrophoneOn,
    requestMediaPermission
  } = useAuth()
  const [loading, setLoading] = useState(false)
  const hasEnteredRef = useRef(false)

  // 공개 링크로 가상공간 입장
  useEffect(() => {
    if (link && !hasEnteredRef.current) {
      const enterPublicMap = async () => {
        try {
          hasEnteredRef.current = true
          setLoading(true)
          if (!user) {
            toast.error('가상공간에 입장하려면 로그인이 필요합니다.')
            navigate('/login', { 
              state: { 
                redirectTo: `/join/${link}`,
                message: '가상공간에 입장하려면 로그인해주세요.'
              }
            })
            return
          }
          const response = await fetch(`/api/maps/public/${link}`)
          const data = await response.json()
          if (data.success) {
            selectMap(data.map)
            const userName = user?.username || '사용자'
            console.log('🔍 공개 링크 입장 - 캐릭터 검색 시작:', {
              userName,
              charactersCount: characters.length,
              characterNames: characters.map(c => ({ id: c.id, name: c.name, hasAppearance: !!c.appearance }))
            });

            // 개선된 캐릭터 검색 로직
            let userCharacter = null;

            // 1. 현재 선택된 캐릭터가 유효하면 사용
            if (currentCharacter && characters.find(c => c.id === currentCharacter.id)) {
              userCharacter = currentCharacter;
              console.log('✅ 현재 선택된 캐릭터 사용:', userCharacter.name);
            }
            // 2. 사용자 이름과 일치하는 캐릭터 찾기
            else {
              userCharacter = characters.find(char => char.name === userName);
              if (userCharacter) {
                console.log('✅ 사용자 이름으로 캐릭터 찾음:', userCharacter.name);
              }
            }
            // 3. 사용자 소유의 캐릭터 중 appearance 데이터가 있는 것 우선 선택
            if (!userCharacter && characters.length > 0) {
              const charactersWithAppearance = characters.filter(char => char.appearance);
              if (charactersWithAppearance.length > 0) {
                userCharacter = charactersWithAppearance[0];
                console.log('✅ appearance 데이터가 있는 캐릭터 선택:', userCharacter.name);
              } else {
                userCharacter = characters[0];
                console.log('✅ 첫 번째 캐릭터 선택:', userCharacter.name);
              }
            }
            
            // 4. 마지막 수단: 캐릭터 생성 (기존 설정 유지)
            if (!userCharacter) {
              console.log('🎭 사용자 캐릭터가 없어 기존 설정 유지하며 캐릭터 생성:', userName)
              userCharacter = await createOrUpdateCharacter(userName)
            }
            
            if (userCharacter && (!currentCharacter || currentCharacter.name !== userName)) {
              selectCharacter(userCharacter)
            } else if (characters.length > 0 && !currentCharacter) {
              selectCharacter(characters[0])
            }
          } else {
            toast.error(data.message || '해당 공개 링크의 가상공간을 찾을 수 없습니다.')
            navigate('/metaverse')
          }
        } catch (error) {
          toast.error('가상공간 입장 중 오류가 발생했습니다.')
          navigate('/metaverse')
        } finally {
          setLoading(false)
        }
      }
      enterPublicMap()
    }
  }, [link, navigate, characters, currentCharacter, selectCharacter, user, selectMap])

  // 특정 가상공간 입장
  useEffect(() => {
    if (mapId && !hasEnteredRef.current) {
      const enterSpecificMap = async () => {
        try {
          hasEnteredRef.current = true
          setLoading(true)
          const map = await fetchMap(mapId)
          if (map) {
            selectMap(map)
            const userName = user?.username || '사용자'
            console.log('🔍 특정 맵 입장 - 캐릭터 검색 시작:', {
              userName,
              charactersCount: characters.length,
              characterNames: characters.map(c => ({ id: c.id, name: c.name, hasAppearance: !!c.appearance }))
            });

            // 개선된 캐릭터 검색 로직
            let userCharacter = null;

            // 1. 현재 선택된 캐릭터가 유효하면 사용
            if (currentCharacter && characters.find(c => c.id === currentCharacter.id)) {
              userCharacter = currentCharacter;
              console.log('✅ 현재 선택된 캐릭터 사용:', userCharacter.name);
            }
            // 2. 사용자 이름과 일치하는 캐릭터 찾기
            else {
              userCharacter = characters.find(char => char.name === userName);
              if (userCharacter) {
                console.log('✅ 사용자 이름으로 캐릭터 찾음:', userCharacter.name);
              }
            }
            // 3. 사용자 소유의 캐릭터 중 appearance 데이터가 있는 것 우선 선택
            if (!userCharacter && characters.length > 0) {
              const charactersWithAppearance = characters.filter(char => char.appearance);
              if (charactersWithAppearance.length > 0) {
                userCharacter = charactersWithAppearance[0];
                console.log('✅ appearance 데이터가 있는 캐릭터 선택:', userCharacter.name);
              } else {
                userCharacter = characters[0];
                console.log('✅ 첫 번째 캐릭터 선택:', userCharacter.name);
              }
            }
            
            // 4. 마지막 수단: 캐릭터 생성 (기존 설정 유지)
            if (!userCharacter) {
              console.log('🎭 사용자 캐릭터가 없어 기존 설정 유지하며 캐릭터 생성:', userName)
              userCharacter = await createOrUpdateCharacter(userName)
            }
            
            if (userCharacter && (!currentCharacter || currentCharacter.name !== userName)) {
              selectCharacter(userCharacter)
            } else if (characters.length > 0 && !currentCharacter) {
              selectCharacter(characters[0])
            }
          } else {
            toast.error('해당 가상공간을 찾을 수 없습니다.')
            navigate('/metaverse')
          }
        } catch (error) {
          toast.error('가상공간 입장 중 오류가 발생했습니다.')
          navigate('/metaverse')
        } finally {
          setLoading(false)
        }
      }
      enterSpecificMap()
    }
  }, [mapId, fetchMap, selectMap, navigate, characters, currentCharacter, selectCharacter, user])

  const handleReturnToLobby = () => {
    // 소켓 이벤트로 맵에서 나가기 처리
    if (socket && currentMap) {
      const mapId = currentMap.id || currentMap._id
      socket.emit('leave-map', { mapId })
    }
    toast.success('대기실로 돌아갔습니다.')
    navigate('/metaverse/waiting-room')
  }

  const metaverseSceneRef = useRef()

  const handleEditMap = () => {
    if (currentMap) {
      const mapId = currentMap.id || currentMap._id
      if (!mapId) {
        toast.error('가상공간 ID를 찾을 수 없습니다.')
        return
      }
      navigate(`/metaverse/edit/${mapId}`, { state: { map: currentMap, isEdit: true } })
    } else {
      toast.error('편집할 가상공간 정보를 찾을 수 없습니다.')
    }
  }

  const handleDeleteMap = async () => {
    if (!currentMap) {
      toast.error('삭제할 가상공간 정보를 찾을 수 없습니다.')
      return
    }
    const mapId = currentMap.id || currentMap._id
    if (!mapId) {
      toast.error('가상공간 ID를 찾을 수 없습니다.')
      return
    }
    const confirmDelete = window.confirm('정말로 이 가상공간을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')
    if (!confirmDelete) return
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/maps/${mapId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        toast.success('가상공간이 삭제되었습니다.')
        await fetchMaps('all')
        navigate('/metaverse')
      } else {
        toast.error(data.message || '가상공간 삭제에 실패했습니다.')
      }
    } catch (error) {
      toast.error('가상공간 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleCameraToggle = async () => {
    try {
      if (!hasMediaPermission || !localStream) {
        const success = await requestMediaPermission();
        if (!success) {
          toast.error('카메라/마이크 권한이 필요합니다.');
          return;
        }
      }
      
      const videoTrack = localStream?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
        toast.success(videoTrack.enabled ? '카메라가 켜졌습니다.' : '카메라가 꺼졌습니다.');
      } else {
        toast.error('카메라를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('카메라 토글 오류:', error);
      toast.error('카메라 접근에 실패했습니다.');
    }
  };

  const handleMicrophoneToggle = async () => {
    try {
      if (!hasMediaPermission || !localStream) {
        const success = await requestMediaPermission();
        if (!success) {
          toast.error('카메라/마이크 권한이 필요합니다.');
          return;
        }
      }
      
      const audioTrack = localStream?.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicrophoneOn(audioTrack.enabled);
        toast.success(audioTrack.enabled ? '마이크가 켜졌습니다.' : '마이크가 꺼졌습니다.');
      } else {
        toast.error('마이크를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('마이크 토글 오류:', error);
      toast.error('마이크 접근에 실패했습니다.');
    }
  };

  // 컴포넌트 마운트 시 미디어 권한은 사용자가 버튼을 클릭할 때만 요청
  useEffect(() => {
    // 미디어 권한 자동 요청 제거 - 사용자가 카메라/마이크 버튼 클릭 시에만 요청
    console.log('🎥 Metaverse 페이지 마운트');
    
    return () => {
      // 컴포넌트 언마운트 시 스트림 정리는 하지 않음 (다른 페이지에서도 사용 가능)
      console.log('🎥 Metaverse 페이지 언마운트');
    }
  }, [])

  const getMapImageUrl = () => {
    if (currentMap?.backgroundLayer?.image?.data) {
      const contentType = currentMap.backgroundLayer.image.contentType || 'image/jpeg'
      return `data:${contentType};base64,${currentMap.backgroundLayer.image.data}`
    }
    return null
  }

  const mapImage = getMapImageUrl()

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>가상공간을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="metaverse">
      <div className="metaverse-content">
        <div className="metaverse-main">
          <MetaverseScene 
            ref={metaverseSceneRef}
            currentMap={currentMap} 
            mapImage={mapImage}
            characters={characters}
            currentCharacter={currentCharacter}
            onReturnToLobby={handleReturnToLobby}
          />
        </div>
      </div>
    </div>
  )
}

export default Metaverse 