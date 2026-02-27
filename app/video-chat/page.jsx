'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STREAMING_URL = process.env.NEXT_PUBLIC_STREAMING_SERVICE_URL || 'http://localhost:3005';
const WS_URL = STREAMING_URL.replace('http', 'ws');

export default function VideoChat() {
  const router = useRouter();
  const [roomInfo, setRoomInfo] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | connected | error
  const [remoteStreams, setRemoteStreams] = useState([]); // { userId, stream, name, age }[]
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [error, setError] = useState('');
  const [localUserInfo, setLocalUserInfo] = useState({ name: 'You', age: '' });

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
    const init = async () => {
      let info = null;
      let uid = null;

      const stored = localStorage.getItem('currentRoom');
      if (stored) info = JSON.parse(stored);

      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          uid = payload.sub || payload.uid || payload.id;
          setLocalUserInfo({ name: payload.name || 'You', age: payload.age || '' });
        } catch {}
      }

      if (!info?.roomId) {
        setStatus('error');
        setError('No active match found.');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      userIdRef.current = uid;
      roomInfoRef.current = info;
      setRoomInfo(info);
      startMediaAndSignaling(info, uid);
    };

    init();
    return () => cleanup();
  }, [router]);

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(producersRef.current).forEach(p => p.close?.());
    Object.values(consumersRef.current).forEach(c => c.close?.());
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
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

    const ws = new WebSocket(`${WS_URL}/streaming/ws?userId=${userId}`);
    wsRef.current = ws;

    ws.onopen = () => send({ type: 'join-room', data: { roomId: info.roomId } });
    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'error') {
        console.warn('[WS] Error:', msg.data?.error);
        if (msg.data?.error?.includes('not found')) handleStaleRoom();
        return;
      }
      await handleSignal(msg, info, userId);
    };
  };

  const handleStaleRoom = () => {
    localStorage.removeItem('currentRoom');
    router.push('/');
  };

  const handleSignal = async (msg, info, userId) => {
    const { type, data } = msg;

    switch (type) {
      case 'room-joined': {
        const { Device } = await import('mediasoup-client');
        const device = new Device();
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        deviceRef.current = device;
        setStatus('connected');
        
        // Step 1: Create Send Transport
        send({ type: 'create-transport', data: { roomId: info.roomId, producing: true, consuming: false } });
        
        // Step 2: Request existing producers so we can see people already in the room
        send({ type: 'get-producers', data: { roomId: info.roomId } });
        break;
      }

      case 'producers-list': {
        // data looks like [{ producerId, userId }]
        if (!data || !Array.isArray(data)) return;
        data.forEach(p => {
          if (p.userId !== userIdRef.current) {
            consume(p.producerId, p.userId);
          }
        });
        break;
      }

      case 'transport-created': {
        const { id, iceParameters, iceCandidates, dtlsParameters, producing } = data;
        const device = deviceRef.current;
        
        if (producing) {
          const transport = device.createSendTransport({ id, iceParameters, iceCandidates, dtlsParameters });
          sendTransportRef.current = transport;
          transport.on('connect', ({ dtlsParameters: dp }, cb) => {
            send({ type: 'connect-transport', data: { roomId: info.roomId, transportId: id, dtlsParameters: dp } });
            cb();
          });
          transport.on('produce', ({ kind, rtpParameters }, cb) => {
            producersRef.current[`resolve_${kind}`] = cb;
            send({ type: 'produce', data: { roomId: info.roomId, transportId: id, kind, rtpParameters } });
          });

          // After send transport is ready, create the Recv transport
          send({ type: 'create-transport', data: { roomId: info.roomId, producing: false, consuming: true } });

          // Start publishing local media
          if (localStreamRef.current) {
            const vTrack = localStreamRef.current.getVideoTracks()[0];
            const aTrack = localStreamRef.current.getAudioTracks()[0];
            if (vTrack) transport.produce({ track: vTrack }).catch(console.error);
            if (aTrack) transport.produce({ track: aTrack }).catch(console.error);
          }
        } else {
          const transport = device.createRecvTransport({ id, iceParameters, iceCandidates, dtlsParameters });
          recvTransportRef.current = transport;
          transport.on('connect', ({ dtlsParameters: dp }, cb) => {
            send({ type: 'connect-transport', data: { roomId: info.roomId, transportId: id, dtlsParameters: dp } });
            cb();
          });
          
          // Now that recv transport is ready, check if we have pending producers to consume
          console.log('[WebRTC] Receive transport ready');
        }
        break;
      }

      case 'produced': {
        producersRef.current[`resolve_${data.kind}`]?.({ id: data.id });
        break;
      }

      case 'new-producer': {
        if (!recvTransportRef.current) return;
        consume(data.producerId, data.userId);
        break;
      }

      case 'consumed': {
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
          return [...prev, { userId: remoteId, stream, name: 'Matched!', age: '?' }];
        });
        break;
      }
      
      case 'participant-left': {
        setRemoteStreams(prev => prev.filter(s => s.userId !== data.userId));
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
    <div style={styles.container}>
      {/* Side-by-Side Video Layout */}
      <div style={styles.grid}>
        {/* Remote Person Section */}
        <div style={styles.videoSection}>
          {remoteStreams.length > 0 ? (
            <video
              srcObject={remoteStreams[0].stream}
              autoPlay
              playsInline
              style={styles.mainVideo}
              ref={el => { if (el && remoteStreams[0]) el.srcObject = remoteStreams[0].stream; }}
            />
          ) : (
            <div style={styles.placeholder}>
              <div className="loader" />
              <p>Waiting for match...</p>
            </div>
          )}
          
          {/* Remote Info Overlay */}
          <div style={styles.infoOverlayTop}>
            <div style={styles.badge}>
              <img src="/avatar-placeholder.png" style={styles.tinyAvatar} alt="" />
              <span>Sanya, 23</span>
              <div style={styles.addBtn}>+</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={styles.topRightIcons}>
              <div style={styles.iconCircle}>🔔</div>
              <div style={styles.iconCircle}>😊</div>
              <div style={styles.iconCircle}>⏭️</div>
            </div>
          </div>

          <div style={styles.bottomBranding}>HMM.</div>
          <div style={styles.icebreakerPulse}>🧊</div>
        </div>

        {/* Local Section */}
        <div style={styles.videoSection}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ ...styles.mainVideo, transform: 'scaleX(-1)' }}
          />
          {isCamOff && <div style={styles.camOffOverlay}>Camera is off</div>}

          {/* Chat Bubbles Overlay */}
          <div style={styles.chatOverlay}>
            <div style={styles.chatBubble}>Lorem ipsum dolor sit amet, consectetur...</div>
            <div style={styles.chatBubble}>Nooooo!</div>
            <div style={styles.chatBubble}>Ut quis urna id ligula Type psum dolor...</div>
          </div>

          {/* Bottom Controls Overlay */}
          <div style={styles.controlsRow}>
            <div style={styles.mainControls}>
              <button onClick={toggleCam} style={styles.roundAction}>{isCamOff ? '🔇' : '📹'}</button>
              <button onClick={toggleMic} style={styles.roundAction}>{isMuted ? '🔇' : '🎤'}</button>
              <button style={styles.roundAction}>💬</button>
            </div>
            <div style={{ flex: 1 }} />
            <div style={styles.specialActions}>
              <button style={styles.dareBtn}>DARE</button>
              <button style={styles.giftBtn}>🎁</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .loader {
          border: 3px solid rgba(255,255,255,0.1);
          border-top: 3px solid #fff;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    backgroundColor: '#000',
    display: 'flex',
    overflow: 'hidden',
  },
  grid: {
    display: 'flex',
    flex: 1,
    padding: '8px',
    gap: '8px',
  },
  videoSection: {
    flex: 1,
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    backgroundColor: '#111',
    border: '2px solid rgba(255,255,255,0.05)',
  },
  mainVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.5)',
  },
  infoOverlayTop: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(10px)',
    padding: '6px 12px',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff',
    fontSize: '14px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  tinyAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  addBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  topRightIcons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  iconCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(124, 58, 237, 0.8)', // Purple theme
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    cursor: 'pointer',
  },
  bottomBranding: {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    fontSize: '24px',
    fontWeight: '900',
    color: '#fff',
    opacity: 0.8,
    letterSpacing: '1px',
  },
  icebreakerPulse: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    fontSize: '32px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },
  chatOverlay: {
    position: 'absolute',
    bottom: '100px',
    left: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '70%',
  },
  chatBubble: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    padding: '10px 16px',
    borderRadius: '16px',
    color: '#fff',
    fontSize: '13px',
    lineHeight: '1.4',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  controlsRow: {
    position: 'absolute',
    bottom: '24px',
    left: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'flex-end',
  },
  mainControls: {
    display: 'flex',
    gap: '12px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '8px',
    borderRadius: '40px',
    backdropFilter: 'blur(10px)',
  },
  roundAction: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialActions: {
    display: 'flex',
    gap: '12px',
  },
  dareBtn: {
    backgroundColor: '#dc2626', // Red
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
  },
  giftBtn: {
    backgroundColor: '#db2777', // Pink
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '50%',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camOffOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#222',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
  }
};
