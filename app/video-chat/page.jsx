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
import MobileMultiUserControls from '@/components/VideoChat/MobileMultiUserControls';
import GiftOverlay from '@/components/VideoChat/GiftOverlay';
import DareOverlay from '@/components/VideoChat/DareOverlay';
import DareProposalOverlay from '@/components/VideoChat/DareProposalOverlay';
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
  const [isCamOff, setIsCamOff] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isCamOff') === 'true';
    }
    return false;
  });
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
  /** Server roles: matched call hosts (first 2) vs pull-stranger / late join guests (PARTICIPANT). */
  const [callRoles, setCallRoles] = useState({ isLocalHost: false, byUserId: {} });
  const [roomHealthDebug, setRoomHealthDebug] = useState({
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
  const [isDareOpen, setIsDareOpen] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState(null);
  const [activeRemoteGift, setActiveRemoteGift] = useState(null);
  const [activeLocalGift, setActiveLocalGift] = useState(null);
  const [activeDareProposal, setActiveDareProposal] = useState(null);
  const [dareAcceptanceStatus, setDareAcceptanceStatus] = useState("idle");
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [selectedWaitlistUser, setSelectedWaitlistUser] = useState(null);
  const [broadcastChatWarning, setBroadcastChatWarning] = useState('');
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [loadingMeme, setLoadingMeme] = useState(null);
  const [cityOptions, setCityOptions] = useState([]);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);

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
  const processedGiftIdsRef = useRef(new Set());
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
  const leaveCleanupStartedRef = useRef(false);
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
    if (typeof document === 'undefined') return undefined;
    const applyVisibilityPolicy = () => {
      const videoProducer = producersRef.current.video;
      const videoTrack = localStreamRef.current?.getVideoTracks?.()[0];
      if (document.hidden) {
        return;
      }

      if (!isCamOffRef.current) {
        if (videoTrack) videoTrack.enabled = true;
        try { videoProducer?.resume?.(); } catch (_) { }
        Object.values(consumersRef.current || {}).forEach((consumer) => {
          if (consumer?.kind !== 'video') return;
          try { consumer.resume?.(); } catch (_) { }
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
      } catch (e) { }
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
    pendingVideoProduceSourceRef.current = 'camera';
    producerIdToMetaRef.current.clear();
    localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localScreenStreamRef.current = null;
    try {
      localScreenMsProducerRef.current?.close?.();
    } catch (_) { }
    localScreenMsProducerRef.current = null;
    setIsScreenSharing(false);
    Object.values(consumersRef.current || {}).forEach((consumer) => {
      try {
        consumer?.track?.stop?.();
        consumer?.close?.();
      } catch (_) { }
    });
    Object.values(producersRef.current || {}).forEach((producer) => {
      if (producer && typeof producer.close === 'function') {
        try {
          producer.close();
        } catch (_) { }
      }
    });
    try {
      sendTransportRef.current?.close?.();
    } catch (_) { }
    try {
      recvTransportRef.current?.close?.();
    } catch (_) { }
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
        } catch { }
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
        } catch (_) { }

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
      } catch (_) { }
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
    const handleBeforeUnload = () => leaveRoomAndSetOnline();
    window.addEventListener('beforeunload', handleBeforeUnload);

    // React Strict Mode in dev mounts -> unmounts -> remounts once.
    // Arm unmount cleanup after the effect stabilizes so the synthetic unmount
    // does not call leaveRoom and tear down a just-created room.
    cleanupArmTimerRef.current = setTimeout(() => {
      allowUnmountCleanupRef.current = true;
    }, 0);

    init();
    return () => {
      aborted = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (cleanupArmTimerRef.current) {
        clearTimeout(cleanupArmTimerRef.current);
        cleanupArmTimerRef.current = null;
      }
      // Case 2 & 3: go back / signout (component unmount)
      if (allowUnmountCleanupRef.current && !intentionalExitRef.current) {
        void beginLeaveCallToHomeReliable();
      }
      cleanup();
    };

  // Browser back from video call → home: leave room and reset presence reliably.
  useEffect(() => {
    const onPopState = () => {
      void beginLeaveCallToHomeReliable();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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
      } catch (_) { }
    };
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, []);

  const isPullStrangerCooldownActive = pullStrangerCooldownSec > 0;

  useEffect(() => {
    if (!isPullStrangerCooldownActive) return;
    const id = setInterval(() => {
      setPullStrangerCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [isPullStrangerCooldownActive]);

  useEffect(() => {
    let cancelled = false;
    let cycleInterval = null;

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

        const activeMemes = Array.isArray(response?.memes)
          ? response.memes.filter((meme) => meme && (meme.imageUrl || meme.text))
          : [];

        if (activeMemes.length > 0) {
          const orderedMemes = activeMemes
            .filter((meme) => Number.isFinite(Number(meme.order)))
            .sort((a, b) => Number(a.order) - Number(b.order));

          const memesToCycle = orderedMemes.length > 0 ? orderedMemes : activeMemes;

          let currentIndex = 0;
          if (orderedMemes.length > 0) {
            const key = 'beam_loading_meme_order_index';
            const previousIndex = Number.parseInt(localStorage.getItem(key) || '0', 10);
            currentIndex = Number.isFinite(previousIndex) ? previousIndex % memesToCycle.length : 0;
            localStorage.setItem(key, String((currentIndex + 1) % memesToCycle.length));
          } else {
            currentIndex = Math.floor(Math.random() * memesToCycle.length);
          }

          setLoadingMeme(normalizeMeme(memesToCycle[currentIndex]));

          if (memesToCycle.length > 1) {
            cycleInterval = setInterval(() => {
              currentIndex = (currentIndex + 1) % memesToCycle.length;
              setLoadingMeme(normalizeMeme(memesToCycle[currentIndex]));
            }, 2000);
          }
          return;
        }
      } catch (_) { }

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
      if (cycleInterval) clearInterval(cycleInterval);
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
      suppressAutoResumeUntilRef.current = 0;
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


  function markReturningToHomeIdle() {
    try {
      sessionStorage.setItem('hmm:leftCallToHome', '1');
    } catch (_) {}
  }

  function signalLeaveRoomWs() {
    const roomId = roomInfoRef.current?.roomId;
    if (wsRef.current?.readyState === WebSocket.OPEN && roomId) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'leave-room', data: { roomId } }));
      } catch (_) {}
    }
  }

  function beginLeaveCallToHomeReliable() {
    if (leaveCleanupStartedRef.current || intentionalExitRef.current) {
      return Promise.resolve();
    }
    leaveCleanupStartedRef.current = true;
    intentionalExitRef.current = true;
    markReturningToHomeIdle();
    signalLeaveRoomWs();
    localStorage.removeItem('currentRoom');
    return leaveRoomAndSetStatusReliable('ONLINE');
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
        } catch (_) { }
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
        }).catch(() => { });
      }

      // Homepage baseline is ONLINE; discovery pool is entered explicitly from home CTA.
      markReturningToHomeIdle();
      exitCallToHomeKeepalive();
    } catch (_) { }
  }

  async function leaveRoomAndSetStatusReliable(nextStatus = 'ONLINE') {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      let userId = userIdRef.current;
      if (!userId) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || payload.uid || payload.id;
          userIdRef.current = userId;
        } catch (_) { }
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
          }).catch(() => { });
        }
      }

      if (nextStatus === 'AVAILABLE') {
        await exitCallResumeDiscovery(
          roomInfoRef.current?.sessionId ||
            roomInfo?.sessionId ||
            Date.now().toString()
        );
      } else {
        await exitCallToHome();
      }
    } catch (_) { }
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

      await leaveRoomAndSetStatusReliable('AVAILABLE');
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
      await leaveRoomAndSetStatusReliable('AVAILABLE');
      flowLog('peer_left_auto_resume_leave_done');
    } catch (_) { }
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
    } catch (_) { }
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
        } catch (_) { }
        delete consumersRef.current[cid];
      });
    }
    delete consumerIdsByUserRef.current[leftId];
    setCallRoles((prev) => {
      const nextBy = { ...prev.byUserId };
      delete nextBy[leftId];
      return { ...prev, byUserId: nextBy };
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
    send({
      type: 'kick-user',
      data: { roomId: rid, targetUserId: String(targetUserId) }
    });
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
      await leaveRoomAndSetStatusReliable('AVAILABLE');
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
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !isCamOffRef.current;
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
          } catch (_) { }
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

  const handleStaleRoom = () => {
    if (intentionalExitRef.current) return;
    flowLog('handleStaleRoom_triggered', {
      roomId: roomInfoRef.current?.roomId || null
    });
    localStorage.removeItem('currentRoom');
    resumeDiscoveryFromCall();
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
          } catch (_) { }
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
        removeRemoteParticipantFromUi(data.kickedUserId, { skipPeerLeftAutoResume: true });
        scheduleCallRoleRefresh();
        break;
      }

      case 'user-kicked': {
        console.log('[WebRTC] You were removed from the call');
        intentionalExitRef.current = true;
        cleanup();
        localStorage.removeItem('currentRoom');
        resumeDiscoveryFromCall();
        break;
      }

      case 'user-kicked-success': {
        console.log('[WebRTC] Kick sent for', data.targetUserId);
        // Older servers excluded the kicker from participant-kicked; keep UI in sync regardless.
        if (data.targetUserId) {
          removeRemoteParticipantFromUi(data.targetUserId, { skipPeerLeftAutoResume: true });
        }
        scheduleCallRoleRefresh();
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

        // Try to parse message as JSON gift reaction or dismissal
        let isGift = false;
        let isGiftDismiss = false;
        let isDareSync = false;
        let isDareResponse = false;
        let giftData = null;
        let dismissData = null;
        let dareSyncData = null;
        let dareResponseData = null;
        try {
          if (data.message && data.message.startsWith('{')) {
            const parsed = JSON.parse(data.message);
            if (parsed && parsed.isGift) {
              isGift = true;
              giftData = parsed;
            } else if (parsed && parsed.isGiftDismissed) {
              isGiftDismiss = true;
              dismissData = parsed;
            } else if (parsed && parsed.isDareSync) {
              isDareSync = true;
              dareSyncData = parsed;
            } else if (parsed && parsed.isDareResponse) {
              isDareResponse = true;
              dareResponseData = parsed;
            }
          }
        } catch (e) { }

        if (isDareSync && dareSyncData) {
          // If we are the target of this dare sync, update our proposal UI
          if (String(dareSyncData.targetUserId) === String(myId)) {
            setActiveDareProposal({
              dareText: dareSyncData.dareText,
              giftId: dareSyncData.giftId,
              giftImg: dareSyncData.giftImg,
              giftPrice: dareSyncData.giftPrice,
              senderId: dareSyncData.senderId,
              senderName: dareSyncData.senderName
            });
          }
          break;
        }

        if (isDareResponse && dareResponseData) {
          if (String(dareResponseData.targetUserId) === String(myId)) {
            setDareAcceptanceStatus(dareResponseData.accepted ? "accepted" : "rejected");
            if (!dareResponseData.accepted) {
              // Automatically reset selection or close if rejected?
              // The plan leaves the user on stage 1
            }
          }
          break;
        }

        if (isGiftDismiss && dismissData) {
          const { messageId } = dismissData;
          setActiveRemoteGift((prev) =>
            prev && prev.gift?.messageId === messageId ? { ...prev, isDismissed: true } : prev
          );
          break; // Stop execution, don't display in regular chat history
        }

        if (isGift && giftData) {
          const messageId = data.id || data.messageId || giftData.messageId || Date.now().toString();
          if (messageId) {
            if (processedGiftIdsRef.current.has(messageId)) {
              break;
            }
            processedGiftIdsRef.current.add(messageId);
          }

          const { gift, targetUserId, senderId } = giftData;
          const giftObj = {
            ...gift,
            messageId,
            targetUserId,
            senderId
          };

          // Gift animation always shows on a REMOTE tile — never on local.
          // - If I'm the recipient (targetUserId === me): show on the sender's remote tile
          // - Otherwise: show on the recipient's remote tile
          const tileUserId = String(targetUserId) === String(myId)
            ? String(senderId)      // I received it → show on sender's tile
            : String(targetUserId); // I'm 3rd party or sender → show on recipient's tile

          setActiveRemoteGift({ gift: giftObj, targetUserId: tileUserId, isDismissed: false });
          break; // Stop execution, don't display in regular chat history
        }

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

  const handlePullStranger = async () => {
    const participantCount = remoteStreams.length + 1;
    if (
      !roomInfo?.roomId ||
      !userIdRef.current ||
      participantCount >= 4 ||
      isEnablingPullStranger ||
      pullStrangerCooldownSec > 0
    ) return;
    try {
      setIsEnablingPullStranger(true);
      await apiRequest(API.STREAMING.ENABLE_PULL_STRANGER(roomInfo.roomId), {
        method: 'POST',
        body: JSON.stringify({ userId: userIdRef.current })
      });
      setPullStrangerCooldownSec(PULL_STRANGER_WINDOW_SECONDS);
      // Give backend/user-status propagation a short grace period so
      // room-health polling does not misclassify this user as disconnected.
      suppressAutoResumeUntilRef.current = Date.now() + (PULL_STRANGER_WINDOW_SECONDS * 1000);
      roomHealthFailureCountRef.current = 0;
      setRoomHealthDebug({
        graceActive: true,
        graceRemainingSec: PULL_STRANGER_WINDOW_SECONDS,
        failureCount: 0
      });
      setShowRandomness(false);
      await enablePullStrangerDiscovery().catch(() => {});
      // Backend handles notifying others via WS or status change
    } catch (err) {
      console.error('Failed to enable pull stranger:', err);
    } finally {
      setIsEnablingPullStranger(false);
    }
  };

  const handleBeamcast = async () => {
    if (!roomInfo?.roomId || !userIdRef.current) return;
    send({ type: 'start-broadcast', data: { roomId: roomInfo.roomId } });
    // Fast-path: update user status to IN_BROADCAST_AVAILABLE so they appear in discovery/beam-tv
    try {
      await enableBeamcastDiscovery();
    } catch (_) { }
    setIsBroadcasting(true);
    setShowRandomness(false);
  };

  const handleStopBeamcast = async () => {
    if (!roomInfo?.roomId || !userIdRef.current) return;
    send({ type: 'stop-broadcast', data: { roomId: roomInfo.roomId } });
    // Fast-path: return to in-call availability once broadcast stops
    try {
      await disableBeamcastDiscovery();
    } catch (_) { }
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
    } catch (_) { }
    try {
      const w = await apiRequest(API.STREAMING.GET_WAITLIST(rid));
      const waitlistCount = Array.isArray(w?.waitlist) ? w.waitlist.length : 0;
      setBroadcastHud((prev) => ({ ...prev, waitlistCount }));
    } catch (_) { }
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
    flowLog('handleLeave_clicked', { roomId: roomInfo?.roomId || null });
    await beginLeaveCallToHomeReliable();
    cleanup();
    router.push('/');
  };

  const handleLocalGiftComplete = useCallback(() => {
    if (activeLocalGift?.messageId && roomInfoRef.current?.roomId) {
      send({
        type: 'chat-message',
        data: {
          roomId: roomInfoRef.current.roomId,
          message: JSON.stringify({
            isGiftDismissed: true,
            messageId: activeLocalGift.messageId,
            targetUserId: activeLocalGift.targetUserId
          })
        }
      });
    }
    setActiveLocalGift(null);
  }, [activeLocalGift]);

  const handleRemoteGiftComplete = useCallback(() => {
    // If we were the recipient, send dismiss sync so sender's animation also stops
    if (activeRemoteGift?.gift?.messageId && activeRemoteGift?.gift?.targetUserId === userIdRef.current && roomInfoRef.current?.roomId) {
      send({
        type: 'chat-message',
        data: {
          roomId: roomInfoRef.current.roomId,
          message: JSON.stringify({
            isGiftDismissed: true,
            messageId: activeRemoteGift.gift.messageId,
            targetUserId: activeRemoteGift.gift.targetUserId
          })
        }
      });
    }
    setActiveRemoteGift(null);
  }, [activeRemoteGift]);

  const handleDareSync = useCallback((syncData) => {
    if (!roomInfo?.roomId || !remoteStreams[0]?.userId) return;
    const targetId = remoteStreams[0].userId;
    send({
      type: 'chat-message',
      data: {
        roomId: roomInfo.roomId,
        message: JSON.stringify({
          isDareSync: true,
          dareText: syncData.dareText,
          giftId: syncData.gift?.id,
          giftImg: syncData.gift?.img,
          giftPrice: syncData.gift?.price,
          targetUserId: targetId,
          senderId: userIdRef.current,
          senderName: 'You'
        })
      }
    });
  }, [roomInfo, remoteStreams]);

  const handleDareResponse = useCallback((accepted) => {
    if (!activeDareProposal || !roomInfo?.roomId) return;
    send({
      type: 'chat-message',
      data: {
        roomId: roomInfo.roomId,
        message: JSON.stringify({
          isDareResponse: true,
          accepted,
          targetUserId: activeDareProposal.senderId,
          senderId: userIdRef.current
        })
      }
    });
    setActiveDareProposal(null); // hide popup
  }, [activeDareProposal, roomInfo]);

  const dareGiftItems = [
    { id: 1, name: "Monkey", price: 50, img: "🐒" },
    { id: 2, name: "Pika", price: 250, img: "⚡" },
    { id: 3, name: "Super", price: 2000, img: "🦸" },
    { id: 4, name: "Iron", price: 25000, img: "🤖" },
  ];

  const handleSendDare = useCallback(() => {
    const targetId = remoteStreamsRef.current[0]?.userId;
    if (!targetId || !roomInfoRef.current?.roomId || !selectedGiftId) return;

    const giftObj = dareGiftItems.find(g => g.id === selectedGiftId);
    if (!giftObj || coins < giftObj.price) return;
    setCoins(prev => prev - giftObj.price);

    const msgId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    send({
      type: 'chat-message',
      data: {
        roomId: roomInfoRef.current.roomId,
        message: JSON.stringify({
          isGift: true,
          isDare: true,
          messageId: msgId,
          gift: giftObj,
          targetUserId: targetId,
          senderId: userIdRef.current
        })
      }
    });
    setIsDareOpen(false);
    setSelectedGiftId(null);
    setDareAcceptanceStatus("idle");
  }, [coins, selectedGiftId]);

  // --- Render Helpers ---
  const isRoomFull = (remoteStreams.length + 1) >= 4;
  const isPullStrangerDisabled = isRoomFull || isEnablingPullStranger || pullStrangerCooldownSec > 0;
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
    isDareOpen,
    setIsDareOpen,
    setIsCoinModalOpen,
    coins,
    selectedGiftId,
    gift: activeLocalGift,
    onGiftAnimationComplete: handleLocalGiftComplete
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
            <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'md:rounded-[60px]', 'overflow-hidden', 'bg-gray-950')}>
              <LocalVideoSection {...localVideoProps} />
            </div>
          ) : (


            // loading  with meme loader
            <>
              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'md:rounded-[60px]', 'overflow-hidden')}>

                <div
                  className="
    absolute inset-0
    h-[95%] w-[95%]
    border border-white/40
    rounded-3xl md:rounded-[60px]
    pointer-events-none
    z-20
    transition-colors
    box-border
    mx-auto
    my-auto
  "
                />
                <div
                  className="absolute inset-0 z-0 "
                  style={{
                    backgroundImage: 'url(/assets/mb.jpg)',
                    backgroundRepeat: 'repeat',
                    backgroundSize: 'cover',
                  }}
                />



                <div
                  className={clsx(
                    'absolute',
                    'inset-0',
                    'flex',
                    'flex-col',
                    'items-center',
                    'justify-center',
                    'px-4',
                    'py-6',
                    'text-white'
                  )}
                >
                  {/* Beam Logo */}
                  <img
                    src="/logo.png"
                    alt="Beam Logo"
                    className="h-8 md:h-16 md:w-40 md:mb-2 object-contain"
                  />

                  {/* Meme API text */}
                  {loadingMeme?.text && (
                    <p className="text-[11px] md:text-sm text-center max-w-[90%] md:max-w-md mb-4 md:mb-10 leading-relaxed">
                      {loadingMeme.text}
                    </p>
                  )}

                  {loadingMeme?.imageUrl ? (
                    <img
                      src={loadingMeme.imageUrl}
                      alt={loadingMeme.text || 'Loading meme'}
                      className={clsx(
                        'w-32 sm:w-40 md:w-48',
                        'max-w-[75%] md:max-w-xl',
                        'rounded-2xl md:rounded-[1.5rem]',
                        'object-contain',
                        'border-2 md:border-4',
                        'border-white'
                      )}
                    />
                  ) : (
                    <div
                      className={clsx(
                        'flex',
                        'h-full',
                        'max-h-[60%] md:max-h-[72%]',
                        'w-full',
                        'max-w-2xl',
                        'items-center',
                        'justify-center',
                        'rounded-[1.5rem]',
                        'text-center'
                      )}
                    >
                      <p
                        className={clsx(
                          'text-base sm:text-lg md:text-xl',
                          'leading-tight',
                          'tracking-tight',
                          'text-white',
                          'px-4'
                        )}
                      >
                        {loadingMeme?.text || 'Finding someone who matches your energy...'}
                      </p>
                    </div>
                  )}

                  {/* Delivering Text */}
                  <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mt-4 md:mt-6" />
                  <p className="text-[8px] md:text-[9px] text-white mt-3 text-center">
                    Delivering you a human now
                  </p>
                </div>


              </div>



              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'md:rounded-[60px]', 'overflow-hidden',)}>
                {!showChatInput && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] items-center gap-3 hidden ">
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

                <div
                  className="
                  md:hidden
    absolute inset-0
    h-[95%] w-[95%]
    border border-white/40
    rounded-3xl md:rounded-[60px]
    pointer-events-none
    z-20
    transition-colors
    box-border
    mx-auto
    my-auto
  "
                />
                <LocalVideoSection {...localVideoProps} hideAllControls={true} />







              </div>
            </>
          )
        ) : remoteStreams.length === 1 ? (
          /* 1:1 Matched Layout: Peer 1 | Local */
          <>

            <div className="absolute inset-3 bottom-[10.5%] flex justify-center md:hidden z-10 pointer-events-none">
              <svg
                viewBox="0 0 370 673"
                preserveAspectRatio="none"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask id="path-1-inside-1_10925_4864" fill="white">
                  <path d="M286.378 438C291.904 438 296.563 441.876 300.652 445.593L316.278 459.799C319.96 463.146 324.757 465 329.732 465H348.457C352.2 465 354.071 465 356.088 465.47C362.312 466.922 368.078 472.688 369.53 478.912C370 480.929 370 482.619 370 486V625C370 641.802 370 650.203 366.73 656.62C363.854 662.265 359.265 666.854 353.62 669.73C347.203 673 338.802 673 322 673H48C31.1984 673 22.7972 673 16.3799 669.73C10.7352 666.854 6.1457 662.265 3.26953 656.62C-0.000273228 650.203 0 641.802 0 625V486C0 482.619 0 480.929 0.470291 478.912C1.92181 472.688 7.6876 466.922 13.9123 465.47C15.9291 465 17.8004 465 21.5429 465H38.7676C43.7429 465 48.5402 463.146 52.2217 459.799L67.8477 445.593C71.9366 441.876 76.5957 438 82.1218 438H286.378ZM322 0C338.802 0 347.203 -0.000273228 353.62 3.26953C359.265 6.1457 363.854 10.7352 366.73 16.3799C370 22.7972 370 31.1984 370 48V375C370 378.381 370 380.071 369.53 382.088C368.078 388.312 362.312 394.078 356.088 395.53C354.071 396 352.2 396 348.457 396H330.39C325.023 396 319.882 398.158 316.121 401.986L299.886 418.517C297.491 420.955 294.485 423 291.067 423H77.4328C74.0148 423 71.0093 420.955 68.6143 418.517L52.3789 401.986C48.6184 398.158 43.477 396 38.1104 396H21.5429C17.8004 396 15.9291 396 13.9123 395.53C7.6876 394.078 1.92181 388.312 0.470291 382.088C0 380.071 0 378.381 0 375V48C0 31.1984 -0.000272485 22.7972 3.26953 16.3799C6.1457 10.7352 10.7352 6.1457 16.3799 3.26953C22.7972 -0.00027298 31.1984 0 48 0H322Z" />
                </mask>
                <path d="M300.652 445.593L301.325 444.853H301.325L300.652 445.593ZM316.278 459.799L315.606 460.539H315.606L316.278 459.799ZM366.73 656.62L367.621 657.074V657.074L366.73 656.62ZM353.62 669.73L354.074 670.621H354.074L353.62 669.73ZM48 673V674V673ZM16.3799 669.73L15.9259 670.621H15.9259L16.3799 669.73ZM3.26953 656.62L2.37853 657.074H2.37853L3.26953 656.62ZM0 486H-1H0ZM52.2217 459.799L52.8944 460.539H52.8944L52.2217 459.799ZM67.8477 445.593L67.175 444.853H67.175L67.8477 445.593ZM353.62 3.26953L354.074 2.37853L354.074 2.37852L353.62 3.26953ZM366.73 16.3799L367.621 15.9259V15.9259L366.73 16.3799ZM330.39 396V395H330.39L330.39 396ZM316.121 401.986L316.835 402.687V402.687L316.121 401.986ZM299.886 418.517L299.172 417.816V417.816L299.886 418.517ZM68.6143 418.517L69.3277 417.816H69.3277L68.6143 418.517ZM52.3789 401.986L51.6655 402.687H51.6655L52.3789 401.986ZM38.1104 396L38.1104 395H38.1104V396ZM0 48H-1H0ZM3.26953 16.3799L2.37853 15.9259L2.37852 15.9259L3.26953 16.3799ZM16.3799 3.26953L15.9259 2.37852L15.9259 2.37853L16.3799 3.26953ZM48 0V-1V0ZM13.9123 395.53L14.1394 394.556L13.9123 395.53ZM0.470291 382.088L-0.503582 382.315L0.470291 382.088ZM0.470291 478.912L-0.503582 478.685L0.470291 478.912ZM13.9123 465.47L13.6852 464.496L13.9123 465.47ZM356.088 465.47L356.315 464.496L356.088 465.47ZM369.53 478.912L368.556 479.139L369.53 478.912ZM369.53 382.088L370.504 382.315L369.53 382.088ZM356.088 395.53L356.315 396.504L356.088 395.53ZM300.652 445.593L299.98 446.333L315.606 460.539L316.278 459.799L316.951 459.059L301.325 444.853L300.652 445.593ZM316.278 459.799L315.606 460.539C319.471 464.053 324.508 466 329.732 466V465V464C325.006 464 320.448 462.238 316.951 459.059L316.278 459.799ZM329.732 465V466H348.457V465V464H329.732V465ZM370 486H369V625H370H371V486H370ZM370 625H369C369 633.417 368.999 639.67 368.595 644.623C368.191 649.564 367.391 653.122 365.839 656.166L366.73 656.62L367.621 657.074C369.34 653.701 370.174 649.85 370.588 644.786C371.001 639.733 371 633.384 371 625H370ZM366.73 656.62L365.839 656.166C363.059 661.623 358.623 666.059 353.166 668.839L353.62 669.73L354.074 670.621C359.907 667.649 364.649 662.907 367.621 657.074L366.73 656.62ZM353.62 669.73L353.166 668.839C350.122 670.391 346.564 671.191 341.623 671.595C336.67 671.999 330.417 672 322 672V673V674C330.384 674 336.733 674.001 341.786 673.588C346.85 673.174 350.701 672.34 354.074 670.621L353.62 669.73ZM322 673V672H48V673V674H322V673ZM48 673V672C39.5827 672 33.3298 671.999 28.3773 671.595C23.4364 671.191 19.8781 670.391 16.8339 668.839L16.3799 669.73L15.9259 670.621C19.299 672.34 23.1499 673.174 28.2144 673.588C33.2673 674.001 39.6157 674 48 674V673ZM16.3799 669.73L16.8339 668.839C11.3773 666.059 6.94083 661.623 4.16053 656.166L3.26953 656.62L2.37853 657.074C5.35057 662.907 10.093 667.649 15.9259 670.621L16.3799 669.73ZM3.26953 656.62L4.16054 656.166C2.60944 653.122 1.80888 649.564 1.40527 644.623C1.00071 639.67 1 633.417 1 625H0H-1C-1 633.384 -1.00085 639.733 -0.588091 644.786C-0.174383 649.85 0.659815 653.701 2.37853 657.074L3.26953 656.62ZM0 625H1V486H0H-1V625H0ZM21.5429 465V466H38.7676V465V464H21.5429V465ZM38.7676 465V466C43.9916 466 49.0288 464.053 52.8944 460.539L52.2217 459.799L51.549 459.059C48.0517 462.238 43.4942 464 38.7676 464V465ZM52.2217 459.799L52.8944 460.539L68.5203 446.333L67.8477 445.593L67.175 444.853L51.549 459.059L52.2217 459.799ZM82.1218 438V439H286.378V438V437H82.1218V438ZM322 0V1C330.417 1 336.67 1.00071 341.623 1.40527C346.564 1.80888 350.122 2.60944 353.166 4.16054L353.62 3.26953L354.074 2.37852C350.701 0.659815 346.85 -0.174383 341.786 -0.588091C336.733 -1.00085 330.384 -1 322 -1V0ZM353.62 3.26953L353.166 4.16053C358.623 6.94083 363.059 11.3773 365.839 16.8339L366.73 16.3799L367.621 15.9259C364.649 10.093 359.907 5.35057 354.074 2.37853L353.62 3.26953ZM366.73 16.3799L365.839 16.8339C367.391 19.8781 368.191 23.4364 368.595 28.3773C368.999 33.3298 369 39.5827 369 48H370H371C371 39.6157 371.001 33.2673 370.588 28.2144C370.174 23.1499 369.34 19.299 367.621 15.9259L366.73 16.3799ZM370 48H369V375H370H371V48H370ZM348.457 396V395H330.39V396V397H348.457V396ZM330.39 396L330.39 395C324.755 395 319.356 397.265 315.408 401.286L316.121 401.986L316.835 402.687C320.407 399.05 325.291 397 330.39 397L330.39 396ZM316.121 401.986L315.408 401.286L299.172 417.816L299.886 418.517L300.599 419.217L316.835 402.687L316.121 401.986ZM291.067 423V422H77.4328V423V424H291.067V423ZM68.6143 418.517L69.3277 417.816L53.0924 401.286L52.3789 401.986L51.6655 402.687L67.9008 419.217L68.6143 418.517ZM52.3789 401.986L53.0924 401.286C49.1439 397.265 43.7454 395 38.1104 395L38.1104 396L38.1103 397C43.2086 397 48.093 399.05 51.6655 402.687L52.3789 401.986ZM38.1104 396V395H21.5429V396V397H38.1104V396ZM0 375H1V48H0H-1V375H0ZM0 48H1C1 39.5827 1.00071 33.3298 1.40527 28.3773C1.80888 23.4364 2.60944 19.8781 4.16054 16.8339L3.26953 16.3799L2.37852 15.9259C0.659815 19.299 -0.174383 23.1499 -0.588091 28.2144C-1.00085 33.2673 -1 39.6157 -1 48H0ZM3.26953 16.3799L4.16053 16.8339C6.94083 11.3773 11.3773 6.94083 16.8339 4.16053L16.3799 3.26953L15.9259 2.37853C10.093 5.35057 5.35057 10.093 2.37853 15.9259L3.26953 16.3799ZM16.3799 3.26953L16.8339 4.16054C19.8781 2.60944 23.4364 1.80888 28.3773 1.40527C33.3298 1.00071 39.5827 1 48 1V0V-1C39.6157 -1 33.2673 -1.00085 28.2144 -0.588091C23.1499 -0.174383 19.299 0.659815 15.9259 2.37852L16.3799 3.26953ZM48 0V1H322V0V-1H48V0ZM21.5429 396V395C17.7648 395 16.0208 394.995 14.1394 394.556L13.9123 395.53L13.6852 396.504C15.8374 397.005 17.8359 397 21.5429 397V396ZM0 375H-1C-1 378.353 -1.00489 380.165 -0.503582 382.315L0.470291 382.088L1.44416 381.861C1.00489 379.977 1 378.408 1 375H0ZM13.9123 395.53L14.1394 394.556C8.28548 393.191 2.80922 387.715 1.44416 381.861L0.470291 382.088L-0.503582 382.315C1.0344 388.91 7.08971 394.966 13.6852 396.504L13.9123 395.53ZM299.886 418.517L299.172 417.816C296.843 420.188 294.082 422 291.067 422V423V424C294.889 424 298.138 421.723 300.599 419.217L299.886 418.517ZM77.4328 423V422C74.4181 422 71.6571 420.188 69.3277 417.816L68.6143 418.517L67.9008 419.217C70.3616 421.723 73.6115 424 77.4328 424V423ZM67.8477 445.593L68.5203 446.333C72.6523 442.576 77.0374 439 82.1218 439V438V437C76.154 437 71.221 441.175 67.175 444.853L67.8477 445.593ZM0 486H1C1 482.592 1.00489 481.023 1.44416 479.139L0.470291 478.912L-0.503582 478.685C-1.00489 480.835 -1 482.647 -1 486H0ZM21.5429 465V464C17.8359 464 15.8374 463.995 13.6852 464.496L13.9123 465.47L14.1394 466.444C16.0208 466.005 17.7648 466 21.5429 466V465ZM0.470291 478.912L1.44416 479.139C2.80922 473.285 8.28548 467.809 14.1394 466.444L13.9123 465.47L13.6852 464.496C7.08971 466.034 1.0344 472.09 -0.503582 478.685L0.470291 478.912ZM348.457 465V466C352.235 466 353.979 466.005 355.861 466.444L356.088 465.47L356.315 464.496C354.163 463.995 352.164 464 348.457 464V465ZM370 486H371C371 482.647 371.005 480.835 370.504 478.685L369.53 478.912L368.556 479.139C368.995 481.023 369 482.592 369 486H370ZM356.088 465.47L355.861 466.444C361.715 467.809 367.191 473.285 368.556 479.139L369.53 478.912L370.504 478.685C368.966 472.09 362.91 466.034 356.315 464.496L356.088 465.47ZM370 375H369C369 378.408 368.995 379.977 368.556 381.861L369.53 382.088L370.504 382.315C371.005 380.165 371 378.353 371 375H370ZM348.457 396V397C352.164 397 354.163 397.005 356.315 396.504L356.088 395.53L355.861 394.556C353.979 394.995 352.235 395 348.457 395V396ZM369.53 382.088L368.556 381.861C367.191 387.715 361.715 393.191 355.861 394.556L356.088 395.53L356.315 396.504C362.91 394.966 368.966 388.91 370.504 382.315L369.53 382.088ZM300.652 445.593L301.325 444.853C297.279 441.175 292.346 437 286.378 437V438V439C291.463 439 295.848 442.576 299.98 446.333L300.652 445.593Z" fill="white" fillOpacity="0.3" mask="url(#path-1-inside-1_10925_4864)" />
              </svg>

            </div>


            <RemoteVideoTile
              className="h-[58%] md:h-auto md:flex-1"
              key={`remote-${remoteStreams[0].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              stream={remoteStreams[0].stream}
              screenShareStream={remoteStreams[0].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
              showLeaveNextButton={status === 'connected'}
              leaveIconType={remoteStreams.length > 1 ? 'exit' : 'next'}
              onLeaveOrNext={handleLeaveGroupOrRaincheck}
              isRainchecking={isRainchecking}
              gift={activeRemoteGift?.targetUserId === remoteStreams[0]?.userId ? activeRemoteGift.gift : null}
              onGiftAnimationComplete={handleRemoteGiftComplete}
              forceDismiss={activeRemoteGift?.targetUserId === remoteStreams[0]?.userId && activeRemoteGift.isDismissed}
            />


            <div className={clsx('h-[42%] md:h-auto md:flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-b-[1.5rem]', 'overflow-hidden', 'bg-gray-950')}>
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

                  <div className="bg-black/50 rounded-full px-4 py-2 flex items-center gap-3backdrop-blur-md ">
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




          </>
        ) : remoteStreams.length === 2 ? (
          /* Multi-User Layout (3 participants): Peer 1 (LEFT) | Peer 2 + Local (RIGHT) */
          <>


            <div className="absolute inset-3 bottom-[10.5%] flex justify-center md:hidden z-10 pointer-events-none">
              <svg
                viewBox="0 0 370 673"
                preserveAspectRatio="none"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask id="path-1-inside-1_10945_46942" fill="white">
                  <path d="M130 438C146.802 438 155.203 438 161.62 441.27C167.265 444.146 171.854 448.735 174.73 454.38C178 460.797 178 469.198 178 486V625C178 641.802 178 650.203 174.73 656.62C171.854 662.265 167.265 666.854 161.62 669.73C155.203 673 146.802 673 130 673H48C31.1984 673 22.7972 673 16.3799 669.73C10.7352 666.854 6.1457 662.265 3.26953 656.62C-0.000273227 650.203 7.85747e-10 641.802 7.85747e-10 625V486C7.85762e-10 482.619 7.8577e-10 480.929 0.470291 478.912C1.92181 472.688 7.6876 466.922 13.9123 465.47C15.9291 465 17.8004 465 21.5429 465H38.7676C43.7429 465 48.5402 463.146 52.2217 459.799L67.8477 445.593C71.9366 441.876 76.5957 438 82.1218 438H130ZM286.378 438C291.904 438 296.563 441.876 300.652 445.593L316.278 459.799C319.96 463.146 324.757 465 329.732 465H348.457C352.2 465 354.071 465 356.088 465.47C362.312 466.922 368.078 472.688 369.53 478.912C370 480.929 370 482.619 370 486V625C370 641.802 370 650.203 366.73 656.62C363.854 662.265 359.265 666.854 353.62 669.73C347.203 673 338.802 673 322 673H240C223.198 673 214.797 673 208.38 669.73C202.735 666.854 198.146 662.265 195.27 656.62C192 650.203 192 641.802 192 625V486C192 469.198 192 460.797 195.27 454.38C198.146 448.735 202.735 444.146 208.38 441.27C214.797 438 223.198 438 240 438H286.378ZM322 7.85747e-10C338.802 7.85747e-10 347.203 -0.000273227 353.62 3.26953C359.265 6.1457 363.854 10.7352 366.73 16.3799C370 22.7972 370 31.1984 370 48V375C370 378.381 370 380.071 369.53 382.088C368.078 388.312 362.312 394.078 356.088 395.53C354.071 396 352.2 396 348.457 396H330.39C325.023 396 319.882 398.157 316.121 401.986L299.886 418.517C297.491 420.955 294.485 423 291.067 423H77.4328C74.0148 423 71.0093 420.955 68.6143 418.517L52.3789 401.986C48.6184 398.157 43.477 396 38.1104 396H21.5429C17.8004 396 15.9291 396 13.9123 395.53C7.6876 394.078 1.92181 388.312 0.470291 382.088C7.85748e-10 380.071 7.85747e-10 378.381 7.85747e-10 375V48C7.85915e-10 31.1984 -0.000272485 22.7972 3.26953 16.3799C6.1457 10.7352 10.7352 6.1457 16.3799 3.26953C22.7972 -0.000273227 31.1984 7.85747e-10 48 7.85747e-10H322Z" />
                </mask>
                <path d="M161.62 441.27L162.074 440.379V440.379L161.62 441.27ZM174.73 454.38L175.621 453.926V453.926L174.73 454.38ZM174.73 656.62L175.621 657.074V657.074L174.73 656.62ZM161.62 669.73L162.074 670.621V670.621L161.62 669.73ZM48 673V674V673ZM16.3799 669.73L15.9259 670.621H15.9259L16.3799 669.73ZM3.26953 656.62L2.37853 657.074H2.37853L3.26953 656.62ZM0 486H-1H0ZM52.2217 459.799L52.8944 460.539H52.8944L52.2217 459.799ZM67.8477 445.593L67.175 444.853H67.175L67.8477 445.593ZM300.652 445.593L301.325 444.853H301.325L300.652 445.593ZM316.278 459.799L315.606 460.539H315.606L316.278 459.799ZM366.73 656.62L367.621 657.074V657.074L366.73 656.62ZM353.62 669.73L354.074 670.621H354.074L353.62 669.73ZM240 673V674V673ZM208.38 669.73L207.926 670.621V670.621L208.38 669.73ZM195.27 656.62L194.379 657.074V657.074L195.27 656.62ZM192 486H191H192ZM195.27 454.38L194.379 453.926V453.926L195.27 454.38ZM208.38 441.27L207.926 440.379V440.379L208.38 441.27ZM353.62 3.26953L354.074 2.37853L354.074 2.37852L353.62 3.26953ZM366.73 16.3799L367.621 15.9259V15.9259L366.73 16.3799ZM330.39 396V395H330.39L330.39 396ZM316.121 401.986L316.835 402.687V402.687L316.121 401.986ZM299.886 418.517L299.172 417.816V417.816L299.886 418.517ZM68.6143 418.517L69.3277 417.816H69.3277L68.6143 418.517ZM52.3789 401.986L51.6655 402.687H51.6655L52.3789 401.986ZM38.1104 396L38.1104 395H38.1104V396ZM0 48H-1H0ZM3.26953 16.3799L2.37853 15.9259L2.37852 15.9259L3.26953 16.3799ZM16.3799 3.26953L15.9259 2.37852L15.9259 2.37853L16.3799 3.26953ZM369.53 382.088L370.504 382.315L369.53 382.088ZM356.088 395.53L356.315 396.504L356.088 395.53ZM356.088 465.47L356.315 464.496L356.088 465.47ZM369.53 478.912L368.556 479.139L369.53 478.912ZM13.9123 395.53L14.1394 394.556L13.9123 395.53ZM0.470291 382.088L-0.503582 382.315L0.470291 382.088ZM0.470291 478.912L-0.503582 478.685L0.470291 478.912ZM13.9123 465.47L13.6852 464.496L13.9123 465.47ZM130 438V439C138.417 439 144.67 439.001 149.623 439.405C154.564 439.809 158.122 440.609 161.166 442.161L161.62 441.27L162.074 440.379C158.701 438.66 154.85 437.826 149.786 437.412C144.733 436.999 138.384 437 130 437V438ZM161.62 441.27L161.166 442.161C166.623 444.941 171.059 449.377 173.839 454.834L174.73 454.38L175.621 453.926C172.649 448.093 167.907 443.351 162.074 440.379L161.62 441.27ZM174.73 454.38L173.839 454.834C175.391 457.878 176.191 461.436 176.595 466.377C176.999 471.33 177 477.583 177 486H178H179C179 477.616 179.001 471.267 178.588 466.214C178.174 461.15 177.34 457.299 175.621 453.926L174.73 454.38ZM178 486H177V625H178H179V486H178ZM178 625H177C177 633.417 176.999 639.67 176.595 644.623C176.191 649.564 175.391 653.122 173.839 656.166L174.73 656.62L175.621 657.074C177.34 653.701 178.174 649.85 178.588 644.786C179.001 639.733 179 633.384 179 625H178ZM174.73 656.62L173.839 656.166C171.059 661.623 166.623 666.059 161.166 668.839L161.62 669.73L162.074 670.621C167.907 667.649 172.649 662.907 175.621 657.074L174.73 656.62ZM161.62 669.73L161.166 668.839C158.122 670.391 154.564 671.191 149.623 671.595C144.67 671.999 138.417 672 130 672V673V674C138.384 674 144.733 674.001 149.786 673.588C154.85 673.174 158.701 672.34 162.074 670.621L161.62 669.73ZM130 673V672H48V673V674H130V673ZM48 673V672C39.5827 672 33.3298 671.999 28.3773 671.595C23.4364 671.191 19.8781 670.391 16.8339 668.839L16.3799 669.73L15.9259 670.621C19.299 672.34 23.1499 673.174 28.2144 673.588C33.2673 674.001 39.6157 674 48 674V673ZM16.3799 669.73L16.8339 668.839C11.3773 666.059 6.94083 661.623 4.16053 656.166L3.26953 656.62L2.37853 657.074C5.35057 662.907 10.093 667.649 15.9259 670.621L16.3799 669.73ZM3.26953 656.62L4.16054 656.166C2.60944 653.122 1.80888 649.564 1.40527 644.623C1.00071 639.67 1 633.417 1 625H0H-1C-1 633.384 -1.00085 639.733 -0.588091 644.786C-0.174383 649.85 0.659815 653.701 2.37853 657.074L3.26953 656.62ZM0 625H1V486H0H-1V625H0ZM21.5429 465V466H38.7676V465V464H21.5429V465ZM38.7676 465V466C43.9916 466 49.0288 464.053 52.8944 460.539L52.2217 459.799L51.549 459.059C48.0517 462.238 43.4942 464 38.7676 464V465ZM52.2217 459.799L52.8944 460.539L68.5203 446.333L67.8477 445.593L67.175 444.853L51.549 459.059L52.2217 459.799ZM82.1218 438V439H130V438V437H82.1218V438ZM300.652 445.593L299.98 446.333L315.606 460.539L316.278 459.799L316.951 459.059L301.325 444.853L300.652 445.593ZM316.278 459.799L315.606 460.539C319.471 464.053 324.508 466 329.732 466V465V464C325.006 464 320.448 462.238 316.951 459.059L316.278 459.799ZM329.732 465V466H348.457V465V464H329.732V465ZM370 486H369V625H370H371V486H370ZM370 625H369C369 633.417 368.999 639.67 368.595 644.623C368.191 649.564 367.391 653.122 365.839 656.166L366.73 656.62L367.621 657.074C369.34 653.701 370.174 649.85 370.588 644.786C371.001 639.733 371 633.384 371 625H370ZM366.73 656.62L365.839 656.166C363.059 661.623 358.623 666.059 353.166 668.839L353.62 669.73L354.074 670.621C359.907 667.649 364.649 662.907 367.621 657.074L366.73 656.62ZM353.62 669.73L353.166 668.839C350.122 670.391 346.564 671.191 341.623 671.595C336.67 671.999 330.417 672 322 672V673V674C330.384 674 336.733 674.001 341.786 673.588C346.85 673.174 350.701 672.34 354.074 670.621L353.62 669.73ZM322 673V672H240V673V674H322V673ZM240 673V672C231.583 672 225.33 671.999 220.377 671.595C215.436 671.191 211.878 670.391 208.834 668.839L208.38 669.73L207.926 670.621C211.299 672.34 215.15 673.174 220.214 673.588C225.267 674.001 231.616 674 240 674V673ZM208.38 669.73L208.834 668.839C203.377 666.059 198.941 661.623 196.161 656.166L195.27 656.62L194.379 657.074C197.351 662.907 202.093 667.649 207.926 670.621L208.38 669.73ZM195.27 656.62L196.161 656.166C194.609 653.122 193.809 649.564 193.405 644.623C193.001 639.67 193 633.417 193 625H192H191C191 633.384 190.999 639.733 191.412 644.786C191.826 649.85 192.66 653.701 194.379 657.074L195.27 656.62ZM192 625H193V486H192H191V625H192ZM192 486H193C193 477.583 193.001 471.33 193.405 466.377C193.809 461.436 194.609 457.878 196.161 454.834L195.27 454.38L194.379 453.926C192.66 457.299 191.826 461.15 191.412 466.214C190.999 471.267 191 477.616 191 486H192ZM195.27 454.38L196.161 454.834C198.941 449.377 203.377 444.941 208.834 442.161L208.38 441.27L207.926 440.379C202.093 443.351 197.351 448.093 194.379 453.926L195.27 454.38ZM208.38 441.27L208.834 442.161C211.878 440.609 215.436 439.809 220.377 439.405C225.33 439.001 231.583 439 240 439V438V437C231.616 437 225.267 436.999 220.214 437.412C215.15 437.826 211.299 438.66 207.926 440.379L208.38 441.27ZM240 438V439H286.378V438V437H240V438ZM322 0V1C330.417 1 336.67 1.00071 341.623 1.40527C346.564 1.80888 350.122 2.60944 353.166 4.16054L353.62 3.26953L354.074 2.37852C350.701 0.659815 346.85 -0.174383 341.786 -0.588091C336.733 -1.00085 330.384 -1 322 -1V0ZM353.62 3.26953L353.166 4.16053C358.623 6.94083 363.059 11.3773 365.839 16.8339L366.73 16.3799L367.621 15.9259C364.649 10.093 359.907 5.35057 354.074 2.37853L353.62 3.26953ZM366.73 16.3799L365.839 16.8339C367.391 19.8781 368.191 23.4364 368.595 28.3773C368.999 33.3298 369 39.5827 369 48H370H371C371 39.6157 371.001 33.2673 370.588 28.2144C370.174 23.1499 369.34 19.299 367.621 15.9259L366.73 16.3799ZM370 48H369V375H370H371V48H370ZM348.457 396V395H330.39V396V397H348.457V396ZM330.39 396L330.39 395C324.755 395 319.356 397.265 315.408 401.286L316.121 401.986L316.835 402.687C320.407 399.05 325.291 397 330.39 397L330.39 396ZM316.121 401.986L315.408 401.286L299.172 417.816L299.886 418.517L300.599 419.217L316.835 402.687L316.121 401.986ZM291.067 423V422H77.4328V423V424H291.067V423ZM68.6143 418.517L69.3277 417.816L53.0924 401.286L52.3789 401.986L51.6655 402.687L67.9008 419.217L68.6143 418.517ZM52.3789 401.986L53.0924 401.286C49.1439 397.265 43.7454 395 38.1104 395L38.1104 396L38.1103 397C43.2086 397 48.093 399.05 51.6655 402.687L52.3789 401.986ZM38.1104 396V395H21.5429V396V397H38.1104V396ZM0 375H1V48H0H-1V375H0ZM0 48H1C1 39.5827 1.00071 33.3298 1.40527 28.3773C1.80888 23.4364 2.60944 19.8781 4.16054 16.8339L3.26953 16.3799L2.37852 15.9259C0.659815 19.299 -0.174383 23.1499 -0.588091 28.2144C-1.00085 33.2673 -1 39.6157 -1 48H0ZM3.26953 16.3799L4.16053 16.8339C6.94083 11.3773 11.3773 6.94083 16.8339 4.16053L16.3799 3.26953L15.9259 2.37853C10.093 5.35057 5.35057 10.093 2.37853 15.9259L3.26953 16.3799ZM16.3799 3.26953L16.8339 4.16054C19.8781 2.60944 23.4364 1.80888 28.3773 1.40527C33.3298 1.00071 39.5827 1 48 1V0V-1C39.6157 -1 33.2673 -1.00085 28.2144 -0.588091C23.1499 -0.174383 19.299 0.659815 15.9259 2.37852L16.3799 3.26953ZM48 0V1H322V0V-1H48V0ZM299.886 418.517L299.172 417.816C296.843 420.188 294.082 422 291.067 422V423V424C294.889 424 298.138 421.723 300.599 419.217L299.886 418.517ZM370 375H369C369 378.408 368.995 379.977 368.556 381.861L369.53 382.088L370.504 382.315C371.005 380.165 371 378.353 371 375H370ZM348.457 396V397C352.164 397 354.163 397.005 356.315 396.504L356.088 395.53L355.861 394.556C353.979 394.995 352.235 395 348.457 395V396ZM369.53 382.088L368.556 381.861C367.191 387.715 361.715 393.191 355.861 394.556L356.088 395.53L356.315 396.504C362.91 394.966 368.966 388.91 370.504 382.315L369.53 382.088ZM348.457 465V466C352.235 466 353.979 466.005 355.861 466.444L356.088 465.47L356.315 464.496C354.163 463.995 352.164 464 348.457 464V465ZM370 486H371C371 482.647 371.005 480.835 370.504 478.685L369.53 478.912L368.556 479.139C368.995 481.023 369 482.592 369 486H370ZM356.088 465.47L355.861 466.444C361.715 467.809 367.191 473.285 368.556 479.139L369.53 478.912L370.504 478.685C368.966 472.09 362.91 466.034 356.315 464.496L356.088 465.47ZM21.5429 396V395C17.7648 395 16.0208 394.995 14.1394 394.556L13.9123 395.53L13.6852 396.504C15.8374 397.005 17.8359 397 21.5429 397V396ZM0 375H-1C-1 378.353 -1.00489 380.165 -0.503582 382.315L0.470291 382.088L1.44416 381.861C1.00489 379.977 1 378.408 1 375H0ZM13.9123 395.53L14.1394 394.556C8.28548 393.191 2.80922 387.715 1.44416 381.861L0.470291 382.088L-0.503582 382.315C1.0344 388.91 7.08971 394.966 13.6852 396.504L13.9123 395.53ZM67.8477 445.593L68.5203 446.333C72.6523 442.576 77.0374 439 82.1218 439V438V437C76.154 437 71.221 441.175 67.175 444.853L67.8477 445.593ZM300.652 445.593L301.325 444.853C297.279 441.175 292.346 437 286.378 437V438V439C291.463 439 295.848 442.576 299.98 446.333L300.652 445.593ZM77.4328 423V422C74.4181 422 71.6571 420.188 69.3277 417.816L68.6143 418.517L67.9008 419.217C70.3616 421.723 73.6115 424 77.4328 424V423ZM0 486H1C1 482.592 1.00489 481.023 1.44416 479.139L0.470291 478.912L-0.503582 478.685C-1.00489 480.835 -1 482.647 -1 486H0ZM21.5429 465V464C17.8359 464 15.8374 463.995 13.6852 464.496L13.9123 465.47L14.1394 466.444C16.0208 466.005 17.7648 466 21.5429 466V465ZM0.470291 478.912L1.44416 479.139C2.80922 473.285 8.28548 467.809 14.1394 466.444L13.9123 465.47L13.6852 464.496C7.08971 466.034 1.0344 472.09 -0.503582 478.685L0.470291 478.912Z" fill="white" fillOpacity="0.3" mask="url(#path-1-inside-1_10945_46942)" />
              </svg>
            </div>



            <RemoteVideoTile
              className="h-[57%] md:h-auto md:flex-1"
              key={`remote-${remoteStreams[0].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              onSendFriendRequest={() => {
                remoteStreams.forEach(s => {
                  if (s.userId && !friendshipWithRemote[s.userId] && !friendRequestSentTo[s.userId]) {
                    handleSendFriendRequest(s.userId);
                  }
                });
              }}
              stream={remoteStreams[0].stream}
              screenShareStream={remoteStreams[0].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
              showLeaveNextButton={status === 'connected'}
              leaveIconType={remoteStreams.length > 1 ? 'exit' : 'next'}
              onLeaveOrNext={handleLeaveGroupOrRaincheck}
              isRainchecking={isRainchecking}
              hideNameOnMobile={true}
              gift={activeRemoteGift?.targetUserId === remoteStreams[0]?.userId ? activeRemoteGift.gift : null}
              onGiftAnimationComplete={handleRemoteGiftComplete}
              forceDismiss={activeRemoteGift?.targetUserId === remoteStreams[0]?.userId && activeRemoteGift.isDismissed}
              multiUserAvatars={remoteStreams.map(s => getRemoteTileProfile(s).displayPictureUrl)}
              onClickMultiUserAvatars={() => setShowGroupMembersModal(true)}
              onReportClick={() => setShowGroupMembersModal(true)}
            />

            <div className="flex min-h-0 min-w-0 flex-1 md:flex-col    md:gap-2">
              <RemoteVideoTile
                key={`remote-${remoteStreams[1].userId}`}
                {...getRemoteFriendTileProps(remoteStreams[1])}
                stream={remoteStreams[1].stream}
                screenShareStream={remoteStreams[1].screenStream || null}
                {...getRemoteTileProfile(remoteStreams[1])}
                showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[1])}
                showKickParticipant={canKickRemoteUser(remoteStreams[1].userId)}
                onKickParticipant={() => handleKickRemote(remoteStreams[1].userId)}
                borderBottomClass="md:bottom-4"
                hideNameOnMobile={true}
                hideAddFriendOnMobile={true}
                hideReportOnMobile={true}
                gift={activeRemoteGift?.targetUserId === remoteStreams[1]?.userId ? activeRemoteGift.gift : null}
                onGiftAnimationComplete={handleRemoteGiftComplete}
              />
              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'md:rounded-[60px]', 'overflow-hidden', 'bg-gray-950',)}>
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
                <LocalVideoSection {...localVideoProps} hideMobileControlsRow={true} />
              </div>
            </div>
          </>
        ) : (













          /* Grid Layout (4 participants): 2x2 Grid */





          <>

            <div className="absolute inset-3 bottom-[10.5%] flex justify-center md:hidden z-10 pointer-events-none">
              <svg
                viewBox="0 0 370 673"
                preserveAspectRatio="none"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask id="path-1-inside-1_10945_46650" fill="white">
                  <path d="M130 438C146.802 438 155.203 438 161.62 441.27C167.265 444.146 171.854 448.735 174.73 454.38C178 460.797 178 469.198 178 486V625C178 641.802 178 650.203 174.73 656.62C171.854 662.265 167.265 666.854 161.62 669.73C155.203 673 146.802 673 130 673H48C31.1984 673 22.7972 673 16.3799 669.73C10.7352 666.854 6.1457 662.265 3.26953 656.62C-0.000273227 650.203 1.16718e-09 641.802 1.16718e-09 625V486C1.16719e-09 482.619 1.1672e-09 480.929 0.470291 478.912C1.92181 472.688 7.6876 466.922 13.9123 465.47C15.9291 465 17.8004 465 21.5429 465H38.7676C43.7429 465 48.5402 463.146 52.2217 459.799L67.8477 445.593C71.9366 441.876 76.5957 438 82.1218 438H130ZM286.378 438C291.904 438 296.563 441.876 300.652 445.593L316.278 459.799C319.96 463.146 324.757 465 329.732 465H348.457C352.2 465 354.071 465 356.088 465.47C362.312 466.922 368.078 472.688 369.53 478.912C370 480.929 370 482.619 370 486V625C370 641.802 370 650.203 366.73 656.62C363.854 662.265 359.265 666.854 353.62 669.73C347.203 673 338.802 673 322 673H240C223.198 673 214.797 673 208.38 669.73C202.735 666.854 198.146 662.265 195.27 656.62C192 650.203 192 641.802 192 625V486C192 469.198 192 460.797 195.27 454.38C198.146 448.735 202.735 444.146 208.38 441.27C214.797 438 223.198 438 240 438H286.378ZM322 1.16718e-09C338.802 1.16718e-09 347.203 -0.000273227 353.62 3.26953C359.265 6.1457 363.854 10.7352 366.73 16.3799C370 22.7972 370 31.1984 370 48V375C370 378.381 370 380.071 369.53 382.088C368.078 388.312 362.312 394.078 356.088 395.53C354.071 396 352.2 396 348.457 396H330.39C325.023 396 319.882 398.157 316.121 401.986L299.886 418.517C297.491 420.955 294.485 423 291.067 423H242C225.198 423 216.797 423 210.38 419.73C204.735 416.854 200.146 412.265 197.27 406.62C194 400.203 194 391.802 194 375V48C194 31.1984 194 22.7972 197.27 16.3799C200.146 10.7352 204.735 6.1457 210.38 3.26953C216.797 -0.000273227 225.198 1.16718e-09 242 1.16718e-09H322ZM128 1.16718e-09C144.802 1.16718e-09 153.203 -0.000273227 159.62 3.26953C165.265 6.1457 169.854 10.7352 172.73 16.3799C176 22.7972 176 31.1984 176 48V375C176 391.802 176 400.203 172.73 406.62C169.854 412.265 165.265 416.854 159.62 419.73C153.203 423 144.802 423 128 423H77.4328C74.0148 423 71.0093 420.955 68.6143 418.517L52.3789 401.986C48.6184 398.157 43.477 396 38.1104 396H21.5429C17.8004 396 15.9291 396 13.9123 395.53C7.6876 394.078 1.92181 388.312 0.470291 382.088C1.16718e-09 380.071 1.16718e-09 378.381 1.16718e-09 375V48C1.16735e-09 31.1984 -0.000272484 22.7972 3.26953 16.3799C6.1457 10.7352 10.7352 6.1457 16.3799 3.26953C22.7972 -0.000273227 31.1984 1.16718e-09 48 1.16718e-09H128Z" />
                </mask>
                <path d="M161.62 441.27L162.074 440.379V440.379L161.62 441.27ZM174.73 454.38L175.621 453.926V453.926L174.73 454.38ZM174.73 656.62L175.621 657.074V657.074L174.73 656.62ZM161.62 669.73L162.074 670.621V670.621L161.62 669.73ZM48 673V674V673ZM16.3799 669.73L15.9259 670.621H15.9259L16.3799 669.73ZM3.26953 656.62L2.37853 657.074H2.37853L3.26953 656.62ZM0 486H-1H0ZM52.2217 459.799L52.8944 460.539H52.8944L52.2217 459.799ZM67.8477 445.593L67.175 444.853H67.175L67.8477 445.593ZM300.652 445.593L301.325 444.853H301.325L300.652 445.593ZM316.278 459.799L315.606 460.539H315.606L316.278 459.799ZM366.73 656.62L367.621 657.074V657.074L366.73 656.62ZM353.62 669.73L354.074 670.621H354.074L353.62 669.73ZM240 673V674V673ZM208.38 669.73L207.926 670.621V670.621L208.38 669.73ZM195.27 656.62L194.379 657.074V657.074L195.27 656.62ZM192 486H191H192ZM195.27 454.38L194.379 453.926V453.926L195.27 454.38ZM208.38 441.27L207.926 440.379V440.379L208.38 441.27ZM353.62 3.26953L354.074 2.37853L354.074 2.37852L353.62 3.26953ZM366.73 16.3799L367.621 15.9259V15.9259L366.73 16.3799ZM330.39 396V395H330.39L330.39 396ZM316.121 401.986L316.835 402.687V402.687L316.121 401.986ZM299.886 418.517L299.172 417.816V417.816L299.886 418.517ZM242 423V424V423ZM210.38 419.73L209.926 420.621V420.621L210.38 419.73ZM197.27 406.62L196.379 407.074V407.074L197.27 406.62ZM194 48H193H194ZM197.27 16.3799L196.379 15.9259V15.9259L197.27 16.3799ZM210.38 3.26953L209.926 2.37852V2.37853L210.38 3.26953ZM159.62 3.26953L160.074 2.37853V2.37852L159.62 3.26953ZM172.73 16.3799L173.621 15.9259V15.9259L172.73 16.3799ZM172.73 406.62L173.621 407.074V407.074L172.73 406.62ZM159.62 419.73L160.074 420.621V420.621L159.62 419.73ZM68.6143 418.517L69.3277 417.816H69.3277L68.6143 418.517ZM52.3789 401.986L51.6655 402.687H51.6655L52.3789 401.986ZM38.1104 396L38.1104 395H38.1104V396ZM0 48H-1H0ZM3.26953 16.3799L2.37853 15.9259L2.37852 15.9259L3.26953 16.3799ZM16.3799 3.26953L15.9259 2.37852L15.9259 2.37853L16.3799 3.26953ZM369.53 382.088L370.504 382.315L369.53 382.088ZM356.088 395.53L356.315 396.504L356.088 395.53ZM13.9123 395.53L14.1394 394.556L13.9123 395.53ZM0.470291 382.088L-0.503582 382.315L0.470291 382.088ZM356.088 465.47L356.315 464.496L356.088 465.47ZM369.53 478.912L368.556 479.139L369.53 478.912ZM0.470291 478.912L-0.503582 478.685L0.470291 478.912ZM13.9123 465.47L13.6852 464.496L13.9123 465.47ZM130 438V439C138.417 439 144.67 439.001 149.623 439.405C154.564 439.809 158.122 440.609 161.166 442.161L161.62 441.27L162.074 440.379C158.701 438.66 154.85 437.826 149.786 437.412C144.733 436.999 138.384 437 130 437V438ZM161.62 441.27L161.166 442.161C166.623 444.941 171.059 449.377 173.839 454.834L174.73 454.38L175.621 453.926C172.649 448.093 167.907 443.351 162.074 440.379L161.62 441.27ZM174.73 454.38L173.839 454.834C175.391 457.878 176.191 461.436 176.595 466.377C176.999 471.33 177 477.583 177 486H178H179C179 477.616 179.001 471.267 178.588 466.214C178.174 461.15 177.34 457.299 175.621 453.926L174.73 454.38ZM178 486H177V625H178H179V486H178ZM178 625H177C177 633.417 176.999 639.67 176.595 644.623C176.191 649.564 175.391 653.122 173.839 656.166L174.73 656.62L175.621 657.074C177.34 653.701 178.174 649.85 178.588 644.786C179.001 639.733 179 633.384 179 625H178ZM174.73 656.62L173.839 656.166C171.059 661.623 166.623 666.059 161.166 668.839L161.62 669.73L162.074 670.621C167.907 667.649 172.649 662.907 175.621 657.074L174.73 656.62ZM161.62 669.73L161.166 668.839C158.122 670.391 154.564 671.191 149.623 671.595C144.67 671.999 138.417 672 130 672V673V674C138.384 674 144.733 674.001 149.786 673.588C154.85 673.174 158.701 672.34 162.074 670.621L161.62 669.73ZM130 673V672H48V673V674H130V673ZM48 673V672C39.5827 672 33.3298 671.999 28.3773 671.595C23.4364 671.191 19.8781 670.391 16.8339 668.839L16.3799 669.73L15.9259 670.621C19.299 672.34 23.1499 673.174 28.2144 673.588C33.2673 674.001 39.6157 674 48 674V673ZM16.3799 669.73L16.8339 668.839C11.3773 666.059 6.94083 661.623 4.16053 656.166L3.26953 656.62L2.37853 657.074C5.35057 662.907 10.093 667.649 15.9259 670.621L16.3799 669.73ZM3.26953 656.62L4.16054 656.166C2.60944 653.122 1.80888 649.564 1.40527 644.623C1.00071 639.67 1 633.417 1 625H0H-1C-1 633.384 -1.00085 639.733 -0.588091 644.786C-0.174383 649.85 0.659815 653.701 2.37853 657.074L3.26953 656.62ZM0 625H1V486H0H-1V625H0ZM21.5429 465V466H38.7676V465V464H21.5429V465ZM38.7676 465V466C43.9916 466 49.0288 464.053 52.8944 460.539L52.2217 459.799L51.549 459.059C48.0517 462.238 43.4942 464 38.7676 464V465ZM52.2217 459.799L52.8944 460.539L68.5203 446.333L67.8477 445.593L67.175 444.853L51.549 459.059L52.2217 459.799ZM82.1218 438V439H130V438V437H82.1218V438ZM300.652 445.593L299.98 446.333L315.606 460.539L316.278 459.799L316.951 459.059L301.325 444.853L300.652 445.593ZM316.278 459.799L315.606 460.539C319.471 464.053 324.508 466 329.732 466V465V464C325.006 464 320.448 462.238 316.951 459.059L316.278 459.799ZM329.732 465V466H348.457V465V464H329.732V465ZM370 486H369V625H370H371V486H370ZM370 625H369C369 633.417 368.999 639.67 368.595 644.623C368.191 649.564 367.391 653.122 365.839 656.166L366.73 656.62L367.621 657.074C369.34 653.701 370.174 649.85 370.588 644.786C371.001 639.733 371 633.384 371 625H370ZM366.73 656.62L365.839 656.166C363.059 661.623 358.623 666.059 353.166 668.839L353.62 669.73L354.074 670.621C359.907 667.649 364.649 662.907 367.621 657.074L366.73 656.62ZM353.62 669.73L353.166 668.839C350.122 670.391 346.564 671.191 341.623 671.595C336.67 671.999 330.417 672 322 672V673V674C330.384 674 336.733 674.001 341.786 673.588C346.85 673.174 350.701 672.34 354.074 670.621L353.62 669.73ZM322 673V672H240V673V674H322V673ZM240 673V672C231.583 672 225.33 671.999 220.377 671.595C215.436 671.191 211.878 670.391 208.834 668.839L208.38 669.73L207.926 670.621C211.299 672.34 215.15 673.174 220.214 673.588C225.267 674.001 231.616 674 240 674V673ZM208.38 669.73L208.834 668.839C203.377 666.059 198.941 661.623 196.161 656.166L195.27 656.62L194.379 657.074C197.351 662.907 202.093 667.649 207.926 670.621L208.38 669.73ZM195.27 656.62L196.161 656.166C194.609 653.122 193.809 649.564 193.405 644.623C193.001 639.67 193 633.417 193 625H192H191C191 633.384 190.999 639.733 191.412 644.786C191.826 649.85 192.66 653.701 194.379 657.074L195.27 656.62ZM192 625H193V486H192H191V625H192ZM192 486H193C193 477.583 193.001 471.33 193.405 466.377C193.809 461.436 194.609 457.878 196.161 454.834L195.27 454.38L194.379 453.926C192.66 457.299 191.826 461.15 191.412 466.214C190.999 471.267 191 477.616 191 486H192ZM195.27 454.38L196.161 454.834C198.941 449.377 203.377 444.941 208.834 442.161L208.38 441.27L207.926 440.379C202.093 443.351 197.351 448.093 194.379 453.926L195.27 454.38ZM208.38 441.27L208.834 442.161C211.878 440.609 215.436 439.809 220.377 439.405C225.33 439.001 231.583 439 240 439V438V437C231.616 437 225.267 436.999 220.214 437.412C215.15 437.826 211.299 438.66 207.926 440.379L208.38 441.27ZM240 438V439H286.378V438V437H240V438ZM322 0V1C330.417 1 336.67 1.00071 341.623 1.40527C346.564 1.80888 350.122 2.60944 353.166 4.16054L353.62 3.26953L354.074 2.37852C350.701 0.659815 346.85 -0.174383 341.786 -0.588091C336.733 -1.00085 330.384 -1 322 -1V0ZM353.62 3.26953L353.166 4.16053C358.623 6.94083 363.059 11.3773 365.839 16.8339L366.73 16.3799L367.621 15.9259C364.649 10.093 359.907 5.35057 354.074 2.37853L353.62 3.26953ZM366.73 16.3799L365.839 16.8339C367.391 19.8781 368.191 23.4364 368.595 28.3773C368.999 33.3298 369 39.5827 369 48H370H371C371 39.6157 371.001 33.2673 370.588 28.2144C370.174 23.1499 369.34 19.299 367.621 15.9259L366.73 16.3799ZM370 48H369V375H370H371V48H370ZM348.457 396V395H330.39V396V397H348.457V396ZM330.39 396L330.39 395C324.755 395 319.356 397.265 315.408 401.286L316.121 401.986L316.835 402.687C320.407 399.05 325.291 397 330.39 397L330.39 396ZM316.121 401.986L315.408 401.286L299.172 417.816L299.886 418.517L300.599 419.217L316.835 402.687L316.121 401.986ZM291.067 423V422H242V423V424H291.067V423ZM242 423V422C233.583 422 227.33 421.999 222.377 421.595C217.436 421.191 213.878 420.391 210.834 418.839L210.38 419.73L209.926 420.621C213.299 422.34 217.15 423.174 222.214 423.588C227.267 424.001 233.616 424 242 424V423ZM210.38 419.73L210.834 418.839C205.377 416.059 200.941 411.623 198.161 406.166L197.27 406.62L196.379 407.074C199.351 412.907 204.093 417.649 209.926 420.621L210.38 419.73ZM197.27 406.62L198.161 406.166C196.609 403.122 195.809 399.564 195.405 394.623C195.001 389.67 195 383.417 195 375H194H193C193 383.384 192.999 389.733 193.412 394.786C193.826 399.85 194.66 403.701 196.379 407.074L197.27 406.62ZM194 375H195V48H194H193V375H194ZM194 48H195C195 39.5827 195.001 33.3298 195.405 28.3773C195.809 23.4364 196.609 19.8781 198.161 16.8339L197.27 16.3799L196.379 15.9259C194.66 19.299 193.826 23.1499 193.412 28.2144C192.999 33.2673 193 39.6157 193 48H194ZM197.27 16.3799L198.161 16.8339C200.941 11.3773 205.377 6.94083 210.834 4.16053L210.38 3.26953L209.926 2.37853C204.093 5.35057 199.351 10.093 196.379 15.9259L197.27 16.3799ZM210.38 3.26953L210.834 4.16054C213.878 2.60944 217.436 1.80888 222.377 1.40527C227.33 1.00071 233.583 1 242 1V0V-1C233.616 -1 227.267 -1.00085 222.214 -0.588091C217.15 -0.174383 213.299 0.659815 209.926 2.37852L210.38 3.26953ZM242 0V1H322V0V-1H242V0ZM128 0V1C136.417 1 142.67 1.00071 147.623 1.40527C152.564 1.80888 156.122 2.60944 159.166 4.16054L159.62 3.26953L160.074 2.37852C156.701 0.659815 152.85 -0.174383 147.786 -0.588091C142.733 -1.00085 136.384 -1 128 -1V0ZM159.62 3.26953L159.166 4.16053C164.623 6.94083 169.059 11.3773 171.839 16.8339L172.73 16.3799L173.621 15.9259C170.649 10.093 165.907 5.35057 160.074 2.37853L159.62 3.26953ZM172.73 16.3799L171.839 16.8339C173.391 19.8781 174.191 23.4364 174.595 28.3773C174.999 33.3298 175 39.5827 175 48H176H177C177 39.6157 177.001 33.2673 176.588 28.2144C176.174 23.1499 175.34 19.299 173.621 15.9259L172.73 16.3799ZM176 48H175V375H176H177V48H176ZM176 375H175C175 383.417 174.999 389.67 174.595 394.623C174.191 399.564 173.391 403.122 171.839 406.166L172.73 406.62L173.621 407.074C175.34 403.701 176.174 399.85 176.588 394.786C177.001 389.733 177 383.384 177 375H176ZM172.73 406.62L171.839 406.166C169.059 411.623 164.623 416.059 159.166 418.839L159.62 419.73L160.074 420.621C165.907 417.649 170.649 412.907 173.621 407.074L172.73 406.62ZM159.62 419.73L159.166 418.839C156.122 420.391 152.564 421.191 147.623 421.595C142.67 421.999 136.417 422 128 422V423V424C136.384 424 142.733 424.001 147.786 423.588C152.85 423.174 156.701 422.34 160.074 420.621L159.62 419.73ZM128 423V422H77.4328V423V424H128V423ZM68.6143 418.517L69.3277 417.816L53.0924 401.286L52.3789 401.986L51.6655 402.687L67.9008 419.217L68.6143 418.517ZM52.3789 401.986L53.0924 401.286C49.1439 397.265 43.7454 395 38.1104 395L38.1104 396L38.1103 397C43.2086 397 48.093 399.05 51.6655 402.687L52.3789 401.986ZM38.1104 396V395H21.5429V396V397H38.1104V396ZM0 375H1V48H0H-1V375H0ZM0 48H1C1 39.5827 1.00071 33.3298 1.40527 28.3773C1.80888 23.4364 2.60944 19.8781 4.16054 16.8339L3.26953 16.3799L2.37852 15.9259C0.659815 19.299 -0.174383 23.1499 -0.588091 28.2144C-1.00085 33.2673 -1 39.6157 -1 48H0ZM3.26953 16.3799L4.16053 16.8339C6.94083 11.3773 11.3773 6.94083 16.8339 4.16053L16.3799 3.26953L15.9259 2.37853C10.093 5.35057 5.35057 10.093 2.37853 15.9259L3.26953 16.3799ZM16.3799 3.26953L16.8339 4.16054C19.8781 2.60944 23.4364 1.80888 28.3773 1.40527C33.3298 1.00071 39.5827 1 48 1V0V-1C39.6157 -1 33.2673 -1.00085 28.2144 -0.588091C23.1499 -0.174383 19.299 0.659815 15.9259 2.37852L16.3799 3.26953ZM48 0V1H128V0V-1H48V0ZM299.886 418.517L299.172 417.816C296.843 420.188 294.082 422 291.067 422V423V424C294.889 424 298.138 421.723 300.599 419.217L299.886 418.517ZM370 375H369C369 378.408 368.995 379.977 368.556 381.861L369.53 382.088L370.504 382.315C371.005 380.165 371 378.353 371 375H370ZM348.457 396V397C352.164 397 354.163 397.005 356.315 396.504L356.088 395.53L355.861 394.556C353.979 394.995 352.235 395 348.457 395V396ZM369.53 382.088L368.556 381.861C367.191 387.715 361.715 393.191 355.861 394.556L356.088 395.53L356.315 396.504C362.91 394.966 368.966 388.91 370.504 382.315L369.53 382.088ZM21.5429 396V395C17.7648 395 16.0208 394.995 14.1394 394.556L13.9123 395.53L13.6852 396.504C15.8374 397.005 17.8359 397 21.5429 397V396ZM0 375H-1C-1 378.353 -1.00489 380.165 -0.503582 382.315L0.470291 382.088L1.44416 381.861C1.00489 379.977 1 378.408 1 375H0ZM13.9123 395.53L14.1394 394.556C8.28548 393.191 2.80922 387.715 1.44416 381.861L0.470291 382.088L-0.503582 382.315C1.0344 388.91 7.08971 394.966 13.6852 396.504L13.9123 395.53ZM348.457 465V466C352.235 466 353.979 466.005 355.861 466.444L356.088 465.47L356.315 464.496C354.163 463.995 352.164 464 348.457 464V465ZM370 486H371C371 482.647 371.005 480.835 370.504 478.685L369.53 478.912L368.556 479.139C368.995 481.023 369 482.592 369 486H370ZM356.088 465.47L355.861 466.444C361.715 467.809 367.191 473.285 368.556 479.139L369.53 478.912L370.504 478.685C368.966 472.09 362.91 466.034 356.315 464.496L356.088 465.47ZM67.8477 445.593L68.5203 446.333C72.6523 442.576 77.0374 439 82.1218 439V438V437C76.154 437 71.221 441.175 67.175 444.853L67.8477 445.593ZM77.4328 423V422C74.4181 422 71.6571 420.188 69.3277 417.816L68.6143 418.517L67.9008 419.217C70.3616 421.723 73.6114 424 77.4328 424V423ZM300.652 445.593L301.325 444.853C297.279 441.175 292.346 437 286.378 437V438V439C291.463 439 295.848 442.576 299.98 446.333L300.652 445.593ZM0 486H1C1 482.592 1.00489 481.023 1.44416 479.139L0.470291 478.912L-0.503582 478.685C-1.00489 480.835 -1 482.647 -1 486H0ZM21.5429 465V464C17.8359 464 15.8374 463.995 13.6852 464.496L13.9123 465.47L14.1394 466.444C16.0208 466.005 17.7648 466 21.5429 466V465ZM0.470291 478.912L1.44416 479.139C2.80922 473.285 8.28548 467.809 14.1394 466.444L13.9123 465.47L13.6852 464.496C7.08971 466.034 1.0344 472.09 -0.503582 478.685L0.470291 478.912Z" fill="white" fillOpacity="0.3" mask="url(#path-1-inside-1_10945_46650)" />
              </svg>

            </div>




            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-[57%_1fr] md:grid-rows-2 md:gap-2">
              <RemoteVideoTile
                key={`remote-${remoteStreams[0].userId}`}

                {...getRemoteFriendTileProps(remoteStreams[0])}
                onSendFriendRequest={() => {
                  remoteStreams.forEach(s => {
                    if (s.userId && !friendshipWithRemote[s.userId] && !friendRequestSentTo[s.userId]) {
                      handleSendFriendRequest(s.userId);
                    }
                  });
                }}
                stream={remoteStreams[0].stream}
                screenShareStream={remoteStreams[0].screenStream || null}
                {...getRemoteTileProfile(remoteStreams[0])}
                showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
                showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
                onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
                isRainchecking={isRainchecking}
                borderBottomClass="md:bottom-4"
                hideNameOnMobile={true}
                gift={activeRemoteGift?.targetUserId === remoteStreams[0]?.userId ? activeRemoteGift.gift : null}
                onGiftAnimationComplete={handleRemoteGiftComplete}
                multiUserAvatars={remoteStreams.map(s => getRemoteTileProfile(s).displayPictureUrl)}
                onClickMultiUserAvatars={() => setShowGroupMembersModal(true)}
                hideReportOnMobile={true}
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
                showLeaveNextButton={status === 'connected'}
                leaveIconType={remoteStreams.length > 1 ? 'exit' : 'next'}
                onLeaveOrNext={handleLeaveGroupOrRaincheck}
                onReportClick={() => setShowGroupMembersModal(true)}
                borderBottomClass="md:bottom-4"
                hideNameOnMobile={true}
                hideAddFriendOnMobile={true}
                gift={activeRemoteGift?.targetUserId === remoteStreams[1]?.userId ? activeRemoteGift.gift : null}
                onGiftAnimationComplete={handleRemoteGiftComplete}
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
                hideNameOnMobile={true}
                hideAddFriendOnMobile={true}
                hideReportOnMobile={true}
                gift={activeRemoteGift?.targetUserId === remoteStreams[2]?.userId ? activeRemoteGift.gift : null}
                onGiftAnimationComplete={handleRemoteGiftComplete}
              />
              <div className={clsx('relative', 'min-h-0', 'min-w-0', 'md:rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5')}>
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
                <LocalVideoSection {...localVideoProps} hideMobileControlsRow={true} />
              </div>
            </div>

          </>

        )}


        {remoteStreams.length >= 2 && (
          <MobileMultiUserControls
            toggleCam={localVideoProps.toggleCam}
            isCamOff={localVideoProps.isCamOff}
            onChatButtonClick={localVideoProps.onChatButtonClick || (() => localVideoProps.setShowChatInput(!localVideoProps.showChatInput))}
            setIsDareOpen={localVideoProps.setIsDareOpen}
            setIsGiftModalOpen={localVideoProps.setIsGiftModalOpen}
            isScreenSharing={localVideoProps.isScreenSharing}
            onToggleScreenShare={localVideoProps.onToggleScreenShare}
          />
        )}

        {!(remoteStreams.length === 0 && !isBroadcasting) && (
          <QuickActions
            showChatInput={showChatInput}
            callRoles={callRoles}
            toggleRandomness={toggleRandomness}
            handleIcebreaker={handleIcebreaker}
            isGiftModalOpen={isGiftModalOpen}
            isDareOpen={isDareOpen}
            onLeaveOrNext={remoteStreams.length >= 2 ? handleLeaveGroupOrRaincheck : null}
            isRainchecking={isRainchecking}
          />
        )}

        {/* In-call nav moved onto local tile */}

        <CoinModal isOpen={isCoinModalOpen} onClose={() => setIsCoinModalOpen(false)} />

        <GiftOverlay
          isOpen={isGiftModalOpen}
          onClose={() => {
            setIsGiftModalOpen(false);
            setSelectedGiftId(null);
          }}
          onOpenCoinModal={() => setIsCoinModalOpen(true)}
          onSelectGift={(gift) => setSelectedGiftId(gift.id)}
          selectedGiftId={selectedGiftId}
          coins={coins}
          onSendGift={(gift) => {
            const targetId = remoteStreamsRef.current[0]?.userId;
            if (targetId && roomInfoRef.current?.roomId) {
              const msgId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
              send({
                type: 'chat-message',
                data: {
                  roomId: roomInfoRef.current.roomId,
                  message: JSON.stringify({
                    isGift: true,
                    messageId: msgId,
                    gift: gift,
                    targetUserId: targetId,
                    senderId: userIdRef.current
                  })
                }
              });
            }
            setIsGiftModalOpen(false);
            setSelectedGiftId(null);
          }}
        />

        <DareOverlay
          isOpen={isDareOpen}
          onClose={() => {
            setIsDareOpen(false);
            setSelectedGiftId(null);
            setDareAcceptanceStatus("idle");
          }}
          selectedGiftId={selectedGiftId}
          onSelectGift={(giftId) => setSelectedGiftId(giftId)}
          onDareSync={handleDareSync}
          dareAcceptanceStatus={dareAcceptanceStatus}
          onSendDare={handleSendDare}
          coins={coins}
          onOpenCoinModal={() => setIsCoinModalOpen(true)}
          recipientName={remoteStreams.length > 0 ? (remoteStreams[0].name || "Stranger") : "Sanya"}
        />

        <DareProposalOverlay
          isOpen={!!activeDareProposal}
          proposal={activeDareProposal}
          onAccept={() => handleDareResponse(true)}
          onReject={() => handleDareResponse(false)}
        />

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
          isBroadcasting={isBroadcasting}
          handleBeamcast={handleBeamcast}
          handleStopBeamcast={handleStopBeamcast}
          setShowWaitlist={setShowWaitlist}
        />


        {showGroupMembersModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in" onClick={() => setShowGroupMembersModal(false)}>
            <div className="bg-gray-900 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-black text-lg">Group Members</h3>
                <button onClick={() => setShowGroupMembersModal(false)} className="text-white/50 hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                {remoteStreams.map(s => {
                  const profile = getRemoteTileProfile(s);
                  const isSent = friendRequestSentTo[s.userId];
                  const isFriend = friendshipWithRemote[s.userId];
                  return (
                    <div key={s.userId} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
                        <img src={profile.displayPictureUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold truncate font-otomanopee">{profile.name || 'Matched!'}</div>
                        {profile.city && profile.city !== 'Unknown' && (
                          <div className="text-white/50 text-xs truncate font-['Outfit']">{profile.city}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!isFriend && (
                          <button
                            onClick={() => {
                              if (!isSent) handleSendFriendRequest(s.userId);
                            }}
                            disabled={isSent}
                            className={clsx(
                              "px-4 py-2 rounded-full text-sm font-bold transition-all",
                              isSent ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                            )}
                          >
                            {isSent ? 'Sent' : 'Add'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            console.log("Reported", s.userId);
                            setShowGroupMembersModal(false);
                          }}
                          className="px-4 py-2 rounded-full text-sm font-bold transition-all bg-red-500/20 text-red-400 hover:bg-red-500/40 active:scale-95"
                        >
                          Report
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}




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

        {/* QA debug badge: room-health protection status */}
        {(roomHealthDebug.graceActive || roomHealthDebug.failureCount > 0) && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[70]">
            <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-[11px] text-white font-mono">
              {roomHealthDebug.graceActive
                ? `PullStranger grace active: ${roomHealthDebug.graceRemainingSec}s`
                : `Room health retries: ${roomHealthDebug.failureCount}/6`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


const styles = {};
