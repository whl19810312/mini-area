import { useEffect, useRef, useCallback } from 'react';

/**
 * 화상통화 관리 Hook
 * - 방 입장 시 자동으로 모든 사용자와 화상통화 연결
 * - 영역 구분 없이 모든 사용자와 연결
 */
export const usePrivateAreaVideo = ({ 
  socket, 
  webRTC, 
  currentArea, 
  user,
  setIsVideoSidebarVisible,
  setIsCallVisible
}) => {
  const connectedUsersRef = useRef(new Set());
  const isInPrivateAreaRef = useRef(false);
  
  // 방 입장 처리 (영역 구분 없음)
  const handleEnterPrivateArea = useCallback(async (areaId, users) => {
    console.log(`🎬 방 입장 - 사용자 수: ${users.length}`);
    isInPrivateAreaRef.current = true;
    connectedUsersRef.current.clear();
    
    // 카메라 시작
    if (!webRTC.isVideoCallActive && !webRTC.isCameraDisabledByUser) {
      console.log('📹 카메라 시작');
      await webRTC.startCamera();
      setIsVideoSidebarVisible(true);
      setIsCallVisible(true);
    }
    
    // 다른 사용자들과 연결
    for (const otherUser of users) {
      if (otherUser.userId !== user.id && otherUser.username !== user.username) {
        const targetId = otherUser.username || otherUser.userId;
        
        if (!connectedUsersRef.current.has(targetId) && !webRTC.remoteStreams.has(targetId)) {
          console.log(`📞 ${targetId}와 화상통화 연결 시도`);
          connectedUsersRef.current.add(targetId);
          
          setTimeout(() => {
            webRTC.initiateCallToUser(targetId);
          }, Math.random() * 1000); // 랜덤 지연으로 동시 연결 방지
        }
      }
    }
  }, [webRTC, user, setIsVideoSidebarVisible, setIsCallVisible]);
  
  // 방 퇴장 처리
  const handleLeavePrivateArea = useCallback(() => {
    console.log('🎬 방 퇴장 - 모든 연결 해제');
    isInPrivateAreaRef.current = false;
    
    // 모든 연결 해제
    for (const userId of connectedUsersRef.current) {
      if (webRTC.remoteStreams.has(userId)) {
        console.log(`📞 ${userId}와의 연결 해제`);
        webRTC.disconnectFromUser(userId);
      }
    }
    
    connectedUsersRef.current.clear();
    
    // 카메라 종료
    if (webRTC.isVideoCallActive) {
      console.log('📹 카메라 종료');
      webRTC.endCall();
      setIsVideoSidebarVisible(false);
      setIsCallVisible(false);
    }
  }, [webRTC, setIsVideoSidebarVisible, setIsCallVisible]);
  
  // 새 사용자 연결
  const handleUserJoined = useCallback(async (newUser) => {
    if (!isInPrivateAreaRef.current) return;
    
    const targetId = newUser.username || newUser.userId;
    
    if (newUser.userId !== user.id && 
        !connectedUsersRef.current.has(targetId) && 
        !webRTC.remoteStreams.has(targetId)) {
      
      console.log(`📞 새 사용자 ${targetId}와 화상통화 연결`);
      connectedUsersRef.current.add(targetId);
      
      // 카메라가 꺼져있으면 켜기
      if (!webRTC.isVideoCallActive && !webRTC.isCameraDisabledByUser) {
        await webRTC.startCamera();
        setIsVideoSidebarVisible(true);
        setIsCallVisible(true);
      }
      
      setTimeout(() => {
        webRTC.initiateCallToUser(targetId);
      }, 500);
    }
  }, [webRTC, user, setIsVideoSidebarVisible, setIsCallVisible]);
  
  // 사용자 연결 해제
  const handleUserLeft = useCallback((leftUser) => {
    const targetId = leftUser.username || leftUser.userId;
    
    if (connectedUsersRef.current.has(targetId)) {
      console.log(`📞 ${targetId}와의 연결 해제`);
      connectedUsersRef.current.delete(targetId);
      
      if (webRTC.remoteStreams.has(targetId)) {
        webRTC.disconnectFromUser(targetId);
      }
    }
    
    // 남은 사용자가 없으면 카메라 종료
    if (connectedUsersRef.current.size === 0 && webRTC.isVideoCallActive) {
      console.log('📹 마지막 사용자 - 카메라 종료');
      webRTC.endCall();
      setIsVideoSidebarVisible(false);
      setIsCallVisible(false);
    }
  }, [webRTC, setIsVideoSidebarVisible, setIsCallVisible]);
  
  // 소켓 이벤트 리스너
  useEffect(() => {
    if (!socket) return;
    
    // 프라이빗 영역 화상통화 업데이트 이벤트
    const handleVideoUpdate = async (data) => {
      console.log('🔄 프라이빗 영역 화상통화 업데이트:', data);
      
      if (data.action === 'user-joined' && data.newUser) {
        await handleUserJoined(data.newUser);
      } else if (data.action === 'user-left' && data.leftUser) {
        handleUserLeft(data.leftUser);
      }
    };
    
    // 프라이빗 영역 참가자 목록 (초기 진입 시)
    const handleParticipants = async (data) => {
      console.log('👥 프라이빗 영역 참가자 목록:', data);
      
      if (data.participants && data.participants.length > 0) {
        await handleEnterPrivateArea(data.privateAreaId, data.participants);
      }
    };
    
    socket.on('private-area-video-update', handleVideoUpdate);
    socket.on('private-area-participants', handleParticipants);
    
    return () => {
      socket.off('private-area-video-update', handleVideoUpdate);
      socket.off('private-area-participants', handleParticipants);
    };
  }, [socket, handleUserJoined, handleUserLeft, handleEnterPrivateArea]);
  
  // 영역 변화 감지 - 현재는 사용하지 않음 (영역 구분 없이 모두 연결)
  // useEffect(() => {
  //   if (currentArea.type === 'public' && isInPrivateAreaRef.current) {
  //     // 프라이빗 -> 퍼블릭 전환
  //     handleLeavePrivateArea();
  //   }
  // }, [currentArea, handleLeavePrivateArea]);
  
  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (isInPrivateAreaRef.current) {
        handleLeavePrivateArea();
      }
    };
  }, [handleLeavePrivateArea]);
  
  return {
    connectedUsers: connectedUsersRef.current,
    isInPrivateArea: isInPrivateAreaRef.current
  };
};