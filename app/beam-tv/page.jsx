'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import clsx from 'clsx';

// WS URL computation (same safely fallbacks as video-chat)
const getWsUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_STREAMING_WS_URL;
  if (envUrl) {
    return envUrl.replace(/^ws:\/\//, 'wss://');
  }
  try {
    const restUrl = process.env.NEXT_PUBLIC_STREAMING_SERVICE_URL || 'http://localhost:3006';
    const base = restUrl.replace(/\/v1$/, ''); 
    const wsBase = base.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
    return wsBase + '/streaming/ws';
  } catch (e) {
    return 'ws://localhost:3006/streaming/ws'; 
  }
};

/** Shared RemoteVideoTile for rendering each broadcast participant */
function RemoteVideoTile({ stream, name, age, city, displayPictureUrl }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
  }, [stream]);

  return (
    <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-900', 'border', 'border-white/5', 'shadow-2xl')}>
      <video ref={videoRef} autoPlay playsInline className="h-full w-full min-h-0 object-cover" />

      <div className="absolute top-4 left-5 right-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-[#C7BCB1]/80 backdrop-blur-2xl px-3 py-2 rounded-[2.5rem] border border-white/30 shadow-xl">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 bg-gray-200">
                <img src={displayPictureUrl} className="w-full h-full object-cover" alt="" />
              </div>
            </div>
            <div className="flex flex-col pr-4">
              <span className="text-white text-base font-extrabold tracking-tight leading-tight">
                {name || 'Broadcaster'}{age && age !== '?' ? `, ${age}` : ''}
              </span>
              {(city && city !== 'Unknown') && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-white/90 font-bold flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    {city}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BeamTV() {
  const router = useRouter();
  const WS_URL = getWsUrl();
  const [status, setStatus] = useState('loading'); // loading | connected | empty | error
  const [remoteStreams, setRemoteStreams] = useState([]); // { userId, stream, name, age, etc. }
  const [error, setError] = useState('');
  
  // Track current beamcast room metadata
  const [currentBroadcast, setCurrentBroadcast] = useState(null);
  const [sessionId, setSessionId] = useState('');
  
  const wsRef = useRef(null);
  const deviceRef = useRef(null);
  const recvTransportRef = useRef(null);
  const consumersRef = useRef({});
  const remoteStreamsRef = useRef([]);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    recvTransportRef.current = null;
    consumersRef.current = {};
    setRemoteStreams([]);
  }, []);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Hydrate session id on mount
  useEffect(() => {
    let sid = localStorage.getItem('beamtv_session_id');
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('beamtv_session_id', sid);
    }
    setSessionId(sid);
    
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const fetchNextBroadcast = useCallback(async (sid) => {
    if (!sid) return;
    setStatus('loading');
    cleanup();

    let did = localStorage.getItem('deviceId');
    if (!did) {
      did = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceId', did);
    }

    try {
      const url = `${API.DISCOVERY.GET_BROADCAST_FEED(sid)}&deviceId=${did}`;
      let res;
      try {
        res = await apiRequest(url);
      } catch (err) {
        if (err.message?.includes('401')) {
          console.log('[BeamTV] Auth token expired, retrying anonymously...');
          // Retry the request explicitly without token (anonymous flow)
          res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
        } else {
          throw err;
        }
      }

      if (res.exhausted || !res.broadcast) {
        setStatus('empty');
        return;
      }
      setCurrentBroadcast(res.broadcast);
      connectToBroadcast(res.broadcast.roomId, did);
    } catch (err) {
      console.error('Failed to fetch broadcast feed:', err);
      setError('Could not load broadcasts.');
      setStatus('error');
    }
  }, [cleanup]);

  // Initial fetch
  useEffect(() => {
    if (sessionId) {
      fetchNextBroadcast(sessionId);
    }
  }, [sessionId, fetchNextBroadcast]);

  const handleNext = async () => {
    if (!currentBroadcast || !sessionId) return;
    
    let did = localStorage.getItem('deviceId');
    const url = `${API.DISCOVERY.GET_BROADCAST_FEED(sessionId).split('?')[0]}/../viewed`;
    const payload = JSON.stringify({ roomId: currentBroadcast.roomId, sessionId, deviceId: did });
    let options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    };

    // Mark as viewed
    try {
      await apiRequest(url, options);
    } catch (err) {
      if (err.message?.includes('401')) {
        console.log('[BeamTV] Auth token expired, marking viewed anonymously...');
        await fetch(url, options).catch(() => {});
      } else {
        console.warn('Failed to mark broadcast as viewed:', err);
      }
    }
    fetchNextBroadcast(sessionId);
  };

  const connectToBroadcast = async (roomId, did) => {
    const accessToken = localStorage.getItem('accessToken') || '';
    let userId = 'anonymous:' + did;
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        userId = payload.sub || payload.uid || payload.id;
      } catch (e) {}
    }

    const wsUrlWithAuth = `${WS_URL}?userId=${userId}${accessToken ? `&token=${encodeURIComponent(accessToken)}` : ''}`;
    const ws = new WebSocket(wsUrlWithAuth);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[BeamTV] WS connected, joining as viewer...');
      send({ type: 'join-as-viewer', data: { roomId } });
    };

    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      console.log('[BeamTV] WS message:', msg.type, msg);

      if (msg.type === 'error') {
        console.error('[BeamTV] WS Error:', msg.data);
        setStatus('error');
        setError(msg.data?.error || 'A streaming error occurred.');
        return;
      }

      try {
        await handleSignal(msg, roomId, userId);
      } catch (err) {
        console.error('[BeamTV] Signal handling error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[BeamTV] WebSocket error:', err);
      setStatus('error');
      setError('Connection failed.');
    };

    ws.onclose = () => {
      console.log('[BeamTV] WebSocket closed');
    };
  };

  const handleSignal = async (msg, roomId, userId) => {
    const { type, data } = msg;

    switch (type) {
      case 'viewer-joined': {
        const { Device } = await import('mediasoup-client');
        const device = new Device();
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        deviceRef.current = device;

        setStatus('connected');
        console.log('[BeamTV] Device loaded. Creating viewer transport...');
        send({ type: 'create-viewer-transport', data: { roomId } });
        break;
      }
      case 'viewer-transport-created': {
        const d = deviceRef.current;
        const transport = d.createRecvTransport(data);

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          send({
            type: 'connect-viewer-transport',
            data: { roomId, transportId: transport.id, dtlsParameters }
          });
          callback();
        });

        recvTransportRef.current = transport;

        console.log('[BeamTV] Transport created, fetching broadcast producers...');
        send({ type: 'get-broadcast-producers', data: { roomId } });
        break;
      }
      case 'broadcast-producers': {
        console.log('[BeamTV] Producers found:', data.producers);
        const transport = recvTransportRef.current;
        const d = deviceRef.current;
        if (!transport || !d) return;

        // Consume all found producers (audio + video)
        data.producers.forEach((p) => {
          send({
            type: 'consume-broadcast',
            data: {
              roomId,
              transportId: transport.id,
              producerId: p.producerId,
              rtpCapabilities: d.rtpCapabilities
            }
          });
        });
        break;
      }
      case 'broadcast-consumed': {
        const transport = recvTransportRef.current;
        const consumer = await transport.consume({
          id: data.id,
          producerId: data.producerId,
          kind: data.kind,
          rtpParameters: data.rtpParameters,
          appData: { remoteUserId: data.userId } // Might be undefined depending on backend
        });

        consumersRef.current[consumer.id] = consumer;
        
        // Wait for MediaStreamTrack
        const { track } = consumer;
        
        // Find existing stream object or create new
        // For viewers, sometimes `userId` isn't fully propagated in broadcast-consumed. Use a default if missing.
        const remoteUserId = data.userId || 'broadcaster'; 
        
        setRemoteStreams((prev) => {
          const streamInfo = prev.find((s) => s.userId === remoteUserId);
          if (streamInfo) {
            streamInfo.stream.addTrack(track);
            return [...prev];
          } else {
            const newStream = new MediaStream([track]);
            const newEntry = {
              userId: remoteUserId,
              stream: newStream,
              profileFetched: false,
              name: 'Broadcaster',
              age: '?',
              displayPictureUrl: '/avatar-placeholder.png',
              city: ''
            };
            return [...prev, newEntry];
          }
        });

        // Resume consumer locally
        await consumer.resume();
        break;
      }
      case 'broadcast-stopped':
      case 'room-ended':
      case 'participant-kicked':
        // Handle stream death or user kick nicely => move to next broadcast
        handleNext();
        break;
      default:
        break;
    }
  };

  // Profile hydration for the newly added remoteStreams
  useEffect(() => {
    const fetchProfiles = async () => {
      const needed = remoteStreams.filter(s => !s.profileFetched && s.userId !== 'broadcaster' && !s.userId.startsWith('producer:'));
      for (const streamInfo of needed) {
        try {
          const profileResp = await apiRequest(API.USERS.GET_USER(streamInfo.userId));
          const profile = profileResp?.user || {};
          let age = '?';
          if (profile.dateOfBirth) {
             const dob = new Date(profile.dateOfBirth);
             const now = new Date();
             let years = now.getFullYear() - dob.getFullYear();
             const m = now.getMonth() - dob.getMonth();
             if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
             if (years > 0) age = String(years);
          }
          setRemoteStreams((prev) => prev.map(s => 
            s.userId === streamInfo.userId ? {
              ...s,
              name: profile.username || 'Broadcaster',
              age,
              displayPictureUrl: profile.displayPictureUrl || '/avatar-placeholder.png',
              city: profile.preferredCity || '',
              profileFetched: true
            } : s
          ));
        } catch (e) {
          console.warn('Could not fetch user profile:', e);
        }
      }
    };
    fetchProfiles();
  }, [remoteStreams]);

  return (
    <div className="h-screen w-screen bg-black flex flex-col font-sans overflow-hidden">
      {/* Header element akin to videochat (can swap to any layout inside here) */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white text-3xl font-black tracking-tighter">
          Beam<span className="text-purple-500">TV</span>
        </div>
        <button 
          onClick={() => router.push('/video-chat')} 
          className="text-white/80 font-bold bg-white/10 px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition"
        >
          Exit TV
        </button>
      </div>

      <div className="flex-1 flex p-4 pb-12 mt-16 gap-4 min-h-0 min-w-0">
        {status === 'loading' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 rounded-[2.5rem] border border-white/5 shadow-2xl">
             <div className="w-12 h-12 border-4 border-white/10 border-t-purple-500 rounded-full animate-spin mb-4" />
             <p className="text-white/40 font-bold tracking-widest uppercase">Tuning in...</p>
          </div>
        )}

        {status === 'empty' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 rounded-[2.5rem] border border-white/5 shadow-2xl">
             <div className="text-6xl mb-6 opacity-30">📺</div>
             <p className="text-white/60 font-bold tracking-widest uppercase text-xl mb-2">No Active Broadcasts</p>
             <p className="text-white/30 text-sm mb-8">Come back later or start your own Beamcast in the chat.</p>
             <button 
                onClick={() => fetchNextBroadcast(sessionId)} 
                className="px-8 py-3 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 transition border border-white/20"
             >
               Refresh Channel
             </button>
          </div>
        )}

        {status === 'error' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-950/30 rounded-[2.5rem] border border-red-500/20 shadow-2xl">
             <div className="text-5xl mb-4">⚠️</div>
             <p className="text-red-400 font-bold tracking-widest uppercase mb-6">{error}</p>
             <button 
                onClick={() => fetchNextBroadcast(sessionId)} 
                className="px-8 py-3 bg-red-500/20 text-red-100 font-bold rounded-full hover:bg-red-500/40 transition border border-red-500/30"
             >
               Try Again
             </button>
          </div>
        )}

        {status === 'connected' && remoteStreams.length > 0 && (
          <div className="w-full h-full flex gap-2 relative">
             {remoteStreams.map((s, idx) => (
                <RemoteVideoTile
                  key={`beam-tv-remote-${s.userId}-${idx}`}
                  stream={s.stream}
                  name={s.name}
                  age={s.age}
                  city={s.city}
                  displayPictureUrl={s.displayPictureUrl}
                />
             ))}

             {/* Next Broadcast Button Overlay */}
             <div className="absolute bottom-6 right-6 z-40">
                <button
                  onClick={handleNext}
                  className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-2xl"
                  title="Next Broadcast"
                >
                  <img src="/arrowright.png" className="w-6 h-6 object-contain" alt="Next" />
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
