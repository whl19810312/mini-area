import React, { useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import '../styles/VideoCall.css';

const VideoCall = ({ 
  roomType, // 'global', 'area', '1on1'
  metaverseId, 
  areaId, 
  callId,
  onLeave,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const { user, token } = useAuth();
  const [livekitToken, setLivekitToken] = useState(null);
  const [wsUrl, setWsUrl] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Fetch LiveKit token based on room type
  useEffect(() => {
    const fetchToken = async () => {
      if (!token) return;

      setIsConnecting(true);
      try {
        let endpoint = '';
        let body = {};

        switch (roomType) {
          case 'global':
            endpoint = '/api/video-call/token/global';
            body = { metaverseId };
            break;
          case 'area':
            endpoint = '/api/video-call/token/area';
            body = { metaverseId, areaId };
            break;
          case '1on1':
            endpoint = '/api/video-call/token/one-on-one';
            body = { callId };
            break;
          default:
            throw new Error('Invalid room type');
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error('Failed to get video call token');
        }

        const data = await response.json();
        setLivekitToken(data.data.token);
        setWsUrl(data.data.wsUrl);
      } catch (error) {
        console.error('Error fetching LiveKit token:', error);
        toast.error('화상통화 연결에 실패했습니다');
        onLeave?.();
      } finally {
        setIsConnecting(false);
      }
    };

    fetchToken();
  }, [token, roomType, metaverseId, areaId, callId]);

  // Handle disconnection
  const handleDisconnect = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/video-call/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomName: getRoomName(),
        }),
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
    onLeave?.();
  };

  const getRoomName = () => {
    switch (roomType) {
      case 'global':
        return `metaverse_${metaverseId}_global`;
      case 'area':
        return `metaverse_${metaverseId}_area_${areaId}`;
      case '1on1':
        return `call_${callId}`;
      default:
        return '';
    }
  };

  const getRoomTitle = () => {
    switch (roomType) {
      case 'global':
        return '전체 화상통화';
      case 'area':
        return '구역 화상통화';
      case '1on1':
        return '1:1 화상통화';
      default:
        return '화상통화';
    }
  };

  if (isConnecting) {
    return (
      <div className="video-call-container">
        <div className="video-call-loading">
          <div className="loading-spinner"></div>
          <p>화상통화 연결 중...</p>
        </div>
      </div>
    );
  }

  if (!livekitToken || !wsUrl) {
    return null;
  }

  return (
    <div className={`video-call-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="video-call-header">
        <h3>{getRoomTitle()}</h3>
        <div className="video-call-controls">
          <button 
            className="minimize-btn" 
            onClick={onToggleMinimize}
            title={isMinimized ? '최대화' : '최소화'}
          >
            {isMinimized ? '□' : '_'}
          </button>
          <button 
            className="leave-btn" 
            onClick={handleDisconnect}
            title="통화 종료"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="video-call-content">
          <LiveKitRoom
            video={true}
            audio={true}
            token={livekitToken}
            serverUrl={wsUrl}
            onDisconnected={handleDisconnect}
            data-lk-theme="default"
            style={{ height: '100%' }}
          >
            <VideoConference />
            <RoomAudioRenderer />
            <ControlBar />
          </LiveKitRoom>
        </div>
      )}

      {isMinimized && (
        <div className="video-call-minimized">
          <p className="participants-count">
            참가자: {participants.length || 1}명
          </p>
          <div className="mini-controls">
            <button 
              className={`control-btn ${isMuted ? 'active' : ''}`}
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? '음소거 해제' : '음소거'}
            >
              🎤
            </button>
            <button 
              className={`control-btn ${isVideoOff ? 'active' : ''}`}
              onClick={() => setIsVideoOff(!isVideoOff)}
              title={isVideoOff ? '비디오 켜기' : '비디오 끄기'}
            >
              📹
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;