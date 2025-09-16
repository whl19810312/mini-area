import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useMetaverse } from '../contexts/MetaverseContext';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeCharacterSync } from '../hooks/useRealtimeCharacterSync';
import { getAreaTypeAtPoint, getNametagBackgroundColor } from '../utils/privateAreaUtils';
import ChatWindow from './ChatWindow';
import SNSBoard from './SNSBoard';
import NavigationBar from './NavigationBar';
import UserList from './UserList';
import toast from 'react-hot-toast';
import '../styles/MetaverseScene.css';

const MetaverseScene = forwardRef(({ currentMap, mapImage: mapImageProp, characters, currentCharacter, isEditMode = false, onReturnToLobby }, ref) => {
  const { user, socket } = useAuth();
  const { updateCharacterPosition, createEmojiCharacter, createOrUpdateCharacter, selectCharacter } = useMetaverse();

  // 뷰 상태 관리
  const [currentView, setCurrentView] = useState('metaverse'); // 'metaverse' | 'sns'
  
  // 메타버스 상태
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [sceneSize, setSceneSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  
  // 줌 및 패닝 상태
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 100, y: 100 });

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
  const charSync = useRealtimeCharacterSync(socket, currentMap, currentCharacter);
  const isChatVisibleRef = useRef(false);
  const chatBubbleTimeouts = useRef(new Map());

  // 디버깅: 내 위치 로그
  useEffect(() => {
    if (charSync.myPosition) {
      console.log('👤 내 캐릭터 위치:', charSync.myPosition);
    }
  }, [charSync.myPosition]);
  
  // 디버깅: 현재 캐릭터 데이터 확인 및 이모지 캐릭터 자동 생성
  useEffect(() => {
    console.log('🎭 현재 선택된 캐릭터:', currentCharacter);
    if (currentCharacter) {
      console.log('📊 캐릭터 상세 정보:', {
        id: currentCharacter.id,
        name: currentCharacter.name,
        hasImages: !!currentCharacter.images,
        hasAppearance: !!currentCharacter.appearance,
        images: currentCharacter.images,
        appearance: currentCharacter.appearance
      });
    }
    
    if (currentCharacter?.images) {
      console.log('🖼️ 캐릭터 이미지 데이터:', currentCharacter.images);
    } else if (currentCharacter?.appearance) {
      console.log('🎨 캐릭터 appearance 데이터:', currentCharacter.appearance);
      console.log('✅ 이모지 기반 캐릭터로 렌더링됩니다');
    } else {
      console.log('❌ 캐릭터에 이미지/appearance 데이터가 없음');
      
      // 캐릭터가 있지만 이미지와 appearance가 모두 없으면 기존 설정 유지하며 업그레이드
      if (currentCharacter && !currentCharacter.images && !currentCharacter.appearance && user) {
        console.log('🔄 기존 설정 유지하며 캐릭터 업그레이드 시도...');
        createOrUpdateCharacter(currentCharacter.name || user.username).then(newCharacter => {
          if (newCharacter) {
            console.log('✅ 캐릭터 업그레이드 완료:', newCharacter);
            selectCharacter(newCharacter);
          }
        }).catch(error => {
          console.error('❌ 캐릭터 업그레이드 실패:', error);
        });
      }
    }
  }, [currentCharacter, user, createOrUpdateCharacter, selectCharacter]);
  
  // 디버깅: 다른 캐릭터들 위치 로그
  useEffect(() => {
    if (Object.keys(charSync.otherCharacters).length > 0) {
      console.log('👥 다른 캐릭터들 위치:', Object.values(charSync.otherCharacters).map(char => ({
        username: char.username,
        position: char.position
      })));
    }
  }, [charSync.otherCharacters]);

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
    if (dragDistance > 20) { // 임계값을 5에서 20으로 증가
      setHasDraggedEnough(true);
    }

    const newX = panStart.x + deltaX;
    const newY = panStart.y + deltaY;
    
    setPanOffset({ x: newX, y: newY });
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;
    
    console.log('🖱️ 마우스 업:', {
      hasDraggedEnough,
      isEditMode,
      willTriggerClick: !hasDraggedEnough && !isEditMode
    });
    
    setIsDragging(false);
    
    if (!hasDraggedEnough && !isEditMode) {
      console.log('✅ 클릭 이벤트 실행');
      handleSceneClick(e);
    } else {
      console.log('❌ 클릭 이벤트 무시됨 - 드래그 또는 편집 모드');
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
        setSceneSize({ width: window.innerWidth, height: window.innerHeight });
      };
      img.src = mapImageProp || currentMap.backgroundImage;
    } else {
      setBackgroundLoaded(true);
      setSceneSize({ width: window.innerWidth, height: window.innerHeight });
    }
  }, [currentMap, mapImageProp]);

  // 창 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setSceneSize({ 
        width: window.innerWidth, 
        height: window.innerHeight 
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          overflow: 'visible', // 캐릭터 머리와 이름표가 잘리지 않도록 변경
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 60px)',
          cursor: isDragging ? 'grabbing' : 'grab',
          paddingTop: '60px', // 상단에 여유 공간 추가
          paddingBottom: '60px' // 하단에도 여유 공간 추가
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
            cursor: isDragging ? 'grabbing' : 'default',
            padding: '100px', // 모든 방향에 100px 패딩 추가
            overflow: 'visible' // 명시적으로 visible 설정
          }}
        >
          {/* 내 캐릭터 렌더링 */}
          {charSync.myPosition && (
            <div>
              <div
                className="character my-character"
                style={{
                  position: 'absolute',
                  left: `${charSync.myPosition.x - 40}px`, // 새로운 크기(80px)의 절반
                  top: `${charSync.myPosition.y - 50}px`, // 새로운 크기(100px)의 절반
                  width: '80px', // 캐릭터 컨테이너 크기와 일치
                  height: '100px', // 캐릭터 컨테이너 크기와 일치
                  zIndex: 100,
                  overflow: 'visible' // 명시적으로 visible 설정
                }}
              >
                {currentCharacter?.images?.[charSync.myDirection] ? (
                  <img
                    src={currentCharacter.images[charSync.myDirection].startsWith('data:') 
                      ? currentCharacter.images[charSync.myDirection] 
                      : `data:image/png;base64,${currentCharacter.images[charSync.myDirection]}`}
                    alt={currentCharacter.name || "내 캐릭터"}
                    style={{
                      width: '100%',
                      height: '100%',
                      imageRendering: 'pixelated',
                      objectFit: 'contain'
                    }}
                  />
                ) : currentCharacter?.appearance ? (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px'
                    }}
                  >
                    <div>{currentCharacter.appearance.head || '😊'}</div>
                    <div>{currentCharacter.appearance.body || '👕'}</div>
                    <div>{currentCharacter.appearance.arms || '👐'}</div>
                    <div>{currentCharacter.appearance.legs || '👖'}</div>
                  </div>
                ) : (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#4CAF50',
                      borderRadius: '50%',
                      border: '3px solid #fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px'
                    }}
                  >
                    👤
                  </div>
                )}
              </div>
              {/* 내 캐릭터 이름 표시 */}
              <div
                className="character-name my-character-name"
                style={{
                  position: 'absolute',
                  left: `${charSync.myPosition.x - 50}px`, // 캐릭터 너비에 맞게 조정
                  top: `${charSync.myPosition.y - 80}px`, // 캐릭터 위쪽으로 더 멀리 띄움 (새 높이 고려)
                  fontSize: '12px', // 폰트 크기도 약간 증가
                  color: 'white',
                  textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
                  textAlign: 'center',
                  width: '100px', // 폭을 늘려서 이름이 잘리지 않게
                  zIndex: 1000, // z-index를 매우 높게 설정
                  fontWeight: 'bold',
                  backgroundColor: getNametagBackgroundColor(
                    getAreaTypeAtPoint(charSync.myPosition, currentMap?.privateAreas),
                    true
                  ),
                  borderRadius: '8px',
                  padding: '3px 6px', // 패딩도 증가
                  whiteSpace: 'nowrap',
                  overflow: 'visible', // overflow를 visible로 변경
                  textOverflow: 'clip'
                }}
              >
                {currentCharacter?.name || user?.username || '나'}
              </div>
            </div>
          )}

          {/* 다른 사용자 캐릭터들 렌더링 */}
          {Object.values(charSync.otherCharacters).map((character) => (
            <div key={character.id}>
              <div
                className="character other-character"
                style={{
                  position: 'absolute',
                  left: `${character.position.x - 40}px`, // 새로운 크기(80px)의 절반
                  top: `${character.position.y - 50}px`, // 새로운 크기(100px)의 절반
                  width: '80px', // 캐릭터 컨테이너 크기와 일치
                  height: '100px', // 캐릭터 컨테이너 크기와 일치
                  zIndex: 99,
                  overflow: 'visible' // 명시적으로 visible 설정
                }}
              >
                {character.characterInfo?.images?.[character.direction] ? (
                  <img
                    src={character.characterInfo.images[character.direction].startsWith('data:') 
                      ? character.characterInfo.images[character.direction] 
                      : `data:image/png;base64,${character.characterInfo.images[character.direction]}`}
                    alt={character.characterInfo.name || character.username}
                    style={{
                      width: '100%',
                      height: '100%',
                      imageRendering: 'pixelated',
                      objectFit: 'contain'
                    }}
                  />
                ) : character.characterInfo?.appearance ? (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px'
                    }}
                  >
                    <div>{character.characterInfo.appearance.head || '😊'}</div>
                    <div>{character.characterInfo.appearance.body || '👕'}</div>
                    <div>{character.characterInfo.appearance.arms || '👐'}</div>
                    <div>{character.characterInfo.appearance.legs || '👖'}</div>
                  </div>
                ) : (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#2196F3',
                      borderRadius: '50%',
                      border: '2px solid #fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}
                  >
                    👥
                  </div>
                )}
              </div>
              <div
                className="character-name other-character-name"
                style={{
                  position: 'absolute',
                  left: `${character.position.x - 50}px`, // 캐릭터 너비에 맞게 조정
                  top: `${character.position.y - 80}px`, // 캐릭터 위쪽으로 더 멀리 띄움 (새 높이 고려)
                  fontSize: '12px', // 폰트 크기도 약간 증가
                  color: 'white',
                  textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
                  textAlign: 'center',
                  width: '100px', // 폭을 늘려서 이름이 잘리지 않게
                  zIndex: 1000, // z-index를 매우 높게 설정
                  fontWeight: 'bold',
                  backgroundColor: getNametagBackgroundColor(
                    getAreaTypeAtPoint(character.position, currentMap?.privateAreas),
                    false
                  ),
                  borderRadius: '8px',
                  padding: '3px 6px', // 패딩도 증가
                  whiteSpace: 'nowrap',
                  overflow: 'visible', // overflow를 visible로 변경
                  textOverflow: 'clip'
                }}
              >
                {character.username}
              </div>
            </div>
          ))}

          {/* 전경 이미지 렌더링 (시작점 레이어 위) */}
          {currentMap?.foregroundLayer?.objects?.map((obj) => (
            <div
              key={obj.id}
              className="foreground-image"
              style={{
                position: 'absolute',
                left: `${obj.position?.x || obj.x || 0}px`,
                top: `${obj.position?.y || obj.y || 0}px`,
                width: `${obj.size?.width || obj.width || 50}px`,
                height: `${obj.size?.height || obj.height || 50}px`,
                zIndex: 101, // 시작점(zIndex: 100) 위에 렌더링
                pointerEvents: 'none',
                opacity: obj.opacity || 1.0,
                transform: obj.rotation ? `rotate(${obj.rotation}deg)` : 'none'
              }}
              title={obj.name || `전경 이미지 ${obj.id}`}
            >
              {obj.image && obj.image.data ? (
                <img
                  src={obj.image.data}
                  alt={obj.name || '전경 이미지'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(255, 165, 0, 0.7)',
                    border: '2px solid #FF8C00',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: '#000',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
                  }}
                >
                  🖼️
                </div>
              )}
            </div>
          ))}

          {/* 채팅 풍선말 */}
          {Array.from(chatBubbles.entries()).map(([bubbleId, bubble]) => {
            const character = Object.values(charSync.otherCharacters)
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