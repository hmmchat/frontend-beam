'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';

const STREAMING_URL = process.env.NEXT_PUBLIC_STREAMING_SERVICE_URL || 'http://localhost:3005';
const WS_URL = STREAMING_URL.replace('http', 'ws') + '/streaming/ws';

export default function VideoChat() {
  const router = useRouter();
  const [roomInfo, setRoomInfo] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | connected | error
  const [remoteStreams, setRemoteStreams] = useState([]); // { userId, stream, name, age }[]
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [error, setError] = useState('');
  const [localUserInfo, setLocalUserInfo] = useState({ name: 'You', age: '' });
  const [partnerInfo, setPartnerInfo] = useState({ 
    id: '',
    name: 'Matched!', 
    age: '?', 
    city: '', 
    displayPictureUrl: '/avatar-placeholder.png' 
  });
  const [isFriendRequestSent, setIsFriendRequestSent] = useState(false);
  const [isAlreadyFriend, setIsAlreadyFriend] = useState(false);

  const localVideoRef = useRef(null);
  const wsRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const localStreamRef = useRef(null);
  const producersRef = useRef({});
  const consumersRef = useRef({});
  const roomInfoRef = useRef(null);
  const userIdRef = useRef(null);

  // --- Initialize ---
  useEffect(() => {
    let aborted = false;
    const init = async () => {
      console.log('[Init] Starting video chat initialization...');
      let info = null;
      let uid = null;

      const stored = localStorage.getItem('currentRoom');
      console.log('[Init] Stored room info:', stored);
      if (stored) {
        info = JSON.parse(stored);
        console.log('[Init] Parsed room info:', info);
        if (info.partner) {
          // Set initial info from localStorage (fast)
          setPartnerInfo({
            id: info.partner.id || '',
            name: info.partner.username || 'Matched!',
            age: info.partner.age || '',
            city: info.partner.city || '',
            displayPictureUrl: info.partner.displayPictureUrl || '/avatar-placeholder.png'
          });

          // If info is incomplete, fetch full profile (robust)
          if (info.partner.id && (!info.partner.username || !info.partner.city)) {
            try {
              const profile = await apiRequest(API.USERS.GET_USER(info.partner.id));
              setPartnerInfo({
                id: profile.id || info.partner.id,
                name: profile.username || 'Matched!',
                age: profile.age || '',
                city: profile.city || '',
                displayPictureUrl: profile.displayPictureUrl || '/avatar-placeholder.png'
              });
            } catch (err) {
              console.warn('[Init] Failed to fetch partner profile fallback:', err);
            }
          }

          // Check if already friends
          if (info.partner.id) {
            apiRequest(API.FRIENDS.CHECK_FRIENDSHIP(info.partner.id))
              .then(res => {
                if (!aborted) setIsAlreadyFriend(res.areFriends);
              })
              .catch(err => console.warn('[Init] Failed to check friendship status:', err));
          }
        }
      }

      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          uid = payload.sub || payload.uid || payload.id;
          console.log('[Init] User ID from token:', uid);
          setLocalUserInfo({ name: payload.name || 'You', age: payload.age || '' });
        } catch {}
      }

      if (!info?.roomId) {
        console.error('[Init] No room ID found!');
        setStatus('error');
        setError('No active match found.');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      // Yield to event loop so React Strict Mode cleanup can set aborted=true
      // before we create any WebSocket/transport resources
      await new Promise(r => setTimeout(r, 50));
      if (aborted) {
        console.log('[Init] Aborted (React Strict Mode cleanup ran)');
        return;
      }

      console.log('[Init] Starting media and signaling with room:', info.roomId, 'user:', uid);
      userIdRef.current = uid;
      roomInfoRef.current = info;
      setRoomInfo(info);
      startMediaAndSignaling(info, uid);
    };

    init();
    return () => {
      aborted = true;
      cleanup();
    };
  }, [router]);

  const cleanup = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    // Stop local media tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    // Nullify mediasoup refs (don't call .close() — it throws AwaitQueueStoppedError async)
    producersRef.current = {};
    consumersRef.current = {};
    sendTransportRef.current = null;
    recvTransportRef.current = null;
  }, []);

  const send = (msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const startMediaAndSignaling = async (info, userId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Media error:', err);
      // Fallback to signaling anyway so we can see remote if they have camera
    }

    // Fix: Remove duplicate /streaming/ws path
    const ws = new WebSocket(`${WS_URL}?userId=${userId}`);
    wsRef.current = ws;
    console.log('[WebSocket] Connecting to:', `${WS_URL}?userId=${userId}`);

    ws.onopen = () => send({ type: 'join-room', data: { roomId: info.roomId } });
    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      console.log('[WebSocket] Received message:', msg.type, msg);
      if (msg.type === 'error') {
        console.warn('[WS] Error:', msg.data?.error);
        if (msg.data?.error?.includes('not found')) handleStaleRoom();
        return;
      }
      await handleSignal(msg, info, userId);
    };
    ws.onerror = (err) => {
      console.error('[WebSocket] Error:', err);
      setStatus('error');
      setError('WebSocket connection failed');
    };
    ws.onclose = () => {
      console.log('[WebSocket] Connection closed');
    };
  };

  const handleStaleRoom = () => {
    localStorage.removeItem('currentRoom');
    router.push('/');
  };

  const handleSignal = async (msg, info, userId) => {
    const { type, data } = msg;
    console.log('[WebRTC] Handling signal:', type, data);

    switch (type) {
      case 'room-joined': {
        console.log('[WebRTC] Room joined, loading device...');
        const { Device } = await import('mediasoup-client');
        const device = new Device();
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        deviceRef.current = device;
        setStatus('connected');
        console.log('[WebRTC] Device loaded, creating send transport...');
        
        // Step 1: Create Send Transport
        send({ type: 'create-transport', data: { roomId: info.roomId, producing: true, consuming: false } });
        
        // Note: Backend will automatically notify us of existing producers via 'new-producer' events
        // No need to explicitly request producers list
        break;
      }

      case 'producers-list': {
        console.log('[WebRTC] Received producers list:', data);
        // Backend sends list of existing producers (handles race conditions)
        if (!data || !Array.isArray(data)) {
          console.log('[WebRTC] No producers in room yet');
          return;
        }
        
        console.log(`[WebRTC] Found ${data.length} existing producer(s) in room`);
        data.forEach(p => {
          if (p.userId !== userIdRef.current) {
            console.log('[WebRTC] Consuming existing producer:', p.producerId, 'kind:', p.kind, 'from user:', p.userId);
            consume(p.producerId, p.userId);
          } else {
            console.log('[WebRTC] Skipping own producer:', p.producerId);
          }
        });
        break;
      }

      case 'transport-created': {
        console.log('[WebRTC] Transport created:', data.producing ? 'SEND' : 'RECV');
        const { id, iceParameters, iceCandidates, dtlsParameters, producing } = data;
        const device = deviceRef.current;
        
        if (producing) {
          console.log('[WebRTC] Setting up send transport...');
          const transport = device.createSendTransport({ id, iceParameters, iceCandidates, dtlsParameters });
          sendTransportRef.current = transport;
          transport.on('connect', ({ dtlsParameters: dp }, cb) => {
            console.log('[WebRTC] Send transport connecting...');
            send({ type: 'connect-transport', data: { roomId: info.roomId, transportId: id, dtlsParameters: dp } });
            cb();
          });
          transport.on('produce', ({ kind, rtpParameters }, cb) => {
            console.log('[WebRTC] Producing:', kind);
            producersRef.current[`resolve_${kind}`] = cb;
            send({ type: 'produce', data: { roomId: info.roomId, transportId: id, kind, rtpParameters } });
          });

          // After send transport is ready, create the Recv transport
          send({ type: 'create-transport', data: { roomId: info.roomId, producing: false, consuming: true } });

          // Start publishing local media
          if (localStreamRef.current) {
            const vTrack = localStreamRef.current.getVideoTracks()[0];
            const aTrack = localStreamRef.current.getAudioTracks()[0];
            if (vTrack) {
              console.log('[WebRTC] Publishing video track...');
              transport.produce({ track: vTrack }).catch(console.error);
            }
            if (aTrack) {
              console.log('[WebRTC] Publishing audio track...');
              transport.produce({ track: aTrack }).catch(console.error);
            }
          }
        } else {
          console.log('[WebRTC] Setting up receive transport...');
          const transport = device.createRecvTransport({ id, iceParameters, iceCandidates, dtlsParameters });
          recvTransportRef.current = transport;
          transport.on('connect', ({ dtlsParameters: dp }, cb) => {
            console.log('[WebRTC] Recv transport connecting...');
            send({ type: 'connect-transport', data: { roomId: info.roomId, transportId: id, dtlsParameters: dp } });
            cb();
          });
          
          console.log('[WebRTC] Receive transport ready');
          
          // CRITICAL: Request existing producers to handle race conditions
          // If other users produced media before our recv transport was ready,
          // we would have missed their 'new-producer' events
          console.log('[WebRTC] Requesting existing producers to handle race conditions...');
          send({ type: 'get-producers', data: { roomId: info.roomId } });
        }
        break;
      }

      case 'produced': {
        console.log('[WebRTC] Producer created:', data.kind, data.id);
        producersRef.current[`resolve_${data.kind}`]?.({ id: data.id });
        break;
      }

      case 'new-producer': {
        console.log('[WebRTC] New producer available:', data.producerId, 'from user:', data.userId);
        if (!recvTransportRef.current) return;
        consume(data.producerId, data.userId);
        break;
      }

      case 'consumed': {
        console.log('[WebRTC] Consumer created:', data.kind, 'from user:', data.userId);
        const { id, producerId, kind, rtpParameters, userId: remoteId } = data;
        const consumer = await recvTransportRef.current.consume({ id, producerId, kind, rtpParameters });
        consumersRef.current[id] = consumer;
        const stream = new MediaStream([consumer.track]);
        setRemoteStreams(prev => {
          const existing = prev.find(s => s.userId === remoteId);
          if (existing) {
            existing.stream.addTrack(consumer.track);
            return [...prev];
          }
          return [...prev, { userId: remoteId, stream, name: partnerInfo.name, age: partnerInfo.age }];
        });
        console.log('[WebRTC] Remote stream added for user:', remoteId);
        break;
      }
      
      case 'participant-left': {
        console.log('[WebRTC] Participant left:', data.userId);
        setRemoteStreams(prev => prev.filter(s => s.userId !== data.userId));
        break;
      }

      case 'friend-request-sent': {
        console.log('[Friend] Request sent successfully');
        setIsFriendRequestSent(true);
        break;
      }
    }
  };

  const consume = (producerId, remoteUserId) => {
    // If receiving transport isn't ready yet, wait and retry
    if (!recvTransportRef.current) {
      console.log('[WebRTC] Recv transport not ready, retrying consume in 1s...');
      setTimeout(() => consume(producerId, remoteUserId), 1000);
      return;
    }

    send({
      type: 'consume',
      data: {
        roomId: roomInfoRef.current.roomId,
        transportId: recvTransportRef.current.id,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities
      }
    });
  };

  const handleSendFriendRequest = () => {
    if (!roomInfo?.roomId || !partnerInfo.id || isFriendRequestSent) return;
    console.log('[Friend] Sending request to:', partnerInfo.id);
    send({
      type: 'send-friend-request',
      data: {
        roomId: roomInfo.roomId,
        toUserId: partnerInfo.id
      }
    });
  };



  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = isMuted; setIsMuted(!isMuted); }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = isCamOff; setIsCamOff(!isCamOff); }
  };

  const handleLeave = () => {
    cleanup();
    localStorage.removeItem('currentRoom');
    router.push('/');
  };

  return (
    <div className="h-screen w-screen bg-black flex overflow-hidden font-sans">
      {/* Side-by-Side Video Layout */}
      <div className="flex-1 flex p-2 gap-2">
        {/* Remote Person Section */}
        <div className="flex-1 relative rounded-[2rem] overflow-hidden bg-gray-900 border border-white/5 shadow-2xl">
          {remoteStreams.length > 0 ? (
            <video
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              ref={el => { if (el && remoteStreams[0]) el.srcObject = remoteStreams[0].stream; }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
              <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold tracking-widest uppercase">Waiting for match...</p>
            </div>
          )}
          
          {/* Remote Info Overlay */}
          <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              {/* Main Info Capsule */}
              <div className="flex items-center gap-4 bg-[#C7BCB1]/80 backdrop-blur-2xl px-3 py-2 rounded-[2.5rem] border border-white/30 shadow-xl">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 bg-gray-200">
                    <img 
                      src={partnerInfo.displayPictureUrl} 
                      className="w-full h-full object-cover" 
                      alt="" 
                    />
                  </div>
                  {/* Monkey Emoji Overlap */}
                  <div className="absolute -bottom-1.5 -left-1 text-2xl filter drop-shadow-md">
                    🐒
                  </div>
                </div>
                <div className="flex flex-col pr-4">
                  <span className="text-white text-base font-extrabold tracking-tight leading-tight">
                    {partnerInfo.name}, {partnerInfo.age}
                  </span>
                  {partnerInfo.city && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[11px] text-white/90 font-bold flex items-center gap-1">
                        <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        {partnerInfo.city}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Friend Button - Only if not already friend */}
              {!isAlreadyFriend && (
                <button 
                  onClick={handleSendFriendRequest}
                  disabled={isFriendRequestSent}
                  className={`w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center transition-all border-2 border-white/40 shadow-xl active:scale-95 ${
                    isFriendRequestSent 
                      ? 'bg-green-500/50 cursor-default' 
                      : 'bg-[#C7BCB1]/80 hover:bg-[#B7ACA1]'
                  }`}
                >
                  {isFriendRequestSent ? (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-9 h-9 text-white opacity-90" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {[
                { img: '/gravecurrent.png', alt: 'Report' },
                { img: '/smile.png', alt: 'Emoji' },
                { img: '/arrowright.png', alt: 'Skip' }
              ].map((item, idx) => (
                <button 
                  key={idx} 
                  className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border border-white/20"
                >
                  <img src={item.img} className="w-5 h-5 object-contain" alt={item.alt} />
                </button>
              ))}
            </div>
          </div>

          <div className="absolute bottom-6 left-6 text-2xl font-black text-white/40 tracking-tighter uppercase font-[family-name:var(--font-otomanopee)]">
            HMM.
          </div>
          
          <div className="absolute bottom-6 right-6 w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-3xl border border-white/5 animate-pulse">
            🧊
          </div>
        </div>

        {/* Local Section */}
        <div className="flex-1 relative rounded-[2rem] overflow-hidden bg-gray-950 border border-white/5 shadow-2xl">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {isCamOff && (
            <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center text-white/20 font-bold uppercase tracking-widest italic">
              Camera is off
            </div>
          )}

          {/* Chat Bubbles Overlay */}
          <div className="absolute bottom-32 left-6 flex flex-col gap-3 max-w-[70%] z-10">
            {[
              "Lorem ipsum dolor sit amet, consectetur...",
              "Nooooo!",
              "Ut quis urna id ligula Type psum dolor..."
            ].map((text, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-xl px-4 py-2.5 rounded-[1.2rem] text-white text-xs font-bold border border-white/10 shadow-lg animate-in fade-in slide-in-from-left-4 duration-500">
                {text}
              </div>
            ))}
          </div>

          {/* Bottom Controls Overlay */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between z-20">
            <div className="flex gap-4 mb-2">
              <button 
                onClick={toggleCam} 
                className="relative w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 group"
              >
                <img 
                  src="/video.png" 
                  className={`w-5 h-5 object-contain transition-opacity ${isCamOff ? 'opacity-30 brightness-50' : 'opacity-100'}`} 
                  alt="Video" 
                />
                {isCamOff && <div className="absolute inset-0 border-2 border-red-500/50 rounded-full" />}
              </button>
              <button 
                onClick={toggleMic} 
                className="relative w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
              >
                <img 
                  src="/mask.png" 
                  className={`w-5 h-5 object-contain transition-opacity ${isMuted ? 'opacity-30 brightness-50' : 'opacity-100'}`} 
                  alt="Mask" 
                />
                {isMuted && <div className="absolute inset-0 border-2 border-red-500/50 rounded-full" />}
              </button>
              <button 
                className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
              >
                <img 
                  src="/msg.png" 
                  className="w-5 h-5 object-contain" 
                  alt="Message" 
                />
              </button>
            </div>

            <div className="flex gap-4">
              {/* DARE Button - Glossy Design */}
              <button className="group relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
                <img src="/circle.png" className="absolute inset-0 w-full h-full drop-shadow-2xl" alt="" />
                <div className="absolute inset-0 bg-red-600/80 rounded-full mix-blend-overlay -z-10" />
                <img src="/dare.png" className="relative w-8 h-auto drop-shadow-md transition-transform group-hover:rotate-3" alt="DARE" />
              </button>

              {/* GIFT Button - Glossy Design */}
              <button className="group relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
                <img src="/circle.png" className="absolute inset-0 w-full h-full drop-shadow-2xl brightness-110" alt="" />
                <div className="absolute inset-0 bg-pink-600/80 rounded-full mix-blend-overlay -z-10" />
                <img src="/giftboc.png" className="relative w-8 h-8 object-contain drop-shadow-md group-hover:scale-110 transition-transform" alt="GIFT" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {}; 