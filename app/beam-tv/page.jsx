'use client';

import SignUpModal from '@/components/auth/SignUpModal';
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
import GroupMembersModal from '@/components/VideoChat/GroupMembersModal';
import BeamTvLayout from '@/components/beam-tv/BeamTvLayout';
import ChatMessagesOverlay from '@/components/beam-tv/ChatMessagesOverlay';
import BeamTVActions from '@/components/beam-tv/BeamTVActions';
import ShareSheet from '@/components/beam-tv/ShareSheet';
import ChatProfileCard from '@/components/beam-tv/ChatProfileCard';
import LikedBroadcastersModal from '@/components/beam-tv/LikedBroadcastersModal';
import FavouritesPanel from '@/components/beam-tv/FavouritesPanel';
import BeamTvIdleScreen from '@/components/beam-tv/BeamTvIdleScreen';
import GiftOverlay from '@/components/VideoChat/GiftOverlay';
import GiftAnimation from '@/components/VideoChat/GiftAnimation';
import CoinModal from '@/components/modals/CoinModal';
import { isInsufficientBalanceError } from '@/lib/walletErrors';


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
  const [status, setStatus] = useState('loading'); // loading | connected | empty | error | ended
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Computed once on client mount — safe for SSR (localStorage not available server-side)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [moderationEndBanner, setModerationEndBanner] = useState('');

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
  const requestedJoinRef = useRef(requestedJoin);
  useEffect(() => {
    requestedJoinRef.current = requestedJoin;
  }, [requestedJoin]);
  const [coins, setCoins] = useState(0);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [purchaseToast, setPurchaseToast] = useState(null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState(null);
  const [animGift, setAnimGift] = useState(null);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);

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
  const touchFromChatScrollRef = useRef(false);
  const broadcastStartedAtRef = useRef(null);
  const loopingRef = useRef(false);
  const lastInitialFetchKeyRef = useRef('');
  const chatProfileCacheRef = useRef(new Map());
  const transitionLockRef = useRef(false);
  const sfuRerouteAttemptRef = useRef(0);
  const waitlistPromotionRef = useRef(false);
  const endedRoomIdRef = useRef('');
  const currentBroadcastRef = useRef(null);
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
      } catch (_) { }
    });
    try {
      recvTransportRef.current?.close?.();
    } catch (_) { }
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
        } catch (_) { }
      });
    };
    document.addEventListener('visibilitychange', applyVisibilityPolicy);
    applyVisibilityPolicy();
    return () => document.removeEventListener('visibilitychange', applyVisibilityPolicy);
  }, []);

  // Hydrate session id on mount
  useEffect(() => {
    // Set login state from localStorage — safe here (client only)
    setIsLoggedIn(Boolean(getAuthedUserId()));

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

  const refreshWallet = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const b = await apiRequest(API.WALLET.GET_BALANCE);
      setCoins(typeof b?.balance === 'number' ? b.balance : 0);
    } catch {
      setCoins(0);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshWallet();
    }
  }, [isLoggedIn, refreshWallet]);

  const giftParticipants = useMemo(() => {
    const list = [];
    const seen = new Set();

    // First use remoteStreams (active video tiles)
    for (const s of remoteStreams) {
      const uid = String(s.userId || '');
      if (uid && uid !== 'broadcaster' && !uid.startsWith('producer:') && !seen.has(uid)) {
        seen.add(uid);
        list.push({
          userId: uid,
          name: s.name || 'Broadcaster',
          displayPictureUrl: s.displayPictureUrl || ''
        });
      }
    }

    // Fallback/add from currentBroadcast.participants
    const ps = currentBroadcast?.participants || [];
    for (const p of ps) {
      const uid = String(p?.userId || '');
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        list.push({
          userId: uid,
          name: p.username || p.name || 'Broadcaster',
          displayPictureUrl: p.displayPictureUrl || ''
        });
      }
    }
    return list;
  }, [remoteStreams, currentBroadcast]);

  // Seed HUD from the feed snapshot when the room changes. Live viewer
  // count is then kept in sync by refreshViewerCount (same source as the host HUD).
  useEffect(() => {
    if (!currentBroadcast) return;
    setBroadcastHud((prev) => ({
      ...prev,
      viewerCount: Number(currentBroadcast.viewerCount) || 0,
      waitlistCount: currentBroadcast.waitlistCount || 0
    }));
  }, [currentBroadcast?.roomId]);

  const refreshViewerCount = useCallback(async () => {
    const rid = currentBroadcast?.roomId;
    if (!rid) return;

    const applyCount = (value) => {
      const count = Number(value);
      if (!Number.isFinite(count) || count < 0) return false;
      setBroadcastHud((prev) => (
        prev.viewerCount === count ? prev : { ...prev, viewerCount: count }
      ));
      return true;
    };

    try {
      const room = await apiRequest(API.STREAMING.GET_ROOM(rid));
      if (applyCount(room?.viewerCount)) return;
    } catch (_) { }

    try {
      const res = await fetch(API.DISCOVERY.GET_BROADCAST(rid), {
        headers: { 'Content-Type': 'application/json' }
      }).then((r) => (r.ok ? r.json() : null));
      const broadcast = res?.broadcast?.roomId ? res.broadcast : res;
      applyCount(broadcast?.viewerCount);
    } catch (_) { }
  }, [currentBroadcast?.roomId]);

  useEffect(() => {
    if (status !== 'connected' || !currentBroadcast?.roomId) return;
    refreshViewerCount();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshViewerCount();
    }, 5000);
    return () => clearInterval(id);
  }, [status, currentBroadcast?.roomId, refreshViewerCount]);

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

      const nextRoomId = String(res.broadcast.roomId || '');
      const currentRoomId = String(currentBroadcast?.roomId || '');
      const broadcastIsDead =
        res.broadcast.exists === false ||
        res.broadcast.isActive === false ||
        (endedRoomIdRef.current && nextRoomId === endedRoomIdRef.current);
      if (broadcastIsDead) {
        if (!loopingRef.current) {
          loopingRef.current = true;
          const newSid = rotateFeedSession();
          await fetchNextBroadcast(newSid, { preserveUi: true });
          loopingRef.current = false;
          return;
        }
        cleanup({ preserveStreams: preserveUi });
        broadcastStartedAtRef.current = null;
        setCurrentBroadcast(null);
        setStatus('empty');
        loopingRef.current = false;
        return;
      }

      // If backend returns the same broadcast room again (common when only 1 live stream),
      // do NOT cleanup/reconnect. Just keep playing.
      if (nextRoomId && currentRoomId && nextRoomId === currentRoomId) {
        setCurrentBroadcast(res.broadcast);
        broadcastStartedAtRef.current = Date.now();
        setStatus('connected');
        loopingRef.current = false;
        return;
      }

      // Switching to a new room: now cleanup + reconnect.
      endedRoomIdRef.current = '';
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
      if (broadcast.exists === false || broadcast.isActive === false) return false;
      const nextRoomId = String(broadcast.roomId || '');
      if (endedRoomIdRef.current && nextRoomId === endedRoomIdRef.current) return false;
      const currentRoomId = String(currentBroadcast?.roomId || '');
      if (nextRoomId && currentRoomId && nextRoomId === currentRoomId) {
        // Already playing this room; avoid reconnect.
        setCurrentBroadcast(broadcast);
        broadcastStartedAtRef.current = Date.now();
        setStatus('connected');
        return true;
      }

      cleanup({ preserveStreams: preserveUi });
      endedRoomIdRef.current = '';
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
    const roomId = requestedJoinRef.current?.roomId;
    const userId = requestedJoinRef.current?.userId;
    if (!roomId || !userId) return;
    try {
      await apiRequest(API.STREAMING.CANCEL_JOIN_REQUEST(roomId), {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
    } catch (_) { }
    setRequestedJoin({ roomId: '', userId: '' });
    setJoinState({ state: 'idle', message: '' });
  }, []);

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
        await fetch(API.DISCOVERY.MARK_BROADCAST_VIEWED, options).catch(() => { });
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
    if (!sessionId) return;
    if (!currentBroadcast) {
      fetchNextBroadcast(sessionId);
      return;
    }
    runFeedScrollTransition();
  }, [currentBroadcast, fetchNextBroadcast, runFeedScrollTransition, sessionId]);

  const markBroadcastEnded = useCallback((endedRoomId) => {
    const roomId = String(endedRoomId || currentBroadcastRef.current?.roomId || '');
    if (roomId) {
      endedRoomIdRef.current = roomId;
      const did = localStorage.getItem('deviceId');
      const payload = JSON.stringify({
        roomId,
        sessionId,
        deviceId: did,
      });
      apiRequest(API.DISCOVERY.MARK_BROADCAST_VIEWED, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => { });
    }
    cleanup();
    broadcastStartedAtRef.current = null;
    setRemoteStreams([]);
    remoteStreamsRef.current = [];
    setCurrentBroadcast(null);
    currentBroadcastRef.current = null;
    setChatMessages([]);
    setJoinState({ state: 'idle', message: '' });
    setStatus('ended');
  }, [cleanup, sessionId]);

  const connectToBroadcast = async (roomId, did) => {
    const accessToken = localStorage.getItem('accessToken') || '';
    let userId = 'anonymous:' + did;
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        userId = payload.sub || payload.uid || payload.id;
      } catch (e) { }
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
          } catch (_) { }
          openBroadcastSocket(rerouteUrl);
          return;
        }

        if (msg.type === 'error') {
          console.error('[BeamTV] WS Error:', msg.data);
          const errMsg = typeof msg.data === 'string' ? msg.data : String(msg.data?.error || '');
          if (errMsg.includes('not found') || errMsg.includes('Transport')) {
            console.log('[BeamTV] Reconnecting stale transport...');
            cleanup({ preserveStreams: true });
            const activeDid = did || (typeof window !== 'undefined' ? localStorage.getItem('deviceId') : '') || '';
            if (roomId && activeDid) {
              connectToBroadcast(roomId, activeDid);
            }
            return;
          }
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
          waitlistPromotionRef.current = true;

          // Tell streaming WS not to remove our new participant row when this Beam TV tab closes.
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            try {
              send({
                type: 'preserve-participant-on-close',
                data: { roomId: room.roomId }
              });
            } catch (_) { }
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
          } catch (_) { }

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
                displayPictureUrl: partner.displayPictureUrl || '',
              }
            } : {})
          }));
          try {
            sessionStorage.setItem('waitlistJoinRedirect', '1');
          } catch (_) { }
          router.push('/video-chat');
        }
      } catch (_) { }
    };
    intervalId = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [joinState.state, requestedJoin.userId, currentBroadcast]);

  const getAuthedUserId = () => {
    if (typeof window === 'undefined') return null;
    const accessToken = localStorage.getItem('accessToken') || '';
    if (!accessToken) return null;
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      return payload.sub || payload.uid || payload.id || null;
    } catch (_) {
      return null;
    }
  };

  // isLoggedIn is a state variable (initialized above) — set on mount via useEffect below.
  // Do NOT call getAuthedUserId() at render time (localStorage is not available during SSR).

  const getMyDisplayName = () => {
    if (typeof window === 'undefined') return 'You';
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

  const sameBroadcastParticipantId = (a, b) => String(a ?? '') === String(b ?? '');

  const liveMediaTrackCount = (entry) => {
    const countLive = (stream) =>
      (stream?.getTracks?.() || []).filter((t) => t.readyState !== 'ended').length;
    return countLive(entry?.stream) + countLive(entry?.screenStream);
  };

  const removeRemoteParticipantFromUi = (leftIdRaw) => {
    const leftId = String(leftIdRaw ?? '');
    if (!leftId) return;
    let remaining = 0;
    Object.keys(consumersRef.current).forEach((cid) => {
      const consumer = consumersRef.current[cid];
      const producerId = String(consumer?.producerId || '');
      const uid =
        consumer?.appData?.remoteUserId ||
        producerUserIdByProducerIdRef.current[producerId] ||
        producerIdToMetaRef.current.get(producerId)?.userId;
      if (!sameBroadcastParticipantId(uid, leftId)) return;
      try {
        consumer?.track?.stop?.();
        consumer?.close?.();
      } catch (_) { }
      delete consumersRef.current[cid];
    });
    for (const [pid, meta] of [...producerIdToMetaRef.current.entries()]) {
      if (sameBroadcastParticipantId(meta.userId, leftId)) producerIdToMetaRef.current.delete(pid);
    }
    Object.keys(producerUserIdByProducerIdRef.current).forEach((pid) => {
      if (sameBroadcastParticipantId(producerUserIdByProducerIdRef.current[pid], leftId)) {
        delete producerUserIdByProducerIdRef.current[pid];
      }
    });
    setRemoteStreams((prev) => {
      const removed = prev.find((s) => sameBroadcastParticipantId(s.userId, leftId));
      removed?.stream?.getTracks?.().forEach((t) => {
        try { t.stop(); } catch (_) { }
      });
      removed?.screenStream?.getTracks?.().forEach((t) => {
        try { t.stop(); } catch (_) { }
      });
      const next = prev.filter((s) => !sameBroadcastParticipantId(s.userId, leftId));
      remaining = next.length;
      remoteStreamsRef.current = next;
      return next;
    });
    if (remaining === 0) {
      setTimeout(() => {
        if ((remoteStreamsRef.current?.length || 0) > 0) return;
        markBroadcastEnded();
      }, 1500);
    }
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

  const realChatPhotoUrl = (url) => {
    const u = String(url || '').trim();
    if (!u || u === '/avatar-placeholder.png' || u === '/assets/ico.png') return '';
    return u;
  };

  const getStreamProfileByUserId = (uid) => {
    const id = String(uid || '');
    const s = (remoteStreamsRef.current || []).find((x) => String(x?.userId || '') === id);
    if (!s) return null;
    return {
      id,
      username: s.name || 'User',
      displayPictureUrl: s.displayPictureUrl,
      preferredCity: s.city || ''
    };
  };

  const ensureChatProfile = async (uid) => {
    const id = String(uid || '');
    if (!isValidChatUserId(id)) return null;
    const cached = chatProfileCacheRef.current.get(id);
    if (realChatPhotoUrl(cached?.displayPictureUrl)) return cached;
    const streamProfile = getStreamProfileByUserId(id);
    if (realChatPhotoUrl(streamProfile?.displayPictureUrl)) {
      const mappedStream = { ...streamProfile, displayPictureUrl: realChatPhotoUrl(streamProfile.displayPictureUrl) };
      chatProfileCacheRef.current.set(id, mappedStream);
      setChatProfilesByUserId((prev) => ({ ...prev, [id]: mappedStream }));
      return mappedStream;
    }
    try {
      const resp = await apiRequest(`${API.USERS.GET_USER(id)}?fields=id,username,displayPictureUrl,preferredCity`);
      const u = resp?.user || resp?.data?.user || null;
      if (u) {
        const mapped = {
          id: String(u.id || id),
          username: u.username || streamProfile?.username || 'User',
          displayPictureUrl: realChatPhotoUrl(u.displayPictureUrl),
          preferredCity: u.preferredCity || streamProfile?.preferredCity || ''
        };
        chatProfileCacheRef.current.set(id, mapped);
        setChatProfilesByUserId((prev) => ({ ...prev, [id]: mapped }));
        setChatMessages((prev) =>
          prev.map((m) => {
            if (String(m.userId || '') !== id) return m;
            const genericName = !m.name || m.name === 'Viewer' || m.name === 'Host' || m.name === 'User';
            return {
              ...m,
              name: genericName ? (mapped.username || m.name) : m.name,
              avatarUrl: m.avatarUrl || mapped.displayPictureUrl || ''
            };
          })
        );
        return mapped;
      }
    } catch (_) { }
    if (cached) return cached;
    if (streamProfile) {
      chatProfileCacheRef.current.set(id, streamProfile);
      setChatProfilesByUserId((prev) => ({ ...prev, [id]: streamProfile }));
      return streamProfile;
    }
    return null;
  };

  const openChatProfileSheet = async (uid) => {
    const id = String(uid || '');
    if (!isValidChatUserId(id)) return;
    const p = (await ensureChatProfile(id)) || {
      id,
      username: resolveChatName(id, false),
      displayPictureUrl: '',
      preferredCity: ''
    };
    setChatProfileSheet({ open: true, user: p });
  };

  // Prime current user's profile so "You" avatar is always available; also load moderator flag.
  useEffect(() => {
    const myId = String(getAuthedUserId() || '');
    if (!myId) return;
    (async () => {
      try {
        const meResp = await apiRequest(
          `${API.USERS.GET_ME}?fields=id,username,displayPictureUrl,preferredCity,isModerator`
        );
        const me = meResp?.user || meResp || null;
        if (!me) return;
        setIsModerator(Boolean(me.isModerator));
        if (chatProfileCacheRef.current.get(myId)?.displayPictureUrl) return;
        const mapped = {
          id: String(me.id || myId),
          username: me.username || getMyDisplayName() || 'You',
          displayPictureUrl: me.displayPictureUrl,
          preferredCity: me.preferredCity || ''
        };
        chatProfileCacheRef.current.set(myId, mapped);
        setChatProfilesByUserId((prev) => ({ ...prev, [myId]: mapped }));
      } catch (_) { }
    })();
  }, []);

  const toggleFavouriteBroadcaster = async (targetUserId) => {
    const uid = String(targetUserId || '');
    if (!uid || uid === 'broadcaster' || uid.startsWith('producer:')) return;
    if (!isLoggedIn) {
      setShowAuthModal(true);
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
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setEngagementMsg('Chat unavailable. Reconnecting…');
      return;
    }
    if (isModerator) {
      send({ type: 'moderator-overlay', data: { roomId, message: msg } });
    } else {
      send({ type: 'chat-message', data: { roomId, message: msg } });
    }
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
    } catch (_) { }

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
    if (!isLoggedIn) {
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
      setShowAuthModal(true);
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

  const handleGiftClick = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    if (giftParticipants.length === 0) {
      setEngagementMsg('No active participants to gift.');
      return;
    }
    setIsGiftModalOpen(true);
  };

  const handleSendGift = useCallback(async (gift, targetUserId) => {
    const senderId = getAuthedUserId();
    const targetId = targetUserId || giftParticipants[0]?.userId;
    const roomId = currentBroadcast?.roomId;
    if (!gift || !senderId || !targetId || !roomId) return;

    const coinCost = Number(gift.price) || 0;
    const diamondAmount = Number(gift.diamonds) || 0;
    if (coins < coinCost) {
      setSelectedGiftId(gift.id);
      setIsGiftModalOpen(true);
      return;
    }

    // Close immediately so the sheet can't be used for double-sends while the gift flies.
    setIsGiftModalOpen(false);
    setSelectedGiftId(null);

    try {
      await apiRequest(API.WALLET.PURCHASE_DIAMONDS, {
        method: 'POST',
        body: JSON.stringify({ diamondAmount }),
      });
      await apiRequest(API.STREAMING.SEND_GIFT(roomId), {
        method: 'POST',
        body: JSON.stringify({
          toUserId: targetId,
          amount: diamondAmount,
          giftId: gift.id,
          fromUserId: senderId,
        }),
      });
      await refreshWallet();
      const msgId = `${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
      send({
        type: 'chat-message',
        data: {
          roomId,
          message: JSON.stringify({
            isGift: true,
            messageId: msgId,
            gift: {
              name: gift.name,
              img: gift.img,
              imageUrl: gift.imageUrl,
              price: gift.price,
              diamonds: gift.diamonds,
            },
            targetUserId: targetId,
            senderId,
          }),
        },
      });
      setAnimGift({
        name: gift.name,
        img: gift.img,
        imageUrl: gift.imageUrl,
        price: gift.price,
        diamonds: gift.diamonds,
      });
    } catch (err) {
      console.error('Failed to send gift:', err);
      if (isInsufficientBalanceError(err)) {
        await refreshWallet();
        setSelectedGiftId(gift.id);
        setIsGiftModalOpen(true);
      } else {
        setEngagementMsg(err.message || 'Failed to send gift');
      }
    }
  }, [coins, giftParticipants, currentBroadcast, refreshWallet, send]);

  // If user closes tab / navigates away while waitlisted, cancel request so waitlist count stays accurate.
  useEffect(() => {
    const onBeforeUnload = () => {
      exitBeamTvViewerKeepalive();
      const rId = requestedJoinRef.current?.roomId;
      const uId = requestedJoinRef.current?.userId;
      if (!rId || !uId) return;
      try {
        const token = localStorage.getItem('accessToken');
        fetch(API.STREAMING.CANCEL_JOIN_REQUEST(rId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ userId: uId }),
          keepalive: true
        }).catch(() => { });
      } catch (_) { }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onBeforeUnload);
    };
  }, []);

  // Cancel waitlist join request on component unmount (client-side routing transitions)
  useEffect(() => {
    return () => {
      const rId = requestedJoinRef.current?.roomId;
      const uId = requestedJoinRef.current?.userId;
      if (rId && uId) {
        const token = localStorage.getItem('accessToken');
        fetch(API.STREAMING.CANCEL_JOIN_REQUEST(rId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ userId: uId })
        }).catch(() => { });
      }
    };
  }, []);

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
              displayPictureUrl: '',
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
            displayPictureUrl: '',
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
          } catch (_) { }
          delete consumersRef.current[foundCid];
        }
        if (meta) {
          producerIdToMetaRef.current.delete(closedPid);
          const tr = foundConsumer?.track;
          setRemoteStreams((prev) => {
            const next = prev.map((s) => {
              if (!sameBroadcastParticipantId(s.userId, meta.userId)) return s;
              if (meta.source === 'screen') {
                const ss = s.screenStream;
                ss?.getTracks().forEach((t) => t.stop());
                return { ...s, screenStream: null };
              }
              if (tr) {
                const kept = s.stream.getTracks().filter((t) => t.id !== tr.id && t.readyState !== 'ended');
                return { ...s, stream: new MediaStream(kept) };
              }
              return s;
            });
            remoteStreamsRef.current = next;
            return next;
          });
          setTimeout(() => {
            const entry = remoteStreamsRef.current.find((s) =>
              sameBroadcastParticipantId(s.userId, meta.userId)
            );
            if (!entry) return;
            if (liveMediaTrackCount(entry) === 0) {
              removeRemoteParticipantFromUi(entry.userId);
            }
          }, 2000);
        }
        break;
      }
      case 'participant-left': {
        removeRemoteParticipantFromUi(data?.userId);
        break;
      }
      case 'chat-message': {
        const participantIds = getParticipantIdSet();
        const broadcasterIds = getBroadcasterIdSet();
        const senderId = String(data?.userId || '');
        const message = String(data?.message || '').trim();
        if (!message) break;

        // Skip control/gift JSON messages from showing up in chat list
        let isControlMessage = false;
        try {
          if (message.startsWith('{')) {
            const parsed = JSON.parse(message);
            if (parsed && parsed.isGift) {
              setAnimGift(parsed.gift);
              isControlMessage = true;
            } else if (parsed) {
              isControlMessage = true;
            }
          }
        } catch (_) { }

        if (isControlMessage) {
          break;
        }

        const isParticipant = Boolean(senderId && (broadcasterIds.has(senderId) || participantIds.has(senderId)));
        const payloadPhoto = realChatPhotoUrl(data?.displayPictureUrl);
        const payloadName = typeof data?.username === 'string' ? data.username.trim() : '';
        const name = payloadName || resolveChatName(senderId, isParticipant);
        const streamProfile = getStreamProfileByUserId(senderId);
        const cachedProfile = chatProfileCacheRef.current.get(senderId);
        const avatarUrl = payloadPhoto || realChatPhotoUrl(cachedProfile?.displayPictureUrl) || realChatPhotoUrl(streamProfile?.displayPictureUrl);
        if (isValidChatUserId(senderId) && avatarUrl) {
          const mapped = {
            id: senderId,
            username: name,
            displayPictureUrl: avatarUrl,
            preferredCity: cachedProfile?.preferredCity || streamProfile?.preferredCity || ''
          };
          chatProfileCacheRef.current.set(senderId, { ...cachedProfile, ...mapped });
          setChatProfilesByUserId((prev) => ({ ...prev, [senderId]: { ...prev[senderId], ...mapped } }));
        }
        // Lazy-fetch sender profile so avatar and profile sheet are available for viewer chat senders too.
        if (isValidChatUserId(senderId) && !avatarUrl) {
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
      case 'moderator-overlay': {
        const message = String(data?.message || '').trim();
        if (!message) break;
        setChatMessages((prev) => {
          const next = [
            ...prev,
            {
              id: data?.id || `mod_${Date.now()}_${Math.random()}`,
              userId: String(data?.userId || ''),
              name: data?.label || 'Moderator',
              label: data?.label || 'Moderator',
              message,
              isModeratorOverlay: true,
              avatarUrl: ''
            }
          ];
          return next.slice(-8);
        });
        break;
      }
      case 'participant-kicked': {
        removeRemoteParticipantFromUi(data?.kickedUserId);
        break;
      }
      case 'broadcast-stopped':
      case 'room-ended': {
        markBroadcastEnded(data?.roomId);
        break;
      }
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
              displayPictureUrl: profile.displayPictureUrl || '',
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

  useEffect(() => {
    currentBroadcastRef.current = currentBroadcast;
  }, [currentBroadcast]);

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

  // Sync waitlist requested state with server
  useEffect(() => {
    const userId = getAuthedUserId();
    const roomId = currentBroadcast?.roomId;
    if (!userId || !roomId || status !== 'connected') {
      return;
    }
    let cancelled = false;
    const checkWaitlist = async () => {
      try {
        const res = await apiRequest(API.STREAMING.GET_WAITLIST(roomId));
        if (cancelled) return;
        const list = Array.isArray(res?.waitlist) ? res.waitlist : [];
        const isWaitlisted = list.some(entry => String(entry.userId || entry) === String(userId));
        if (isWaitlisted) {
          setJoinState({ state: 'requested', message: 'Requested to join. Waiting for host…' });
          setRequestedJoin({ roomId, userId: String(userId) });
        } else {
          setJoinState(prev => prev.state === 'requested' ? { state: 'idle', message: '' } : prev);
        }
      } catch (_) { }
    };
    checkWaitlist();

    const intervalId = setInterval(checkWaitlist, 10000); // Check waitlist status every 10 seconds

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [currentBroadcast?.roomId, status, isLoggedIn, remoteStreams.length]);

  // Liveness watcher: while watching, verify the broadcast still exists server-side.
  // Covers silent broadcaster death (phone off / browser killed) where no
  // broadcast-stopped WS event ever reaches this viewer — otherwise the last
  // decoded frame stays frozen forever. Two consecutive misses before advancing
  // so a transient API hiccup doesn't skip a healthy broadcast.
  useEffect(() => {
    if (status !== 'connected') return;
    const roomId = currentBroadcast?.roomId;
    if (!roomId) return;
    let deadChecks = 0;
    let inFlight = false;
    const id = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (waitlistPromotionRef.current) return;
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(API.DISCOVERY.GET_BROADCAST(roomId), {
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const body = await res.json().catch(() => null);
          const broadcast = body?.broadcast?.roomId ? body.broadcast : body;
          const alive = Boolean(broadcast?.roomId) && broadcast?.exists !== false && broadcast?.isActive !== false;
          deadChecks = alive ? 0 : deadChecks + 1;
        } else if (res.status === 404 || res.status === 410) {
          deadChecks += 1;
        }
        // Other statuses (5xx, 429): inconclusive, don't count against the broadcast.
        if (deadChecks >= 2) {
          realtimeDebug('[BeamTV] Broadcast no longer live (poll), showing ended');
          markBroadcastEnded(roomId);
        }
      } catch (_) {
        // Network error on our side — inconclusive.
      } finally {
        inFlight = false;
      }
    }, 12000);
    return () => clearInterval(id);
  }, [status, currentBroadcast?.roomId, markBroadcastEnded]);

  // Seed favourite state from backend favourite-broadcasters list.
  useEffect(() => {
    if (!isLoggedIn) return;
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
      } catch (_) { }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, currentBroadcast?.roomId]);

  // Fetch complete favourites strip (both live + offline) and keep live badges fresh.
  useEffect(() => {
    if (!isLoggedIn) return;
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
    if (!isLoggedIn) {
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

  const handleReportUser = async (reportedUserId, reason = 'basic') => {
    const tid = String(reportedUserId || '');
    if (!tid || tid === 'broadcaster' || tid.startsWith('producer:')) {
      setEngagementMsg('Cannot report this user.');
      return;
    }
    if (!isLoggedIn) {
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
        reason,
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
    const showAddFriend = isLoggedIn && uid && uid !== 'broadcaster' && !uid.startsWith('producer:');
    const showFollow = isLoggedIn && uid && uid !== 'broadcaster' && !uid.startsWith('producer:');
    const { screenStream: tileScreen, ...tileRest } = tile || {};
    const totalTiles = remoteStreams.length;
    const isRightTile = totalTiles === 1 ||
      (totalTiles === 2 && idx === 1) ||
      (totalTiles === 3 && (idx === 1 || idx === 2)) ||
      (totalTiles === 4 && (idx === 1 || idx === 3));

    let borderBottomClass = undefined;
    if (totalTiles === 3) {
      if (idx === 1) {
        borderBottomClass = "md:bottom-4 bottom-18";
      }
    } else if (totalTiles >= 4) {
      if (idx === 0 || idx === 1) {
        borderBottomClass = "md:bottom-4 bottom-2";
      } else {
        borderBottomClass = "md:bottom-24 bottom-18";
      }
    }

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
        tileIndex={idx}
        totalTiles={totalTiles}
        isGiftModalOpen={isGiftModalOpen}
        isRightTile={isRightTile}
        borderBottomClass={borderBottomClass}
        onAvatarClick={() => setShowGroupMembersModal(true)}
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

  const isChatScrollTarget = (target) => {
    if (!target || typeof target.closest !== 'function') return false;
    return Boolean(target.closest('[data-beam-tv-chat-scroll]'));
  };

  // TikTok-like navigation: wheel + touch swipe up to go next
  useEffect(() => {
    const onWheel = (e) => {
      if (status !== 'connected') return;
      if (isChatScrollTarget(e.target)) return;
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
      touchFromChatScrollRef.current = isChatScrollTarget(e.target);
      touchStartYRef.current = t.clientY;
      touchStartAtRef.current = Date.now();
    };
    const onTouchMove = (e) => {
      if (status !== 'connected') return;
      // Let the comment list scroll; don't steal the gesture for swipe-next.
      if (touchFromChatScrollRef.current) return;
      // prevent rubber band scrolling on iOS while swiping
      if (touchStartYRef.current != null) e.preventDefault();
    };
    const onTouchEnd = (e) => {
      if (status !== 'connected') return;
      const startedOnChat = touchFromChatScrollRef.current;
      touchFromChatScrollRef.current = false;
      const startY = touchStartYRef.current;
      touchStartYRef.current = null;
      if (startedOnChat || startY == null) return;
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
    <div className="relative h-dvh w-screen flex flex-col font-sans overflow-hidden">
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url(/assets/mb.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {isLoggedIn && favouritesPanelOpen && (
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

          {status === 'ended' && (
            <BeamTvIdleScreen
              title="Beamcast is over"
              subtitle="Refresh to watch the next live broadcast."
              actionLabel="Refresh"
              onAction={() => fetchNextBroadcast(sessionId)}
            />
          )}

          {status === 'empty' && (
            <BeamTvIdleScreen
              title="No Active Broadcasts"
              subtitle="Come back later or start your own Beamcast in the chat."
              actionLabel="Refresh Channel"
              onAction={() => fetchNextBroadcast(sessionId)}
            />
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
            <>
              <div className="w-full h-full relative">


                <BeamTvLayout remoteStreams={remoteStreams} renderTile={renderTile} />



                <div className="absolute left-4 right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-start gap-2 pointer-events-none md:left-auto md:right-6 md:bottom-6 md:w-auto">
                  <ChatMessagesOverlay
                    chatMessages={chatMessages}
                    chatProfilesByUserId={chatProfilesByUserId}
                    openChatProfileSheet={openChatProfileSheet}
                  />
                  {!isGiftModalOpen && (
                    <div className="pointer-events-auto w-full md:w-auto">
                      <BeamTVActions
                        viewerChatInput={viewerChatInput}
                        setViewerChatInput={setViewerChatInput}
                        sendViewerChat={sendViewerChat}
                        joinState={joinState}
                        handleJoinBroadcast={handleJoinBroadcast}
                        onGiftClick={handleGiftClick}
                        isModerator={isModerator}
                      />
                    </div>
                  )}
                </div>

                {moderationEndBanner && (
                  <div className="absolute inset-x-4 top-1/3 z-[60] mx-auto max-w-md rounded-[1.5rem] border border-white/40 bg-black/80 px-5 py-4 text-center text-sm font-bold text-white shadow-2xl backdrop-blur-md md:text-base">
                    <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-[#F2AD00]">
                      Moderator
                    </div>
                    {moderationEndBanner}
                  </div>
                )}

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
                    isLoggedIn={isLoggedIn}
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
                  soundEnabled={soundEnabled}
                  audioUnlocked={audioUnlocked}
                  onToggleSound={toggleSound}
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

                <SignUpModal
                  isOpen={showAuthModal}
                  onClose={() => setShowAuthModal(false)}
                />

                <GiftOverlay
                  isOpen={isGiftModalOpen}
                  onClose={() => { setIsGiftModalOpen(false); setSelectedGiftId(null); }}
                  onOpenCoinModal={() => setIsCoinModalOpen(true)}
                  onSelectGift={(gift) => setSelectedGiftId(gift.id)}
                  selectedGiftId={selectedGiftId}
                  coins={coins}
                  participants={giftParticipants}
                  onSendGift={handleSendGift}

                />

                <GiftAnimation gift={animGift} onComplete={() => setAnimGift(null)} />

                <CoinModal
                  isOpen={isCoinModalOpen}
                  onClose={() => setIsCoinModalOpen(false)}
                  onSuccess={async ({ coinsCredited }) => {
                    await refreshWallet();
                    const credited = Number(coinsCredited) || 0;
                    setPurchaseToast(
                      credited > 0
                        ? `Added ${credited.toLocaleString()} coins`
                        : 'Coins added to your wallet'
                    );
                    window.setTimeout(() => setPurchaseToast(null), 3000);
                  }}
                  onFailure={(message) => {
                    setPurchaseToast(message || 'Payment failed');
                    window.setTimeout(() => setPurchaseToast(null), 3000);
                  }}
                />
                {purchaseToast && (
                  <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/80 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-outfit text-sm font-semibold">{purchaseToast}</span>
                  </div>
                )}
                <GroupMembersModal
                  isOpen={showGroupMembersModal}
                  onClose={() => setShowGroupMembersModal(false)}
                  remoteStreams={remoteStreams}
                  getRemoteTileProfile={(s) => ({
                    name: s.name || 'Broadcaster',
                    displayPictureUrl: s.displayPictureUrl || '',
                    city: s.city || ''
                  })}
                  friendRequestSentTo={friendRequestSentTo}
                  friendshipWithRemote={{}}
                  handleSendFriendRequest={handleSendFriendRequest}
                  reportedUserIds={reportedUserIds}
                  handleReportUser={handleReportUser}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BeamTV() {
  return (
    <Suspense
      fallback={
        <div
          className="w-full h-[100dvh]"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      }
    >
      <BeamTVInner />
    </Suspense>
  );
}
