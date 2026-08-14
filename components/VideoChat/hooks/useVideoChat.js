'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { submitUserReport, resolveInCallReportType } from '@/lib/report-user';
import { forceLogoutBanned } from '@/lib/force-logout';
import { recordSquadCallPeersAsync, recordSquadCallPeersKeepalive } from '@/lib/squad-quick-invite-backend';
import {
  enterCall,
  exitCallToHome,
  exitCallToHomeKeepalive,
  exitCallResumeDiscovery,
  clearDiscoveryResumeIntent,
  enablePullStrangerDiscovery,
  disablePullStrangerDiscovery,
  enableBeamcastDiscovery,
  disableBeamcastDiscovery,
} from '@/lib/discovery-presence';
import { enrichUserStickerFields } from '@/lib/stickers';
import {
  diamondsToCoinPrice,
  getDiamondToCoinRate,
  mapCatalogGift,
  setDiamondToCoinRate,
} from '@/lib/diamondRate';
import { isInsufficientBalanceError } from '@/lib/walletErrors';
import {
  isMobileRuntime,
  getCameraConstraints,
  getPreferredConsumerLayers,
  buildCameraVideoProduceOptions,
  getScreenShareConstraints,
  getScreenShareEncodings,
  replaceKindTrackInStream,
  replaceScreenTrackInStream,
  removeTrackFromStream,
  pickH264VideoCodec,
} from '@/lib/webrtc-media-utils';

// ---------------------------------------------------------------------------
// Module-level helpers (stable across renders)
// ---------------------------------------------------------------------------

export const getWsUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_STREAMING_WS_URL;
  if (envUrl) return envUrl.replace(/^ws:\/\//, 'wss://');
  try {
    const restUrl = process.env.NEXT_PUBLIC_STREAMING_SERVICE_URL || 'http://localhost:3006';
    const base = restUrl.replace(/\/v1$/, '');
    const wsBase = base.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
    return wsBase + '/streaming/ws';
  } catch {
    return 'ws://localhost:3006/streaming/ws';
  }
};

