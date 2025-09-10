import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from './ChatWindow';
import toast from 'react-hot-toast';

const MetaverseChatSystem = ({ 
  socket, 
  currentMap, 
  user,
  isChatVisible,
  setIsChatVisible,
  unreadMessageCount,
  setUnreadMessageCount
}) => {
  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [privateChatMessages, setPrivateChatMessages] = useState([]);
  const [chatBubbles, setChatBubbles] = useState(new Map());
  
  const isChatVisibleRef = useRef(false);
  const chatBubbleTimeouts = useRef(new Map());

  // 채팅창 가시성 상태 동기화
  useEffect(() => {
    isChatVisibleRef.current = isChatVisible;
  }, [isChatVisible]);

  // 소켓 이벤트 리스너 설정
  useEffect(() => {
    if (!socket) return;

    const handleGlobalMessage = (message) => {
      console.log('🗨️ 전체 채팅 메시지 수신:', message);
      
      setGlobalChatMessages(prev => [...prev, message]);
      
      // 채팅창이 닫혀있으면 읽지 않은 메시지 수 증가
      if (!isChatVisibleRef.current) {
        setUnreadMessageCount(prev => prev + 1);
      }
      
      // 채팅 풍선말 표시 (5초간)
      if (message.username && message.username !== user?.username) {
        showChatBubble(message.username, message.message);
      }
    };

    const handlePrivateMessage = (message) => {
      console.log('💌 쪽지 메시지 수신:', message);
      
      setPrivateChatMessages(prev => [...prev, message]);
      
      if (!isChatVisibleRef.current) {
        setUnreadMessageCount(prev => prev + 1);
      }
      
      toast.success(`${message.sender}님이 쪽지를 보냈습니다: ${message.message}`);
    };

    socket.on('global-message', handleGlobalMessage);
    socket.on('private-message', handlePrivateMessage);
    
    return () => {
      socket.off('global-message', handleGlobalMessage);
      socket.off('private-message', handlePrivateMessage);
    };
  }, [socket, user?.username, setUnreadMessageCount]);

  // 채팅 풍선말 표시 함수
  const showChatBubble = (username, message) => {
    // 기존 타임아웃 제거
    const existingTimeout = chatBubbleTimeouts.current.get(username);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // 새 풍선말 표시
    setChatBubbles(prev => new Map(prev.set(username, { message, timestamp: Date.now() })));

    // 5초 후 풍선말 제거
    const timeout = setTimeout(() => {
      setChatBubbles(prev => {
        const newBubbles = new Map(prev);
        newBubbles.delete(username);
        return newBubbles;
      });
      chatBubbleTimeouts.current.delete(username);
    }, 5000);

    chatBubbleTimeouts.current.set(username, timeout);
  };

  // 전체 채팅 메시지 전송
  const handleGlobalChat = (message) => {
    if (!socket || !currentMap || !user?.username) return;
    
    const chatData = {
      mapId: currentMap.id || currentMap._id,
      message: message.trim(),
      username: user.username,
      timestamp: new Date().toISOString()
    };
    
    console.log('🗨️ 전체 채팅 전송:', chatData);
    socket.emit('global-message', chatData);
  };

  // 쪽지 전송
  const handlePrivateMessage = (targetUsername, message) => {
    if (!socket || !user?.username) return;
    
    const privateData = {
      target: targetUsername,
      message: message.trim(),
      sender: user.username,
      timestamp: new Date().toISOString()
    };
    
    console.log('💌 쪽지 전송:', privateData);
    socket.emit('private-message', privateData);
    
    // 로컬에도 추가 (발신 메시지)
    setPrivateChatMessages(prev => [...prev, {
      ...privateData,
      isSent: true
    }]);
    
    toast.success(`${targetUsername}님에게 쪽지를 보냈습니다.`);
  };

  // 채팅창 열기/닫기 시 읽지 않은 메시지 수 초기화
  const handleChatToggle = (visible) => {
    setIsChatVisible(visible);
    if (visible) {
      setUnreadMessageCount(0);
    }
  };

  return (
    <>
      {/* 채팅 풍선말들 */}
      {Array.from(chatBubbles.entries()).map(([username, bubble]) => {
        // TODO: 캐릭터 위치에 따라 풍선말 위치 계산
        return (
          <div
            key={username}
            className="chat-bubble"
            style={{
              position: 'absolute',
              zIndex: 1000,
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              maxWidth: '200px',
              wordWrap: 'break-word',
              animation: 'fadeInOut 5s ease-out forwards'
            }}
          >
            <strong>{username}:</strong> {bubble.message}
          </div>
        );
      })}

      {/* 채팅창 */}
      {isChatVisible && (
        <ChatWindow
          globalMessages={globalChatMessages}
          privateMessages={privateChatMessages}
          onSendGlobalMessage={handleGlobalChat}
          onSendPrivateMessage={handlePrivateMessage}
          onClose={() => handleChatToggle(false)}
          currentUser={user?.username}
        />
      )}
    </>
  );
};

export default MetaverseChatSystem;