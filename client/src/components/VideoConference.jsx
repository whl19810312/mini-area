import React from 'react';
import VideoGrid from './VideoGrid';
import '../styles/VideoConference.css';

const VideoConference = ({
  localStream,
  remoteStreams,
  isActive = false,
  className = ''
}) => {
  if (!isActive) return null;

  return (
    <div className={`video-conference ${className}`}>
      <div className="video-conference-content">
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          onToggleVideo={() => {}}
          onToggleAudio={() => {}}
          isVideoEnabled={true}
          isAudioEnabled={true}
          showControls={false}
        />
      </div>
    </div>
  );
};

export default VideoConference;
