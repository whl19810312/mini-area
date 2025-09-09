import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useMetaverse } from '../contexts/MetaverseContext';
import { useAuth } from '../contexts/AuthContext';
import { useCharacterMovement } from '../hooks/useCharacterMovement';
import { useWebRTC } from '../hooks/useWebRTC';
import CharacterCustomizer from './CharacterCustomizer';
import VideoCallPanel from './VideoCallPanel';
import UserList from './UserList';
import { getEmojiById } from '../utils/emojiMapping';
import toast from 'react-hot-toast';
import '../styles/MetaverseScene.css';

const MetaverseSceneNew = forwardRef(({ 
  currentMap, 
  mapImage, 
  onReturnToLobby,
  onEditMap,
  onDeleteMap,
  onOpenSNS,
  onOpenShop,
  user: propUser,
  otherUsers: propOtherUsers
}, ref) => {
  const { user: authUser, socket } = useAuth();
  const { otherUsers: contextOtherUsers, currentCharacter } = useMetaverse();
  const user = propUser || authUser;
  const otherUsers = propOtherUsers || contextOtherUsers;
  
  // 캔버스 참조
  const canvasRef = useRef(null);
  const backgroundCanvasRef = useRef(null);
  const wallsCanvasRef = useRef(null);
  const privateAreasCanvasRef = useRef(null);
  const characterCanvasRef = useRef(null);
  const foregroundCanvasRef = useRef(null);
  
  // 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [foregroundImage, setForegroundImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 1000 });
  const [showCharacterCustomizer, setShowCharacterCustomizer] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallMode, setVideoCallMode] = useState(null); // 'zone', 'global'
  const [targetUser, setTargetUser] = useState(null);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [currentZone, setCurrentZone] = useState('퍼블릭 영역'); // 현재 영역 표시
  const [showUserList, setShowUserList] = useState(false); // 사용자 목록 모달
  const [incomingCall, setIncomingCall] = useState(null); // 수신 화상통화 요청
  const [globalCallRoom, setGlobalCallRoom] = useState(null); // 전체 통화 방 ID
  const [globalCallParticipants, setGlobalCallParticipants] = useState([]); // 전체 통화 참가자
  const [activeGlobalCall, setActiveGlobalCall] = useState(null); // 현재 진행 중인 전체 통화
  const [zoneCallRoom, setZoneCallRoom] = useState(null); // 영역 통화 방 ID
  const [activeZoneCall, setActiveZoneCall] = useState(null); // 현재 진행 중인 영역 통화
  const [roomOtherUsers, setRoomOtherUsers] = useState([]); // 방의 다른 사용자들 (실시간 업데이트)
  const [isFullscreen, setIsFullscreen] = useState(false); // 전체화면 상태
  
  // 다른 사용자들의 위치 보간을 위한 refs
  const otherUsersPositionsRef = useRef(new Map()); // 목표 위치
  const otherUsersCurrentPositionsRef = useRef(new Map()); // 현재 위치 (보간된)
  const animationFrameIdRef = useRef(null);
  
  // 전체화면 상태 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // 캐릭터가 프라이빗 영역에 있는지 확인
  const checkCurrentZone = (pos) => {
    if (!currentMap?.privateAreas || !pos) {
      setCurrentZone('퍼블릭 영역');
      return;
    }
    
    // 각 프라이빗 영역 확인
    for (const area of currentMap.privateAreas) {
      if (pos.x >= area.position.x && 
          pos.x <= area.position.x + area.size.width &&
          pos.y >= area.position.y && 
          pos.y <= area.position.y + area.size.height) {
        setCurrentZone(`프라이빗 영역: ${area.name || '이름 없음'}`);
        return;
      }
    }
    
    setCurrentZone('퍼블릭 영역');
  };
  
  // 시작점 결정 (spawnPoints 배열의 첫 번째 또는 spawnPoint 단일 값)
  // useMemo로 감싸서 currentMap이 변경될 때만 재계산
  const initialPosition = useMemo(() => {
    // spawnPoints 배열이 있고 비어있지 않으면 첫 번째 사용
    if (currentMap?.spawnPoints && currentMap.spawnPoints.length > 0) {
      const firstSpawn = currentMap.spawnPoints[0];
      console.log('📍 시작점 배열에서 읽어옴:', firstSpawn);
      return { x: firstSpawn.x || 500, y: firstSpawn.y || 500 };
    }
    // 단일 spawnPoint가 있으면 사용
    if (currentMap?.spawnPoint) {
      console.log('📍 단일 시작점 읽어옴:', currentMap.spawnPoint);
      return currentMap.spawnPoint;
    }
    // 기본값
    console.log('📍 기본 시작점 사용: {x: 500, y: 500}');
    return { x: 500, y: 500 };
  }, [currentMap?.id]); // currentMap의 id가 변경될 때만 재계산
  
  // 캐릭터 이동 hook 사용
  const { 
    userPosition: position,
    currentDirection: direction,
    otherUsers: movementOtherUsers,
    moveTo,
    isMoving,
    navigationMode,
    currentPath
  } = useCharacterMovement(null, canvasSize, currentMap);
  
  // WebRTC hook 사용
  const webRTC = useWebRTC(user?.socket, user, () => {
    setShowVideoCall(false);
    setTargetUser(null);
  });
  
  
  
  // 화상통화 수락
  const acceptVideoCall = () => {
    if (incomingCall) {
      // 퍼블릭 영역에서는 전체/영역 통화 수락 불가
      if (currentZone === '퍼블릭 영역') {
        toast.error('퍼블릭 영역에서는 화상통화를 수락할 수 없습니다. 프라이빗 영역으로 이동해주세요.');
        setIncomingCall(null);
        return;
      }
      
      // 전체 통화 요청인 경우
      if (incomingCall.type === 'global') {
        handleJoinGlobalCall(incomingCall.roomId);
      }
      setIncomingCall(null);
      
      // Socket으로 수락 응답 전송
      if (user?.socket) {
        user.socket.emit('video-call-accept', {
          from: user.id,
          to: incomingCall.userId,
          type: incomingCall.type,
          roomId: incomingCall.roomId
        });
      }
    }
  };
  
  // 전체 화상통화 요청
  const handleGlobalVideoCallRequest = async () => {
    // 퍼블릭 영역에서는 화상통화 시작 불가
    if (currentZone === '퍼블릭 영역') {
      toast.error('퍼블릭 영역에서는 화상통화를 시작할 수 없습니다. 프라이빗 영역으로 이동해주세요.');
      return;
    }
    
    try {
      // 먼저 현재 진행 중인 전체 통화가 있는지 확인
      if (activeGlobalCall) {
        // 기존 통화에 참가
        await handleJoinGlobalCall(activeGlobalCall.roomId);
        toast.success('진행 중인 전체 화상통화에 참가했습니다.');
      } else {
        // 새로운 전체 통화 시작
        const roomId = `global_${currentMap.id}_${Date.now()}`;
        
        // 모든 사용자에게 전체 통화 시작 알림
        if (socket) {
          socket.emit('global-video-call-start', {
            from: user.id,
            username: user.username,
            mapId: currentMap.id,
            roomId: roomId
          });
        }
        
        setGlobalCallRoom(roomId);
        setActiveGlobalCall({ roomId, participants: [user.id] });
        setVideoCallMode('global');
        setShowVideoCall(true);
        
        toast.success('전체 화상통화를 시작했습니다.');
      }
    } catch (error) {
      console.error('전체 화상통화 오류:', error);
      toast.error('전체 화상통화에 실패했습니다.');
    }
  };
  
  // 전체 화상통화 참가
  const handleJoinGlobalCall = async (roomId) => {
    // 퍼블릭 영역에서는 화상통화 참가 불가
    if (currentZone === '퍼블릭 영역') {
      toast.error('퍼블릭 영역에서는 화상통화에 참가할 수 없습니다. 프라이빗 영역으로 이동해주세요.');
      return;
    }
    
    try {
      setGlobalCallRoom(roomId);
      setVideoCallMode('global');
      setShowVideoCall(true);
      toast.success('전체 화상통화에 참가했습니다.');
    } catch (error) {
      console.error('전체 화상통화 참가 오류:', error);
      toast.error('전체 화상통화 참가에 실패했습니다.');
    }
  };
  
  // 영역별 화상통화 요청
  const handleZoneVideoCallRequest = async () => {
    try {
      // 현재 영역 확인
      if (currentZone === '퍼블릭 영역') {
        toast.error('프라이빗 영역에서만 영역 통화를 시작할 수 있습니다.');
        return;
      }
      
      // 서버에 현재 영역의 활성 통화 확인 요청
      if (socket) {
        socket.emit('check-zone-call', {
          zone: currentZone,
          mapId: currentMap.id
        }, (response) => {
          if (response.activeCall) {
            setActiveZoneCall(response.activeCall);
          }
        });
      }
      
      // 먼저 현재 영역에서 진행 중인 통화가 있는지 확인
      if (activeZoneCall) {
        // 기존 통화에 참가
        await handleJoinZoneCall(activeZoneCall.roomId);
        toast.success('진행 중인 영역 화상통화에 참가했습니다.');
      } else {
        // 새로운 영역 통화 시작
        const roomId = `zone_${currentMap.id}_${currentZone}_${Date.now()}`;
        
        // 같은 영역의 사용자들에게만 통화 시작 알림
        if (socket) {
          socket.emit('zone-video-call-start', {
            from: user.id,
            username: user.username,
            mapId: currentMap.id,
            zone: currentZone,
            roomId: roomId
          });
        }
        
        setZoneCallRoom(roomId);
        setActiveZoneCall({ roomId, zone: currentZone, participants: [user.id] });
        setVideoCallMode('zone');
        setShowVideoCall(true);
        
        toast.success('영역 화상통화를 시작했습니다.');
      }
    } catch (error) {
      console.error('영역 화상통화 오류:', error);
      toast.error('영역 화상통화에 실패했습니다.');
    }
  };
  
  // 영역 화상통화 참가
  const handleJoinZoneCall = async (roomId) => {
    // 퍼블릭 영역에서는 화상통화 참가 불가
    if (currentZone === '퍼블릭 영역') {
      toast.error('퍼블릭 영역에서는 화상통화에 참가할 수 없습니다. 프라이빗 영역으로 이동해주세요.');
      return;
    }
    
    try {
      setZoneCallRoom(roomId);
      setVideoCallMode('zone');
      setShowVideoCall(true);
      toast.success('영역 화상통화에 참가했습니다.');
    } catch (error) {
      console.error('영역 화상통화 참가 오류:', error);
      toast.error('영역 화상통화 참가에 실패했습니다.');
    }
  };
  
  // 화상통화 거절
  const rejectVideoCall = () => {
    if (incomingCall && user?.socket) {
      user.socket.emit('video-call-reject', {
        from: user.id,
        to: incomingCall.userId
      });
      setIncomingCall(null);
      toast.error('화상통화를 거절했습니다.');
    }
  };
  
  // Socket 이벤트 리스너
  useEffect(() => {
    if (!user?.socket) return;
    
    // 화상통화 요청 수신
    const handleIncomingCall = (data) => {
      setIncomingCall({
        userId: data.from,
        username: data.username
      });
      toast(`${data.username}님이 화상통화를 요청했습니다.`, {
        duration: 10000,
        icon: '📹'
      });
    };
    
    // 화상통화 수락됨
    const handleCallAccepted = (data) => {
      setShowVideoCall(true);
      toast.success('화상통화가 연결되었습니다.');
    };
    
    // 화상통화 거절됨
    const handleCallRejected = (data) => {
      setShowVideoCall(false);
      setTargetUser(null);
      toast.error('상대방이 화상통화를 거절했습니다.');
    };
    
    // 전체 화상통화 시작 알림
    const handleGlobalCallStart = (data) => {
      // 현재 진행 중인 전체 통화로 설정
      setActiveGlobalCall({
        roomId: data.roomId,
        participants: data.participants || [data.from]
      });
      
      if (data.from !== user.id) {
        // 다른 사용자가 시작한 경우 알림
        toast(`📺 ${data.username}님이 전체 화상통화를 시작했습니다. 전체 통화 버튼을 눌러 참가하세요!`, {
          duration: 10000,
          icon: '🔔'
        });
      }
    };
    
    // 전체 화상통화 참가자 업데이트
    const handleGlobalCallParticipantUpdate = (data) => {
      setGlobalCallParticipants(data.participants);
      
      if (data.participants && data.participants.length > 0) {
        setActiveGlobalCall(prev => ({
          ...prev,
          participants: data.participants
        }));
      } else {
        // 참가자가 없으면 통화 종료
        setActiveGlobalCall(null);
      }
    };
    
    // 전체 화상통화 종료
    const handleGlobalCallEnd = (data) => {
      if (data.roomId === globalCallRoom) {
        setActiveGlobalCall(null);
        setGlobalCallRoom(null);
        setGlobalCallParticipants([]);
        toast('전체 화상통화가 종료되었습니다.', { icon: '📴' });
      }
    };
    
    // 영역 화상통화 시작 알림
    const handleZoneCallStart = (data) => {
      // 같은 영역인 경우에만 알림 표시
      if (data.zone === currentZone) {
        setActiveZoneCall({
          roomId: data.roomId,
          zone: data.zone,
          participants: data.participants || [data.from]
        });
        
        if (data.from !== user.id) {
          toast(`🎥 ${data.username}님이 영역 화상통화를 시작했습니다. 영역 통화 버튼을 눌러 참가하세요!`, {
            duration: 10000,
            icon: '🔔'
          });
        }
      }
    };
    
    // 영역 화상통화 참가자 업데이트
    const handleZoneCallParticipantUpdate = (data) => {
      if (data.zone === currentZone) {
        if (data.participants && data.participants.length > 0) {
          setActiveZoneCall(prev => ({
            ...prev,
            participants: data.participants
          }));
        } else {
          // 참가자가 없으면 통화 종료
          setActiveZoneCall(null);
        }
      }
    };
    
    // 영역 화상통화 종료
    const handleZoneCallEnd = (data) => {
      if (data.roomId === zoneCallRoom) {
        setActiveZoneCall(null);
        setZoneCallRoom(null);
        toast('영역 화상통화가 종료되었습니다.', { icon: '📴' });
      }
    };
    
    // 5초마다 방의 모든 사용자 데이터 수신
    const handleRoomUsersUpdate = (data) => {
      const { users } = data;
      
      // 모든 사용자 정보 업데이트
      const newOtherUsers = new Map();
      users.forEach(userData => {
        if (userData.userId !== user.id) {
          newOtherUsers.set(userData.userId, {
            ...userData,
            position: userData.position || { x: 200, y: 200 }
          });
          // 위치 업데이트
          otherUsersPositionsRef.current.set(userData.userId, userData.position);
        }
      });
      
      // 다른 사용자 상태 업데이트
      setRoomOtherUsers(Array.from(newOtherUsers.values()));
      
      console.log(`👥 방 사용자 업데이트: ${users.length}명`);
    };
    
    // 개별 위치 업데이트는 더 이상 처리하지 않음 (5초마다 전체 데이터로 대체)
    const handleCharacterPositionUpdate = (data) => {
      // 비활성화
    };
    
    // 다른 사용자의 캐릭터 정보 업데이트 수신
    const handleCharacterInfoUpdate = (data) => {
      if (data.userId !== user.id) {
      }
    };
    
    // 방 사용자 목록 수신 (1:1 통화용)
    const handleRoomUsersList = (data) => {
      console.log('👥 방 사용자 목록:', data.users);
      // 1:1 통화를 위한 사용자 목록 업데이트
      if (data.users && data.users.length > 0) {
        setRoomOtherUsers(data.users);
      }
    };
    
    // 방 사용자 정보 수신 (0.5초마다)
    const handleRoomUsersInfo = (data) => {
      if (data.users && Array.isArray(data.users)) {
        // 다른 사용자들의 위치와 캐릭터 정보 업데이트
        setRoomOtherUsers(data.users);
        
        // 위치 정보 업데이트
        data.users.forEach(user => {
          if (user.position) {
            otherUsersPositionsRef.current.set(user.userId, user.position);
          }
        });
        
        console.log('📡 방 사용자 정보 수신:', data.users.length, '명');
      }
    };
    
    user.socket.on('room-users-update', handleRoomUsersUpdate);
    user.socket.on('room-users-list', handleRoomUsersList);
    user.socket.on('room-users-info', handleRoomUsersInfo);
    user.socket.on('character-position-update', handleCharacterPositionUpdate);
    user.socket.on('character-info-update', handleCharacterInfoUpdate);
    user.socket.on('video-call-request', handleIncomingCall);
    user.socket.on('video-call-accepted', handleCallAccepted);
    user.socket.on('video-call-rejected', handleCallRejected);
    user.socket.on('global-video-call-start', handleGlobalCallStart);
    user.socket.on('global-call-participant-update', handleGlobalCallParticipantUpdate);
    user.socket.on('global-video-call-end', handleGlobalCallEnd);
    user.socket.on('zone-video-call-start', handleZoneCallStart);
    user.socket.on('zone-call-participant-update', handleZoneCallParticipantUpdate);
    user.socket.on('zone-video-call-end', handleZoneCallEnd);
    
    return () => {
      user.socket.off('room-users-update', handleRoomUsersUpdate);
      user.socket.off('room-users-list', handleRoomUsersList);
      user.socket.off('room-users-info', handleRoomUsersInfo);
      user.socket.off('character-position-update', handleCharacterPositionUpdate);
      user.socket.off('character-info-update', handleCharacterInfoUpdate);
      user.socket.off('video-call-request', handleIncomingCall);
      user.socket.off('video-call-accepted', handleCallAccepted);
      user.socket.off('video-call-rejected', handleCallRejected);
      user.socket.off('global-video-call-start', handleGlobalCallStart);
      user.socket.off('global-call-participant-update', handleGlobalCallParticipantUpdate);
      user.socket.off('global-video-call-end', handleGlobalCallEnd);
      user.socket.off('zone-video-call-start', handleZoneCallStart);
      user.socket.off('zone-call-participant-update', handleZoneCallParticipantUpdate);
      user.socket.off('zone-video-call-end', handleZoneCallEnd);
    };
  }, [user?.socket]);
  
  // 0.5초마다 방의 다른 사용자 정보 요청
  useEffect(() => {
    if (!user?.socket || !currentMap?.id) return;
    
    // 0.5초마다 방 사용자 정보 요청
    const interval = setInterval(() => {
      user.socket.emit('get-room-users-info');
    }, 500);
    
    // 초기 요청
    user.socket.emit('get-room-users-info');
    
    return () => {
      clearInterval(interval);
    };
  }, [user?.socket, currentMap?.id]);
  
  // 캐릭터가 움직임을 완전히 멈췄을 때만 현재 영역 체크
  // 이동 완료 후에만 영역 체크 (경로 이동 중에는 체크하지 않음)
  const [previousMovingState, setPreviousMovingState] = useState(false);
  const [previousNavigationMode, setPreviousNavigationMode] = useState('idle');
  
  useEffect(() => {
    // 네비게이션으로 목적지 도착 시에만 영역 체크
    if (navigationMode === 'arrived' && previousNavigationMode === 'navigating') {
      console.log('🎯 목적지 도착 - 영역 체크 시작');
      const prevZone = currentZone;
      checkCurrentZone(position);
    // 키보드 이동 완료 시 영역 체크
    } else if (previousMovingState && !isMoving && navigationMode === 'idle') {
      console.log('🏁 키보드 이동 완료 - 영역 체크 시작');
      const prevZone = currentZone;
      checkCurrentZone(position);
      
      // 영역이 변경되면 현재 영역의 활성 통화 초기화
      if (prevZone !== currentZone) {
        console.log(`📍 영역 변경: ${prevZone} → ${currentZone}`);
        
        // 퍼블릭 영역으로 이동 시 전체/영역 통화 종료 (1:1 통화는 유지)
        if (currentZone === '퍼블릭 영역') {
          // 영역 통화 종료
          if (videoCallMode === 'zone' && showVideoCall) {
            setShowVideoCall(false);
            setVideoCallMode(null);
            setZoneCallRoom(null);
            setActiveZoneCall(null);
            toast.info('퍼블릭 영역에서는 영역 화상통화가 종료됩니다.');
          }
          
          // 전체 통화 종료
          if (videoCallMode === 'global' && showVideoCall) {
            setShowVideoCall(false);
            setVideoCallMode(null);
            setGlobalCallRoom(null);
            setActiveGlobalCall(null);
            toast.info('퍼블릭 영역에서는 전체 화상통화가 종료됩니다.');
          }
        }
        
        // 이전 영역의 통화 상태 초기화
        setActiveZoneCall(null);
        
        // 서버에 영역 변경 알림
        if (socket) {
          socket.emit('zone-changed', {
            userId: user.id,
            fromZone: prevZone,
            toZone: currentZone,
            mapId: currentMap?.id
          });
        }
      }
    } else if (!previousMovingState && isMoving) {
      console.log('🚶 이동 시작 - 영역 체크 일시 중지');
    } else if (navigationMode === 'navigating' && !previousMovingState) {
      console.log('🚀 경로 네비게이션 시작');
    }
    
    setPreviousMovingState(isMoving || navigationMode === 'navigating');
    setPreviousNavigationMode(navigationMode);
  }, [isMoving, navigationMode, position, currentZone, videoCallMode, showVideoCall, socket, user, currentMap]);
  
  // 다른 사용자들의 위치 부드럽게 보간
  useEffect(() => {
    const interpolatePositions = () => {
      let needsRedraw = false;
      
      otherUsersPositionsRef.current.forEach((targetPos, userId) => {
        const currentPos = otherUsersCurrentPositionsRef.current.get(userId);
        
        if (!currentPos) {
          // 처음 위치 설정
          otherUsersCurrentPositionsRef.current.set(userId, { ...targetPos });
          needsRedraw = true;
        } else {
          // 부드러운 이동을 위한 보간
          const speed = 0.15; // 보간 속도
          const dx = targetPos.x - currentPos.x;
          const dy = targetPos.y - currentPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0.5) { // 0.5픽셀 이상 차이날 때만 업데이트
            const newPos = {
              x: currentPos.x + dx * speed,
              y: currentPos.y + dy * speed
            };
            otherUsersCurrentPositionsRef.current.set(userId, newPos);
            needsRedraw = true;
          }
        }
      });
      
      animationFrameIdRef.current = requestAnimationFrame(interpolatePositions);
    };
    
    animationFrameIdRef.current = requestAnimationFrame(interpolatePositions);
    
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);
  
  // 공간 입실 시 초기 캐릭터 정보 전송
  useEffect(() => {
    if (socket && currentMap && user && currentCharacter) {
      // 공간에 입실했을 때 캐릭터 정보 전송
      socket.emit('character-info-update', {
        mapId: currentMap.id,
        userId: user.id,
        username: user.username,
        characterName: currentCharacter?.displayName || user.username,
        appearance: currentCharacter?.appearance,
        position: position || getInitialPosition()
      });
    }
  }, [currentMap?.id]); // currentMap.id가 변경될 때마다 (입실 시)
  
  // 배경 이미지 로드
  useEffect(() => {
    if (currentMap) {
      setIsLoading(true);
      
      // 배경 이미지 처리
      let bgImage = null;
      if (currentMap.backgroundLayer?.image?.data) {
        const contentType = currentMap.backgroundLayer.image.contentType || 'image/jpeg';
        bgImage = `data:${contentType};base64,${currentMap.backgroundLayer.image.data}`;
      } else if (currentMap.backgroundImage) {
        bgImage = currentMap.backgroundImage;
      } else if (mapImage) {
        bgImage = mapImage;
      }
      
      // 전경 이미지 처리
      let fgImage = null;
      if (currentMap.foregroundLayer?.image?.data) {
        const contentType = currentMap.foregroundLayer.image.contentType || 'image/png';
        fgImage = `data:${contentType};base64,${currentMap.foregroundLayer.image.data}`;
      } else if (currentMap.foregroundImage || currentMap.frontImage) {
        fgImage = currentMap.foregroundImage || currentMap.frontImage;
      }
      
      setBackgroundImage(bgImage);
      setForegroundImage(fgImage);
      
      console.log('🎨 이미지 로드 완료:', {
        배경: bgImage ? '있음' : '없음',
        전경: fgImage ? '있음' : '없음'
      });
      
      setIsLoading(false);
      
      // 모든 로딩이 완료되면 플래그 설정
      setTimeout(() => {
        setIsAllLoaded(true);
      }, 500);
    }
  }, [currentMap, mapImage]);
  
  // 캔버스 초기화 및 렌더링
  useEffect(() => {
    if (!backgroundCanvasRef.current || !wallsCanvasRef.current || 
        !privateAreasCanvasRef.current || !characterCanvasRef.current || 
        !foregroundCanvasRef.current) return;
    
    // 배경 이미지 그리기
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        // 이미지의 실제 크기를 캔버스 크기로 설정
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        // 캔버스 크기 상태 업데이트
        setCanvasSize({ width, height });
        
        // 배경 캔버스 설정
        const bgCanvas = backgroundCanvasRef.current;
        bgCanvas.width = width;
        bgCanvas.height = height;
        const bgCtx = bgCanvas.getContext('2d');
        
        bgCtx.clearRect(0, 0, width, height);
        bgCtx.drawImage(img, 0, 0, width, height);
        
        // 벽 캔버스도 같은 크기로 설정
        const wallCanvas = wallsCanvasRef.current;
        wallCanvas.width = width;
        wallCanvas.height = height;
        
        // 프라이빗 영역 캔버스도 같은 크기로 설정
        const privateCanvas = privateAreasCanvasRef.current;
        privateCanvas.width = width;
        privateCanvas.height = height;
        
        // 캐릭터 캔버스도 같은 크기로 설정
        const charCanvas = characterCanvasRef.current;
        charCanvas.width = width;
        charCanvas.height = height;
        
        // 전경 캔버스도 같은 크기로 설정
        const fgCanvas = foregroundCanvasRef.current;
        fgCanvas.width = width;
        fgCanvas.height = height;
        const fgCtx = fgCanvas.getContext('2d');
        
        // 전경 이미지 그리기
        if (foregroundImage) {
          const fgImg = new Image();
          fgImg.onload = () => {
            fgCtx.clearRect(0, 0, width, height);
            fgCtx.drawImage(fgImg, 0, 0, width, height);
          };
          fgImg.src = foregroundImage;
        } else {
          // 전경은 투명
          fgCtx.clearRect(0, 0, width, height);
        }
      };
      img.src = backgroundImage;
    } else {
      // 배경 이미지가 없을 경우 맵 크기 또는 기본값 사용
      const width = currentMap?.size?.width || 1000;
      const height = currentMap?.size?.height || 1000;
      
      // 캔버스 크기 상태 업데이트
      setCanvasSize({ width, height });
      
      // 배경 캔버스 설정
      const bgCanvas = backgroundCanvasRef.current;
      bgCanvas.width = width;
      bgCanvas.height = height;
      const bgCtx = bgCanvas.getContext('2d');
      
      // 기본 배경색
      bgCtx.fillStyle = '#1a1a1a';
      bgCtx.fillRect(0, 0, width, height);
      
      // 벽 캔버스 설정
      const wallCanvas = wallsCanvasRef.current;
      wallCanvas.width = width;
      wallCanvas.height = height;
      
      // 프라이빗 영역 캔버스 설정
      const privateCanvas = privateAreasCanvasRef.current;
      privateCanvas.width = width;
      privateCanvas.height = height;
      
      // 캐릭터 캔버스 설정
      const charCanvas = characterCanvasRef.current;
      charCanvas.width = width;
      charCanvas.height = height;
      
      // 전경 캔버스 설정
      const fgCanvas = foregroundCanvasRef.current;
      fgCanvas.width = width;
      fgCanvas.height = height;
      const fgCtx = fgCanvas.getContext('2d');
      fgCtx.clearRect(0, 0, width, height);
      
      console.log('📐 기본 캔버스 크기 설정:', width, 'x', height);
    }
  }, [backgroundImage, foregroundImage, currentMap]);
  
  // 벽 렌더링 (PathFinder는 useCharacterMovement에서 초기화됨)
  useEffect(() => {
    if (!wallsCanvasRef.current || !currentMap) return;
    
    const canvas = wallsCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 벽 그리기 (디버깅용, opacity 0으로 숨김)
    if (currentMap.walls && currentMap.walls.length > 0) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 3;
      
      currentMap.walls.forEach(wall => {
        if (wall.start && wall.end) {
          ctx.beginPath();
          ctx.moveTo(wall.start.x, wall.start.y);
          ctx.lineTo(wall.end.x, wall.end.y);
          ctx.stroke();
        }
      });
    }
  }, [currentMap, canvasSize]);
  
  // 프라이빗 영역 렌더링
  useEffect(() => {
    if (!privateAreasCanvasRef.current || !currentMap?.privateAreas) return;
    
    const canvas = privateAreasCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 프라이빗 영역 그리기
    if (currentMap.privateAreas && currentMap.privateAreas.length > 0) {
      currentMap.privateAreas.forEach((area, index) => {
        // 영역 채우기
        ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
        ctx.fillRect(area.position.x, area.position.y, area.size.width, area.size.height);
        
        // 영역 테두리
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(area.position.x, area.position.y, area.size.width, area.size.height);
        
        // 영역 이름 표시
        ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = area.position.x + area.size.width / 2;
        const centerY = area.position.y + area.size.height / 2;
        ctx.fillText(area.name || `프라이빗 영역 ${index + 1}`, centerX, centerY);
      });
      
    }
  }, [currentMap, canvasSize]);
  
  // 캐릭터와 시작점 렌더링 (모든 로딩이 완료된 후에만)
  useEffect(() => {
    if (!characterCanvasRef.current || !isAllLoaded) return;
    
    const canvas = characterCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 시작점은 입실 화면에서는 그리지 않음 (편집기에서만 표시)
    // 편집기 모드가 아니므로 시작점 렌더링 제거
    
    // 플레이어 캐릭터 그리기
    if (position && position.x !== undefined && position.y !== undefined) {
      
      // appearance 변수를 블록 밖에서 정의
      const appearance = currentCharacter?.appearance;
      
      // 캐릭터 설정이 있으면 3개 부분 모두 표시
      if (appearance) {
        
        // 캐릭터 배경 원 제거 (완전 투명)
        
        // 캐릭터 3개 부분 표시
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 머리 (위) - 이모지 ID를 실제 이모지로 변환
        const headEmoji = getEmojiById('head', appearance.head) || appearance.emoji || '😊';
        ctx.fillText(headEmoji, position.x, position.y - 15);
        
        // 상의 (중간) - 이모지 ID를 실제 이모지로 변환
        const topEmoji = getEmojiById('top', appearance.top) || '👕';
        ctx.fillText(topEmoji, position.x, position.y);
        
        // 하의 (아래) - 이모지 ID를 실제 이모지로 변환
        const bottomEmoji = getEmojiById('bottom', appearance.bottom) || '👖';
        ctx.fillText(bottomEmoji, position.x, position.y + 15);
      } else {
        // 기본 원형 캐릭터
        ctx.fillStyle = '#00ff00';
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.arc(position.x, position.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 내부 원
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(position.x, position.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 이름 표시 (더 크고 선명하게)
      if (user?.username) {
        // displayName 우선, 없으면 username
        const displayName = currentCharacter?.displayName || appearance?.displayName || user.username;
        
        // 배경 박스 제거 (100% 투명)
        // ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        // const textWidth = ctx.measureText(displayName).width;
        // ctx.fillRect(position.x - textWidth/2 - 5, position.y - 55, textWidth + 10, 20);
        
        // 텍스트만 표시 (더 위로 올림)
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayName, position.x, position.y - 45);
      }
      
      // 방향 표시 (더 선명하게)
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const dirAngle = direction * Math.PI / 2; // 0: 위, 1: 오른쪽, 2: 아래, 3: 왼쪽
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(
        position.x + Math.sin(dirAngle) * 15,
        position.y - Math.cos(dirAngle) * 15
      );
      ctx.stroke();
    } else {
      console.log('⚠️ 플레이어 위치 없음:', position);
    }
    
    // 다른 플레이어들 그리기 (보간된 위치 사용)
    const allOtherUsers = roomOtherUsers.length > 0 ? roomOtherUsers : otherUsers;
    if (Array.isArray(allOtherUsers) && allOtherUsers.length > 0) {
      allOtherUsers.forEach(otherUser => {
        if (otherUser.position && otherUser.position.x !== undefined && otherUser.position.y !== undefined) {
          // 목표 위치 업데이트
          otherUsersPositionsRef.current.set(otherUser.userId, { ...otherUser.position });
          
          // 보간된 현재 위치 가져오기
          const interpolatedPos = otherUsersCurrentPositionsRef.current.get(otherUser.userId) || otherUser.position;
          
          // 다른 플레이어의 캐릭터 외형 가져오기
          const otherAppearance = otherUser.appearance || {};
          
          // 다른 플레이어 캐릭터 3개 부분 (보간된 위치에)
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // 머리 - 이모지 ID를 실제 이모지로 변환
          const otherHead = getEmojiById('head', otherAppearance.head) || otherAppearance.emoji || '😊';
          ctx.fillText(otherHead, interpolatedPos.x, interpolatedPos.y - 15);
          
          // 상의 - 이모지 ID를 실제 이모지로 변환
          const otherTop = getEmojiById('top', otherAppearance.top) || '👕';
          ctx.fillText(otherTop, interpolatedPos.x, interpolatedPos.y);
          
          // 하의 - 이모지 ID를 실제 이모지로 변하
          const otherBottom = getEmojiById('bottom', otherAppearance.bottom) || '👖';
          ctx.fillText(otherBottom, interpolatedPos.x, interpolatedPos.y + 15);
          
          // 이름 표시 (보간된 위치에)
          if (otherUser.username) {
            // displayName 우선, 없으면 username
            const otherDisplayName = otherUser.appearance?.displayName || otherUser.username;
            
            // 배경 박스 제거 (100% 투명)
            // ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            // const textWidth = ctx.measureText(otherDisplayName).width;
            // ctx.fillRect(interpolatedPos.x - textWidth/2 - 5, interpolatedPos.y - 55, textWidth + 10, 20);
            
            // 텍스트만 표시 (더 위로 올림)
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(otherDisplayName, interpolatedPos.x, interpolatedPos.y - 45);
          }
        }
      });
    }
    
  }, [position, direction, otherUsers, roomOtherUsers, user, canvasSize, currentMap, isAllLoaded, currentCharacter]);
  
  // 키보드 이벤트 차단 - 마우스 클릭으로만 이동
  // useEffect(() => {
  //   window.addEventListener('keydown', handleKeyDown);
  //   window.addEventListener('keyup', handleKeyUp);
  //   
  //   return () => {
  //     window.removeEventListener('keydown', handleKeyDown);
  //     window.removeEventListener('keyup', handleKeyUp);
  //   };
  // }, [handleKeyDown, handleKeyUp]);
  
  // 클릭 이동 제거 - 키보드로만 이동 가능
  
  // 위치 업데이트를 0.25초마다 서버로 전송
  useEffect(() => {
    if (!socket || !position || !currentMap || !user) return;
    
    const sendPosition = () => {
      socket.emit('character-position-update', {
        mapId: currentMap.id,
        userId: user.id,
        username: user.username,
        position: position,
        direction: direction,
        isMoving: isMoving,
        appearance: currentCharacter?.appearance,
        characterName: currentCharacter?.displayName || user.username
      });
    };
    
    // 처음 위치 즉시 전송
    sendPosition();
    
    // 0.25초마다 위치 전송 (250ms)
    const intervalId = setInterval(sendPosition, 250);
    
    return () => clearInterval(intervalId);
  }, [position, direction, isMoving, socket, currentMap, user, currentCharacter]);
  
  // ref 노출
  useImperativeHandle(ref, () => ({
    leaveMapAndReturnToLobby: (mapId) => {
      console.log('🚪 맵 나가기:', mapId);
      if (socket) {
        socket.emit('leave-map', { mapId });
      }
    }
  }));
  
  if (isLoading) {
    return (
      <div className="metaverse-loading">
        <div className="loading-text">공간 로딩 중...</div>
      </div>
    );
  }
  
  return (
    <div className="metaverse-scene-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      {/* 상단 툴바 - 방 이름 표시 */}
      <div className="scene-toolbar">
        <div className="toolbar-left">
          <h2 className="room-name">{currentMap?.name || '가상 공간'}</h2>
        </div>
        
        <div className="toolbar-center">
          <span className="username-display">👤 {user?.username}</span>
          <span className="toolbar-divider">|</span>
          <span className="online-count">
            🟢 접속자: {Array.isArray(otherUsers) ? otherUsers.length + 1 : 1}명
          </span>
        </div>
        
        <div className="toolbar-right">
          <button 
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                  console.log(`전체화면 오류: ${err.message}`);
                });
              } else {
                document.exitFullscreen();
              }
            }} 
            className="toolbar-btn"
            title={isFullscreen ? "전체화면 종료" : "전체화면"}
          >
            {isFullscreen ? '🔳' : '🔲'} 전체화면
          </button>
          <button 
            onClick={() => {
              // 영역별 화상통화 - 진행 중이면 참가, 없으면 새로 시작
              handleZoneVideoCallRequest();
            }} 
            className={`toolbar-btn ${activeZoneCall ? 'active' : ''}`}
            title={activeZoneCall ? '진행 중인 영역 통화 참가' : '영역 통화 시작'}
          >
            🎥 영역 통화 {activeZoneCall && `(${activeZoneCall.participants?.length || 0}명)`}
          </button>
          <button 
            onClick={() => {
              // 전체 화상통화 - 진행 중이면 참가, 없으면 새로 시작
              handleGlobalVideoCallRequest();
            }} 
            className={`toolbar-btn ${activeGlobalCall ? 'active' : ''}`}
            title={activeGlobalCall ? '진행 중인 전체 통화 참가' : '전체 통화 시작'}
          >
            📺 전체 통화 {activeGlobalCall && `(${activeGlobalCall.participants?.length || 0}명)`}
          </button>
          <button onClick={() => setShowCharacterCustomizer(true)} className="toolbar-btn">
            🎭 캐릭터 설정
          </button>
          {currentMap && user && (currentMap.creatorId === user.id || currentMap.createdBy === user.id) && (
            <>
              <button onClick={onEditMap} className="toolbar-btn">
                ✏️ 편집
              </button>
              <button onClick={onDeleteMap} className="toolbar-btn danger">
                🗑️ 삭제
              </button>
            </>
          )}
          <button onClick={onOpenSNS} className="toolbar-btn">
            💬 SNS
          </button>
          <button onClick={onOpenShop} className="toolbar-btn">
            🛒 상점
          </button>
          <button onClick={onReturnToLobby} className="toolbar-btn exit">
            🚪 나가기
          </button>
        </div>
      </div>
      
      {/* 캔버스 영역 */}
      <div className="scene-canvas-container" style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'auto',
        background: '#0a0a0a',
        position: 'relative'
      }}>
        <div 
          className="canvas-wrapper" 
          style={{
            position: 'relative',
            width: canvasSize.width + 'px',
            height: canvasSize.height + 'px',
            minWidth: canvasSize.width + 'px',
            minHeight: canvasSize.height + 'px',
            cursor: 'default'
          }}
        >
          {/* 레이어 1: 배경 */}
          <canvas 
            ref={backgroundCanvasRef}
            className="scene-canvas background-layer"
            data-layer="1"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1,
              width: canvasSize.width + 'px',
              height: canvasSize.height + 'px'
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              moveTo({ x, y });
            }}
          />
          
          {/* 레이어 2: 벽 */}
          <canvas 
            ref={wallsCanvasRef}
            className="scene-canvas walls-layer"
            data-layer="2"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 2,
              width: canvasSize.width + 'px',
              height: canvasSize.height + 'px',
              pointerEvents: 'none',
              opacity: 0
            }}
          />
          
          {/* 레이어 3: 프라이빗 영역 */}
          <canvas 
            ref={privateAreasCanvasRef}
            className="scene-canvas private-areas-layer"
            data-layer="3"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 3,
              width: canvasSize.width + 'px',
              height: canvasSize.height + 'px',
              pointerEvents: 'none',
              opacity: 0
            }}
          />
          
          {/* 레이어 4: 캐릭터 및 시작점 */}
          <canvas 
            ref={characterCanvasRef}
            className="scene-canvas character-layer"
            data-layer="4"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 4,
              width: canvasSize.width + 'px',
              height: canvasSize.height + 'px',
              pointerEvents: 'none'
            }}
          />
          
          {/* 레이어 5: 전경 */}
          <canvas 
            ref={foregroundCanvasRef}
            className="scene-canvas foreground-layer"
            data-layer="5"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 5,
              width: canvasSize.width + 'px',
              height: canvasSize.height + 'px',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>
      
      {/* 하단 정보 */}
      <div className="scene-footer">
        <div className="footer-info">
          <span style={{
            fontWeight: 'bold',
            color: currentZone.includes('프라이빗') ? '#ff9900' : '#00ff00'
          }}>
            📍 현재 위치: {currentZone}
          </span>
          <span>좌표: ({Math.round(position?.x || 0)}, {Math.round(position?.y || 0)})</span>
          <span>맵 크기: {currentMap?.size?.width || 1000} x {currentMap?.size?.height || 1000}</span>
          <span>ID: {currentMap?.id}</span>
        </div>
      </div>
      
      {/* 캐릭터 커스터마이저 모달 */}
      {showCharacterCustomizer && (
        <CharacterCustomizer
          isOpen={showCharacterCustomizer}
          onClose={() => {
            setShowCharacterCustomizer(false);
            // 캐릭터 설정이 변경되면 서버로 전송
            if (socket && currentMap && user && currentCharacter) {
              socket.emit('character-info-update', {
                mapId: currentMap.id,
                userId: user.id,
                username: user.username,
                characterName: currentCharacter?.displayName || user.username,
                appearance: currentCharacter?.appearance,
                position: position
              });
            }
          }}
          currentMapId={currentMap?.id}
        />
      )}
      
      {/* 화상통화 패널 - 퍼블릭 영역에서는 숨김 */}
      {showVideoCall && currentZone !== '퍼블릭 영역' && (
        <VideoCallPanel
          mode={videoCallMode}
          targetUser={targetUser}
          webRTC={webRTC}
          onClose={async () => {
            setShowVideoCall(false);
            setVideoCallMode(null);
            setTargetUser(null);
            
            // 전체/영역 통화인 경우 연결 해제
            if (videoCallMode === 'global' || videoCallMode === 'zone') {
              if (videoCallMode === 'global') {
                setGlobalCallRoom(null);
                setGlobalCallParticipants([]);
              } else if (videoCallMode === 'zone') {
                setZoneCallRoom(null);
              }
            }
          }}
        />
      )}
      
      {/* 사용자 목록 모달 */}
      {showUserList && (
        <div className="user-list-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>사용자 선택</h3>
              <button onClick={() => setShowUserList(false)} className="close-btn">✕</button>
            </div>
            <UserList
              onlineUsers={roomOtherUsers.length > 0 ? roomOtherUsers : (otherUsers || [])}
              onInviteUser={(userId, type) => {
                if (type === 'video-call') {
                  handleVideoCallRequest(userId);
                }
              }}
            />
          </div>
        </div>
      )}
      
      {/* 수신 화상통화 알림 */}
      {incomingCall && (
        <div className="incoming-call-notification">
          <div className="call-content">
            <div className="call-icon">
              {incomingCall.type === 'global' ? '📺' : '📹'}
            </div>
            <div className="call-info">
              <h4>
                {incomingCall.type === 'global' 
                  ? `${incomingCall.username}님의 전체 화상통화`
                  : `${incomingCall.username}님의 화상통화`}
              </h4>
              <div className="call-actions">
                <button onClick={acceptVideoCall} className="accept-btn">
                  ✅ 참가
                </button>
                <button onClick={rejectVideoCall} className="reject-btn">
                  ❌ 거절
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MetaverseSceneNew.displayName = 'MetaverseSceneNew';

export default MetaverseSceneNew;