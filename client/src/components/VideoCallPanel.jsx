import React, { useEffect, useRef, useState } from 'react';
import '../styles/VideoCallPanel.css';

const VideoCallPanel = ({ mode, webRTC, livekit, onClose, targetUser }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  useEffect(() => {
    if (mode === '1on1' && webRTC) {
      // 1:1 화상통화 설정
      if (localVideoRef.current && webRTC.localStream) {
        localVideoRef.current.srcObject = webRTC.localStream;
      }
      if (remoteVideoRef.current && webRTC.remoteStream) {
        remoteVideoRef.current.srcObject = webRTC.remoteStream;
      }
    } else if ((mode === 'zone' || mode === 'global') && livekit) {
      // 영역/전체 화상통화 설정 (LiveKit)
      livekit.on('participantConnected', (participant) => {
        setParticipants(prev => [...prev, participant]);
      });
      
      livekit.on('participantDisconnected', (participant) => {
        setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
      });
      
      // 로컬 비디오 설정
      if (localVideoRef.current && livekit.localParticipant?.videoTrack) {
        livekit.localParticipant.videoTrack.attach(localVideoRef.current);
      }
    }
    
    return () => {
      // 정리
      if (mode === '1on1' && webRTC) {
        webRTC.cleanup();
      } else if ((mode === 'zone' || mode === 'global') && livekit) {
        livekit.disconnect();
      }
    };
  }, [mode, webRTC, livekit]);
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (mode === '1on1' && webRTC) {
      webRTC.toggleAudio(!isMuted);
    } else if (livekit) {
      livekit.localParticipant?.setMicrophoneEnabled(isMuted);
    }
  };
  
  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (mode === '1on1' && webRTC) {
      webRTC.toggleVideo(!isVideoOff);
    } else if (livekit) {
      livekit.localParticipant?.setCameraEnabled(isVideoOff);
    }
  };
  
  return (
    <div className="video-call-panel">
      <div className="video-header">
        <h3>
          {mode === '1on1' ? `1:1 통화 - ${targetUser?.username || ''}` : 
           mode === 'zone' ? '영역 화상통화' : 
           '전체 화상통화'}
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
        
        {/* 1:1 통화 - 원격 비디오 */}
        {mode === '1on1' && (
          <div className="video-container remote">
            <video ref={remoteVideoRef} autoPlay playsInline />
            <div className="video-label">{targetUser?.username || '상대방'}</div>
          </div>
        )}
        
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