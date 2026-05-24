'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { recordSquadCallPeersAsync, recordSquadCallPeersKeepalive } from '@/lib/squad-quick-invite-backend';
import {
  exitCallToHome,
  exitCallToHomeKeepalive,
  exitCallResumeDiscovery,
  enablePullStrangerDiscovery,
  disablePullStrangerDiscovery,
  enableBeamcastDiscovery,
  disableBeamcastDiscovery,
} from '@/lib/discovery-presence';
import clsx from 'clsx';
import FaceCard from '@/components/Home/FaceCard';
import OverlayLayer from '@/components/ui/OverlayLayer';
import CoinModal from '@/components/modals/CoinModal';

import ProfileGuard from '@/components/auth/ProfileGuard';

// Components
import RemoteVideoTile from '@/components/VideoChat/RemoteVideoTile';
import LocalVideoSection from '@/components/VideoChat/LocalVideoSection';
import BroadcastHud from '@/components/VideoChat/BroadcastHud';
import WaitlistModal from '@/components/VideoChat/WaitlistModal';
import RandomnessModal from '@/components/VideoChat/RandomnessModal';
import IcebreakerToast from '@/components/VideoChat/IcebreakerToast';
import QuickActions from '@/components/video-chat/QuickActions';

// WS URL — always use the explicit env var (must be wss:// in production)
// Fallback derives from STREAMING_SERVICE_URL but strips /v1 prefix since nginx
// routes /streaming/ws directly (not /v1/streaming/ws on the streaming host)
const getWsUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_STREAMING_WS_URL;
  if (envUrl) {
    // Ensure wss:// when on HTTPS (guards against accidental ws:// in env)
    return envUrl.replace(/^ws:\/\//, 'wss://');
  }
  // Fallback: derive from REST URL — strip /v1 suffix, swap http→ws
  try {
    const restUrl = process.env.NEXT_PUBLIC_STREAMING_SERVICE_URL || 'http://localhost:3006';
    const base = restUrl.replace(/\/v1$/, ''); // strip gateway prefix
    const wsBase = base.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
    return wsBase + '/streaming/ws';
  } catch (e) {
    return 'ws://localhost:3006/streaming/ws'; // correct port for streaming
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
const WS_URL = null; // computed at runtime inside component
const PULL_STRANGER_WINDOW_SECONDS = (() => {
  const parsed = Number.parseInt(process.env.NEXT_PUBLIC_PULL_STRANGER_WINDOW_SECONDS || '60', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
})();

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

const getCameraConstraints = ({ exactFrontCamera = false } = {}) => {
  const facingMode = exactFrontCamera ? { exact: 'user' } : { ideal: 'user' };
  if (!isMobileRuntime()) {
    return {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
      facingMode
    };
  }

  // Mobile devices sustain long calls better at qHD/24fps; simulcast still lets strong devices receive sharp video.
  return {
    width: { ideal: 960, max: 1280 },
    height: { ideal: 540, max: 720 },
    frameRate: { ideal: 24, max: 24 },
    facingMode
  };
};

const getVideoEncodings = () => {
  if (!isMobileRuntime()) {
    return [
      { rid: 'r0', maxBitrate: 200_000, scaleResolutionDownBy: 4 },
      { rid: 'r1', maxBitrate: 700_000, scaleResolutionDownBy: 2 },
      { rid: 'r2', maxBitrate: 2_500_000, scaleResolutionDownBy: 1 }
    ];
  }

  return [
    { rid: 'r0', maxBitrate: 160_000, scaleResolutionDownBy: 3 },
    { rid: 'r1', maxBitrate: 450_000, scaleResolutionDownBy: 1.8 },
    { rid: 'r2', maxBitrate: 1_200_000, scaleResolutionDownBy: 1 }
  ];
};

const getPreferredConsumerLayers = ({ kind, source, remoteCount = 1 } = {}) => {
  if (kind !== 'video') return undefined;
  if (!isMobileRuntime()) {
    return { spatialLayer: 2, temporalLayer: 2 };
  }

  // Mobile thermal budget: keep multi-party camera tiles on lower simulcast layers.
  // Screen share stays one layer higher for readability.
  if (source === 'screen') {
    return { spatialLayer: 1, temporalLayer: 2 };
  }
  return remoteCount >= 2
    ? { spatialLayer: 0, temporalLayer: 2 }
    : { spatialLayer: 1, temporalLayer: 2 };
};

/** Module-level so React identity is stable — avoids remounting <video> on every parent re-render (e.g. 1s pull-stranger cooldown tick). */

export default function VideoChat() {
  return (
    <ProfileGuard>
      <VideoChatContent />
    </ProfileGuard>
  );
}

function VideoChatContent() {
  const router = useRouter();
  const flowLog = (...args) => console.log('[RaincheckFlow][video-chat]', ...args);
  // Compute WS URL at runtime so we can check window.location.protocol
  const WS_URL = getWsUrl();
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
  /** Per remote userId: friend request sent during this session */
  const [friendRequestSentTo, setFriendRequestSentTo] = useState({});
  /** Per remote userId: already friends (from CHECK_FRIENDSHIP) */
  const [friendshipWithRemote, setFriendshipWithRemote] = useState({});
  const [isRainchecking, setIsRainchecking] = useState(false);
  const [showRandomness, setShowRandomness] = useState(false);
  const [isEnablingPullStranger, setIsEnablingPullStranger] = useState(false);
  const [pullStrangerCooldownSec, setPullStrangerCooldownSec] = useState(0);
  const [isPullStrangerLoopActive, setIsPullStrangerLoopActive] = useState(false);
  const [isStoppingPullStranger, setIsStoppingPullStranger] = useState(false);
  /** Server roles: matched call hosts (first 2) vs pull-stranger / late join guests (PARTICIPANT). */
  const [callRoles, setCallRoles] = useState({ isLocalHost: false, byUserId: {} });
  const [, setRoomHealthDebug] = useState({
    graceActive: false,
    graceRemainingSec: 0,
    failureCount: 0
  });
  const [icebreaker, setIcebreaker] = useState('');
  const [showIcebreaker, setShowIcebreaker] = useState(false);
  const [chatMessages, setChatMessages] = useState([]); // { userId, message, name, id }
  const [chatInput, setChatInput] = useState('');
  const [showChatInput, setShowChatInput] = useState(false);
  const [coins, setCoins] = useState(0);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastHud, setBroadcastHud] = useState({ viewerCount: 0, waitlistCount: 0, lastShareMsg: '', shareOpen: false, shareUrl: '' });
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [selectedWaitlistUser, setSelectedWaitlistUser] = useState(null);
  const [broadcastChatWarning, setBroadcastChatWarning] = useState('');
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [loadingMeme, setLoadingMeme] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null); // Separate ref so srcObject can be re-assigned via useEffect
  const wsRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const localStreamRef = useRef(null);
  const producersRef = useRef({});
  const consumersRef = useRef({});
  // Track producer ids we created locally so we can safely skip "self" tracks even
  // if the backend occasionally mis-labels userId on producer events.
  const myProducerIdsRef = useRef(new Set());
  /** mediasoup consumer id → departed user cleanup */
  const consumerIdsByUserRef = useRef({});
  const callRoleRefreshTimerRef = useRef(null);
  const roomInfoRef = useRef(null);
  /** Dedupe POST /squad/me/quick-invite/record-call-peers per roomId on leave (StrictMode / double callbacks). */
  const squadQuickInvitePeersPostedRoomIdRef = useRef(null);
  const userIdRef = useRef(null);
  const partnerInfoRef = useRef(null);
  const remoteStreamsRef = useRef([]);
  const waitlistProfileCacheRef = useRef(new Map());
  const allowUnmountCleanupRef = useRef(false);
  const cleanupArmTimerRef = useRef(null);
  const intentionalExitRef = useRef(false);
  const autoTransitioningRef = useRef(false);
  const hadRemoteMediaRef = useRef(false);
  const remoteMediaMissingSinceRef = useRef(null);
  /** Until this timestamp, room-health must not GET /users/room while waiting for first remote (avoids spam + server reconcile races). */
  const mediaEstablishGraceUntilRef = useRef(0);
  /** After we've had ≥1 remote in this session, always allow room-health when count drops to 0 (peer left). */
  const hadRemotePeerInSessionRef = useRef(false);
  // Queue producers that arrive before recv transport is ready
  const pendingProducersRef = useRef([]);
  const roomHealthFailureCountRef = useRef(0);
  const suppressAutoResumeUntilRef = useRef(0);
  const prevRemoteStreamCountRef = useRef(0);
  const callRolesRef = useRef({ isLocalHost: false, byUserId: {} });
  const pullStrangerLoopActiveRef = useRef(false);
  const pullStrangerStopRequestedRef = useRef(false);
  const pullStrangerAutoRetryTimerRef = useRef(null);
  const handledPullStrangerKickIdsRef = useRef(new Set());
  const pendingPullStrangerKickIdsRef = useRef(new Set());
  const isEnablingPullStrangerRef = useRef(false);
  const pullStrangerCooldownSecRef = useRef(0);
  const getProducersRetryTimeoutsRef = useRef([]);
  const consumeRetryTimeoutsRef = useRef(new Map());
  const consumingProducerIdsRef = useRef(new Set());
  const consumedProducerIdsRef = useRef(new Set());
  /** Next outbound video produce: camera (default) or screen (getDisplayMedia). */
  const pendingVideoProduceSourceRef = useRef('camera');
  const localScreenStreamRef = useRef(null);
  const localScreenMsProducerRef = useRef(null);
  /** producerId → { uiRemoteId, source: 'audio' | 'camera' | 'screen' } for producer-closed cleanup */
  const producerIdToMetaRef = useRef(new Map());
  const isBroadcastingRef = useRef(false);
  const isCamOffRef = useRef(false);
  const sfuRerouteAttemptRef = useRef(0);

  const sameParticipantId = (a, b) => String(a ?? '') === String(b ?? '');

  const isValidFriendTargetUserId = (userId) => {
    const u = String(userId ?? '');
    return u.length > 0 && !u.startsWith('producer:');
  };

  // Re-assign srcObject whenever the remote stream changes.
  // A plain ref callback only fires on mount/unmount — NOT on re-renders, so
  // we use useEffect which runs after every render where remoteStreams changed.
  useEffect(() => {
    const stream = remoteStreams[0]?.stream;
    remoteStreamsRef.current = remoteStreams; // Sync ref
    const el = remoteVideoRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [remoteStreams]);

  useEffect(() => {
    isBroadcastingRef.current = isBroadcasting;
  }, [isBroadcasting]);

  useEffect(() => {
    isCamOffRef.current = isCamOff;
  }, [isCamOff]);

  useEffect(() => {
    callRolesRef.current = callRoles;
  }, [callRoles]);

  useEffect(() => {
    pullStrangerLoopActiveRef.current = isPullStrangerLoopActive;
  }, [isPullStrangerLoopActive]);

  useEffect(() => {
    isEnablingPullStrangerRef.current = isEnablingPullStranger;
  }, [isEnablingPullStranger]);

  useEffect(() => {
    pullStrangerCooldownSecRef.current = pullStrangerCooldownSec;
  }, [pullStrangerCooldownSec]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const applyVisibilityPolicy = () => {
      const videoProducer = producersRef.current.video;
      const videoTrack = localStreamRef.current?.getVideoTracks?.()[0];
      if (document.hidden) {
        return;
      }

      if (!isCamOffRef.current) {
        if (videoTrack) videoTrack.enabled = true;
        try { videoProducer?.resume?.(); } catch (_) {}
        Object.values(consumersRef.current || {}).forEach((consumer) => {
          if (consumer?.kind !== 'video') return;
          try { consumer.resume?.(); } catch (_) {}
        });
        setRemoteStreams((prev) => {
          const next = prev.map((remote) => ({
            ...remote,
            stream: remote.stream ? new MediaStream(remote.stream.getTracks().filter((t) => t.readyState !== 'ended')) : remote.stream,
            screenStream: remote.screenStream
              ? new MediaStream(remote.screenStream.getTracks().filter((t) => t.readyState !== 'ended'))
              : remote.screenStream
          }));
          remoteStreamsRef.current = next;
          return next;
        });
        if (roomInfoRef.current?.roomId && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'get-producers', data: { roomId: roomInfoRef.current.roomId } }));
        }
      }
    };
    document.addEventListener('visibilitychange', applyVisibilityPolicy);
    return () => document.removeEventListener('visibilitychange', applyVisibilityPolicy);
  }, []);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await apiRequest(API.WALLET.GET_BALANCE).catch(() => null);
        if (res) setCoins(res.balance || 0);
      } catch (e) {}
    };
    fetchWallet();
  }, []);

  function cleanup() {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    // Stop local media tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    // Clear pending producer queue
    pendingProducersRef.current = [];
    getProducersRetryTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
    getProducersRetryTimeoutsRef.current = [];
    consumeRetryTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
    consumeRetryTimeoutsRef.current.clear();
    consumingProducerIdsRef.current.clear();
    consumedProducerIdsRef.current.clear();
    myProducerIdsRef.current.clear();
    if (pullStrangerAutoRetryTimerRef.current) {
      clearTimeout(pullStrangerAutoRetryTimerRef.current);
      pullStrangerAutoRetryTimerRef.current = null;
    }
    handledPullStrangerKickIdsRef.current.clear();
    pendingPullStrangerKickIdsRef.current.clear();
    pullStrangerLoopActiveRef.current = false;
    pullStrangerStopRequestedRef.current = true;
    setIsPullStrangerLoopActive(false);
    setPullStrangerCooldownSec(0);
    pendingVideoProduceSourceRef.current = 'camera';
    producerIdToMetaRef.current.clear();
    localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localScreenStreamRef.current = null;
    try {
      localScreenMsProducerRef.current?.close?.();
    } catch (_) {}
    localScreenMsProducerRef.current = null;
    setIsScreenSharing(false);
    Object.values(consumersRef.current || {}).forEach((consumer) => {
      try {
        consumer?.track?.stop?.();
        consumer?.close?.();
      } catch (_) {}
    });
    Object.values(producersRef.current || {}).forEach((producer) => {
      if (producer && typeof producer.close === 'function') {
        try {
          producer.close();
        } catch (_) {}
      }
    });
    try {
      sendTransportRef.current?.close?.();
    } catch (_) {}
    try {
      recvTransportRef.current?.close?.();
    } catch (_) {}
    remoteStreamsRef.current?.forEach((s) => {
      s?.stream?.getTracks?.().forEach((t) => t.stop());
      s?.screenStream?.getTracks?.().forEach((t) => t.stop());
    });
    remoteStreamsRef.current = [];
    setRemoteStreams([]);
    producersRef.current = {};
    consumersRef.current = {};
    consumerIdsByUserRef.current = {};
    sendTransportRef.current = null;
    recvTransportRef.current = null;
  }

  // --- Remote profile per userId (3-way call: each tile must show that peer, not the matched partner) ---
  const remoteUserIdsKey = remoteStreams
    .map((s) => String(s.userId))
    .sort()
    .join('|');

  useEffect(() => {
    const fetchMissingProfiles = async () => {
      const need = remoteStreams.filter((s) => {
        const uid = String(s.userId);
        if (uid.startsWith('producer:')) return false;
        return s.profileFetched !== true;
      });

      for (const streamInfo of need) {
        const uid = String(streamInfo.userId);
        try {
          const profileResp = await apiRequest(API.USERS.GET_USER(uid));
          const profile = profileResp?.user || {};
          let age = '';
          if (profile.dateOfBirth) {
            const dob = new Date(profile.dateOfBirth);
            if (!Number.isNaN(dob.getTime())) {
              const now = new Date();
              let years = now.getFullYear() - dob.getFullYear();
              const monthDiff = now.getMonth() - dob.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
                years--;
              }
              age = years >= 0 ? String(years) : '';
            }
          }

          setRemoteStreams((prev) =>
            prev.map((s) =>
              String(s.userId) === uid
                ? {
                    ...s,
                    name: profile.username || 'Guest',
                    age,
                    displayPictureUrl: profile.displayPictureUrl || '/avatar-placeholder.png',
                    city: profile.preferredCity || '',
                    profileFetched: true
                  }
                : s
            )
          );
        } catch (err) {
          console.warn(`[VideoChat] Failed to fetch profile for ${uid}:`, err);
        }
      }
    };

    if (remoteStreams.length > 0) {
      fetchMissingProfiles();
    }
    // Intentionally not depending on `remoteStreams` — only when the set of remote user IDs changes
    // (avoids re-fetch loops on every track merge / object identity change).
  }, [remoteUserIdsKey]);

  // Friendship with each remote (so pull-stranger guests and hosts can + anyone in the call)
  useEffect(() => {
    if (!remoteUserIdsKey) return;
    const uids = remoteUserIdsKey
      .split('|')
      .filter(Boolean)
      .filter((uid) => !String(uid).startsWith('producer:'));
    if (uids.length === 0) return;

    let cancelled = false;
    (async () => {
      await Promise.all(
        uids.map(async (uid) => {
          try {
            const res = await apiRequest(API.FRIENDS.CHECK_FRIENDSHIP(uid));
            if (!cancelled && res) {
              setFriendshipWithRemote((prev) => ({ ...prev, [uid]: Boolean(res.areFriends) }));
            }
          } catch (err) {
            console.warn('[VideoChat] CHECK_FRIENDSHIP failed for', uid, err);
          }
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [remoteUserIdsKey]);

  // --- Initialize ---
  useEffect(() => {
    let aborted = false;
    const init = async () => {
      console.log('[Init] Starting video chat initialization...');
      hadRemotePeerInSessionRef.current = false;
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
              const profileResp = await apiRequest(API.USERS.GET_USER(info.partner.id));
              const profile = profileResp?.user || {};
              let age = '';
              if (profile.dateOfBirth) {
                const dob = new Date(profile.dateOfBirth);
                if (!Number.isNaN(dob.getTime())) {
                  const now = new Date();
                  let years = now.getFullYear() - dob.getFullYear();
                  const monthDiff = now.getMonth() - dob.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
                    years--;
                  }
                  age = years >= 0 ? String(years) : '';
                }
              }
              setPartnerInfo({
                id: profile.id || info.partner.id,
                name: profile.username || 'Matched!',
                age,
                city: profile.preferredCity || '',
                displayPictureUrl: profile.displayPictureUrl || '/avatar-placeholder.png'
              });
            } catch (err) {
              console.warn('[Init] Failed to fetch partner profile fallback:', err);
            }
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
        // No roomId in localStorage — try fetching from server before giving up
        console.warn('[Init] No room ID in localStorage, checking server...');
        try {
          const token = localStorage.getItem('accessToken');
          if (token && uid) {
            const serverRoom = await apiRequest(API.STREAMING.GET_USER_ROOM(uid));
            if (serverRoom?.exists && serverRoom?.roomId && serverRoom?.role === 'participant') {
              console.log('[Init] Recovered roomId from server:', serverRoom.roomId);
              info = { roomId: serverRoom.roomId, sessionId: serverRoom.id || serverRoom.roomId };
              localStorage.setItem('currentRoom', JSON.stringify(info));
            }
          }
        } catch (_) {}

        if (!info?.roomId) {
          console.error('[Init] No room ID found!');
          setStatus('error');
          setError('No active match found.');
          setTimeout(() => resumeDiscoveryFromCall(), 200);
          return;
        }
      }

      // Verify active room with retries (handles eventual consistency after room creation).
      try {
        const token = localStorage.getItem('accessToken');
        if (token && uid) {
          let verified = false;
          let checkedRoom = info.roomId;
          let lastRoomPayload = null;
          const ROOM_VERIFY_ATTEMPTS = 24;
          const ROOM_VERIFY_MS = 650;
          for (let attempt = 0; attempt < ROOM_VERIFY_ATTEMPTS; attempt++) {
            const roomCheck = await apiRequest(API.STREAMING.GET_USER_ROOM(uid));
            if (roomCheck?.exists && roomCheck?.roomId) {
              checkedRoom = roomCheck.roomId;
              verified = true;
              lastRoomPayload = roomCheck;
              break;
            }
            await new Promise((r) => setTimeout(r, ROOM_VERIFY_MS));
          }

          if (lastRoomPayload?.participants?.length) {
            const byUserId = {};
            lastRoomPayload.participants.forEach((p) => {
              byUserId[String(p.userId)] = p.role;
            });
            setCallRoles({
              isLocalHost: lastRoomPayload.userRole === 'HOST',
              byUserId
            });
          }

          if (verified && checkedRoom !== info.roomId) {
            // Prefer server truth to avoid false "mismatch" redirects.
            info = {
              ...info,
              roomId: checkedRoom,
              sessionId: info.sessionId || checkedRoom
            };
            localStorage.setItem('currentRoom', JSON.stringify(info));
            console.warn('[Init] Using server roomId after delayed consistency:', checkedRoom);
          }
        }
      } catch (_) {
        // If room check fails, proceed anyway — WS/join response will be source of truth.
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
      try {
        if (sessionStorage.getItem('waitlistJoinRedirect') === '1') {
          sessionStorage.removeItem('waitlistJoinRedirect');
          // Beam TV → call redirect: avoid room-health GET /users/room until join-room + first remote.
          mediaEstablishGraceUntilRef.current = Date.now() + 60_000;
        }
      } catch (_) {}
      squadQuickInvitePeersPostedRoomIdRef.current = null;
      setRoomInfo(info);
      if (info.partner) {
        const pInfo = {
          id: info.partner.id || '',
          name: info.partner.username || 'Matched!',
          age: info.partner.age || '',
          city: info.partner.city || '',
          displayPictureUrl: info.partner.displayPictureUrl || '/avatar-placeholder.png'
        };
        setPartnerInfo(pInfo);
        partnerInfoRef.current = pInfo;
      }
      startMediaAndSignaling(info, uid);
    };

    // Case 1: browser tab/window close
    const handlePageExit = () => {
      cleanup();
      leaveRoomAndSetOnline();
    };
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageExit);

    // React Strict Mode in dev mounts -> unmounts -> remounts once.
    // Arm unmount cleanup after the effect stabilizes so the synthetic unmount
    // does not call leaveRoom and tear down a just-created room.
    cleanupArmTimerRef.current = setTimeout(() => {
      allowUnmountCleanupRef.current = true;
    }, 0);

    init();
    return () => {
      aborted = true;
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageExit);
      if (cleanupArmTimerRef.current) {
        clearTimeout(cleanupArmTimerRef.current);
        cleanupArmTimerRef.current = null;
      }
      // Case 2 & 3: go back / signout (component unmount)
      if (allowUnmountCleanupRef.current && !intentionalExitRef.current) {
        leaveRoomAndSetOnline();
      }
      cleanup();
    };
  }, [router]);

  // Safety watcher: if peer-leave websocket signal is missed, auto-resume discovery from stuck 1:1 call.
  useEffect(() => {
    const mergeRoomHealthDebug = (next) => {
      setRoomHealthDebug((prev) => {
        if (
          prev.graceActive === next.graceActive &&
          prev.graceRemainingSec === next.graceRemainingSec &&
          prev.failureCount === next.failureCount
        ) {
          return prev;
        }
        return next;
      });
    };

    const tick = async () => {
      if (intentionalExitRef.current || autoTransitioningRef.current) return;
      const now = Date.now();
      const graceMs = suppressAutoResumeUntilRef.current - now;
      if (graceMs > 0) {
        mergeRoomHealthDebug({
          graceActive: true,
          graceRemainingSec: Math.ceil(graceMs / 1000),
          failureCount: roomHealthFailureCountRef.current
        });
        return;
      }
      const roomId = roomInfoRef.current?.roomId;
      const userId = userIdRef.current;
      if (!roomId || !userId) return;

      // While WebRTC is still wiring up (0 remotes), avoid hammering GET /users/:room — it runs server-side
      // reconcile and can interact badly with MATCHED→IN_SQUAD propagation right after match.
      if (
        (remoteStreamsRef.current?.length || 0) === 0 &&
        !hadRemotePeerInSessionRef.current &&
        Date.now() < (mediaEstablishGraceUntilRef.current || 0)
      ) {
        return;
      }

      // If remote streams are alive, this call is healthy. Avoid DB-based false positives.
      if ((remoteStreamsRef.current?.length || 0) > 0) {
        roomHealthFailureCountRef.current = 0;
        mergeRoomHealthDebug({
          graceActive: false,
          graceRemainingSec: 0,
          failureCount: 0
        });
        return;
      }
      try {
        const roomState = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
        // If user is no longer in an active room OR room dropped to solo participant, leave stuck call UI.
        const participantCount = Number(roomState?.participantCount || 0);
        const inWaitlistJoinGrace = Date.now() < (mediaEstablishGraceUntilRef.current || 0);
        if (inWaitlistJoinGrace && (!roomState?.exists || participantCount <= 1)) {
          return;
        }
        if (!roomState?.exists || participantCount <= 1) {
          if (isBroadcastingRef.current) {
            roomHealthFailureCountRef.current = 0;
            mergeRoomHealthDebug({
              graceActive: false,
              graceRemainingSec: 0,
              failureCount: 0
            });
            return;
          }
          roomHealthFailureCountRef.current += 1;
          mergeRoomHealthDebug({
            graceActive: false,
            graceRemainingSec: 0,
            failureCount: roomHealthFailureCountRef.current
          });
          // Avoid false-positive teardown from transient stale reads.
          if (roomHealthFailureCountRef.current < 6) {
            return;
          }
          flowLog('room_health_auto_resume', {
            exists: Boolean(roomState?.exists),
            participantCount
          });
          await handlePeerLeftAutoResume();
          return;
        }
        roomHealthFailureCountRef.current = 0;
        mergeRoomHealthDebug({
          graceActive: false,
          graceRemainingSec: 0,
          failureCount: 0
        });
      } catch (_) {}
    };
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, []);

  const isPullStrangerCooldownActive = pullStrangerCooldownSec > 0;

  useEffect(() => {
    if (!isPullStrangerCooldownActive) return;
    const id = setInterval(() => {
      setPullStrangerCooldownSec((prev) => {
        const next = prev > 0 ? prev - 1 : 0;
        pullStrangerCooldownSecRef.current = next;
        if (prev > 0 && next === 0) {
          pullStrangerLoopActiveRef.current = false;
          pullStrangerStopRequestedRef.current = true;
          setIsPullStrangerLoopActive(false);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPullStrangerCooldownActive]);

  useEffect(() => {
    let cancelled = false;

    const pickLoadingMeme = (memes) => {
      const activeMemes = Array.isArray(memes)
        ? memes.filter((meme) => meme && (meme.imageUrl || meme.text))
        : [];
      if (activeMemes.length === 0) return null;

      const orderedMemes = activeMemes
        .filter((meme) => Number.isFinite(Number(meme.order)))
        .sort((a, b) => Number(a.order) - Number(b.order));
      if (orderedMemes.length > 0) {
        const key = 'beam_loading_meme_order_index';
        const previousIndex = Number.parseInt(localStorage.getItem(key) || '0', 10);
        const safeIndex = Number.isFinite(previousIndex) ? previousIndex % orderedMemes.length : 0;
        localStorage.setItem(key, String((safeIndex + 1) % orderedMemes.length));
        return orderedMemes[safeIndex];
      }

      return activeMemes[Math.floor(Math.random() * activeMemes.length)];
    };

    const normalizeMeme = (meme) => {
      if (!meme) return null;
      return {
        imageUrl: meme.imageUrl || '',
        text: meme.text || 'Finding someone who matches your energy...',
      };
    };

    (async () => {
      try {
        const response = await apiRequest(API.STREAMING.GET_LOADING_MEMES);
        if (cancelled) return;
        const selected = pickLoadingMeme(response?.memes || []);
        if (selected) {
          setLoadingMeme(normalizeMeme(selected));
          return;
        }
      } catch (_) {}

      try {
        const response = await apiRequest(API.STREAMING.GET_RANDOM_LOADING_MEME);
        if (cancelled) return;
        setLoadingMeme(normalizeMeme(response?.meme || response));
      } catch (_) {
        if (!cancelled) {
          setLoadingMeme({
            imageUrl: '',
            text: 'Finding someone who matches your energy...',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // When a third person is in the call (2 remote peers), pull-stranger window is done: stop UI timer and grace.
  // When dropping from 3+ tiles to 2 (guest kicked), clear pull-stranger grace — otherwise room-health keeps
  // updating debug state on an interval and re-renders the page (local preview flicker). Do not clear on a
  // steady 1:1 call where the host is still waiting for a stranger (same remote count throughout).
  useEffect(() => {
    const n = remoteStreams.length;
    const prev = prevRemoteStreamCountRef.current;
    prevRemoteStreamCountRef.current = n;

    if (n >= 2) {
      pullStrangerCooldownSecRef.current = 0;
      setPullStrangerCooldownSec((s) => (s > 0 ? 0 : s));
      suppressAutoResumeUntilRef.current = 0;
      setRoomHealthDebug((d) =>
        d.graceActive
          ? { graceActive: false, graceRemainingSec: 0, failureCount: d.failureCount }
          : d
      );
      return;
    }
    if (n === 1 && prev >= 2) {
      if (pullStrangerLoopActiveRef.current || pullStrangerCooldownSecRef.current > 0) {
        return;
      }
      suppressAutoResumeUntilRef.current = 0;
      pullStrangerCooldownSecRef.current = 0;
      setPullStrangerCooldownSec((s) => (s > 0 ? 0 : s));
      setRoomHealthDebug((d) =>
        d.graceActive || d.graceRemainingSec !== 0
          ? { graceActive: false, graceRemainingSec: 0, failureCount: d.failureCount }
          : d
      );
    }
  }, [remoteStreams.length]);

  // Media-level safety watcher:
  // If peer media vanishes after having been present, auto-resume discovery even if room rows lag.
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (intentionalExitRef.current || autoTransitioningRef.current) return;
      if (status !== 'connected') return;

      const remoteStream = remoteStreamsRef.current[0]?.stream || null;
      if (remoteStream) {
        hadRemoteMediaRef.current = true;
        const tracks = remoteStream.getTracks();
        const allEnded = tracks.length > 0 && tracks.every((t) => t.readyState === 'ended');
        if (allEnded) {
          if (!remoteMediaMissingSinceRef.current) {
            remoteMediaMissingSinceRef.current = Date.now();
          }
        } else {
          remoteMediaMissingSinceRef.current = null;
        }
      } else if (hadRemoteMediaRef.current) {
        if (!remoteMediaMissingSinceRef.current) {
          remoteMediaMissingSinceRef.current = Date.now();
        }
      } else {
        // Initial connect phase before peer joins: do not auto-exit.
        remoteMediaMissingSinceRef.current = null;
      }

      if (remoteMediaMissingSinceRef.current) {
        const missingForMs = Date.now() - remoteMediaMissingSinceRef.current;
        if (missingForMs >= 4000) {
          if (isBroadcastingRef.current) {
            return;
          }
          flowLog('media_health_auto_resume', { missingForMs });
          await handlePeerLeftAutoResume();
        }
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [status]);

  function tryRecordSquadQuickInvitePeersOnLeaveKeepalive() {
    const info = roomInfoRef.current;
    const uid = userIdRef.current;
    if (!info?.roomId || info.callType !== 'squad' || !uid) return;
    if (squadQuickInvitePeersPostedRoomIdRef.current === info.roomId) return;
    const ids = Array.isArray(info.memberIds) ? info.memberIds : [];
    const peers = ids.filter((id) => id && String(id) !== String(uid));
    if (!peers.length) return;
    squadQuickInvitePeersPostedRoomIdRef.current = info.roomId;
    recordSquadCallPeersKeepalive(info, uid);
  }

  async function tryRecordSquadQuickInvitePeersOnLeaveAsync() {
    const info = roomInfoRef.current;
    const uid = userIdRef.current;
    if (!info?.roomId || info.callType !== 'squad' || !uid) return;
    if (squadQuickInvitePeersPostedRoomIdRef.current === info.roomId) return;
    const ids = Array.isArray(info.memberIds) ? info.memberIds : [];
    const peers = ids.filter((id) => id && String(id) !== String(uid));
    if (!peers.length) return;
    squadQuickInvitePeersPostedRoomIdRef.current = info.roomId;
    try {
      await recordSquadCallPeersAsync(info, uid);
    } catch (e) {
      console.warn('[SquadQuickInvite] record-call-peers failed', e);
      squadQuickInvitePeersPostedRoomIdRef.current = null;
    }
  }

  function leaveRoomAndSetOnline(nextStatus = 'ONLINE') {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      let userId = userIdRef.current;
      if (!userId) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || payload.uid || payload.id;
          userIdRef.current = userId;
        } catch (_) {}
      }

      tryRecordSquadQuickInvitePeersOnLeaveKeepalive();

      const roomId = roomInfoRef.current?.roomId;
      if (roomId && userId) {
        fetch(API.STREAMING.LEAVE_ROOM(roomId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
          keepalive: true,
        }).catch(() => {});
      }

      // Homepage baseline is ONLINE; discovery pool is entered explicitly from home CTA.
      exitCallToHomeKeepalive();
    } catch (_) {}
  }

  async function leaveRoomAndSetStatusReliable(nextStatus = 'ONLINE', sessionIdForResume = null) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      let userId = userIdRef.current;
      if (!userId) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || payload.uid || payload.id;
          userIdRef.current = userId;
        } catch (_) {}
      }

      await tryRecordSquadQuickInvitePeersOnLeaveAsync();

      const roomId = roomInfoRef.current?.roomId;
      if (roomId && userId) {
        try {
          await apiRequest(API.STREAMING.LEAVE_ROOM(roomId), {
            method: 'POST',
            body: JSON.stringify({ userId }),
          });
        } catch (err) {
          console.warn('[Leave] Reliable leave failed, falling back to keepalive:', err);
          fetch(API.STREAMING.LEAVE_ROOM(roomId), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ userId }),
            keepalive: true,
          }).catch(() => {});
        }
      }

      if (nextStatus === 'AVAILABLE') {
        await exitCallResumeDiscovery(
          sessionIdForResume ||
            roomInfoRef.current?.sessionId ||
            roomInfo?.sessionId ||
            Date.now().toString()
        );
      } else {
        await exitCallToHome();
      }
    } catch (_) {}
  }

  const resumeDiscoveryFromCall = (sessionIdOverride = null) => {
    const sid =
      sessionIdOverride ||
      roomInfoRef.current?.sessionId ||
      roomInfo?.sessionId ||
      Date.now().toString();
    localStorage.setItem('resumeDiscoveryOnHome', JSON.stringify({ sessionId: sid }));
    localStorage.setItem('forceDiscoveryResume', JSON.stringify({ sessionId: sid }));
    localStorage.setItem('pendingRaincheckResume', JSON.stringify({
      sessionId: sid,
      nextCard: null
    }));
    flowLog('resumeDiscoveryFromCall -> push', {
      sid,
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      search: typeof window !== 'undefined' ? window.location.search : ''
    });
    router.push(`/?resumeDiscovery=1&sessionId=${encodeURIComponent(sid)}`);
  };

  const handleRaincheckNext = async () => {
    if (isRainchecking) return;
    setIsRainchecking(true);
    intentionalExitRef.current = true;
    try {
      const token = localStorage.getItem('accessToken');
      const partnerId = roomInfoRef.current?.partner?.id || partnerInfo.id;
      const sid = roomInfoRef.current?.sessionId || roomInfo?.sessionId || Date.now().toString();
      flowLog('click_next_in_call', {
        sid,
        roomId: roomInfoRef.current?.roomId || roomInfo?.roomId || null,
        partnerId: partnerId || null
      });
      // Hard guarantee: if user clicked in-call raincheck, next screen must resume discovery mode.
      localStorage.setItem('resumeDiscoveryOnHome', JSON.stringify({ sessionId: sid }));
      localStorage.setItem('forceDiscoveryResume', JSON.stringify({ sessionId: sid }));
      if (token && partnerId) {
        try {
          const data = await apiRequest(API.DISCOVERY.RAINCHECK, {
            method: 'POST',
            body: JSON.stringify({
              sessionId: sid,
              raincheckedUserId: partnerId
            })
          });
          localStorage.setItem('pendingRaincheckResume', JSON.stringify({
            sessionId: sid,
            // Always fetch a fresh card on resume to avoid stale split-second flashes.
            nextCard: null
          }));
          flowLog('raincheck_api_success', { hasNextCard: Boolean(data?.nextCard), useFreshFetch: true });
        } catch (error) {
          console.warn('[Raincheck] Failed to record raincheck from call:', error);
          localStorage.setItem('pendingRaincheckResume', JSON.stringify({
            sessionId: sid,
            nextCard: null
          }));
          flowLog('raincheck_api_failed');
        }
      }

      if (wsRef.current?.readyState === WebSocket.OPEN && roomInfo?.roomId) {
        wsRef.current.send(JSON.stringify({ type: 'leave-room', data: { roomId: roomInfo.roomId } }));
      }

      await leaveRoomAndSetStatusReliable('AVAILABLE', sid);
      flowLog('leave_room_status_done', { targetStatus: 'AVAILABLE' });
      cleanup();
      localStorage.removeItem('currentRoom');
      resumeDiscoveryFromCall(sid);
    } finally {
      setIsRainchecking(false);
    }
  };

  const handlePeerLeftAutoResume = async () => {
    if (isBroadcastingRef.current) {
      remoteMediaMissingSinceRef.current = null;
      return;
    }
    if (autoTransitioningRef.current) return;
    autoTransitioningRef.current = true;
    intentionalExitRef.current = true;
    const sid = roomInfoRef.current?.sessionId || roomInfo?.sessionId || Date.now().toString();
    flowLog('peer_left_auto_resume_start', {
      sid,
      roomId: roomInfoRef.current?.roomId || roomInfo?.roomId || null
    });
    try {
      await leaveRoomAndSetStatusReliable('AVAILABLE', sid);
      flowLog('peer_left_auto_resume_leave_done');
    } catch (_) {}
    cleanup();
    localStorage.removeItem('currentRoom');
    resumeDiscoveryFromCall(sid);
  };

  const send = (msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const stopScreenShare = useCallback(() => {
    const producer = localScreenMsProducerRef.current;
    const rid = roomInfoRef.current?.roomId;
    if (producer && rid) {
      send({ type: 'close-producer', data: { roomId: rid, producerId: producer.id } });
    }
    try {
      producer?.close?.();
    } catch (_) {}
    localScreenMsProducerRef.current = null;
    localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localScreenStreamRef.current = null;
    setIsScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!sendTransportRef.current || !roomInfoRef.current?.roomId) return;
    if (localScreenMsProducerRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { max: 30 } },
        audio: false
      });
      localScreenStreamRef.current = screenStream;
      const track = screenStream.getVideoTracks()[0];
      if (!track) {
        screenStream.getTracks().forEach((t) => t.stop());
        localScreenStreamRef.current = null;
        return;
      }
      track.onended = () => {
        stopScreenShare();
      };
      pendingVideoProduceSourceRef.current = 'screen';
      const producer = await sendTransportRef.current.produce({
        track,
        encodings: [{ maxBitrate: 3_000_000 }],
        appData: { source: 'screen' }
      });
      localScreenMsProducerRef.current = producer;
      setIsScreenSharing(true);
    } catch (e) {
      console.warn('[WebRTC] Screen share cancelled or failed', e);
      localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
      pendingVideoProduceSourceRef.current = 'camera';
    }
  }, [stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (localScreenMsProducerRef.current) {
      stopScreenShare();
    } else {
      void startScreenShare();
    }
  }, [stopScreenShare, startScreenShare]);

  /** If the first get-producers races the peer's produce(), retry a few times (covers intermittent "stuck waiting"). */
  const scheduleGetProducersRetries = (targetRoomId) => {
    const delays = [3500, 8000, 16000];
    getProducersRetryTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
    getProducersRetryTimeoutsRef.current = [];
    delays.forEach((ms, idx) => {
      const tid = setTimeout(() => {
        if (intentionalExitRef.current) return;
        if (roomInfoRef.current?.roomId !== targetRoomId) return;
        if (remoteStreamsRef.current.length > 0) return;
        if (!recvTransportRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
        console.log(`[WebRTC] get-producers retry ${idx + 1}/${delays.length} (still no remote)`);
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
      room.participants.forEach((p) => {
        byUserId[String(p.userId)] = p.role;
      });
      setCallRoles({ isLocalHost: room.userRole === 'HOST', byUserId });
    } catch (e) {
      console.warn('[VideoChat] refreshCallRolesFromServer failed', e);
    }
  };

  const scheduleCallRoleRefresh = () => {
    if (callRoleRefreshTimerRef.current) clearTimeout(callRoleRefreshTimerRef.current);
    callRoleRefreshTimerRef.current = setTimeout(() => {
      callRoleRefreshTimerRef.current = null;
      refreshCallRolesFromServer();
    }, 400);
  };

  /**
   * @param {object} [opts]
   * @param {boolean} [opts.skipPeerLeftAutoResume] — When someone is kicked, the last visible remote may be
   *   only the guest while the original partner’s media is still in the room on the server. Auto-resume would wrongly eject the user.
   */
  const removeRemoteParticipantFromUi = (leftIdRaw, opts = {}) => {
    const { skipPeerLeftAutoResume = false } = opts;
    const leftId = String(leftIdRaw);
    let remainingAfter = 0;
    setRemoteStreams((prev) => {
      const next = prev.filter((s) => String(s.userId) !== leftId);
      remainingAfter = next.length;
      remoteStreamsRef.current = next;
      return next;
    });
    for (const [pid, meta] of [...producerIdToMetaRef.current.entries()]) {
      if (String(meta.uiRemoteId) === leftId) {
        producerIdToMetaRef.current.delete(pid);
      }
    }
    const cids = consumerIdsByUserRef.current[leftId];
    if (cids?.length) {
      cids.forEach((cid) => {
        try {
          consumersRef.current[cid]?.close?.();
        } catch (_) {}
        delete consumersRef.current[cid];
      });
    }
    delete consumerIdsByUserRef.current[leftId];
    setCallRoles((prev) => {
      const nextBy = { ...prev.byUserId };
      delete nextBy[leftId];
      const next = { ...prev, byUserId: nextBy };
      callRolesRef.current = next;
      return next;
    });
    if (remainingAfter === 0 && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remainingAfter === 0 && !skipPeerLeftAutoResume) {
      remoteMediaMissingSinceRef.current = Date.now();
      handlePeerLeftAutoResume();
    } else {
      remoteMediaMissingSinceRef.current = null;
    }
  };

  const handleKickRemote = (targetUserId) => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    if (!rid || !targetUserId) return;
    const targetId = String(targetUserId);
    if (
      callRolesRef.current?.isLocalHost &&
      !pullStrangerStopRequestedRef.current &&
      callRolesRef.current?.byUserId?.[targetId] === 'PARTICIPANT'
    ) {
      pendingPullStrangerKickIdsRef.current.add(`${rid}:${targetId}`);
      pullStrangerLoopActiveRef.current = true;
      setIsPullStrangerLoopActive(true);
    }
    send({
      type: 'kick-user',
      data: { roomId: rid, targetUserId: targetId }
    });
  };

  const maybeAutoPullStrangerAfterKick = (targetUserId) => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const targetId = String(targetUserId || '');
    if (!rid || !targetId) return;
    if (!callRolesRef.current?.isLocalHost) return;
    if (pullStrangerStopRequestedRef.current) return;

    const dedupeKey = `${rid}:${targetId}`;
    const wasKickedFromVisibleControl = pendingPullStrangerKickIdsRef.current.has(dedupeKey);
    if (!pullStrangerLoopActiveRef.current && !wasKickedFromVisibleControl) return;
    if (callRolesRef.current?.byUserId?.[targetId] !== 'PARTICIPANT' && !wasKickedFromVisibleControl) return;
    pendingPullStrangerKickIdsRef.current.delete(dedupeKey);
    if (handledPullStrangerKickIdsRef.current.has(dedupeKey)) return;
    handledPullStrangerKickIdsRef.current.add(dedupeKey);
    setTimeout(() => handledPullStrangerKickIdsRef.current.delete(dedupeKey), 5000);

    armPullStrangerSummoningWindow();

    if (pullStrangerAutoRetryTimerRef.current) {
      clearTimeout(pullStrangerAutoRetryTimerRef.current);
    }
    pullStrangerAutoRetryTimerRef.current = setTimeout(() => {
      pullStrangerAutoRetryTimerRef.current = null;
      if (pullStrangerStopRequestedRef.current) return;
      enablePullStranger({ auto: true });
    }, 500);
  };

  const handleLeaveGroupOrRaincheck = async () => {
    if (isRainchecking) return;
    const n = remoteStreamsRef.current.length;
    if (n <= 1) {
      await handleRaincheckNext();
      return;
    }
    setIsRainchecking(true);
    intentionalExitRef.current = true;
    try {
      const sid = roomInfoRef.current?.sessionId || roomInfo?.sessionId || Date.now().toString();
      if (wsRef.current?.readyState === WebSocket.OPEN && roomInfoRef.current?.roomId) {
        wsRef.current.send(JSON.stringify({ type: 'leave-room', data: { roomId: roomInfoRef.current.roomId } }));
      }
      await leaveRoomAndSetStatusReliable('AVAILABLE', sid);
      cleanup();
      localStorage.removeItem('currentRoom');
      resumeDiscoveryFromCall(sid);
    } finally {
      setIsRainchecking(false);
    }
  };

  const startMediaAndSignaling = async (info, userId) => {
    try {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1
      };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: getCameraConstraints({ exactFrontCamera: isMobileRuntime() }),
          audio: audioConstraints
        });
      } catch (frontCameraError) {
        // Some Android browsers reject exact facingMode despite having a front camera.
        // Fall back to an ideal preference rather than failing the whole call.
        stream = await navigator.mediaDevices.getUserMedia({
          video: getCameraConstraints({ exactFrontCamera: false }),
          audio: audioConstraints
        });
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Media error:', err);
      // Fallback to signaling anyway so we can see remote if they have camera
    }

    // Browsers cannot set custom headers on WebSocket connections.
    // Pass the JWT as a query param so the streaming gateway can authenticate.
    const accessToken = localStorage.getItem('accessToken') || '';
    sfuRerouteAttemptRef.current = 0;

    const openSignalingSocket = (baseUrl = WS_URL) => {
      const wsUrlWithAuth = buildWsUrl(baseUrl, {
        userId,
        roomId: info.roomId,
        ...(accessToken ? { token: accessToken } : {})
      });
      const ws = new WebSocket(wsUrlWithAuth);
      wsRef.current = ws;
      console.log('[WebSocket] Connecting to:', wsUrlWithAuth.replace(/token=[^&]+/, 'token=<redacted>'));

      ws.onopen = () => send({ type: 'join-room', data: { roomId: info.roomId } });
      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        realtimeDebug('[WebSocket] Received message:', msg.type, msg);
        if (msg.type === 'room-reroute') {
          if (sfuRerouteAttemptRef.current >= 2) {
            setStatus('error');
            setError('Could not route call to the assigned media server.');
            return;
          }
          sfuRerouteAttemptRef.current += 1;
          const rerouteUrl = getRerouteWsUrl(msg.data, WS_URL);
          try {
            ws.onclose = null;
            ws.close();
          } catch (_) {}
          openSignalingSocket(rerouteUrl);
          return;
        }
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

    openSignalingSocket();
  };

  const handleStaleRoom = async () => {
    if (intentionalExitRef.current) return;
    intentionalExitRef.current = true;
    flowLog('handleStaleRoom_triggered', {
      roomId: roomInfoRef.current?.roomId || null
    });
    const sid = roomInfoRef.current?.sessionId || roomInfo?.sessionId || Date.now().toString();
    await leaveRoomAndSetStatusReliable('AVAILABLE', sid);
    cleanup();
    localStorage.removeItem('currentRoom');
    resumeDiscoveryFromCall(sid);
  };

  const handleSignal = async (msg, info, userId) => {
    const { type, data } = msg;
    realtimeDebug('[WebRTC] Handling signal:', type, data);

    switch (type) {
      case 'room-joined': {
        console.log('[WebRTC] Room joined, loading device...');
        if (data.participantRoles?.length) {
          const byUserId = {};
          data.participantRoles.forEach(({ userId: id, role }) => {
            byUserId[String(id)] = role;
          });
          setCallRoles({
            isLocalHost: data.myRole === 'HOST',
            byUserId
          });
        }
        mediaEstablishGraceUntilRef.current = Date.now() + 45_000;
        const { Device } = await import('mediasoup-client');
        const device = new Device();
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        deviceRef.current = device;
        if (Array.isArray(data.producers) && data.producers.length > 0) {
          pendingProducersRef.current.push(
            ...data.producers.map((p) => ({
              producerId: p.producerId,
              remoteUserId: p.userId,
              kind: p.kind,
              source: p.source
            }))
          );
        }
        setStatus('connected');
        console.log('[WebRTC] Device loaded, creating send transport...');
        
        // Step 1: Create Send Transport
        send({ type: 'create-transport', data: { roomId: info.roomId, producing: true, consuming: false } });
        
        // room-joined includes existing producers; get-producers remains a heal check after recv transport is ready.
        break;
      }

      case 'producers-list': {
        realtimeDebug('[WebRTC] Received producers list:', data);
        if (!data || !Array.isArray(data)) {
          console.log('[WebRTC] No producers in room yet');
          return;
        }
        
        realtimeDebug(`[WebRTC] Found ${data.length} existing producer(s) in room`);
        data.forEach(p => {
          const isSameUser = sameParticipantId(p.userId, userIdRef.current);
          const isMyProducer = myProducerIdsRef.current.has(String(p.producerId));
          // Only skip if this is both "me" and "my producer" (prevents false positives when
          // backend mis-labels userId for a remote producer on one client).
          if (!isSameUser || !isMyProducer) {
            realtimeDebug('[WebRTC] Consuming existing producer:', p.producerId, 'kind:', p.kind, 'from user:', p.userId);
            if (!recvTransportRef.current) {
              // Still not ready — queue it (shouldn't happen if we send get-producers after transport ready, but be safe)
              realtimeDebug('[WebRTC] Recv transport still not ready, queuing from producers-list:', p.producerId);
              pendingProducersRef.current.push({
                producerId: p.producerId,
                remoteUserId: p.userId,
                kind: p.kind,
                source: p.source
              });
            } else {
              consume(p.producerId, p.userId, { kind: p.kind, source: p.source });
            }
          } else {
            realtimeDebug('[WebRTC] Skipping own producer:', p.producerId);
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
            if (kind === 'video') {
              if (!producersRef.current.videoCbQueue) producersRef.current.videoCbQueue = [];
              producersRef.current.videoCbQueue.push(cb);
              const src = pendingVideoProduceSourceRef.current || 'camera';
              send({
                type: 'produce',
                data: {
                  roomId: info.roomId,
                  transportId: id,
                  kind,
                  rtpParameters,
                  source: src
                }
              });
            } else {
              producersRef.current.resolve_audio = cb;
              send({ type: 'produce', data: { roomId: info.roomId, transportId: id, kind, rtpParameters } });
            }
          });

          // After send transport is ready, create the Recv transport
          send({ type: 'create-transport', data: { roomId: info.roomId, producing: false, consuming: true } });

          // Start publishing local media
          if (localStreamRef.current) {
            const vTrack = localStreamRef.current.getVideoTracks()[0];
            const aTrack = localStreamRef.current.getAudioTracks()[0];
            const publish = async () => {
              if (vTrack) {
                console.log('[WebRTC] Publishing video track (simulcast when supported)...');
                pendingVideoProduceSourceRef.current = 'camera';
                try {
                  const videoProducer = await transport.produce({
                    track: vTrack,
                    encodings: getVideoEncodings(),
                    codecOptions: { videoGoogleStartBitrate: 600 }
                  });
                  producersRef.current.video = videoProducer;
                } catch (e) {
                  console.warn('[WebRTC] Simulcast produce failed, using single layer', e);
                  const videoProducer = await transport.produce({
                    track: vTrack,
                    encodings: [{ maxBitrate: isMobileRuntime() ? 1_200_000 : 2_500_000 }]
                  }).catch(console.error);
                  if (videoProducer) producersRef.current.video = videoProducer;
                }
              }
              if (aTrack) {
                console.log('[WebRTC] Publishing audio track...');
                const audioProducer = await transport.produce({ track: aTrack }).catch(console.error);
                if (audioProducer) producersRef.current.audio = audioProducer;
              }
            };
            publish().catch(console.error);
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
          
          console.log('[WebRTC] Receive transport ready — requesting existing producers + draining queue...');
          
          // Drain any producers that arrived before recv transport was ready
          const queued = pendingProducersRef.current.splice(0);
          if (queued.length > 0) {
            console.log(`[WebRTC] Draining ${queued.length} queued producer(s)...`);
            queued.forEach(({ producerId, remoteUserId, kind, source }) =>
              consume(producerId, remoteUserId, { kind, source })
            );
          }

          // Also ask backend for anyone we may still have missed
          send({ type: 'get-producers', data: { roomId: info.roomId } });
          scheduleGetProducersRetries(info.roomId);
        }
        break;
      }

      case 'produced': {
        console.log('[WebRTC] Producer created:', data.kind, data.id);
        // Remember the local producer ids so we can skip "self" in new-producer safely.
        if (data?.id != null) myProducerIdsRef.current.add(String(data.id));
        if (data.kind === 'video') {
          const q = producersRef.current.videoCbQueue || [];
          const fn = q.shift();
          fn?.({ id: data.id });
        } else if (data.kind === 'audio') {
          producersRef.current.resolve_audio?.({ id: data.id });
        }
        if (data.kind === 'video') {
          pendingVideoProduceSourceRef.current = 'camera';
        }
        break;
      }

      case 'new-producer': {
        realtimeDebug('[WebRTC] New producer available:', data.producerId, 'from user:', data.userId);
        const isSameUser = sameParticipantId(data.userId, userIdRef.current);
        const isMyProducer = myProducerIdsRef.current.has(String(data.producerId));
        if (isSameUser && isMyProducer) {
          realtimeDebug('[WebRTC] Ignoring new-producer (own track)');
          return;
        }
        scheduleCallRoleRefresh();
        if (!recvTransportRef.current) {
          // Recv transport not ready yet — queue for drain when it becomes ready
          realtimeDebug('[WebRTC] Recv transport not ready, queuing producer:', data.producerId);
          pendingProducersRef.current.push({
            producerId: data.producerId,
            remoteUserId: data.userId,
            kind: data.kind,
            source: data.source
          });
          return;
        }
        consume(data.producerId, data.userId, { kind: data.kind, source: data.source });
        break;
      }

      case 'consumed': {
        realtimeDebug('[WebRTC] Consumer created:', data.kind, 'from user:', data.userId);
        const { id, producerId, kind, rtpParameters, userId: remoteId, source: remoteSource } = data;
        const producerKey = String(producerId || '');
        if (producerKey) {
          consumingProducerIdsRef.current.delete(producerKey);
          consumedProducerIdsRef.current.add(producerKey);
        }
        if (remoteId == null || remoteId === '') {
          console.warn('[WebRTC] consumed missing remote userId; using producerId for grouping', { producerId, kind });
        }
        const consumer = await recvTransportRef.current.consume({ id, producerId, kind, rtpParameters });
        consumersRef.current[id] = consumer;
        consumer.on?.('transportclose', () => {
          delete consumersRef.current[id];
        });
        consumer.track.onended = () => {
          delete consumersRef.current[id];
          consumedProducerIdsRef.current.delete(String(producerId || ''));
        };
        const uiRemoteId = remoteId != null && remoteId !== '' ? remoteId : `producer:${producerId}`;
        const uidKey = String(uiRemoteId);
        const vSource = kind === 'video' ? remoteSource || 'camera' : 'audio';
        producerIdToMetaRef.current.set(String(producerId), { uiRemoteId: uidKey, source: vSource });
        if (!consumerIdsByUserRef.current[uidKey]) consumerIdsByUserRef.current[uidKey] = [];
        consumerIdsByUserRef.current[uidKey].push(id);

        setRemoteStreams((prev) => {
          const existing = prev.find((s) => sameParticipantId(s.userId, uiRemoteId));
          let next;

          if (kind === 'video' && vSource === 'screen') {
            if (existing) {
              const oldScreen = existing.screenStream;
              oldScreen?.getTracks().forEach((t) => t.stop());
              next = prev.map((s) =>
                sameParticipantId(s.userId, uiRemoteId)
                  ? { ...s, screenStream: new MediaStream([consumer.track]) }
                  : s
              );
            } else {
              next = [
                ...prev,
                {
                  userId: uiRemoteId,
                  stream: new MediaStream(),
                  screenStream: new MediaStream([consumer.track]),
                  name: '',
                  age: '',
                  displayPictureUrl: '/avatar-placeholder.png',
                  city: '',
                  profileFetched: false
                }
              ];
            }
          } else if (existing) {
            const existingTracks = existing.stream
              .getTracks()
              .filter((track) => track.readyState !== 'ended' && track.kind !== consumer.track.kind);
            const newStream = new MediaStream([...existingTracks, consumer.track]);
            next = prev.map((s) => (sameParticipantId(s.userId, uiRemoteId) ? { ...s, stream: newStream } : s));
          } else {
            next = [
              ...prev,
              {
                userId: uiRemoteId,
                stream: new MediaStream([consumer.track]),
                name: '',
                age: '',
                displayPictureUrl: '/avatar-placeholder.png',
                city: '',
                profileFetched: false
              }
            ];
          }
          remoteStreamsRef.current = next;
          if (next.length > 0) hadRemotePeerInSessionRef.current = true;
          return next;
        });
        await consumer.resume?.();
        realtimeDebug('[WebRTC] Remote stream updated for user:', uiRemoteId, '| kind:', kind, vSource === 'screen' ? '(screen)' : '');
        break;
      }

      case 'producer-closed': {
        const { producerId: closedPid } = data || {};
        if (!closedPid) break;
        const pid = String(closedPid);
        consumingProducerIdsRef.current.delete(pid);
        consumedProducerIdsRef.current.delete(pid);
        const retryTid = consumeRetryTimeoutsRef.current.get(pid);
        if (retryTid) clearTimeout(retryTid);
        consumeRetryTimeoutsRef.current.delete(pid);
        const meta = producerIdToMetaRef.current.get(pid);
        const trackByConsumer = (() => {
          for (const cid of Object.keys(consumersRef.current)) {
            const c = consumersRef.current[cid];
            if (c && String(c.producerId) === pid) {
              return { cid, consumer: c, track: c.track };
            }
          }
          return null;
        })();
        if (trackByConsumer) {
          try {
            trackByConsumer.consumer.close();
          } catch (_) {}
          delete consumersRef.current[trackByConsumer.cid];
        }
        if (meta) {
          producerIdToMetaRef.current.delete(pid);
          const uidKey = String(meta.uiRemoteId);
          if (trackByConsumer && consumerIdsByUserRef.current[uidKey]) {
            consumerIdsByUserRef.current[uidKey] = consumerIdsByUserRef.current[uidKey].filter(
              (x) => x !== trackByConsumer.cid
            );
          }
          const tr = trackByConsumer?.track;
          setRemoteStreams((prev) => {
            const next = prev.map((s) => {
              if (!sameParticipantId(s.userId, meta.uiRemoteId)) return s;
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
            });
            remoteStreamsRef.current = next;
            return next;
          });
        }
        break;
      }
      
      case 'participant-left': {
        console.log('[WebRTC] Participant left:', data.userId);
        removeRemoteParticipantFromUi(data.userId);
        break;
      }

      case 'participant-kicked': {
        console.log('[WebRTC] Participant kicked:', data.kickedUserId);
        if (data.pullStrangerReenabled) {
          armPullStrangerSummoningWindow();
        } else if (sameParticipantId(data.kickedBy, userIdRef.current)) {
          maybeAutoPullStrangerAfterKick(data.kickedUserId);
        }
        removeRemoteParticipantFromUi(data.kickedUserId, { skipPeerLeftAutoResume: true });
        scheduleCallRoleRefresh();
        break;
      }

      case 'user-kicked': {
        console.log('[WebRTC] You were removed from the call');
        intentionalExitRef.current = true;
        void (async () => {
          await leaveRoomAndSetStatusReliable('ONLINE');
          cleanup();
          localStorage.removeItem('currentRoom');
          router.push('/');
        })();
        break;
      }

      case 'user-kicked-success': {
        console.log('[WebRTC] Kick sent for', data.targetUserId);
        if (data.pullStrangerReenabled) {
          armPullStrangerSummoningWindow();
        } else if (data.targetUserId) {
          maybeAutoPullStrangerAfterKick(data.targetUserId);
        }
        // Older servers excluded the kicker from participant-kicked; keep UI in sync regardless.
        if (data.targetUserId) {
          removeRemoteParticipantFromUi(data.targetUserId, { skipPeerLeftAutoResume: true });
        }
        scheduleCallRoleRefresh();
        break;
      }

      case 'pull-stranger-cancelled':
      case 'disable-pull-stranger-success': {
        if (!data?.roomId || data.roomId === (roomInfoRef.current?.roomId || roomInfo?.roomId)) {
          pullStrangerStopRequestedRef.current = true;
          markPullStrangerLoopActive(false);
          if (pullStrangerAutoRetryTimerRef.current) {
            clearTimeout(pullStrangerAutoRetryTimerRef.current);
            pullStrangerAutoRetryTimerRef.current = null;
          }
          clearPullStrangerSummoningUi();
          setIsStoppingPullStranger(false);
        }
        break;
      }

      case 'friend-request-sent': {
        console.log('[Friend] Request sent successfully', data);
        const tid = data?.toUserId != null ? String(data.toUserId) : '';
        if (tid) {
          setFriendRequestSentTo((prev) => ({ ...prev, [tid]: true }));
        }
        setIcebreaker('Friend request sent!');
        setShowIcebreaker(true);
        setTimeout(() => setShowIcebreaker(false), 3000);
        break;
      }

      case 'friend-request-accepted': {
        const fid = data?.friendId != null ? String(data.friendId) : '';
        if (fid) {
          setFriendshipWithRemote((prev) => ({ ...prev, [fid]: true }));
          setFriendRequestSentTo((prev) => ({ ...prev, [fid]: true }));
        }
        break;
      }

      case 'icebreaker': {
        console.log('[Icebreaker] Received:', data.question);
        setIcebreaker(data.question);
        setShowIcebreaker(true);
        setTimeout(() => setShowIcebreaker(false), 8000);
        break;
      }

      case 'chat-message': {
        const myId = userIdRef.current;
        const pInfo = partnerInfoRef.current;
        const remotes = remoteStreamsRef.current;
        
        console.log('[Chat] Received:', data.message, { myId, remoteIds: remotes.map(s => s.userId) });

        let name = 'Unknown';
        if (data.userId === myId) {
          name = 'You';
        } else if (pInfo && data.userId === pInfo.id) {
          name = pInfo.name;
        } else {
          const remote = remotes.find(s => s.userId === data.userId);
          if (remote) {
            name = remote.name;
          } else if (remotes.length > 0) {
            name = remotes[0].name;
          }
        }

        setChatMessages(prev => {
          if (data.id && prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            id: data.id || Date.now() + Math.random(),
            userId: data.userId,
            message: data.message,
            name
          }].slice(-5);
        });
        break;
      }

      case 'broadcast-started': {
        setIsBroadcasting(true);
        break;
      }

      case 'broadcast-stopped': {
        setIsBroadcasting(false);
        break;
      }
    }
  };

  const consume = (producerId, remoteUserId, producerMeta = {}) => {
    const producerKey = String(producerId || '');
    if (!producerKey) return;
    if (consumedProducerIdsRef.current.has(producerKey) || consumingProducerIdsRef.current.has(producerKey)) {
      return;
    }

    // If receiving transport isn't ready yet, wait and retry
    if (!recvTransportRef.current) {
      if (!consumeRetryTimeoutsRef.current.has(producerKey)) {
        realtimeDebug('[WebRTC] Recv transport not ready, retrying consume in 1s...');
        const tid = setTimeout(() => {
          consumeRetryTimeoutsRef.current.delete(producerKey);
          consume(producerId, remoteUserId, producerMeta);
        }, 1000);
        consumeRetryTimeoutsRef.current.set(producerKey, tid);
      }
      return;
    }

    consumingProducerIdsRef.current.add(producerKey);
    const preferredLayers = getPreferredConsumerLayers({
      kind: producerMeta.kind,
      source: producerMeta.source,
      remoteCount: remoteStreamsRef.current.length + 1
    });
    send({
      type: 'consume',
      data: {
        roomId: roomInfoRef.current.roomId,
        transportId: recvTransportRef.current.id,
        producerId: producerKey,
        rtpCapabilities: deviceRef.current.rtpCapabilities,
        ...(preferredLayers ? { preferredLayers } : {})
      }
    });
  };

  const handleSendFriendRequest = (toUserId) => {
    const tid = String(toUserId ?? '');
    if (!roomInfo?.roomId || !isValidFriendTargetUserId(tid) || friendRequestSentTo[tid]) return;
    console.log('[Friend] Sending request to:', tid);
    send({
      type: 'send-friend-request',
      data: {
        roomId: roomInfo.roomId,
        toUserId: tid
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

  const handleIcebreaker = () => {
    if (!roomInfo?.roomId) return;
    send({ type: 'get-icebreaker', data: { roomId: roomInfo.roomId } });
  };

  const toggleRandomness = () => setShowRandomness(!showRandomness);

  const markPullStrangerLoopActive = (active) => {
    pullStrangerLoopActiveRef.current = active;
    setIsPullStrangerLoopActive(active);
  };

  const armPullStrangerSummoningWindow = () => {
    pullStrangerStopRequestedRef.current = false;
    markPullStrangerLoopActive(true);
    pullStrangerCooldownSecRef.current = PULL_STRANGER_WINDOW_SECONDS;
    setPullStrangerCooldownSec(PULL_STRANGER_WINDOW_SECONDS);
    suppressAutoResumeUntilRef.current = Date.now() + (PULL_STRANGER_WINDOW_SECONDS * 1000);
    roomHealthFailureCountRef.current = 0;
    setRoomHealthDebug({
      graceActive: true,
      graceRemainingSec: PULL_STRANGER_WINDOW_SECONDS,
      failureCount: 0
    });
  };

  const clearPullStrangerSummoningUi = () => {
    setPullStrangerCooldownSec(0);
    pullStrangerCooldownSecRef.current = 0;
    suppressAutoResumeUntilRef.current = 0;
    roomHealthFailureCountRef.current = 0;
    setRoomHealthDebug((d) =>
      d.graceActive || d.graceRemainingSec !== 0
        ? { graceActive: false, graceRemainingSec: 0, failureCount: 0 }
        : { ...d, failureCount: 0 }
    );
  };

  const enablePullStranger = async ({ auto = false } = {}) => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const uid = userIdRef.current;
    const participantCount = (remoteStreamsRef.current?.length || 0) + 1;
    if (
      !rid ||
      !uid ||
      participantCount >= 4 ||
      isEnablingPullStrangerRef.current ||
      (!auto && pullStrangerCooldownSecRef.current > 0) ||
      (auto && pullStrangerStopRequestedRef.current)
    ) {
      if (participantCount >= 4) {
        markPullStrangerLoopActive(false);
      }
      return false;
    }

    try {
      isEnablingPullStrangerRef.current = true;
      setIsEnablingPullStranger(true);
      armPullStrangerSummoningWindow();
      await apiRequest(API.STREAMING.ENABLE_PULL_STRANGER(rid), {
        method: 'POST',
        body: JSON.stringify({ userId: uid })
      });
      await enablePullStrangerDiscovery();
      setShowRandomness(false);
      // Backend handles notifying others via WS or status change
      return true;
    } catch (err) {
      console.error('Failed to enable pull stranger:', err);
      const message = String(err?.message || '').toLowerCase();
      if (message.includes('already enabled')) {
        armPullStrangerSummoningWindow();
        setShowRandomness(false);
        return true;
      }
      markPullStrangerLoopActive(false);
      pullStrangerStopRequestedRef.current = true;
      clearPullStrangerSummoningUi();
      return false;
    } finally {
      isEnablingPullStrangerRef.current = false;
      setIsEnablingPullStranger(false);
    }
  };

  const handlePullStranger = () => enablePullStranger();

  const handleStopPullStranger = async () => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const uid = userIdRef.current;
    if (isStoppingPullStranger || !uid) return;

    pullStrangerStopRequestedRef.current = true;
    markPullStrangerLoopActive(false);
    if (pullStrangerAutoRetryTimerRef.current) {
      clearTimeout(pullStrangerAutoRetryTimerRef.current);
      pullStrangerAutoRetryTimerRef.current = null;
    }
    clearPullStrangerSummoningUi();
    setIsStoppingPullStranger(true);

    try {
      if (rid && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'disable-pull-stranger',
          data: { roomId: rid }
        }));
      } else if (rid) {
        await apiRequest(API.STREAMING.DISABLE_PULL_STRANGER(rid), {
          method: 'POST',
          body: JSON.stringify({ userId: uid })
        });
      }
    } catch (err) {
      console.error('Failed to disable pull stranger:', err);
    }

    try {
      await disablePullStrangerDiscovery(isBroadcastingRef.current);
    } catch (err) {
      console.error('Failed to restore in-call presence after stopping pull stranger:', err);
    } finally {
      setIsStoppingPullStranger(false);
      setShowRandomness(false);
    }
  };

  const handleBeamcast = async () => {
    if (!roomInfo?.roomId || !userIdRef.current) return;
    send({ type: 'start-broadcast', data: { roomId: roomInfo.roomId } });
    try {
      await enableBeamcastDiscovery();
    } catch (_) {}
    setIsBroadcasting(true);
    setShowRandomness(false);
  };

  const handleStopBeamcast = async () => {
    if (!roomInfo?.roomId || !userIdRef.current) return;
    send({ type: 'stop-broadcast', data: { roomId: roomInfo.roomId } });
    try {
      await disableBeamcastDiscovery();
    } catch (_) {}
    setIsBroadcasting(false);
    setShowRandomness(false);
  };

  const refreshWaitlist = useCallback(async () => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    if (!rid) return;
    setWaitlistLoading(true);
    setWaitlistError('');
    try {
      const res = await apiRequest(API.STREAMING.GET_WAITLIST(rid));
      const baseList = Array.isArray(res?.waitlist) ? res.waitlist : [];

      // Enrich waitlist with full user profiles so the UI matches discovery FaceCard exactly.
      // Cache profiles per userId to avoid refetch on every 3s poll.
      const enrichOne = async (entry) => {
        const userId = String(entry?.userId || '');
        if (!userId) return { ...entry, profile: null };
        if (waitlistProfileCacheRef.current.has(userId)) {
          return { ...entry, profile: waitlistProfileCacheRef.current.get(userId) };
        }
        try {
          const prof = await apiRequest(API.USERS.GET_USER(userId));
          const user = prof?.user || prof?.data?.user || null;
          if (user) waitlistProfileCacheRef.current.set(userId, user);
          return { ...entry, profile: user };
        } catch (_) {
          return { ...entry, profile: null };
        }
      };

      const enriched = await Promise.all(baseList.map(enrichOne));
      setWaitlist(enriched);
    } catch (e) {
      setWaitlistError(e?.message || 'Failed to load waitlist.');
    } finally {
      setWaitlistLoading(false);
    }
  }, [roomInfo]);

  const refreshBroadcastHud = useCallback(async () => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    if (!rid) return;
    try {
      const room = await apiRequest(API.STREAMING.GET_ROOM(rid));
      const viewerCount = Number(room?.viewerCount || 0);
      setBroadcastHud((prev) => ({ ...prev, viewerCount }));
    } catch (_) {}
    try {
      const w = await apiRequest(API.STREAMING.GET_WAITLIST(rid));
      const waitlistCount = Array.isArray(w?.waitlist) ? w.waitlist.length : 0;
      setBroadcastHud((prev) => ({ ...prev, waitlistCount }));
    } catch (_) {}
  }, [roomInfo]);

  useEffect(() => {
    if (!isBroadcasting) return;
    refreshBroadcastHud();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshBroadcastHud();
    }, 5000);
    return () => clearInterval(id);
  }, [isBroadcasting, refreshBroadcastHud]);

  const acceptFromWaitlist = useCallback(async (targetUserId) => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    const hostUserId = userIdRef.current;
    if (!rid || !hostUserId || !targetUserId) return;
    try {
      await apiRequest(API.STREAMING.ACCEPT_FROM_WAITLIST(rid), {
        method: 'POST',
        body: JSON.stringify({ hostUserId, targetUserId: String(targetUserId) })
      });
      await refreshWaitlist();
      setIcebreaker('Added from waitlist.');
      setShowIcebreaker(true);
      setTimeout(() => setShowIcebreaker(false), 2500);
    } catch (e) {
      setWaitlistError(e?.message || 'Failed to accept user.');
    }
  }, [roomInfo, refreshWaitlist]);

  const handleShareBroadcastLink = async () => {
    const rid = roomInfoRef.current?.roomId || roomInfo?.roomId;
    if (!rid) return;
    const link = `${window.location.origin}/beam-tv?roomId=${encodeURIComponent(rid)}`;
    setBroadcastHud((prev) => ({ ...prev, shareOpen: true, shareUrl: link }));
    try {
      await navigator.clipboard.writeText(link);
      setBroadcastHud((prev) => ({ ...prev, lastShareMsg: 'Link copied.' }));
      setTimeout(() => setBroadcastHud((prev) => ({ ...prev, lastShareMsg: '' })), 2000);
    } catch (_) {
      setBroadcastHud((prev) => ({ ...prev, lastShareMsg: 'Could not copy link.' }));
      setTimeout(() => setBroadcastHud((prev) => ({ ...prev, lastShareMsg: '' })), 2000);
    }
  };

  const copyShareUrl = async () => {
    const url = broadcastHud.shareUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setBroadcastHud((prev) => ({ ...prev, lastShareMsg: 'Link copied.' }));
      setTimeout(() => setBroadcastHud((prev) => ({ ...prev, lastShareMsg: '' })), 2000);
    } catch (_) {
      setBroadcastHud((prev) => ({ ...prev, lastShareMsg: 'Could not copy link.' }));
      setTimeout(() => setBroadcastHud((prev) => ({ ...prev, lastShareMsg: '' })), 2000);
    }
  };

  useEffect(() => {
    if (!showWaitlist) return;
    refreshWaitlist();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshWaitlist();
    }, 5000);
    return () => clearInterval(id);
  }, [showWaitlist, refreshWaitlist]);

  const sendChatMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !roomInfo?.roomId) return;
    send({
      type: 'chat-message',
      data: {
        roomId: roomInfo.roomId,
        message: chatInput.trim()
      }
    });
    setChatInput('');
    // setShowChatInput(false);
  };

  const handleChatButtonClick = () => {
    if (isBroadcasting) {
      setBroadcastChatWarning('Warning: this call is live on Beam TV. Chat is visible to viewers.');
      setTimeout(() => setBroadcastChatWarning(''), 2800);
    }
    setShowChatInput((v) => !v);
  };

  const handleLeave = async () => {
    intentionalExitRef.current = true;
    flowLog('handleLeave_clicked', { roomId: roomInfo?.roomId || null });
    // Signal server we're leaving (WebSocket)
    if (wsRef.current?.readyState === WebSocket.OPEN && roomInfo?.roomId) {
      wsRef.current.send(JSON.stringify({ type: 'leave-room', data: { roomId: roomInfo.roomId } }));
    }
    // End room via REST and return homepage status to ONLINE.
    await leaveRoomAndSetStatusReliable('ONLINE');
    cleanup();
    localStorage.removeItem('currentRoom');
    router.push('/');
  };

  // --- Render Helpers ---
  const isRoomFull = (remoteStreams.length + 1) >= 4;
  const isPullStrangerDisabled = isRoomFull || isEnablingPullStranger || pullStrangerCooldownSec > 0;
  const isPullStrangerSummoning = pullStrangerCooldownSec > 0 && !isRoomFull;
  const pullStrangerSummoningLabel = remoteStreams.length >= 2
    ? 'Replacement loop on'
    : pullStrangerCooldownSec > 0
      ? `Summoning... ${pullStrangerCooldownSec}s`
      : 'Summoning...';
  const localVideoProps = {
    localVideoRef,
    localStreamRef,
    isCamOff,
    isScreenSharing,
    onToggleScreenShare: status === 'connected' ? toggleScreenShare : undefined,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
    showChatInput,
    setShowChatInput,
    onChatButtonClick: handleChatButtonClick,
    toggleCam,
    isGiftModalOpen,
    setIsGiftModalOpen,
    setIsCoinModalOpen
  };
  const getRemoteFriendTileProps = (streamInfo) => {
    const uid = String(streamInfo.userId ?? '');
    const valid = isValidFriendTargetUserId(uid);
    return {
      onSendFriendRequest: () => handleSendFriendRequest(uid),
      showAddFriend: valid,
      isAlreadyFriend: Boolean(friendshipWithRemote[uid]),
      isFriendRequestSent: Boolean(friendRequestSentTo[uid])
    };
  };

  const canKickRemoteUser = (remoteUserId) =>
    callRoles.isLocalHost && callRoles.byUserId[String(remoteUserId)] === 'PARTICIPANT';

  /** Report/emoji on one “primary” remote: 1:1 = that peer; group = matched partner if in call, else first remote only. */
  const shouldShowReportEmojiOnRemoteTile = (streamInfo) => {
    const list = remoteStreams;
    if (list.length <= 1) return true;
    const pid = String(partnerInfo.id || '');
    const partnerInCall = pid && list.some((s) => String(s.userId) === pid);
    if (partnerInCall) return String(streamInfo.userId) === pid;
    return list[0] && String(list[0].userId) === String(streamInfo.userId);
  };

  /** Matched partner may use partnerInfo as fallback; every other remote uses only that user’s fetched profile. */
  const getRemoteTileProfile = (s) => {
    const pid = partnerInfo.id != null && partnerInfo.id !== '' ? String(partnerInfo.id) : '';
    const isPartner = pid !== '' && sameParticipantId(s.userId, pid);
    if (isPartner) {
      return {
        name: s.name || partnerInfo.name || 'Matched!',
        age: s.age || partnerInfo.age || '',
        city: s.city || partnerInfo.city || '',
        displayPictureUrl: s.displayPictureUrl || partnerInfo.displayPictureUrl || '/avatar-placeholder.png'
      };
    }
    return {
      name: s.name || 'Guest',
      age: s.age || '',
      city: s.city || '',
      displayPictureUrl: s.displayPictureUrl || '/avatar-placeholder.png'
    };
  };

  const renderPullStrangerPlaceholder = (className = 'flex-1 min-h-0 min-w-0') => (
    <div className={clsx(className, 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/10', 'shadow-2xl')}>
      <div
        className="absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: 'url(/assets/mb.jpg)',
          backgroundRepeat: 'repeat',
          backgroundSize: 'cover'
        }}
      />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
        <div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
        <div className="space-y-2">
          <p className="text-lg font-black tracking-tight">Summoning...</p>
          <p className="text-xs font-semibold text-white/60">Waiting for someone to join</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleStopPullStranger}
        disabled={isStoppingPullStranger}
        className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 text-2xl leading-none text-white shadow-xl backdrop-blur-md transition hover:bg-white/15 disabled:opacity-50"
        aria-label="Stop pulling in strangers"
        title="Stop pulling in strangers"
      >
        ×
      </button>
    </div>
  );

  return (
    <div className={clsx(' h-dvh', 'w-screen', 'bg-purple-900', 'flex', 'overflow-hidden', 'font-sans')}>

             <div
                        className="absolute inset-0 z-0 "
                        style={{
                            backgroundImage: 'url(/assets/mb.jpg)',
                            backgroundRepeat: 'repeat',
                            backgroundSize: 'cover',
                        }}
                    />
      <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'flex', 'flex-col', 'md:flex-row', 'p-2', 'md:gap-2', 'relative')}>
        {/* Layout Engine */}
        {remoteStreams.length === 0 ? (
          /* Landing/Loading state: Full peer section placeholder and local */
          isBroadcasting ? (
            <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
              <LocalVideoSection {...localVideoProps} />
            </div>
          ) : (
            <>
              {isPullStrangerSummoning ? renderPullStrangerPlaceholder() : (
              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden')}>
                           <div
                        className="absolute inset-0 z-0 "
                        style={{
                            backgroundImage: 'url(/assets/mb.jpg)',
                            backgroundRepeat: 'repeat',
                            backgroundSize: 'cover',
                        }}
                    />
                <div className={clsx('absolute', 'inset-0', 'flex', 'flex-col', 'items-center', 'justify-center',  'p-6', 'text-white')}>
                  {loadingMeme?.imageUrl ? (
                    <img
                      src={loadingMeme.imageUrl}
                      alt={loadingMeme.text || 'Loading meme'}
                      className={clsx('h-[200px]', 'max-h-[42%]', 'w-48', 'max-w-xl', 'rounded-[1.5rem]', 'object-contain')}
                    />
                  ) : (
                    <div className={clsx('flex', 'h-full', 'max-h-[72%]', 'w-full', 'max-w-2xl', 'items-center', 'justify-center', 'rounded-[1.5rem]',  'p-8', 'text-center', 'shadow-2xl')}>
                      <p className={clsx('text-2xl', 'font-black', 'leading-tight', 'tracking-tight', 'text-white')}>{loadingMeme?.text || 'Finding someone who matches your energy...'}</p>
                    </div>
                  )}
                 
                </div>
              </div>
              )}
              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
                {!showChatInput && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] items-center gap-3 hidden">
                    <button
                      type="button"
                      onClick={() => setIsCoinModalOpen(true)}
                      className={clsx(
                        'flex items-center gap-2',
                        'rounded-full',
                        'border border-white/15',
                        'bg-black/50',
                        'backdrop-blur-md',
                        'px-4 py-2',
                        'text-white',
                        'hover:bg-white/10',
                        'active:scale-95',
                        'transition'
                      )}
                      title="Add coins"
                    >
                      <img src="/assets/Coin-token.svg" className="w-5 h-5" alt="" />
                      <span className="text-sm font-semibold">{coins.toLocaleString()}</span>
                      <span className="text-lg leading-none -mt-[1px]">+</span>
                    </button>
                  </div>
                )}
                <LocalVideoSection {...localVideoProps} />
              </div>
            </>
          )
        ) : remoteStreams.length === 1 ? (
          /* 1:1 Matched Layout: Peer 1 | Local */
          <>
            <RemoteVideoTile
              key={`remote-${remoteStreams[0].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              stream={remoteStreams[0].stream}
              screenShareStream={remoteStreams[0].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
              showLeaveNextButton={status === 'connected'}
              onLeaveOrNext={handleLeaveGroupOrRaincheck}
              isRainchecking={isRainchecking}
            />
            {isPullStrangerSummoning ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                {renderPullStrangerPlaceholder()}
                <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-b-[1.5rem]', 'overflow-hidden', 'bg-gray-950')}>
                  <LocalVideoSection {...localVideoProps} />
                </div>
              </div>
            ) : (
             <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-b-[1.5rem]', 'overflow-hidden', 'bg-gray-950')}>
               {!showChatInput && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] items-center gap-3 hidden">
                   <button
                     type="button"
                     onClick={() => setIsCoinModalOpen(true)}
                     className={clsx(
                       'flex items-center gap-2',
                       'rounded-full',
                       'border border-white/15',
                       'bg-black/50',
                       'backdrop-blur-md',
                       'px-4 py-2',
                       'text-white',
                       'hover:bg-white/10',
                       'active:scale-95',
                       'transition',
                 
                     )}
                     title="Add coins"
                   >
                     <img src="/assets/Coin-token.svg" className="w-5 h-5" alt="" />
                     <span className="text-sm font-semibold">{coins.toLocaleString()}</span>
                     <span className="text-lg leading-none -mt-[1px]">+</span>
                   </button>

                   <div className="bg-black/50 rounded-full px-4 py-2 flex items-center gap-3 border border-white/10 backdrop-blur-md ">
                     <button
                       type="button"
                       onClick={() => setOverlay({ open: true, url: '/inbox', title: 'Messages' })}
                       className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                       title="Messages"
                     >
                       <img src="/assets/chat-with-indicator.svg" className="w-6 h-6" alt="" />
                     </button>
                     <button
                       type="button"
                       onClick={() => setOverlay({ open: true, url: '/history', title: 'History' })}
                       className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                       title="History"
                     >
                       <img src="/assets/history.svg" className="w-6 h-6" alt="" />
                     </button>
                     <button
                       type="button"
                       onClick={() => setOverlay({ open: true, url: '/facecard?view=editor', title: 'Profile' })}
                       className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition overflow-hidden border border-white/10"
                       title="Profile"
                     >
                       <img src="/assets/ico.png" className="w-full h-full object-cover" alt="" />
                     </button>
                   </div>
                 </div>
               )}
               <LocalVideoSection {...localVideoProps} />
            </div>
            )}
          </>
        ) : remoteStreams.length === 2 ? (
          /* Multi-User Layout (3 participants): Peer 1 (LEFT) | Peer 2 + Local (RIGHT) */
          <>
            <RemoteVideoTile
              key={`remote-${remoteStreams[0].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              stream={remoteStreams[0].stream}
              screenShareStream={remoteStreams[0].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
              showLeaveNextButton={status === 'connected'}
              onLeaveOrNext={handleLeaveGroupOrRaincheck}
              isRainchecking={isRainchecking}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <RemoteVideoTile
                key={`remote-${remoteStreams[1].userId}`}
                {...getRemoteFriendTileProps(remoteStreams[1])}
                stream={remoteStreams[1].stream}
                screenShareStream={remoteStreams[1].screenStream || null}
                {...getRemoteTileProfile(remoteStreams[1])}
                showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[1])}
                showKickParticipant={canKickRemoteUser(remoteStreams[1].userId)}
                onKickParticipant={() => handleKickRemote(remoteStreams[1].userId)}
              />
              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
                {!showChatInput && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] items-center gap-3 hidden">
                    <button
                      type="button"
                      onClick={() => setIsCoinModalOpen(true)}
                      className={clsx(
                        'flex items-center gap-2',
                        'rounded-full',
                        'border border-white/15',
                        'bg-black/50',
                        'backdrop-blur-md',
                        'px-4 py-2',
                        'text-white',
                        'hover:bg-white/10',
                        'active:scale-95',
                        'transition'
                      )}
                      title="Add coins"
                    >
                      <img src="/assets/Coin-token.svg" className="w-5 h-5" alt="" />
                      <span className="text-sm font-semibold">{coins.toLocaleString()}</span>
                      <span className="text-lg leading-none -mt-[1px]">+</span>
                    </button>

                    <div className="bg-black/50 rounded-full px-4 py-2 flex items-center gap-3 border border-white/10 backdrop-blur-md">
                      <button
                        type="button"
                        onClick={() => setOverlay({ open: true, url: '/inbox', title: 'Messages' })}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                        title="Messages"
                      >
                        <img src="/assets/chat-with-indicator.svg" className="w-6 h-6" alt="" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverlay({ open: true, url: '/history', title: 'History' })}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                        title="History"
                      >
                        <img src="/assets/history.svg" className="w-6 h-6" alt="" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverlay({ open: true, url: '/facecard?view=editor', title: 'Profile' })}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition overflow-hidden border border-white/10"
                        title="Profile"
                      >
                        <img src="/assets/ico.png" className="w-full h-full object-cover" alt="" />
                      </button>
                    </div>
                  </div>
                )}
                <LocalVideoSection {...localVideoProps} />
              </div>
            </div>
          </>
        ) : (
          /* Grid Layout (4 participants): 2x2 Grid */
          <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-2 gap-2">
            <RemoteVideoTile
              key={`remote-${remoteStreams[0].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              stream={remoteStreams[0].stream}
              screenShareStream={remoteStreams[0].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
              showLeaveNextButton={status === 'connected'}
              onLeaveOrNext={handleLeaveGroupOrRaincheck}
              isRainchecking={isRainchecking}
            />
            <RemoteVideoTile
              key={`remote-${remoteStreams[1].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[1])}
              stream={remoteStreams[1].stream}
              screenShareStream={remoteStreams[1].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[1])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[1])}
              showKickParticipant={canKickRemoteUser(remoteStreams[1].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[1].userId)}
            />
            <RemoteVideoTile
              key={`remote-${remoteStreams[2].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[2])}
              stream={remoteStreams[2].stream}
              screenShareStream={remoteStreams[2].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[2])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[2])}
              showKickParticipant={canKickRemoteUser(remoteStreams[2].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[2].userId)}
            />
            <div className={clsx('relative', 'min-h-0', 'min-w-0', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
              {/* Tile-attached nav + coins */}
              {!showChatInput && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] items-center gap-3 hidden">
                  <button
                    type="button"
                    onClick={() => setIsCoinModalOpen(true)}
                    className={clsx(
                      'flex items-center gap-2',
                      'rounded-full',
                      'border border-white/15',
                      'bg-black/50',
                      'backdrop-blur-md',
                      'px-4 py-2',
                      'text-white',
                      'hover:bg-white/10',
                      'active:scale-95',
                      'transition'
                    )}
                    title="Add coins"
                  >
                    <img src="/assets/Coin-token.svg" className="w-5 h-5" alt="" />
                    <span className="text-sm font-semibold">{coins.toLocaleString()}</span>
                    <span className="text-lg leading-none -mt-[1px]">+</span>
                  </button>

                  <div className="bg-black/50 rounded-full px-4 py-2 flex items-center gap-3 border border-white/10 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setOverlay({ open: true, url: '/inbox', title: 'Messages' })}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                      title="Messages"
                    >
                      <img src="/assets/chat-with-indicator.svg" className="w-6 h-6" alt="" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverlay({ open: true, url: '/history', title: 'History' })}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition"
                      title="History"
                    >
                      <img src="/assets/history.svg" className="w-6 h-6" alt="" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverlay({ open: true, url: '/facecard?view=editor', title: 'Profile' })}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition overflow-hidden border border-white/10"
                      title="Profile"
                    >
                      <img src="/assets/ico.png" className="w-full h-full object-cover" alt="" />
                    </button>
                  </div>
                </div>
              )}
              <LocalVideoSection {...localVideoProps} />
            </div>
          </div>
        )}
 
        {isPullStrangerSummoning && (
          <div className="absolute left-1/2 top-28 z-[75] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-white/25 bg-black/55 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
              <button
                type="button"
                onClick={handleStopPullStranger}
                disabled={isStoppingPullStranger}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-lg leading-none transition hover:bg-white/20 disabled:opacity-50"
                aria-label="Stop pulling in strangers"
                title="Stop pulling in strangers"
              >
                ×
              </button>
              <span className="min-w-[82px] text-center text-[10px] font-semibold">
                {isStoppingPullStranger ? 'Stopping...' : pullStrangerSummoningLabel}
              </span>
            </div>
          </div>
        )}

        <QuickActions 
          showChatInput={showChatInput}
          callRoles={callRoles}
          toggleRandomness={toggleRandomness}
          handleIcebreaker={handleIcebreaker}
         
        />

        {/* In-call nav moved onto local tile */}

        <CoinModal isOpen={isCoinModalOpen} onClose={() => setIsCoinModalOpen(false)} />

        <OverlayLayer
          open={overlay.open}
          url={overlay.url}
          title={overlay.title}
          onClose={() => setOverlay({ open: false, url: '', title: '' })}
        />

        {/* Broadcast HUD (left-side asset) */}
        <BroadcastHud
          isBroadcasting={isBroadcasting}
          broadcastHud={broadcastHud}
          setShowWaitlist={setShowWaitlist}
          handleShareBroadcastLink={handleShareBroadcastLink}
          setBroadcastHud={setBroadcastHud}
          copyShareUrl={copyShareUrl}
        />

        {/* Icebreaker Toast Overlay */}
        <IcebreakerToast
          isOpen={showIcebreaker}
          icebreaker={icebreaker}
        />

        {broadcastChatWarning && (
          <div className="absolute top-40 left-1/2 -translate-x-1/2 z-[61] animate-in fade-in slide-in-from-top-2">
            <div className="bg-amber-500/20 backdrop-blur-xl px-6 py-3 rounded-2xl border border-amber-300/35 shadow-2xl max-w-xl text-center">
              <p className="text-amber-100 text-sm font-black">{broadcastChatWarning}</p>
            </div>
          </div>
        )}

        {/* Randomness Menu Overlay */}
        <RandomnessModal
          isOpen={showRandomness}
          onClose={() => setShowRandomness(false)}
          isLocalHost={callRoles.isLocalHost}
          handlePullStranger={handlePullStranger}
          isPullStrangerDisabled={isPullStrangerDisabled}
          isRoomFull={isRoomFull}
          isEnablingPullStranger={isEnablingPullStranger}
          pullStrangerCooldownSec={pullStrangerCooldownSec}
          isPullStrangerLoopActive={isPullStrangerLoopActive}
          isStoppingPullStranger={isStoppingPullStranger}
          handleStopPullStranger={handleStopPullStranger}
          isBroadcasting={isBroadcasting}
          handleBeamcast={handleBeamcast}
          handleStopBeamcast={handleStopBeamcast}
          setShowWaitlist={setShowWaitlist}
        />

        <WaitlistModal
          isOpen={showWaitlist}
          onClose={() => setShowWaitlist(false)}
          waitlist={waitlist}
          waitlistLoading={waitlistLoading}
          waitlistError={waitlistError}
          refreshWaitlist={refreshWaitlist}
          acceptFromWaitlist={acceptFromWaitlist}
          selectedWaitlistUser={selectedWaitlistUser}
          setSelectedWaitlistUser={setSelectedWaitlistUser}
        />

      </div>
    </div>
  );
}


const styles = {};
