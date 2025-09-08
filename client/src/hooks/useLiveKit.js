import { useEffect, useRef, useState, useCallback } from 'react';

export const useLiveKit = (user) => {
  const roomRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [tracks, setTracks] = useState([]); // array of { participant, track }

  const join = useCallback(async (roomName = 'default') => {
    if (roomRef.current) return;

    const resp = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, roomName })
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.message || 'Failed to get token');

    const { token, url } = data;
    const LiveKitClient = await import('livekit-client');
    const room = new LiveKitClient.Room();
    roomRef.current = room;

    room.on(LiveKitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === 'video') {
        setTracks(prev => [...prev, { participant, track }]);
      }
    });
    room.on(LiveKitClient.RoomEvent.TrackUnsubscribed, (track) => {
      setTracks(prev => prev.filter(t => t.track !== track));
    });

    await room.connect(url, token);
    await room.localParticipant.setCameraEnabled(true);
    await room.localParticipant.setMicrophoneEnabled(true);
    setConnected(true);
  }, [user]);

  const leave = useCallback(async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch {}
      roomRef.current = null;
    }
    setConnected(false);
    setTracks([]);
  }, []);

  return { connected, tracks, join, leave, room: roomRef.current };
};


