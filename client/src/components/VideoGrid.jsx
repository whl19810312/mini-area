import React from 'react';
import '../styles/VideoGrid.css';

const VideoGrid = ({ 
	localStream, 
	remoteStreams, 
	onToggleVideo, 
	onToggleAudio, 
	isVideoEnabled, 
	isAudioEnabled,
	showControls = true 
}) => {
	const local = localStream ? { id: 'local', stream: localStream, isLocal: true } : null;
	const remotes = Array.from(remoteStreams.entries()).map(([userId, stream]) => ({ id: userId, stream, isLocal: false }));

	const VideoItem = ({ videoData, large = false }) => {
		const { id, stream, isLocal } = videoData;
		const videoRef = React.useRef(null);

		React.useEffect(() => {
			if (videoRef.current && stream) {
				videoRef.current.srcObject = stream;
				videoRef.current.muted = !!isLocal;
				videoRef.current.volume = isLocal ? 0 : 1;
				videoRef.current.play?.().catch(() => {});
			}
		}, [stream, isLocal]);

		const videoOn = !!isVideoEnabled;
		const audioOn = !!isAudioEnabled;

		return (
			<div className={`video-item ${isLocal ? 'local' : 'remote'}`} style={large ? { width: '100%' } : undefined}>
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted={isLocal}
					className="video-stream"
				/>
				<div className="video-info">
					<div className="video-username">
						<span className="icon">{isLocal ? '👤' : '👥'}</span>
						<span>{isLocal ? '나' : `사용자 ${id}`}</span>
					</div>
					<div className="video-status">
						<div className="status-indicator"></div>
					</div>
				</div>
				{isLocal && showControls && (
					<div className="video-controls">
						<button
							onClick={onToggleVideo}
							className={`control-btn ${videoOn ? 'active' : 'inactive'}`}
							title={videoOn ? '비디오 끄기' : '비디오 켜기'}
						>
							{videoOn ? '📹' : '🚫'}
						</button>
						<button
							onClick={onToggleAudio}
							className={`control-btn ${audioOn ? 'active' : 'inactive'}`}
							title={audioOn ? '오디오 끄기' : '오디오 켜기'}
						>
							{audioOn ? '🎤' : '🔇'}
						</button>
					</div>
				)}
			</div>
		);
	};

	if (!local && remotes.length === 0) {
		return (
			<div className="video-grid">
				<div className="video-placeholder">
					<div className="icon">📹</div>
					<div className="message">화상통신이 시작되지 않았습니다</div>
					<div className="subtitle">카메라를 시작하여 화상통신을 시작하세요</div>
				</div>
			</div>
		);
	}

	const firstRemote = remotes.length > 0 ? remotes[0] : null;

	return (
		<div className="video-card">
			<div className="video-card-slot top">
				{local ? (
					<VideoItem videoData={local} />
				) : (
					<div className="video-placeholder"><div className="icon">📹</div><div className="message">내 카메라 없음</div></div>
				)}
			</div>
			<div className="video-card-slot bottom">
				{firstRemote ? (
					<VideoItem videoData={firstRemote} />
				) : (
					<div className="video-placeholder"><div className="icon">👥</div><div className="message">상대 없음</div></div>
				)}
			</div>
		</div>
	);
};

export default VideoGrid;
