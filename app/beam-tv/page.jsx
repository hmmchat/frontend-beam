'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { submitUserReport, resolveInCallReportType } from '@/lib/report-user';
import { exitBeamTvViewer, exitBeamTvViewerKeepalive } from '@/lib/discovery-presence';
import clsx from 'clsx';
import BroadcastSkeleton from '@/components/beam-tv/BroadcastSkeleton';
import BroadcastHud from '@/components/VideoChat/BroadcastHud';
import ParticipantCluster from '@/components/beam-tv/ParticipantCluster';
import RemoteVideoTile from '@/components/beam-tv/RemoteVideoTile';
import BeamTvLayout from '@/components/beam-tv/BeamTvLayout';
import ChatMessagesOverlay from '@/components/beam-tv/ChatMessagesOverlay';
import BeamTVActions from '@/components/beam-tv/BeamTVActions';
import ShareSheet from '@/components/beam-tv/ShareSheet';
import ChatProfileCard from '@/components/beam-tv/ChatProfileCard';
import LikedBroadcastersModal from '@/components/beam-tv/LikedBroadcastersModal';
import FavouritesPanel from '@/components/beam-tv/FavouritesPanel';

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
const buildWsUrl = (baseUrl, params = {}) => {
  const [base, query = ''] = String(baseUrl || '').split('?');
  const qs = new URLSearchParams(query);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      qs.set(key, String(value));
    }
  });
  const queryString = qs.toString();
  return queryString ? `${base}?${queryString}` : base;
};
const getRerouteWsUrl = (reroute, fallbackUrl) => {
  const raw = reroute?.wsUrl || reroute?.httpUrl;
  if (!raw) return fallbackUrl;
  const wsUrl = String(raw)
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')
    .replace(/\/+$/, '');
  return wsUrl.includes('/streaming/ws') ? wsUrl : `${wsUrl}/streaming/ws`;
};

const isRealtimeDebugEnabled = () =>
  process.env.NEXT_PUBLIC_REALTIME_DEBUG === 'true';

const realtimeDebug = (...args) => {
  if (isRealtimeDebugEnabled()) console.log(...args);
};

const isMobileRuntime = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(max-width: 767px)').matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator?.userAgent || '')
  );
};

