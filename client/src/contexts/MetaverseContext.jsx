import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { createDefaultCharacter, createAdvancedCharacter } from '../utils/characterGenerator'
import { configureAxios } from '../utils/apiConfig'
import { useAuth } from './AuthContext';

// Configure axios when the module loads
configureAxios();

const MetaverseContext = createContext();

export const useMetaverse = () => {
  const context = useContext(MetaverseContext);
  if (!context) {
    throw new Error('useMetaverse must be used within a MetaverseProvider');
  }
  return context;
};

export const MetaverseProvider = ({ children }) => {
  const { user, token, loading: authLoading, socket } = useAuth();
  const location = useLocation();
  const [maps, setMaps] = useState([]);
  const [activeMaps, setActiveMaps] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [currentCharacter, setCurrentCharacter] = useState(null);
  const [currentMap, setCurrentMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapParticipants, setMapParticipants] = useState({});
  const [allLoggedInUsers, setAllLoggedInUsers] = useState([]);


  // Axios는 AuthContext에서 전역 설정됨

  // 방 목록 가져오기 (로그인 사용자 정보로 참가자 수 계산)
  const fetchMaps = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // 1. 방 목록 가져오기
      const mapsResponse = await axios.get('/api/maps');
      
      // 2. 로그인 사용자 정보 가져오기
      const usersResponse = await axios.get('/api/user/logged-in-users');
      
      if (mapsResponse.data.success && usersResponse.data.success) {
        const mapsData = mapsResponse.data.maps || [];
        const userData = usersResponse.data;
        
        // 3. 클라이언트에서 맵별 사용자 수 계산
        const mapUserCounts = userData.mapUserCounts || {};
        
        // 4. 각 맵에 참가자 수 추가
        const mapsWithCounts = mapsData.map(map => ({
          ...map,
          participantCount: mapUserCounts[map.id] || 0,
          participants: userData.mapUsers?.[map.id] || []
        }));
        
        // 5. 대기실 참가자 수 추가
        mapsWithCounts.lobbyParticipantCount = userData.lobbyCount || 0;
        
        setMaps(mapsWithCounts);
        setError(null);
        
        console.log('맵별 사용자 수:', mapUserCounts);
        console.log('대기실 사용자 수:', userData.lobbyCount);
      } else {
        setError('방 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('방 목록 조회 오류:', error);
      setError('방 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 활성화된 방 목록 가져오기
  const fetchActiveMaps = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get('/api/maps/active');
      if (response.data.success) {
        setActiveMaps(response.data.maps || []);
      }
    } catch (error) {
      console.error('활성화된 방 목록 조회 오류:', error);
    }
  };

  // 특정 방 가져오기
  const fetchMap = async (mapId) => {
    console.log('🔍 fetchMap 호출:', { mapId, token: !!token })
    
    if (!token || !mapId) {
      console.log('❌ fetchMap: token 또는 mapId 없음')
      return null;
    }
    
    try {
      console.log('📡 API 호출:', `/maps/${mapId}`)
      const response = await axios.get(`/api/maps/${mapId}`);
      console.log('📡 API 응답:', response.data)
      
      if (response.data.success) {
        console.log('✅ fetchMap 성공:', response.data.map)
        return response.data.map;
      } else {
        console.log('❌ fetchMap: API 응답 실패')
        setError('방을 찾을 수 없습니다.');
        return null;
      }
    } catch (error) {
      console.error('❌ fetchMap 오류:', error.response || error)
      setError('방을 불러오는데 실패했습니다.');
      return null;
    }
  };

  // 캐릭터 목록 가져오기
  const fetchCharacters = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get('/api/characters');
      
      if (response.data.success) {
        const charactersData = response.data.characters || [];
        setCharacters(charactersData);
        
        // 첫 번째 캐릭터 자동 선택
        if (charactersData.length > 0 && !currentCharacter) {
          setCurrentCharacter(charactersData[0]);
        }
      }
    } catch (error) {
      console.error('캐릭터 목록 조회 오류:', error);
    }
  };

  // 방 생성
  const createMap = async (mapData) => {
    if (!token) return null;
    
    try {
      const response = await axios.post('/api/maps', mapData);
      
      if (response.data.success) {
        const newMap = response.data.map;
        setMaps(prev => [newMap, ...prev]);
        return newMap;
      } else {
        setError('방 생성에 실패했습니다.');
        return null;
      }
    } catch (error) {
      console.error('방 생성 오류:', error);
      setError('방 생성에 실패했습니다.');
      return null;
    }
  };

  // 방 업데이트
  const updateMap = async (mapId, mapData) => {
    if (!token || !mapId) return null;
    
    try {
      const response = await axios.put(`/api/maps/${mapId}`, mapData);
      
      if (response.data.success) {
        const updatedMap = response.data.map;
        setMaps(prev => prev.map(map => map.id === mapId ? updatedMap : map));
        return updatedMap;
      } else {
        setError('방 업데이트에 실패했습니다.');
        return null;
      }
    } catch (error) {
      console.error('방 업데이트 오류:', error);
      setError('방 업데이트에 실패했습니다.');
      return null;
    }
  };

  // 방 삭제
  const deleteMap = async (mapId) => {
    if (!token || !mapId) return false;
    
    try {
      const response = await axios.delete(`/api/maps/${mapId}`);
      
      if (response.data.success) {
        setMaps(prev => prev.filter(map => map.id !== mapId));
        if (currentMap && currentMap.id === mapId) {
          setCurrentMap(null);
        }
        return true;
      } else {
        setError('방 삭제에 실패했습니다.');
        return false;
      }
    } catch (error) {
      console.error('방 삭제 오류:', error);
      setError('방 삭제에 실패했습니다.');
      return false;
    }
  };

  // 캐릭터 업데이트
  const updateCharacter = async (characterId, characterData) => {
    if (!token || !characterId) return null;
    
    try {
      const response = await axios.put(`/api/characters/${characterId}`, characterData);
      
      if (response.data.success) {
        const updatedCharacter = response.data.character;
        setCharacters(prev => prev.map(char => char.id === characterId ? updatedCharacter : char));
        
        if (currentCharacter && currentCharacter.id === characterId) {
          setCurrentCharacter(updatedCharacter);
        }
        
        return updatedCharacter;
      } else {
        setError('캐릭터 업데이트에 실패했습니다.');
        return null;
      }
    } catch (error) {
      console.error('캐릭터 업데이트 오류:', error);
      setError('캐릭터 업데이트에 실패했습니다.');
      return null;
    }
  };

  // 캐릭터 생성
  const createCharacter = async (characterData) => {
    if (!token) return null;
    
    try {
      const response = await axios.post('/api/characters', characterData);
      
      if (response.data.success) {
        const newCharacter = response.data.character;
        setCharacters(prev => [...prev, newCharacter]);
        return newCharacter;
      } else {
        setError('캐릭터 생성에 실패했습니다.');
        return null;
      }
    } catch (error) {
      console.error('캐릭터 생성 오류:', error);
      setError('캐릭터 생성에 실패했습니다.');
      return null;
    }
  };

  // 캐릭터 선택
  const selectCharacter = (character) => {
    setCurrentCharacter(character);
  };

  // 방 선택
  const selectMap = (map) => {
    setCurrentMap(map);
  };

  // 이모지 기반 캐릭터 자동 생성
  const createEmojiCharacter = async (emoji) => {
    if (!token) return null;
    
    try {
      const characterData = createAdvancedCharacter(emoji);
      const savedCharacter = await createCharacter(characterData);
      
      if (savedCharacter) {
        setCurrentCharacter(savedCharacter);
        return savedCharacter;
      }
      return null;
    } catch (error) {
      console.error('이모지 캐릭터 생성 오류:', error);
      return null;
    }
  };

  // 사용자 로그인 시 데이터 로드
  useEffect(() => {
    console.log('🔍 MetaverseContext useEffect:', { 
      user: !!user, 
      token: !!token, 
      authLoading: authLoading
    })
    
    if (user && token && !authLoading) {
      console.log('✅ 사용자 인증 완료 - 데이터 로드 시작')
      fetchMaps();
      fetchCharacters();
      // 대시보드에서는 활성 방 목록 호출 불필요하여 제거
    } else {
      console.log('⏳ 사용자 인증 대기 중 또는 로딩 중')
    }
  }, [user, token, authLoading]);



  // WebSocket 이벤트 구독 (AuthContext의 소켓 사용)
  useEffect(() => {
    if (!user || !socket) return;

    // 자동 갱신 비활성화 - 리프레쉬 버튼으로만 갱신
    const handleMapsListUpdated = (data) => {
      // if (data.maps) {
      //   setMaps(data.maps);
      // }
    };

    const handleUpdateOccupants = (data) => {
      if (data.mapId && data.occupants !== undefined) {
        setMapParticipants(prev => ({
          ...prev,
          [data.mapId]: data.occupants
        }));
      }
    };

    const handleUpdateParticipants = (data) => {
      if (data.mapParticipants) {
        setMapParticipants(data.mapParticipants);
      }
    };

    const handleAllLoggedInUsersUpdated = (data) => {
      if (data.users) {
        setAllLoggedInUsers(data.users);
        
        // 자동 갱신 비활성화 - 리프레쉬 버튼으로만 갱신
        // setMaps(prevMaps => ({
        //   ...prevMaps,
        //   onlineParticipantCount: data.onlineParticipantCount || 0,
        //   offlineParticipantCount: data.offlineParticipantCount || 0,
        //   totalParticipantCount: data.totalParticipantCount || 0,
        //   lobbyParticipantCount: data.lobbyParticipantCount || 0
        // }));
      }
    };

    socket.on('maps-list-updated', handleMapsListUpdated);
    socket.on('update-occupants', handleUpdateOccupants);
    socket.on('update-participants', handleUpdateParticipants);
    socket.on('all-logged-in-users-updated', handleAllLoggedInUsersUpdated);

    return () => {
      socket.off('maps-list-updated', handleMapsListUpdated);
      socket.off('update-occupants', handleUpdateOccupants);
      socket.off('update-participants', handleUpdateParticipants);
      socket.off('all-logged-in-users-updated', handleAllLoggedInUsersUpdated);
    };
  }, [user, socket]);

  // 캐릭터 자동 선택
  useEffect(() => {
    if (characters.length > 0 && !currentCharacter) {
      // 저장된 캐릭터가 있으면 선택
      const savedCharacterId = localStorage.getItem('selectedCharacterId');
      if (savedCharacterId) {
        const savedCharacter = characters.find(char => char.id.toString() === savedCharacterId);
        if (savedCharacter) {
          setCurrentCharacter(savedCharacter);
          return;
        }
      }
      
      // 첫 번째 캐릭터 선택
      setCurrentCharacter(characters[0]);
    }
  }, [characters, currentCharacter]);

  // 선택된 캐릭터 저장
  useEffect(() => {
    if (currentCharacter) {
      localStorage.setItem('selectedCharacterId', currentCharacter.id.toString());
    }
  }, [currentCharacter]);

  // 방 목록 강제 새로고침
  const refreshMaps = () => {
    fetchMaps();
    fetchActiveMaps();
  };

  const value = {
    maps,
    activeMaps,
    characters,
    currentCharacter,
    currentMap,
    loading,
    error,
    mapParticipants,
    allLoggedInUsers,
    fetchMaps,
    fetchActiveMaps,
    fetchMap,
    fetchCharacters,
    createMap,
    updateMap,
    deleteMap,
    updateCharacter,
    createCharacter,
    selectCharacter,
    selectMap,
    createEmojiCharacter,
    refreshMaps,
    setError
  };

  return (
    <MetaverseContext.Provider value={value}>
      {children}
    </MetaverseContext.Provider>
  );
}; 