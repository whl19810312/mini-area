import React, { useEffect, useRef } from 'react';

const SimpleVideoDisplay = ({ stream, isLocal = false, userName = '' }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn('비디오 재생 실패:', err);
      });
    }
  }, [stream]);

  return (
    <div style={{
      position: 'relative',
      width: isLocal ? '180px' : '160px',
      height: isLocal ? '135px' : '120px',
      backgroundColor: '#000',
      borderRadius: '10px',
      overflow: 'hidden',
      border: isLocal ? '3px solid #4CAF50' : '2px solid #2196F3',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
      {!stream && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {isLocal ? '카메라 준비중...' : '연결 대기중...'}
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: '5px',
        left: '5px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold'
      }}>
        {userName || (isLocal ? '나' : '참가자')}
      </div>
    </div>
  );
};

export default SimpleVideoDisplay;