const getPreferredBroadcastLayers = ({ kind, source } = {}) => {
  if (kind !== 'video') return undefined;
  if (!isMobileRuntime()) {
    return { spatialLayer: 2, temporalLayer: 2 };
  }
  return source === 'screen'
    ? { spatialLayer: 1, temporalLayer: 2 }
    : { spatialLayer: 0, temporalLayer: 2 };
};



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
  const [reportedUserIds, setReportedUserIds] = useState(new Set());

  const [broadcastHud, setBroadcastHud] = useState({
    viewerCount: 0,
    waitlistCount: 0,
    lastShareMsg: '',
    shareOpen: false,
    shareUrl: ''
  });
  const [showLikedModal, setShowLikedModal] = useState(false);
  const [likedBroadcasters, setLikedBroadcasters] = useState([]);
  
  // Track current beamcast room metadata
  const [currentBroadcast, setCurrentBroadcast] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [requestedJoin, setRequestedJoin] = useState({ roomId: '', userId: '' }); // for cancel on leave
  
  const wsRef = useRef(null);
  const deviceRef = useRef(null);
  const recvTransportRef = useRef(null);
  const consumersRef = useRef({});
  const consumingProducerIdsRef = useRef(new Set());
  const consumedProducerIdsRef = useRef(new Set());
  const consumeRetryTimeoutsRef = useRef(new Map());
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
  const sfuRerouteAttemptRef = useRef(0);
  const [feedTransitionPhase, setFeedTransitionPhase] = useState('idle'); // idle | out | pre-in | in

  const cleanup = useCallback((opts = {}) => {
    const { preserveStreams = false } = opts || {};
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    Object.values(consumersRef.current || {}).forEach((consumer) => {
      try {
        consumer?.track?.stop?.();
        consumer?.close?.();
      } catch (_) {}
    });
    try {
      recvTransportRef.current?.close?.();
    } catch (_) {}
    consumeRetryTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
    consumeRetryTimeoutsRef.current.clear();
    consumingProducerIdsRef.current.clear();
    consumedProducerIdsRef.current.clear();
    if (!preserveStreams) {
      remoteStreamsRef.current?.forEach((s) => {
        s?.stream?.getTracks?.().forEach((t) => t.stop());
        s?.screenStream?.getTracks?.().forEach((t) => t.stop());
      });
      remoteStreamsRef.current = [];
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

  const consumeBroadcastProducer = useCallback((roomId, producerId, rtpCapabilities, producerMeta = {}) => {
    const producerKey = String(producerId || '');
    if (!roomId || !producerKey || !rtpCapabilities) return;
    if (consumedProducerIdsRef.current.has(producerKey) || consumingProducerIdsRef.current.has(producerKey)) {
      return;
    }

    const transport = recvTransportRef.current;
    if (!transport) {
      if (!consumeRetryTimeoutsRef.current.has(producerKey)) {
        const tid = setTimeout(() => {
          consumeRetryTimeoutsRef.current.delete(producerKey);
          consumeBroadcastProducer(roomId, producerKey, rtpCapabilities, producerMeta);
        }, 750);
        consumeRetryTimeoutsRef.current.set(producerKey, tid);
      }
      return;
    }

    consumingProducerIdsRef.current.add(producerKey);
    const preferredLayers = getPreferredBroadcastLayers(producerMeta);
    send({
      type: 'consume-broadcast',
      data: {
        roomId,
        transportId: transport.id,
        producerId: producerKey,
        rtpCapabilities,
        ...(preferredLayers ? { preferredLayers } : {})
      }
    });
  }, [send]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const applyVisibilityPolicy = () => {
      const hidden = document.hidden;
      Object.values(consumersRef.current || {}).forEach((consumer) => {
        if (consumer?.kind !== 'video') return;
        try {
          if (hidden) {
            consumer.pause?.();
          } else {
            consumer.resume?.();
          }
        } catch (_) {}
      });
    };
    document.addEventListener('visibilitychange', applyVisibilityPolicy);
    applyVisibilityPolicy();
    return () => document.removeEventListener('visibilitychange', applyVisibilityPolicy);
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
      void exitBeamTvViewer();
    };
  }, [cleanup]);

  // Sync HUD metrics with current broadcast
  useEffect(() => {
    if (currentBroadcast) {
      setBroadcastHud(prev => ({
        ...prev,
        viewerCount: currentBroadcast.viewerCount || 0,
        waitlistCount: currentBroadcast.waitlistCount || 0
      }));
    }
  }, [currentBroadcast]);

  const fetchLikedBroadcasters = useCallback(async () => {
    try {
      const res = await apiRequest(API.STREAMING.GET_FAVOURITE_BROADCASTERS(100));
      setLikedBroadcasters(res.broadcasts || []);
    } catch (err) {
      console.error('Failed to fetch liked broadcasters:', err);
    }
  }, []);

  const openLikedModal = () => {
    fetchLikedBroadcasters();
    setShowLikedModal(true);
  };

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

    sfuRerouteAttemptRef.current = 0;

    // Backend requires either token or deviceId for anonymous access on WS connection.
    // roomId lets the API gateway route the initial WebSocket upgrade to the owning SFU node.
    const openBroadcastSocket = (baseUrl = WS_URL) => {
      const wsUrlWithAuth = buildWsUrl(baseUrl, {
        userId,
        deviceId: did,
        roomId,
        ...(accessToken ? { token: accessToken } : {})
      });
      const ws = new WebSocket(wsUrlWithAuth);
      wsRef.current = ws;

      ws.onopen = () => {
        realtimeDebug('[BeamTV] WS connected, joining as viewer...');
        // Guard against accidental re-joins to the same room (can happen during fast UI transitions)
        const conn = wsRef.current;
        if (conn && conn.__joinedRoomId === roomId) return;
        if (conn) conn.__joinedRoomId = roomId;
        send({ type: 'join-as-viewer', data: { roomId } });
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        realtimeDebug('[BeamTV] WS message:', msg.type, msg);

        if (msg.type === 'room-reroute') {
          if (sfuRerouteAttemptRef.current >= 2) {
            setStatus('error');
            setError('Could not route broadcast to the assigned media server.');
            return;
          }
          sfuRerouteAttemptRef.current += 1;
          const rerouteUrl = getRerouteWsUrl(msg.data, WS_URL);
          try {
            ws.onclose = null;
            ws.close();
          } catch (_) {}
          openBroadcastSocket(rerouteUrl);
          return;
        }

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
        realtimeDebug('[BeamTV] WebSocket closed');
      };
    };

    openBroadcastSocket();
  };

  // If host accepts this user from waitlist, backend moves them into the call.
  // We can detect that by polling "am I in a room?" and redirect to call screen.
  useEffect(() => {
    if (joinState.state !== 'requested') return;
    const uid = requestedJoin.userId || getAuthedUserId();
    if (!uid) return;
    let cancelled = false;
    let intervalId = null;
    const tick = async () => {
      if (cancelled) return;
      try {
        const room = await apiRequest(API.STREAMING.GET_USER_ROOM(uid));
        // IMPORTANT: GET_USER_ROOM returns exists=true for both viewers and participants.
        // Only redirect when the backend marks the user as a *participant* (host accepted from waitlist).
        if (room?.exists && room?.roomId && room?.role === 'participant') {
          // Stop polling immediately — prevent double-redirect
          cancelled = true;
          if (intervalId) clearInterval(intervalId);

          // Tell streaming WS not to remove our new participant row when this Beam TV tab closes.
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            try {
              send({
                type: 'preserve-participant-on-close',
                data: { roomId: room.roomId }
              });
            } catch (_) {}
          }

          // Align user-service status with broadcast vs squad (backend sets IN_BROADCAST on accept).
          const targetStatus = room.isBroadcasting ? 'IN_BROADCAST' : 'IN_SQUAD';
          try {
            const token = localStorage.getItem('accessToken');
            if (token) {
              await fetch(`${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/me/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: targetStatus })
              });
            }
          } catch (_) {}

          // Build partner info from current broadcast participants (best effort)
          const participants = currentBroadcast?.participants || room.participants || [];
          const partner = participants.find(p => String(p?.userId || '') !== String(uid));

          // room.id is the session DB id (roomDetails spreads `id`, not `sessionId`)
          localStorage.setItem('currentRoom', JSON.stringify({
            roomId: room.roomId,
            sessionId: room.id || room.roomId,
            callType: room.isBroadcasting ? 'broadcast' : 'squad',
            ...(partner ? {
              partner: {
                id: partner.userId || '',
                username: partner.username || 'Host',
                age: partner.age || '',
                city: partner.city || '',
                displayPictureUrl: partner.displayPictureUrl || '/avatar-placeholder.png',
              }
            } : {})
          }));
          try {
            sessionStorage.setItem('waitlistJoinRedirect', '1');
          } catch (_) {}
          router.push('/video-chat');
        }
      } catch (_) {}
    };
    intervalId = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [joinState.state, requestedJoin.userId, currentBroadcast]);

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
      displayPictureUrl: s.displayPictureUrl ,
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
          displayPictureUrl: u.displayPictureUrl ,
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
          displayPictureUrl: me.displayPictureUrl,
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
    setBroadcastHud((prev) => ({ ...prev, shareOpen: true, shareUrl: link }));
    try {
      await navigator.clipboard.writeText(link);
      setEngagementMsg('Link copied.');
      setBroadcastHud((prev) => ({ ...prev, lastShareMsg: 'Link copied.' }));
      setTimeout(() => setBroadcastHud((prev) => ({ ...prev, lastShareMsg: '' })), 2000);
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
    const url = shareUrl || broadcastHud.shareUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setEngagementMsg('Link copied.');
      setBroadcastHud((prev) => ({ ...prev, lastShareMsg: 'Link copied.' }));
      setTimeout(() => setBroadcastHud((prev) => ({ ...prev, lastShareMsg: '' })), 2000);
    } catch (_) {
      setEngagementMsg('Could not copy link.');
      setBroadcastHud((prev) => ({ ...prev, lastShareMsg: 'Could not copy link.' }));
      setTimeout(() => setBroadcastHud((prev) => ({ ...prev, lastShareMsg: '' })), 2000);
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
      exitBeamTvViewerKeepalive();
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
    window.addEventListener('pagehide', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onBeforeUnload);
    };
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
        realtimeDebug('[BeamTV] Device loaded. Creating viewer transport...');
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

        realtimeDebug('[BeamTV] Transport created, fetching broadcast producers...');
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
        realtimeDebug('[BeamTV] Producers found:', data.producers);
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
          consumeBroadcastProducer(roomId, p.producerId, d.rtpCapabilities, {
            kind: p.kind,
            source: p.source
          });
        });
        break;
      }
      case 'new-producer': {
        const producerId = data?.producerId;
        if (!producerId || !deviceRef.current) break;
        if (data?.userId) {
          producerUserIdByProducerIdRef.current[producerId] = data.userId;
        }
        consumeBroadcastProducer(roomId, producerId, deviceRef.current.rtpCapabilities, {
          kind: data.kind,
          source: data.source
        });
        break;
      }
      case 'broadcast-consumed': {
        const producerKey = String(data.producerId || '');
        if (producerKey) {
          consumingProducerIdsRef.current.delete(producerKey);
          consumedProducerIdsRef.current.add(producerKey);
        }
        const transport = recvTransportRef.current;
        const consumer = await transport.consume({
          id: data.id,
          producerId: data.producerId,
          kind: data.kind,
          rtpParameters: data.rtpParameters,
          appData: { remoteUserId: data.userId }
        });

        consumersRef.current[consumer.id] = consumer;
        consumer.on?.('transportclose', () => {
          delete consumersRef.current[consumer.id];
        });
        consumer.track.onended = () => {
          delete consumersRef.current[consumer.id];
          consumedProducerIdsRef.current.delete(String(data.producerId || ''));
        };

        const { track } = consumer;
        const remoteUserId = data.userId || producerUserIdByProducerIdRef.current?.[data.producerId] || 'broadcaster';
        if (data.userId) {
          producerUserIdByProducerIdRef.current[data.producerId] = data.userId;
        }
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
            const existingTracks = streamInfo.stream
              .getTracks()
              .filter((existingTrack) => existingTrack.readyState !== 'ended' && existingTrack.kind !== track.kind);
            const next = prev.map((s) =>
              s.userId === remoteUserId
                ? { ...s, stream: new MediaStream([...existingTracks, track]) }
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
        consumingProducerIdsRef.current.delete(closedPid);
        consumedProducerIdsRef.current.delete(closedPid);
        const retryTid = consumeRetryTimeoutsRef.current.get(closedPid);
        if (retryTid) clearTimeout(retryTid);
        consumeRetryTimeoutsRef.current.delete(closedPid);
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
  const remoteUserIdsKey = useMemo(
    () => remoteStreams.map((s) => String(s.userId || '')).filter(Boolean).sort().join('|'),
    [remoteStreams]
  );

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
    // Profile hydration should run when the participant set changes, not when tracks are appended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteUserIdsKey]);

  // Keep a ref in sync for retry logic (avoid stale closures)
  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  // Standby mode: when empty, quietly poll for a new live broadcast (no UI flicker).
  useEffect(() => {
    if (!sessionId) return;
    if (status !== 'empty') return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
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
      if (typeof document !== 'undefined' && document.hidden) return;
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

  const handleReportUser = async (reportedUserId) => {
    const tid = String(reportedUserId || '');
    if (!tid || tid === 'broadcaster' || tid.startsWith('producer:')) {
      setEngagementMsg('Cannot report this user.');
      return;
    }
    if (!isLoggedIn()) {
      setEngagementMsg('Please sign in to report user.');
      return;
    }
    if (reportedUserIds.has(tid)) {
      setEngagementMsg('You have already reported this user.');
      return;
    }
    const roomId = currentBroadcast?.roomId;
    const participant = (currentBroadcast?.participants || []).find(
      (p) => String(p?.userId || '') === tid
    );
    const reportType = resolveInCallReportType(participant?.role);
    try {
      const res = await submitUserReport({
        reportedUserId: tid,
        reportType,
        roomId,
      });
      if (res.success) {
        setReportedUserIds((prev) => new Set([...prev, tid]));
        setEngagementMsg('User reported successfully.');
      } else {
        setEngagementMsg('Failed to report user.');
      }
    } catch (e) {
      setEngagementMsg(e?.message || 'Failed to report user.');
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
        userId={uid}
        isReported={reportedUserIds.has(uid)}
        onReportUser={handleReportUser}
        {...tileRest}
        screenShareStream={tileScreen || null}
        forceMuted={tile.forceMuted}
        showFollow={showFollow}
        isFollowing={Boolean(favouriteByUserId[uid])}
        onToggleFollow={() => toggleFavouriteBroadcaster(uid)}
        showAddFriend={showAddFriend}
        isFriendRequestSent={Boolean(friendRequestSentTo[uid])}
        onSendFriendRequest={() => handleSendFriendRequest(uid)}
        allParticipants={remoteStreams}
        isFirst={idx === 0}
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

      {isLoggedIn() && favouritesPanelOpen && (
        <FavouritesPanel 
          favouriteProfiles={sortedFavouriteProfiles} 
          onAvatarClick={handleFavouriteAvatarClick} 
        />
      )}

      {/* p-2 on mobile, p-4 on desktop — matches video-chat spacing */}
      <div className="flex-1 flex p-2 md:p-4 gap-2 md:gap-4 min-h-0 min-w-0">
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



             {/* Sound toggle */}
             <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 z-40">
               <button
                 type="button"
                 onClick={toggleSound}
                 className={clsx(
                   'px-3 md:px-4 py-1.5 md:py-2 rounded-full font-black text-xs border backdrop-blur-2xl transition',
                   soundEnabled ? 'bg-green-500/20 text-green-100 border-green-400/30' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                 )}
                 title={soundEnabled ? (audioUnlocked ? 'Sound on' : 'Tap to enable sound') : 'Sound off'}
               >
                 {soundEnabled ? '🔊' : '🔇'}
                 <span className="hidden md:inline ml-1">{soundEnabled ? 'Sound on' : 'Sound off'}</span>
               </button>
             </div>

             {/* Realtime chat overlay */}
             <ChatMessagesOverlay 
               chatMessages={chatMessages} 
               chatProfilesByUserId={chatProfilesByUserId} 
               openChatProfileSheet={openChatProfileSheet} 
             />
             {/* Bottom Right Actions: Chat Input, Join, Gift */}
              <BeamTVActions 
                viewerChatInput={viewerChatInput}
                setViewerChatInput={setViewerChatInput}
                sendViewerChat={sendViewerChat}
                joinState={joinState}
                handleJoinBroadcast={handleJoinBroadcast}
              />

             {engagementMsg && (
               <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-black/70 border border-white/15 text-white/80 text-xs font-bold px-4 py-2 rounded-full">
                 {engagementMsg}
               </div>
             )}

            

             {/* Viewer share sheet */}
             {shareOpen && (
               <ShareSheet 
                 shareUrl={shareUrl} 
                 copyShareUrl={copyShareUrl} 
                 setShareOpen={setShareOpen} 
               />
             )}

             {/* Chat profile card (friend-request only) */}
             {chatProfileSheet.open && chatProfileSheet.user && (
               <ChatProfileCard 
                 user={chatProfileSheet.user}
                 isLoggedIn={isLoggedIn()}
                 friendRequestSent={Boolean(friendRequestSentTo[String(chatProfileSheet.user.id || '')])}
                 onSendFriendRequest={handleSendFriendRequest}
                 onClose={() => setChatProfileSheet({ open: false, user: null })}
               />
             )}

             {/* Broadcast HUD (Eye, Heart, Share) */}
             <BroadcastHud
               isBroadcasting={true}
               variant="beam-tv"
               className="mr-20"
               broadcastHud={broadcastHud}
               setBroadcastHud={setBroadcastHud}
               setShowWaitlist={openLikedModal}
               handleShareBroadcastLink={handleShare}
               copyShareUrl={copyShareUrl}
             />

              {/* Liked Users Modal (Beamcasting rn) */}
              {showLikedModal && (
                <LikedBroadcastersModal 
                  likedBroadcasters={likedBroadcasters}
                  onClose={() => setShowLikedModal(false)}
                  onSelectBroadcaster={(b) => {
                    setShowLikedModal(false);
                    router.push(`/beam-tv?roomId=${b.roomId}`);
                  }}
                />
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
