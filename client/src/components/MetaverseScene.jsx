import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useMetaverse } from '../contexts/MetaverseContext';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeCharacterSync } from '../hooks/useRealtimeCharacterSync';
import ChatWindow from './ChatWindow';
import SNSBoard from './SNSBoard';
import NavigationBar from './NavigationBar';
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
  
  // 줌 및 패닝 상태
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // SNS/채팅 상태
  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [privateChatMessages, setPrivateChatMessages] = useState([]);
  const [snsPosts, setSnsPosts] = useState([]);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isUsersVisible, setIsUsersVisible] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState([]);
  const [chatBubbles, setChatBubbles] = useState(new Map());
  
  // 마우스 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasDraggedEnough, setHasDraggedEnough] = useState(false);

  // 커스텀 훅 사용
  const viewportRef = useRef(null);
  const sceneContainerRef = useRef(null);
  const charSync = useRealtimeCharacterSync(socket, currentMap);
  const isChatVisibleRef = useRef(false);
  const chatBubbleTimeouts = useRef(new Map());

  const handleUpdateParticipants = async (data) => {
    console.log(`👥 참가자 업데이트 처리:`, data);
    
    if (data.mapId === currentMap.id) {
      console.log(`👥 현재 맵 ${data.mapId}의 참가자:`, data.participants);
      
      if (data.participants && Array.isArray(data.participants)) {
        setRoomParticipants(data.participants);
      }
    }
  };

  const handleUserLeft = (data) => {
    console.log('사용자 나감:', data);
  };

  const handleSceneClick = (e) => {
    if (!sceneContainerRef.current) return;
    
    const rect = sceneContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomScale;
    const y = (e.clientY - rect.top) / zoomScale;
    
    if (charSync.moveCharacterTo) {
      console.log('🎯 클릭 이동: 목표 위치', { x: Math.round(x), y: Math.round(y) }, 'zoom:', zoomScale);
      charSync.moveCharacterTo({ x, y });
    }
  };

  const handleMouseDown = (e) => {
    if (isEditMode) return;
    
    // 좌클릭으로 드래그 시작
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setPanStart(panOffset);
      setHasDraggedEnough(false);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isEditMode) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (dragDistance > 5) {
      setHasDraggedEnough(true);
    }

    const newX = panStart.x + deltaX;
    const newY = panStart.y + deltaY;
    
    setPanOffset({ x: newX, y: newY });
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (!hasDraggedEnough && !isEditMode) {
      handleSceneClick(e);
    }
    
    setHasDraggedEnough(false);
  };

  // 휠 이벤트로 줌 조작
  const handleWheel = (e) => {
    if (isEditMode) return;
    
    e.preventDefault();
    
    const zoomFactor = 0.1;
    const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
    const newScale = Math.max(0.5, Math.min(3, zoomScale + delta));
    
    setZoomScale(newScale);
  };

  // 소켓 이벤트 리스너
  useEffect(() => {
    if (!socket || !currentMap) return;

    socket.on('update-participants', handleUpdateParticipants);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('update-participants', handleUpdateParticipants);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, currentMap]);

  // 채팅 메시지 수신
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data) => {
      console.log('📨 채팅 메시지 수신:', data);
      
      const newMessage = {
        id: Date.now(),
        username: data.username || 'Unknown',
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        mapId: data.mapId
      };
      
      if (data.type === 'private') {
        setPrivateChatMessages(prev => [...prev, newMessage]);
      } else {
        setGlobalChatMessages(prev => [...prev, newMessage]);
      }
      
      if (!isChatVisibleRef.current) {
        setUnreadMessageCount(prev => prev + 1);
      }

      // 채팅 풍선말 표시
      const bubbleId = `${data.username}_${Date.now()}`;
      setChatBubbles(prev => {
        const newBubbles = new Map(prev);
        newBubbles.set(bubbleId, {
          username: data.username,
          message: data.message,
          timestamp: Date.now()
        });
        return newBubbles;
      });

      // 3초 후 풍선말 제거
      const timeoutId = setTimeout(() => {
        setChatBubbles(prev => {
          const newBubbles = new Map(prev);
          newBubbles.delete(bubbleId);
          return newBubbles;
        });
      }, 3000);

      chatBubbleTimeouts.current.set(bubbleId, timeoutId);
    };

    socket.on('chat-message', handleChatMessage);

    return () => {
      socket.off('chat-message', handleChatMessage);
      // 타임아웃 정리
      chatBubbleTimeouts.current.forEach(timeout => clearTimeout(timeout));
      chatBubbleTimeouts.current.clear();
    };
  }, [socket]);

  // 배경 이미지 로딩
  useEffect(() => {
    if (currentMap?.backgroundImage || mapImageProp) {
      const img = new Image();
      img.onload = () => {
        setBackgroundLoaded(true);
        setSceneSize({
          width: img.naturalWidth || 1000,
          height: img.naturalHeight || 1000
        });
      };
      img.onerror = () => {
        setBackgroundLoaded(true);
        setSceneSize({ width: 1000, height: 1000 });
      };
      img.src = mapImageProp || currentMap.backgroundImage;
    } else {
      setBackgroundLoaded(true);
      setSceneSize({ width: 1000, height: 1000 });
    }
  }, [currentMap, mapImageProp]);

  // 채팅창 표시/숨김에 따른 읽지 않은 메시지 수 초기화
  useEffect(() => {
    isChatVisibleRef.current = isChatVisible;
    if (isChatVisible) {
      setUnreadMessageCount(0);
    }
  }, [isChatVisible]);

  // 외부에서 접근 가능한 메서드
  useImperativeHandle(ref, () => ({
    getCanvasImage: () => {
      // 스크린샷 기능이 필요한 경우 구현
      return null;
    }
  }));

  // 채팅 메시지 전송
  const handleChatSend = (message, type = 'global') => {
    if (!socket || !user || !message.trim()) return;

    const chatData = {
      username: user.username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      mapId: currentMap?.id,
      type
    };

    socket.emit('chat-message', chatData);
  };

  // SNS 뷰 관련 함수들
  const handleSwitchToSNS = () => {
    setCurrentView('sns');
  };

  const handleReturnToMetaverse = () => {
    setCurrentView('metaverse');
  };

  // 렌더링
  if (currentView === 'sns') {
    return (
      <div className="metaverse-scene">
        <SNSBoard
          posts={snsPosts}
          onReturn={handleReturnToMetaverse}
          currentMap={currentMap}
        />
      </div>
    );
  }

  return (
    <div className="metaverse-scene">
      <div className="scene-header">
        <NavigationBar
          currentMap={currentMap}
          onReturnToLobby={onReturnToLobby}
          onSwitchToSNS={handleSwitchToSNS}
          onToggleChat={() => setIsChatVisible(!isChatVisible)}
          onToggleUsers={() => setIsUsersVisible(!isUsersVisible)}
          unreadCount={unreadMessageCount}
          participantCount={roomParticipants.length}
        />
      </div>

      <div 
        className="scene-container" 
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 60px)',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <div
          ref={sceneContainerRef}
          className="scene-content"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: '0 0',
            width: `${sceneSize.width}px`,
            height: `${sceneSize.height}px`,
            position: 'relative',
            backgroundImage: (currentMap?.backgroundImage || mapImageProp) ? 
              `url(${mapImageProp || currentMap.backgroundImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#2a2a2a',
            cursor: isDragging ? 'grabbing' : 'default'
          }}
        >
          {/* 내 캐릭터 렌더링 */}
          {charSync.myPosition && (
            <div
              className="character my-character"
              style={{
                position: 'absolute',
                left: `${charSync.myPosition.x - 16}px`,
                top: `${charSync.myPosition.y - 32}px`,
                width: '32px',
                height: '32px',
                backgroundColor: '#4CAF50',
                borderRadius: '50%',
                border: '3px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                zIndex: 100
              }}
            >
              👤
            </div>
          )}

          {/* 다른 사용자 캐릭터들 렌더링 */}
          {Array.from(charSync.otherCharacters.values()).map((character) => (
            <div key={character.id}>
              <div
                className="character other-character"
                style={{
                  position: 'absolute',
                  left: `${character.position.x - 16}px`,
                  top: `${character.position.y - 32}px`,
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#2196F3',
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  zIndex: 99
                }}
              >
                👥
              </div>
              <div
                className="character-name"
                style={{
                  position: 'absolute',
                  left: `${character.position.x - 30}px`,
                  top: `${character.position.y - 45}px`,
                  fontSize: '12px',
                  color: '#fff',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  textAlign: 'center',
                  width: '60px',
                  zIndex: 101
                }}
              >
                {character.username}
              </div>
            </div>
          ))}

          {/* 채팅 풍선말 */}
          {Array.from(chatBubbles.entries()).map(([bubbleId, bubble]) => {
            const character = Array.from(charSync.otherCharacters.values())
              .find(char => char.username === bubble.username);
            
            const isMyBubble = bubble.username === user?.username;
            const position = isMyBubble ? charSync.myPosition : character?.position;
            
            if (!position) return null;

            return (
              <div
                key={bubbleId}
                className="chat-bubble"
                style={{
                  position: 'absolute',
                  left: `${position.x - 50}px`,
                  top: `${position.y - 60}px`,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  maxWidth: '100px',
                  wordWrap: 'break-word',
                  textAlign: 'center',
                  zIndex: 102,
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                {bubble.message}
              </div>
            );
          })}

          {/* 이동 경로 표시 */}
          {charSync.currentPath && charSync.currentPath.length > 1 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 50
              }}
            >
              <path
                d={`M ${charSync.currentPath[0].x} ${charSync.currentPath[0].y} L ${charSync.currentPath[1].x} ${charSync.currentPath[1].y}`}
                stroke="#FFC107"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
                opacity="0.8"
              />
              <circle
                cx={charSync.currentPath[charSync.currentPath.length - 1].x}
                cy={charSync.currentPath[charSync.currentPath.length - 1].y}
                r="6"
                fill="#FFC107"
                opacity="0.8"
              />
            </svg>
          )}
        </div>
      </div>

      {/* 채팅창 */}
      {isChatVisible && (
        <ChatWindow
          messages={globalChatMessages}
          onSendMessage={handleChatSend}
          onClose={() => setIsChatVisible(false)}
          currentUser={user}
        />
      )}

      {/* 사용자 목록 */}
      {isUsersVisible && (
        <UserList
          participants={roomParticipants}
          onClose={() => setIsUsersVisible(false)}
          currentUser={user}
        />
      )}
    </div>
  );
});

export default MetaverseScene;