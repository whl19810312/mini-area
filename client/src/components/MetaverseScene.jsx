import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { useMetaverse } from '../contexts/MetaverseContext';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeCharacterSync } from '../hooks/useRealtimeCharacterSync';
import useAreaDetection from '../hooks/useAreaDetection';
import SNSBoard from './SNSBoard';
import NavigationBar from './NavigationBar';
import UserList from './UserList';
import AreaVideoCallUI from './AreaVideoCallUI';
import SpeechBubble from './SpeechBubble';
import AreaIndicatorPanel from './AreaIndicatorPanel';
import SpeechBubbleButton from './SpeechBubbleButton';
import SpeechBubbleInput from './SpeechBubbleInput';
import { detectAreaByPosition, getAreaIndex, getAreaType } from '../utils/areaDetector';
import zoneColorManager from '../utils/zoneColorManager';
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

  // SNS/통화 상태
  const [snsPosts, setSnsPosts] = useState([]);
  const [isUsersVisible, setIsUsersVisible] = useState(false);
  const [isSpeechBubbleInputVisible, setIsSpeechBubbleInputVisible] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState([]); // 현재 맵의 참가자 목록
  const [chatBubbles, setChatBubbles] = useState(new Map()); // 사용자별 말풍선
  
  // 영역 모니터링 상태
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0); // 0: 퍼블릭, 1~n: 프라이빗
  const [currentAreaType, setCurrentAreaType] = useState('public'); // 'public' | 'private'
  const [currentAreaInfo, setCurrentAreaInfo] = useState(null); // 현재 영역 상세 정보
  const [previousAreaIndex, setPreviousAreaIndex] = useState(0); // 이전 영역 (변화 감지용)
  const [storedPrivateAreas, setStoredPrivateAreas] = useState([]); // 방 진입 시 저장된 프라이빗 영역
  const [areaIndicatorVisible, setAreaIndicatorVisible] = useState(true); // 영역 표시 패널 가시성

  // 참가자 영역 정보 계산 유틸리티 함수
  const calculateParticipantArea = useCallback((participant) => {
    if (participant.position && storedPrivateAreas.length > 0) {
      const areaInfo = detectAreaByPosition(participant.position, storedPrivateAreas);
      const areaIndex = getAreaIndex(participant.position, storedPrivateAreas);
      const areaType = getAreaType(participant.position, storedPrivateAreas);
      
      return {
        ...participant,
        calculatedAreaIndex: areaIndex,
        calculatedAreaType: areaType,
        calculatedAreaInfo: areaInfo,
      };
    }
    return participant;
  }, [storedPrivateAreas]);
  
  // 마우스 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasDraggedEnough, setHasDraggedEnough] = useState(false); // 드래그 임계값 체크

  // 커스텀 훅 사용
  const viewportRef = useRef(null);
  const sceneContainerRef = useRef(null);
  // 완전한 맵 데이터 (프라이빗 영역 포함)
  const [fullMapData, setFullMapData] = useState(null);
  // 🎯 초기 영역 설정 플래그
  const hasInitialAreaSet = useRef(false);
  // 실시간 캐릭터 동기화 시스템
  const charSync = useRealtimeCharacterSync(socket, currentMap);
  // 영역 감지 시스템 (완전한 맵 데이터 사용)
  const areaDetection = useAreaDetection(fullMapData || currentMap, charSync.myPosition, socket, user);
  
  // 입실 시 완전한 맵 데이터 로드 (프라이빗 영역 정보 포함)
  useEffect(() => {
    // 🎯 새로운 맵에 입실할 때 초기 영역 설정 플래그 리셋
    hasInitialAreaSet.current = false;
    console.log('🎯 [초기영역설정] 새 맵 진입으로 초기화 플래그 리셋');

    const loadFullMapData = async () => {
      if (!currentMap || !currentMap.id) return;
      
      console.log('🗺️ [맵로드] 완전한 맵 데이터 로딩 시작:', currentMap.id);
      
      try {
        const response = await fetch(`/api/maps/${currentMap.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const apiResponse = await response.json();
          console.log('🗺️ [맵로드] API 응답 전체:', apiResponse);
          
          // API 응답에서 실제 맵 데이터 추출
          const mapData = apiResponse.success ? apiResponse.map : apiResponse;
          
          console.log('🗺️ [맵로드] 완전한 맵 데이터 로드 완료:', {
            id: mapData?.id,
            name: mapData?.name,
            hasPrivateAreas: !!(mapData?.data?.privateAreas),
            privateAreasCount: mapData?.data?.privateAreas?.length || 0,
            privateAreas: mapData?.data?.privateAreas,
            fullMapData: mapData // 전체 데이터 구조 확인용
          });
          
          // 편집 모드와 동일한 방식으로 privateAreas 추출
          const privateAreas = Array.isArray(mapData?.private_boxes) ? mapData.private_boxes : 
                              Array.isArray(mapData?.data?.privateAreas) ? mapData.data.privateAreas : 
                              Array.isArray(mapData?.privateAreas) ? mapData.privateAreas : [];
          
          // 프라이빗 영역 좌표 유효성 검사 및 처리
          const processedPrivateAreas = privateAreas.map((area, index) => {
            console.log(`🔍 [영역검증] 프라이빗 영역 ${index + 1} 원본 데이터:`, area);
            
            // 좌표 추출: position(시작점)과 size(크기)에서 시작점/끝점 계산
            const startX = area.x ?? area.position?.x ?? area.startX;
            const startY = area.y ?? area.position?.y ?? area.startY;
            const width = area.width ?? area.size?.width;
            const height = area.height ?? area.size?.height;
            
            // 시작점과 끝점 계산
            const endX = startX !== undefined && width ? startX + width : undefined;
            const endY = startY !== undefined && height ? startY + height : undefined;
            
            console.log(`📐 [영역검증] 시작점/끝점 계산:`, {
              startX, startY, width, height,
              endX, endY,
              startPoint: { x: startX, y: startY },
              endPoint: { x: endX, y: endY },
              areaSize: width && height ? `${width} x ${height}` : 'unknown'
            });
            
            // 좌표 정보가 없으면 경고 알람
            if (startX === undefined || startY === undefined || !width || !height) {
              const errorMessage = `⚠️ 프라이빗 영역 "${area.name || `영역 ${area.id}`}"의 좌표 정보가 없습니다!\n` +
                `시작점(x,y): (${startX}, ${startY})\n` +
                `크기(width,height): (${width}, ${height})\n` +
                `끝점(x,y): (${endX}, ${endY})\n\n` +
                `모든 영역이 퍼블릭 영역으로 처리됩니다.`;
              
              console.error('❌ [영역검증]', errorMessage);
              alert(errorMessage);
              
              return {
                ...area,
                isValid: false,
                error: '좌표 정보 부족'
              };
            }
            
            // 유효한 좌표 정보가 있으면 정규화 (시작점/끝점 방식으로 저장)
            const normalizedArea = {
              ...area,
              x: startX,
              y: startY,
              width,
              height,
              startX,
              startY,
              endX,
              endY,
              startPoint: { x: startX, y: startY },
              endPoint: { x: endX, y: endY },
              isValid: true
            };
            
            console.log(`✅ [영역검증] 프라이빗 영역 "${area.name}" 좌표 검증 완료:`, normalizedArea);
            return normalizedArea;
          });
          
          // 영역 검증 결과 알람
          const validAreas = processedPrivateAreas.filter(area => area.isValid);
          const invalidAreas = processedPrivateAreas.filter(area => !area.isValid);
          
          if (privateAreas.length === 0) {
            const noAreaMessage = `📍 프라이빗 영역 정보 없음\n\n이 맵에는 프라이빗 영역이 설정되지 않았습니다.\n모든 영역이 퍼블릭 영역으로 처리됩니다.`;
            console.log('📍 [영역검증] 프라이빗 영역 없음');
            alert(noAreaMessage);
          } else if (validAreas.length > 0) {
            console.log('✅ [영역검증] 프라이빗 영역 구하기 성공:', validAreas);
          }
          
          if (invalidAreas.length > 0) {
            const warningMessage = `⚠️ ${invalidAreas.length}개의 프라이빗 영역에 좌표 문제가 있습니다.\n영역 감지가 정상적으로 작동하지 않을 수 있습니다.`;
            console.warn('⚠️ [영역검증]', warningMessage);
            alert(warningMessage);
          }
          
          // 맵 데이터를 완전한 형태로 저장 (useAreaDetection이 기대하는 구조로)
          setFullMapData({
            ...currentMap,
            ...mapData,
            // 처리된 privateAreas를 최상위 레벨에 배치 (useAreaDetection 호환)
            privateAreas: processedPrivateAreas,
            // 기존 data 구조도 유지 (다른 곳에서 사용할 수 있음)
            data: {
              ...mapData?.data,
              privateAreas: processedPrivateAreas
            }
          });

          // 🎯 영역 모니터링을 위해 프라이빗 영역 저장
          console.log('🎯 [영역모니터링] 프라이빗 영역 저장:', processedPrivateAreas.length, '개');
          setStoredPrivateAreas(processedPrivateAreas);
        } else {
          console.error('🗺️ [맵로드] 맵 데이터 로드 실패:', response.status);
          // 기본 맵 데이터 사용 (편집 모드와 동일한 방식으로 privateAreas 추출)
          const fallbackPrivateAreas = Array.isArray(currentMap?.private_boxes) ? currentMap.private_boxes : 
                                      Array.isArray(currentMap?.data?.privateAreas) ? currentMap.data.privateAreas : 
                                      Array.isArray(currentMap?.privateAreas) ? currentMap.privateAreas : [];
          setFullMapData({
            ...currentMap,
            privateAreas: fallbackPrivateAreas
          });
          // 🎯 영역 모니터링을 위해 프라이빗 영역 저장 (fallback)
          console.log('🎯 [영역모니터링] 프라이빗 영역 저장 (fallback):', fallbackPrivateAreas.length, '개');
          setStoredPrivateAreas(fallbackPrivateAreas); 
        }
      } catch (error) {
        console.error('🗺️ [맵로드] 맵 데이터 로드 에러:', error);
        // 기본 맵 데이터 사용 (편집 모드와 동일한 방식으로 privateAreas 추출)
        const fallbackPrivateAreas = Array.isArray(currentMap?.private_boxes) ? currentMap.private_boxes : 
                                    Array.isArray(currentMap?.data?.privateAreas) ? currentMap.data.privateAreas : 
                                    Array.isArray(currentMap?.privateAreas) ? currentMap.privateAreas : [];
        setFullMapData({
          ...currentMap,
          privateAreas: fallbackPrivateAreas
        });
        // 🎯 영역 모니터링을 위해 프라이빗 영역 저장 (error fallback)
        console.log('🎯 [영역모니터링] 프라이빗 영역 저장 (error fallback):', fallbackPrivateAreas.length, '개');
        setStoredPrivateAreas(fallbackPrivateAreas);
      }
    };
    
    loadFullMapData();
  }, [currentMap?.id]);
  
  // 🎯 실시간 영역 감지 시스템
  useEffect(() => {
    if (charSync.setOnPositionChange) {
      charSync.setOnPositionChange((position) => {
        console.log('🌍 거리 기반 위치 변경 감지:', position);
        // useAreaDetection 훅이 자동으로 위치 변경을 감지하여 처리하므로 
        // 별도의 처리가 필요하지 않습니다.
      });
    }
  }, [charSync.setOnPositionChange]);

  // 🎯 사용자 위치 변경 시 실시간 영역 감지
  useEffect(() => {
    if (!charSync.myPosition || !storedPrivateAreas || storedPrivateAreas.length === 0) {
      // 위치 정보가 없거나 프라이빗 영역이 없으면 퍼블릭으로 설정
      if (currentAreaType !== 'public') {
        console.log('🎯 [영역감지] 위치/영역 정보 부족 - 퍼블릭으로 설정');
        setCurrentAreaType('public');
        setCurrentAreaIndex(0);
        setCurrentAreaInfo(null);
      }
      return;
    }

    try {
      // 영역 판별 수행
      const areaResult = detectAreaByPosition(charSync.myPosition, storedPrivateAreas);

      // 이전 영역과 다른 경우에만 업데이트
      if (areaResult.areaIndex !== currentAreaIndex) {
        console.log('🔄 [영역변경] 영역 전환:', {
          from: { type: currentAreaType, index: currentAreaIndex },
          to: { type: areaResult.areaType, index: areaResult.areaIndex }
        });

        // 영역 변경 애니메이션 트리거를 위해 이전 영역 저장
        setPreviousAreaIndex(currentAreaIndex);

        // 새로운 영역 정보 업데이트
        setCurrentAreaType(areaResult.areaType);
        setCurrentAreaIndex(areaResult.areaIndex);
        setCurrentAreaInfo(areaResult.areaInfo);

        // 내 위치 영역 찾음 로그
        if (areaResult.areaType === 'private') {
          const areaName = areaResult.areaInfo?.name || `프라이빗 영역 ${areaResult.areaIndex}`;
          console.log(`🎯 내 위치 영역: ${areaName} 진입`);
        } else {
          console.log(`🎯 내 위치 영역: 퍼블릭 영역 진입`);
        }
      }
    } catch (error) {
      console.error('🎯 [영역감지] 오류:', error);
    }
  }, [charSync.myPosition, storedPrivateAreas]);

  // 참가자들의 영역 정보를 주기적으로 업데이트 (실시간 동기화용)
  useEffect(() => {
    if (!storedPrivateAreas.length || !roomParticipants.length) return;

    const updateParticipantsAreas = () => {
      setRoomParticipants(prevParticipants => {
        const updated = prevParticipants.map(calculateParticipantArea);
        // 영역 정보가 변경된 참가자만 로그 출력
        const changedUsers = updated.filter((user, index) => {
          const prev = prevParticipants[index];
          return prev && (prev.calculatedAreaIndex !== user.calculatedAreaIndex || 
                         prev.calculatedAreaType !== user.calculatedAreaType);
        });
        
        if (changedUsers.length > 0) {
          console.log(`👥 참가자 영역 변경:`, changedUsers.map(u => 
            `${u.username} → ${u.calculatedAreaType} ${u.calculatedAreaIndex}`
          ));
        }
        
        return updated;
      });
    };

    // 3초마다 참가자들의 영역 정보 업데이트
    const intervalId = setInterval(updateParticipantsAreas, 3000);

    return () => clearInterval(intervalId);
  }, [storedPrivateAreas, calculateParticipantArea, roomParticipants.length]);

  // 🎯 시작점 기반 초기 영역 설정 (입실 직후 한 번만 실행)
  
  useEffect(() => {
    // 조건: 위치 정보와 프라이빗 영역 정보가 모두 준비되었고, 아직 초기 영역을 설정하지 않았을 때
    if (charSync.myPosition && storedPrivateAreas !== null && !hasInitialAreaSet.current) {
      
      console.log('🎯 [초기영역설정] 시작점 영역 감지 시작 (최초 1회):', {
        startPosition: charSync.myPosition,
        privateAreasCount: storedPrivateAreas.length,
        currentArea: { type: currentAreaType, index: currentAreaIndex }
      });

      try {
        // 시작점에서의 영역 판별
        const startAreaResult = detectAreaByPosition(charSync.myPosition, storedPrivateAreas);
        
        console.log('🎯 [초기영역설정] 시작점 영역 감지 결과:', startAreaResult);

        // 초기 영역 상태 설정
        setCurrentAreaType(startAreaResult.areaType);
        setCurrentAreaIndex(startAreaResult.areaIndex);
        setCurrentAreaInfo(startAreaResult.areaInfo);

        // 초기 설정 완료 플래그
        hasInitialAreaSet.current = true;

        console.log('🎯 [초기영역설정] 초기 영역 상태 설정 완료:', {
          areaType: startAreaResult.areaType,
          areaIndex: startAreaResult.areaIndex,
          areaName: startAreaResult.areaInfo?.name
        });

        // 초기 영역 설정 로그
        if (startAreaResult.areaType === 'private') {
          const areaName = startAreaResult.areaInfo?.name || `프라이빗 영역 ${startAreaResult.areaIndex}`;
          console.log(`🎯 시작 위치: ${areaName}`);
        } else {
          console.log('🎯 시작 위치: 퍼블릭 영역');
        }
      } catch (error) {
        console.error('🎯 [초기영역설정] 시작점 영역 감지 오류:', error);
        hasInitialAreaSet.current = true; // 오류 시에도 재시도 방지
      }
    }
  }, [charSync.myPosition, storedPrivateAreas]);
  
  const chatBubbleTimeouts = useRef(new Map()); // 말풍선 타임아웃 관리
  
  


  const handleUpdateParticipants = async (data) => {
    console.log(`👥 참가자 업데이트 처리:`, data);
    
    if (data.mapId === currentMap.id) {
      // 참가자 정보를 로그로 출력
      console.log(`👥 현재 맵 ${data.mapId}의 참가자:`, data.participants);
      
      // 참가자 목록 업데이트 - 각 참가자의 실제 영역 계산
      if (data.participants && Array.isArray(data.participants)) {
        const updatedParticipants = data.participants.map(calculateParticipantArea);
        
        console.log(`👥 영역 계산된 참가자 정보:`, updatedParticipants);
        setRoomParticipants(updatedParticipants);
        
        // 🎥 setRoomParticipants 호출 시 자동 화상통화 시작
        if (updatedParticipants.length >= 2 && socket) {
          console.log('🎥 [자동시작] setRoomParticipants로 인한 화상통화 자동 시작 시도');
          socket.emit('trigger-auto-video-call-from-participants', {
            participants: updatedParticipants,
            mapId: currentMap?.id
          }, (response) => {
            if (response?.success) {
              console.log('🎥 [자동시작] 참가자 기반 화상통화 시작 성공:', response);
            } else {
              console.log('🎥 [자동시작] 참가자 기반 화상통화 시작 실패:', response?.error);
            }
          });
        }
      }
    }
  };

  const handleUserLeft = (data) => {
    console.log('사용자가 퇴장했습니다:', data);
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
      
      // 도착 시 영역 검사를 위한 콜백 함수
      const onArrival = (position) => {
        console.log('🌍 도착 지점 영역 검사:', position);
        // Area detection hook이 자동으로 위치 변경을 감지하여 처리함
      };
      
      charSync.moveCharacterTo({ x, y }, onArrival);
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
    const isUIElement = clickedElement.closest('.modal') ||
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
  const handleWheel = useCallback((e) => {
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
  }, [isEditMode, zoomScale, panOffset.x, panOffset.y]);

  // wheel 이벤트를 passive: false로 등록
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const wheelHandler = (e) => handleWheel(e);
    container.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      container.removeEventListener('wheel', wheelHandler);
    };
  }, [handleWheel]);

  const resetView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomScale(1);
  };

  const handleContextMenu = (e) => {
    // 오른쪽 클릭 메뉴 비활성화
    e.preventDefault();
  };

  const handleImageLoad = (e) => { setBackgroundLoaded(true); setSceneSize({ width: e.target.naturalWidth, height: e.target.naturalHeight }); };




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
    // 사용자 입장 이벤트
    socket.on('user-joined', async (data) => {
      console.log(`👋 사용자 입장:`, data);
    });
    
    
    // 채널 참가자 업데이트 이벤트
    socket.on('channel-participants-update', async (data) => {
      console.log(`📡 채널 참가자 업데이트:`, data);
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
    
    // 말풍선 메시지 수신 처리
    socket.on('speech-bubble-message', (msg) => {
      console.log(`💭 [수신] 말풍선 메시지:`, msg);
      console.log(`💭 [수신상태] 현재 사용자:`, { userId: user?.id, username: user?.username });
      console.log(`💭 [수신상태] 현재 chatBubbles:`, Array.from(chatBubbles.entries()));
      
      if (!msg.message || msg.message.trim() === '') {
        console.log('💭 [무시] 빈 말풍선 메시지');
        return;
      }
      
      // 이전 타임아웃이 있으면 취소
      const existingTimeout = chatBubbleTimeouts.current.get(msg.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const bubbleTimestamp = Date.now();
      
      setChatBubbles(prev => {
        const newBubbles = new Map(prev);
        const bubbleData = {
          message: msg.message,
          timestamp: bubbleTimestamp,
          type: 'speech-bubble'
        };
        newBubbles.set(msg.userId, bubbleData);
        console.log('💭 [상태업데이트] 말풍선 추가:', {
          userId: msg.userId,
          username: msg.username,
          bubbleData,
          totalBubbles: newBubbles.size,
          allBubbles: Array.from(newBubbles.entries())
        });
        return newBubbles;
      });
      
      // 15초 후 말풍선 제거 (일반 채팅보다 좀 더 길게)
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
      }, 15000);
      
      chatBubbleTimeouts.current.set(msg.userId, timeoutId);
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
    
    // 🎯 각 캐릭터의 위치에 따른 개별 영역 계산
    const characterArea = useMemo(() => {
      if (isCurrent) {
        // 현재 사용자는 areaDetection 훅의 정보 사용 (실시간 업데이트)
        return areaDetection.getAreaInfo();
      } else {
        // 다른 사용자들은 자신의 위치에 따라 영역 계산
        if (storedPrivateAreas.length > 0 && pos) {
          const areaInfo = detectAreaByPosition(pos, storedPrivateAreas);
          const areaIndex = getAreaIndex(pos, storedPrivateAreas);
          const areaType = getAreaType(pos, storedPrivateAreas);
          
          return {
            type: areaType,
            id: areaInfo?.id || areaIndex,
            name: areaInfo?.name || `영역 ${areaIndex}`,
            displayName: areaType === 'public' ? '공용 영역' : (areaInfo?.name || `프라이빗 영역 ${areaIndex}`)
          };
        }
        return { type: 'public', id: 0, name: '공용 영역', displayName: '공용 영역' };
      }
    }, [isCurrent, pos, storedPrivateAreas, areaDetection]);
    
    const zoneColor = zoneColorManager.getColorFromArea(characterArea);
    const isInPrivateArea = characterArea.type === 'private';
    
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
          background: isInPrivateArea ? zoneColorManager.getColorWithAlpha(zoneColor, 0.15) : 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '2px',
          border: isCurrent ? `1px solid ${zoneColor}` : `1px solid ${isInPrivateArea ? zoneColor : 'rgba(255, 255, 255, 0.3)'}`,
          transition: 'all 0.15s ease-out',
          ...style
        }}
      >
        {/* 영역 색상 인디케이터 */}
        {isInPrivateArea && (
          <div 
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: zoneColor,
              border: '2px solid white',
              zIndex: 2
            }}
            title={`영역 색상: ${zoneColor}`}
          />
        )}
        {/* 채팅 풍선말 */}
        {chatBubble && (() => {
          console.log('🎈 말풍선 렌더링:', { 
            chatBubble, 
            position: pos, 
            username: info?.username || info?.name,
            isCurrent 
          });
          return true;
        })() && (
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



  return (
    <div className="metaverse-container">
      <NavigationBar 
        currentView={currentView}
        onViewChange={setCurrentView}
        currentArea={{ 
          type: areaDetection.currentArea.type, 
          name: areaDetection.getAreaInfo().displayName 
        }}
        onReturnToLobby={onReturnToLobby}
        roomName={currentMap?.name}
        onToggleGroupCall={() => {}}
        groupCallActive={false}
        onOpenUserList={() => setIsUsersVisible(v => !v)}
      />

      {/* 🎯 영역 표시 패널 */}
      <AreaIndicatorPanel
        currentAreaIndex={currentAreaIndex}
        currentAreaType={currentAreaType}
        currentAreaInfo={currentAreaInfo}
        userPosition={charSync.myPosition || { x: 0, y: 0 }}
        isVisible={areaIndicatorVisible && currentView === 'metaverse'}
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

          {/* 🎯 영역 패널 토글 버튼 */}
          <button
            onClick={() => setAreaIndicatorVisible(prev => !prev)}
            style={{
              width: '50px',
              height: '30px',
              borderRadius: '15px',
              border: 'none',
              background: areaIndicatorVisible ? 'rgba(76, 175, 80, 1)' : 'rgba(158, 158, 158, 1)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(5px)',
              transition: 'all 0.2s',
              marginTop: '10px'
            }}
            onMouseEnter={(e) => e.target.style.background = areaIndicatorVisible ? 'rgba(67, 160, 71, 1)' : 'rgba(117, 117, 117, 1)'}
            onMouseLeave={(e) => e.target.style.background = areaIndicatorVisible ? 'rgba(76, 175, 80, 1)' : 'rgba(158, 158, 158, 1)'}
            title={areaIndicatorVisible ? "영역 패널 숨기기" : "영역 패널 보기"}
          >
            {areaIndicatorVisible ? '🎯' : '👁️'}
          </button>
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
                chatBubble={(() => {
                  const bubble = chatBubbles.get(user.id);
                  console.log('🎈 [현재사용자] 말풍선 조회:', {
                    userId: user.id,
                    username: user.username,
                    bubble,
                    allBubbles: Array.from(chatBubbles.entries())
                  });
                  return bubble;
                })()}
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

          </div>
        </div>
      )}
      
      {/* 말풍선 입력 버튼 */}
      {currentView === 'metaverse' && (
        <>
          {/* 말풍선 텍스트 입력 버튼 (좌측 중간) */}
          <SpeechBubbleButton 
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsSpeechBubbleInputVisible(true); 
            }} 
          />

          {/* 영역 기반 화상통화 UI */}
          <AreaVideoCallUI
            socket={socket}
            currentArea={{
              type: areaDetection.currentArea.type,
              name: areaDetection.getAreaInfo().displayName,
              id: areaDetection.currentArea.id
            }}
            isVisible={currentView === 'metaverse'}
          />

          {/* 말풍선 텍스트 입력창 */}
          <SpeechBubbleInput
            isVisible={isSpeechBubbleInputVisible}
            onSendMessage={(text) => {
              if (!socket) {
                console.error('💭 [ERROR] Socket not available');
                return;
              }
              console.log('💭 [전송시도] 말풍선 메시지:', { 
                text, 
                userId: user?.id, 
                username: user?.username,
                socketConnected: socket.connected,
                mapId: socket.mapId,
                currentMapId: currentMap?.id,
                socketRooms: socket?.rooms ? Array.from(socket.rooms) : 'not available'
              });
              socket.emit('speech-bubble-message', {
                message: text,
                mapId: currentMap?.id
              });
              console.log('💭 [전송완료] speech-bubble-message 이벤트 발송됨');
            }}
            onClose={() => setIsSpeechBubbleInputVisible(false)}
          />
        </>
      )}
      {currentView === 'sns' && (<SNSBoard posts={snsPosts} onPostCreate={(post) => setSnsPosts(prev => [post, ...prev])} onPostLike={() => {}} onPostComment={() => {}} />)}
      
    </div>
  );
});

export default MetaverseScene;