export const buildWsUrl = (baseUrl, params = {}) => {
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

export const getRerouteWsUrl = (reroute, fallbackUrl) => {
  const raw = reroute?.wsUrl || reroute?.httpUrl;
  if (!raw) return fallbackUrl;
  const wsUrl = String(raw)
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')
    .replace(/\/+$/, '');
  return wsUrl.includes('/streaming/ws') ? wsUrl : `${wsUrl}/streaming/ws`;
};

export const PULL_STRANGER_WINDOW_SECONDS = (() => {
  const parsed = Number.parseInt(process.env.NEXT_PUBLIC_PULL_STRANGER_WINDOW_SECONDS || '60', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
})();

/** Grace before room-health auto-resume when remote media has not connected yet. */
export const MEDIA_ESTABLISH_GRACE_MS = (() => {
  const parsed = Number.parseInt(process.env.NEXT_PUBLIC_MEDIA_ESTABLISH_GRACE_SECONDS || '180', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed * 1000 : 180_000;
})();

const isRealtimeDebugEnabled = () => process.env.NEXT_PUBLIC_REALTIME_DEBUG === 'true';
const realtimeDebug = (...args) => { if (isRealtimeDebugEnabled()) console.log(...args); };

// ---------------------------------------------------------------------------
// Main Hook
// ---------------------------------------------------------------------------

export default function useVideoChat() {
  const router = useRouter();
  const flowLog = (...args) => console.log('[RaincheckFlow][video-chat]', ...args);
  const WS_URL = getWsUrl();

  // ---- State ---------------------------------------------------------------
  const [roomInfo, setRoomInfo] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('isCamOff') === 'true';
    return false;
  });
  const [error, setError] = useState('');
  const [localUserInfo, setLocalUserInfo] = useState({ name: 'You', age: '' });
  const [partnerInfo, setPartnerInfo] = useState({ id: '', name: 'Matched!', age: '?', city: '', displayPictureUrl: '' });
  const [friendRequestSentTo, setFriendRequestSentTo] = useState({});
  const [friendshipWithRemote, setFriendshipWithRemote] = useState({});
  const [isRainchecking, setIsRainchecking] = useState(false);
  const [showRandomness, setShowRandomness] = useState(false);
  const [isEnablingPullStranger, setIsEnablingPullStranger] = useState(false);
  const [pullStrangerCooldownSec, setPullStrangerCooldownSec] = useState(0);
  const [roomSummoningUserId, setRoomSummoningUserId] = useState(null);
  const [callRoles, setCallRoles] = useState({ isLocalHost: false, byUserId: {} });
  const [roomHealthDebug, setRoomHealthDebug] = useState({ graceActive: false, graceRemainingSec: 0, failureCount: 0 });
  const [icebreaker, setIcebreaker] = useState('');
  const [showIcebreaker, setShowIcebreaker] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChatInput, setShowChatInput] = useState(false);
  const [coins, setCoins] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastHud, setBroadcastHud] = useState({ viewerCount: 0, waitlistCount: 0, lastShareMsg: '', shareOpen: false, shareUrl: '' });
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isDareOpen, setIsDareOpen] = useState(false);
  const [isSendingDare, setIsSendingDare] = useState(false);
  const isSendingDareRef = useRef(false);
  const isSendingGiftRef = useRef(false);
  const [selectedGiftId, setSelectedGiftId] = useState(null);
  const [activeRemoteGifts, setActiveRemoteGifts] = useState([]);
  const [activeLocalGifts, setActiveLocalGifts] = useState([]);
  const [activeDareProposal, setActiveDareProposal] = useState(null);
  const [dareAcceptanceStatus, setDareAcceptanceStatus] = useState('idle');
  const [randomDares, setRandomDares] = useState([]);
  const [savedDares, setSavedDares] = useState([]);
  const [giftItems, setGiftItems] = useState([]);
  const [diamondToCoinRate, setDiamondToCoinRateState] = useState(getDiamondToCoinRate);

  const applyDiamondToCoinRate = useCallback((rate) => {
    const n = Number(rate);
    if (!Number.isFinite(n) || n <= 0) return;
    setDiamondToCoinRate(n);
    setDiamondToCoinRateState(n);
    setGiftItems((prev) =>
      prev.map((g) => ({
        ...g,
        price: diamondsToCoinPrice(g.diamonds, n),
      }))
    );
  }, []);
  const [isRolling, setIsRolling] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [selectedWaitlistUser, setSelectedWaitlistUser] = useState(null);
  const [broadcastChatWarning, setBroadcastChatWarning] = useState('');
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [loadingMeme, setLoadingMeme] = useState(null);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [reportedUserIds, setReportedUserIds] = useState(new Set());
  const [reportNotification, setReportNotification] = useState(null);
  const [localMediaGeneration, setLocalMediaGeneration] = useState(0);

  // ---- Refs ----------------------------------------------------------------
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const currentDareRef = useRef(null);
  const wsRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const localStreamRef = useRef(null);
  const producersRef = useRef({});
  const consumersRef = useRef({});
  const myProducerIdsRef = useRef(new Set());
  const processedGiftIdsRef = useRef(new Set());
  const consumerIdsByUserRef = useRef({});
  const callRoleRefreshTimerRef = useRef(null);
  const roomInfoRef = useRef(null);
  const squadQuickInvitePeersPostedRoomIdRef = useRef(null);
  const userIdRef = useRef(null);
  const partnerInfoRef = useRef(null);
  const localUserInfoRef = useRef({ name: 'You', age: '', displayPictureUrl: '/assets/ico.png' });
  const remoteStreamsRef = useRef([]);
  const waitlistProfileCacheRef = useRef(new Map());
  const allowUnmountCleanupRef = useRef(false);
  const cleanupArmTimerRef = useRef(null);
  const intentionalExitRef = useRef(false);
  const leaveCleanupStartedRef = useRef(false);
  const autoTransitioningRef = useRef(false);
  const hadRemoteMediaRef = useRef(false);
  const remoteMediaMissingSinceRef = useRef(null);
  const mediaEstablishGraceUntilRef = useRef(0);
  const hadRemotePeerInSessionRef = useRef(false);
  const pendingProducersRef = useRef([]);
  const roomHealthFailureCountRef = useRef(0);
  /** Per-user consecutive "missing from server participant list" counts while their tile is shown. */
  const staleTileMissCountRef = useRef(new Map());
  /** Consecutive "room no longer exists" observations while remote tiles are still rendered. */
  const roomGoneWithTilesCountRef = useRef(0);
  const suppressAutoResumeUntilRef = useRef(0);
  const prevRemoteStreamCountRef = useRef(0);
  const getProducersRetryTimeoutsRef = useRef([]);
  const consumeRetryTimeoutsRef = useRef(new Map());
  const consumingProducerIdsRef = useRef(new Set());
  const consumedProducerIdsRef = useRef(new Set());
  const pendingVideoProduceSourceRef = useRef('camera');
  const localScreenStreamRef = useRef(null);
  const localScreenMsProducerRef = useRef(null);
  /** True while getDisplayMedia picker is open / screen produce is in flight. */
  const screenShareInFlightRef = useRef(false);
  const producerIdToMetaRef = useRef(new Map());
  const isBroadcastingRef = useRef(false);
  const isCamOffRef = useRef(
    typeof window !== 'undefined' && localStorage.getItem('isCamOff') === 'true'
  );
  const isMutedRef = useRef(false);
  const mediaPausedForBackgroundRef = useRef(false);
  const localMediaRecoveryInFlightRef = useRef(false);
  const recoverLocalMediaRef = useRef(null);
  const sfuRerouteAttemptRef = useRef(0);
  const wsReconnectAttemptRef = useRef(0);
  const wsReconnectTimerRef = useRef(null);
  const wsPendingReconnectWhileHiddenRef = useRef(false);
  const openSignalingSocketRef = useRef(null);
  const peerLeftAutoResumeTimerRef = useRef(null);
  const suppressUnmountLeaveUntilRef = useRef(0);
  const roomSummoningUserIdRef = useRef(null);
  const prevCooldownActiveRef = useRef(false);

  // ---- Helpers -------------------------------------------------------------
  const sameParticipantId = (a, b) => String(a ?? '') === String(b ?? '');

  const isValidFriendTargetUserId = (userId) => {
    const u = String(userId ?? '');
    return u.length > 0 && !u.startsWith('producer:');
  };

  // ---- Sync refs with state ------------------------------------------------
  useEffect(() => { roomSummoningUserIdRef.current = roomSummoningUserId; }, [roomSummoningUserId]);
  useEffect(() => { isBroadcastingRef.current = isBroadcasting; }, [isBroadcasting]);
  useEffect(() => { isCamOffRef.current = isCamOff; }, [isCamOff]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  async function acquireLocalMediaStream() {
    const audioConstraints = { echoCancellation: true, noiseSuppression: true, channelCount: 1 };
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: getCameraConstraints({ exactFrontCamera: isMobileRuntime() }),
        audio: audioConstraints
      });
    } catch {
      return navigator.mediaDevices.getUserMedia({
        video: getCameraConstraints({ exactFrontCamera: false }),
        audio: audioConstraints
      });
    }
  }

  function applyLocalMediaPreferences(stream) {
    const videoTrack = stream?.getVideoTracks?.()[0];
    const audioTrack = stream?.getAudioTracks?.()[0];
    if (videoTrack) videoTrack.enabled = !isCamOffRef.current;
    if (audioTrack) audioTrack.enabled = !isMutedRef.current;
  }

  function applyLocalCameraEnabled(enabled) {
    const tracks = localStreamRef.current?.getVideoTracks?.() || [];
    tracks.forEach((track) => {
      if (track.readyState === 'live') track.enabled = enabled;
    });
    const producer = producersRef.current.video;
    if (!producer || producer.closed) return;
    try {
      if (enabled) producer.resume();
      else producer.pause();
    } catch { /* ignore */ }
  }

  function broadcastCamOffState(camOff = isCamOffRef.current) {
    const roomId = roomInfoRef.current?.roomId;
    if (!roomId || !userIdRef.current) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'chat-message',
      data: {
        roomId,
        message: JSON.stringify({
          isCamOffChanged: true,
          isCamOff: Boolean(camOff),
          senderId: userIdRef.current,
        }),
      },
    }));
  }

  function hasInterruptedLocalMedia() {
    const stream = localStreamRef.current;
    if (!stream) return false;
    const tracks = stream.getTracks();
    if (typeof document !== 'undefined' && document.hidden) return false;
    // Only recover when tracks are actually ended. Temporary mute is normal in WebRTC
    // (simulcast switches, brief stalls) and re-acquiring media causes producer churn.
    return tracks.some(track => track.readyState === 'ended');
  }

  function monitorLocalMediaTracks(stream) {
    stream?.getTracks?.().forEach((track) => {
      track.onended = () => {
        if (intentionalExitRef.current || autoTransitioningRef.current) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        // Screen-share picker / active share often ends or interrupts camera tracks;
        // do not churn producers mid-share (that races produce and can abort the call).
        if (screenShareInFlightRef.current || localScreenMsProducerRef.current) return;
        void recoverLocalMedia('local-track-ended');
      };
    });
  }

  async function replacePublishedLocalTrack(kind, track) {
    const transport = sendTransportRef.current;
    if (!track || !transport || transport.closed) return;
    const currentProducer = producersRef.current[kind];
    if (currentProducer && !currentProducer.closed && typeof currentProducer.replaceTrack === 'function') {
      await currentProducer.replaceTrack({ track });
      if (kind === 'video') applyLocalCameraEnabled(!isCamOffRef.current);
      return;
    }

    if (kind === 'video') {
      pendingVideoProduceSourceRef.current = 'camera';
      try {
        producersRef.current.video = await transport.produce(buildCameraVideoProduceOptions(deviceRef.current, track));
      } catch {
        producersRef.current.video = await transport.produce({
          track,
          encodings: [{ maxBitrate: isMobileRuntime() ? 900_000 : 2_500_000 }],
          appData: { source: 'camera' },
        });
      }
      applyLocalCameraEnabled(!isCamOffRef.current);
      return;
    }

    producersRef.current.audio = await transport.produce({ track });
  }

  async function recoverLocalMedia(reason = 'unknown') {
    if (localMediaRecoveryInFlightRef.current) return;
    if (intentionalExitRef.current || autoTransitioningRef.current) return;
    if (screenShareInFlightRef.current || localScreenMsProducerRef.current) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    localMediaRecoveryInFlightRef.current = true;
    try {
      flowLog('local_media_recover_start', { reason });
      const previousStream = localStreamRef.current;
      const nextStream = await acquireLocalMediaStream();
      applyLocalMediaPreferences(nextStream);
      monitorLocalMediaTracks(nextStream);

      await Promise.allSettled([
        replacePublishedLocalTrack('video', nextStream.getVideoTracks()[0]),
        replacePublishedLocalTrack('audio', nextStream.getAudioTracks()[0])
      ]);

      localStreamRef.current = nextStream;
      applyLocalCameraEnabled(!isCamOffRef.current);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = nextStream;
        const playPromise = localVideoRef.current.play?.();
        if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => { });
      }
      setLocalMediaGeneration(n => n + 1);

      previousStream?.getTracks?.().forEach((track) => {
        if (!nextStream.getTracks().includes(track)) {
          try { track.stop(); } catch { }
        }
      });
      flowLog('local_media_recover_done', { reason });
    } catch (error) {
      console.warn('[WebRTC] Local media recovery failed:', error);
    } finally {
      localMediaRecoveryInFlightRef.current = false;
    }
  }
  recoverLocalMediaRef.current = recoverLocalMedia;

  useEffect(() => {
    const stream = remoteStreams[0]?.stream;
    remoteStreamsRef.current = remoteStreams;
    const el = remoteVideoRef.current;
    if (el && stream && el.srcObject !== stream) el.srcObject = stream;
  }, [remoteStreams]);

  // Broadcast pull-stranger summoning state change via chat-message
  useEffect(() => {
    const isActive = pullStrangerCooldownSec > 0;
    if (isActive !== prevCooldownActiveRef.current) {
      prevCooldownActiveRef.current = isActive;
      if (roomInfoRef.current?.roomId) {
        send({
          type: 'chat-message',
          data: {
            roomId: roomInfoRef.current.roomId,
            message: JSON.stringify({ isSummoningActive: isActive, senderId: userIdRef.current }),
          },
        });
      }
    }
  }, [pullStrangerCooldownSec]);

  // Tab visibility: nudge video elements and reconnect signaling when visible
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const nudgeVideoElements = () => {
      remoteMediaMissingSinceRef.current = null;
      document.querySelectorAll('video').forEach((el) => {
        const pr = el.play?.();
        if (pr && typeof pr.catch === 'function') pr.catch(() => { });
      });
    };
    const reconnectSignalingIfNeeded = () => {
      const wsState = wsRef.current?.readyState;
      const needsReconnect =
        wsPendingReconnectWhileHiddenRef.current ||
        wsState === WebSocket.CLOSING ||
        wsState === WebSocket.CLOSED ||
        wsState === undefined;
      if (!needsReconnect) return;
      if (!roomInfoRef.current?.roomId || intentionalExitRef.current) return;
      wsPendingReconnectWhileHiddenRef.current = false;
      if (wsReconnectTimerRef.current) { clearTimeout(wsReconnectTimerRef.current); wsReconnectTimerRef.current = null; }
      wsReconnectAttemptRef.current = 0;
      flowLog('signaling_reconnect_on_tab_visible');
      openSignalingSocketRef.current?.(getWsUrl(), { isReconnect: true });
    };
    const applyVisibilityPolicy = () => {
      if (document.hidden) { mediaPausedForBackgroundRef.current = true; return; }
      mediaPausedForBackgroundRef.current = false;
      nudgeVideoElements();
      reconnectSignalingIfNeeded();
      setTimeout(() => {
        if (hasInterruptedLocalMedia()) void recoverLocalMediaRef.current?.('tab-visible');
      }, 500);
    };
    document.addEventListener('visibilitychange', applyVisibilityPolicy);
    return () => document.removeEventListener('visibilitychange', applyVisibilityPolicy);
  }, []);

  // Re-bind local video preview when camera stream changes
  useEffect(() => {
    const el = localVideoRef.current;
    const stream = localStreamRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      const p = el.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => { });
    }
  }, [localMediaGeneration]);

  // ---- Wallet --------------------------------------------------------------
  const refreshWallet = useCallback(async () => {
    try {
      const res = await apiRequest(API.WALLET.GET_BALANCE).catch(() => null);
      if (res) {
        setCoins(typeof res.balance === 'number' ? res.balance : 0);
        setDiamonds(Number(res.diamonds) || 0);
        if (res.diamondToCoinRate != null) {
          applyDiamondToCoinRate(res.diamondToCoinRate);
        }
      }
    } catch { }
  }, [applyDiamondToCoinRate]);

  useEffect(() => { refreshWallet(); }, [refreshWallet]);

  // ---- Dares ---------------------------------------------------------------
  const fetchRandomDares = useCallback(async () => {
    const roomId = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const userId = userIdRef.current;
    if (!roomId || !userId) return;
    try {
      const res = await apiRequest(API.STREAMING.GET_RANDOM_DARES(roomId, userId));
      if (res?.dares) setRandomDares(res.dares.map(d => ({ id: d.id, text: d.text, isCustom: d.isCustom || false, customDareId: d.customDareId || null })));
    } catch (err) { console.error('Failed to fetch random dares:', err); }
  }, [roomInfo]);

  const fetchSavedDares = useCallback(async () => {
    const roomId = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const userId = userIdRef.current;
    if (!roomId || !userId) return;
    try {
      const res = await apiRequest(API.STREAMING.GET_SAVED_DARES(roomId, userId));
      if (res?.dares) setSavedDares(res.dares.map(d => ({ id: d.id, text: d.dareText, isCustom: true })));
    } catch (err) { console.error('Failed to fetch saved dares:', err); }
  }, [roomInfo]);

  const handleSaveCustomDare = useCallback(async (dareText) => {
    const roomId = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const userId = userIdRef.current;
    if (!roomId || !userId || !dareText) return;
    try {
      await apiRequest(API.STREAMING.SAVE_CUSTOM_DARE(roomId), { method: 'POST', body: JSON.stringify({ userId, dareText, category: 'custom' }) });
      await fetchSavedDares();
    } catch (err) { console.error('Failed to save custom dare:', err); alert('Failed to save custom dare'); }
  }, [roomInfo, fetchSavedDares]);

  const handleDeleteCustomDare = useCallback(async (dareId) => {
    const roomId = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const userId = userIdRef.current;
    if (!roomId || !userId || !dareId) return;
    try {
      await apiRequest(API.STREAMING.DELETE_CUSTOM_DARE(roomId, dareId, userId), { method: 'DELETE' });
      await fetchSavedDares();
    } catch (err) { console.error('Failed to delete custom dare:', err); alert('Failed to delete custom dare'); }
  }, [roomInfo, fetchSavedDares]);

  useEffect(() => {
    if (isDareOpen) { fetchRandomDares(); fetchSavedDares(); }
  }, [isDareOpen, fetchRandomDares, fetchSavedDares]);

  // ---- Gift catalog (for GiftOverlay in video chat) -----------------------
  const fetchGiftItems = useCallback(async () => {
    try {
      const data = await apiRequest(API.FRIENDS.GET_GIFT_CATALOG);
      if (data?.gifts) {
        if (data.diamondToCoinRate != null) {
          applyDiamondToCoinRate(data.diamondToCoinRate);
        }
        setGiftItems(data.gifts.map((g, idx) => mapCatalogGift(g, idx, data.diamondToCoinRate)));
      }
    } catch (err) { console.error('Failed to load gifts', err); }
  }, [applyDiamondToCoinRate]);

  useEffect(() => { fetchGiftItems(); }, [fetchGiftItems]);

  // ---- Remote profile fetching ---------------------------------------------
  const remoteUserIdsKey = remoteStreams.map(s => String(s.userId)).sort().join('|');

  useEffect(() => {
    const fetchMissingProfiles = async () => {
      const need = remoteStreams.filter(s => {
        const uid = String(s.userId);
        return !uid.startsWith('producer:') && s.profileFetched !== true;
      });
      for (const streamInfo of need) {
        const uid = String(streamInfo.userId);
        try {
          const profileResp = await apiRequest(API.USERS.GET_USER(uid));
          const rawProfile = profileResp?.user || {};
          const profile = await enrichUserStickerFields(rawProfile);
          let age = '';
          if (profile.dateOfBirth) {
            const dob = new Date(profile.dateOfBirth);
            if (!Number.isNaN(dob.getTime())) {
              const now = new Date();
              let years = now.getFullYear() - dob.getFullYear();
              const monthDiff = now.getMonth() - dob.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) years--;
              age = years >= 0 ? String(years) : '';
            }
          }
          setRemoteStreams(prev => prev.map(s => String(s.userId) === uid
            ? { ...s, name: profile.username || 'Guest', age, displayPictureUrl: profile.displayPictureUrl, city: profile.preferredCity || '', activeBadgeImageUrl: profile.activeBadgeImageUrl || null, activeBadge: profile.activeBadge || null, profileFetched: true }
            : s));
        } catch (err) { console.warn(`[VideoChat] Failed to fetch profile for ${uid}:`, err); }
      }
    };
    if (remoteStreams.length > 0) fetchMissingProfiles();
  }, [remoteUserIdsKey]);

  // Friendship check for each remote user
  useEffect(() => {
    if (!remoteUserIdsKey) return;
    const uids = remoteUserIdsKey.split('|').filter(Boolean).filter(uid => !String(uid).startsWith('producer:'));
    if (uids.length === 0) return;
    let cancelled = false;
    (async () => {
      await Promise.all(uids.map(async uid => {
        try {
          const res = await apiRequest(API.FRIENDS.CHECK_FRIENDSHIP(uid));
          if (!cancelled && res) setFriendshipWithRemote(prev => ({ ...prev, [uid]: Boolean(res.areFriends) }));
        } catch (err) { console.warn('[VideoChat] CHECK_FRIENDSHIP failed for', uid, err); }
      }));
    })();
    return () => { cancelled = true; };
  }, [remoteUserIdsKey]);

  // ---- WebRTC teardown / cleanup -------------------------------------------
  function teardownMediasoupState({ clearRemoteStreams = true } = {}) {
    if (wsReconnectTimerRef.current) { clearTimeout(wsReconnectTimerRef.current); wsReconnectTimerRef.current = null; }
    if (peerLeftAutoResumeTimerRef.current) { clearTimeout(peerLeftAutoResumeTimerRef.current); peerLeftAutoResumeTimerRef.current = null; }
    pendingProducersRef.current = [];
    getProducersRetryTimeoutsRef.current.forEach(tid => clearTimeout(tid));
    getProducersRetryTimeoutsRef.current = [];
    consumeRetryTimeoutsRef.current.forEach(tid => clearTimeout(tid));
    consumeRetryTimeoutsRef.current.clear();
    consumingProducerIdsRef.current.clear();
    consumedProducerIdsRef.current.clear();
    myProducerIdsRef.current.clear();
    pendingVideoProduceSourceRef.current = 'camera';
    producerIdToMetaRef.current.clear();
    const keepScreenCapture =
      screenShareInFlightRef.current ||
      Boolean(localScreenStreamRef.current?.getVideoTracks?.().some((t) => t.readyState === 'live'));
    if (!keepScreenCapture) {
      localScreenStreamRef.current?.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current = null;
      setIsScreenSharing(false);
    }
    try { localScreenMsProducerRef.current?.close?.(); } catch { }
    localScreenMsProducerRef.current = null;
    Object.values(consumersRef.current || {}).forEach(c => { try { c?.close?.(); } catch { } });
    Object.values(producersRef.current || {}).forEach(p => { if (p && typeof p.close === 'function') { try { p.close(); } catch { } } });
    try { sendTransportRef.current?.close?.(); } catch { }
    try { recvTransportRef.current?.close?.(); } catch { }
    if (clearRemoteStreams) {
      remoteStreamsRef.current?.forEach(s => { s?.stream?.getTracks?.().forEach(t => t.stop()); s?.screenStream?.getTracks?.().forEach(t => t.stop()); });
      remoteStreamsRef.current = [];
      setRemoteStreams([]);
    }
    producersRef.current = {};
    consumersRef.current = {};
    consumerIdsByUserRef.current = {};
    sendTransportRef.current = null;
    recvTransportRef.current = null;
    deviceRef.current = null;
  }

  function cleanup({ stopLocalMedia = true } = {}) {
    mediaPausedForBackgroundRef.current = false;
    wsReconnectAttemptRef.current = 0;
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    if (stopLocalMedia) { localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    teardownMediasoupState({ clearRemoteStreams: true });
  }

  // ---- Room health watcher -------------------------------------------------
  // Alone (peer tab-close / network cut): confirm via GET_USER_ROOM participant
  // count for ~5s, then auto-exit + resume discovery. Silent UI during grace.
  useEffect(() => {
    const ALONE_EXIT_MS = Number.parseInt(
      (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CALL_ALONE_EXIT_MS) || '5000',
      10
    ) || 5000;
    const aloneSinceRef = { current: null };

    const mergeRoomHealthDebug = (next) => setRoomHealthDebug(prev => {
      if (prev.graceActive === next.graceActive && prev.graceRemainingSec === next.graceRemainingSec && prev.failureCount === next.failureCount) return prev;
      return next;
    });

    const tick = async () => {
      if (intentionalExitRef.current || autoTransitioningRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = Date.now();
      const graceMs = suppressAutoResumeUntilRef.current - now;
      if (graceMs > 0) {
        aloneSinceRef.current = null;
        mergeRoomHealthDebug({ graceActive: true, graceRemainingSec: Math.ceil(graceMs / 1000), failureCount: roomHealthFailureCountRef.current });
        return;
      }
      const roomId = roomInfoRef.current?.roomId;
      const userId = userIdRef.current;
      if (!roomId || !userId) return;
      if ((remoteStreamsRef.current?.length || 0) === 0 && !hadRemotePeerInSessionRef.current && Date.now() < (mediaEstablishGraceUntilRef.current || 0)) {
        aloneSinceRef.current = null;
        return;
      }

      try {
        const roomState = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
        const participantCount = Number(roomState?.participantCount || 0);
        const participants = Array.isArray(roomState?.participants) ? roomState.participants : [];
        const others = participants.filter((p) => String(p.userId) !== String(userId));
        const roomIsBroadcasting = roomState?.isBroadcasting === true || roomState?.callType === 'broadcast';
        const inWaitlistJoinGrace = Date.now() < (mediaEstablishGraceUntilRef.current || 0);

        // Reconcile stale remote tiles against server participant list (frozen tiles after silent peer death)
        if ((remoteStreamsRef.current?.length || 0) > 0 && roomState?.exists && participants.length) {
          const activeIds = new Set(participants.map((p) => String(p.userId)));
          if (activeIds.has(String(userId))) {
            const missCounts = staleTileMissCountRef.current;
            for (const tile of [...remoteStreamsRef.current]) {
              const tileId = String(tile.userId);
              if (tileId.startsWith('producer:')) continue;
              if (activeIds.has(tileId)) {
                missCounts.delete(tileId);
                continue;
              }
              const misses = (missCounts.get(tileId) || 0) + 1;
              if (misses >= 2) {
                missCounts.delete(tileId);
                flowLog('room_health_evict_stale_tile', { userId: tileId });
                removeRemoteParticipantFromUi(tileId);
              } else {
                missCounts.set(tileId, misses);
              }
            }
            for (const knownId of [...missCounts.keys()]) {
              if (!remoteStreamsRef.current.some((s) => String(s.userId) === knownId)) missCounts.delete(knownId);
            }
          }
        }

        const alone =
          !roomIsBroadcasting &&
          !isBroadcastingRef.current &&
          !inWaitlistJoinGrace &&
          (!roomState?.exists ||
            participantCount <= 1 ||
            (participants.length > 0 && others.length === 0));

        if (alone) {
          if (aloneSinceRef.current == null) aloneSinceRef.current = now;
          const aloneForMs = now - aloneSinceRef.current;
          const remainingSec = Math.max(0, Math.ceil((ALONE_EXIT_MS - aloneForMs) / 1000));
          roomHealthFailureCountRef.current += 1;
          mergeRoomHealthDebug({
            graceActive: aloneForMs < ALONE_EXIT_MS,
            graceRemainingSec: remainingSec,
            failureCount: roomHealthFailureCountRef.current,
          });
          if (aloneForMs < ALONE_EXIT_MS) return;
          flowLog('room_health_auto_resume', {
            exists: Boolean(roomState?.exists),
            participantCount,
            aloneForMs,
          });
          aloneSinceRef.current = null;
          await handlePeerLeftAutoResume();
          return;
        }

        aloneSinceRef.current = null;
        roomHealthFailureCountRef.current = 0;
        roomGoneWithTilesCountRef.current = 0;
        mergeRoomHealthDebug({ graceActive: false, graceRemainingSec: 0, failureCount: 0 });
      } catch {
        /* prefer staying in call on transient API errors */
      }
    };

    let timeoutId;
    const scheduleRoomHealth = () => {
      // Fast enough to confirm ~5s alone; slightly slower when peers are visibly present
      const delay = (remoteStreamsRef.current?.length || 0) > 0 ? 2000 : 1500;
      timeoutId = setTimeout(async () => {
        await tick();
        scheduleRoomHealth();
      }, delay);
    };
    scheduleRoomHealth();
    return () => clearTimeout(timeoutId);
  }, []);

  // ---- Pull stranger cooldown countdown ------------------------------------
  const isPullStrangerCooldownActive = pullStrangerCooldownSec > 0;
  useEffect(() => {
    if (!isPullStrangerCooldownActive) return;
    const id = setInterval(() => {
      setPullStrangerCooldownSec(prev => {
        const next = prev > 0 ? prev - 1 : 0;
        if (next > 0 && next % 3 === 0 && roomInfoRef.current?.roomId) {
          send({ type: 'chat-message', data: { roomId: roomInfoRef.current.roomId, message: JSON.stringify({ isSummoningActive: true, senderId: userIdRef.current }) } });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPullStrangerCooldownActive]);

  // ---- Loading meme carousel -----------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let cycleInterval = null;
    const normalizeMeme = (meme) => meme ? { imageUrl: meme.imageUrl || '', text: meme.text } : null;
    (async () => {
      try {
        const response = await apiRequest(API.STREAMING.GET_LOADING_MEMES);
        if (cancelled) return;
        const activeMemes = Array.isArray(response?.memes) ? response.memes.filter(meme => meme && (meme.imageUrl || meme.text)) : [];
        if (activeMemes.length > 0) {
          const orderedMemes = activeMemes.filter(m => Number.isFinite(Number(m.order))).sort((a, b) => Number(a.order) - Number(b.order));
          const memesToCycle = orderedMemes.length > 0 ? orderedMemes : activeMemes;
          let currentIndex = 0;
          if (orderedMemes.length > 0) {
            const key = 'beam_loading_meme_order_index';
            const prev = Number.parseInt(localStorage.getItem(key) || '0', 10);
            currentIndex = Number.isFinite(prev) ? prev % memesToCycle.length : 0;
            localStorage.setItem(key, String((currentIndex + 1) % memesToCycle.length));
          } else { currentIndex = Math.floor(Math.random() * memesToCycle.length); }
          setLoadingMeme(normalizeMeme(memesToCycle[currentIndex]));
          if (memesToCycle.length > 1) {
            cycleInterval = setInterval(() => { currentIndex = (currentIndex + 1) % memesToCycle.length; setLoadingMeme(normalizeMeme(memesToCycle[currentIndex])); }, 2000);
          }
          return;
        }
      } catch { }
      try {
        const response = await apiRequest(API.STREAMING.GET_RANDOM_LOADING_MEME);
        if (cancelled) return;
        setLoadingMeme(normalizeMeme(response?.meme || response));
      } catch { if (!cancelled) setLoadingMeme({ imageUrl: '', text: '' }); }
    })();
    return () => { cancelled = true; if (cycleInterval) clearInterval(cycleInterval); };
  }, []);

  // Remote stream count changes — end summoning only when someone beyond the
  // original squad/match set joins (stranger). Squads of 3 already have 2 remotes
  // before pull-stranger; clearing at n>=2 was wiping the Summoning overlay.
  useEffect(() => {
    const n = remoteStreams.length;
    const prev = prevRemoteStreamCountRef.current;
    prevRemoteStreamCountRef.current = n;
    if (n > 0 && peerLeftAutoResumeTimerRef.current) { clearTimeout(peerLeftAutoResumeTimerRef.current); peerLeftAutoResumeTimerRef.current = null; remoteMediaMissingSinceRef.current = null; }

    const memberIds = roomInfoRef.current?.memberIds;
    const expectedBaseRemotes =
      Array.isArray(memberIds) && memberIds.length >= 2
        ? memberIds.length - 1
        : 1;

    if (n > expectedBaseRemotes) {
      setPullStrangerCooldownSec(s => s > 0 ? 0 : s);
      setRoomSummoningUserId(null);
      suppressAutoResumeUntilRef.current = 0;
      setRoomHealthDebug(d => d.graceActive ? { graceActive: false, graceRemainingSec: 0, failureCount: d.failureCount } : d);
      return;
    }

    if (n >= 2) {
      // Friends connected; keep summoning UI if pull-stranger window is still active.
      suppressAutoResumeUntilRef.current = 0;
      setRoomHealthDebug(d => d.graceActive ? { graceActive: false, graceRemainingSec: 0, failureCount: d.failureCount } : d);
      return;
    }

    if (n === 1 && prev >= 2) {
      suppressAutoResumeUntilRef.current = 0;
      setPullStrangerCooldownSec(s => s > 0 ? 0 : s);
      setRoomSummoningUserId(null);
      setRoomHealthDebug(d => d.graceActive || d.graceRemainingSec !== 0 ? { graceActive: false, graceRemainingSec: 0, failureCount: d.failureCount } : d);
    }
  }, [remoteStreams.length]);

  // Media-level safety watcher
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (intentionalExitRef.current || autoTransitioningRef.current) return;
      if (status !== 'connected') return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (mediaPausedForBackgroundRef.current) return;
      if (localMediaRecoveryInFlightRef.current) return;
      const remoteStream = remoteStreamsRef.current[0]?.stream || null;
      if (remoteStream) {
        hadRemoteMediaRef.current = true;
        const tracks = remoteStream.getTracks();
        const allEnded = tracks.length > 0 && tracks.every(t => t.readyState === 'ended');
        if (allEnded) { if (!remoteMediaMissingSinceRef.current) remoteMediaMissingSinceRef.current = Date.now(); }
        else { remoteMediaMissingSinceRef.current = null; }
      } else if (hadRemoteMediaRef.current) {
        if (!remoteMediaMissingSinceRef.current) remoteMediaMissingSinceRef.current = Date.now();
      } else { remoteMediaMissingSinceRef.current = null; }
      if (remoteMediaMissingSinceRef.current) {
        const missingForMs = Date.now() - remoteMediaMissingSinceRef.current;
        if (missingForMs >= 30000) { if (isBroadcastingRef.current) return; flowLog('media_health_auto_resume', { missingForMs }); await handlePeerLeftAutoResume(); }
      }
    }, 2000);
    return () => clearInterval(intervalId);
  }, [status]);

  // ---- Squad quick-invite helpers ------------------------------------------
  function tryRecordSquadQuickInvitePeersOnLeaveKeepalive() {
    const info = roomInfoRef.current; const uid = userIdRef.current;
    if (!info?.roomId || info.callType !== 'squad' || !uid) return;
    if (squadQuickInvitePeersPostedRoomIdRef.current === info.roomId) return;
    const ids = Array.isArray(info.memberIds) ? info.memberIds : [];
    const peers = ids.filter(id => id && String(id) !== String(uid));
    if (!peers.length) return;
    squadQuickInvitePeersPostedRoomIdRef.current = info.roomId;
    recordSquadCallPeersKeepalive(info, uid);
  }

  async function tryRecordSquadQuickInvitePeersOnLeaveAsync() {
    const info = roomInfoRef.current; const uid = userIdRef.current;
    if (!info?.roomId || info.callType !== 'squad' || !uid) return;
    if (squadQuickInvitePeersPostedRoomIdRef.current === info.roomId) return;
    const ids = Array.isArray(info.memberIds) ? info.memberIds : [];
    const peers = ids.filter(id => id && String(id) !== String(uid));
    if (!peers.length) return;
    squadQuickInvitePeersPostedRoomIdRef.current = info.roomId;
    try { await recordSquadCallPeersAsync(info, uid); }
    catch (e) { console.warn('[SquadQuickInvite] record-call-peers failed', e); squadQuickInvitePeersPostedRoomIdRef.current = null; }
  }

  // ---- Leave helpers -------------------------------------------------------
  function markReturningToHomeIdle() { try { sessionStorage.setItem('hmm:leftCallToHome', '1'); } catch { } }
  function signalLeaveRoomWs() {
    const roomId = roomInfoRef.current?.roomId;
    if (wsRef.current?.readyState === WebSocket.OPEN && roomId) {
      try { wsRef.current.send(JSON.stringify({ type: 'leave-room', data: { roomId } })); } catch { }
    }
  }

  function beginLeaveCallToHomeReliable() {
    if (leaveCleanupStartedRef.current || intentionalExitRef.current) return Promise.resolve();
    leaveCleanupStartedRef.current = true;
    intentionalExitRef.current = true;
    markReturningToHomeIdle();
    signalLeaveRoomWs();
    localStorage.removeItem('currentRoom');
    return leaveRoomAndSetStatusReliable('ONLINE');
  }

  function leaveRoomAndSetOnline() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      let userId = userIdRef.current;
      if (!userId) { try { const payload = JSON.parse(atob(token.split('.')[1])); userId = payload.sub || payload.uid || payload.id; userIdRef.current = userId; } catch { } }
      tryRecordSquadQuickInvitePeersOnLeaveKeepalive();
      const roomId = roomInfoRef.current?.roomId;
      if (roomId && userId) {
        fetch(API.STREAMING.LEAVE_ROOM(roomId), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ userId }), keepalive: true }).catch(() => { });
      }
      markReturningToHomeIdle();
      exitCallToHomeKeepalive();
    } catch { }
  }

  async function leaveRoomAndSetStatusReliable(nextStatus = 'ONLINE') {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      let userId = userIdRef.current;
      if (!userId) { try { const payload = JSON.parse(atob(token.split('.')[1])); userId = payload.sub || payload.uid || payload.id; userIdRef.current = userId; } catch { } }
      await tryRecordSquadQuickInvitePeersOnLeaveAsync();
      const roomId = roomInfoRef.current?.roomId;
      if (roomId && userId) {
        try { await apiRequest(API.STREAMING.LEAVE_ROOM(roomId), { method: 'POST', body: JSON.stringify({ userId }) }); }
        catch (err) {
          console.warn('[Leave] Reliable leave failed, falling back to keepalive:', err);
          const token2 = localStorage.getItem('accessToken');
          fetch(API.STREAMING.LEAVE_ROOM(roomId), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` }, body: JSON.stringify({ userId }), keepalive: true }).catch(() => { });
        }
      }
      if (nextStatus === 'AVAILABLE') {
        await exitCallResumeDiscovery(roomInfoRef.current?.sessionId || roomInfo?.sessionId || Date.now().toString());
      } else { await exitCallToHome(); }
    } catch { }
  }

  const resumeDiscoveryFromCall = (sessionIdOverride = null) => {
    const sid = sessionIdOverride || roomInfoRef.current?.sessionId || roomInfo?.sessionId || Date.now().toString();
    localStorage.setItem('resumeDiscoveryOnHome', JSON.stringify({ sessionId: sid }));
    localStorage.setItem('forceDiscoveryResume', JSON.stringify({ sessionId: sid }));
    localStorage.setItem('pendingRaincheckResume', JSON.stringify({ sessionId: sid, nextCard: null }));
    router.replace(`/?resumeDiscovery=1&sessionId=${encodeURIComponent(sid)}`);
  };

  const goHomeIdleFromCall = useCallback(async () => {
    await beginLeaveCallToHomeReliable();
    cleanup();
    clearDiscoveryResumeIntent();
    router.replace('/', { scroll: false });
  }, [router]);

  useEffect(() => {
    const onPopState = () => { void goHomeIdleFromCall(); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [goHomeIdleFromCall]);

  // ---- Peer left / auto-resume ---------------------------------------------
  const markRoomAsBroadcasting = (roomState = null) => {
    isBroadcastingRef.current = true;
    setIsBroadcasting(true);
    setRoomInfo((prev) => {
      const base = prev || roomInfoRef.current;
      if (!base) return prev;
      const next = {
        ...base,
        isBroadcasting: true,
        callType: base.callType || 'broadcast',
        ...(roomState?.roomId ? { roomId: roomState.roomId } : {})
      };
      roomInfoRef.current = next;
      return next;
    });
  };

  const currentRoomIsBroadcasting = () =>
    isBroadcastingRef.current ||
    roomInfoRef.current?.isBroadcasting === true ||
    roomInfoRef.current?.callType === 'broadcast' ||
    roomInfo?.isBroadcasting === true ||
    roomInfo?.callType === 'broadcast';

  const refreshCurrentRoomBroadcasting = async (reason = 'peer-left') => {
    const uid = userIdRef.current;
    if (!uid) return false;
    try {
      const roomState = await apiRequest(API.STREAMING.GET_USER_ROOM(uid));
      const isActiveBroadcast = Boolean(roomState?.exists) &&
        (roomState?.isBroadcasting === true || roomState?.callType === 'broadcast');
      if (isActiveBroadcast) {
        markRoomAsBroadcasting(roomState);
        flowLog('solo_beamcast_auto_exit_suppressed', { reason, roomId: roomState.roomId });
        return true;
      }
    } catch { }
    return false;
  };

  const shouldAutoResumeAfterPeerLeft = async () => {
    const uid = userIdRef.current;
    if (!uid) return true;
    try {
      const roomState = await apiRequest(API.STREAMING.GET_USER_ROOM(uid));
      if (!roomState?.exists) return true;
      if (roomState?.isBroadcasting === true || roomState?.callType === 'broadcast') return false;
      const participants = Array.isArray(roomState.participants) ? roomState.participants : [];
      const activeOthers = participants.filter(p => String(p.userId) !== String(uid));
      return activeOthers.length === 0;
    } catch {
      // On API failure, prefer staying in the call over a false drop.
      return false;
    }
  };

  const handlePeerLeftAutoResume = async () => {
    if (currentRoomIsBroadcasting()) { remoteMediaMissingSinceRef.current = null; return; }
    if (await refreshCurrentRoomBroadcasting('peer-left-auto-resume')) { remoteMediaMissingSinceRef.current = null; return; }
    if (!(await shouldAutoResumeAfterPeerLeft())) {
      remoteMediaMissingSinceRef.current = null;
      return;
    }
    if (autoTransitioningRef.current) return;
    autoTransitioningRef.current = true;
    intentionalExitRef.current = true;
    const sid = roomInfoRef.current?.sessionId || roomInfo?.sessionId || Date.now().toString();
    await leaveRoomAndSetStatusReliable('AVAILABLE');
    cleanup();
    localStorage.removeItem('currentRoom');
    resumeDiscoveryFromCall(sid);
  };

  const handleRaincheckNext = async () => {
    if (isRainchecking) return;
    setIsRainchecking(true);
    intentionalExitRef.current = true;
    try {
      const token = localStorage.getItem('accessToken');
      const partnerId = roomInfoRef.current?.partner?.id || partnerInfo.id;
      const sid = roomInfoRef.current?.sessionId || roomInfo?.sessionId || Date.now().toString();
      if (wsRef.current?.readyState === WebSocket.OPEN && roomInfoRef.current?.roomId) {
        wsRef.current.send(JSON.stringify({ type: 'chat-message', data: { roomId: roomInfoRef.current.roomId, message: JSON.stringify({ isPeerNextClicked: true, sessionId: sid }) } }));
      }
      localStorage.setItem('resumeDiscoveryOnHome', JSON.stringify({ sessionId: sid }));
      localStorage.setItem('forceDiscoveryResume', JSON.stringify({ sessionId: sid }));
      if (token && partnerId) {
        try {
          await apiRequest(API.DISCOVERY.RAINCHECK, { method: 'POST', body: JSON.stringify({ sessionId: sid, raincheckedUserId: partnerId }) });
          localStorage.setItem('pendingRaincheckResume', JSON.stringify({ sessionId: sid, nextCard: null }));
        } catch (error) {
          console.warn('[Raincheck] Failed to record raincheck from call:', error);
          localStorage.setItem('pendingRaincheckResume', JSON.stringify({ sessionId: sid, nextCard: null }));
        }
      }
      if (wsRef.current?.readyState === WebSocket.OPEN && roomInfo?.roomId) {
        wsRef.current.send(JSON.stringify({ type: 'leave-room', data: { roomId: roomInfo.roomId } }));
      }
      await leaveRoomAndSetStatusReliable('AVAILABLE');
      cleanup();
      localStorage.removeItem('currentRoom');
      resumeDiscoveryFromCall(sid);
    } finally { setIsRainchecking(false); }
  };

  const handleLeaveGroupOrRaincheck = async () => {
    if (isRainchecking) return;
    const n = remoteStreamsRef.current.length;
    if (n <= 1) { await handleRaincheckNext(); return; }
    setIsRainchecking(true);
    intentionalExitRef.current = true;
    try {
      const sid = roomInfoRef.current?.sessionId || roomInfo?.sessionId || Date.now().toString();
      if (wsRef.current?.readyState === WebSocket.OPEN && roomInfoRef.current?.roomId) {
        wsRef.current.send(JSON.stringify({ type: 'leave-room', data: { roomId: roomInfoRef.current.roomId } }));
      }
      await leaveRoomAndSetStatusReliable('AVAILABLE');
      cleanup();
      localStorage.removeItem('currentRoom');
      resumeDiscoveryFromCall(sid);
    } finally { setIsRainchecking(false); }
  };

  // ---- WebSocket send helper -----------------------------------------------
  const send = (msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  };

  // ---- Screen share --------------------------------------------------------
  const waitForSendTransport = (timeoutMs = 10000) =>
    new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        const transport = sendTransportRef.current;
        const wsOpen = wsRef.current?.readyState === WebSocket.OPEN;
        if (transport && !transport.closed && wsOpen && roomInfoRef.current?.roomId) {
          resolve(transport);
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          resolve(null);
          return;
        }
        setTimeout(tick, 250);
      };
      tick();
    });

  const produceScreenTrack = async (track) => {
    const transport = sendTransportRef.current;
    if (!transport || transport.closed) {
      throw new Error('Call connection is not ready for screen share.');
    }
    pendingVideoProduceSourceRef.current = 'screen';
    const screenProduce = {
      track,
      encodings: getScreenShareEncodings(),
      appData: { source: 'screen' },
      stopTracks: false,
    };
    const screenCodec = pickH264VideoCodec(deviceRef.current);
    if (screenCodec) screenProduce.codec = screenCodec;
    try {
      return await transport.produce(screenProduce);
    } catch {
      pendingVideoProduceSourceRef.current = 'screen';
      return await transport.produce({
        track,
        appData: { source: 'screen' },
        stopTracks: false,
      });
    }
  };

  const stopScreenShare = useCallback(() => {
    screenShareInFlightRef.current = false;
    const producer = localScreenMsProducerRef.current;
    const rid = roomInfoRef.current?.roomId;
    if (producer && rid) send({ type: 'close-producer', data: { roomId: rid, producerId: producer.id } });
    try { producer?.close?.(); } catch { }
    localScreenMsProducerRef.current = null;
    localScreenStreamRef.current?.getTracks().forEach(t => t.stop());
    localScreenStreamRef.current = null;
    pendingVideoProduceSourceRef.current = 'camera';
    setIsScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (localScreenMsProducerRef.current || screenShareInFlightRef.current) return;
    if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') {
      window.alert('Screen sharing is not supported in this browser. Try Chrome on desktop, or Safari 17+ on iPhone.');
      return;
    }

    screenShareInFlightRef.current = true;
    try {
      let screenStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia(getScreenShareConstraints());
      } catch (firstErr) {
        if (firstErr?.name === 'NotAllowedError' || firstErr?.name === 'AbortError') throw firstErr;
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      }

      const track = screenStream.getVideoTracks()[0];
      if (!track) {
        screenStream.getTracks().forEach((t) => t.stop());
        throw new Error('No screen video track was captured.');
      }
      try { track.contentHint = 'detail'; } catch { /* ignore */ }
      track.onended = () => stopScreenShare();
      localScreenStreamRef.current = screenStream;

      // The picker backgrounds the tab (especially on mobile) and often drops
      // the signaling socket. Wait for it to come back before producing.
      const transport = await waitForSendTransport();
      if (!transport) {
        throw new Error('Call connection dropped while picking a screen. Please try again.');
      }
      if (localScreenMsProducerRef.current && !localScreenMsProducerRef.current.closed) {
        setIsScreenSharing(true);
        return;
      }

      const producer = await Promise.race([
        produceScreenTrack(track),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Screen share timed out. Please try again.')), 15000);
        }),
      ]);
      localScreenMsProducerRef.current = producer;
      setIsScreenSharing(true);
    } catch (e) {
      const cancelled = e?.name === 'NotAllowedError' || e?.name === 'AbortError';
      if (!cancelled) {
        console.warn('[WebRTC] Screen share failed', e);
        window.alert(e?.message || 'Could not share screen. Please try again.');
      }
      localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
      try { localScreenMsProducerRef.current?.close?.(); } catch { }
      localScreenMsProducerRef.current = null;
      pendingVideoProduceSourceRef.current = 'camera';
      setIsScreenSharing(false);
    } finally {
      screenShareInFlightRef.current = false;
    }
  }, [stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (localScreenMsProducerRef.current) stopScreenShare();
    else void startScreenShare();
  }, [stopScreenShare, startScreenShare]);

  // ---- Mediasoup helpers ---------------------------------------------------
  const scheduleGetProducersRetries = (targetRoomId) => {
    const delays = [3500, 8000, 16000];
    getProducersRetryTimeoutsRef.current.forEach(tid => clearTimeout(tid));
    getProducersRetryTimeoutsRef.current = [];
    delays.forEach((ms, idx) => {
      const tid = setTimeout(() => {
        if (intentionalExitRef.current) return;
        if (roomInfoRef.current?.roomId !== targetRoomId) return;
        if (remoteStreamsRef.current.length > 0) return;
        if (!recvTransportRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
        console.log(`[WebRTC] get-producers retry ${idx + 1}/${delays.length}`);
        send({ type: 'get-producers', data: { roomId: targetRoomId } });
      }, ms);
      getProducersRetryTimeoutsRef.current.push(tid);
    });
  };

  const refreshCallRolesFromServer = async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    try {
      const room = await apiRequest(API.STREAMING.GET_USER_ROOM(uid));
      if (!room?.exists || !room.participants?.length) return;
      const byUserId = {};
      room.participants.forEach(p => { byUserId[String(p.userId)] = p.role; });
      setCallRoles({ isLocalHost: room.userRole === 'HOST', byUserId });
    } catch (e) { console.warn('[VideoChat] refreshCallRolesFromServer failed', e); }
  };

  const scheduleCallRoleRefresh = () => {
    if (callRoleRefreshTimerRef.current) clearTimeout(callRoleRefreshTimerRef.current);
    callRoleRefreshTimerRef.current = setTimeout(() => { callRoleRefreshTimerRef.current = null; refreshCallRolesFromServer(); }, 400);
  };

  const removeRemoteParticipantFromUi = (leftIdRaw, opts = {}) => {
    const { skipPeerLeftAutoResume = false } = opts;
    const leftId = String(leftIdRaw);
    let remainingAfter = 0;
    setRemoteStreams(prev => {
      const next = prev.filter(s => String(s.userId) !== leftId);
      remainingAfter = next.length;
      remoteStreamsRef.current = next;
      return next;
    });
    for (const [pid, meta] of [...producerIdToMetaRef.current.entries()]) {
      if (String(meta.uiRemoteId) === leftId) producerIdToMetaRef.current.delete(pid);
    }
    const cids = consumerIdsByUserRef.current[leftId];
    if (cids?.length) {
      cids.forEach(cid => { try { consumersRef.current[cid]?.close?.(); } catch { } delete consumersRef.current[cid]; });
    }
    delete consumerIdsByUserRef.current[leftId];
    setCallRoles(prev => { const nextBy = { ...prev.byUserId }; delete nextBy[leftId]; return { ...prev, byUserId: nextBy }; });
    if (remainingAfter === 0 && remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remainingAfter === 0 && !skipPeerLeftAutoResume) {
      remoteMediaMissingSinceRef.current = Date.now();
      if (peerLeftAutoResumeTimerRef.current) clearTimeout(peerLeftAutoResumeTimerRef.current);
      const targetRoomId = roomInfoRef.current?.roomId;
      if (targetRoomId) scheduleGetProducersRetries(targetRoomId);
      peerLeftAutoResumeTimerRef.current = setTimeout(() => {
        peerLeftAutoResumeTimerRef.current = null;
        if (intentionalExitRef.current || autoTransitioningRef.current) return;
        if ((remoteStreamsRef.current?.length || 0) > 0) return;
        handlePeerLeftAutoResume();
      }, 5000);
    } else {
      remoteMediaMissingSinceRef.current = null;
      if (peerLeftAutoResumeTimerRef.current) { clearTimeout(peerLeftAutoResumeTimerRef.current); peerLeftAutoResumeTimerRef.current = null; }
    }
  };

  const handleKickRemote = (targetUserId) => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    if (!rid || !targetUserId) return;
    send({ type: 'kick-user', data: { roomId: rid, targetUserId: String(targetUserId) } });
  };

  // ---- Consume (recv mediasoup track) -------------------------------------
  const consume = (producerId, remoteUserId, producerMeta = {}) => {
    const producerKey = String(producerId || '');
    if (!producerKey) return;
    if (consumedProducerIdsRef.current.has(producerKey) || consumingProducerIdsRef.current.has(producerKey)) return;
    if (!recvTransportRef.current) {
      if (!consumeRetryTimeoutsRef.current.has(producerKey)) {
        const tid = setTimeout(() => { consumeRetryTimeoutsRef.current.delete(producerKey); consume(producerId, remoteUserId, producerMeta); }, 1000);
        consumeRetryTimeoutsRef.current.set(producerKey, tid);
      }
      return;
    }
    consumingProducerIdsRef.current.add(producerKey);
    const preferredLayers = getPreferredConsumerLayers({ kind: producerMeta.kind, source: producerMeta.source, remoteCount: remoteStreamsRef.current.length + 1 });
    send({ type: 'consume', data: { roomId: roomInfoRef.current.roomId, transportId: recvTransportRef.current.id, producerId: producerKey, rtpCapabilities: deviceRef.current.rtpCapabilities, ...(preferredLayers ? { preferredLayers } : {}) } });
  };

  // ---- Signal handler ------------------------------------------------------
  const handleSignal = async (msg, info, userId) => {
    const { type, data } = msg;
    realtimeDebug('[WebRTC] Handling signal:', type, data);

    switch (type) {
      case 'room-joined': {
        console.log('[WebRTC] Room joined, loading device...');
        const recvTransport = recvTransportRef.current;
        const sendTransport = sendTransportRef.current;
        const hasLiveMediasoup = deviceRef.current && recvTransport && !recvTransport.closed && sendTransport && !sendTransport.closed;
        if (hasLiveMediasoup) {
          if (data.participantRoles?.length) {
            const byUserId = {};
            data.participantRoles.forEach(({ userId: id, role }) => { byUserId[String(id)] = role; });
            setCallRoles({ isLocalHost: data.myRole === 'HOST', byUserId });
          }
          mediaEstablishGraceUntilRef.current = Date.now() + MEDIA_ESTABLISH_GRACE_MS;
          setStatus('connected');
          if (Array.isArray(data.producers) && data.producers.length > 0) {
            data.producers.forEach(p => { const isSameUser = sameParticipantId(p.userId, userIdRef.current); const isMyProducer = myProducerIdsRef.current.has(String(p.producerId)); if (!isSameUser || !isMyProducer) consume(p.producerId, p.userId, { kind: p.kind, source: p.source }); });
          }
          send({ type: 'get-producers', data: { roomId: info.roomId } });
          break;
        }
        if (deviceRef.current || sendTransportRef.current || recvTransportRef.current) teardownMediasoupState({ clearRemoteStreams: false });
        if (data.participantRoles?.length) {
          const byUserId = {};
          data.participantRoles.forEach(({ userId: id, role }) => { byUserId[String(id)] = role; });
          setCallRoles({ isLocalHost: data.myRole === 'HOST', byUserId });
        }
        mediaEstablishGraceUntilRef.current = Date.now() + MEDIA_ESTABLISH_GRACE_MS;
        const { Device } = await import('mediasoup-client');
        const device = new Device();
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        deviceRef.current = device;
        if (Array.isArray(data.producers) && data.producers.length > 0) {
          pendingProducersRef.current.push(...data.producers.map(p => ({ producerId: p.producerId, remoteUserId: p.userId, kind: p.kind, source: p.source })));
        }
        setStatus('connected');
        send({ type: 'create-transport', data: { roomId: info.roomId, producing: true, consuming: false } });
        break;
      }

      case 'producers-list': {
        if (!data || !Array.isArray(data)) { console.log('[WebRTC] No producers in room yet'); return; }
        data.forEach(p => {
          const isSameUser = sameParticipantId(p.userId, userIdRef.current);
          const isMyProducer = myProducerIdsRef.current.has(String(p.producerId));
          if (!isSameUser || !isMyProducer) {
            if (!recvTransportRef.current) { pendingProducersRef.current.push({ producerId: p.producerId, remoteUserId: p.userId, kind: p.kind, source: p.source }); }
            else consume(p.producerId, p.userId, { kind: p.kind, source: p.source });
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
          transport.on('connect', ({ dtlsParameters: dp }, cb) => { send({ type: 'connect-transport', data: { roomId: info.roomId, transportId: id, dtlsParameters: dp } }); cb(); });
          transport.on('produce', ({ kind, rtpParameters, appData }, cb, errback) => {
            const rid = roomInfoRef.current?.roomId || info.roomId;
            if (wsRef.current?.readyState !== WebSocket.OPEN) {
              errback?.(new Error('Signaling disconnected'));
              return;
            }
            if (kind === 'video') {
              if (!producersRef.current.videoCbQueue) producersRef.current.videoCbQueue = [];
              producersRef.current.videoCbQueue.push(cb);
              // Prefer per-produce appData so camera + screen never cross-tag via a shared ref.
              const src =
                appData?.source === 'screen' || pendingVideoProduceSourceRef.current === 'screen'
                  ? 'screen'
                  : 'camera';
              send({ type: 'produce', data: { roomId: rid, transportId: id, kind, rtpParameters, source: src } });
            } else {
              producersRef.current.resolve_audio = cb;
              send({ type: 'produce', data: { roomId: rid, transportId: id, kind, rtpParameters } });
            }
          });
          send({ type: 'create-transport', data: { roomId: info.roomId, producing: false, consuming: true } });
          if (localStreamRef.current) {
            const vTrack = localStreamRef.current.getVideoTracks()[0];
            const aTrack = localStreamRef.current.getAudioTracks()[0];
            const publish = async () => {
              if (vTrack) {
                pendingVideoProduceSourceRef.current = 'camera';
                try { const videoProducer = await transport.produce(buildCameraVideoProduceOptions(device, vTrack)); producersRef.current.video = videoProducer; }
                catch (e) {
                  const fallback = await transport.produce({
                    track: vTrack,
                    encodings: [{ maxBitrate: isMobileRuntime() ? 900_000 : 2_500_000 }],
                    appData: { source: 'camera' },
                  }).catch(console.error);
                  if (fallback) producersRef.current.video = fallback;
                }
                applyLocalCameraEnabled(!isCamOffRef.current);
                broadcastCamOffState(isCamOffRef.current);
              }
              if (aTrack) { const audioProducer = await transport.produce({ track: aTrack }).catch(console.error); if (audioProducer) producersRef.current.audio = audioProducer; }
              const liveScreenTrack = localScreenStreamRef.current?.getVideoTracks?.().find((t) => t.readyState === 'live');
              // If startScreenShare is still in flight, it will produce after the picker.
              if (liveScreenTrack && !screenShareInFlightRef.current) {
                pendingVideoProduceSourceRef.current = 'screen';
                try {
                  const screenProducer = await transport.produce({
                    track: liveScreenTrack,
                    encodings: getScreenShareEncodings(),
                    appData: { source: 'screen' },
                    stopTracks: false,
                  });
                  localScreenMsProducerRef.current = screenProducer;
                  setIsScreenSharing(true);
                } catch (e) {
                  console.warn('[WebRTC] Re-publish screen share failed', e);
                }
              }
            };
            publish().catch(console.error);
          }
        } else {
          const transport = device.createRecvTransport({ id, iceParameters, iceCandidates, dtlsParameters });
          recvTransportRef.current = transport;
          transport.on('connect', ({ dtlsParameters: dp }, cb) => { send({ type: 'connect-transport', data: { roomId: info.roomId, transportId: id, dtlsParameters: dp } }); cb(); });
          const queued = pendingProducersRef.current.splice(0);
          if (queued.length > 0) queued.forEach(({ producerId, remoteUserId, kind, source }) => consume(producerId, remoteUserId, { kind, source }));
          send({ type: 'get-producers', data: { roomId: info.roomId } });
          scheduleGetProducersRetries(info.roomId);
          broadcastCamOffState(isCamOffRef.current);
        }
        break;
      }

      case 'produced': {
        if (data?.id != null) myProducerIdsRef.current.add(String(data.id));
        if (data.kind === 'video') { const q = producersRef.current.videoCbQueue || []; const fn = q.shift(); fn?.({ id: data.id }); }
        else if (data.kind === 'audio') { producersRef.current.resolve_audio?.({ id: data.id }); }
        if (data.kind === 'video') pendingVideoProduceSourceRef.current = 'camera';
        break;
      }

      case 'new-producer': {
        const isSameUser = sameParticipantId(data.userId, userIdRef.current);
        const isMyProducer = myProducerIdsRef.current.has(String(data.producerId));
        if (isSameUser && isMyProducer) return;
        scheduleCallRoleRefresh();
        if (!recvTransportRef.current) { pendingProducersRef.current.push({ producerId: data.producerId, remoteUserId: data.userId, kind: data.kind, source: data.source }); return; }
        consume(data.producerId, data.userId, { kind: data.kind, source: data.source });
        broadcastCamOffState(isCamOffRef.current);
        break;
      }

      case 'consumed': {
        const { id, producerId, kind, rtpParameters, userId: remoteId, source: remoteSource } = data;
        const producerKey = String(producerId || '');
        if (producerKey) { consumingProducerIdsRef.current.delete(producerKey); consumedProducerIdsRef.current.add(producerKey); }
        const consumer = await recvTransportRef.current.consume({ id, producerId, kind, rtpParameters });
        consumersRef.current[id] = consumer;
        consumer.on?.('transportclose', () => { delete consumersRef.current[id]; });
        consumer.track.onended = () => { delete consumersRef.current[id]; consumedProducerIdsRef.current.delete(String(producerId || '')); };
        const uiRemoteId = remoteId != null && remoteId !== '' ? remoteId : `producer:${producerId}`;
        const uidKey = String(uiRemoteId);
        const vSource = kind === 'video' ? remoteSource || 'camera' : 'audio';
        producerIdToMetaRef.current.set(String(producerId), { uiRemoteId: uidKey, source: vSource });
        if (!consumerIdsByUserRef.current[uidKey]) consumerIdsByUserRef.current[uidKey] = [];
        consumerIdsByUserRef.current[uidKey].push(id);
        setRemoteStreams(prev => {
          const existing = prev.find(s => sameParticipantId(s.userId, uiRemoteId));
          let next;
          if (kind === 'video' && vSource === 'screen') {
            if (existing) next = prev.map(s => sameParticipantId(s.userId, uiRemoteId) ? { ...s, screenStream: replaceScreenTrackInStream(s.screenStream, consumer.track) } : s);
            else next = [...prev, { userId: uiRemoteId, stream: new MediaStream(), screenStream: replaceScreenTrackInStream(null, consumer.track), name: '', age: '', displayPictureUrl: '', city: '', profileFetched: false }];
          } else if (existing) {
            next = prev.map(s => sameParticipantId(s.userId, uiRemoteId) ? { ...s, stream: replaceKindTrackInStream(s.stream, consumer.track) } : s);
          } else {
            next = [...prev, { userId: uiRemoteId, stream: replaceKindTrackInStream(null, consumer.track), name: '', age: '', displayPictureUrl: '', city: '', profileFetched: false }];
          }
          remoteStreamsRef.current = next;
          if (next.length > 0) hadRemotePeerInSessionRef.current = true;
          return next;
        });
        await consumer.resume?.();
        break;
      }

      case 'producer-closed': {
        const { producerId: closedPid } = data || {};
        if (!closedPid) break;
        const pid = String(closedPid);
        consumingProducerIdsRef.current.delete(pid); consumedProducerIdsRef.current.delete(pid);
        const retryTid = consumeRetryTimeoutsRef.current.get(pid);
        if (retryTid) clearTimeout(retryTid);
        consumeRetryTimeoutsRef.current.delete(pid);
        const meta = producerIdToMetaRef.current.get(pid);
        const trackByConsumer = (() => { for (const cid of Object.keys(consumersRef.current)) { const c = consumersRef.current[cid]; if (c && String(c.producerId) === pid) return { cid, consumer: c, track: c.track }; } return null; })();
        if (trackByConsumer) { try { trackByConsumer.consumer.close(); } catch { } delete consumersRef.current[trackByConsumer.cid]; }
        if (meta) {
          producerIdToMetaRef.current.delete(pid);
          const uidKey = String(meta.uiRemoteId);
          if (trackByConsumer && consumerIdsByUserRef.current[uidKey]) {
            consumerIdsByUserRef.current[uidKey] = consumerIdsByUserRef.current[uidKey].filter(x => x !== trackByConsumer.cid);
          }
          const tr = trackByConsumer?.track;
          setRemoteStreams(prev => {
            const next = prev.map(s => {
              if (!sameParticipantId(s.userId, meta.uiRemoteId)) return s;
              if (meta.source === 'screen') { if (s.screenStream && tr) removeTrackFromStream(s.screenStream, tr); const hasScreen = (s.screenStream?.getVideoTracks?.().length || 0) > 0; return { ...s, screenStream: hasScreen ? s.screenStream : null }; }
              if (tr) { removeTrackFromStream(s.stream, tr); return { ...s }; }
              return s;
            });
            remoteStreamsRef.current = next;
            return next;
          });
          // Producer closed can be transient during track replacement or network blips.
          // Refresh producers first, then only evict the tile if media stays dead.
          const targetRoomId = roomInfoRef.current?.roomId;
          if (targetRoomId) {
            setTimeout(() => {
              if (intentionalExitRef.current || autoTransitioningRef.current) return;
              send({ type: 'get-producers', data: { roomId: targetRoomId } });
            }, 2000);
          }
          setTimeout(() => {
            const entry = remoteStreamsRef.current.find(s => sameParticipantId(s.userId, meta.uiRemoteId));
            if (!entry) return;
            const liveTracks = (entry.stream?.getTracks?.() || []).filter(t => t.readyState !== 'ended').length;
            const liveScreenTracks = (entry.screenStream?.getTracks?.() || []).filter(t => t.readyState !== 'ended').length;
            if (liveTracks === 0 && liveScreenTracks === 0) {
              removeRemoteParticipantFromUi(entry.userId);
            }
          }, 8000);
        }
        break;
      }

      case 'participant-left': {
        removeRemoteParticipantFromUi(data.userId);
        if (roomSummoningUserIdRef.current && String(data.userId) === String(roomSummoningUserIdRef.current)) setRoomSummoningUserId(null);
        break;
      }

      case 'participant-kicked': {
        removeRemoteParticipantFromUi(data.kickedUserId, { skipPeerLeftAutoResume: true });
        scheduleCallRoleRefresh();
        if (data.pullStrangerReenabled) {
          setTimeout(() => { setPullStrangerCooldownSec(PULL_STRANGER_WINDOW_SECONDS); suppressAutoResumeUntilRef.current = Date.now() + (PULL_STRANGER_WINDOW_SECONDS * 1000); roomHealthFailureCountRef.current = 0; setRoomHealthDebug({ graceActive: true, graceRemainingSec: PULL_STRANGER_WINDOW_SECONDS, failureCount: 0 }); }, 100);
        } else if (!callRoles.isLocalHost && remoteStreamsRef.current.length === 1) {
          setTimeout(() => { setPullStrangerCooldownSec(PULL_STRANGER_WINDOW_SECONDS); suppressAutoResumeUntilRef.current = Date.now() + (PULL_STRANGER_WINDOW_SECONDS * 1000); roomHealthFailureCountRef.current = 0; setRoomHealthDebug({ graceActive: true, graceRemainingSec: PULL_STRANGER_WINDOW_SECONDS, failureCount: 0 }); }, 100);
        }
        break;
      }

      case 'user-kicked': {
        intentionalExitRef.current = true; cleanup(); localStorage.removeItem('currentRoom'); resumeDiscoveryFromCall();
        break;
      }

      case 'user-kicked-success': {
        if (data.targetUserId) removeRemoteParticipantFromUi(data.targetUserId, { skipPeerLeftAutoResume: true });
        scheduleCallRoleRefresh();
        if (data.pullStrangerReenabled) {
          setTimeout(() => { setPullStrangerCooldownSec(PULL_STRANGER_WINDOW_SECONDS); suppressAutoResumeUntilRef.current = Date.now() + (PULL_STRANGER_WINDOW_SECONDS * 1000); roomHealthFailureCountRef.current = 0; setRoomHealthDebug({ graceActive: true, graceRemainingSec: PULL_STRANGER_WINDOW_SECONDS, failureCount: 0 }); }, 100);
        } else if (callRoles.isLocalHost && remoteStreamsRef.current.length === 1) {
          setTimeout(() => { handlePullStranger(); }, 100);
        }
        break;
      }

      case 'pull-stranger-cancelled': {
        setPullStrangerCooldownSec(0); suppressAutoResumeUntilRef.current = 0; setRoomSummoningUserId(null);
        setRoomHealthDebug({ graceActive: false, graceRemainingSec: 0, failureCount: 0 });
        break;
      }

      case 'friend-request-sent': {
        const tid = data?.toUserId != null ? String(data.toUserId) : '';
        if (tid) setFriendRequestSentTo(prev => ({ ...prev, [tid]: true }));
        setIcebreaker('Friend request sent!'); setShowIcebreaker(true);
        setTimeout(() => setShowIcebreaker(false), 3000);
        break;
      }

      case 'friend-request-accepted': {
        const fid = data?.friendId != null ? String(data.friendId) : '';
        if (fid) { setFriendshipWithRemote(prev => ({ ...prev, [fid]: true })); setFriendRequestSentTo(prev => ({ ...prev, [fid]: true })); }
        break;
      }

      case 'icebreaker': {
        setIcebreaker(data.question); setShowIcebreaker(true);
        break;
      }

      case 'chat-message': {
        const myId = userIdRef.current;
        const pInfo = partnerInfoRef.current;
        const remotes = remoteStreamsRef.current;
        let isControlMessage = false; let controlParsed = null;
        try {
          if (data.message && data.message.startsWith('{')) {
            const parsed = JSON.parse(data.message);
            if (parsed && (parsed.isGift || parsed.isGiftDismissed || parsed.isDareSync || parsed.isDareResponse || parsed.isDareClose || parsed.isDareInitiated || parsed.isDiceRoll || parsed.isIcebreakerTrigger !== undefined || parsed.isSummoningActive !== undefined || parsed.isPeerNextClicked !== undefined || parsed.isCamOffChanged !== undefined)) {
              isControlMessage = true; controlParsed = parsed;
            }
          }
        } catch { }

        if (isControlMessage && controlParsed) {
          if (controlParsed.isCamOffChanged !== undefined) {
            const remoteUserId = controlParsed.senderId;
            const camOff = Boolean(controlParsed.isCamOff);
            setRemoteStreams(prev => {
              const next = prev.map(s => {
                if (String(s.userId) === String(remoteUserId)) {
                  return {
                    ...s,
                    videoEnabled: !camOff,
                    videoOn: !camOff
                  };
                }
                return s;
              });
              remoteStreamsRef.current = next;
              return next;
            });
            return;
          }
          if (controlParsed.isPeerNextClicked) { handlePeerLeftAutoResume(); return; }
          if (controlParsed.isDareSync) {
            if (String(controlParsed.targetUserId) === String(myId)) {
              setIsDareOpen(false); setSelectedGiftId(null); setDareAcceptanceStatus('idle');
              const senderStream = remotes.find(s => String(s.userId) === String(controlParsed.senderId));
              const displayName = senderStream?.name || controlParsed.senderName || 'Someone';
              setActiveDareProposal({
                dareText: controlParsed.dareText,
                marqueeStartAt: typeof controlParsed.marqueeStartAt === 'number'
                  ? controlParsed.marqueeStartAt
                  : Date.now(),
                giftId: controlParsed.giftId,
                giftImg: controlParsed.giftImg,
                giftPrice: controlParsed.giftPrice,
                senderId: controlParsed.senderId,
                senderName: displayName === 'You' ? 'Someone' : displayName,
              });
            }
          } else if (controlParsed.isDareResponse) {
            if (String(controlParsed.targetUserId) === String(myId)) setDareAcceptanceStatus(controlParsed.accepted ? 'accepted' : 'rejected');
          } else if (controlParsed.isDareClose) {
            if (String(controlParsed.targetUserId) === String(myId)) setActiveDareProposal(null);
          } else if (controlParsed.isDareInitiated) {
            if (String(controlParsed.targetUserId) === String(myId)) { setIsDareOpen(false); setSelectedGiftId(null); setDareAcceptanceStatus('idle'); setActiveDareProposal(null); }
          }



          else if (controlParsed.isIcebreakerTrigger !== undefined) {
            const broken = Boolean(controlParsed.isIcebreakerTrigger);

            setIsBroken(broken);

            if (broken) {
              // show popup for everyone
              setShowIcebreaker(true);
            } else {
              // hide popup for everyone
              setShowIcebreaker(false);
              setIcebreaker('');
            }
          } else if (controlParsed.isDiceRoll) {
            if (String(controlParsed.senderId) !== String(myId)) setIsRolling(true);
          } else if (controlParsed.isSummoningActive !== undefined) {
            if (String(controlParsed.senderId) !== String(myId)) {
              const active = Boolean(controlParsed.isSummoningActive);
              if (active) setRoomSummoningUserId(String(controlParsed.senderId));
              else setRoomSummoningUserId(prev => prev === String(controlParsed.senderId) ? null : prev);
            }
          } else if (controlParsed.isGiftDismissed) {
            const { messageId } = controlParsed;
            const mid = String(messageId);
            setActiveRemoteGifts(prev => prev.map(item =>
              String(item.gift?.messageId) === mid ? { ...item, isDismissed: true } : item
            ));
            setActiveLocalGifts(prev => prev.map(item =>
              String(item.messageId) === mid ? { ...item, isDismissed: true } : item
            ));
          } else if (controlParsed.isGift) {
            const messageId = controlParsed.messageId || data.id || data.messageId || Date.now().toString();
            let isProcessed = false;
            if (messageId) { if (processedGiftIdsRef.current.has(messageId)) isProcessed = true; else processedGiftIdsRef.current.add(messageId); }
            if (!isProcessed) {
              const { gift, targetUserId, senderId, isDare, dareText, marqueeStartAt } = controlParsed;
              const giftObj = {
                ...gift,
                messageId,
                targetUserId,
                senderId,
                isDare,
                dareText,
                marqueeStartAt: typeof marqueeStartAt === 'number' ? marqueeStartAt : undefined,
              };
              if (String(targetUserId) === String(myId)) {
                setActiveLocalGifts(prev => [...prev, { ...giftObj, isDismissed: false }]);
              } else {
                setActiveRemoteGifts(prev => [...prev, { gift: giftObj, targetUserId: String(targetUserId), isDismissed: false }]);
              }
              if (isDare) {
                setActiveDareProposal(null);
              }
            }
          }
          break;
        }

        if (data.message && data.message.startsWith('{')) { try { JSON.parse(data.message); break; } catch { } }
        let name = 'Unknown'; let displayPictureUrl = '';
        if (data.userId === myId) { name = 'You'; displayPictureUrl = localUserInfoRef.current?.displayPictureUrl || '/assets/ico.png'; }
        else if (pInfo && data.userId === pInfo.id) { name = pInfo.name; displayPictureUrl = pInfo.displayPictureUrl || ''; }
        else { const remote = remotes.find(s => s.userId === data.userId); if (remote) { name = remote.name; displayPictureUrl = remote.displayPictureUrl || ''; } else if (remotes.length > 0) { name = remotes[0].name; displayPictureUrl = remotes[0].displayPictureUrl || ''; } }
        setChatMessages(prev => { if (data.id && prev.some(m => m.id === data.id)) return prev; return [...prev, { id: data.id || Date.now() + Math.random(), userId: data.userId, message: data.message, name, displayPictureUrl }]; });
        break;
      }

      case 'broadcast-started': { setIsBroadcasting(true); break; }
      case 'broadcast-stopped': { setIsBroadcasting(false); break; }

      // Server ended the room (e.g. the other side's phone died and cleanup ran).
      // Verify with the room API before tearing down — transient WS/cache glitches
      // should not kick users out of an active call.
      case 'room-ended': {
        if (intentionalExitRef.current) break;
        const endedRoomId = data?.roomId || roomInfoRef.current?.roomId;
        const modMessage = typeof data?.message === 'string' ? data.message.trim() : '';
        if (modMessage) {
          try { alert(modMessage); } catch { }
        }
        setTimeout(async () => {
          if (intentionalExitRef.current) return;
          const uid = userIdRef.current;
          try {
            const roomState = uid ? await apiRequest(API.STREAMING.GET_USER_ROOM(uid)) : null;
            if (roomState?.exists && String(roomState.roomId) === String(endedRoomId)) return;
          } catch { }
          if (intentionalExitRef.current) return;
          intentionalExitRef.current = true;
          cleanup();
          localStorage.removeItem('currentRoom');
          resumeDiscoveryFromCall();
        }, 1500);
        break;
      }
    }
  };

  // ---- Stale room handler --------------------------------------------------
  const handleStaleRoom = () => {
    if (intentionalExitRef.current) return;
    localStorage.removeItem('currentRoom');
    resumeDiscoveryFromCall();
  };

  // ---- Media + signaling startup ------------------------------------------
  const startMediaAndSignaling = async (info, userId) => {
    try {
      const stream = await acquireLocalMediaStream();
      applyLocalMediaPreferences(stream);
      monitorLocalMediaTracks(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setLocalMediaGeneration(n => n + 1);
    } catch (err) { console.error('Media error:', err); }

    const accessToken = localStorage.getItem('accessToken') || '';
    sfuRerouteAttemptRef.current = 0;
    wsReconnectAttemptRef.current = 0;

    const scheduleWsReconnect = (baseUrl = WS_URL) => {
      if (intentionalExitRef.current || autoTransitioningRef.current) return;
      if (wsReconnectAttemptRef.current >= 4) { setStatus('error'); setError('Call connection lost. Please try again.'); return; }
      const attempt = wsReconnectAttemptRef.current;
      wsReconnectAttemptRef.current += 1;
      const delayMs = Math.min(500 * (2 ** attempt), 4000);
      if (wsReconnectTimerRef.current) clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = setTimeout(() => { wsReconnectTimerRef.current = null; if (intentionalExitRef.current || autoTransitioningRef.current) return; openSignalingSocket(baseUrl, { isReconnect: true }); }, delayMs);
    };

    const openSignalingSocket = (baseUrl = WS_URL, { isReconnect = false } = {}) => {
      const wsUrlWithAuth = buildWsUrl(baseUrl, { userId, roomId: info.roomId, ...(accessToken ? { token: accessToken } : {}) });
      const ws = new WebSocket(wsUrlWithAuth);
      wsRef.current = ws;
      ws.onopen = () => {
        wsReconnectAttemptRef.current = 0;
        send({ type: 'join-room', data: { roomId: info.roomId, preserveParticipantOnClose: true } });
      };
      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'room-reroute') {
          if (sfuRerouteAttemptRef.current >= 2) { setStatus('error'); setError('Could not route call to the assigned media server.'); return; }
          sfuRerouteAttemptRef.current += 1;
          const rerouteUrl = getRerouteWsUrl(msg.data, WS_URL);
          try { ws.onclose = null; ws.close(); } catch { }
          openSignalingSocket(rerouteUrl);
          return;
        }
        if (msg.type === 'account-banned') {
          void forceLogoutBanned({
            message:
              msg.data?.message ||
              'You are banned currently. Contact mods@antiscroll.in for support.',
            redirect: true,
          });
          return;
        }
        if (msg.type === 'error') {
          const errText = String(msg.data?.error || '');
          console.warn('[WS] Error:', errText);
          // Only abort when the *room* is gone. Transport/producer/participant
          // "not found" is common during screen-share / reconnect and must not
          // tear down an active call (was calling handleStaleRoom → home).
          const isRoomGone = /^Room\s+.+\s+not found/i.test(errText);
          if (isRoomGone) handleStaleRoom();
          return;
        }
        await handleSignal(msg, info, userId);
      };
      ws.onerror = (err) => { console.error('[WebSocket] Error:', err); };
      ws.onclose = () => {
        if (intentionalExitRef.current || autoTransitioningRef.current) return;
        if (typeof document !== 'undefined' && document.hidden) {
          wsPendingReconnectWhileHiddenRef.current = true;
        }
        // Keep reconnecting even while the tab is hidden so we stay inside the
        // server's preserve-participant grace window (~60s) after a background drop.
        scheduleWsReconnect(baseUrl);
      };
    };
    openSignalingSocketRef.current = openSignalingSocket;
    openSignalingSocket();
  };

  // ---- Initialization effect -----------------------------------------------
  useEffect(() => {
    let aborted = false;
    const init = async () => {
      hadRemotePeerInSessionRef.current = false;
      // Ensure discovery session is cleared even if navigation beat enterCall() from home.
      try { await enterCall(); } catch { }
      try {
        const raw = sessionStorage.getItem('hmm:enteringVideoChat');
        if (raw) { const enteredAt = Number(raw); const base = Number.isFinite(enteredAt) ? enteredAt : Date.now(); suppressUnmountLeaveUntilRef.current = base + 4000; if (Date.now() >= base + 4000) sessionStorage.removeItem('hmm:enteringVideoChat'); }
      } catch { }

      let info = null; let uid = null;
      const stored = localStorage.getItem('currentRoom');
      if (stored) {
        info = JSON.parse(stored);
        if (info.partner) {
          setPartnerInfo({ id: info.partner.id || '', name: info.partner.username || 'Matched!', age: info.partner.age || '', city: info.partner.city || '', displayPictureUrl: info.partner.displayPictureUrl || '' });
          if (info.partner.id && (!info.partner.username || !info.partner.city)) {
            try {
              const profileResp = await apiRequest(API.USERS.GET_USER(info.partner.id));
              const profile = profileResp?.user || {};
              let age = '';
              if (profile.dateOfBirth) { const dob = new Date(profile.dateOfBirth); if (!Number.isNaN(dob.getTime())) { const now = new Date(); let years = now.getFullYear() - dob.getFullYear(); const monthDiff = now.getMonth() - dob.getMonth(); if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) years--; age = years >= 0 ? String(years) : ''; } }
              setPartnerInfo({ id: profile.id || info.partner.id, name: profile.username || 'Matched!', age, city: profile.preferredCity || '', displayPictureUrl: profile.displayPictureUrl || '' });
            } catch (err) { console.warn('[Init] Failed to fetch partner profile fallback:', err); }
          }
        }
      }

      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          uid = payload.sub || payload.uid || payload.id;
          const initialInfo = { name: payload.name || 'You', age: payload.age || '', displayPictureUrl: '/assets/ico.png' };
          setLocalUserInfo(initialInfo); localUserInfoRef.current = initialInfo;
          apiRequest(API.USERS.GET_ME).then(meData => {
            const meUser = meData?.user || meData;
            if (meUser) { const info2 = { name: meUser.username || payload.name || 'You', age: payload.age || '', displayPictureUrl: meUser.displayPictureUrl || '/assets/ico.png' }; localUserInfoRef.current = info2; setLocalUserInfo(info2); }
          }).catch(err => { console.warn('[Init] Failed to fetch my profile info:', err); });
        } catch { }
      }

      if (!info?.roomId) {
        try {
          const token2 = localStorage.getItem('accessToken');
          if (token2 && uid) { const serverRoom = await apiRequest(API.STREAMING.GET_USER_ROOM(uid)); if (serverRoom?.exists && serverRoom?.roomId && serverRoom?.role === 'participant') { info = { roomId: serverRoom.roomId, sessionId: serverRoom.id || serverRoom.roomId }; localStorage.setItem('currentRoom', JSON.stringify(info)); } }
        } catch { }
        if (!info?.roomId) { setStatus('error'); setError('No active match found.'); setTimeout(() => resumeDiscoveryFromCall(), 200); return; }
      }

      try {
        const token3 = localStorage.getItem('accessToken');
        if (token3 && uid) {
          let verified = false; let checkedRoom = info.roomId; let lastRoomPayload = null;
          for (let attempt = 0; attempt < 24; attempt++) {
            const roomCheck = await apiRequest(API.STREAMING.GET_USER_ROOM(uid));
            if (roomCheck?.exists && roomCheck?.roomId) { checkedRoom = roomCheck.roomId; verified = true; lastRoomPayload = roomCheck; break; }
            await new Promise(r => setTimeout(r, 650));
          }
          if (lastRoomPayload?.participants?.length) {
            const byUserId = {};
            lastRoomPayload.participants.forEach(p => { byUserId[String(p.userId)] = p.role; });
            setCallRoles({ isLocalHost: lastRoomPayload.userRole === 'HOST', byUserId });
          }
          if (verified && checkedRoom !== info.roomId) { info = { ...info, roomId: checkedRoom, sessionId: info.sessionId || checkedRoom }; localStorage.setItem('currentRoom', JSON.stringify(info)); }
        }
      } catch { }

      await new Promise(r => setTimeout(r, 50));
      if (aborted) return;

      userIdRef.current = uid;
      roomInfoRef.current = info;
      const startsInBroadcast = info?.callType === 'broadcast' || info?.isBroadcasting === true;
      if (startsInBroadcast) {
        isBroadcastingRef.current = true;
        setIsBroadcasting(true);
      }
      try { if (sessionStorage.getItem('waitlistJoinRedirect') === '1') { sessionStorage.removeItem('waitlistJoinRedirect'); mediaEstablishGraceUntilRef.current = Date.now() + MEDIA_ESTABLISH_GRACE_MS; } } catch { }
      squadQuickInvitePeersPostedRoomIdRef.current = null;
      mediaEstablishGraceUntilRef.current = Date.now() + MEDIA_ESTABLISH_GRACE_MS;
      setRoomInfo(info);

      // Squad auto pull-stranger: mirror today's manual UI/timer when server already enabled it.
      try {
        let enabled = Boolean(info?.pullStrangerEnabled);
        let remaining = Number(info?.pullStrangerRemainingSec) || 0;
        if ((!enabled || remaining <= 0) && info?.callType === 'squad' && info?.roomId) {
          const roomDetails = await apiRequest(API.STREAMING.GET_ROOM(info.roomId)).catch(() => null);
          if (roomDetails?.exists !== false && roomDetails?.pullStrangerEnabled) {
            enabled = true;
            remaining = Number(roomDetails.pullStrangerRemainingSec) || 0;
          }
        }
        if (enabled) {
          if (remaining <= 0) remaining = PULL_STRANGER_WINDOW_SECONDS;
          setPullStrangerCooldownSec(remaining);
          suppressAutoResumeUntilRef.current = Date.now() + (remaining * 1000);
          roomHealthFailureCountRef.current = 0;
          setRoomHealthDebug({ graceActive: true, graceRemainingSec: remaining, failureCount: 0 });
          const enabledBy = info?.pullStrangerEnabledBy || null;
          if (enabledBy && String(enabledBy) === String(uid)) {
            await enablePullStrangerDiscovery().catch(() => { });
          }
        }
      } catch (err) {
        console.warn('[Init] Failed to sync auto pull-stranger state:', err);
      }

      if (info.partner) {
        const enrichedPartner = await enrichUserStickerFields(info.partner);
        const pInfo = { id: enrichedPartner.id || '', name: enrichedPartner.username || 'Matched!', age: enrichedPartner.age || '', city: enrichedPartner.city || '', displayPictureUrl: enrichedPartner.displayPictureUrl || '', activeBadgeImageUrl: enrichedPartner.activeBadgeImageUrl || null, activeBadge: enrichedPartner.activeBadge || null };
        setPartnerInfo(pInfo); partnerInfoRef.current = pInfo;
      }
      startMediaAndSignaling(info, uid);
    };

    const handleBeforeUnload = () => leaveRoomAndSetOnline();
    window.addEventListener('beforeunload', handleBeforeUnload);
    allowUnmountCleanupRef.current = false;
    cleanupArmTimerRef.current = setTimeout(() => { allowUnmountCleanupRef.current = true; }, 300);
    init();
    return () => {
      aborted = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (cleanupArmTimerRef.current) { clearTimeout(cleanupArmTimerRef.current); cleanupArmTimerRef.current = null; }
      const inEnterCallGrace = Date.now() < suppressUnmountLeaveUntilRef.current;
      const shouldLeaveCall = allowUnmountCleanupRef.current && !intentionalExitRef.current && !inEnterCallGrace;
      if (shouldLeaveCall) { void beginLeaveCallToHomeReliable(); cleanup(); }
      else cleanup({ stopLocalMedia: false });
    };
  }, [router]);

  // ---- Friend & report actions ---------------------------------------------
  const handleSendFriendRequest = (toUserId) => {
    const tid = String(toUserId ?? '');
    if (!roomInfo?.roomId || !isValidFriendTargetUserId(tid) || friendRequestSentTo[tid]) return;
    send({ type: 'send-friend-request', data: { roomId: roomInfo.roomId, toUserId: tid } });
  };

  const triggerReportToast = (message) => { setReportNotification(message); setTimeout(() => setReportNotification(null), 3000); };

  const handleReportUser = async (reportedUserId, reason = 'basic') => {
    const tid = String(reportedUserId ?? '');
    if (!tid || tid.startsWith('producer:')) { triggerReportToast('Cannot report this user type.'); return; }
    if (reportedUserIds.has(tid)) { triggerReportToast('You have already reported this user.'); return; }
    const roleInCall = callRoles.byUserId[tid];
    const reportType = resolveInCallReportType(roleInCall);
    const roomId = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const callSessionId = roomInfoRef.current?.sessionId || roomInfo?.sessionId;
    try {
      const res = await submitUserReport({
        reportedUserId: tid,
        reportType,
        roomId,
        callSessionId,
        reason,
      });
      if (res.success) { setReportedUserIds(prev => new Set([...prev, tid])); triggerReportToast('User reported successfully.'); }
      else triggerReportToast('Failed to report user.');
    } catch (err) { console.error('[Report] failed:', err); triggerReportToast(err.message || 'Failed to report user.'); }
  };

  // ---- Media controls ------------------------------------------------------
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = isMuted; setIsMuted(!isMuted); }
  };

  const toggleCam = async () => {
    const nextCamOff = !isCamOffRef.current;
    isCamOffRef.current = nextCamOff;
    setIsCamOff(nextCamOff);
    try {
      localStorage.setItem('isCamOff', String(nextCamOff));
      localStorage.setItem('isVideoOn', String(!nextCamOff));
    } catch { /* ignore */ }

    applyLocalCameraEnabled(!nextCamOff);

    if (!nextCamOff) {
      const live = localStreamRef.current?.getVideoTracks?.().some((t) => t.readyState === 'live');
      if (!live) {
        await recoverLocalMedia('toggle-cam-on');
        applyLocalCameraEnabled(true);
      }
    }

    // Tell peers immediately — do not wait on the profile PATCH.
    broadcastCamOffState(nextCamOff);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) {
        fetch(API.USERS.UPDATE_PROFILE, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            videoEnabled: !nextCamOff
          })
        }).catch((err) => {
          console.error('Failed to notify backend about cam toggle:', err);
        });
      }
    } catch (err) {
      console.error('Failed to notify backend about cam toggle:', err);
    }
  };

  // ---- Icebreaker / randomness ---------------------------------------------
  const handleIcebreaker = () => {
    if (!roomInfo?.roomId) return;
    const nextBroken = !isBroken;
    setIsBroken(nextBroken);
    if (nextBroken) send({ type: 'get-icebreaker', data: { roomId: roomInfo.roomId } });
    else { setShowIcebreaker(false); setIcebreaker(''); }
    send({ type: 'chat-message', data: { roomId: roomInfo.roomId, message: JSON.stringify({ isIcebreakerTrigger: nextBroken, senderId: userIdRef.current }) } });
  };

  const toggleRandomness = () => {
    if (!roomInfo?.roomId) return;
    setIsRolling(true);
    setShowRandomness(!showRandomness);
    send({ type: 'chat-message', data: { roomId: roomInfo.roomId, message: JSON.stringify({ isDiceRoll: true, senderId: userIdRef.current }) } });
  };

  // ---- Pull stranger -------------------------------------------------------
  const handlePullStranger = async () => {
    const participantCount = remoteStreams.length + 1;
    if (!roomInfo?.roomId || !userIdRef.current || participantCount >= 4 || isEnablingPullStranger || pullStrangerCooldownSec > 0) return;
    try {
      setIsEnablingPullStranger(true);
      await apiRequest(API.STREAMING.ENABLE_PULL_STRANGER(roomInfo.roomId), { method: 'POST', body: JSON.stringify({ userId: userIdRef.current }) });
      setPullStrangerCooldownSec(PULL_STRANGER_WINDOW_SECONDS);
      suppressAutoResumeUntilRef.current = Date.now() + (PULL_STRANGER_WINDOW_SECONDS * 1000);
      roomHealthFailureCountRef.current = 0;
      setRoomHealthDebug({ graceActive: true, graceRemainingSec: PULL_STRANGER_WINDOW_SECONDS, failureCount: 0 });
      setShowRandomness(false);
      await enablePullStrangerDiscovery().catch(() => { });
    } catch (err) { console.error('Failed to enable pull stranger:', err); }
    finally { setIsEnablingPullStranger(false); }
  };

  const handleCancelPullStranger = async () => {
    if (!roomInfo?.roomId || !userIdRef.current) return;
    try {
      send({ type: 'disable-pull-stranger', data: { roomId: roomInfo.roomId } });
      await apiRequest(API.STREAMING.DISABLE_PULL_STRANGER(roomInfo.roomId), { method: 'POST', body: JSON.stringify({ userId: userIdRef.current }) }).catch(() => { });
      setPullStrangerCooldownSec(0); suppressAutoResumeUntilRef.current = 0;
      setRoomHealthDebug({ graceActive: false, graceRemainingSec: 0, failureCount: 0 });
      await disablePullStrangerDiscovery().catch(() => { });
    } catch (err) { console.error('Failed to disable pull stranger:', err); }
  };

  // ---- Beamcast ------------------------------------------------------------
  const handleBeamcast = async () => {
    if (!roomInfo?.roomId || !userIdRef.current) return;
    send({ type: 'start-broadcast', data: { roomId: roomInfo.roomId } });
    try { await enableBeamcastDiscovery(); } catch { }
    setIsBroadcasting(true); setShowRandomness(false);
  };

  const handleStopBeamcast = async () => {
    if (!roomInfo?.roomId || !userIdRef.current) return;
    send({ type: 'stop-broadcast', data: { roomId: roomInfo.roomId } });
    try { await disableBeamcastDiscovery(); } catch { }
    setIsBroadcasting(false); setShowRandomness(false);
  };

  // ---- Waitlist ------------------------------------------------------------
  const refreshWaitlist = useCallback(async () => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    if (!rid) return;
    setWaitlistLoading(true); setWaitlistError('');
    try {
      const res = await apiRequest(API.STREAMING.GET_WAITLIST(rid));
      const baseList = Array.isArray(res?.waitlist) ? res.waitlist : [];
      const enrichOne = async (entry) => {
        const userId = String(entry?.userId || '');
        if (!userId) return { ...entry, profile: null };
        if (waitlistProfileCacheRef.current.has(userId)) return { ...entry, profile: waitlistProfileCacheRef.current.get(userId) };
        try { const prof = await apiRequest(API.USERS.GET_USER(userId)); const user = prof?.user || prof?.data?.user || null; if (user) waitlistProfileCacheRef.current.set(userId, user); return { ...entry, profile: user }; }
        catch { return { ...entry, profile: null }; }
      };
      setWaitlist(await Promise.all(baseList.map(enrichOne)));
    } catch (e) { setWaitlistError(e?.message || 'Failed to load waitlist.'); }
    finally { setWaitlistLoading(false); }
  }, [roomInfo]);

  const acceptFromWaitlist = useCallback(async (targetUserId) => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const hostUserId = userIdRef.current;
    if (!rid || !hostUserId || !targetUserId) return;
    try {
      await apiRequest(API.STREAMING.ACCEPT_FROM_WAITLIST(rid), { method: 'POST', body: JSON.stringify({ hostUserId, targetUserId: String(targetUserId) }) });
      await refreshWaitlist();
      setIcebreaker('Added from waitlist.'); setShowIcebreaker(true);
      setTimeout(() => setShowIcebreaker(false), 2500);
    } catch (e) { setWaitlistError(e?.message || 'Failed to accept user.'); }
  }, [roomInfo, refreshWaitlist]);

  useEffect(() => {
    if (!showWaitlist) return;
    refreshWaitlist();
    const id = setInterval(() => { if (typeof document !== 'undefined' && document.hidden) return; refreshWaitlist(); }, 5000);
    return () => clearInterval(id);
  }, [showWaitlist, refreshWaitlist]);

  // ---- Broadcast HUD -------------------------------------------------------
  const refreshBroadcastHud = useCallback(async () => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    if (!rid) return;
    try { const room = await apiRequest(API.STREAMING.GET_ROOM(rid)); setBroadcastHud(prev => ({ ...prev, viewerCount: Number(room?.viewerCount || 0) })); } catch { }
    try { const w = await apiRequest(API.STREAMING.GET_WAITLIST(rid)); setBroadcastHud(prev => ({ ...prev, waitlistCount: Array.isArray(w?.waitlist) ? w.waitlist.length : 0 })); } catch { }
  }, [roomInfo]);

  useEffect(() => {
    if (!isBroadcasting) return;
    refreshBroadcastHud();
    const id = setInterval(() => { if (typeof document !== 'undefined' && document.hidden) return; refreshBroadcastHud(); }, 5000);
    return () => clearInterval(id);
  }, [isBroadcasting, refreshBroadcastHud]);

  const handleShareBroadcastLink = async () => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    if (!rid) return;
    const link = `${window.location.origin}/beam-tv?roomId=${encodeURIComponent(rid)}`;
    setBroadcastHud(prev => ({ ...prev, shareOpen: true, shareUrl: link }));
    try { await navigator.clipboard.writeText(link); setBroadcastHud(prev => ({ ...prev, lastShareMsg: 'Link copied.' })); setTimeout(() => setBroadcastHud(prev => ({ ...prev, lastShareMsg: '' })), 2000); }
    catch { setBroadcastHud(prev => ({ ...prev, lastShareMsg: 'Could not copy link.' })); setTimeout(() => setBroadcastHud(prev => ({ ...prev, lastShareMsg: '' })), 2000); }
  };

  const copyShareUrl = async () => {
    const url = broadcastHud.shareUrl;
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setBroadcastHud(prev => ({ ...prev, lastShareMsg: 'Link copied.' })); setTimeout(() => setBroadcastHud(prev => ({ ...prev, lastShareMsg: '' })), 2000); }
    catch { setBroadcastHud(prev => ({ ...prev, lastShareMsg: 'Could not copy link.' })); setTimeout(() => setBroadcastHud(prev => ({ ...prev, lastShareMsg: '' })), 2000); }
  };

  // ---- Chat ----------------------------------------------------------------
  const sendChatMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !roomInfo?.roomId) return;
    send({ type: 'chat-message', data: { roomId: roomInfo.roomId, message: chatInput.trim() } });
    setChatInput('');
  };

  const handleChatButtonClick = () => {
    if (isBroadcasting) { setBroadcastChatWarning('Warning: this call is live on Beam TV. Chat is visible to viewers.'); setTimeout(() => setBroadcastChatWarning(''), 2800); }
    setShowChatInput(v => !v);
  };

  // ---- Gift callbacks ------------------------------------------------------
  const handleLocalGiftDismissStart = useCallback((gift) => {
    const messageId = typeof gift === 'string' ? gift : gift?.messageId;
    // Broadcast dismissal to all peers immediately on click (before fade animation)
    const roomId = roomInfoRef.current?.roomId;
    if (messageId && roomId) {
      send({
        type: 'chat-message',
        data: {
          roomId,
          message: JSON.stringify({ isGiftDismissed: true, messageId, senderId: userIdRef.current }),
        },
      });
    }
  }, []);

  const handleLocalGiftComplete = useCallback((gift) => {
    const messageId = typeof gift === 'string' ? gift : gift?.messageId;
    // Only clear local state after fade; broadcast was already sent by onDismissStart
    setActiveLocalGifts(prev => prev.filter(item => item.messageId !== messageId));
  }, []);

  const handleRemoteGiftDismissStart = useCallback((_giftEntry) => {
    // No-op safety fallback — sender doesn't need to re-broadcast
  }, []);

  const handleRemoteGiftComplete = useCallback((giftEntry) => {
    const gift = giftEntry?.gift || giftEntry;
    const messageId = typeof giftEntry === 'string' ? giftEntry : gift?.messageId;
    setActiveRemoteGifts(prev => prev.filter(item => item.gift?.messageId !== messageId));
  }, []);

  const handleSendGift = useCallback(async (gift, targetUserId) => {
    const senderId = userIdRef.current;
    const targetId = targetUserId || remoteStreamsRef.current[0]?.userId;
    const roomId = roomInfoRef.current?.roomId;
    if (!gift || !senderId || !targetId || !roomId) return;
    if (isSendingGiftRef.current) return;

    const coinCost = Number(gift.price) || 0;
    const diamondAmount = Number(gift.diamonds) || 0;
    // Client pre-check — GiftOverlay already shows insufficient UI; keep picker open.
    if (coins < coinCost) {
      setSelectedGiftId(gift.id);
      setIsGiftModalOpen(true);
      return;
    }

    isSendingGiftRef.current = true;
    // Close immediately so the flying sticker isn't covered and double-sends aren't possible.
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
    } catch (err) {
      console.error('Failed to send gift:', err);
      if (isInsufficientBalanceError(err)) {
        await refreshWallet();
        setSelectedGiftId(gift.id);
        setIsGiftModalOpen(true);
      } else {
        alert(err.message || 'Failed to send gift');
      }
    } finally {
      isSendingGiftRef.current = false;
    }
  }, [coins, refreshWallet]);

  // ---- Dare callbacks ------------------------------------------------------
  const handleDareSync = useCallback((syncData) => {
    const marqueeStartAt = typeof syncData.marqueeStartAt === 'number'
      ? syncData.marqueeStartAt
      : Date.now();
    currentDareRef.current = {
      id: syncData.dareId,
      text: syncData.dareText,
      marqueeStartAt,
    };
    if (!roomInfo?.roomId || !remoteStreams[0]?.userId) return;
    send({
      type: 'chat-message',
      data: {
        roomId: roomInfo.roomId,
        message: JSON.stringify({
          isDareSync: true,
          dareText: syncData.dareText,
          marqueeStartAt,
          giftId: syncData.gift?.id,
          giftImg: syncData.gift?.imageUrl || syncData.gift?.img,
          giftPrice: syncData.gift?.diamonds,
          targetUserId: remoteStreams[0].userId,
          senderId: userIdRef.current,
          senderName: localUserInfo?.name || 'Someone',
        }),
      },
    });
  }, [roomInfo, remoteStreams, localUserInfo]);

  const handleDareResponse = useCallback((accepted) => {
    if (!activeDareProposal || !roomInfo?.roomId) return;
    send({ type: 'chat-message', data: { roomId: roomInfo.roomId, message: JSON.stringify({ isDareResponse: true, accepted, targetUserId: activeDareProposal.senderId, senderId: userIdRef.current }) } });
    if (!accepted) {
      setActiveDareProposal(null);
    }
  }, [activeDareProposal, roomInfo]);

  const handleCancelDare = useCallback(() => {
    setIsDareOpen(false); setSelectedGiftId(null); setDareAcceptanceStatus('idle');
    isSendingDareRef.current = false;
    setIsSendingDare(false);
    if (roomInfo?.roomId && remoteStreams[0]?.userId) {
      send({ type: 'chat-message', data: { roomId: roomInfo.roomId, message: JSON.stringify({ isDareClose: true, targetUserId: remoteStreams[0].userId, senderId: userIdRef.current }) } });
    }
  }, [roomInfo, remoteStreams]);

  const handleSendDare = useCallback(async () => {
    const targetId = remoteStreamsRef.current[0]?.userId;
    const senderId = userIdRef.current;
    if (!targetId || !roomInfoRef.current?.roomId || !selectedGiftId) return;

    const giftObj = giftItems.find(g => g.id === selectedGiftId);
    if (!giftObj) return;

    if (isSendingDareRef.current) return;

    const giftAmount = Number(giftObj.diamonds) || 0;
    const neededCoins = diamondsToCoinPrice(giftAmount, diamondToCoinRate);
    // Client pre-check — DareOverlay already shows insufficient UI; keep picker open.
    if (coins < neededCoins) {
      setIsDareOpen(true);
      return;
    }

    isSendingDareRef.current = true;
    setIsSendingDare(true);
    // Close immediately so the flying sticker isn't covered and double-sends aren't possible.
    setIsDareOpen(false);
    setSelectedGiftId(null);
    setDareAcceptanceStatus('idle');

    try {
      const activeDareId = currentDareRef.current?.id || 'dare-1';
      // Custom dares use a random dare id on backend (dare-1 fallback)
      const backendDareId = (activeDareId && !activeDareId.startsWith('custom-') && activeDareId.startsWith('dare-'))
        ? activeDareId
        : 'dare-1';

      await apiRequest(API.WALLET.PURCHASE_DIAMONDS, {
        method: 'POST',
        body: JSON.stringify({ diamondAmount: giftAmount })
      });
      // userId = sender (the person sending the dare), NOT the target
      try {
        await apiRequest(API.STREAMING.SEND_DARE(roomInfoRef.current.roomId), {
          method: 'POST',
          body: JSON.stringify({ dareId: backendDareId, giftId: giftObj.id, userId: senderId })
        });
      } catch (dareErr) {
        console.warn('SEND_DARE failed, falling back to SEND_GIFT:', dareErr);
        // Fallback to SEND_GIFT to transfer diamonds so the dare can still be delivered
        await apiRequest(API.STREAMING.SEND_GIFT(roomInfoRef.current.roomId), {
          method: 'POST',
          body: JSON.stringify({
            toUserId: targetId,
            amount: giftAmount,
            giftId: giftObj.id,
            fromUserId: senderId,
          })
        });
      }
      await refreshWallet();
      const msgId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      // Fresh clock so every participant starts reading the banner together.
      const marqueeStartAt = Date.now();
      currentDareRef.current = {
        ...(currentDareRef.current || {}),
        marqueeStartAt,
      };
      send({
        type: 'chat-message',
        data: {
          roomId: roomInfoRef.current.roomId,
          message: JSON.stringify({
            isGift: true, isDare: true, messageId: msgId,
            gift: { name: giftObj.name, img: giftObj.img, imageUrl: giftObj.imageUrl, price: giftObj.price, diamonds: giftObj.diamonds },
            dareText: currentDareRef.current?.text || 'Do a dare',
            marqueeStartAt,
            targetUserId: targetId,
            senderId,
          })
        }
      });
    } catch (err) {
      console.error('Failed to send dare:', err);
      if (isInsufficientBalanceError(err)) {
        await refreshWallet();
        setSelectedGiftId(giftObj.id);
        setIsDareOpen(true);
      } else {
        alert(err.message || 'Failed to send dare');
      }
    } finally {
      isSendingDareRef.current = false;
      setIsSendingDare(false);
    }
  }, [coins, selectedGiftId, refreshWallet, giftItems, diamondToCoinRate]);

  const openDareOverlay = () => {
    const roomId = roomInfoRef.current?.roomId || roomInfo?.roomId;
    if (activeDareProposal) {
      send({ type: 'chat-message', data: { roomId, message: JSON.stringify({ isDareResponse: true, accepted: false, targetUserId: activeDareProposal.senderId, senderId: userIdRef.current }) } });
      setActiveDareProposal(null);
    }
    if (roomId && remoteStreams[0]?.userId) {
      send({ type: 'chat-message', data: { roomId, message: JSON.stringify({ isDareInitiated: true, targetUserId: remoteStreams[0].userId, senderId: userIdRef.current }) } });
    }
    setIsDareOpen(true);
  };

  // ---- Computed render values ----------------------------------------------
  const isSummoning = pullStrangerCooldownSec > 0 || roomSummoningUserId !== null;
  const isRoomFull = (remoteStreams.length + 1) >= 4;
  const isPullStrangerDisabled = isRoomFull || isEnablingPullStranger || isSummoning;
  const totalLayoutSlots = remoteStreams.length + (isSummoning ? 2 : 1);

  const getRemoteFriendTileProps = (streamInfo) => {
    const uid = String(streamInfo.userId ?? '');
    const valid = isValidFriendTargetUserId(uid);
    return { onSendFriendRequest: () => handleSendFriendRequest(uid), showAddFriend: valid, isAlreadyFriend: Boolean(friendshipWithRemote[uid]), isFriendRequestSent: Boolean(friendRequestSentTo[uid]) };
  };

  const canKickRemoteUser = (remoteUserId) => callRoles.isLocalHost && callRoles.byUserId[String(remoteUserId)] === 'PARTICIPANT';

  const shouldShowReportEmojiOnRemoteTile = (streamInfo) => {
    const list = remoteStreams;
    if (list.length <= 1) return true;
    const pid = String(partnerInfo.id || '');
    const partnerInCall = pid && list.some(s => String(s.userId) === pid);
    if (partnerInCall) return String(streamInfo.userId) === pid;
    return list[0] && String(list[0].userId) === String(streamInfo.userId);
  };

  const getRemoteTileProfile = (s) => {
    const pid = partnerInfo.id != null && partnerInfo.id !== '' ? String(partnerInfo.id) : '';
    const isPartner = pid !== '' && sameParticipantId(s.userId, pid);
    const isVideoOn = s.videoEnabled !== false && s.videoOn !== false;
    if (isPartner) return { name: s.name || partnerInfo.name || 'Matched!', age: s.age || partnerInfo.age || '', city: s.city || partnerInfo.city || '', displayPictureUrl: s.displayPictureUrl || partnerInfo.displayPictureUrl || '', activeBadgeImageUrl: s.activeBadgeImageUrl || partnerInfo.activeBadgeImageUrl || null, activeBadge: s.activeBadge || partnerInfo.activeBadge || null, isVideoOn };
    return { name: s.name || 'Guest', age: s.age || '', city: s.city || '', displayPictureUrl: s.displayPictureUrl || '', activeBadgeImageUrl: s.activeBadgeImageUrl || null, activeBadge: s.activeBadge || null, isVideoOn };
  };

  const localVideoProps = {
    localVideoRef, localStreamRef, isCamOff, isScreenSharing,
    onToggleScreenShare: toggleScreenShare,
    chatMessages, chatInput, setChatInput, sendChatMessage, showChatInput, setShowChatInput,
    onChatButtonClick: handleChatButtonClick, toggleCam, isGiftModalOpen, setIsGiftModalOpen,
    isDareOpen, setIsDareOpen: openDareOverlay, setIsCoinModalOpen, coins, selectedGiftId,
    gift: activeLocalGifts[0] || null, gifts: activeLocalGifts, onGiftAnimationComplete: handleLocalGiftComplete,
    onGiftDismissStart: handleLocalGiftDismissStart,
    forceDismiss: activeLocalGifts[0]?.isDismissed, hideAllControls: !!activeDareProposal,
    isGroupCall: remoteStreams.length > 1,
  };

  // ---- Return everything the render layer needs ----------------------------
  return {
    // Refs
    localVideoRef, remoteVideoRef,
    // State
    roomInfo, status, remoteStreams, isMuted, isCamOff, error,
    localUserInfo, partnerInfo, friendRequestSentTo, friendshipWithRemote,
    isRainchecking, showRandomness, setShowRandomness,
    isEnablingPullStranger, pullStrangerCooldownSec,
    roomSummoningUserId, callRoles, roomHealthDebug,
    icebreaker, showIcebreaker, chatMessages, chatInput, setChatInput,
    showChatInput, setShowChatInput, coins, diamonds, diamondToCoinRate,
    isCoinModalOpen, setIsCoinModalOpen, isBroadcasting,
    broadcastHud, setBroadcastHud, showWaitlist, setShowWaitlist,
    isGiftModalOpen, setIsGiftModalOpen, isDareOpen, setIsDareOpen,
    isSendingDare,
    selectedGiftId, setSelectedGiftId,
    activeRemoteGift: activeRemoteGifts[0] || null, activeLocalGift: activeLocalGifts[0] || null,
    activeRemoteGifts, activeLocalGifts,
    activeDareProposal, dareAcceptanceStatus, randomDares, savedDares,
    giftItems, isRolling, setIsRolling, isBroken, setIsBroken,
    waitlist, waitlistLoading, waitlistError,
    selectedWaitlistUser, setSelectedWaitlistUser,
    broadcastChatWarning, overlay, setOverlay,
    isScreenSharing, loadingMeme, showGroupMembersModal, setShowGroupMembersModal,
    reportedUserIds, reportNotification, localMediaGeneration,
    // Computed
    isSummoning, isRoomFull, isPullStrangerDisabled, totalLayoutSlots,
    // Handlers
    toggleMic, toggleCam, toggleScreenShare,
    handleSendFriendRequest, handleReportUser,
    handleKickRemote, handleLeaveGroupOrRaincheck,
    handlePullStranger, handleCancelPullStranger,
    handleBeamcast, handleStopBeamcast,
    handleIcebreaker, toggleRandomness,
    handleShareBroadcastLink, copyShareUrl,
    refreshWaitlist, acceptFromWaitlist,
    sendChatMessage, handleChatButtonClick,
    handleLocalGiftComplete, handleLocalGiftDismissStart, handleRemoteGiftComplete, handleRemoteGiftDismissStart, handleSendGift,
    handleDareSync, handleDareResponse, handleCancelDare, handleSendDare,
    openDareOverlay, goHomeIdleFromCall, refreshWallet,
    handleSaveCustomDare, handleDeleteCustomDare,
    // Render helpers
    localVideoProps, getRemoteFriendTileProps, getRemoteTileProfile,
    canKickRemoteUser, shouldShowReportEmojiOnRemoteTile,
  };
}
