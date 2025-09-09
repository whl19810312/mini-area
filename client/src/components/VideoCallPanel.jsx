import React, { useEffect, useRef, useState } from 'react';
import '../styles/VideoCallPanel.css';

const VideoCallPanel = ({ mode, webRTC, onClose, targetUser }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  useEffect(() => {
    if (mode === 'zone' || mode === 'global') {
      // 영역/전체 화상통화 설정 (MediaSoup/P2P로 대체 예정)
      console.log('Zone/Global video call mode - MediaSoup/P2P integration pending');
    }
    
    return () => {
      // 정리
      if (mode === 'zone' || mode === 'global') {
        // MediaSoup/P2P 정리 로직 추가 예정
      }
    };
  }, [mode, webRTC]);
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (mode === 'zone' || mode === 'global') {
      // MediaSoup/P2P 음소거 로직 추가 예정
      console.log('Mute toggle for zone/global mode - pending');
    }
  };
  
  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (mode === 'zone' || mode === 'global') {
      // MediaSoup/P2P 비디오 토글 로직 추가 예정
      console.log('Video toggle for zone/global mode - pending');
    }
  };
  
  return (
    <div className="video-call-panel">
      <div className="video-header">
        <h3>
          {mode === 'zone' ? '영역 화상통화' : '전체 화상통화'}
        </h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      
      <div className="video-grid">
        {/* 로컬 비디오 */}
        <div className="video-container local">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted
            className={isVideoOff ? 'hidden' : ''}
          />
          <div className="video-label">나</div>
          {isVideoOff && <div className="video-off-placeholder">📷 비디오 꺼짐</div>}
        </div>
        
        
        {/* 그룹 통화 - 참가자들 */}
        {(mode === 'zone' || mode === 'global') && participants.map(participant => (
          <div key={participant.sid} className="video-container participant">
            <video 
              ref={el => {
                if (el && participant.videoTrack) {
                  participant.videoTrack.attach(el);
                }
              }}
              autoPlay 
              playsInline 
            />
            <div className="video-label">{participant.identity}</div>
          </div>
        ))}
      </div>
      
      <div className="video-controls">
        <button 
          className={`control-btn ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? '음소거 해제' : '음소거'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <button 
          className={`control-btn ${isVideoOff ? 'active' : ''}`}
          onClick={toggleVideo}
          title={isVideoOff ? '비디오 켜기' : '비디오 끄기'}
        >
          {isVideoOff ? '📷❌' : '📷'}
        </button>
        <button 
          className="control-btn end-call"
          onClick={onClose}
          title="통화 종료"
        >
          📞❌
        </button>
      </div>
    </div>
  );
};

export default VideoCallPanel;