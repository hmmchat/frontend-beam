'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import FilterButtons from '@/components/ui/FilterButtons';
import MeetNowButton from '@/components/ui/MeetNowButton';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import { IoLogOutOutline, IoClose, IoMic, IoMicOff, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
import { API, apiRequest } from '@/lib/api';
import {
  enterDiscovery,
  exitDiscovery,
  exitDiscoveryKeepalive,
  startDiscoveryHeartbeat,
  stopDiscoveryHeartbeat,
  enterCall,
  isDiscoveryActiveElsewhere,
  isDiscoveryLeader,
  exitCallToHome,
} from '@/lib/discovery-presence';
import { setPresenceStatusKeepalive } from '@/lib/presence-status';
import { subscribePresenceRealtime } from '@/lib/presence-realtime';
import { subscribeTabCoordinator } from '@/lib/tab-coordinator';
import {
  getNotificationBadgeCount,
  getNotificationCountThrottled,
  subscribeNotificationRealtime,
  subscribeNotificationCount,
} from '@/lib/notification-count';
import FaceCard4 from './FaceCard4';
import LocalVideo from './LocalVideo';
import clsx from 'clsx';
import { getFacecardPhotos, buildDiscoveryCityFaceCardUser } from '@/lib/facecard-utils';
import { clearPendingReferralCode } from '@/components/CaptureReferralFromUrl';

import FaceCard from './FaceCard';
import CoinModal from '@/components/modals/CoinModal';
import MeetSomeoneNew from './MeetSomeoneNew';
import OverlayLayer from '@/components/ui/OverlayLayer';
import SquadInviteFriendsModal from '@/components/Home/SquadInviteFriendsModal';
import SquadQuickInviteStrip from '@/components/Home/SquadQuickInviteStrip';
import Link from 'next/link';
import Skeleton from '@/components/ui/Skeleton';
import { IoIosArrowBack, IoIosArrowForward, IoIosArrowRoundBack,} from 'react-icons/io';
import SearchingPopup from './SearchingPopup';

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




export default function MeetSomeoneDynamic() {
  const router = useRouter();
  const pathname = usePathname();
  const flowLog = (...args) => console.log('[RaincheckFlow][home]', ...args);
  const [currentCard, setCurrentCard] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [swiping, setSwiping] = useState(false);
  const [coins, setCoins] = useState(0);
  const [mode, setMode] = useState('solo');
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [squadInviteOpen, setSquadInviteOpen] = useState(false);
  const [squadLobby, setSquadLobby] = useState(null);
  const [squadMeetBusy, setSquadMeetBusy] = useState(false);
  const [squadShareBusy, setSquadShareBusy] = useState(false);
  const [quickInviteFriends, setQuickInviteFriends] = useState([]);
  const [quickInviteBusyId, setQuickInviteBusyId] = useState(null);
  const [quickInvitePendingIds, setQuickInvitePendingIds] = useState(() => new Set());
  const [squadMemberActionBusyId, setSquadMemberActionBusyId] = useState(null);
  const [squadProductMessage, setSquadProductMessage] = useState('');
  const [squadLobbyCall, setSquadLobbyCall] = useState(null);
  const [squadLobbyMicMuted, setSquadLobbyMicMuted] = useState(false);
  const [squadLobbyAudioOff, setSquadLobbyAudioOff] = useState(false);
  const [guestProfiles, setGuestProfiles] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [isResumeLoading, setIsResumeLoading] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [waitingForMatch, setWaitingForMatch] = useState(false);
  const [waitingMatchedUser, setWaitingMatchedUser] = useState(null);
  const [matchedRoom, setMatchedRoom] = useState(null);
  const [activeMeetingCount, setActiveMeetingCount] = useState(0);
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isVideoOn, setIsVideoOn] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('isVideoOn');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });
  const [discoveryBlockedByOtherTab, setDiscoveryBlockedByOtherTab] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isVideoOn', String(isVideoOn));
      localStorage.setItem('isCamOff', String(!isVideoOn));
    }
  }, [isVideoOn]);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('squad') === '1') {
      setMode('squad');
      router.replace('/', { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiRequest(API.USERS.GET_ACTIVE_MEETINGS).catch(() => null);
        if (res && typeof res.count === 'number') {
          setActiveMeetingCount(res.count);
        }
      } catch (e) {
        // fail silently
      }
    };
    fetchMetrics();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchMetrics();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const notifRes = await getNotificationCountThrottled();

        if (notifRes) {
          const count = getNotificationBadgeCount(notifRes);
          setUnreadCount((prev) => (prev === count ? prev : count));
        }
      } catch (e) {
        // fail silently
      }
    };
    const unsubscribe = subscribeNotificationCount((notifRes) => {
      const count = getNotificationBadgeCount(notifRes);
      setUnreadCount((prev) => (prev === count ? prev : count));
    });
    const unsubscribeRealtime = subscribeNotificationRealtime();
    fetchNotifications();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchNotifications();
    }, 30000);
    const onFocus = () => void getNotificationCountThrottled({ force: true, minGapMs: 5000 });
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void getNotificationCountThrottled({ force: true, minGapMs: 5000 });
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      unsubscribe();
      unsubscribeRealtime();
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, []);


  const pollRef = useRef(null);
  const discoveryPollRef = useRef(null);
  const rescueTimeoutRef = useRef(null);
  const initDoneRef = useRef(false);
  const isEnteringCallRef = useRef(false);
  const modeInitRef = useRef(false);
  const prevModeSquadRef = useRef(mode);
  const squadPollRef = useRef(null);
  const squadVideoRoomNavKeyRef = useRef('');
  const isSearchingRef = useRef(false);
  const myUserIdRef = useRef(null);
  const allowUnmountCleanupRef = useRef(false);
  const mountCleanupArmTimerRef = useRef(null);
  const latestSilentFetchIdRef = useRef(0);
  const squadLobbyAudioBusyRef = useRef(false);
  const squadLobbyCallBootstrapBusyRef = useRef(false);
  const squadLobbyAudioWsRef = useRef(null);
  const squadLobbyAudioDeviceRef = useRef(null);
  const squadLobbyAudioSendTransportRef = useRef(null);
  const squadLobbyAudioRecvTransportRef = useRef(null);
  const squadLobbyAudioLocalStreamRef = useRef(null);
  const squadLobbyAudioConsumersRef = useRef({});
  const squadLobbyAudioConsumerUserRef = useRef({});
  const squadLobbyAudioProducerMetaRef = useRef({});
  const squadLobbyAudioElsRef = useRef({});
  const squadLobbyAudioProduceResolverRef = useRef(null);
  const squadLobbyAudioPendingProducersRef = useRef([]);
  const squadLobbyAudioMyProducerIdsRef = useRef(new Set());

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    clearPendingReferralCode();
    window.location.href = '/';
  };

  useEffect(() => {
    let aborted = false;

    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const resumeDiscoveryFromUrl = params?.get('resumeDiscovery') === '1';
    const resumeSessionFromUrl = params?.get('sessionId');
    const pendingRaincheckRaw =
      localStorage.getItem('pendingRaincheckResume') ||
      localStorage.getItem('pendingRaincheckNextCard');
    const forcedResumeRaw = localStorage.getItem('forceDiscoveryResume');
    const resumeOnHomeRaw = localStorage.getItem('resumeDiscoveryOnHome');
    const stickyResumeRaw = localStorage.getItem('stickyDiscoveryResume');
    const safeParse = (raw) => {
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };
    flowLog('mount', {
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      search: typeof window !== 'undefined' ? window.location.search : '',
      hasResumeDiscoveryFromUrl: resumeDiscoveryFromUrl,
      hasPendingRaincheckRaw: Boolean(pendingRaincheckRaw),
      hasForcedResumeRaw: Boolean(forcedResumeRaw),
      hasResumeOnHomeRaw: Boolean(resumeOnHomeRaw)
    });

    fetchMyProfile();
    fetchWalletBalance();

    // Clear stale room from previous session when landing on home page
    localStorage.removeItem('currentRoom');

    // On mount: silently clear any ghost room — fire and forget, don't await
    const clearGhostRoom = async () => {
      if (initDoneRef.current) return;
      initDoneRef.current = true;
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub || payload.uid || payload.id;
        const stuckRoom = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
        if (stuckRoom?.exists && stuckRoom?.roomId) {
          fetch(API.STREAMING.LEAVE_ROOM(stuckRoom.roomId), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId })
          }).catch(() => {});
        }
      } catch (_) {}
    };
    clearGhostRoom();

    const resumePayload =
      safeParse(resumeOnHomeRaw) ||
      safeParse(forcedResumeRaw) ||
      safeParse(pendingRaincheckRaw) ||
      safeParse(stickyResumeRaw);
    const resumeSessionId =
      resumeSessionFromUrl ||
      resumePayload?.sessionId ||
      Date.now().toString();

    const urlSearching = params?.get('searching') === '1';
    const shouldResumeDiscovery =
      resumeDiscoveryFromUrl ||
      Boolean(pendingRaincheckRaw) ||
      Boolean(forcedResumeRaw) ||
      Boolean(resumeOnHomeRaw);

    const beginDiscoverySearchOnMount = async (sid) => {
      if (isDiscoveryActiveElsewhere()) {
        setDiscoveryBlockedByOtherTab(true);
        setIsSearching(false);
        return;
      }
      const nextSid = sid || Date.now().toString();
      setSessionId(nextSid);
      setIsSearching(true);
      setDiscoveryBlockedByOtherTab(false);
      try {
        await enterDiscovery(nextSid);
        if (aborted) return;
        await fetchCard(nextSid, true);
      } catch (err) {
        if (String(err?.message || err).includes('another tab')) {
          setDiscoveryBlockedByOtherTab(true);
          setIsSearching(false);
        }
      }
    };

    const runMount = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (aborted) return;

      let leftCallToHome = false;
      try {
        leftCallToHome = sessionStorage.getItem('hmm:leftCallToHome') === '1';
        if (leftCallToHome) sessionStorage.removeItem('hmm:leftCallToHome');
      } catch (_) {}

      if (shouldResumeDiscovery) {
        flowLog('resume_discovery_from_call', { resumeSessionId });
        localStorage.removeItem('forceDiscoveryResume');
        localStorage.removeItem('pendingRaincheckResume');
        localStorage.removeItem('pendingRaincheckNextCard');
        localStorage.removeItem('resumeDiscoveryOnHome');
        localStorage.removeItem('stickyDiscoveryResume');
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('resumeDiscovery');
          url.searchParams.set('searching', '1');
          window.history.replaceState({ searching: true }, '', url.toString());
        }
        void beginDiscoverySearchOnMount(resumeSessionId);
      } else if (urlSearching) {
        void beginDiscoverySearchOnMount(sessionId || Date.now().toString());
      } else {
        flowLog('home_idle_online');
        setDiscoveryBlockedByOtherTab(isDiscoveryActiveElsewhere());
        if (leftCallToHome) {
          void exitCallToHome().catch(() => setPresenceStatusKeepalive('ONLINE'));
        } else if (!isDiscoveryActiveElsewhere() && (isDiscoveryLeader() || !localStorage.getItem('discoveryTabLeader'))) {
          void exitDiscovery().catch(() => setPresenceStatusKeepalive('ONLINE'));
        }
        setIsSearching(false);
        setCurrentCard(null);
        localStorage.removeItem('forceDiscoveryResume');
        localStorage.removeItem('pendingRaincheckResume');
        localStorage.removeItem('pendingRaincheckNextCard');
        localStorage.removeItem('resumeDiscoveryOnHome');
        localStorage.removeItem('stickyDiscoveryResume');
      }
    };

    void runMount();

    const handlePageExit = () => {
      if (isSearchingRef.current) {
        exitDiscoveryKeepalive();
      } else if (!isDiscoveryActiveElsewhere()) {
        setPresenceStatusKeepalive('ONLINE');
      }
    };
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageExit);

    const handlePopState = () => {
      const nextParams = new URLSearchParams(window.location.search);
      if (nextParams.get('searching') !== '1') {
        setIsSearching(false);
        setCurrentCard(null);
        if (isDiscoveryLeader() || !isDiscoveryActiveElsewhere()) {
          void exitDiscovery();
        }
      }
    };
    window.addEventListener('popstate', handlePopState);

    allowUnmountCleanupRef.current = false;
    mountCleanupArmTimerRef.current = setTimeout(() => {
      allowUnmountCleanupRef.current = true;
    }, 50);

    return () => {
      aborted = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (discoveryPollRef.current) clearInterval(discoveryPollRef.current);
      if (rescueTimeoutRef.current) clearTimeout(rescueTimeoutRef.current);
      if (mountCleanupArmTimerRef.current) {
        clearTimeout(mountCleanupArmTimerRef.current);
        mountCleanupArmTimerRef.current = null;
      }
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('popstate', handlePopState);
      if (
        allowUnmountCleanupRef.current &&
        !isEnteringCallRef.current &&
        isSearchingRef.current &&
        (isDiscoveryLeader() || !isDiscoveryActiveElsewhere())
      ) {
        void exitDiscovery();
      } else if (!isEnteringCallRef.current) {
        stopDiscoveryHeartbeat();
      }
    };
  }, []);

  useEffect(() => {
    isSearchingRef.current = isSearching;
  }, [isSearching]);

  useEffect(() => {
    myUserIdRef.current = myProfile?.id || null;
  }, [myProfile?.id]);

  useEffect(() => {
    const syncTabDiscoveryState = () => {
      setDiscoveryBlockedByOtherTab(isDiscoveryActiveElsewhere() && !isDiscoveryLeader());
    };
    const unsubTab = subscribeTabCoordinator(syncTabDiscoveryState);
    const unsubPresence = subscribePresenceRealtime((payload) => {
      if (!payload?.userId) return;
      if (payload.userId === myUserIdRef.current) {
        void fetchMyProfile();
        if (payload.status === 'ONLINE' && isSearchingRef.current) {
          setIsSearching(false);
          setCurrentCard(null);
        }
      }
    });
    const onPresenceChanged = () => void fetchMyProfile();
    if (typeof window !== 'undefined') {
      window.addEventListener('presence:changed', onPresenceChanged);
    }
    syncTabDiscoveryState();
    return () => {
      unsubTab();
      unsubPresence();
      if (typeof window !== 'undefined') {
        window.removeEventListener('presence:changed', onPresenceChanged);
      }
    };
  }, [myProfile?.id]);

  const beginDiscoverySearch = async (sid = null) => {
    if (isDiscoveryActiveElsewhere()) {
      setDiscoveryBlockedByOtherTab(true);
      return;
    }
    const nextSid = sid || sessionId || Date.now().toString();
    setSessionId(nextSid);
    setIsSearching(true);
    setDiscoveryBlockedByOtherTab(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('searching', '1');
      window.history.pushState({ searching: true }, '', url.toString());
    }
    try {
      await enterDiscovery(nextSid);
    } catch (err) {
      if (String(err?.message || err).includes('another tab')) {
        setDiscoveryBlockedByOtherTab(true);
        setIsSearching(false);
        return;
      }
      throw err;
    }
    await fetchCard(nextSid, true);
  };

  const myUserId = myProfile?.id;

  const squadGuestIds = useMemo(() => {
    if (!squadLobby?.memberIds?.length) {
      return [null, null, null];
    }
    const others = squadLobby.memberIds.filter((id) => id && id !== myUserId).slice(0, 3);
    return [0, 1, 2 ].map((i) => others[i] || null);
  }, [squadLobby, myUserId]);

  const isInSquadLobby = Boolean(
    squadLobby &&
      myUserId &&
      Array.isArray(squadLobby?.memberIds) &&
      squadLobby.memberIds.includes(myUserId),
  );
  const canSquadMeet =
    isInSquadLobby &&
    squadLobby.memberIds.length >= 2;

  /**
   * Homepage squad UI: show Meet / Invite slot under "Share to" whenever user is in squad mode
   * on `/` (not only after lobby membership resolves). Meet CTA still requires 2+ members.
   */
  const squadHomeInviteMeetSlotActive =
    mode === 'squad';

  const getStreamingWsUrl = useCallback(() => {
    return API.STREAMING.WS_URL;
  }, []);

  const cleanupSquadLobbyBackgroundAudio = useCallback(() => {
    const ws = squadLobbyAudioWsRef.current;
    if (ws) {
      try {
        ws.close();
      } catch {
        // ignore
      }
      squadLobbyAudioWsRef.current = null;
    }
    Object.values(squadLobbyAudioConsumersRef.current || {}).forEach((consumer) => {
      try {
        consumer?.close?.();
      } catch {
        // ignore
      }
    });
    squadLobbyAudioConsumersRef.current = {};
    squadLobbyAudioConsumerUserRef.current = {};
    squadLobbyAudioProducerMetaRef.current = {};
    squadLobbyAudioProduceResolverRef.current = null;
    squadLobbyAudioPendingProducersRef.current = [];
    squadLobbyAudioMyProducerIdsRef.current = new Set();
    Object.values(squadLobbyAudioElsRef.current || {}).forEach((el) => {
      try {
        el.srcObject = null;
        el.remove();
      } catch {
        // ignore
      }
    });
    squadLobbyAudioElsRef.current = {};
    const local = squadLobbyAudioLocalStreamRef.current;
    if (local) {
      local.getTracks().forEach((track) => track.stop());
      squadLobbyAudioLocalStreamRef.current = null;
    }
    try {
      squadLobbyAudioSendTransportRef.current?.close?.();
    } catch {
      // ignore
    }
    try {
      squadLobbyAudioRecvTransportRef.current?.close?.();
    } catch {
      // ignore
    }
    squadLobbyAudioSendTransportRef.current = null;
    squadLobbyAudioRecvTransportRef.current = null;
    squadLobbyAudioDeviceRef.current = null;
    squadLobbyAudioBusyRef.current = false;
  }, []);

  const refreshSquadLobby = useCallback(async () => {
    try {
      const m = await apiRequest(API.SQUAD.LOBBY_MEMBERSHIP);
      if (m?.role !== 'none' && m?.lobby) {
        setSquadLobby({ ...m.lobby, role: m.role });
      } else {
        setSquadLobby(null);
      }
    } catch {
      setSquadLobby(null);
    }
  }, []);

  useEffect(() => {
    const prev = prevModeSquadRef.current;
    prevModeSquadRef.current = mode;
    if (prev === 'squad' && mode === 'solo') {
      void apiRequest(API.SQUAD.TOGGLE_SOLO, { method: 'POST' }).catch(() => {});
    }
    if (mode !== 'squad') {
      setSquadProductMessage('');
      setSquadLobbyCall(null);
      cleanupSquadLobbyBackgroundAudio();
      setSquadLobbyMicMuted(false);
      setSquadLobbyAudioOff(false);
    } else {
      // Entering squad mode should always start voice lobby with mic/live audio ON by default.
      setSquadLobbyMicMuted(false);
      setSquadLobbyAudioOff(false);
    }
  }, [cleanupSquadLobbyBackgroundAudio, mode]);

  useEffect(() => {
    if (mode !== 'squad') {
      if (squadPollRef.current) {
        clearInterval(squadPollRef.current);
        squadPollRef.current = null;
      }
      return;
    }
    void refreshSquadLobby();
    squadPollRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void refreshSquadLobby();
    }, 4000);
    return () => {
      if (squadPollRef.current) {
        clearInterval(squadPollRef.current);
        squadPollRef.current = null;
      }
    };
  }, [mode, refreshSquadLobby]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ids = squadGuestIds.filter(Boolean);
      for (const id of ids) {
        try {
          const r = await apiRequest(API.USERS.GET_USER(id));
          if (!cancelled && r?.user) {
            setGuestProfiles((p) => (p[id] ? p : { ...p, [id]: r.user }));
          }
        } catch {
          // ignore
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [squadGuestIds]);

  useEffect(() => {
    if (!squadLobby?.memberIds?.length) {
      setGuestProfiles({});
      return;
    }
    const keep = new Set(squadLobby.memberIds.filter(Boolean));
    setGuestProfiles((prev) => {
      const next = {};
      for (const id of keep) {
        if (prev[id]) next[id] = prev[id];
      }
      return next;
    });
  }, [squadLobby]);

  useEffect(() => {
    const track = squadLobbyAudioLocalStreamRef.current?.getAudioTracks?.()[0];
    if (track) {
      track.enabled = !squadLobbyMicMuted;
    }
  }, [squadLobbyMicMuted]);

  useEffect(() => {
    Object.values(squadLobbyAudioElsRef.current || {}).forEach((el) => {
      el.muted = squadLobbyAudioOff;
      if (!squadLobbyAudioOff) {
        el.play?.().catch(() => {});
      }
    });
  }, [squadLobbyAudioOff]);

  useEffect(() => {
    if (mode !== 'squad' || !squadLobby) {
      squadVideoRoomNavKeyRef.current = '';
    }
  }, [mode, squadLobby]);

  const applySquadEnterResponse = useCallback(
    async (data, options = {}) => {
      const { navigate = true } = options;
      const roomKey = data?.roomId || '';
      if (!roomKey) return;
      setSquadLobbyCall({
        roomId: data.roomId,
        sessionId: data.sessionId,
        memberIds: data.memberIds || [],
      });
      if (navigate && squadVideoRoomNavKeyRef.current === roomKey) return;

      const memberIds = data.memberIds || [];
      const others = memberIds.filter((id) => id && id !== myUserId);
      let partner = null;
      if (others[0]) {
        try {
          const pr = await apiRequest(API.USERS.GET_USER(others[0]));
          const u = pr?.user || {};
          let age = '';
          if (u.dateOfBirth) {
            const dob = new Date(u.dateOfBirth);
            if (!Number.isNaN(dob.getTime())) {
              const now = new Date();
              let years = now.getFullYear() - dob.getFullYear();
              const monthDiff = now.getMonth() - dob.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) years--;
              age = years >= 0 ? String(years) : '';
            }
          }
          partner = {
            id: u.id || others[0],
            username: u.username || 'Squad',
            age,
            city: u.preferredCity || '',
            displayPictureUrl: u.displayPictureUrl || '/assets/avatar1.png',
          };
        } catch {
          partner = {
            id: others[0],
            username: 'Squad',
            age: '',
            city: '',
            displayPictureUrl: '/assets/avatar1.png',
          };
        }
      } else {
        partner = {
          id: '',
          username: 'Squad',
          age: '',
          city: '',
          displayPictureUrl: '/assets/avatar1.png',
        };
      }
      isEnteringCallRef.current = true;
      void enterCall();
      localStorage.setItem(
        'currentRoom',
        JSON.stringify({
          roomId: data.roomId,
          sessionId: data.sessionId,
          callType: 'squad',
          memberIds,
          partner,
        }),
      );
      if (navigate) {
        squadVideoRoomNavKeyRef.current = roomKey;
        router.push('/video-chat');
      }
    },
    [myUserId, router],
  );

  const ensureSquadLobbyCallStarted = useCallback(async () => {
    if (mode !== 'squad' || !canSquadMeet) return false;
    if (squadMeetBusy || squadLobbyCallBootstrapBusyRef.current) return false;
    squadLobbyCallBootstrapBusyRef.current = true;
    try {
      const data = await apiRequest(API.SQUAD.ENTER_CALL, {
        method: 'POST',
        body: JSON.stringify({ background: true }),
      });
      await applySquadEnterResponse(data, { navigate: false });
      return true;
    } catch (e) {
      if (e?.status === 410) {
        await refreshSquadLobby();
        return false;
      }
      return false;
    } finally {
      squadLobbyCallBootstrapBusyRef.current = false;
    }
  }, [applySquadEnterResponse, canSquadMeet, mode, refreshSquadLobby, squadMeetBusy]);

  useEffect(() => {
    if (mode !== 'squad' || !canSquadMeet) return;
    if (squadLobbyCall?.roomId) return;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/video-chat')) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || squadLobbyCall?.roomId) return;
      await ensureSquadLobbyCallStarted();
    };
    void tick();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void tick();
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mode, canSquadMeet, squadLobbyCall?.roomId, ensureSquadLobbyCallStarted]);

  // Preserve existing behavior: when any member starts "Meet someone now",
  // everyone in that squad lobby (status IN_CALL) auto-transitions to video page.
  useEffect(() => {
    if (mode !== 'squad' || squadLobby?.status !== 'IN_CALL') return;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/video-chat')) return;

    let cancelled = false;
    (async () => {
      try {
        // Close lobby-only audio first. Closing after ENTER_CALL can make the
        // streaming service mark this user as left just before /video-chat loads.
        cleanupSquadLobbyBackgroundAudio();
        const data = await apiRequest(API.SQUAD.ENTER_CALL, { method: 'POST' });
        if (cancelled) return;
        await applySquadEnterResponse(data, { navigate: true });
      } catch (e) {
        if (e?.status === 410) {
          await refreshSquadLobby();
        }
        // If room isn't ready yet, the next membership poll retries.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySquadEnterResponse, cleanupSquadLobbyBackgroundAudio, mode, refreshSquadLobby, squadLobby?.status]);

  const handleSquadEnterCall = async () => {
    if (!canSquadMeet || squadMeetBusy) return;
    setSquadProductMessage('');
    setSquadMeetBusy(true);
    try {
      // Close lobby audio before explicit call entry so the backend's
      // ENTER_CALL response is the final participant state used by video-chat.
      cleanupSquadLobbyBackgroundAudio();
      const data = await apiRequest(API.SQUAD.ENTER_CALL, { method: 'POST' });
      await applySquadEnterResponse(data);
    } catch (e) {
      if (e?.status === 410) {
        await refreshSquadLobby();
        setSquadProductMessage('');
      } else {
        setSquadProductMessage(e?.message || 'Could not start squad call');
      }
    } finally {
      setSquadMeetBusy(false);
    }
  };

  useEffect(() => {
    const roomId = squadLobbyCall?.roomId;
    const shouldRun =
      mode === 'squad' &&
      Boolean(roomId) &&
      isInSquadLobby &&
      !(typeof window !== 'undefined' && window.location.pathname.startsWith('/video-chat'));

    if (!shouldRun) {
      cleanupSquadLobbyBackgroundAudio();
      return;
    }
    if (squadLobbyAudioWsRef.current || squadLobbyAudioBusyRef.current) return;

    let cancelled = false;
    const send = (msg) => {
      const ws = squadLobbyAudioWsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    const consume = (producerId) => {
      const recvTransport = squadLobbyAudioRecvTransportRef.current;
      const device = squadLobbyAudioDeviceRef.current;
      if (!recvTransport || !device || !roomId) {
        squadLobbyAudioPendingProducersRef.current.push(producerId);
        return;
      }
      send({
        type: 'consume',
        data: {
          roomId,
          transportId: recvTransport.id,
          producerId,
          rtpCapabilities: device.rtpCapabilities,
        },
      });
    };

    const drainPendingLobbyProducers = () => {
      const queued = squadLobbyAudioPendingProducersRef.current.splice(0);
      queued.forEach((pid) => consume(pid));
    };

    const start = async () => {
      squadLobbyAudioBusyRef.current = true;
      try {
        const token = localStorage.getItem('accessToken') || '';
        if (!token) return;
        let userId = '';
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || payload.uid || payload.id || '';
        } catch {
          userId = '';
        }
        if (!userId || !roomId) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const micTrack = stream.getAudioTracks()[0];
        if (micTrack) micTrack.enabled = !squadLobbyMicMuted;
        squadLobbyAudioLocalStreamRef.current = stream;

        const ws = new WebSocket(buildWsUrl(getStreamingWsUrl(), {
          userId,
          roomId,
          token
        }));
        squadLobbyAudioWsRef.current = ws;
        ws.onopen = () => {
          send({
            type: 'join-room',
            data: {
              roomId,
              preserveParticipantOnClose: true,
            },
          });
        };
        ws.onmessage = async (evt) => {
          if (cancelled) return;
          const msg = JSON.parse(evt.data || '{}');
          const { type, data } = msg || {};
          if (type === 'room-joined') {
            const { Device } = await import('mediasoup-client');
            const device = new Device();
            await device.load({ routerRtpCapabilities: data.rtpCapabilities });
            squadLobbyAudioDeviceRef.current = device;
            send({ type: 'create-transport', data: { roomId, producing: true, consuming: false } });
            return;
          }
          if (type === 'transport-created') {
            const { id, iceParameters, iceCandidates, dtlsParameters, producing } = data || {};
            const device = squadLobbyAudioDeviceRef.current;
            if (!device) return;
            if (producing) {
              const transport = device.createSendTransport({ id, iceParameters, iceCandidates, dtlsParameters });
              squadLobbyAudioSendTransportRef.current = transport;
              transport.on('connect', ({ dtlsParameters: dp }, cb) => {
                send({ type: 'connect-transport', data: { roomId, transportId: id, dtlsParameters: dp } });
                cb();
              });
              transport.on('produce', ({ kind, rtpParameters }, cb, errback) => {
                if (kind !== 'audio') {
                  errback?.(new Error('Lobby background only publishes audio'));
                  return;
                }
                // Must match /video-chat: resolve produce callback only after server `produced`.
                squadLobbyAudioProduceResolverRef.current = cb;
                send({ type: 'produce', data: { roomId, transportId: id, kind, rtpParameters } });
              });
              const aTrack = squadLobbyAudioLocalStreamRef.current?.getAudioTracks?.()[0];
              if (aTrack) {
                try {
                  await transport.produce({ track: aTrack });
                } catch {
                  // ignore audio produce errors in lobby mode
                }
              }
              send({ type: 'create-transport', data: { roomId, producing: false, consuming: true } });
              return;
            }
            const transport = device.createRecvTransport({ id, iceParameters, iceCandidates, dtlsParameters });
            squadLobbyAudioRecvTransportRef.current = transport;
            transport.on('connect', ({ dtlsParameters: dp }, cb) => {
              send({ type: 'connect-transport', data: { roomId, transportId: id, dtlsParameters: dp } });
              cb();
            });
            drainPendingLobbyProducers();
            send({ type: 'get-producers', data: { roomId } });
            return;
          }
          if (type === 'producers-list' && Array.isArray(data)) {
            data.forEach((p) => {
              if (!p?.producerId) return;
              if (p.kind && p.kind !== 'audio') return;
              const isSameUser = String(p?.userId || '') === String(userId);
              const isMyProducer = squadLobbyAudioMyProducerIdsRef.current.has(String(p.producerId));
              if (isSameUser && isMyProducer) return;
              if (String(p?.userId || '')) {
                squadLobbyAudioProducerMetaRef.current[String(p.producerId)] = String(p.userId || '');
              }
              consume(p.producerId);
            });
            return;
          }
          if (type === 'new-producer') {
            if (!data?.producerId) return;
            if (data.kind && data.kind !== 'audio') return;
            const isSameUser = String(data?.userId || '') === String(userId);
            const isMyProducer = squadLobbyAudioMyProducerIdsRef.current.has(String(data.producerId));
            if (isSameUser && isMyProducer) return;
            if (String(data?.userId || '')) {
              squadLobbyAudioProducerMetaRef.current[String(data.producerId)] = String(data.userId || '');
            }
            consume(data.producerId);
            return;
          }
          if (type === 'produced') {
            if (data?.id != null) squadLobbyAudioMyProducerIdsRef.current.add(String(data.id));
            if (data?.kind === 'audio') {
              squadLobbyAudioProduceResolverRef.current?.({ id: data.id });
              squadLobbyAudioProduceResolverRef.current = null;
            }
            return;
          }
          if (type === 'consumed') {
            const { id, producerId, kind } = data || {};
            if (!id || !producerId || !kind || kind !== 'audio') return;
            const recvTransport = squadLobbyAudioRecvTransportRef.current;
            if (!recvTransport) return;
            const consumer = await recvTransport.consume({
              id,
              producerId,
              kind,
              rtpParameters: data.rtpParameters,
            });
            squadLobbyAudioConsumersRef.current[id] = consumer;
            const remoteUserId = squadLobbyAudioProducerMetaRef.current[String(producerId)] || String(producerId);
            squadLobbyAudioConsumerUserRef.current[id] = remoteUserId;
            const streamOut = new MediaStream([consumer.track]);
            const audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            audioEl.playsInline = true;
            audioEl.setAttribute('playsinline', 'true');
            audioEl.volume = 1;
            audioEl.style.position = 'fixed';
            audioEl.style.left = '-9999px';
            audioEl.style.top = '0';
            audioEl.style.width = '1px';
            audioEl.style.height = '1px';
            audioEl.style.opacity = '0';
            audioEl.style.pointerEvents = 'none';
            audioEl.srcObject = streamOut;
            audioEl.muted = squadLobbyAudioOff;
            squadLobbyAudioElsRef.current[id] = audioEl;
            try {
              document.body.appendChild(audioEl);
            } catch {
              // ignore
            }
            try {
              await audioEl.play();
            } catch {
              // autoplay might require user gesture; keep element for retry by browser policies
            }
            return;
          }
          if (type === 'participant-left') {
            const leftUserId = String(data?.userId || '');
            Object.entries(squadLobbyAudioConsumerUserRef.current).forEach(([consumerId, ownerId]) => {
              if (String(ownerId) !== leftUserId) return;
              try {
                squadLobbyAudioConsumersRef.current[consumerId]?.close?.();
              } catch {
                // ignore
              }
              delete squadLobbyAudioConsumersRef.current[consumerId];
              delete squadLobbyAudioConsumerUserRef.current[consumerId];
              const el = squadLobbyAudioElsRef.current[consumerId];
              if (el) {
                try {
                  el.srcObject = null;
                  el.remove();
                } catch {
                  // ignore
                }
                delete squadLobbyAudioElsRef.current[consumerId];
              }
            });
          }
        };
      } catch {
        // silent fail: lobby still works even if background audio fails
      } finally {
        squadLobbyAudioBusyRef.current = false;
      }
    };

    void start();
    return () => {
      cancelled = true;
      cleanupSquadLobbyBackgroundAudio();
    };
  }, [
    cleanupSquadLobbyBackgroundAudio,
    getStreamingWsUrl,
    isInSquadLobby,
    mode,
    squadLobbyAudioOff,
    squadLobbyCall?.roomId,
    squadLobbyMicMuted,
  ]);

  const handleRemoveSquadMember = async (memberId) => {
    if (!memberId || squadMemberActionBusyId) return;
    setSquadMemberActionBusyId(memberId);
    setSquadProductMessage('');
    try {
      await apiRequest(API.SQUAD.REMOVE_MEMBER, {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      });
      await refreshSquadLobby();
    } catch (e) {
      setSquadProductMessage(e?.message || 'Could not remove member');
    } finally {
      setSquadMemberActionBusyId(null);
    }
  };

  const handleLeaveSquadSelf = async () => {
    if (!myUserId || squadMemberActionBusyId) return;
    setSquadMemberActionBusyId(myUserId);
    setSquadProductMessage('');
    try {
      const isHost = String(squadLobby?.inviterId || '') === String(myUserId);
      if (isHost) {
        await apiRequest(API.SQUAD.TOGGLE_SOLO, { method: 'POST' });
        setMode('solo');
      } else {
        await apiRequest(API.SQUAD.REMOVE_MEMBER, {
          method: 'POST',
          body: JSON.stringify({ memberId: myUserId }),
        });
      }
      await refreshSquadLobby();
    } catch (e) {
      setSquadProductMessage(e?.message || 'Could not leave squad');
    } finally {
      setSquadMemberActionBusyId(null);
    }
  };

  const getSquadInviteLink = useCallback(async () => {
    const res = await apiRequest(API.SQUAD.INVITE_EXTERNAL, { method: 'POST' });
    const link = String(res?.inviteLink || '').trim();
    if (!link) {
      throw new Error('Could not create squad share link');
    }
    return link;
  }, []);

  const shareSquadInvite = useCallback(
    async (channel = 'generic') => {
      if (squadShareBusy) return;
      setSquadShareBusy(true);
      setSquadProductMessage('');
      try {
        const link = await getSquadInviteLink();
        const shareText = `Join my squad call on HMM: ${link}`;
        if (channel === 'whatsapp') {
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
          return;
        }
        if (channel === 'copy') {
          await navigator.clipboard.writeText(link);
          return;
        }
        if (navigator.share) {
          await navigator.share({ text: shareText, url: link });
          return;
        }
        await navigator.clipboard.writeText(link);
      } catch (e) {
        setSquadProductMessage(e?.message || 'Could not share squad invite link');
      } finally {
        setSquadShareBusy(false);
      }
    },
    [getSquadInviteLink, squadShareBusy]
  );

  const loadQuickInviteFriends = useCallback(async () => {
    if (!squadHomeInviteMeetSlotActive || !myUserId) {
      setQuickInviteFriends([]);
      setQuickInvitePendingIds(new Set());
      return;
    }
    try {
      const [data, pendingData] = await Promise.all([
        apiRequest(API.SQUAD.QUICK_INVITE_SUGGESTIONS),
        apiRequest(API.SQUAD.PENDING_INVITATIONS_LOBBY).catch(() => null),
      ]);
      const memberSet = new Set((squadLobby?.memberIds || []).filter(Boolean));
      setQuickInvitePendingIds(
        new Set(
          (pendingData?.invitations || [])
            .map((x) => x?.inviteeId)
            .filter(Boolean)
            .map(String),
        ),
      );
      const raw = data.suggestions || data.peers || [];
      const mapped = raw
        .map((s) => {
          const id = s.userId || s.friendId || s.peerUserId || s.id;
          if (!id) return null;
          return {
            friendId: String(id),
            photoUrl: s.displayPictureUrl || s.photoUrl || '/assets/avatar1.png',
            username: s.username || 'Friend',
          };
        })
        .filter(Boolean)
        .filter((x) => x.friendId !== String(myUserId) && !memberSet.has(x.friendId));
      setQuickInviteFriends(mapped.slice(0, 3));
    } catch {
      setQuickInviteFriends([]);
      setQuickInvitePendingIds(new Set());
    }
  }, [squadHomeInviteMeetSlotActive, myUserId, squadLobby?.memberIds]);

  useEffect(() => {
    if (mode !== 'squad') {
      setQuickInviteFriends([]);
      setQuickInvitePendingIds(new Set());
      return;
    }
    void loadQuickInviteFriends();
  }, [mode, pathname, loadQuickInviteFriends]);

  const handleQuickSquadInvite = async (friendId) => {
    if (!friendId || quickInviteBusyId) return;
    setQuickInviteBusyId(friendId);
    setSquadProductMessage('');
    try {
      await apiRequest(API.SQUAD.INVITE, {
        method: 'POST',
        body: JSON.stringify({ inviteeId: friendId }),
      });
      setQuickInvitePendingIds((prev) => new Set([...prev, String(friendId)]));
      await refreshSquadLobby();
    } catch (e) {
      setSquadProductMessage(e?.message || 'Could not send invite');
    } finally {
      setQuickInviteBusyId(null);
    }
  };

  const handleQuickSquadCancelInvite = async (friendId) => {
    if (!friendId || quickInviteBusyId) return;
    setQuickInviteBusyId(friendId);
    setSquadProductMessage('');
    try {
      await apiRequest(API.SQUAD.CANCEL_INVITATION, {
        method: 'POST',
        body: JSON.stringify({ inviteeId: friendId }),
      });
      setQuickInvitePendingIds((prev) => {
        const next = new Set(prev);
        next.delete(String(friendId));
        return next;
      });
      await refreshSquadLobby();
    } catch (e) {
      setSquadProductMessage(e?.message || 'Could not cancel invite');
    } finally {
      setQuickInviteBusyId(null);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      const response = await fetch(API.USERS.GET_ME, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMyProfile(data.user);
        
        // "on boot" logic: if location is not set, open the modal
        if (!data.user.preferredCity || data.user.preferredCity === 'Anywhere') {
          setIsLocationModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching my profile:', error);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(API.WALLET.GET_BALANCE, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCoins(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchCard = async (sid = null, isSolo = null) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/');
        return;
      }

      const currentSid = sid || Date.now().toString();
      // isSolo param takes priority over mode state (avoids stale closure)
      const soloMode = isSolo !== null ? isSolo : mode === 'solo';
      // GET /discovery/card uses Bearer JWT — no userId in query params
      const data = await apiRequest(API.DISCOVERY.GET_CARD(currentSid, soloMode));
      console.log('Got Card:', data);
      setCurrentCard(prev => {
        const nextId = data?.card?.userId || data?.card?._id || data?.card?.id;
        const prevId = prev?.userId || prev?._id || prev?.id;
        if (nextId === prevId && prevId) {
          return { ...prev, ...data.card };
        }
        return data?.card || null;
      });
      setSessionId(data.sessionId || currentSid || Date.now().toString());
      if (soloMode) {
        startDiscoveryHeartbeat(data.sessionId || currentSid);
      }

    } catch (error) {
      console.error('Error fetching card:', error);
      setError('Failed to load card. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCardSilently = async (sid = null, isSolo = null) => {
    const reqId = ++latestSilentFetchIdRef.current;
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const currentSid = sid || Date.now().toString();
      const soloMode = isSolo !== null ? isSolo : mode === 'solo';
      flowLog('fetchCardSilently_start', { currentSid, soloMode });
      const data = await apiRequest(API.DISCOVERY.GET_CARD(currentSid, soloMode));
      // Ignore stale/out-of-order responses to prevent split-second wrong-card flashes.
      if (reqId !== latestSilentFetchIdRef.current) return;
      // Force discovery UI whenever backend returns a card during resume/polling.
      // Prevents fallback homepage CTA from showing after StrictMode remounts.
      if (data?.card) {
        setIsSearching(true);
      }
      setCurrentCard(prev => {
        const nextId = data?.card?.userId || data?.card?._id || data?.card?.id;
        const prevId = prev?.userId || prev?._id || prev?.id;
        if (nextId === prevId && prevId) {
          // Preserve existing full profile fields (like zodiac, photos) 
          // when discovery polling returns minimal same-user data.
          return { ...prev, ...data.card };
        }
        return data?.card || null;
      });
      setSessionId(data?.sessionId || currentSid || Date.now().toString());
      if (soloMode) {
        startDiscoveryHeartbeat(data.sessionId || currentSid);
      }
      flowLog('fetchCardSilently_done', {
        hasCard: Boolean(data?.card),
        cardType: data?.card?.type || 'USER'
      });
    } catch (_) {
      flowLog('fetchCardSilently_error');
      // Silent refresh path; ignore transient network errors.
    } finally {
      // Prevent split-second wrong-card flashes by enforcing a brief stable loading gate.
      setTimeout(() => setIsResumeLoading(false), 500);
    }
  };

  const [isDiscoveryUserFetching, setIsDiscoveryUserFetching] = useState(false);

  useEffect(() => {
    // Only reset index when the user actually changes to a different person
    const cardId =
      currentCard?.userId ||
      currentCard?._id ||
      currentCard?.id ||
      (currentCard?.type === 'LOCATION' || currentCard?.isLocationCard
        ? `location:${currentCard?.city ?? ''}`
        : null);
    if (cardId) {
      setCurrentImageIndex(0);

      // Skip full profile fetch if we already have the critical data (photos, zodiac)
      const needsFullProfile = (!currentCard.photos || currentCard.photos.length === 0) && !currentCard.zodiac;
      if (needsFullProfile && currentCard.type !== 'LOCATION' && !currentCard.isLocationCard) {
        const fetchFullCardProfile = async () => {
          try {
            setIsDiscoveryUserFetching(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(API.USERS.GET_USER(cardId), {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.user) {
                // Merge full profile data into current card (especially photos)
                setCurrentCard(prev => {
                  // Only update if it's still the same user
                  const currentId = prev?.userId || prev?._id || prev?.id;
                  if (currentId === cardId) {
                    return { ...prev, ...data.user };
                  }
                  return prev;
                });
              }
            }
          } catch (err) {
            console.error('Failed to fetch full discovery profile:', err);
          } finally {
            setIsDiscoveryUserFetching(false);
          }
        };
        fetchFullCardProfile();
      }
    }
  }, [currentCard?.userId, currentCard?._id, currentCard?.id]);

  const allPhotos = getFacecardPhotos(currentCard);

  const discoveryCityFaceUser = useMemo(() => {
    if (!currentCard || (currentCard.type !== 'LOCATION' && !currentCard.isLocationCard)) return null;
    return buildDiscoveryCityFaceCardUser({
      city: currentCard.city,
      availableCount: currentCard.availableCount,
      faceCardImageUrl: currentCard.faceCardImageUrl,
    });
  }, [
    currentCard?.type,
    currentCard?.isLocationCard,
    currentCard?.city,
    currentCard?.availableCount,
    currentCard?.faceCardImageUrl,
  ]);

  const handleNextImage = (e) => {
    e?.stopPropagation();
    if (!allPhotos.length) return;
    console.log('MeetSomeoneDynamic handleNextImage:', { currentIndex: currentImageIndex, allPhotosCount: allPhotos.length });
    setCurrentImageIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const handlePrevImage = (e) => {
    e?.stopPropagation();
    if (!allPhotos.length) return;
    console.log('MeetSomeoneDynamic handlePrevImage:', { currentIndex: currentImageIndex, allPhotosCount: allPhotos.length });
    setCurrentImageIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };
  useEffect(() => {
    // Do not reset discovery state on first render.
    // This prevents raincheck-resume flow from being overwritten by initial mode effect.
    if (!modeInitRef.current) {
      modeInitRef.current = true;
      return;
    }

    if (mode === 'squad') {
      // Keep homepage baseline ONLINE until user explicitly enters discovery pool via CTA.
      setIsSearching(false);
      setCurrentCard(null);
      setWaitingForMatch(false);
      setWaitingMatchedUser(null);
      clearInterval(pollRef.current);
      clearInterval(discoveryPollRef.current);
      clearTimeout(rescueTimeoutRef.current);
      localStorage.removeItem('stickyDiscoveryResume');
      void exitDiscovery();
    } else {
      // Switching back to solo resets to the landing state
      setIsSearching(false);
      setCurrentCard(null);
      setWaitingForMatch(false);
      setWaitingMatchedUser(null);
      clearInterval(pollRef.current);
      clearTimeout(rescueTimeoutRef.current);
      localStorage.removeItem('stickyDiscoveryResume');
      void exitDiscovery();
    }
  }, [mode]);

  const handleRaincheck = async () => {
    if (!currentCard || swiping) return;

    // If it's a location card, we don't skip it via raincheck API since there's no user ID
    // We just fetch the next card in the rotation
    if (currentCard.type === 'LOCATION' || currentCard.isLocationCard) {
      await fetchCard(sessionId);
      return;
    }

    setSwiping(true);
    setIsResumeLoading(true);
    setCurrentCard(null);
    try {
      await apiRequest(API.DISCOVERY.RAINCHECK, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: sessionId,
          raincheckedUserId: currentCard.userId
        })
      });
      // Always fetch fresh after raincheck; avoid optimistic card payload flashes.
      await fetchCardSilently(sessionId, mode === 'solo');
    } catch (error) {
      console.error('Error rainchecking:', error);
      setError('Failed to skip. Please try again.');
    } finally {
      setSwiping(false);
      setTimeout(() => setIsResumeLoading(false), 500);
    }
  };

  const handleProceed = async () => {
    if (!currentCard || swiping || waitingForMatch) return;

    // If it's a location card, "proceeding" means selecting that location
    if (currentCard.type === 'LOCATION' || currentCard.isLocationCard) {
      await handleSelectLocation(currentCard.city);
      return;
    }

    setSwiping(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No token found');
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      // Pull-stranger is one-way acceptance. Prefer direct room join when available.
      // Do not rely only on card.status because card payloads can be slightly stale.
      let pullStrangerHandled = false;
      try {
        // 1) Prefer strict pull-stranger room lookup
        let roomInfo = await apiRequest(API.STREAMING.GET_PULL_STRANGER_ROOM(currentCard.userId));
        // 2) Fallback to generic active room lookup if card itself signals pull mode
        if ((!roomInfo?.exists || !roomInfo?.roomId) && currentCard.status === 'IN_SQUAD_AVAILABLE') {
          roomInfo = await apiRequest(API.STREAMING.GET_USER_ROOM(currentCard.userId));
        }

        if (roomInfo?.exists && roomInfo?.roomId) {
          console.log('[PullStranger] Target user room:', roomInfo.roomId);

          // 3) Join directly (no mutual-accept waiting state)
          const joinData = await apiRequest(API.STREAMING.JOIN_VIA_PULL_STRANGER(roomInfo.roomId), {
            method: 'POST',
            body: JSON.stringify({
              joiningUserId: userId,
              targetUserId: currentCard.userId
            })
          });

          console.log('[PullStranger] Joined room successfully:', joinData);

          // 4) Sync and navigate to video chat
          localStorage.setItem('currentRoom', JSON.stringify({
            roomId: joinData.roomId || roomInfo.roomId,
            sessionId: joinData.sessionId,
            partner: {
              id: currentCard.userId,
              username: currentCard.username,
              age: currentCard.age,
              city: currentCard.city,
              displayPictureUrl: currentCard.displayPictureUrl
            }
          }));
          isEnteringCallRef.current = true;
      void enterCall();
          router.push('/video-chat');
          return;
        }
      } catch (err) {
        // If this was explicitly a pull-stranger card, surface failure and stop.
        if (currentCard.status === 'IN_SQUAD_AVAILABLE') {
          pullStrangerHandled = true;
          console.warn('[PullStranger] Direct join failed:', err);
          setError('Could not join this squad right now. Please fetch next card.');
          return;
        }
      }

      // For explicit pull-stranger cards we should never enter normal waiting flow.
      if (currentCard.status === 'IN_SQUAD_AVAILABLE' || pullStrangerHandled) {
        return;
      }

      // POST /discovery/proceed — backend identifies caller from JWT
      const data = await apiRequest(API.DISCOVERY.PROCEED, {
        method: 'POST',
        body: JSON.stringify({
          matchedUserId: currentCard.userId,
        })
      });
      
      console.log('Proceed Result:', data);
      
      if (data.roomId) {
        // Perfect case: both accepted AND room created in one shot
        clearInterval(pollRef.current);
        localStorage.setItem('currentRoom', JSON.stringify({
          roomId: data.roomId,
          sessionId: data.sessionId,
          partner: {
            id: currentCard.userId,
            username: currentCard.username,
            age: currentCard.age,
            city: currentCard.city,
            displayPictureUrl: currentCard.displayPictureUrl
          }
        }));
        isEnteringCallRef.current = true;
      void enterCall();
        router.push('/video-chat');
      } else if (data.success && !data.waiting && !data.roomId) {
        // Backend says both accepted, but failed to create the streaming room!
        // The backend specifically expects the frontend to create the room manually if this happens.
        console.log("Both accepted, but backend room creation failed. Creating room via frontend...");
        try {
          const roomData = await apiRequest(API.STREAMING.CREATE_ROOM, {
            method: 'POST',
            body: JSON.stringify({
              userIds: [userId, currentCard.userId],
              callType: 'matched'
            })
          });
          if (roomData && roomData.roomId) {
            clearInterval(pollRef.current);
            localStorage.setItem('currentRoom', JSON.stringify({
              roomId: roomData.roomId,
              sessionId: roomData.sessionId || sessionId,
              partner: {
                id: currentCard.userId,
                username: currentCard.username,
                age: currentCard.age,
                city: currentCard.city,
                displayPictureUrl: currentCard.displayPictureUrl
              }
            }));
            isEnteringCallRef.current = true;
      void enterCall();
            router.push('/video-chat');
            return;
          }
        } catch (roomErr) {
          console.error("Frontend fallback room creation failed:", roomErr);
          
          // If user is already in an active room, that IS the room — just use it
          if (roomErr.message && roomErr.message.includes("already in an active room")) {
            try {
              const existingRoom = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
              if (existingRoom?.exists && existingRoom?.roomId) {
                clearInterval(pollRef.current);
                localStorage.setItem('currentRoom', JSON.stringify({
                  roomId: existingRoom.roomId,
                  sessionId: existingRoom.sessionId || sessionId,
                  partner: {
                    id: currentCard.userId,
                    username: currentCard.username,
                    age: currentCard.age,
                    city: currentCard.city,
                    displayPictureUrl: currentCard.displayPictureUrl
                  }
                }));
                isEnteringCallRef.current = true;
      void enterCall();
                router.push('/video-chat');
                return;
              }
            } catch (_) {}
          }

          setError("Match found, but video servers are currently unreachable. Please try again.");
        }
      } else if (data.waiting) {
        // We liked them, waiting for them to accept
        // Show the waiting overlay and poll MY_ROOM instead of proceed.
        // Polling proceed again would re-consume the already-deleted match record = infinite loop!
        setWaitingForMatch(true);
        setWaitingMatchedUser(currentCard);

        // Poll for room assignment every 3s.
        // Two-step check:
        // 1. Discovery's /my-room (Redis) — fast, set when room is created
        // 2. Streaming's /users/:userId/room — ground truth, catches "already in room" cases
        //
        // Race condition rescue: after 4 empty ticks (~12s), retry /proceed once.
        let emptyPollCount = 0;
        // Max ~90s wait (30 ticks × 3s) then auto-cancel to avoid infinite spinner
        const MAX_POLL_TICKS = 30;

        const startPollingRoom = () => {
          pollRef.current = setInterval(async () => {
            try {
              // Single source of truth: GET /streaming/users/:userId/room
              // The /discovery/my-room endpoint is test-only and not exposed by gateway.
              // The streaming endpoint is the real authenticated ground truth.
              const streamData = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
              if (streamData.exists && streamData.roomId) {
                clearInterval(pollRef.current);
                clearTimeout(rescueTimeoutRef.current);
                localStorage.setItem('currentRoom', JSON.stringify({
                  roomId: streamData.roomId,
                  sessionId: streamData.sessionId || streamData.roomId,
                  partner: {
                    id: currentCard.userId,
                    username: currentCard.username,
                    age: currentCard.age,
                    city: currentCard.city,
                    displayPictureUrl: currentCard.displayPictureUrl
                  }
                }));
                isEnteringCallRef.current = true;
      void enterCall();
                router.push('/video-chat');
                return;
              }

              // Auto-cancel after MAX_POLL_TICKS if other user never accepted
              emptyPollCount++;
              if (emptyPollCount >= MAX_POLL_TICKS) {
                clearInterval(pollRef.current);
                setWaitingForMatch(false);
                setWaitingMatchedUser(null);
                setError('The other person did not respond in time. Fetching next card...');
                setTimeout(() => setError(''), 3000);
                fetchCard(sessionId);
              }
            } catch {}
          }, 3000);
        };

        startPollingRoom();

      } else {
        // Truly unexpected state — fetch next card as last resort
        await fetchCard(sessionId);
      }

    } catch (error) {
      console.error('Error proceeding:', error);
      setError('Failed to connect. Please try again.');
    } finally {
      setSwiping(false);
    }
  };

  // Cancel waiting / go back to swiping
  const handleCancelWaiting = () => {
    clearInterval(pollRef.current);
    clearTimeout(rescueTimeoutRef.current);
    setWaitingForMatch(false);
    setWaitingMatchedUser(null);
    fetchCard(sessionId);
  };

  const handleSelectLocation = async (city, { persistPreference = false } = {}) => {
    setSwiping(true);
    try {
      const data = await apiRequest(API.DISCOVERY.SELECT_LOCATION, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: sessionId,
          city: city,
          persistPreference,
        })
      });

      if (data.success && data.nextCard) {
        setCurrentCard(data.nextCard);
      } else {
        await fetchCard(sessionId);
      }
    } catch (error) {
      console.error('Error selecting location:', error);
      setError('Failed to select location. Please try again.');
    } finally {
      setSwiping(false);
    }
  };


  const user = currentCard;

  useEffect(() => {
    // Production heartbeat: while user is in discovery pool, always poll.
    // This keeps cards fresh and makes transitions (location -> facecard,
    // acceptance hints, rematches) reliable without manual refresh.
    const shouldPollDiscovery = isSearching && !waitingForMatch && !swiping;

    if (!shouldPollDiscovery) {
      if (discoveryPollRef.current) {
        clearInterval(discoveryPollRef.current);
        discoveryPollRef.current = null;
      }
      return;
    }

    discoveryPollRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchCardSilently(sessionId || null, mode === 'solo');
    }, 5000);

    return () => {
      if (discoveryPollRef.current) {
        clearInterval(discoveryPollRef.current);
        discoveryPollRef.current = null;
      }
    };
  }, [isSearching, waitingForMatch, swiping, sessionId, mode]);

  return (
    <>




    <div className={clsx('relative', 'md:min-h-screen','', 'h-[100dvh]', 'w-full', 'overflow-hidden', 'font-[family-name:var(--font-otomanopee)]')}>
      <main className={clsx('grid', 'grid-cols-1', 'md:grid-cols-2', 'h-screen', 'overflow-hidden')}>


      
        {/* MOBILE VIEW (CONDITIONAL) */}

      {!isSearching && (
          <div className={clsx('block', 'md:hidden ')}>
            <MeetSomeoneNew 
              onMeetNow={async () => {
                await beginDiscoverySearch();
              }}
              mode={mode}
              setMode={setMode}
              coins={coins}
              activeUsers={activeMeetingCount}
              myProfile={myProfile}
              unreadCount={unreadCount}

              // Squad props
              squadLobby={squadLobby}
              guestProfiles={guestProfiles}
              squadGuestIds={squadGuestIds}
              canSquadMeet={canSquadMeet}
              handleSquadEnterCall={handleSquadEnterCall}
              shareSquadInvite={shareSquadInvite}
              squadShareBusy={squadShareBusy}
              squadMeetBusy={squadMeetBusy}
              handleRemoveSquadMember={handleRemoveSquadMember}
              squadMemberActionBusyId={squadMemberActionBusyId}
              squadLobbyMicMuted={squadLobbyMicMuted}
              setSquadLobbyMicMuted={setSquadLobbyMicMuted}
              squadLobbyAudioOff={squadLobbyAudioOff}
              setSquadLobbyAudioOff={setSquadLobbyAudioOff}
              quickInviteFriends={quickInviteFriends}
              quickInviteBusyId={quickInviteBusyId}
              quickInvitePendingIds={quickInvitePendingIds}
              handleQuickSquadInvite={handleQuickSquadInvite}
              handleQuickSquadCancelInvite={handleQuickSquadCancelInvite}
              refreshSquadLobby={refreshSquadLobby}
              loadQuickInviteFriends={loadQuickInviteFriends}
              squadProductMessage={squadProductMessage}
            />
          </div>
        )}


        {/* LEFT SIDE (DESKTOP) */}
<div className={clsx('hidden', 'md:flex', 'relative', 'h-full', 'min-h-0', 'flex-col', 'items-center', 'justify-center', 'overflow-hidden', 'bg-gradient-purple-dark', 'px-6', 'py-10', 'md:py-16', 'lg:py-8')}>

  <div
    className={clsx('absolute', 'inset-0', 'z-0')}
    style={{
      backgroundImage: 'url(/assets/mb.jpg)',
      backgroundRepeat: 'repeat',
      backgroundSize: 'cover',
    }}
  />

  {/* 🔲 HUD BORDER FRAME (Desktop Left) */}
  <div className={clsx('hidden', 'md:block', 'absolute', 'inset-6', 'border-2', 'border-white/30', 'rounded-[60px]', 'pointer-events-none', 'z-30')} />
        
          {isSearching ? (
            <div
              className={clsx(
                'relative',
                'flex',
                'h-full',
                'min-h-0',
                'w-full',
                'flex-1',
                'flex-col',
                'items-center',
                'justify-center',
                'p-2'
              )}
            >
              {!currentCard || isResumeLoading ? (
                <div className={clsx('relative', 'w-full', 'h-full', 'flex', 'items-center', 'justify-center')}>
                  <SearchingPopup 
                    isVisible={true} 
                    onCancel={() => {
                      setIsSearching(false);
                      setCurrentCard(null);
                      if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('searching');
                        window.history.pushState({}, '', url.toString());
                      }
                      void exitDiscovery();
                    }} 
                  />
                </div>
              ) : currentCard.type === 'LOCATION' || currentCard.isLocationCard ? (
                discoveryCityFaceUser ? (
                  <div className={clsx('relative', 'flex', 'h-full', 'w-full', 'flex-col', 'overflow-hidden')}>
                    <div className={clsx('flex', 'w-full', 'flex-col', 'items-center', 'justify-center', 'px-4')}>
                      <FaceCard4
                        user={discoveryCityFaceUser}
                        hideArrows={true}
                        currentIndex={currentImageIndex}
                        onIndexChange={setCurrentImageIndex}
                      />
                    </div>
                    <div className={clsx('absolute', 'bottom-1', 'left-0', 'w-full', 'px-4', 'z-50')}>
                      <div className={clsx('flex', 'items-center', 'justify-between', 'gap-3', 'mx-auto')}>
                        <button onClick={handlePrevImage} className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-2xl', 'backdrop-blur-md', 'hover:bg-white/10', 'transition', 'active:scale-90')}>
                          <IoIosArrowBack />
                        </button>
                        <div className={clsx('flex', 'flex-1', 'items-center', 'gap-3')}>
                          <button onClick={handleRaincheck} className={clsx('flex-1', 'py-3', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-sm', 'backdrop-blur-md', 'hover:bg-white/10', 'hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]', 'hover:scale-105', 'transition-all', 'duration-300', 'active:scale-95')}>
                            Raincheck!
                          </button>
                          <button onClick={handleProceed} className={clsx('flex-1', 'py-3', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-sm', 'backdrop-blur-md', 'hover:bg-white/10', 'hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]', 'hover:scale-105', 'transition-all', 'duration-300', 'active:scale-95')}>
                            Meet rn
                          </button>
                        </div>
                        <button onClick={handleNextImage} className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-2xl', 'backdrop-blur-md', 'hover:bg-white/10', 'transition', 'active:scale-90')}>
                          <IoIosArrowForward />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : (
             <div className={clsx('relative', 'flex', 'h-full', 'w-full', 'flex-col', 'overflow-hidden')}>

  {/* CENTER CONTENT */}
<div className={clsx('flex', 'w-full', 'flex-col', 'items-center', 'justify-center', 'px-4')}>
    <FaceCard4
      user={currentCard} 
      hideArrows={true} 
      currentIndex={currentImageIndex}
      onIndexChange={setCurrentImageIndex}
    />
  </div>

  {/* 🔥 FIXED BOTTOM BUTTONS */}
  <div className={clsx('absolute', 'bottom-1', 'left-0', 'w-full', 'px-4', 'z-50')}>
    <div className={clsx('flex', 'items-center', 'justify-between', 'gap-3', 'mx-auto')}>

      <button onClick={handlePrevImage} className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-2xl', 'backdrop-blur-md', 'hover:bg-white/10', 'transition', 'active:scale-90')}>
        <IoIosArrowBack />
      </button>

      <div className={clsx('flex', 'flex-1', 'items-center', 'gap-3')}>
        <button onClick={handleRaincheck} className={clsx('flex-1', 'py-3', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-sm', 'backdrop-blur-md', 'hover:bg-white/10', 'hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]', 'hover:scale-105', 'transition-all', 'duration-300', 'active:scale-95')}>
          Raincheck!
        </button>

        <button onClick={handleProceed} className={clsx('flex-1', 'py-3', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-sm', 'backdrop-blur-md', 'hover:bg-white/10', 'hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]', 'hover:scale-105', 'transition-all', 'duration-300', 'active:scale-95')}>
          Meet rn
        </button>
      </div>

      <button onClick={handleNextImage} className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-2xl', 'backdrop-blur-md', 'hover:bg-white/10', 'transition', 'active:scale-90')}>
        <IoIosArrowForward />
      </button>

    </div>
  </div>

</div>
              )}

                </div>
          ) : (
            <div className={clsx('relative', 'w-full', 'h-full', 'flex', 'items-center', 'justify-center')}>
              <div className={clsx( 'w-full', 'h-[96vh]', 'justify-center', 'items-center', 'flex', 'rounded-[3rem]', 'relative')}>
                <div className={clsx('z-10', 'text-center', 'max-w-lg', 'p-2')}>
                  <img src="/LOGO.png" className={clsx('md:w-60', 'mx-auto', 'w-44')} />
                  <p className={clsx('text-white', 'text-[21px]', '-mt-2', 'font-[family-name:var(--font-otomanopee)]')}>Meet someone here</p>
                  <div className={clsx('inline-flex', 'gap-1', 'mt-5', 'font-[family-name:var(--font-otomanopee)]')}>
                    <img src="/assets/video-on.svg" alt="" className={clsx('w-5', 'h-5' )} />
                    <p className='text-[14px] font-thin font-outfit '>
                      {activeMeetingCount !== null ? activeMeetingCount.toLocaleString() : '0'} beaming now
                    </p>
                  </div>
                </div>

                {/* Searching Popup removed - no loading overlay on left side */}
              </div>
            </div>
          )}
        </div>



        {/* RIGHT SIDE (DESKTOP) */}
<div className={clsx("relative w-full h-full overflow-hidden", !isSearching && "hidden md:block")}>

{/* 🔲 HUD BORDER FRAME (Desktop Right) */}
<div className={clsx('hidden', 'md:block', 'absolute', 'inset-6', 'border-2', 'border-white/30', 'rounded-[60px]', 'pointer-events-none', 'z-30')} />

<div
  className={clsx('absolute', 'inset-0',  'opacity-70', 'mix-blend-hard-light', 'md:animate-zoom-slow')}
  style={{
    backgroundImage: 'url(/bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',

  }}
/>    

      

          {/* Overlay for better text visibility */}



          {/* Coins pill (restore original placement) */}
          <div className={clsx('absolute', 'top-2', 'md:top-18', 'left-16', 'z-50', isSearching && 'hidden')}>
            <button className={clsx('inline-flex', 'items-center', 'justify-center', 'gap-3', 'px-[20.8px]', 'py-[15px]', 'rounded-full', 'text-base', 'font-semibold', 'border-[2px]', 'border-b-[3px]', 'border-white/50', 'transition-all', 'duration-300', 'ease-out', 'relative', 'overflow-hidden', 'hover:scale-105', 'hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]', 'hover:brightness-110')} onClick={() => setIsCoinModalOpen(true)}>
              <img src="/assets/Coin-token.svg" className={clsx('w-5', 'h-5')} alt="" />
              <div className={clsx('text-sm', 'font-semibold')}>{coins.toLocaleString()}</div>
              <img src="/assets/plus.png" className={clsx('w-4', 'h-4')} alt="" />
            </button>
          </div>

          {/* Top Icons */}
          <div className={clsx('absolute', 'top-2', 'md:top-18', 'left-1/2', '-translate-x-1/2', 'flex', 'gap-2', 'md:gap-[28px]', 'z-50', 'border-2', 'border-white/40', 'rounded-full', 'px-4', 'md:px-[26px]', 'md:py-[9px]', isSearching && 'hidden')}>



             <button 
              onClick={() => {
                if (isSearching) {
                  setOverlay({ open: true, url: '/history', title: 'History' });
                } else {
                  router.push('/history');
                }
              }}
              className={clsx('w-10', 'md:w-[35.6px]', 'h-10', 'md:h-[35px]', 'flex', 'items-center', 'justify-center', 'hover:bg-white/20', 'hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]', 'hover:scale-110', 'rounded-full', 'transition-all', 'duration-300')}
            >
              <img src="/assets/history.svg" className={clsx('w-7', 'h-7')} alt="History" />
            </button>

            
   <button
  onClick={() => {
    if (isSearching) {
      setOverlay({ open: true, url: '/inbox', title: 'Messages' });
    } else {
      router.push('/inbox');
    }
  }}
  className={clsx(
    'w-10',
    'md:w-[35.6px]',
    'h-10',
    'md:h-[35.6px]',
    'flex',
    'items-center',
    'justify-center',
    'hover:bg-white/20',
    'hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]',
    'hover:scale-110',
    'rounded-full',
    'relative',
    'transition-all',
    'duration-300'
  )}
>
  <img
    src="/assets/chattopicon.svg"
    className={clsx('w-6', 'h-6')}
    alt="Messages"
  />

  {unreadCount > 0 && (
    <span
      className={clsx(
        'absolute',
        'top-3',
        '-right-2',
        'w-[10px]',
        'h-[10px]',
        'bg-[#ACE723]',
        'border-2',
        'border-[#1ECB00]',
        'rounded-full',
        'shadow-[0_0_16px_8px_rgba(34,197,94,0.9),0_0_24px_8px_rgba(34,197,94,0.6),0_0_40px_12px_rgba(34,197,94,0.4)]'
      )}
    />
  )}
</button>

         
               {/* Profile — opens My Profile (/profile) */}
<button 
  type="button"
  title="My profile"
  onClick={() => {
    if (isSearching) {
      setOverlay({ open: true, url: '/profile/', title: 'My Profile' });
    } else {
      router.push('/profile/');
    }
  }}
  className={clsx('w-10', 'md:w-[35.6px]', 'h-10', 'md:h-[35.6px]', 'flex', 'items-center', 'justify-center', 'hover:bg-white/20', 'hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]', 'hover:scale-110', 'rounded-full', 'overflow-hidden', 'my-auto', 'transition-all', 'duration-300')}
>
  {myProfile ? (
    <img 
      src={myProfile.displayPictureUrl} 
      onError={(e) => e.currentTarget.src }
      className={clsx('w-8', 'h-8', 'object-cover' , 'rounded-full')}
    />
  ) : (
    <div className={clsx('w-full', 'h-full', 'bg-white/20', 'animate-pulse', 'rounded-full')} />
  )}
</button>
    
    {/* <button 
      onClick={handleLogout}
      className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'hover:bg-red-500/20', 'rounded-full', 'transition-colors')}
      title="Logout"
    >
      <IoLogOutOutline className={clsx('text-white', 'text-2xl')} />
    </button>
 */}



        

          </div>


          <div className={clsx('absolute', 'top-4', 'md:top-18', 'right-16', 'z-50', 'flex', 'gap-2', isSearching && 'hidden')}>

  <Link href="/beam-tv">
  <button className={clsx('md:h-[55px]', 'md:w-[55px]', 'h-10', 'w-10', 'rounded-full', 'border-[1px]', 'border-b-[3px]', 'border-white/60', 'shadow-md', 'transition-all', 'duration-300', 'hover:scale-110', 'hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]', 'items-center', 'justify-center', 'flex')}>
    <img src="/crown.svg" alt="crown" className={clsx('h-6', 'w-6')} />
  </button>
</Link>



          <Link href="/onboarding?intent=1">
            <button 
              className={clsx('md:h-[55px]', 'md:w-[55px]', 'h-10', 'w-10', 'rounded-full', 'border-[1px]', 'border-b-[3px]', 'border-white/60', 'shadow-md', 'transition-all', 'duration-300', 'hover:scale-110', 'hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]', 'items-center', 'justify-center', 'flex')}>
              <img src="/icon1.svg" alt="Prompt" className={clsx('h-6', 'w-6')} />
            </button>
          </Link>



</div>






          

    
          {mode === 'solo' ? (
            /* SOLO VIEW */
<div
  className={clsx(
    'relative z-10 w-full',
    'flex flex-col items-center justify-center',
    'gap-6 h-full mx-auto text-center', 
  )}
>
              {!isSearching ? (
                <>
              <MeetNowButton
                onClick={async () => {
                  await beginDiscoverySearch();
                }}
                isSearching={isSearching}
                className="mt-40 w-[79%] h-30"
               iconClass="md:text-xl transition-all md:h-8 md:w-8 h-6 w-6"
                 borderClass = "md:border-[1.89px] md:border-b-[5.4px] border border-b-[3px] md:rounded-[26px] rounded-[16px]"
                isVideoOn={isVideoOn}
                onVideoClick={() => setIsVideoOn(!isVideoOn)}
              />


   

                  <FilterButtons
                    onGenderClick={() => setIsGenderModalOpen(true)}
                    onLocationClick={() => setIsLocationModalOpen(true)}
                    locationLabel={myProfile?.preferredCity === 'ANYWHERE_IN_INDIA' ? 'Anywhere' : (myProfile?.preferredCity || 'Anywhere')}
                    className={clsx( 'text-white')}
                  />
                  {discoveryBlockedByOtherTab ? (
                    <p className="text-sm text-white/80 max-w-xs px-4">
                      Discovery is active in another tab. Close that tab or continue there to search.
                    </p>
                  ) : null}
                </>
              ) : (
                <div className={clsx('absolute', 'inset-0', 'z-0', 'overflow-hidden',  'shadow-2xl', 'flex flex-col md:block')}>
                  
                  {/* MOBILE VIEW LOGIC: 50/50 split during search/location, Fullscreen for FaceCard */}
                  {(() => {
                    const isSearchingState = !currentCard || isResumeLoading;
                    const isLocationState = currentCard?.type === 'LOCATION' || currentCard?.isLocationCard;
                    const isFaceCardState = !isSearchingState && !isLocationState;

                    return (
                        <>
                          {/* TOP HALF (OR FULL SCREEN) */}
                          <div 
                            className={clsx(
                                "flex md:hidden w-full   relative z-20 items-center justify-center md:pt-14 md:pb-4 md:px-4 overflow-hidden transition-all duration-500",
                                (isFaceCardState || isSearchingState || isLocationState) ? "h-full" : "h-1/2"
                            )}
                            style={{
                              backgroundImage: 'url(/assets/mb.jpg)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            {/* 🔲 HUD BORDER FRAME (Mobile Top/Full) */}
                            <div className={clsx('absolute', 'inset-0',' ' , 'rounded-[2rem]', 'pointer-events-none', 'z-30')} />

                            <div className={clsx(
                                "origin-center transition-transform duration-500 mb-16 sm:mb-0",
                                isFaceCardState ? "scale-[1.1] sm:scale-[1]" : "scale-[1.1] sm:scale-[1]"
                            )}>
                              {isSearchingState ? (
                                <div className={clsx('flex', 'flex-col', 'items-center', 'justify-center', '')}>
                                {/* phone city */}
                                </div>
                              ) : isLocationState && discoveryCityFaceUser ? (
                                <div className={clsx('relative', 'group/card', 'cursor-grab', 'active:cursor-grabbing' , 'w-full', )}>
                                  <FaceCard
                                    user={discoveryCityFaceUser}
                                    hideArrows={true}
                                    currentIndex={currentImageIndex}
                                    onIndexChange={setCurrentImageIndex}
                                  />
                                 <div
  className={clsx(
    'relative',
    'md:bottom-6',
'px-4',
    'w-full',
    'flex',
    'gap-1',
    'items-center',
    'justify-between',
  'bottom-4',
    
  )}
>
  
  {/* LEFT ARROW */}
  <button
    className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center text-white text-2xl hover:text-white transition active:scale-90 shrink-0"
  >
    <IoIosArrowBack />
  </button>

  {/* CENTER BUTTONS */}
  <div className="flex items-center gap-2">
    
    <button
      onClick={handleRaincheck}
      className={clsx(
        'w-[110px]',
        'h-[42px]',
        'flex',
        'items-center',
        'justify-center',
        'rounded-full',
        'border',
        'border-white/30',
        'text-white',
        'text-[12px]',
        'whitespace-nowrap',
        'hover:bg-white/10',
        'transition',
        'active:scale-95'
      )}
    >
      Raincheck!
    </button>

    <button
      onClick={handleProceed}
      className={clsx(
        'w-[110px]',
        'h-[42px]',
        'flex',
        'items-center',
        'justify-center',
        'rounded-full',
        'border',
        'border-white/30',
        'text-white',
        'text-[12px]',
        'whitespace-nowrap',
        'hover:bg-white/10',
        'transition',
        'active:scale-95'
      )}
    >
      Meet rn
    </button>

  </div>

  {/* RIGHT ARROW */}
  <button
    className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center text-white text-2xl hover:border-white transition active:scale-90 shrink-0"
  >
    <IoIosArrowForward />
  </button>

</div>
                                </div>
                              ) : (

                                
                                <div className={clsx('relative', 'group/card', 'cursor-grab', 'active:cursor-grabbing')}>
                                  <FaceCard
                                    user={currentCard} 
                                    hideArrows={true} 
                                    currentIndex={currentImageIndex}
                                    onIndexChange={setCurrentImageIndex}
                                  />

                  <div
  className={clsx(
      'relative',
    'md:bottom-6',
'px-4',
    'w-full',
    'flex',
    'gap-1',
    'items-center',
    'justify-between',
    'bottom-4',

  )}
>

  {/* LEFT ARROW */}
  <button
    onClick={handlePrevImage}
    className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center text-white text-2xl hover:text-white transition active:scale-90 shrink-0">
    <IoIosArrowBack />
  </button>

  {/* CENTER BUTTONS */}
  <div className="flex items-center gap-2">

    <button
      onClick={handleRaincheck}
      className={clsx(
        'w-[110px]',
        'h-[42px]',
        'flex',
        'items-center',
        'justify-center',
        'rounded-full',
        'border',
        'border-white/30',
        'text-white',
        'text-xs',
        'whitespace-nowrap',
        'hover:bg-white/10',
        'transition',
        'active:scale-95'
      )}
    >
      Raincheck!
    </button>

    <button
      onClick={handleProceed}
      className={clsx(
        'w-[110px]',
        'h-[42px]',
        'flex',
        'items-center',
        'justify-center',
        'rounded-full',
        'border',
        'border-white/30',
        'text-white',
        'text-xs',
        'whitespace-nowrap',
        'hover:bg-white/10',
        'transition',
        'active:scale-95'
      )}
    >
      Meet rn
    </button>

  </div>

  {/* RIGHT ARROW */}
  <button
    onClick={handleNextImage}
    className={clsx(
      'relative',
      'z-[110]',
      'w-10',
      'h-10',
      'rounded-full',
      'border',
      'border-white/40',
      'flex',
      'items-center',
      'justify-center',
      'text-white',
      'text-2xl',
      'hover:bg-white/10',
      'transition',
      'active:scale-75',
      'cursor-pointer',
      'backdrop-blur-sm',
      'shrink-0'
    )}
  >
    <IoIosArrowForward />
  </button>

</div>
                                </div>
                              )}
                            </div>

                          </div>

                          {/* BOTTOM HALF (CAM PREVIEW) - Hidden when FaceCard, Searching, or Location is shown on mobile */}
                          {(!isFaceCardState && !isSearchingState && !isLocationState) && (                            <div className={clsx('flex', 'md:hidden', 'h-1/2', 'w-full', 'relative', 'z-[1]', 'min-h-0')}>
                                <div className={clsx('absolute', 'inset-2', 'pointer-events-none', 'z-10')} />
                                <LocalVideo 
                                    showSoloCheckbox={false}
                                    isVideoOn={isVideoOn}
                                    onSoloChange={(checked) => setMode(checked ? 'solo' : 'squad')} 
                                />
                            </div>
                          )}
                        </>
                    );
                  })()}

                  <div className={clsx('hidden', 'md:block', 'relative', 'flex-1', 'md:absolute', 'md:inset-0', 'z-[1]', 'w-full', 'min-h-0')}>
                    {/* 🎥 VIDEO (Desktop only - Mobile video handled above) */}
                    <LocalVideo 
                      showSoloCheckbox={false}
                      isVideoOn={isVideoOn}
                      onSoloChange={(checked) => setMode(checked ? 'solo' : 'squad')} 
                    />
                    
                    {/* 🌫 LIGHT OVERLAY (Desktop only) */}
           

                    {/* 🔲 BORDER FRAME (Desktop only) */}
                    <div className={clsx('hidden', 'md:block', 'absolute', 'inset-4', 'pointer-events-none')} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SQUAD VIEW — stack gap-6 + justify-end (widgets sit low, near bottom bar); Invite/Meet w-[79%] + mt-40 when sole CTA like solo */
            <div
              className={clsx(
                'relative',
                'z-10',
                'flex',
                'h-full',
                'min-h-0',
                'w-full',
                'flex-col',
                'items-center',
                'overflow-y-auto',
                'overflow-x-hidden',
                'overscroll-y-contain',
              )}
            >

              {/* Video background for squad mode */}
              <div className={clsx('absolute', 'inset-0', 'z-0', 'overflow-hidden', 'rounded-2xl')}>
                


              </div>

              <div
                className={clsx(
                  'relative',
                  'z-10',
                  'flex',
                  'h-full',
                  'min-h-0',
                  'w-full',
                  'flex-col',
                  'items-center',

                  'pb-36',
                  'md:pb-40',
                  'px-2',
                )}
              >
                {squadProductMessage ? (
                  <div
                    role="alert"
                    className={clsx(
                      'mx-auto',
                      'mb-2',
                      'mt-4',
                      'w-full',
                      'max-w-lg',
                      'shrink-0',
                      'rounded-2xl',
                      'border',
                      'border-red-400/40',
                      'bg-red-950/45',
                      'px-4',
                      'py-3',
                      'text-left',
                      'text-sm',
                      'font-medium',
                      'text-red-50',
                    )}
                  >
                    {squadProductMessage}
                  </div>
                ) : null}

            <div
                  className={clsx(
                    'relative z-10 flex w-full max-w-4xl flex-1 mt-60 flex-col items-center justify-center gap-10 pb-3 text-center',
                    'min-h-0',
                  )}
                >
                {/* Circles + Share: one column, small gap so the two stacks read as one unit above Invite */}
                <div className={clsx('flex w-full shrink-0 flex-col items-center gap-2 text-center md:gap-2.5')}>
                <div className={clsx('w-full shrink-0 text-center')}>
                <div className={clsx('flex flex-wrap items-center justify-center gap-2 font-sans md:gap-4')}>
                  {/* Me */}
                  <div className={clsx('flex', 'items-center', 'gap-2', 'md:gap-4')}>
                    <div className={clsx('flex', 'flex-col', 'items-center', 'gap-2')}>
                      <div className={clsx('relative', 'w-16', 'h-16', 'md:w-20', 'md:h-20', 'overflow-visible')}>
                        <div className={clsx('w-full', 'h-full', 'rounded-full', 'border-[3.5px]', 'border-white/90', 'flex', 'items-center', 'justify-center', 'overflow-hidden', 'bg-black/10')}>
                          <img src={myProfile?.displayPictureUrl || '/assets/avatar1.png'} alt="me" className={clsx('w-full', 'h-full', 'object-cover')} />
                        </div>
                      </div>
                      <span className="text-xs">Me</span>
                    </div>
                  </div>
                  {squadGuestIds.map((guestId, i) => (
                    <div key={`g-${i}`} className={clsx('flex', 'items-center', 'gap-2', 'md:gap-4')}>
                      <div className={clsx('flex shrink-0 items-center self-center')}>
                        <img src="/assets/plus.png" alt="" className={clsx('w-4', 'h-4', 'opacity-70')} />
                      </div>
                      <div className={clsx('flex', 'flex-col', 'items-center', 'gap-2')}>
                        <div className={clsx('relative', 'w-16', 'h-16', 'md:w-20', 'md:h-20', 'overflow-visible')}>
                          <div className={clsx('w-full', 'h-full', 'rounded-full', 'border-[3.5px]', 'border-white/90', 'flex', 'items-center', 'justify-center', 'overflow-hidden', 'bg-black/10')}>
                            {guestId && guestProfiles[guestId]?.displayPictureUrl ? (
                              <img src={guestProfiles[guestId].displayPictureUrl} alt="" className={clsx('w-full', 'h-full', 'object-cover')} />
                            ) : guestId ? (
                              <span className="text-xl md:text-3xl text-white/60">…</span>
                            ) : (
                              <span className={clsx('text-2xl', 'md:text-3xl', 'text-white')}>?</span>
                            )}
                          </div>
                          {guestId ? (
                            <button
                              type="button"
                              disabled={squadMemberActionBusyId === guestId}
                              onClick={() => handleRemoveSquadMember(guestId)}
                              className={clsx(
                                'absolute',
                                '-top-1',
                                '-right-1',
                                'z-20',
                                'w-6',
                                'h-6',
                                'rounded-full',
                                'bg-red-600',
                                'border',
                                'border-white/90',
                                'text-white',
                                'text-[10px]',
                                'font-bold',
                                'flex',
                                'items-center',
                                'justify-center',
                                'shadow-md',
                                'disabled:opacity-40'
                              )}
                              title="Remove from squad"
                            >
                              x
                            </button>
                          ) : null}
                        </div>
                        <span className="text-xs">{guestId ? guestProfiles[guestId]?.username || 'Friend' : 'Who'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                </div>

                <div className={clsx('flex w-full shrink-0 flex-col items-center')}>
                  {canSquadMeet ? (
                    <div
                      className={clsx(
                        'mb-2',
                        'inline-flex',
                        'items-center',
                        'gap-2',
                        'rounded-full',
                        'border',
                        'border-white/20',
                        'bg-[#0A032D]/45',
                        'px-2',
                        'py-1.5',
                        'backdrop-blur-sm',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSquadLobbyMicMuted((prev) => !prev)}
                        className={clsx(
                          'inline-flex h-9 w-9 items-center justify-center rounded-full border transition',
                          squadLobbyMicMuted
                            ? 'border-red-300/70 bg-red-500/20 text-red-100'
                            : 'border-white/40 text-white hover:bg-white/10',
                        )}
                        title={squadLobbyMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                      >
                        {squadLobbyMicMuted ? <IoMicOff className="text-lg" /> : <IoMic className="text-lg" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSquadLobbyAudioOff((prev) => !prev)}
                        className={clsx(
                          'inline-flex h-9 w-9 items-center justify-center rounded-full border transition',
                          squadLobbyAudioOff
                            ? 'border-yellow-300/70 bg-yellow-500/20 text-yellow-100'
                            : 'border-white/40 text-white hover:bg-white/10',
                        )}
                        title={squadLobbyAudioOff ? 'Turn audio on' : 'Turn audio off'}
                      >
                        {squadLobbyAudioOff ? <IoVolumeMute className="text-lg" /> : <IoVolumeHigh className="text-lg" />}
                      </button>
                    </div>
                  ) : null}
                  <div
                    className={clsx(
                      'inline-flex',
                      'shrink-0',
                      'mt-2',
                      'items-center',
                      'gap-7',
                      'rounded-full',
                      'border',
                      'border-white/15',
                      'bg-[#0A032D]/50',
                      'px-8',
                      'py-2.5',
                      'font-sans',

                      'md:gap-6',
                      'md:px-16',
                      'md:py-2.5',
                    )}
                  >
                    <span className={clsx('text-white', 'text-xs', 'font-medium', 'mr-1' ,'font-outfit')}>Share to</span>
                    <button
                      type="button"
                      disabled={squadShareBusy}
                      onClick={() => void shareSquadInvite('generic')}
                      className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white', 'disabled:opacity-50')}
                    >
                      <img src="/shareicon4.png" className={clsx('w-8', 'h-8')} alt="" />
                    </button>
                    <button
                      type="button"
                      disabled={squadShareBusy}
                      onClick={() => void shareSquadInvite('generic')}
                      className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white', 'disabled:opacity-50')}
                    >
                      <img src="/shareicon2.png" className={clsx('w-7', 'h-7')} alt="" />
                    </button>
                    <button
                      type="button"
                      disabled={squadShareBusy}
                      onClick={() => void shareSquadInvite('whatsapp')}
                      className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white', 'disabled:opacity-50')}
                    >
                      <img src="/shareicon1.png" className={clsx('w-7', 'h-7')} alt="" />
                    </button>
                    <button
                      type="button"
                      disabled={squadShareBusy}
                      onClick={() => void shareSquadInvite('copy')}
                      className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white', 'disabled:opacity-50')}
                    >
                      <img src="/shareicon3.png" className={clsx('w-7', 'h-7')} alt="" />
                    </button>
                  </div>
                </div>
                </div>


                {squadHomeInviteMeetSlotActive && canSquadMeet ? (
                  <MeetNowButton
                    onClick={handleSquadEnterCall}
                    isSearching={squadMeetBusy}
                    searchingText="Starting..."
                    text="Meet Someone now"
                    className="h-20 w-[50%]"
                   iconClass=  "md:text-xl transition-all md:h-6 md:w-6 "
                    borderClass="md:border-[1.8px] md:border-b-[4.4px] border border-b-[3px] md:rounded-[20px] rounded-[16px]"
                    isVideoOn
                  />
                ) : squadHomeInviteMeetSlotActive && quickInviteFriends.length > 0 ? (
                  <SquadQuickInviteStrip
                    friends={quickInviteFriends}
                    busyId={quickInviteBusyId}
                    pendingInviteeIds={quickInvitePendingIds}
                    onInvite={(id) => void handleQuickSquadInvite(id)}
                    onCancelInvite={(id) => void handleQuickSquadCancelInvite(id)}
                    onSeeAll={() => setSquadInviteOpen(true)}
                    className="w-[79%]  "
                  />
                ) : null}
                </div>



              </div>
            </div>
          )}

          {/* SHARED BOTTOM BAR (ALWAYS VISIBLE) */}
          <div className={clsx('absolute', 'px-5', 'bottom-16', 'left-11', 'right-11', 'flex', 'items-center', 'justify-between', 'z-[100]', isSearching && 'hidden')}>
            {/* Left side — fixed height so toggle position never shifts */}
            <div className={clsx('flex', 'items-center', 'h-[72px]')}>
            {mode === 'solo' ? (
              <div className={clsx('flex', 'gap-2', 'items-center')}>
                <div className={clsx('border-2', 'p-3', 'rounded-full', 'flex', 'items-center', 'justify-center', 'border-b-4', 'border-white/40')}>
                <Link href="/beam-tv">
                <button className={clsx('relative', 'h-10', 'w-10', 'l', 'p-3', 'shadow-md', 'hover:border-white', 'hover:scale-110', 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]', 'active:scale-95', 'active:border-b-2', 'transition-all', 'duration-300')}>
  
  {/* TV Frame (background) */}
  <img 
    src="/tvfame.png" 
    className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'object-contain')}
  />

  {/* Beam TV inside frame */}
  <img 
    src="/beamtv.png" 
    className={clsx('absolute', 'inset-0', 'm-auto', 'w-6', 'h-6', 'object-contain', 'ml-1', 'mt-3')}
  />

</button>
                </Link>
</div>



 <div className={clsx('border-2', 'rounded-full', 'border-b-4', '', 'border-white/40')}>
            <Link href="/cards">
  <button className={clsx('h-16', 'w-16', 'rounded-full', 'p-3', 'shadow-md', 'transition-all', 'duration-300', 'hover:scale-110', 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]')}>
    <img src="/hugeiconscards.svg" alt="cards"  />
  </button>
</Link>

    </div>
        </div>
            ) : (
              <div className={clsx('flex', 'gap-4', 'items-center')}>
                <button
                  type="button"
                  onClick={() => setSquadInviteOpen(true)}
                  className={clsx('border', 'rounded-full', 'p-2', 'border-white/70', 'w-11', 'h-11', 'hover:bg-white/10', 'transition')}
                  title="Invite friends"
                >
                  <img src="/assets/search-icon.svg" alt="" className="w-6 h-6 mx-auto" />
                </button>
                <img src="/assets/Vector.svg" alt="" className={clsx('border', 'rounded-full', 'p-[10px]', 'border-white/70', 'w-11', 'h-11')} />
              </div>
            )}
            </div>

            <div className={clsx('relative', 'w-fit', 'flex', 'gap-2', 'border-white/60', 'border', 'rounded-full', 'p-1', 'bg-black/10')}>
              {/* Sliding Pill */}
              <div 
                className={clsx(
                  "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) border-[1.5px] border-white/70 shadow-[0_0_15px_rgba(168,85,247,0.3)]",
                  mode === 'solo' ? "left-1 bg-black/20" : "left-[calc(50%+2px)] bg-black/40"
                )}
              />
              
              <button
                onClick={() => setMode('solo')}
                className={clsx(
                  'px-7 py-2 rounded-full text-[14px] transition-all duration-300 hover:scale-105 z-10 relative',
                  mode === 'solo' ? 'text-white' : 'text-white/40 hover:text-white/60'
                )}
              >
                Solo
              </button>

              <button
                onClick={() => setMode('squad')}
                className={clsx(
                  'px-7 py-2 rounded-full text-[14px]  transition-all duration-300 hover:scale-105 z-10 relative',
                  mode === 'squad' ? 'text-white' : 'text-white/40 hover:text-white/60'
                )}
              >
                Squad
              </button>
            </div>
          </div>



          
        </div>


      </main>

      <OverlayLayer
        open={overlay.open}
        url={overlay.url}
        title={overlay.title}
        onClose={() => setOverlay({ open: false, url: '', title: '' })}
      />

      {/* Modals */}
      <GenderModal isOpen={isGenderModalOpen} onClose={() => setIsGenderModalOpen(false)} />
      <LocationModal 
        isOpen={isLocationModalOpen} 
        onClose={() => {
          setIsLocationModalOpen(false);
          fetchMyProfile();
        }} 
      />
      <CoinModal isOpen={isCoinModalOpen} onClose={() => setIsCoinModalOpen(false)} />
      <SquadInviteFriendsModal
        open={squadInviteOpen}
        onClose={() => setSquadInviteOpen(false)}
        onInviteSent={() => {
          void refreshSquadLobby();
          void loadQuickInviteFriends();
        }}
        squadMemberIds={squadLobby?.memberIds || []}
      />
    </div>



    </>
  );
}
