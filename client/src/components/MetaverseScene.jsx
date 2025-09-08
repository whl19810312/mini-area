import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useMetaverse } from '../contexts/MetaverseContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { useLiveKit } from '../hooks/useLiveKit';
import { useRealtimeCharacterSync } from '../hooks/useRealtimeCharacterSync';
import ChatWindow from './ChatWindow';
import SNSBoard from './SNSBoard';
import NavigationBar from './NavigationBar';
import VideoSidebar from './VideoSidebar';
import DraggableVideoPanel from './DraggableVideoPanel';
import VideoOverlay from './VideoOverlay';
import UserList from './UserList';
import toast from 'react-hot-toast';
import '../styles/MetaverseScene.css';

const MetaverseScene = forwardRef(({ currentMap, mapImage: mapImageProp, characters, currentCharacter, isEditMode = false, onReturnToLobby }, ref) => {
  const { user, socket } = useAuth();
  const { updateCharacterPosition } = useMetaverse();

  // 뷰 상태 관리
  const [currentView, setCurrentView] = useState('metaverse'); // 'metaverse' | 'sns'
  
  // 메타버스 상태
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [sceneSize, setSceneSize] = useState({ width: 1000, height: 1000 });
  
  // 줌 및 패닝 상태 (공간 생성과 동일하게)
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  // WebRTC & LiveKit SFU
  const webRTC = useWebRTC(socket, user);
  const livekit = useLiveKit(user);

  // SNS/채팅/통화 상태
  const [globalChatMessages, setGlobalChatMessages] = useState([]); // 전체 채팅 메시지
  const [privateChatMessages, setPrivateChatMessages] = useState([]); // 쪽지 메시지
  const [snsPosts, setSnsPosts] = useState([]);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0); // 읽지 않은 메시지 수
  const [isUsersVisible, setIsUsersVisible] = useState(false);
  const [isCallVisible, setIsCallVisible] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState([]); // 현재 맵의 참가자 목록
  const [isVideoSidebarVisible, setIsVideoSidebarVisible] = useState(false); // 화상통화 사이드바
  const [chatBubbles, setChatBubbles] = useState(new Map()); // 사용자별 채팅 풍선말
  
  // Area state (simplified - private area logic removed)
  
  // 마우스 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasDraggedEnough, setHasDraggedEnough] = useState(false); // 드래그 임계값 체크

  // 커스텀 훅 사용
  const viewportRef = useRef(null);
  const sceneContainerRef = useRef(null);
  // 실시간 캐릭터 동기화 시스템
  const charSync = useRealtimeCharacterSync(socket, currentMap);
  const isChatVisibleRef = useRef(false); // 채팅창 상태를 ref로도 추적
  const chatBubbleTimeouts = useRef(new Map()); // 채팅 풍선말 타임아웃 관리
  
  


  const handleUpdateParticipants = async (data) => {
    console.log(`👥 참가자 업데이트 처리:`, data);
    
    if (data.mapId === currentMap.id) {
      // 참가자 정보를 로그로 출력
      console.log(`👥 현재 맵 ${data.mapId}의 참가자:`, data.participants);
      
      // 참가자 목록 업데이트
      if (data.participants && Array.isArray(data.participants)) {
        setRoomParticipants(data.participants);
      }
    }
  };

  const handleUserLeft = (data) => {
    // 사용자가 나갔을 때 WebRTC 연결 끊기
    const targetId = data.username || data.userId;
    webRTC.disconnectFromUser?.(targetId);
  };



  const handleSceneClick = (e) => {
    if (!sceneContainerRef.current) return;
    
    // 클릭 위치 계산 - 줌 스케일과 팬 오프셋 고려
    const rect = sceneContainerRef.current.getBoundingClientRect();
    
    // getBoundingClientRect는 이미 transform이 적용된 rect를 반환하므로
    // 클릭 위치를 scene 내부 좌표로 직접 변환
    const x = (e.clientX - rect.left) / zoomScale;
    const y = (e.clientY - rect.top) / zoomScale;
    
    // 경로 찾기를 사용한 클릭 이동
    if (charSync.moveCharacterTo) {
      console.log('🎯 클릭 이동: 목표 위치', { x: Math.round(x), y: Math.round(y) }, 'zoom:', zoomScale);
      charSync.moveCharacterTo({ x, y });
    }
  };

  // 마우스 오른쪽 클릭 드래그로 맵 이동 (공간 생성과 동일)
  const handleMouseDown = (e) => {
    if (isEditMode) return;
    
    // 왼쪽 클릭으로 드래그 시작 (맵 이동)
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setPanStart({ x: panOffset.x, y: panOffset.y });
      setHasDraggedEnough(false);
    }
    // 오른쪽 클릭도 패닝 가능
    else if (e.button === 2) {
      e.preventDefault();
      setIsDragging(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      setHasDraggedEnough(true); // 오른쪽 클릭은 즉시 드래그로 인식
    }
  };

  const handleMouseMove = (e) => {
    if (isEditMode || !isDragging) return;
    
    // 드래그 중 맵 이동
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // 드래그 거리가 임계값(5px)을 넘으면 실제 드래그로 인식
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (dragDistance > 5) {
      setHasDraggedEnough(true);
    }
    
    // 실제로 드래그한 경우에만 맵 이동
    if (hasDraggedEnough || dragDistance > 5) {
      const newOffset = {
        x: panStart.x + deltaX,
        y: panStart.y + deltaY
      };
      setPanOffset(newOffset);
    }
  };

  const handleMouseUp = (e) => {
    if (isEditMode) return;
    
    // UI 요소 확인
    const clickedElement = e.target;
    const isUIElement = clickedElement.closest('.chat-window') || 
                       clickedElement.closest('.chat-container') ||
                       clickedElement.closest('.chat-input-form') ||
                       clickedElement.closest('.chat-messages') ||
                       clickedElement.closest('.modal') ||
                       clickedElement.closest('.modal-content') ||
                       clickedElement.closest('button') ||
                       clickedElement.closest('input') ||
                       clickedElement.closest('textarea') ||
                       clickedElement.tagName === 'BUTTON' ||
                       clickedElement.tagName === 'INPUT' ||
                       clickedElement.tagName === 'TEXTAREA';
    
    // 왼쪽 클릭이고 충분히 드래그하지 않았다면 클릭으로 처리 (UI 요소가 아닌 경우만)
    if (e.button === 0 && isDragging && !hasDraggedEnough && !isUIElement) {
      handleSceneClick(e);
    }
    
    setIsDragging(false);
    setHasDraggedEnough(false);
  };
  
  // 마우스 휠로 줌 (공간 생성과 동일)
  const handleWheel = (e) => {
    if (isEditMode) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, zoomScale * delta));
    
    // 마우스 위치를 중심으로 줌
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // 줌 전후 마우스 위치 차이 계산
    const scaleChange = newScale / zoomScale;
    const newPanX = mouseX - (mouseX - panOffset.x) * scaleChange;
    const newPanY = mouseY - (mouseY - panOffset.y) * scaleChange;
    
    setZoomScale(newScale);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  const resetView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomScale(1);
  };

  const handleContextMenu = (e) => {
    // 오른쪽 클릭 메뉴 비활성화
    e.preventDefault();
  };

  const handleImageLoad = (e) => { setBackgroundLoaded(true); setSceneSize({ width: e.target.naturalWidth, height: e.target.naturalHeight }); };

  // WebRTC 이벤트 바인딩
  useEffect(() => {
    if (!socket || !currentMap) return;
    
    socket.on('webrtc-signal', webRTC.handleWebRTCSignal);
    
    return () => {
      socket.off('webrtc-signal', webRTC.handleWebRTCSignal);
    };
  }, [socket, currentMap, webRTC]);

  // 채팅창 상태 동기화 및 읽지 않은 메시지 초기화
  useEffect(() => {
    isChatVisibleRef.current = isChatVisible;
    if (isChatVisible) {
      setUnreadMessageCount(0); // 채팅창이 열리면 읽지 않은 메시지 수 초기화
    }
  }, [isChatVisible]);

  // 카메라 상태 모니터링 - 카메라가 켜져있으면 비디오 패널 표시
  useEffect(() => {
    if (webRTC.localStream && webRTC.isVideoCallActive) {
      console.log('📹 카메라가 활성화됨 - 비디오 패널 표시');
      setIsCallVisible(true);
    }
  }, [webRTC.localStream, webRTC.isVideoCallActive]);

  useEffect(() => {
    if (!socket || !currentMap) return;
    
    // 입실 관련 이벤트 리스너 등록
    socket.on('update-participants', (data) => {
      console.log(`👥 참가자 목록 업데이트:`, data);
      handleUpdateParticipants(data);
    });
    
    socket.on('user-left', (data) => {
      console.log(`👋 사용자 퇴장:`, data);
      handleUserLeft(data);
    });
    
    // 프라이빗 영역 관련 이벤트
    // 사용자 입장 시 자동 연결 (영역 구분 없음)
    socket.on('user-joined', async (data) => {
      console.log(`👋 사용자 입장:`, data);
      
      if (data.userId !== user.id) {
        const targetId = data.username || data.userId;
        
        console.log(`🆕 새 사용자 ${targetId}가 방에 입장`);
        
        // 화상통화가 꺼져있으면 자동으로 켜기
        if (!webRTC.isVideoCallActive && !webRTC.isCameraDisabledByUser) {
          console.log(`📹 카메라 자동 시작`);
          await webRTC.startCamera();
          setIsVideoSidebarVisible(true);
          setIsCallVisible(true);
        }
        
        // 새로운 사용자와 연결 (이미 연결되어 있는지 확인)
        if (!webRTC.remoteStreams.has(targetId)) {
          console.log(`🎬 ${targetId}와 화상통화 연결 시작`);
          setTimeout(async () => {
            await webRTC.initiateCallToUser(targetId);
          }, 1000);
        } else {
          console.log(`✅ ${targetId}는 이미 연결되어 있음`);
        }
        
        // 참가자 수 업데이트 로그
        console.log(`📊 화상통화 참가자 업데이트: ${webRTC.remoteStreams.size} → ${webRTC.remoteStreams.size + 1}명 예상`);
      }
      
    });
    
    
    // 채널 기반 화상통화 참가자 업데이트
    socket.on('channel-participants-update', async (data) => {
      console.log(`📡 채널 참가자 업데이트:`, data);
      if (data.participants && Array.isArray(data.participants)) {
        const otherUsers = data.participants.filter(p => p.userId !== user.id);
        
        if (otherUsers.length > 0) {
          // 영역 구분 없이 자동 연결
          if (!webRTC.isVideoCallActive && !webRTC.isCameraDisabledByUser) {
            await webRTC.startCamera();
            setIsVideoSidebarVisible(true);
            setIsCallVisible(true);
          }
          
          // 모든 참가자와 연결
          for (const participant of otherUsers) {
            const targetId = participant.username || participant.userId;
            if (!webRTC.remoteStreams.has(targetId)) {
              await webRTC.initiateCallToUser(targetId);
            }
          }
        }
      }
    });
    
    // user-joined 이벤트는 위에서 이미 처리됨
    
    socket.on('existing-users', (users) => {
      console.log(`📋 기존 사용자 정보 수신:`, users);
      // 기존 사용자 정보 처리
    });
    
    // 프라이빗 영역 상태 업데이트
    
    // 프라이빗 영역 사용자 변화 실시간 감지 (usePrivateAreaVideo로 이동)
    /* 기존 로직 주석 처리 - usePrivateAreaVideo 훅에서 처리
    socket.on('private-area-users-changed', async (data) => {
      // 프라이빗 영역 사용자 목록 업데이트
      if (data.users) {
        const userMap = new Map();
        data.users.forEach(user => {
          userMap.set(user.userId, user);
        });
        setPrivateAreaUsers(userMap);
      }

      console.log(`🔄 프라이빗 영역 ${data.areaId} 사용자 변화:`, {
        변화타입: data.changeType,
        사용자수: data.userCount,
        전체사용자: data.users,
        새사용자: data.newUsers,
        퇴장사용자: data.leftUsers
      });
      
      // Private area logic removed - keeping as comment for reference
      if (false) { // currentArea.type === 'private' && currentArea.id === data.areaId
        console.log(`👥 내 영역 업데이트: ${data.userCount}명`);
        
        // 1초마다 모니터링 시작 (아직 시작하지 않은 경우)
        if (!privateAreaMonitorRef.current) {
          startPrivateAreaMonitoring();
        }
        
        // 초기 진입 또는 사용자 추가된 경우
        if ((data.changeType === 'initial' || data.changeType === 'user_joined') && data.newUsers && data.newUsers.length > 0) {
          console.log(`🆕 새로운 사용자 ${data.newUsers.length}명 감지`);
          
          // 카메라가 꺼져있으면 켜기
          if (!webRTC.isVideoCallActive && !webRTC.isCameraDisabledByUser) {
            console.log(`📹 카메라 시작`);
            await webRTC.startCamera();
            setIsVideoSidebarVisible(true);
            setIsCallVisible(true);
          }
          
          // 새로 들어온 사용자와만 연결
          for (const newUser of data.newUsers) {
            if (newUser.userId !== user.id) {
              const targetId = newUser.username || newUser.userId;
              
              // 아직 연결되지 않은 사용자와 연결
              if (!webRTC.remoteStreams.has(targetId)) {
                console.log(`🎬 새 사용자 ${targetId}와 화상통화 연결 시도`);
                
                // 연결 시도
                setTimeout(() => {
                  webRTC.initiateCallToUser(targetId);
                }, 500);
              } else {
                console.log(`✅ ${targetId}는 이미 연결됨`);
              }
            }
          }
        }
        
        // 초기 상태인 경우 모든 기존 사용자와도 연결
        if (data.changeType === 'initial' && data.users) {
          console.log(`🏁 초기 진입 - 기존 사용자들과 연결`);
          
          for (const existingUser of data.users) {
            if (existingUser.userId !== user.id) {
              const targetId = existingUser.username || existingUser.userId;
              
              if (!webRTC.remoteStreams.has(targetId)) {
                console.log(`🎬 기존 사용자 ${targetId}와 화상통화 연결`);
                setTimeout(() => {
                  webRTC.initiateCallToUser(targetId);
                }, 1000);
              }
            }
          }
        }
        
        // 사용자가 나간 경우 연결 해제
        if (data.changeType === 'user_left' && data.leftUsers && data.leftUsers.length > 0) {
          console.log(`👋 ${data.leftUsers.length}명이 영역을 떠남`);
          
          for (const leftUser of data.leftUsers) {
            const targetId = leftUser.username || leftUser.userId;
            
            if (webRTC.remoteStreams.has(targetId)) {
              console.log(`🎬 떠난 사용자 ${targetId}와의 연결 해제`);
              webRTC.disconnectFromUser(targetId);
            }
          }
        }
        
        // 화상통화 참가자 수 강제 업데이트 (UI 리렌더링)
        console.log(`📊 현재 화상통화 참가자: ${webRTC.remoteStreams.size + 1}명`);
      }
    });
    */
    
    // 맵 전체의 프라이빗 영역 상태 변화
    socket.on('private-area-status-changed', (data) => {
      if (data.mapId === currentMap.id) {
        console.log(`📍 맵 ${data.mapId}의 프라이빗 영역 ${data.areaId} 상태 변화:`, {
          사용자수: data.userCount,
          변화타입: data.changeType
        });
      }
    });
    
    socket.on('chat-message', (msg) => {
      console.log(`💬 채팅 메시지 수신:`, msg);
      
      // content가 비어있는 메시지 무시
      if (!msg.content || msg.content.trim() === '') {
        console.log('빈 메시지 무시');
        return;
      }
      
      // 메시지 타입 설정
      const messageWithType = { ...msg, type: msg.userId === user.id ? 'user' : 'other' };
      
      // 메시지 타입에 따라 다른 저장소에 저장
      if (msg.type === 'global') {
        // 전체 채팅
        setGlobalChatMessages(prev => {
          if (msg.messageId && prev.some(m => m.messageId === msg.messageId)) {
            return prev;
          }
          return [...prev, messageWithType];
        });
      } else if (msg.type === 'private') {
        // 쪽지
        setPrivateChatMessages(prev => {
          if (msg.messageId && prev.some(m => m.messageId === msg.messageId)) {
            return prev;
          }
          return [...prev, messageWithType];
        });
      } else {
        // 영역 채팅 (area 또는 type이 없는 경우)
        const mapId = msg.mapId || currentMap.id;
        setChatMessagesByArea(prev => {
          const newMap = new Map(prev);
          const areaMessages = newMap.get(mapId) || [];
          
          // 중복 체크
          if (msg.messageId && areaMessages.some(m => m.messageId === msg.messageId)) {
            return prev;
          }
          
          newMap.set(mapId, [...areaMessages, messageWithType]);
          return newMap;
        });
      }
      
      // 채팅창이 닫혀있고 다른 사용자의 메시지인 경우 읽지 않은 메시지 수 증가
      if (!isChatVisibleRef.current && msg.userId !== user.id) {
        setUnreadMessageCount(prev => prev + 1);
      }
      
      // 채팅 풍선말 추가 (영역 채팅과 전체 채팅만)
      if ((msg.type === 'area' || msg.type === 'global' || !msg.type) && msg.content && msg.content.trim() !== '') {
        // 이전 타임아웃이 있으면 취소
        const existingTimeout = chatBubbleTimeouts.current.get(msg.userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        
        const bubbleTimestamp = Date.now();
        
        setChatBubbles(prev => {
          const newBubbles = new Map(prev);
          newBubbles.set(msg.userId, {
            message: msg.content,
            timestamp: bubbleTimestamp
          });
          return newBubbles;
        });
        
        // 10초 후 풍선말 제거
        const timeoutId = setTimeout(() => {
          setChatBubbles(prev => {
            const newBubbles = new Map(prev);
            const bubble = newBubbles.get(msg.userId);
            if (bubble && bubble.timestamp === bubbleTimestamp) {
              newBubbles.delete(msg.userId);
            }
            return newBubbles;
          });
          chatBubbleTimeouts.current.delete(msg.userId);
        }, 10000); // 10초로 변경
        
        chatBubbleTimeouts.current.set(msg.userId, timeoutId);
      }
    });
    
    socket.on('auto-rejoin', (data) => {
      console.log('🔄 자동 재입장 처리:', data);
      // 이미 올바른 맵에 있다면 위치만 업데이트
      if (data.mapId === currentMap.id) {
        charSync.setMyPosition(data.position);
        charSync.setMyDirection(data.direction);
      }
    });
    
    // 에러 핸들러 추가
    socket.on('error', (error) => {
      console.error('🚨 서버 에러:', error);
      if (error.message) {
        alert(`오류: ${error.message}`);
      }
    });
    
    // 프라이빗 영역 모니터링 함수 (usePrivateAreaVideo로 이동)
    /* 기존 모니터링 로직 주석 처리
    const startPrivateAreaMonitoring = () => {
      console.log('🔍 프라이빗 영역 사용자 모니터링 시작');
      
      // 이전 상태를 저장할 변수
      let previousUsers = new Set(privateAreaUsers.keys());
      
      privateAreaMonitorRef.current = setInterval(async () => {
        const currentUsers = new Set(privateAreaUsers.keys());
        
        // 사용자 변화 감지
        const newUsers = Array.from(currentUsers).filter(userId => !previousUsers.has(userId));
        const leftUsers = Array.from(previousUsers).filter(userId => !currentUsers.has(userId));
        
        // 변화가 있는 경우
        if (newUsers.length > 0 || leftUsers.length > 0) {
          console.log(`🔄 사용자 변화 감지:`, {
            새사용자: newUsers,
            퇴장사용자: leftUsers,
            현재사용자수: currentUsers.size
          });
          
          // 새 사용자와 화상통화 연결
          for (const userId of newUsers) {
            if (userId !== user.id) {
              const userInfo = privateAreaUsers.get(userId);
              const targetId = userInfo?.username || userId;
              
              // WebRTC 연결 상태 확인
              if (!webRTC.remoteStreams.has(targetId)) {
                console.log(`🎬 모니터링: ${targetId}와 화상통화 재연결 시도`);
                
                // 카메라가 꺼져있으면 켜기
                if (!webRTC.isVideoCallActive && !webRTC.isCameraDisabledByUser) {
                  await webRTC.startCamera();
                  setIsVideoSidebarVisible(true);
                  setIsCallVisible(true);
                }
                
                // 연결 시도
                setTimeout(() => {
                  webRTC.initiateCallToUser(targetId);
                }, Math.random() * 500); // 랜덤 지연으로 동시 연결 방지
              }
            }
          }
          
          // 떠난 사용자와의 연결 해제
          for (const userId of leftUsers) {
            const userInfo = privateAreaUsers.get(userId);
            const targetId = userInfo?.username || userId;
            
            if (webRTC.remoteStreams.has(targetId)) {
              console.log(`👋 모니터링: ${targetId}와의 연결 해제`);
              webRTC.disconnectFromUser(targetId);
            }
          }
          
          // 현재 상태를 이전 상태로 저장
          previousUsers = currentUsers;
        }
        
        // 기존 연결 상태 확인 및 재연결
        for (const [userId, userInfo] of privateAreaUsers.entries()) {
          if (userId !== user.id) {
            const targetId = userInfo.username || userId;
            
            // 연결이 끊어진 경우 재연결
            const connectionState = webRTC.connectionStates?.current?.get(targetId);
            if (connectionState === 'failed' || connectionState === 'disconnected') {
              console.log(`🔄 연결 복구 필요: ${targetId} (상태: ${connectionState})`);
              
              // 기존 연결 정리
              webRTC.disconnectFromUser(targetId);
              
              // 재연결 시도
              setTimeout(() => {
                console.log(`🔄 재연결 시도: ${targetId}`);
                webRTC.initiateCallToUser(targetId);
              }, 1000);
            }
          }
        }
      }, 1000); // 1초마다 확인
    };
    */
    
    // 맵 입장 시 현재 캐릭터 위치 정보도 함께 전송
    const joinData = {
      mapId: currentMap.id,
      characterId: currentCharacter?.id,
      userId: user?.id,
      username: user?.username,
      position: charSync.myPosition || { x: 200, y: 200 }, // 현재 위치 또는 기본 위치
      characterInfo: currentCharacter
    };
    console.log(`🏠 맵 입장 요청:`, joinData);
    socket.emit('join-map', joinData);
    
    // 방 입장 시 자동으로 화상채팅 시작
    console.log('🎬 방 입장 - 화상채팅 자동 시작');
    setTimeout(async () => {
      try {
        await webRTC.startCamera();
        console.log('🎬 카메라 시작 완료');
        setIsVideoSidebarVisible(true);
        setIsCallVisible(true);
        
        // 현재 방의 모든 사용자와 연결
        if (roomParticipants.length > 0) {
          const otherUsers = roomParticipants.filter(p => p.userId !== user.id);
          console.log(`🎬 방의 다른 사용자들과 연결 시작: ${otherUsers.length}명`);
          
          for (const participant of otherUsers) {
            const targetId = participant.username || participant.userId;
            try {
              await webRTC.initiateCallToUser(targetId);
              console.log(`✅ ${targetId}와 연결 성공`);
            } catch (err) {
              console.error(`❌ ${targetId}와 연결 실패:`, err);
            }
          }
        } else {
          console.log('🎬 방에 혼자 있음 - 본인 화면만 표시');
        }
      } catch (error) {
        console.error('🎬 화상채팅 시작 실패:', error);
      }
    }, 1000); // 1초 지연 후 시작
    
    return () => { 
      console.log(`🏠 맵 퇴장 처리`);
      socket.off('update-participants'); 
      socket.off('user-left'); 
      socket.off('user-joined-private-area');
      socket.off('user-left-private-area');
      socket.off('private-area-participants');
      socket.off('channel-participants-update');
      socket.off('private-areas-status');
      // socket.off('private-area-users-changed'); // usePrivateAreaVideo로 이동
      socket.off('private-area-status-changed');
      socket.off('user-joined');
      socket.off('existing-users');
      socket.off('chat-message'); 
      socket.off('auto-rejoin');
      socket.off('error');
      socket.emit('leave-map');
      
      // 모니터링 중지 (usePrivateAreaVideo로 이동)
      // if (privateAreaMonitorRef.current) {
      //   clearInterval(privateAreaMonitorRef.current);
      //   privateAreaMonitorRef.current = null;
      // }
      
      // 모든 채팅 풍선말 타임아웃 정리
      chatBubbleTimeouts.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      chatBubbleTimeouts.current.clear();
    };
  }, [socket, currentMap, currentCharacter, user.id, charSync.myPosition]);

  // 비디오 통화 제거: 연결 시도 로직 제거

  // 영역 변화 감지 - 프라이빗 영역 나가면 모니터링 중지 (usePrivateAreaVideo로 이동)
  /* 
  useEffect(() => {
    if (currentArea.type !== 'private' && privateAreaMonitorRef.current) {
      console.log('🛑 프라이빗 영역을 나감 - 모니터링 중지');
      clearInterval(privateAreaMonitorRef.current);
      privateAreaMonitorRef.current = null;
      
      // 프라이빗 영역 사용자 목록 초기화
      setPrivateAreaUsers(new Map());
    }
  }, [currentArea]);
  */

  useEffect(() => { if (currentMap?.size?.width && currentMap?.size?.height) setSceneSize({ width: currentMap.size.width, height: currentMap.size.height }); }, [currentMap?.size?.width, currentMap?.size?.height]);

  useImperativeHandle(ref, () => ({ leaveMapAndReturnToLobby: (mapId) => { if (socket && mapId) { socket.emit('leave-map'); } } }), [socket]);

  // 위치 변경 관련 useEffect (private area checking removed)

  // 줌과 패닝이 적용되어 있으므로 자동 스크롤 필요 없음

  // 전역 마우스 이벤트 처리 (뷰포트 밖으로 나갔을 때 드래그 해제)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // 키보드 이동 및 줌 단축키
  useEffect(() => {
    const handleKeyPress = (e) => {
      // 입력 필드에 포커스가 있으면 무시
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // 키보드 이동
      const moveSpeed = 10;
      let newPos = { ...charSync.myPosition };
      let newDirection = charSync.myDirection;
      let moved = false;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newPos.y = Math.max(0, newPos.y - moveSpeed);
          newDirection = 'up';
          moved = true;
          break;
        case 'ArrowDown':
          e.preventDefault();
          newPos.y = Math.min(sceneSize.height - 20, newPos.y + moveSpeed);
          newDirection = 'down';
          moved = true;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newPos.x = Math.max(0, newPos.x - moveSpeed);
          newDirection = 'left';
          moved = true;
          break;
        case 'ArrowRight':
          e.preventDefault();
          newPos.x = Math.min(sceneSize.width - 20, newPos.x + moveSpeed);
          newDirection = 'right';
          moved = true;
          break;
      }
      
      if (moved) {
        charSync.setMyPosition(newPos);
        charSync.setMyDirection(newDirection);
      }
      
      // 줌 단축키
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const newScale = Math.min(5, zoomScale * 1.2);
        setZoomScale(newScale);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const newScale = Math.max(0.1, zoomScale * 0.8);
        setZoomScale(newScale);
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [zoomScale, charSync, sceneSize]);

  if (!currentMap) {
    return (
      <div className="metaverse-container metaverse-lobby-message">
        <h2>맵이 선택되지 않았습니다.</h2>
        <p>로비로 돌아가서 맵을 선택해주세요.</p>
        <button onClick={onReturnToLobby}>로비로 돌아가기</button>
      </div>
    );
  }

  // CharacterDOM helpers (from previous edits)
  const getCharacterParts = (character) => { 
    const a = (character && character.appearance) || {}; 
    const head = a.head || '😊'; 
    const body = a.body || '👕'; 
    const arms = a.arms || a.hands || '💪'; 
    const legs = a.legs || a.feet || '👖'; 
    return { head, body, arms, legs }; 
  };
  
  const TorsoRow = ({ body, arms, direction }) => ( 
    <div style={{ position: 'relative', display: 'inline-block', textAlign: 'center' }}>
      <span style={{ fontSize: 10.5 }}>{body}</span>
      {direction === 'left' && (
        <span style={{ position: 'absolute', right: '100%', marginRight: 3, top: 0, fontSize: 10.5 }}>{arms}</span>
      )}
      {direction === 'right' && (
        <span style={{ position: 'absolute', left: '100%', marginLeft: 3, top: 0, fontSize: 10.5 }}>{arms}</span>
      )}
    </div> 
  );
  
  const CharacterDOM = ({ info, isCurrent, chatBubble, style = {} }) => { 
    const pos = info.position || { x: 0, y: 0 }; 
    const direction = info.direction || 'down'; 
    const parts = getCharacterParts(info);
    
    
    return (
      <div 
        className={`dom-character ${isCurrent ? 'current' : ''}`} 
        style={{ 
          position: 'absolute', 
          left: `${pos.x}px`, 
          top: `${pos.y}px`, 
          transform: 'translate(-50%, -50%)', 
          zIndex: 1, 
          userSelect: 'none', 
          pointerEvents: 'none',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '2px',
          border: isCurrent ? '1px solid #4CAF50' : '1px solid rgba(255, 255, 255, 0.3)',
          transition: 'all 0.15s ease-out',
          ...style
        }}
      >
        {/* 채팅 풍선말 */}
        {chatBubble && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '10px',
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#333',
            padding: '8px 12px',
            borderRadius: '15px',
            fontSize: '13px',
            maxWidth: '200px',
            wordWrap: 'break-word',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            whiteSpace: 'pre-wrap',
            animation: 'fadeIn 0.3s ease-in',
            zIndex: 10
          }}>
            {chatBubble.message}
            {/* 말풍선 꼬리 */}
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid rgba(255, 255, 255, 0.95)'
            }} />
          </div>
        )}
        <div style={{ textAlign: 'center', lineHeight: '1.05' }}>
          <div style={{ fontSize: 10.5, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>{parts.head}</div>
          <TorsoRow body={parts.body} arms={parts.arms} direction={direction} />
          <div style={{ fontSize: 10.5, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>{parts.legs}</div>
        </div>
        {(info.name || info.username) && (
          <div style={{ 
            fontSize: 12, 
            color: isCurrent ? '#4CAF50' : '#2196F3', 
            textAlign: 'center', 
            marginTop: 6,
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}>
            {info.name || info.username}
          </div>
        )}
        {isCurrent && (
          <div style={{ 
            position: 'absolute', 
            left: '50%', 
            top: '100%', 
            transform: 'translate(-50%, 4px)', 
            width: '20px', 
            height: '4px', 
            borderRadius: '2px', 
            background: '#4CAF50',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }} 
          />
        )}
      </div> 
    ); 
  };

  // 통화 오버레이 컴포넌트들
  const RemoteVideo = ({ remoteStreams, targetUserId }) => {
    const videoRef = useRef(null);
    const playPromiseRef = useRef(null);
    const currentStreamRef = useRef(null);
    
    useEffect(() => {
      // targetUserId로 정확히 찾기
      let stream = remoteStreams.get(targetUserId);
      
      // 찾지 못했다면 첫 번째 스트림 사용
      if (!stream && remoteStreams.size > 0) {
        stream = Array.from(remoteStreams.values())[0];
      }
      
      // 이미 같은 스트림이 설정되어 있으면 무시
      if (currentStreamRef.current === stream) {
        return;
      }
      
      currentStreamRef.current = stream;
      
      const handleVideoStream = async () => {
        if (!videoRef.current) return;
        
        const video = videoRef.current;
        
        // 이전 play promise가 있으면 기다림
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch (e) {
            // 이전 play가 취소되어도 무시
          }
        }
        
        // 스트림이 이미 설정되어 있고 같은 스트림이면 변경하지 않음
        if (video.srcObject === stream) {
          return;
        }
        
        // 이벤트 리스너 추가
        video.onloadedmetadata = () => {
          // Video metadata loaded
        };
        
        video.oncanplay = () => {
          // Video can play
        };
        
        video.onplaying = () => {
          // Video playing
        };
        
        video.onerror = (error) => {
          console.error(`🎥 비디오 오류:`, error);
        };
        
        // 기존 재생 중지
        video.pause();
        video.srcObject = null;
        
        // 새 스트림 설정
        if (stream) {
          video.srcObject = stream;
          video.muted = false;
          
          // play를 promise로 저장
          playPromiseRef.current = video.play();
          
          try {
            await playPromiseRef.current;
            // Video playback started
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error(`🎥 비디오 재생 실패:`, error);
            }
          } finally {
            playPromiseRef.current = null;
          }
        } else {
          // No stream, stopping video
        }
      };
      
      handleVideoStream();
      
      // Cleanup
      return () => {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        }
        playPromiseRef.current = null;
        currentStreamRef.current = null;
      };
    }, [remoteStreams, targetUserId]);
    return (
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          zIndex: 4,
          backgroundColor: '#000'
        }} 
      />
    );
  };

  const LocalPiP = ({ localStream }) => {
    const videoRef = useRef(null);
    const playPromiseRef = useRef(null);
    const currentStreamRef = useRef(null);
    
    useEffect(() => {
      // 이미 같은 스트림이 설정되어 있으면 무시
      if (currentStreamRef.current === localStream) {
        return;
      }
      
      currentStreamRef.current = localStream;
      
      const handleVideoStream = async () => {
        if (!videoRef.current) return;
        
        const video = videoRef.current;
        
        // 이전 play promise가 있으면 기다림
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch (e) {
            // 이전 play가 취소되어도 무시
          }
        }
        
        // 스트림이 이미 설정되어 있고 같은 스트림이면 변경하지 않음
        if (video.srcObject === localStream) {
          return;
        }
        
        // 이벤트 리스너 추가
        video.onloadedmetadata = () => {
          // Local video metadata loaded
        };
        
        video.oncanplay = () => {
          // Local video can play
        };
        
        video.onplaying = () => {
          // Local video playing
        };
        
        // 기존 재생 중지
        video.pause();
        video.srcObject = null;
        
        // 새 스트림 설정
        if (localStream) {
          video.srcObject = localStream;
          video.muted = true;
          
          // play를 promise로 저장
          playPromiseRef.current = video.play();
          
          try {
            await playPromiseRef.current;
            // Local video playback started
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error(`🎥 로컬 비디오 재생 실패:`, error);
            }
          } finally {
            playPromiseRef.current = null;
          }
        }
      };
      
      handleVideoStream();
      
      // Cleanup
      return () => {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        }
        playPromiseRef.current = null;
        currentStreamRef.current = null;
      };
    }, [localStream]);
    return (
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ 
          position: 'absolute', 
          right: 20, 
          bottom: 80, 
          width: 200, 
          height: 150, 
          objectFit: 'cover', 
          borderRadius: 12, 
          border: '3px solid rgba(255,255,255,0.6)', 
          zIndex: 5, 
          pointerEvents: 'auto', 
          background: '#000',
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)'
        }} 
      />
    );
  };

  const GroupGrid = ({ remoteStreams }) => {
    const containerRef = useRef(null);
    // Render simple grid of all remote streams
    const entries = Array.from(remoteStreams.entries());
    return (
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, display: 'grid', gap: 8, padding: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', zIndex: 3, pointerEvents: 'none' }}>
        {entries.map(([uid, stream]) => (
          <StreamTile key={uid} stream={stream} />
        ))}
      </div>
    );
  };

  const StreamTile = ({ stream }) => {
    const ref = useRef(null);
    useEffect(() => {
      if (ref.current) {
        ref.current.srcObject = stream || null;
        if (stream) {
          ref.current.muted = false;
          ref.current.play?.().catch(() => {});
        }
      }
    }, [stream]);
    return <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)' }} />;
  };

  const LiveKitTile = ({ track }) => {
    const ref = useRef(null);
    useEffect(() => {
      if (!track || !track.track) return;
      // livekit-client Track publication -> mediaStreamTrack via attach()
      try {
        track.track.attach(ref.current);
      } catch {}
      return () => {
        try { track.track.detach(ref.current); } catch {}
      };
    }, [track]);
    return <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)' }} />;
  };

  return (
    <div className="metaverse-container">
      <NavigationBar 
        currentView={currentView}
        onViewChange={setCurrentView}
        currentArea={{ type: 'public', name: '퍼블릭 영역' }}
        onReturnToLobby={onReturnToLobby}
        roomName={currentMap?.name}
        onToggleGroupCall={() => {
          const roomName = `map-${currentMap?.id || 'default'}`;
          if (livekit?.connected) {
            livekit.leave();
          } else {
            livekit.join(roomName).catch(() => {});
          }
        }}
        groupCallActive={!!livekit?.connected}
        onOpenUserList={() => setIsUsersVisible(v => !v)}
      />
      
      {/* 줌/패닝 컨트롤 UI - 게임 컨트롤러 스타일 */}
      {currentView === 'metaverse' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 1000,
          alignItems: 'center'
        }}>
          {/* 방향 컨트롤 패드 - 게임 컨트롤러 스타일 */}
          <div style={{
            position: 'relative',
            width: '90px',
            height: '90px',
            marginBottom: '10px'
          }}>
            {/* 상 버튼 */}
            <button
              onClick={() => setPanOffset(prev => ({ ...prev, y: prev.y + 50 }))}
              style={{
                position: 'absolute',
                top: '0',
                left: '30px',
                width: '30px',
                height: '30px',
                borderRadius: '5px 5px 0 0',
                border: 'none',
                background: 'rgba(52, 152, 219, 1)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(5px)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(41, 128, 185, 1)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(52, 152, 219, 1)'}
              title="위로 이동"
            >
              ▲
            </button>
            
            {/* 좌 버튼 */}
            <button
              onClick={() => setPanOffset(prev => ({ ...prev, x: prev.x + 50 }))}
              style={{
                position: 'absolute',
                top: '30px',
                left: '0',
                width: '30px',
                height: '30px',
                borderRadius: '5px 0 0 5px',
                border: 'none',
                background: 'rgba(52, 152, 219, 1)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(5px)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(41, 128, 185, 1)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(52, 152, 219, 1)'}
              title="왼쪽으로 이동"
            >
              ◀
            </button>
            
            {/* 중앙 */}
            <div style={{
              position: 'absolute',
              top: '30px',
              left: '30px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              ✦
            </div>
            
            {/* 우 버튼 */}
            <button
              onClick={() => setPanOffset(prev => ({ ...prev, x: prev.x - 50 }))}
              style={{
                position: 'absolute',
                top: '30px',
                right: '0',
                width: '30px',
                height: '30px',
                borderRadius: '0 5px 5px 0',
                border: 'none',
                background: 'rgba(52, 152, 219, 1)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(5px)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(41, 128, 185, 1)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(52, 152, 219, 1)'}
              title="오른쪽으로 이동"
            >
              ▶
            </button>
            
            {/* 하 버튼 */}
            <button
              onClick={() => setPanOffset(prev => ({ ...prev, y: prev.y - 50 }))}
              style={{
                position: 'absolute',
                bottom: '0',
                left: '30px',
                width: '30px',
                height: '30px',
                borderRadius: '0 0 5px 5px',
                border: 'none',
                background: 'rgba(52, 152, 219, 1)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(5px)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(41, 128, 185, 1)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(52, 152, 219, 1)'}
              title="아래로 이동"
            >
              ▼
            </button>
          </div>
        </div>
      )}
      {currentView === 'metaverse' && (
        <div 
          ref={viewportRef} 
          style={{ 
            position: 'relative', 
            width: '100vw', 
            height: 'calc(100vh - 60px)', 
            overflow: 'hidden',  // auto에서 hidden으로 변경
            cursor: isDragging ? 'grabbing' : 'default',
            userSelect: isDragging ? 'none' : 'auto'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
        >
          <div 
            className="metaverse-scene" 
            ref={sceneContainerRef} 
            style={{ 
              cursor: isEditMode ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'), 
              position: 'absolute',  // relative에서 absolute로 변경
              width: `${sceneSize.width}px`, 
              height: `${sceneSize.height}px`, 
              background: '#2c3e50',
              userSelect: isDragging ? 'none' : 'auto',
              // 줌과 패닝 적용 (공간 생성과 동일)
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
              transformOrigin: '0 0'
            }}
          >
            {mapImageProp && (<img src={mapImageProp} onLoad={handleImageLoad} onError={() => setBackgroundLoaded(false)} alt="Map Background" style={{ position: 'absolute', top: 0, left: 0, width: `${sceneSize.width}px`, height: `${sceneSize.height}px`, objectFit: 'fill', zIndex: 0, userSelect: 'none', pointerEvents: 'none' }} />)}
            {/* 이동 경로 표시 - 벽 충돌 회피 경로 */}
            {charSync.currentPath && charSync.currentPath.length > 0 && (
              <svg
                width={sceneSize.width}
                height={sceneSize.height}
                style={{ position: 'absolute', left: 0, top: 0, zIndex: 0.5, pointerEvents: 'none' }}
              >
                {/* 경로를 연결하는 선들 */}
                {charSync.currentPath.map((point, index) => {
                  if (index === 0) {
                    // 첫 점은 현재 위치에서 연결
                    return (
                      <line
                        key={`path-${index}`}
                        x1={charSync.myPosition.x}
                        y1={charSync.myPosition.y}
                        x2={point.x}
                        y2={point.y}
                        stroke="#00FF00"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    );
                  } else {
                    // 이전 점에서 현재 점으로 연결
                    const prevPoint = charSync.currentPath[index - 1];
                    return (
                      <line
                        key={`path-${index}`}
                        x1={prevPoint.x}
                        y1={prevPoint.y}
                        x2={point.x}
                        y2={point.y}
                        stroke="#00FF00"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    );
                  }
                })}
                {/* 경로 상의 각 웨이포인트 표시 */}
                {charSync.currentPath.map((point, index) => (
                  <circle
                    key={`waypoint-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill="#00FF00"
                    opacity="0.8"
                  />
                ))}
                {/* 최종 목적지 표시 */}
                {charSync.currentPath.length > 0 && (
                  <circle
                    cx={charSync.currentPath[charSync.currentPath.length - 1].x}
                    cy={charSync.currentPath[charSync.currentPath.length - 1].y}
                    r="8"
                    fill="#FF0000"
                    opacity="0.8"
                  >
                    <animate attributeName="r" 
                      values="8;12;8" 
                      dur="1s" 
                      repeatCount="indefinite" />
                  </circle>
                )}
              </svg>
            )}
            {/* 실시간 캐릭터 렌더링 */}
            {/* 현재 사용자 캐릭터 */}
            {currentCharacter ? (
              <CharacterDOM 
                info={{ 
                  ...currentCharacter, 
                  name: currentCharacter.name, 
                  position: charSync.myPosition, 
                  direction: charSync.myDirection 
                }} 
                isCurrent
                chatBubble={chatBubbles.get(user.id)}
              />
            ) : (
              // 캐릭터가 없을 때 기본 캐릭터 표시
              <CharacterDOM 
                info={{ 
                  name: user?.username || '사용자',
                  appearance: {
                    head: '😊',
                    body: '👕',
                    arms: '💪',
                    legs: '👖'
                  },
                  position: charSync.myPosition, 
                  direction: charSync.myDirection 
                }} 
                isCurrent
                chatBubble={chatBubbles.get(user.id)}
              />
            )}
            {/* 다른 사용자들의 실시간 캐릭터 */}
            {Array.from(charSync.otherCharacters.values()).map((character) => (
              <CharacterDOM 
                key={`char-${character.id}`} 
                info={{ 
                  username: character.username, 
                  appearance: character.characterInfo?.appearance || {
                    head: '😊',
                    body: '👕',
                    arms: '💪',
                    legs: '👖'
                  },
                  position: character.position, 
                  direction: character.direction,
                  isMoving: character.isMoving
                }}
                chatBubble={chatBubbles.get(character.id)}
              />
            ))}
            {mapImageProp && !backgroundLoaded && (<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0, 0, 0, 0.8)', color: 'white', padding: '20px', borderRadius: '10px', fontSize: '16px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>배경 이미지 로딩 중...</div>)}

            {/* 방 전체 카메라 버튼 (우측 상단) - LiveKit SFU */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const roomName = `map-${currentMap?.id || 'default'}`;
                if (livekit.connected) {
                  livekit.leave();
                } else {
                  livekit.join(roomName).catch(() => {});
                }
              }}
              title="방 전체 화상통화"
              style={{ position: 'absolute', right: 20, top: 20, zIndex: 4, padding: '10px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer' }}
            >
              {livekit.connected ? '통화 종료' : '카메라'}
            </button>

            {/* 사용자 리스트 버튼 (우측 상단) */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsUsersVisible(v => !v); }}
              style={{ position: 'absolute', right: 20, top: 20, zIndex: 4, padding: '10px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer' }}
            >
              {isUsersVisible ? '사용자 숨기기' : '사용자 목록'}
            </button>

            {/* 사용자 리스트 패널 */}
            {isUsersVisible && (
              <div style={{ position: 'absolute', right: 20, top: 60, zIndex: 4, width: 240, maxHeight: 320, overflow: 'auto', background: 'rgba(0,0,0,0.55)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: 10 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>입실 사용자 ({charSync.otherCharacters.size}명)</div>
                {Array.from(charSync.otherCharacters.values()).map(u => (
                  <div key={u.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>{u.username}</span>
                      <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                        위치: ({Math.round(u.position.x)}, {Math.round(u.position.y)})
                      </span>
                    </div>
                  </div>
                ))}
                {charSync.otherCharacters.size === 0 && <div style={{ opacity: 0.8, padding: 8 }}>다른 입실 사용자가 없습니다</div>}
              </div>
            )}


            {/* 1:1 통화는 VideoSidebar에서 처리 */}

            {/* LiveKit SFU 그룹 통화 오버레이 */}
            {livekit.connected && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', display: 'grid', gap: 8, padding: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                {livekit.tracks.map((t, idx) => (
                  <LiveKitTile key={idx} track={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 채팅 토글 버튼 (좌측 하단 - 화면에 고정) */}
      {currentView === 'metaverse' && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIsChatVisible(v => !v); }}
            style={{ 
              position: 'fixed', 
              left: 20, 
              bottom: 20, 
              zIndex: 1001, 
              padding: '10px 14px', 
              borderRadius: 20, 
              border: '1px solid rgba(255,255,255,0.3)', 
              background: 'rgba(0,0,0,0.35)', 
              color: '#fff', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isChatVisible ? '채팅 숨기기' : '채팅 열기'}
            {/* 읽지 않은 메시지 수 표시 */}
            {!isChatVisible && unreadMessageCount > 0 && (
              <span style={{
                background: '#FFD700',
                color: '#000',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '12px',
                fontWeight: 'bold',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </span>
            )}
          </button>

          {/* 현재 영역 표시 (화면 하단 중앙) */}
          <div style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '8px 16px',
            borderRadius: 20,
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🌍</span>
            <span>퍼블릭 영역</span>
            {currentMap && (
              <>
                <span>•</span>
                <span>{currentMap.name}</span>
              </>
            )}
          </div>

          {/* 채널 기반 채팅창 (화면에 고정) */}
          <ChatWindow
            currentArea={{ type: 'public', name: '퍼블릭 영역', mapName: currentMap.name }}
            isVisible={isChatVisible}
            messages={[
              // 전체 채팅
              ...globalChatMessages,
              // 쪽지
              ...privateChatMessages
            ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
            onlineUsers={roomParticipants
              .filter(p => p.userId !== user.id) // 자기 자신 제외
              .map(p => ({
                userId: p.userId,
                username: p.username
              }))}
            onSendMessage={(text, chatMode, targetUserId) => {
              if (!socket) {
                console.error('Socket not available');
                return;
              }
              console.log('Sending message:', { text, chatMode, targetUserId });
              socket.emit('chat-message', text, chatMode, targetUserId);
            }}
          />
        </>
      )}
      {currentView === 'sns' && (<SNSBoard posts={snsPosts} onPostCreate={(post) => setSnsPosts(prev => [post, ...prev])} onPostLike={() => {}} onPostComment={() => {}} />)}
      
      {/* 화상통화 오버레이 (최상위 레이어) */}
      <VideoOverlay
        localStream={webRTC.localStream}
        remoteStreams={webRTC.remoteStreams}
        isVisible={isVideoSidebarVisible || isCallVisible}
        currentArea={{ type: 'public', name: '퍼블릭 영역' }}
        isScreenSharing={webRTC.isScreenSharing}
        onEndCall={() => {
          // 로컬 통화 종료
          webRTC.endCall();
          setIsVideoSidebarVisible(false);
          setIsCallVisible(false);
        }}
        onToggleMicrophone={() => webRTC.toggleMicrophone()}
        onToggleCamera={() => webRTC.toggleCamera()}
        onToggleScreenShare={() => webRTC.toggleScreenShare()}
      />
    </div>
  );
});

export default MetaverseScene;
