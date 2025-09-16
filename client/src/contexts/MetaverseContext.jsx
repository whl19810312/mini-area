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
        
        // 각 캐릭터의 appearance 데이터를 이미지로 변환
        const processedCharacters = charactersData.map(character => {
          if (character.appearance && (!character.images || Object.values(character.images).some(img => !img))) {
            console.log('🔄 캐릭터 이미지 업데이트:', character.name, character.appearance);
            const generatedImages = generateImagesFromAppearance(character.appearance, character.size || 48);
            return {
              ...character,
              images: generatedImages
            };
          }
          return character;
        });
        
        setCharacters(processedCharacters);
        
        // 첫 번째 캐릭터 자동 선택
        if (processedCharacters.length > 0 && !currentCharacter) {
          setCurrentCharacter(processedCharacters[0]);
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
      console.log('🔄 캐릭터 업데이트 요청:', {
        characterId,
        characterData
      });
      
      const response = await axios.put(`/api/characters/${characterId}`, characterData);
      
      console.log('📡 캐릭터 업데이트 응답:', response.data);
      
      if (response.data.success) {
        const updatedCharacter = response.data.character;
        setCharacters(prev => prev.map(char => char.id === characterId ? updatedCharacter : char));
        
        if (currentCharacter && currentCharacter.id === characterId) {
          console.log('✅ 현재 캐릭터 업데이트됨:', updatedCharacter);
          setCurrentCharacter(updatedCharacter);
        }
        
        return updatedCharacter;
      } else {
        console.error('❌ 캐릭터 업데이트 실패:', response.data.message);
        setError('캐릭터 업데이트에 실패했습니다.');
        return null;
      }
    } catch (error) {
      console.error('❌ 캐릭터 업데이트 오류:', error);
      setError('캐릭터 업데이트에 실패했습니다.');
      return null;
    }
  };

  // 캐릭터 생성
  const createCharacter = async (characterData) => {
    if (!token) return null;
    
    try {
      console.log('🆕 캐릭터 생성 요청:', characterData);
      
      const response = await axios.post('/api/characters', characterData);
      
      console.log('📡 캐릭터 생성 응답:', response.data);
      
      if (response.data.success) {
        const newCharacter = response.data.character;
        setCharacters(prev => [...prev, newCharacter]);
        return newCharacter;
      } else {
        console.error('❌ 캐릭터 생성 실패:', response.data.message);
        setError('캐릭터 생성에 실패했습니다.');
        return null;
      }
    } catch (error) {
      console.error('❌ 캐릭터 생성 오류:', error);
      setError('캐릭터 생성에 실패했습니다.');
      return null;
    }
  };

  // 캐릭터 선택
  const selectCharacter = (character) => {
    console.log('🎯 캐릭터 선택:', {
      id: character?.id,
      name: character?.name,
      hasAppearance: !!character?.appearance,
      hasImages: !!character?.images,
      appearance: character?.appearance,
      images: character?.images
    });
    setCurrentCharacter(character);
  };

  // 방 선택
  const selectMap = (map) => {
    setCurrentMap(map);
  };

  // appearance 데이터를 이미지로 변환하는 함수
  const generateImagesFromAppearance = (appearance, size = 48) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    const images = {};
    const directions = ['down', 'up', 'left', 'right'];

    directions.forEach(direction => {
      ctx.clearRect(0, 0, size, size);
      
      const { head, body, arms, legs } = appearance;
      
      // 머리 (상단)
      ctx.font = `${size/4}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText(head || '😊', size/2, size/3);

      // 몸 (중간)
      ctx.font = `${size/5}px Arial`;
      ctx.fillText(body || '👕', size/2, size*0.58);

      // 팔 (방향에 따라 다름)
      ctx.font = `${size/6}px Arial`;
      if (direction === 'left') {
        ctx.fillText(arms || '👐', size/4, size*0.58);
      } else if (direction === 'right') {
        ctx.fillText(arms || '👐', size*3/4, size*0.58);
      } else {
        ctx.fillText(arms || '👐', size/3, size*0.58);
        ctx.fillText(arms || '👐', size*2/3, size*0.58);
      }

      // 다리 (하단)
      ctx.font = `${size/6}px Arial`;
      ctx.fillText(legs || '👖', size/2, size*0.83);

      // 이미지를 base64로 변환 (data: 접두사 제거)
      const imageData = canvas.toDataURL('image/png');
      images[direction] = imageData.split(',')[1]; // base64 부분만 추출
    });

    return images;
  };

  // 통합된 캐릭터 생성/업데이트 함수
  const createOrUpdateCharacter = async (characterName, characterData = null) => {
    if (!token || !user) return null;
    
    try {
      const userName = characterName || user.username;
      
      // 기존 캐릭터 확인
      const existingCharacter = characters.find(char => char.name === userName);
      
      let finalCharacterData;
      if (characterData) {
        // 커스터마이징 데이터가 제공된 경우
        const characterSize = characterData.size || 48;
        let characterImages = characterData.images;
        
        // appearance 데이터가 있으면 이미지 생성
        if (characterData.appearance) {
          console.log('🎨 appearance 데이터로 이미지 생성:', characterData.appearance);
          characterImages = generateImagesFromAppearance(characterData.appearance, characterSize);
        }
        
        finalCharacterData = {
          name: userName,
          ...characterData,
          images: characterImages
        };
      } else {
        // 자동 생성하는 경우 - 기존 캐릭터가 있으면 그 설정 유지, 없으면 기본값
        const autoGeneratedData = createAdvancedCharacter(userName);
        
        // 기존 캐릭터의 appearance 설정이 있으면 유지
        let appearanceData = {
          head: '😊',
          body: '👕', 
          arms: '👐',
          legs: '👖'
        };
        
        if (existingCharacter?.appearance) {
          console.log('✅ 기존 캐릭터의 appearance 설정 유지:', existingCharacter.appearance);
          appearanceData = existingCharacter.appearance;
        }
        
        // appearance 데이터로 이미지 생성
        const characterSize = existingCharacter?.size || 48;
        const generatedImages = generateImagesFromAppearance(appearanceData, characterSize);
        
        finalCharacterData = {
          name: userName,
          appearance: appearanceData,
          images: generatedImages,
          size: characterSize
        };
      }
      
      let savedCharacter;
      if (existingCharacter) {
        console.log('🔄 기존 캐릭터 업데이트:', userName);
        savedCharacter = await updateCharacter(existingCharacter.id, finalCharacterData);
      } else {
        console.log('🆕 새 캐릭터 생성:', userName);
        savedCharacter = await createCharacter(finalCharacterData);
      }
      
      if (savedCharacter) {
        // 캐릭터 목록 갱신
        await fetchCharacters();
        setCurrentCharacter(savedCharacter);
        return savedCharacter;
      }
      return null;
    } catch (error) {
      console.error('캐릭터 생성/업데이트 오류:', error);
      return null;
    }
  };

  // 이모지 기반 캐릭터 자동 생성 (레거시 호환용)
  const createEmojiCharacter = async (characterName) => {
    return await createOrUpdateCharacter(characterName);
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

  // 캐릭터 자동 선택 (개선된 로직)
  useEffect(() => {
    if (characters.length > 0 && !currentCharacter && user) {
      console.log('🔍 캐릭터 자동 선택 시작:', {
        charactersCount: characters.length,
        username: user.username,
        characterNames: characters.map(c => c.name)
      });

      // 1. 저장된 캐릭터 ID로 선택 시도
      const savedCharacterId = localStorage.getItem('selectedCharacterId');
      if (savedCharacterId) {
        const savedCharacter = characters.find(char => char.id.toString() === savedCharacterId);
        if (savedCharacter) {
          console.log('✅ 저장된 캐릭터 ID로 선택:', savedCharacter.name);
          setCurrentCharacter(savedCharacter);
          return;
        } else {
          console.log('⚠️ 저장된 캐릭터 ID에 해당하는 캐릭터 없음:', savedCharacterId);
        }
      }

      // 2. 사용자 이름과 일치하는 캐릭터 찾기
      const userCharacter = characters.find(char => char.name === user.username);
      if (userCharacter) {
        console.log('✅ 사용자 이름으로 캐릭터 선택:', userCharacter.name);
        setCurrentCharacter(userCharacter);
        return;
      }

      // 3. 가장 최근에 생성된 캐릭터 선택 (appearance 데이터가 있는 것 우선)
      const charactersWithAppearance = characters.filter(char => char.appearance);
      if (charactersWithAppearance.length > 0) {
        // createdAt 기준으로 내림차순 정렬하여 가장 최근 캐릭터 선택
        const sortedCharacters = [...charactersWithAppearance].sort((a, b) => 
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        console.log('✅ 가장 최근 캐릭터 선택 (appearance 있음):', sortedCharacters[0].name);
        setCurrentCharacter(sortedCharacters[0]);
        return;
      }

      // 4. 마지막 수단: 첫 번째 캐릭터 선택
      console.log('✅ 첫 번째 캐릭터 선택 (기본값):', characters[0].name);
      setCurrentCharacter(characters[0]);
    }
  }, [characters, currentCharacter, user]);

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
    createOrUpdateCharacter,
    generateImagesFromAppearance,
    refreshMaps,
    setError
  };

  return (
    <MetaverseContext.Provider value={value}>
      {children}
    </MetaverseContext.Provider>
  );
}; 