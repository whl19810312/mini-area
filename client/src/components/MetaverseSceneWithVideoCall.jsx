import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useMetaverse } from '../contexts/MetaverseContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { useCharacterMovement } from '../hooks/useCharacterMovement';
import ChatWindow from './ChatWindow';
import SNSBoard from './SNSBoard';
import NavigationBar from './NavigationBar';
import toast from 'react-hot-toast';
import '../styles/MetaverseScene.css';

const MetaverseSceneWithVideoCall = forwardRef(({ 
  currentMap, 
  mapImage: mapImageProp, 
  characters, 
  currentCharacter, 
  isEditMode = false, 
  onReturnToLobby 
}, ref) => {
  const { user, socket } = useAuth();
  const { updateCharacterPosition } = useMetaverse();

  // 뷰 상태 관리
  const [currentView, setCurrentView] = useState('metaverse'); // 'metaverse' | 'sns'
  
  // 메타버스 상태
  const [currentArea, setCurrentArea] = useState({ type: 'public', name: '퍼블릭 영역' });
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [sceneSize, setSceneSize] = useState({ width: 1000, height: 1000 });
  
  // 줌 및 패닝 상태
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Video Call 상태
  const [videoCallState, setVideoCallState] = useState({
    isActive: false,
    roomType: null, // 'global', 'area'
    areaId: null,
    callId: null,
    isMinimized: false,
  });

  // 현재 위치한 프라이빗 영역 추적
  const [currentPrivateArea, setCurrentPrivateArea] = useState(null);

  // SNS/채팅 상태
  const [chatMessages, setChatMessages] = useState([]);
  const [snsPosts, setSnsPosts] = useState([]);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isUsersVisible, setIsUsersVisible] = useState(false);
  
  // 마우스 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // 커스텀 훅 사용
  const viewportRef = useRef(null);
  const sceneContainerRef = useRef(null);
  const movement = useCharacterMovement(sceneContainerRef, sceneSize, currentMap);

  // 전체 화상통화 시작
  const startGlobalVideoCall = () => {
    if (videoCallState.isActive) {
      toast.error('이미 화상통화가 진행 중입니다');
      return;
    }

    setVideoCallState({
      isActive: true,
      roomType: 'global',
      areaId: null,
      callId: null,
      isMinimized: false,
    });

    toast.success('전체 화상통화에 참가했습니다');
  };

  // 구역 화상통화 시작
  const startAreaVideoCall = (areaId) => {
    if (!areaId) {
      toast.error('프라이빗 영역에 들어가서 시도해주세요');
      return;
    }

    if (videoCallState.isActive) {
      toast.error('이미 화상통화가 진행 중입니다');
      return;
    }

    setVideoCallState({
      isActive: true,
      roomType: 'area',
      areaId: areaId,
      callId: null,
      isMinimized: false,
    });

    toast.success('구역 화상통화에 참가했습니다');
  };


  // 화상통화 종료
  const handleLeaveVideoCall = () => {
    setVideoCallState({
      isActive: false,
      roomType: null,
      areaId: null,
      callId: null,
      isMinimized: false,
    });
    toast.info('화상통화를 종료했습니다');
  };

  // 화상통화 최소화/최대화 토글
  const toggleVideoCallMinimize = () => {
    setVideoCallState(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  };

  // 캐릭터 위치에 따른 프라이빗 영역 체크
  useEffect(() => {
    if (!currentCharacter || !currentMap?.privateAreas) return;

    const checkPrivateArea = () => {
      const charX = currentCharacter.position?.x || 0;
      const charY = currentCharacter.position?.y || 0;

      for (const area of currentMap.privateAreas) {
        const areaX = area.position?.x || area.x1 || 0;
        const areaY = area.position?.y || area.y1 || 0;
        const areaWidth = area.size?.width || (area.x2 - area.x1) || 0;
        const areaHeight = area.size?.height || (area.y2 - area.y1) || 0;

        if (
          charX >= areaX &&
          charX <= areaX + areaWidth &&
          charY >= areaY &&
          charY <= areaY + areaHeight
        ) {
          if (currentPrivateArea?.id !== area.id) {
            setCurrentPrivateArea(area);
            setCurrentArea({ 
              type: 'private', 
              name: area.name || '프라이빗 영역',
              id: area.id 
            });
            toast.info(`${area.name || '프라이빗 영역'}에 입장했습니다`);
          }
          return;
        }
      }

      // 프라이빗 영역을 벗어난 경우
      if (currentPrivateArea) {
        setCurrentPrivateArea(null);
        setCurrentArea({ type: 'public', name: '퍼블릭 영역' });
        toast.info('퍼블릭 영역으로 이동했습니다');
      }
    };

    checkPrivateArea();
  }, [currentCharacter?.position, currentMap?.privateAreas]);


  useImperativeHandle(ref, () => ({
    // 외부에서 호출 가능한 메서드들
    startGlobalVideoCall,
    startAreaVideoCall,
  }));

  return (
    <div className="metaverse-scene-container">
      {currentView === 'metaverse' ? (
        <>
          <div className="metaverse-viewport" ref={viewportRef}>
            <div 
              className="scene-container" 
              ref={sceneContainerRef}
              style={{
                width: `${sceneSize.width}px`,
                height: `${sceneSize.height}px`,
                transform: `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: 'center center',
              }}
            >
              {/* 배경 이미지 */}
              {mapImageProp && (
                <img 
                  src={mapImageProp} 
                  alt="Map Background" 
                  className="scene-background"
                  onLoad={() => setBackgroundLoaded(true)}
                />
              )}

              {/* 프라이빗 영역 표시 */}
              {currentMap?.privateAreas?.map((area, index) => (
                <div
                  key={area.id || index}
                  className="private-area-overlay"
                  style={{
                    position: 'absolute',
                    left: `${area.position?.x || area.x1 || 0}px`,
                    top: `${area.position?.y || area.y1 || 0}px`,
                    width: `${area.size?.width || (area.x2 - area.x1) || 100}px`,
                    height: `${area.size?.height || (area.y2 - area.y1) || 100}px`,
                    border: '2px dashed rgba(0, 123, 255, 0.5)',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    pointerEvents: 'none',
                  }}
                >
                  <div className="area-label">
                    {area.name || `프라이빗 영역 ${index + 1}`}
                  </div>
                </div>
              ))}

              {/* 캐릭터 렌더링 */}
              {characters?.map((char) => (
                <div
                  key={char.id}
                  className={`character ${char.id === user?.id ? 'current-user' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${char.position?.x || 0}px`,
                    top: `${char.position?.y || 0}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="character-avatar">
                    {char.emoji || '😊'}
                  </div>
                  <div className="character-name">
                    {char.username}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 화상통화 컨트롤 버튼들 */}
          <div className="video-call-buttons">
            <button 
              className="video-call-btn"
              onClick={startGlobalVideoCall}
              disabled={videoCallState.isActive}
            >
              <span className="icon">🌐</span>
              <span>전체 통화</span>
            </button>
            
            {currentPrivateArea && (
              <button 
                className="video-call-btn"
                onClick={() => startAreaVideoCall(currentPrivateArea.id)}
                disabled={videoCallState.isActive}
              >
                <span className="icon">🔒</span>
                <span>구역 통화</span>
              </button>
            )}
          </div>

          {/* 현재 위치 표시 */}
          <div className="current-area-indicator">
            <span className="area-label">
              {currentArea.type === 'private' ? '🔒' : '🌐'} {currentArea.name}
            </span>
          </div>

          {/* 화상통화 컴포넌트 */}
          {/* VideoCall component removed - video call functionality disabled */}

          {/* 채팅 윈도우 */}
          {isChatVisible && (
            <ChatWindow 
              messages={chatMessages}
              onClose={() => setIsChatVisible(false)}
              currentArea={currentArea}
            />
          )}
        </>
      ) : (
        <SNSBoard posts={snsPosts} />
      )}

      {/* 네비게이션 바 */}
      <NavigationBar 
        currentView={currentView}
        onViewChange={setCurrentView}
        onToggleChat={() => setIsChatVisible(!isChatVisible)}
        onToggleUsers={() => setIsUsersVisible(!isUsersVisible)}
        isCallActive={videoCallState.isActive}
      />
    </div>
  );
});

MetaverseSceneWithVideoCall.displayName = 'MetaverseSceneWithVideoCall';

export default MetaverseSceneWithVideoCall;