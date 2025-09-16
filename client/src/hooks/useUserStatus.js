import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAreaTypeAtPoint } from '../utils/privateAreaUtils';

// 사용자 상태 관리 훅
export const useUserStatus = (currentMap, myPosition) => {
  const { user, socket } = useAuth();
  const [userStatus, setUserStatus] = useState({
    status: 'lobby', // 'lobby' | 'in-room'
    currentRoom: null,
    position: null,
    area: null,
    areaType: null
  });

  // 위치와 영역 정보 업데이트
  useEffect(() => {
    if (!currentMap || !myPosition) {
      setUserStatus(prev => ({
        ...prev,
        status: 'lobby',
        currentRoom: null,
        position: null,
        area: null,
        areaType: null
      }));
      return;
    }

    // 현재 영역 확인
    const areaInfo = getAreaTypeAtPoint(myPosition, currentMap.privateAreas);
    
    const newStatus = {
      status: 'in-room',
      currentRoom: {
        id: currentMap.id,
        name: currentMap.name || `방 ${currentMap.id}`,
        mapId: currentMap.id
      },
      position: {
        x: Math.round(myPosition.x),
        y: Math.round(myPosition.y)
      },
      area: areaInfo.area,
      areaType: areaInfo.type
    };

    setUserStatus(newStatus);

    // 서버에 상태 업데이트 전송
    if (socket && user) {
      socket.emit('user-status-update', {
        userId: user.id,
        username: user.username,
        status: newStatus.status,
        currentRoom: newStatus.currentRoom,
        position: newStatus.position,
        area: newStatus.area,
        areaType: newStatus.areaType,
        timestamp: new Date().toISOString()
      });
    }

    console.log('👤 사용자 상태 업데이트:', newStatus);
  }, [currentMap, myPosition, socket, user]);

  // 로비로 이동 시 상태 초기화
  const setLobbyStatus = () => {
    const lobbyStatus = {
      status: 'lobby',
      currentRoom: null,
      position: null,
      area: null,
      areaType: null
    };

    setUserStatus(lobbyStatus);

    if (socket && user) {
      socket.emit('user-status-update', {
        userId: user.id,
        username: user.username,
        status: 'lobby',
        currentRoom: null,
        position: null,
        area: null,
        areaType: null,
        timestamp: new Date().toISOString()
      });
    }

    console.log('🏠 로비 상태로 변경:', lobbyStatus);
  };

  return {
    userStatus,
    setLobbyStatus
  };
};