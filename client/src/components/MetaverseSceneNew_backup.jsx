// 기존 MetaverseSceneNew 컴포넌트 백업
// 이 파일은 주석 처리된 이전 버전입니다

/*
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useMetaverse } from '../contexts/MetaverseContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { useLiveKit } from '../hooks/useLiveKit';
import { useCharacterMovement } from '../hooks/useCharacterMovement';
import MultiLayerCanvas from './MultiLayerCanvas';
import ChatWindow from './ChatWindow';
import VideoCallPanel from './VideoCallPanel';
import '../styles/MetaverseScene.css';
import '../styles/MetaverseEditor.css';

const MetaverseSceneNew = forwardRef(({ 
  currentMap, 
  mapImage, 
  characters, 
  currentCharacter, 
  isEditMode = false, 
  onReturnToLobby,
  onEditMap,
  onDeleteMap,
  onOpenSNS,
  onOpenShop,
  onCameraToggle,
  onMicrophoneToggle,
  isCameraOn,
  isMicrophoneOn,
  hasMediaPermission,
  user: propUser,
  otherUsers: propOtherUsers
}, ref) => {
  const { user: authUser, socket } = useAuth();
  const { updateCharacterPosition, otherUsers: contextOtherUsers } = useMetaverse();
  const user = propUser || authUser;
  const otherUsers = propOtherUsers || contextOtherUsers;
  
  // 캔버스 참조
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const multiLayerCanvasRef = useRef(null);
  
  // 채팅/화상통화 상태
  const [chatMode, setChatMode] = useState('global'); // 'global', 'zone', 'private'
  const [videoMode, setVideoMode] = useState('none'); // 'none', '1on1', 'zone', 'global'
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [currentZone, setCurrentZone] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // 캔버스 상태 (편집 화면과 동일)
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [showTransition, setShowTransition] = useState(false);
  
  // 레이어 투명도 (편집 화면과 동일)
  const [layerOpacity, setLayerOpacity] = useState({
    background: 1,
    walls: 0.6,
    privateAreas: 0.3,
    entities: 1,
    foreground: 1,
    ui: 1,
    terminal: 0.95
  });
  
  // WebRTC & LiveKit
  const webRTC = useWebRTC(socket, user);
  const livekit = useLiveKit(user);
  
  // 캐릭터 이동
  const { 
    position, 
    direction, 
    isMoving, 
    moveTo, 
    handleKeyDown, 
    handleKeyUp, 
    handleClick 
  } = useCharacterMovement(currentMap?.spawnPoint || { x: 500, y: 500 });
  
  // 레이어 데이터 준비 (편집 화면과 동일한 구조)
  const getBackgroundImage = () => {
    // 배경 레이어 이미지 확인
    if (currentMap?.backgroundLayer?.image?.data) {
      const contentType = currentMap.backgroundLayer.image.contentType || 'image/jpeg';
      return `data:${contentType};base64,${currentMap.backgroundLayer.image.data}`;
    }
    // 다른 형식의 배경 이미지
    if (currentMap?.backgroundImage) return currentMap.backgroundImage;
    if (currentMap?.imageUrl) return currentMap.imageUrl;
    if (mapImage) return mapImage;
    return null;
  };

  const layers = {
    background: getBackgroundImage(),
    walls: currentMap?.walls || [],
    privateAreas: currentMap?.privateAreas || [],
    entities: currentMap?.spawnPoints || [],
    frontImage: currentMap?.foregroundLayer?.image?.data ? 
      `data:${currentMap.foregroundLayer.image.contentType || 'image/jpeg'};base64,${currentMap.foregroundLayer.image.data}` : 
      currentMap?.foregroundImage || null
  };
  
  // 디버깅용 로그
  useEffect(() => {
    console.log('🗺️ MetaverseSceneNew - 맵 데이터:', currentMap);
    console.log('🖼️ 배경 이미지 처리:', {
      backgroundLayer: currentMap?.backgroundLayer,
      backgroundImage: currentMap?.backgroundImage,
      imageUrl: currentMap?.imageUrl,
      mapImage: mapImage,
      최종결과: layers.background
    });
    console.log('🖼️ 전경 이미지:', layers.frontImage ? '있음' : '없음');
    
    // 배경 이미지 URL 일부 출력
    if (layers.background) {
      console.log('🎨 배경 이미지 URL 시작:', layers.background.substring(0, 100));
    }
  }, [currentMap, mapImage]);
  
  // 줌 인/아웃 (편집 화면과 동일)
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(canvasScale * delta, 0.1), 5);
    setCanvasScale(newScale);
  };
  
  // 패닝 시작
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // 중간 버튼 또는 Ctrl+왼쪽 클릭
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasPosition.x, y: e.clientY - canvasPosition.y });
    }
  };
  
  // 패닝 중
  const handleMouseMove = (e) => {
    if (isPanning && panStart) {
      setCanvasPosition({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };
  
  // 패닝 종료
  const handleMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
  };
  
  // 영역 감지 (프라이빗 영역 체크)
  useEffect(() => {
    if (currentMap?.privateAreas && position) {
      const area = currentMap.privateAreas.find(area => {
        const inX = position.x >= area.position.x && position.x <= (area.position.x + area.size.width);
        const inY = position.y >= area.position.y && position.y <= (area.position.y + area.size.height);
        return inX && inY;
      });
      
      if (area !== currentZone) {
        setCurrentZone(area);
        if (area) {
          // 영역 진입 시 영역 채팅/화상통화로 전환 옵션
          console.log('영역 진입:', area.name || `프라이빗 영역 ${currentMap.privateAreas.indexOf(area) + 1}`);
        }
      }
    }
  }, [position, currentMap]);
  
  // 채팅 메시지 수신
  useEffect(() => {
    if (socket) {
      socket.on('chat-message', (data) => {
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          username: data.username,
          message: data.message,
          type: data.chatMode || 'global',
          timestamp: new Date().toLocaleTimeString()
        }]);
      });
      
      return () => {
        socket.off('chat-message');
      };
    }
  }, [socket]);
  
  // 채팅 메시지 전송
  const sendChatMessage = (message) => {
    if (socket && message.trim()) {
      let targetData = {
        message,
        chatMode,
        username: user?.username
      };
      
      if (chatMode === 'zone' && currentZone) {
        targetData.zoneId = currentZone.id || currentMap.privateAreas.indexOf(currentZone);
      } else if (chatMode === 'private' && selectedUser) {
        targetData.targetUserId = selectedUser.id;
      }
      
      socket.emit('chat-message', targetData);
      
      // 로컬 메시지 추가
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        username: user?.username,
        message,
        type: chatMode,
        timestamp: new Date().toLocaleTimeString(),
        self: true
      }]);
    }
  };
  
  // 1:1 화상통화 시작
  const startPrivateCall = (targetUser) => {
    setSelectedUser(targetUser);
    setVideoMode('1on1');
    webRTC.startCall(targetUser.id);
  };
  
  // 영역 화상통화 시작
  const startZoneCall = () => {
    if (currentZone) {
      setVideoMode('zone');
      livekit.joinRoom(`zone-${currentZone.id || currentMap.privateAreas.indexOf(currentZone)}`);
    }
  };
  
  // 전체 화상통화 시작
  const startGlobalCall = () => {
    setVideoMode('global');
    livekit.joinRoom(`map-${currentMap.id || currentMap._id}`);
  };
  
  // 화상통화 종료
  const endCall = () => {
    if (videoMode === '1on1') {
      webRTC.endCall();
    } else if (videoMode === 'zone' || videoMode === 'global') {
      livekit.leaveRoom();
    }
    setVideoMode('none');
    setSelectedUser(null);
  };
  
  // ref 노출
  useImperativeHandle(ref, () => ({
    moveTo,
    sendChatMessage
  }));
  
  return (
    <div className="metaverse-editor-container">
      // 상단 툴바
      <div className="metaverse-toolbar">
        <div className="toolbar-left">
          <span className="space-name">{currentMap?.name || '공간'}</span>
          <span className="current-zone">
            {currentZone ? (currentZone.name || `프라이빗 영역`) : '공용 영역'}
          </span>
        </div>
        
        <div className="toolbar-center">
          <div className="communication-modes">
            <div className="chat-mode-selector">
              <label>채팅:</label>
              <select value={chatMode} onChange={(e) => setChatMode(e.target.value)}>
                <option value="global">전체</option>
                <option value="zone" disabled={!currentZone}>영역</option>
                <option value="private" disabled={!selectedUser}>1:1</option>
              </select>
            </div>
            
            <div className="video-controls">
              <button 
                className={`video-btn ${videoMode === '1on1' ? 'active' : ''}`}
                onClick={() => videoMode === '1on1' ? endCall() : null}
                disabled={!selectedUser && videoMode !== '1on1'}
              >
                👤 1:1 통화
              </button>
              <button 
                className={`video-btn ${videoMode === 'zone' ? 'active' : ''}`}
                onClick={() => videoMode === 'zone' ? endCall() : startZoneCall()}
                disabled={!currentZone && videoMode !== 'zone'}
              >
                🏠 영역 통화
              </button>
              <button 
                className={`video-btn ${videoMode === 'global' ? 'active' : ''}`}
                onClick={() => videoMode === 'global' ? endCall() : startGlobalCall()}
              >
                🌍 전체 통화
              </button>
            </div>
          </div>
        </div>
        
        <div className="toolbar-right">
          <div className="toolbar-controls">
            {currentMap && user && (currentMap.creatorId === user.id || currentMap.createdBy === user.id) && (
              <>
                <button onClick={onEditMap} className="toolbar-btn" title="공간 편집">
                  ✏️ 편집
                </button>
                <button onClick={onDeleteMap} className="toolbar-btn danger" title="공간 삭제">
                  🗑️ 삭제
                </button>
              </>
            )}
            <button onClick={onOpenSNS} className="toolbar-btn" title="SNS 게시판">
              💬 SNS
            </button>
            <button onClick={onOpenShop} className="toolbar-btn" title="쇼핑몰">
              🛒 상점
            </button>
            <button 
              onClick={onCameraToggle} 
              className={`toolbar-btn media ${isCameraOn ? 'active' : ''} ${!hasMediaPermission ? 'disabled' : ''}`} 
              title={isCameraOn ? '카메라 끄기' : hasMediaPermission ? '카메라 켜기' : '카메라 권한 요청'}
            >
              {isCameraOn ? '📹' : '📷'}
            </button>
            <button 
              onClick={onMicrophoneToggle} 
              className={`toolbar-btn media ${isMicrophoneOn ? 'active' : ''} ${!hasMediaPermission ? 'disabled' : ''}`} 
              title={isMicrophoneOn ? '마이크 끄기' : hasMediaPermission ? '마이크 켜기' : '마이크 권한 요청'}
            >
              {isMicrophoneOn ? '🔊' : '🔇'}
            </button>
            <button onClick={onReturnToLobby} className="toolbar-btn exit" title="나가기">
              🚪 나가기
            </button>
          </div>
          <span className="user-count">
            접속자: {Array.isArray(otherUsers) ? otherUsers.length + 1 : 1}명
          </span>
        </div>
      </div>
      
      // 편집 화면과 동일한 캔버스 구조
      <div 
        className="editor-canvas-area"
        style={{
          flex: 1,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#0a0a0a'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${canvasScale})`,
            transformOrigin: 'center center',
            transition: showTransition ? 'transform 0.3s ease' : 'none',
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: `-${(currentMap?.size?.width || 1000) / 2}px`,
            marginTop: `-${(currentMap?.size?.height || 1000) / 2}px`
          }}
        >
          <MultiLayerCanvas
            ref={multiLayerCanvasRef}
            width={currentMap?.size?.width || 1000}
            height={currentMap?.size?.height || 1000}
            backgroundImage={layers.background}
            layers={{
              background: layers.background,
              walls: layers.walls || [],
              privateAreas: layers.privateAreas || [],
              entities: [...(layers.entities || []), ...(Array.isArray(otherUsers) ? otherUsers.map(u => ({
                type: 'player',
                position: u.position || { x: 500, y: 500 },
                name: u.username
              })) : [])],
              frontImage: layers.frontImage
            }}
            isEditMode={false}
            showControls={false}
            showTransition={false}
            layerOpacity={layerOpacity}
            currentUser={{
              position: position,
              username: user?.username
            }}
            onCanvasReady={(canvas) => {
              if (canvas && canvas.layer4Canvas) {
                canvasRef.current = canvas.layer4Canvas;
              }
            }}
          />
        </div>
      </div>
      
      // 채팅 창
      {isChatVisible && (
        <ChatWindow
          messages={chatMessages.filter(msg => {
            if (chatMode === 'global') return msg.type === 'global';
            if (chatMode === 'zone') return msg.type === 'zone';
            if (chatMode === 'private') return msg.type === 'private';
            return true;
          })}
          onSendMessage={sendChatMessage}
          onClose={() => setIsChatVisible(false)}
          title={`채팅 - ${chatMode === 'global' ? '전체' : chatMode === 'zone' ? '영역' : '1:1'}`}
        />
      )}
      
      // 화상통화 패널
      {videoMode !== 'none' && (
        <VideoCallPanel
          mode={videoMode}
          webRTC={webRTC}
          livekit={livekit}
          onClose={endCall}
          targetUser={selectedUser}
        />
      )}
      
      // 사용자 목록 (1:1 통화/채팅 선택용)
      <div className="users-sidebar">
        <h3>접속 중인 사용자</h3>
        <div className="users-list">
          {Array.isArray(otherUsers) && otherUsers.map(otherUser => (
            <div 
              key={otherUser.id} 
              className={`user-item ${selectedUser?.id === otherUser.id ? 'selected' : ''}`}
              onClick={() => setSelectedUser(otherUser)}
            >
              <span className="user-name">{otherUser.username}</span>
              <div className="user-actions">
                <button 
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUser(otherUser);
                    setChatMode('private');
                  }}
                  title="1:1 채팅"
                >
                  💬
                </button>
                <button 
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    startPrivateCall(otherUser);
                  }}
                  title="1:1 화상통화"
                >
                  📹
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

MetaverseSceneNew.displayName = 'MetaverseSceneNew';

export default MetaverseSceneNew;
*/