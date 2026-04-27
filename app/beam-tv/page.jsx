'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import clsx from 'clsx';
import BroadcastSkeleton from '@/components/beam-tv/BroadcastSkeleton';

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
function RemoteVideoTile({
  stream,
  screenShareStream,
  name,
  age,
  city,
  displayPictureUrl,
  forceMuted,
  showFollow,
  isFollowing,
  onToggleFollow,
  showAddFriend,
  isFriendRequestSent,
  onSendFriendRequest
}) {
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const pipRef = useRef(null);

  useEffect(() => {
    if (screenShareStream) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    const p = v.play?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [stream, screenShareStream]);

  useEffect(() => {
    if (!screenShareStream) return;
    const s = screenRef.current;
    const p = pipRef.current;
    if (s && s.srcObject !== screenShareStream) s.srcObject = screenShareStream;
    if (p && p.srcObject !== stream) p.srcObject = stream;
    const play = (el) => {
      const pr = el?.play?.();
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
    };
    play(s);
    play(p);
  }, [stream, screenShareStream]);

  return (
    <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-900', 'border', 'border-white/5', 'shadow-2xl')}>
      {screenShareStream ? (
        <>
          <video
            ref={screenRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 z-0 h-full w-full bg-black object-contain"
          />
          <video
            ref={pipRef}
            autoPlay
            playsInline
            muted={forceMuted}
            className="absolute bottom-4 right-4 z-[5] aspect-video max-h-[32%] w-[32%] max-w-[220px] rounded-xl border-2 border-white/50 object-cover shadow-2xl"
          />
        </>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted={forceMuted} className="h-full w-full min-h-0 object-cover" />
      )}

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

        <div className="flex items-center gap-2">
          {showFollow && (
            <button
              type="button"
              onClick={onToggleFollow}
              className={clsx(
                'w-12 h-12 rounded-full flex items-center justify-center border shadow-xl active:scale-95 transition',
                isFollowing
                  ? 'bg-pink-500/35 border-pink-300/40 text-pink-50'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              )}
              title={isFollowing ? 'Following broadcaster' : 'Follow broadcaster'}
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.1 21.35l-1.1-1.02C5.14 14.88 2 12.03 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.53-3.14 6.38-8.9 11.83l-1 .92z" />
              </svg>
            </button>
          )}
          {showAddFriend && (
            <button
              type="button"
              onClick={onSendFriendRequest}
              disabled={isFriendRequestSent}
              className={clsx(
                'w-12 h-12 rounded-full flex items-center justify-center border shadow-xl active:scale-95 transition',
                isFriendRequestSent
                  ? 'bg-green-500/30 border-green-400/30 text-green-50'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              )}
              title={isFriendRequestSent ? 'Friend request sent' : 'Add friend'}
            >
              {isFriendRequestSent ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BeamTvLayout({ remoteStreams, renderTile }) {
  const tiles = remoteStreams || [];
  if (tiles.length === 1) {
    return (
      <div className="w-full h-full">
        {renderTile(tiles[0], 0)}
      </div>
    );
  }
  if (tiles.length === 2) {
    return (
      <div className="w-full h-full flex gap-2">
        {renderTile(tiles[0], 0)}
        {renderTile(tiles[1], 1)}
      </div>
    );
  }
  if (tiles.length === 3) {
    return (
      <div className="w-full h-full flex gap-2">
        {renderTile(tiles[0], 0)}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          {renderTile(tiles[1], 1)}
          {renderTile(tiles[2], 2)}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
      {tiles.slice(0, 4).map((t, i) => renderTile(t, i))}
    </div>
  );
}

function BeamTVInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const WS_URL = getWsUrl();
  const roomIdParam = searchParams?.get('roomId') || '';
  const [status, setStatus] = useState('loading'); // loading | connected | empty | error
  const [remoteStreams, setRemoteStreams] = useState([]); // { userId, stream, name, age, etc. }
  const [error, setError] = useState('');
  const [joinState, setJoinState] = useState({ state: 'idle', message: '' }); // idle | requesting | requested | error
  const [engagementMsg, setEngagementMsg] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [favouriteByUserId, setFavouriteByUserId] = useState({});
  const [favouriteProfiles, setFavouriteProfiles] = useState([]); // [{ userId, username, displayPictureUrl, isLive, liveRoomId }]
  const [favouritesPanelOpen, setFavouritesPanelOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true); // default "on" (actual unmute requires user gesture)
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [viewerChatOpen, setViewerChatOpen] = useState(false);
  const [viewerChatInput, setViewerChatInput] = useState('');
  const [chatProfileSheet, setChatProfileSheet] = useState({ open: false, user: null });
  const [chatProfilesByUserId, setChatProfilesByUserId] = useState({});
  const [friendRequestSentTo, setFriendRequestSentTo] = useState({});
  
  // Track current beamcast room metadata
  const [currentBroadcast, setCurrentBroadcast] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [requestedJoin, setRequestedJoin] = useState({ roomId: '', userId: '' }); // for cancel on leave
  
  const wsRef = useRef(null);
  const deviceRef = useRef(null);
  const recvTransportRef = useRef(null);
  const consumersRef = useRef({});
  const producerUserIdByProducerIdRef = useRef({});
  const producerIdToMetaRef = useRef(new Map());
  const remoteStreamsRef = useRef([]);
  const broadcastProducersRetryRef = useRef({ roomId: '', tries: 0, timer: null });
  const lastSwipeAtRef = useRef(0);
  const touchStartYRef = useRef(null);
  const touchStartAtRef = useRef(0);
  const broadcastStartedAtRef = useRef(null);
  const loopingRef = useRef(false);
  const lastInitialFetchKeyRef = useRef('');
  const chatProfileCacheRef = useRef(new Map());
  const transitionLockRef = useRef(false);
  const [feedTransitionPhase, setFeedTransitionPhase] = useState('idle'); // idle | out | pre-in | in

  const cleanup = useCallback((opts = {}) => {
    const { preserveStreams = false } = opts || {};
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    recvTransportRef.current = null;
    consumersRef.current = {};
    producerUserIdByProducerIdRef.current = {};
    producerIdToMetaRef.current.clear();
    if (broadcastProducersRetryRef.current.timer) {
      clearTimeout(broadcastProducersRetryRef.current.timer);
      broadcastProducersRetryRef.current.timer = null;
    }
    if (!preserveStreams) setRemoteStreams([]);
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

  const rotateFeedSession = useCallback(() => {
    // Backend feed is "viewed per sessionId". To get infinite scroll (especially with 1 live broadcast),
    // rotate sessionId to start the feed over.
    const sid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('beamtv_session_id', sid);
    return sid;
  }, []);

  const fetchNextBroadcast = useCallback(async (sid, opts = {}) => {
    if (!sid) return;
    const { preserveUi = false } = opts || {};
    if (!preserveUi) setStatus('loading');

    let did = localStorage.getItem('deviceId');
    if (!did) {
      did = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceId', did);
    }

    try {
      const url = API.DISCOVERY.GET_BROADCAST_FEED(sid, did);
      let res;
      try {
        res = await apiRequest(url);
      } catch (err) {
        const msg = (err && err.message ? String(err.message) : '').toLowerCase();
        if (err?.status === 401 || msg.includes('401') || msg.includes('unauthorized')) {
          console.log('[BeamTV] Auth token expired, retrying anonymously...');
          // Retry the request explicitly without token (anonymous flow)
          res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
        } else {
          throw err;
        }
      }

      if (res.exhausted || !res.broadcast) {
        // If we already have an active broadcast, don't tear it down—just keep playing it.
        // Infinite mode: if feed is exhausted, rotate session and retry once.
        if (!loopingRef.current) {
          loopingRef.current = true;
          const newSid = rotateFeedSession();
          await fetchNextBroadcast(newSid, { preserveUi: true });
          loopingRef.current = false;
          return;
        }
        // Still exhausted after rotating: transition to explicit empty state.
        cleanup({ preserveStreams: preserveUi });
        broadcastStartedAtRef.current = null;
        setCurrentBroadcast(null);
        setStatus('empty');
        loopingRef.current = false;
        return;
      }

      // If backend returns the same broadcast room again (common when only 1 live stream),
      // do NOT cleanup/reconnect. Just keep playing.
      const nextRoomId = String(res.broadcast.roomId || '');
      const currentRoomId = String(currentBroadcast?.roomId || '');
      if (nextRoomId && currentRoomId && nextRoomId === currentRoomId) {
        setCurrentBroadcast(res.broadcast);
        broadcastStartedAtRef.current = Date.now();
        setStatus('connected');
        loopingRef.current = false;
        return;
      }

      // Switching to a new room: now cleanup + reconnect.
      cleanup({ preserveStreams: preserveUi });
      broadcastStartedAtRef.current = Date.now();
      setCurrentBroadcast(res.broadcast);
      connectToBroadcast(nextRoomId, did);
      loopingRef.current = false;
    } catch (err) {
      console.error('Failed to fetch broadcast feed:', err);
      setError('Could not load broadcasts.');
      setStatus('error');
      loopingRef.current = false;
    }
  }, [cleanup, rotateFeedSession, currentBroadcast?.roomId]);

  const fetchBroadcastByRoomId = useCallback(async (roomId, opts = {}) => {
    if (!roomId) return false;
    const { preserveUi = false } = opts || {};
    if (!preserveUi) setStatus('loading');
    try {
      const res = await fetch(API.DISCOVERY.GET_BROADCAST(roomId), {
        headers: { 'Content-Type': 'application/json' }
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
      // Backend returns the broadcast object directly (not wrapped).
      const broadcast = res?.broadcast?.roomId ? res.broadcast : res;
      if (!broadcast?.roomId) return false;
      const nextRoomId = String(broadcast.roomId || '');
      const currentRoomId = String(currentBroadcast?.roomId || '');
      if (nextRoomId && currentRoomId && nextRoomId === currentRoomId) {
        // Already playing this room; avoid reconnect.
        setCurrentBroadcast(broadcast);
        broadcastStartedAtRef.current = Date.now();
        setStatus('connected');
        return true;
      }

      cleanup({ preserveStreams: preserveUi });
      broadcastStartedAtRef.current = Date.now();
      setCurrentBroadcast(broadcast);
      let did = localStorage.getItem('deviceId');
      if (!did) {
        did = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('deviceId', did);
      }
      connectToBroadcast(nextRoomId, did);
      return true;
    } catch (_) {
      return false;
    }
  }, [cleanup, currentBroadcast?.roomId]);

  // Initial fetch
  useEffect(() => {
    if (!sessionId) return;

    // `useSearchParams()` can change identity across renders; guard so we don't
    // repeatedly tear down + re-fetch the same session/room, which causes flicker.
    const key = `${sessionId}:${roomIdParam}`;
    if (lastInitialFetchKeyRef.current === key) return;
    lastInitialFetchKeyRef.current = key;

    if (roomIdParam) {
      // Deep link: try to play this broadcaster first; fallback to feed.
      fetchBroadcastByRoomId(roomIdParam).then((ok) => {
        if (!ok) fetchNextBroadcast(sessionId);
      });
    } else {
      fetchNextBroadcast(sessionId);
    }
  }, [sessionId, roomIdParam, fetchNextBroadcast, fetchBroadcastByRoomId]);

  const cancelJoinIfNeeded = useCallback(async () => {
    const roomId = requestedJoin.roomId;
    const userId = requestedJoin.userId;
    if (!roomId || !userId) return;
    try {
      await apiRequest(API.STREAMING.CANCEL_JOIN_REQUEST(roomId), {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
    } catch (_) {}
    setRequestedJoin({ roomId: '', userId: '' });
    setJoinState({ state: 'idle', message: '' });
  }, [requestedJoin.roomId, requestedJoin.userId]);

  const proceedToNextBroadcast = useCallback(async () => {
    if (!currentBroadcast || !sessionId) return;
    // If user was in waitlist for this broadcast, remove them before switching.
    await cancelJoinIfNeeded();
    
    let did = localStorage.getItem('deviceId');
    const durationMs = broadcastStartedAtRef.current ? Math.max(0, Date.now() - broadcastStartedAtRef.current) : undefined;
    const payload = JSON.stringify({
      roomId: currentBroadcast.roomId,
      sessionId,
      deviceId: did,
      duration: durationMs != null ? Math.round(durationMs / 1000) : undefined
    });
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    };

    // Mark as viewed
    try {
      await apiRequest(API.DISCOVERY.MARK_BROADCAST_VIEWED, options);
    } catch (err) {
      const msg = (err && err.message ? String(err.message) : '').toLowerCase();
      if (err?.status === 401 || msg.includes('401') || msg.includes('unauthorized')) {
        console.log('[BeamTV] Auth token expired, marking viewed anonymously...');
        await fetch(API.DISCOVERY.MARK_BROADCAST_VIEWED, options).catch(() => {});
      } else {
        console.warn('Failed to mark broadcast as viewed:', err);
      }
    }
    // Keep current broadcast visible while we load next.
    await fetchNextBroadcast(sessionId, { preserveUi: true });
  }, [cancelJoinIfNeeded, currentBroadcast, fetchNextBroadcast, sessionId]);

  const runFeedScrollTransition = useCallback(async (action = proceedToNextBroadcast) => {
    if (transitionLockRef.current) return;
    transitionLockRef.current = true;
    try {
      setFeedTransitionPhase('out');
      await new Promise((r) => setTimeout(r, 220));
      await action();
      setFeedTransitionPhase('pre-in');
      requestAnimationFrame(() => setFeedTransitionPhase('in'));
      await new Promise((r) => setTimeout(r, 260));
      setFeedTransitionPhase('idle');
    } finally {
      transitionLockRef.current = false;
    }
  }, [proceedToNextBroadcast]);

  const handleNext = useCallback(() => {
    if (!currentBroadcast || !sessionId) return;
    runFeedScrollTransition();
  }, [currentBroadcast, runFeedScrollTransition, sessionId]);

  const connectToBroadcast = async (roomId, did) => {
    const accessToken = localStorage.getItem('accessToken') || '';
    let userId = 'anonymous:' + did;
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        userId = payload.sub || payload.uid || payload.id;
      } catch (e) {}
    }

    // Backend requires either token or deviceId for anonymous access on WS connection
    const qs = new URLSearchParams();
    qs.set('userId', userId);
    qs.set('deviceId', did);
    if (accessToken) qs.set('token', accessToken);
    const wsUrlWithAuth = `${WS_URL}?${qs.toString()}`;
    const ws = new WebSocket(wsUrlWithAuth);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[BeamTV] WS connected, joining as viewer...');
      // Guard against accidental re-joins to the same room (can happen during fast UI transitions)
      const conn = wsRef.current;
      if (conn && conn.__joinedRoomId === roomId) return;
      if (conn) conn.__joinedRoomId = roomId;
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

  // If host accepts this user from waitlist, backend moves them into the call.
  // We can detect that by polling "am I in a room?" and redirect to call screen.
  useEffect(() => {
    if (joinState.state !== 'requested') return;
    const uid = requestedJoin.userId || getAuthedUserId();
    if (!uid) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const room = await apiRequest(API.STREAMING.GET_USER_ROOM(uid));
        // IMPORTANT: GET_USER_ROOM returns exists=true for both viewers and participants.
        // Only redirect when the backend marks the user as a *participant* (host accepted from waitlist).
        if (room?.exists && room?.roomId && room?.role === 'participant') {
          // Store room so /video-chat can resume
          localStorage.setItem('currentRoom', JSON.stringify({ roomId: room.roomId, sessionId: room.sessionId || room.roomId }));
          router.push('/video-chat');
        }
      } catch (_) {}
    };
    const id = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [joinState.state, requestedJoin.userId]);

  const getAuthedUserId = () => {
    const accessToken = localStorage.getItem('accessToken') || '';
    if (!accessToken) return null;
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      return payload.sub || payload.uid || payload.id || null;
    } catch (_) {
      return null;
    }
  };

  const isLoggedIn = () => Boolean(getAuthedUserId());

  const getMyDisplayName = () => {
    const accessToken = localStorage.getItem('accessToken') || '';
    if (!accessToken) return 'You';
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      return payload.username || payload.name || 'You';
    } catch (_) {
      return 'You';
    }
  };

  const getParticipantIdSet = () => {
    const ids = new Set();
    const ps = currentBroadcast?.participants || [];
    if (Array.isArray(ps)) {
      ps.forEach((p) => {
        if (p?.userId) ids.add(String(p.userId));
      });
    }
    return ids;
  };

  const getBroadcasterIdSet = () => {
    const ids = new Set();
    (remoteStreamsRef.current || []).forEach((s) => {
      const uid = String(s?.userId || '');
      if (uid && uid !== 'broadcaster' && !uid.startsWith('producer:')) ids.add(uid);
    });
    return ids;
  };

  const resolveChatName = (senderId, isParticipant) => {
    const sid = String(senderId || '');
    const me = String(getAuthedUserId() || '');
    if (sid && me && sid === me) return getMyDisplayName();
    const rs = remoteStreamsRef.current || [];
    const match = rs.find((s) => String(s?.userId || '') === sid);
    if (match?.name) return match.name;
    return isParticipant ? 'Host' : 'Viewer';
  };

  const isValidChatUserId = (uid) => {
    const id = String(uid || '');
    return Boolean(id && id !== 'broadcaster' && !id.startsWith('producer:') && !id.startsWith('anonymous:'));
  };

  const getStreamProfileByUserId = (uid) => {
    const id = String(uid || '');
    const s = (remoteStreamsRef.current || []).find((x) => String(x?.userId || '') === id);
    if (!s) return null;
    return {
      id,
      username: s.name || 'User',
      displayPictureUrl: s.displayPictureUrl || '/avatar-placeholder.png',
      preferredCity: s.city || ''
    };
  };

  const ensureChatProfile = async (uid) => {
    const id = String(uid || '');
    if (!isValidChatUserId(id)) return null;
    if (chatProfileCacheRef.current.has(id)) return chatProfileCacheRef.current.get(id);
    const streamProfile = getStreamProfileByUserId(id);
    if (streamProfile) {
      chatProfileCacheRef.current.set(id, streamProfile);
      return streamProfile;
    }
    try {
      const resp = await apiRequest(API.USERS.GET_USER(id));
      const u = resp?.user || resp?.data?.user || null;
      if (u) {
        const mapped = {
          id: String(u.id || id),
          username: u.username || 'User',
          displayPictureUrl: u.displayPictureUrl || '/avatar-placeholder.png',
          preferredCity: u.preferredCity || ''
        };
        chatProfileCacheRef.current.set(id, mapped);
      setChatProfilesByUserId((prev) => ({ ...prev, [id]: mapped }));
        return mapped;
      }
    } catch (_) {}
    return null;
  };

  const openChatProfileSheet = async (uid) => {
    const id = String(uid || '');
    if (!isValidChatUserId(id)) return;
    const p = (await ensureChatProfile(id)) || {
      id,
      username: resolveChatName(id, false),
      displayPictureUrl: '/avatar-placeholder.png',
      preferredCity: ''
    };
    setChatProfileSheet({ open: true, user: p });
  };

  // Prime current user's profile so "You" avatar is always available.
  useEffect(() => {
    const myId = String(getAuthedUserId() || '');
    if (!myId) return;
    if (chatProfileCacheRef.current.has(myId)) return;
    (async () => {
      try {
        const meResp = await apiRequest(API.USERS.GET_ME);
        const me = meResp?.user || meResp || null;
        if (!me) return;
        const mapped = {
          id: String(me.id || myId),
          username: me.username || getMyDisplayName() || 'You',
          displayPictureUrl: me.displayPictureUrl || '/avatar-placeholder.png',
          preferredCity: me.preferredCity || ''
        };
        chatProfileCacheRef.current.set(myId, mapped);
        setChatProfilesByUserId((prev) => ({ ...prev, [myId]: mapped }));
      } catch (_) {}
    })();
  }, []);

  const toggleFavouriteBroadcaster = async (targetUserId) => {
    const uid = String(targetUserId || '');
    if (!uid || uid === 'broadcaster' || uid.startsWith('producer:')) return;
    if (!isLoggedIn()) {
      setEngagementMsg('Please sign in to follow broadcasters.');
      return;
    }
    const isFav = Boolean(favouriteByUserId[uid]);
    try {
      if (isFav) {
        await apiRequest(API.STREAMING.REMOVE_FAVOURITE_BROADCASTER(uid), { method: 'DELETE' });
        setFavouriteByUserId((prev) => ({ ...prev, [uid]: false }));
        setEngagementMsg('Removed from favourites.');
      } else {
        await apiRequest(API.STREAMING.ADD_FAVOURITE_BROADCASTER, {
          method: 'POST',
          body: JSON.stringify({ targetUserId: uid })
        });
        setFavouriteByUserId((prev) => ({ ...prev, [uid]: true }));
        setEngagementMsg('Added to favourite broadcasts.');
      }
    } catch (e) {
      setEngagementMsg(e?.message || 'Follow action failed.');
    }
  };

  const sendViewerChat = (e) => {
    e?.preventDefault?.();
    const roomId = currentBroadcast?.roomId;
    const msg = String(viewerChatInput || '').trim();
    if (!roomId || !msg) return;
    if (!isLoggedIn()) {
      setEngagementMsg('Please sign in to chat.');
      return;
    }
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setEngagementMsg('Chat unavailable. Reconnecting…');
      return;
    }
    send({ type: 'chat-message', data: { roomId, message: msg } });
    setViewerChatInput('');
  };

  const handleShare = async () => {
    const roomId = currentBroadcast?.roomId;
    if (!roomId) return;
    const did = localStorage.getItem('deviceId') || '';
    // Track share event (auth optional)
    try {
      const body = JSON.stringify({ shareType: 'link', deviceId: did || undefined });
      // apiRequest includes auth header if logged in; otherwise it still works if endpoint is public.
      await apiRequest(API.DISCOVERY.SHARE_BROADCAST(roomId), { method: 'POST', body });
    } catch (_) {}

    const link = `${window.location.origin}/beam-tv?roomId=${encodeURIComponent(roomId)}`;
    setShareUrl(link);
    setShareOpen(true);
    try {
      await navigator.clipboard.writeText(link);
      setEngagementMsg('Link copied.');
    } catch (_) {
      setEngagementMsg('Share recorded.');
    }
  };

  const refreshFavouriteProfiles = useCallback(async () => {
    if (!isLoggedIn()) {
      setFavouriteProfiles([]);
      return;
    }
    try {
      const res = await apiRequest(API.STREAMING.GET_FAVOURITES_WITH_LIVE_STATUS(100));
      const items = Array.isArray(res?.favourites) ? res.favourites : [];
      setFavouriteProfiles(items);
      const map = {};
      items.forEach((f) => {
        const uid = String(f?.userId || '');
        if (uid) map[uid] = true;
      });
      setFavouriteByUserId((prev) => ({ ...prev, ...map }));
    } catch (error) {
      // Fallback for environments where the new endpoint isn't available yet.
      try {
        const liveRes = await apiRequest(API.STREAMING.GET_FAVOURITE_BROADCASTERS(100));
        const broadcasts = Array.isArray(liveRes?.broadcasts) ? liveRes.broadcasts : [];
        const seen = new Set();
        const fallbackItems = [];
        broadcasts.forEach((b) => {
          const roomId = String(b?.roomId || '');
          const participants = Array.isArray(b?.participants) ? b.participants : [];
          participants.forEach((p) => {
            const uid = String(p?.userId || '');
            if (!uid || seen.has(uid)) return;
            seen.add(uid);
            fallbackItems.push({
              userId: uid,
              username: p?.username || null,
              displayPictureUrl: p?.displayPictureUrl || null,
              age: p?.age ?? null,
              isLive: true,
              liveRoomId: roomId
            });
          });
        });
        setFavouriteProfiles(fallbackItems);
      } catch (fallbackError) {
        console.warn('[BeamTV] Failed to load favourites strip', { error, fallbackError });
        setFavouriteProfiles([]);
        setEngagementMsg('Could not load favourites. Please re-login and try again.');
      }
    }
  }, []);

  const handleFavouriteAvatarClick = useCallback(async (fav) => {
    const uid = String(fav?.userId || '');
    if (!uid) return;
    if (!fav?.isLive || !fav?.liveRoomId) {
      return;
    }
    const targetRoomId = String(fav.liveRoomId);
    if (!targetRoomId) return;
    if (transitionLockRef.current) return;
    transitionLockRef.current = true;
    try {
      setFeedTransitionPhase('out');
      await new Promise((r) => setTimeout(r, 220));
      if (String(currentBroadcast?.roomId || '') !== targetRoomId) {
        await cancelJoinIfNeeded();
      }
      await fetchBroadcastByRoomId(targetRoomId, { preserveUi: true });
      setFeedTransitionPhase('pre-in');
      requestAnimationFrame(() => setFeedTransitionPhase('in'));
      await new Promise((r) => setTimeout(r, 260));
      setFeedTransitionPhase('idle');
    } finally {
      transitionLockRef.current = false;
    }
  }, [cancelJoinIfNeeded, currentBroadcast?.roomId, fetchBroadcastByRoomId]);

  const sortedFavouriteProfiles = useMemo(() => {
    const items = Array.isArray(favouriteProfiles) ? [...favouriteProfiles] : [];
    return items.sort((a, b) => {
      const aLive = a?.isLive ? 1 : 0;
      const bLive = b?.isLive ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive; // live first
      const aName = String(a?.username || '').toLowerCase();
      const bName = String(b?.username || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [favouriteProfiles]);

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setEngagementMsg('Link copied.');
    } catch (_) {
      setEngagementMsg('Could not copy link.');
    }
  };


  const handleJoinBroadcast = async () => {
    if (!currentBroadcast?.roomId) return;
    const userId = getAuthedUserId();
    if (!userId) {
      setJoinState({ state: 'error', message: 'Please sign in to join.' });
      return;
    }
    setJoinState({ state: 'requesting', message: '' });
    try {
      await apiRequest(API.STREAMING.REQUEST_TO_JOIN_BROADCAST(currentBroadcast.roomId), {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      setJoinState({ state: 'requested', message: 'Requested to join. Waiting for host…' });
      setRequestedJoin({ roomId: currentBroadcast.roomId, userId: String(userId) });
    } catch (e) {
      setJoinState({ state: 'error', message: e?.message || 'Failed to request join.' });
    }
  };

  // If user closes tab / navigates away while waitlisted, cancel request so waitlist count stays accurate.
  useEffect(() => {
    const onBeforeUnload = () => {
      if (!requestedJoin.roomId || !requestedJoin.userId) return;
      try {
        const token = localStorage.getItem('accessToken');
        fetch(API.STREAMING.CANCEL_JOIN_REQUEST(requestedJoin.roomId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ userId: requestedJoin.userId }),
          keepalive: true
        }).catch(() => {});
      } catch (_) {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [requestedJoin.roomId, requestedJoin.userId]);

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

        // Producers can race with broadcast start / produce. Retry a few times if none arrive.
        broadcastProducersRetryRef.current.roomId = roomId;
        broadcastProducersRetryRef.current.tries = 0;
        const schedule = () => {
          if (broadcastProducersRetryRef.current.timer) clearTimeout(broadcastProducersRetryRef.current.timer);
          broadcastProducersRetryRef.current.timer = setTimeout(() => {
            // Stop retry if we already have streams
            if ((remoteStreamsRef.current?.length || 0) > 0) return;
            if (wsRef.current?.readyState !== WebSocket.OPEN) return;
            if (broadcastProducersRetryRef.current.roomId !== roomId) return;
            broadcastProducersRetryRef.current.tries += 1;
            if (broadcastProducersRetryRef.current.tries > 6) return;
            send({ type: 'get-broadcast-producers', data: { roomId } });
            schedule();
          }, 1500);
        };
        schedule();
        break;
      }
      case 'broadcast-producers': {
        console.log('[BeamTV] Producers found:', data.producers);
        const transport = recvTransportRef.current;
        const d = deviceRef.current;
        if (!transport || !d) return;

        const list = Array.isArray(data?.producers) ? data.producers : [];
        if (list.length === 0) {
          // Retry if producers not ready yet
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            setTimeout(() => send({ type: 'get-broadcast-producers', data: { roomId } }), 1200);
          }
          break;
        }

        // Consume all found producers (audio + video)
        list.forEach((p) => {
          if (p?.producerId && p?.userId) {
            producerUserIdByProducerIdRef.current[p.producerId] = p.userId;
          }
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

        const { track } = consumer;
        const remoteUserId = producerUserIdByProducerIdRef.current?.[data.producerId] || 'broadcaster';
        const vSource =
          data.kind === 'video' ? data.source || 'camera' : 'audio';
        producerIdToMetaRef.current.set(String(data.producerId), {
          userId: remoteUserId,
          source: vSource
        });

        setRemoteStreams((prev) => {
          const streamInfo = prev.find((s) => s.userId === remoteUserId);
          if (data.kind === 'video' && vSource === 'screen') {
            if (streamInfo) {
              return prev.map((s) => {
                if (s.userId !== remoteUserId) return s;
                const oldSs = s.screenStream;
                oldSs?.getTracks().forEach((t) => t.stop());
                return { ...s, screenStream: new MediaStream([track]) };
              });
            }
            const newEntry = {
              userId: remoteUserId,
              stream: new MediaStream(),
              screenStream: new MediaStream([track]),
              profileFetched: false,
              name: 'Broadcaster',
              age: '?',
              displayPictureUrl: '/avatar-placeholder.png',
              city: '',
              forceMuted: !(soundEnabled && audioUnlocked)
            };
            return [...prev, newEntry];
          }
          if (streamInfo) {
            const next = prev.map((s) =>
              s.userId === remoteUserId
                ? { ...s, stream: new MediaStream([...s.stream.getTracks(), track]) }
                : s
            );
            return next;
          }
          const newStream = new MediaStream([track]);
          const newEntry = {
            userId: remoteUserId,
            stream: newStream,
            profileFetched: false,
            name: 'Broadcaster',
            age: '?',
            displayPictureUrl: '/avatar-placeholder.png',
            city: '',
            forceMuted: !(soundEnabled && audioUnlocked)
          };
          return [...prev, newEntry];
        });

        await consumer.resume();
        break;
      }

      case 'producer-closed': {
        const closedPid = data?.producerId != null ? String(data.producerId) : '';
        if (!closedPid) break;
        const meta = producerIdToMetaRef.current.get(closedPid);
        let foundCid = null;
        let foundConsumer = null;
        for (const cid of Object.keys(consumersRef.current)) {
          const c = consumersRef.current[cid];
          if (c && String(c.producerId) === closedPid) {
            foundCid = cid;
            foundConsumer = c;
            break;
          }
        }
        if (foundConsumer) {
          try {
            foundConsumer.close();
          } catch (_) {}
          delete consumersRef.current[foundCid];
        }
        if (meta) {
          producerIdToMetaRef.current.delete(closedPid);
          const tr = foundConsumer?.track;
          setRemoteStreams((prev) =>
            prev.map((s) => {
              if (s.userId !== meta.userId) return s;
              if (meta.source === 'screen') {
                const ss = s.screenStream;
                ss?.getTracks().forEach((t) => t.stop());
                return { ...s, screenStream: null };
              }
              if (tr) {
                const kept = s.stream.getTracks().filter((t) => t.id !== tr.id);
                return { ...s, stream: new MediaStream(kept) };
              }
              return s;
            })
          );
        }
        break;
      }
      case 'chat-message': {
        const participantIds = getParticipantIdSet();
        const broadcasterIds = getBroadcasterIdSet();
        const senderId = String(data?.userId || '');
        const message = String(data?.message || '').trim();
        if (!message) break;
        const isParticipant = Boolean(senderId && (broadcasterIds.has(senderId) || participantIds.has(senderId)));
        const name = resolveChatName(senderId, isParticipant);
        const streamProfile = getStreamProfileByUserId(senderId);
        const cachedProfile = chatProfileCacheRef.current.get(senderId);
        const avatarUrl = cachedProfile?.displayPictureUrl || streamProfile?.displayPictureUrl || '/avatar-placeholder.png';
        // Lazy-fetch sender profile so avatar and profile sheet are available for viewer chat senders too.
        if (isValidChatUserId(senderId) && !chatProfileCacheRef.current.has(senderId)) {
          ensureChatProfile(senderId);
        }
        setChatMessages((prev) => {
          const next = [
            ...prev,
            {
              id: data?.id || `${Date.now()}_${Math.random()}`,
              userId: senderId,
              name,
              message,
              isParticipant,
              avatarUrl
            }
          ];
          return next.slice(-8);
        });
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

  // Keep a ref in sync for retry logic (avoid stale closures)
  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  // Standby mode: when empty, quietly poll for a new live broadcast (no UI flicker).
  useEffect(() => {
    if (!sessionId) return;
    if (status !== 'empty') return;
    const id = setInterval(() => {
      fetchNextBroadcast(sessionId, { preserveUi: true });
    }, 3000);
    return () => clearInterval(id);
  }, [status, sessionId, fetchNextBroadcast]);

  // Seed favourite state from backend favourite-broadcasters list.
  useEffect(() => {
    if (!isLoggedIn()) return;
    if (status !== 'connected') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest(API.STREAMING.GET_FAVOURITE_BROADCASTERS(100));
        const list = Array.isArray(res?.broadcasts) ? res.broadcasts : (Array.isArray(res) ? res : []);
        const next = {};
        list.forEach((b) => {
          const participants = Array.isArray(b?.participants) ? b.participants : [];
          participants.forEach((p) => {
            const id = String(p?.userId || '');
            if (id) next[id] = true;
          });
        });
        if (!cancelled) {
          setFavouriteByUserId((prev) => ({ ...prev, ...next }));
        }
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
    };
  }, [status, currentBroadcast?.roomId]);

  // Fetch complete favourites strip (both live + offline) and keep live badges fresh.
  useEffect(() => {
    if (!isLoggedIn()) return;
    refreshFavouriteProfiles();
    const id = setInterval(() => {
      refreshFavouriteProfiles();
    }, 8000);
    return () => clearInterval(id);
  }, [status, currentBroadcast?.roomId, refreshFavouriteProfiles]);

  // Keep tiles' muted state in sync with global sound toggle
  useEffect(() => {
    setRemoteStreams((prev) => prev.map((s) => ({ ...s, forceMuted: !(soundEnabled && audioUnlocked) })));
  }, [soundEnabled, audioUnlocked]);

  const toggleSound = () => {
    // Unlock on first click (gesture), then allow toggling on/off.
    if (!audioUnlocked) setAudioUnlocked(true);
    setSoundEnabled((v) => !v);
  };

  const handleSendFriendRequest = async (toUserId) => {
    const tid = String(toUserId || '');
    if (!tid || tid === 'broadcaster' || tid.startsWith('producer:')) return;
    if (!isLoggedIn()) {
      setEngagementMsg('Please sign in to add friend.');
      return;
    }
    if (friendRequestSentTo[tid]) return;
    try {
      await apiRequest(API.FRIENDS.SEND_FRIEND_REQUEST, {
        method: 'POST',
        body: JSON.stringify({ toUserId: tid })
      });
      setFriendRequestSentTo((prev) => ({ ...prev, [tid]: true }));
      setEngagementMsg('Friend request sent.');
    } catch (e) {
      setEngagementMsg(e?.message || 'Failed to send request.');
    }
  };

  const renderTile = (tile, idx) => {
    const uid = String(tile?.userId || '');
    const showAddFriend = isLoggedIn() && uid && uid !== 'broadcaster' && !uid.startsWith('producer:');
    const showFollow = isLoggedIn() && uid && uid !== 'broadcaster' && !uid.startsWith('producer:');
    const { screenStream: tileScreen, ...tileRest } = tile || {};
    return (
      <RemoteVideoTile
        key={`beam-tile-${uid}-${idx}`}
        {...tileRest}
        screenShareStream={tileScreen || null}
        forceMuted={tile.forceMuted}
        showFollow={showFollow}
        isFollowing={Boolean(favouriteByUserId[uid])}
        onToggleFollow={() => toggleFavouriteBroadcaster(uid)}
        showAddFriend={showAddFriend}
        isFriendRequestSent={Boolean(friendRequestSentTo[uid])}
        onSendFriendRequest={() => handleSendFriendRequest(uid)}
      />
    );
  };

  const trySwipeNext = useCallback(() => {
    const now = Date.now();
    // Throttle swipes so wheel inertia doesn't skip multiple broadcasts.
    if (now - lastSwipeAtRef.current < 900) return;
    lastSwipeAtRef.current = now;
    handleNext();
  }, [handleNext]);

  // TikTok-like navigation: wheel + touch swipe up to go next
  useEffect(() => {
    const onWheel = (e) => {
      if (status !== 'connected') return;
      // Only treat strong downward wheel as swipe-to-next
      if (e.deltaY > 40) {
        e.preventDefault();
        trySwipeNext();
      }
    };
    const onTouchStart = (e) => {
      if (status !== 'connected') return;
      const t = e.touches?.[0];
      if (!t) return;
      touchStartYRef.current = t.clientY;
      touchStartAtRef.current = Date.now();
    };
    const onTouchMove = (e) => {
      if (status !== 'connected') return;
      // prevent rubber band scrolling on iOS while swiping
      if (touchStartYRef.current != null) e.preventDefault();
    };
    const onTouchEnd = (e) => {
      if (status !== 'connected') return;
      const startY = touchStartYRef.current;
      touchStartYRef.current = null;
      if (startY == null) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dy = t.clientY - startY; // swipe up => negative
      const dt = Date.now() - (touchStartAtRef.current || 0);
      // quick swipe up to go next
      if (dy < -80 && dt < 900) {
        trySwipeNext();
      }
    };

    // Capture + non-passive to allow preventDefault
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [status, trySwipeNext]);

  return (
    <div className="h-screen w-screen bg-black flex flex-col font-sans overflow-hidden">
      {/* Header element akin to videochat (can swap to any layout inside here) */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white text-3xl font-black tracking-tighter">
          Beam<span className="text-purple-500">TV</span>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn() && (
            <button
              type="button"
              onClick={() => setFavouritesPanelOpen((v) => !v)}
              className="text-white font-black bg-purple-700/55 px-5 py-2 rounded-full border border-white/30 hover:bg-purple-600/70 transition tracking-wide"
            >
              Broadcasting rn
            </button>
          )}
          <button 
            onClick={() => router.push('/')} 
            className="text-white/80 font-bold bg-white/10 px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition"
          >
            Exit TV
          </button>
        </div>
      </div>

      {isLoggedIn() && favouritesPanelOpen && (
        <div className="absolute top-20 right-28 z-50 w-[560px] max-w-[90vw] rounded-[2.2rem] border border-white/25 bg-[#390f87]/88 backdrop-blur-xl shadow-2xl p-5">
          <div className="max-h-[360px] overflow-y-auto pr-1">
            {sortedFavouriteProfiles.length === 0 && (
              <div className="text-white/70 text-sm font-bold py-6 text-center">No favourites yet.</div>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
              {sortedFavouriteProfiles.map((fav) => {
            const uid = String(fav?.userId || '');
            if (!uid) return null;
            const isLive = Boolean(fav?.isLive && fav?.liveRoomId);
            return (
              <button
                key={`fav-strip-${uid}`}
                type="button"
                disabled={!isLive}
                onClick={() => handleFavouriteAvatarClick(fav)}
                className={clsx(
                  'relative w-[84px] h-[84px] rounded-2xl overflow-hidden border-2 transition-all',
                  isLive
                    ? 'border-pink-400/90 shadow-[0_0_18px_rgba(236,72,153,0.55)] hover:scale-105 cursor-pointer'
                    : 'border-white/35 opacity-45 cursor-not-allowed'
                )}
                title={isLive ? 'Live now - open broadcast' : 'Offline'}
              >
                <img
                  src={fav?.displayPictureUrl || '/avatar-placeholder.png'}
                  alt={fav?.username || 'Favourite'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/avatar-placeholder.png';
                  }}
                />
                {isLive && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.9)]" />
                )}
              </button>
            );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex p-4 pb-12 mt-16 gap-4 min-h-0 min-w-0">
        <div
          className={clsx(
            "w-full h-full transition-transform duration-300 ease-out",
            feedTransitionPhase === 'out' && '-translate-y-[110%]',
            feedTransitionPhase === 'pre-in' && 'translate-y-[110%] transition-none',
            feedTransitionPhase === 'in' && 'translate-y-0'
          )}
        >
        {status === 'loading' && (
          <BroadcastSkeleton />
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
          <div className="w-full h-full relative">
             <BeamTvLayout remoteStreams={remoteStreams} renderTile={renderTile} />

             {/* Next Broadcast Button Overlay */}
             <div className="absolute bottom-6 right-6 z-40">
                <button
                  onClick={handleNext}
                  disabled={feedTransitionPhase !== 'idle'}
                  className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-2xl"
                  title="Next Broadcast"
                >
                  <img src="/arrowright.png" className="w-6 h-6 object-contain" alt="Next" />
                </button>
             </div>

             {/* Hint */}
             <div className="absolute bottom-7 left-6 z-40 text-white/40 text-xs font-bold tracking-widest uppercase select-none">
               Swipe up / scroll for next
             </div>

             {/* Sound toggle */}
             <div className="absolute bottom-6 left-6 z-40">
               <button
                 type="button"
                 onClick={toggleSound}
                 className={clsx(
                   'px-4 py-2 rounded-full font-black text-xs border backdrop-blur-2xl transition',
                   soundEnabled ? 'bg-green-500/20 text-green-100 border-green-400/30' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                 )}
                 title={soundEnabled ? (audioUnlocked ? 'Sound on' : 'Tap to enable sound') : 'Sound off'}
               >
                 {soundEnabled ? 'Sound on' : 'Sound off'}
               </button>
             </div>

             {/* Realtime chat overlay */}
             <div className="absolute bottom-24 left-6 z-40 flex flex-col gap-2 max-w-[60%] pointer-events-none">
               {chatMessages.map((m) => (
                 <div
                   key={m.id}
                   className={clsx(
                     'rounded-[1.2rem] text-xs border backdrop-blur-xl shadow-2xl flex items-start gap-3 p-2',
                     m.isParticipant
                       ? 'bg-yellow-300/80 border-yellow-200 text-black ring-2 ring-yellow-200/80 shadow-[0_0_38px_rgba(253,224,71,0.62)]'
                       : 'bg-white/12 border-white/12 text-white'
                   )}
                 >
                   <button
                     type="button"
                     onClick={() => openChatProfileSheet(m.userId)}
                     className="pointer-events-auto w-10 h-10 rounded-full overflow-hidden border-2 border-white/70 bg-gray-200 shrink-0"
                     title="Open profile"
                   >
                     <img
                       src={chatProfilesByUserId[String(m.userId || '')]?.displayPictureUrl || m.avatarUrl || '/avatar-placeholder.png'}
                       alt={m.name || 'User'}
                       className="w-full h-full object-cover"
                       onError={(e) => {
                         e.currentTarget.onerror = null;
                         e.currentTarget.src = '/avatar-placeholder.png';
                       }}
                     />
                   </button>
                   <div className="min-w-0 flex-1">
                     {m.isParticipant && (
                       <div className="text-[11px] font-black tracking-wide text-black/80 mb-0.5 truncate">
                         {m.name}
                       </div>
                     )}
                     <div className={clsx('font-bold leading-tight break-words', m.isParticipant ? 'text-black' : 'text-white')}>
                       {m.message}
                     </div>
                   </div>
                 </div>
               ))}
             </div>

             {/* Viewer chat button + input (logged in only) */}
             <div className="absolute bottom-6 left-40 z-40">
               <button
                 type="button"
                 onClick={() => {
                   if (!isLoggedIn()) {
                     setEngagementMsg('Please sign in to chat.');
                     return;
                   }
                   setViewerChatOpen((v) => !v);
                 }}
                 className="w-12 h-12 rounded-full bg-white/10 border border-white/20 text-white font-black hover:bg-white/20"
                 title="Chat"
               >
                 <img src="/msg.png" className="w-5 h-5 object-contain mx-auto" alt="Chat" />
               </button>
             </div>

             {viewerChatOpen && (
               <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[62] w-full max-w-xl px-4" onClick={(e) => e.stopPropagation()}>
                 <div className="bg-black/60 backdrop-blur-2xl border border-white/15 rounded-[1.6rem] p-3 shadow-2xl">
                   <form onSubmit={sendViewerChat} className="flex gap-2 items-center">
                     <input
                       value={viewerChatInput}
                       onChange={(e) => setViewerChatInput(e.target.value)}
                       placeholder="Type a message…"
                       className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm outline-none"
                       autoFocus
                     />
                     <button
                       type="submit"
                       disabled={!viewerChatInput.trim()}
                       className="px-5 py-3 rounded-2xl bg-purple-600/60 border border-purple-400/30 text-white font-black text-sm disabled:opacity-40"
                     >
                       Send
                     </button>
                   </form>
                   <div className="mt-2 text-white/40 text-[11px] font-bold">
                     Broadcaster messages are highlighted.
                   </div>
                 </div>
               </div>
             )}

             {/* Join / Waitlist */}
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
               <button
                 onClick={handleJoinBroadcast}
                 disabled={joinState.state === 'requesting' || joinState.state === 'requested'}
                 className={clsx(
                   'px-6 py-3 rounded-full font-black tracking-wide border shadow-2xl backdrop-blur-2xl transition',
                   joinState.state === 'requested'
                     ? 'bg-green-500/20 text-green-100 border-green-400/30'
                     : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
                   (joinState.state === 'requesting') && 'opacity-60 cursor-not-allowed'
                 )}
               >
                 {joinState.state === 'requesting'
                   ? 'Requesting…'
                   : joinState.state === 'requested'
                     ? 'Requested'
                     : 'Join'}
               </button>
               {joinState.message && (
                 <div className={clsx('text-xs font-bold', joinState.state === 'error' ? 'text-red-300' : 'text-white/50')}>
                   {joinState.message}
                 </div>
               )}
             </div>

            {/* Share button */}
            <div className="absolute top-24 right-6 z-40 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="w-12 h-12 rounded-full bg-white/10 border border-white/20 text-white font-black hover:bg-white/20"
                title="Share"
              >
                ↗
              </button>
            </div>

             {engagementMsg && (
               <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-black/70 border border-white/15 text-white/80 text-xs font-bold px-4 py-2 rounded-full">
                 {engagementMsg}
               </div>
             )}

            

             {/* Viewer share sheet */}
             {shareOpen && (
               <div className="absolute inset-0 z-[65] bg-black/40 backdrop-blur-sm flex items-end justify-center p-4" onClick={() => setShareOpen(false)}>
                 <div className="w-full max-w-xl bg-gray-950/80 border border-white/10 rounded-[2rem] p-5" onClick={(e) => e.stopPropagation()}>
                   <div className="flex items-center justify-between mb-3">
                     <div className="text-white font-black tracking-wider">Share link</div>
                     <button type="button" onClick={() => setShareOpen(false)} className="w-10 h-10 rounded-full bg-white/10 border border-white/15 text-white/80 hover:bg-white/15">✕</button>
                   </div>
                   <div className="flex gap-2 items-center">
                     <input
                       readOnly
                       value={shareUrl}
                       className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-white/80 text-xs font-mono outline-none"
                     />
                     <button
                       type="button"
                       onClick={copyShareUrl}
                       className="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white font-black text-xs hover:bg-white/15"
                     >
                       Copy
                     </button>
                   </div>
                 </div>
               </div>
             )}

             {/* Chat profile card (friend-request only) */}
             {chatProfileSheet.open && chatProfileSheet.user && (
               <div className="absolute inset-0 z-[68] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setChatProfileSheet({ open: false, user: null })}>
                 <div className="w-full max-w-sm bg-gray-950/85 border border-white/15 rounded-[2rem] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                   <div className="flex items-center justify-between mb-4">
                     <div className="text-white font-black tracking-wider">Profile</div>
                     <button
                       type="button"
                       onClick={() => setChatProfileSheet({ open: false, user: null })}
                       className="w-9 h-9 rounded-full bg-white/10 border border-white/15 text-white/80 hover:bg-white/15"
                     >
                       ✕
                     </button>
                   </div>
                   <div className="flex items-center gap-4 mb-5">
                     <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-300/80 bg-gray-200">
                       <img src={chatProfileSheet.user.displayPictureUrl || '/avatar-placeholder.png'} alt={chatProfileSheet.user.username || 'User'} className="w-full h-full object-cover" />
                     </div>
                     <div className="min-w-0">
                       <div className="text-white text-xl font-black truncate">{chatProfileSheet.user.username || 'User'}</div>
                       {!!chatProfileSheet.user.preferredCity && (
                         <div className="text-white/55 text-xs font-bold truncate">{chatProfileSheet.user.preferredCity}</div>
                       )}
                     </div>
                   </div>
                   <button
                     type="button"
                     disabled={!isLoggedIn() || Boolean(friendRequestSentTo[String(chatProfileSheet.user.id || '')])}
                     onClick={() => handleSendFriendRequest(chatProfileSheet.user.id)}
                     className="w-full px-4 py-3 rounded-2xl bg-green-500/25 text-green-100 border border-green-400/40 font-black text-sm hover:bg-green-500/35 disabled:opacity-45"
                   >
                     {!isLoggedIn()
                       ? 'Sign in to send request'
                       : Boolean(friendRequestSentTo[String(chatProfileSheet.user.id || '')])
                         ? 'Friend request sent'
                         : 'Send friend request'}
                   </button>
                 </div>
               </div>
             )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default function BeamTV() {
  return (
    <Suspense fallback={<div className="w-full h-[100dvh] bg-black" />}>
      <BeamTVInner />
    </Suspense>
  );
}
