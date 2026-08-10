'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  clearDiscoveryResumeIntent,
} from '@/lib/discovery-presence';
import { setPresenceStatusKeepalive } from '@/lib/presence-status';
import { subscribePresenceRealtime } from '@/lib/presence-realtime';
import { subscribeTabCoordinator } from '@/lib/tab-coordinator';
import { getFacecardPhotos, buildDiscoveryCityFaceCardUser } from '@/lib/facecard-utils';
import { clearPendingReferralCode } from '@/components/CaptureReferralFromUrl';
import { useNotifications } from './useNotifications';
import { useSquadAudio } from './useSquadAudio';

export default function useMeetSomeone() {
  const router = useRouter();
  const pathname = usePathname();
  const flowLog = (...args) => console.log('[RaincheckFlow][home]', ...args);

  const clearSearchingUrlParam = () => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('searching')) return;
      url.searchParams.delete('searching');
      window.history.replaceState({}, '', url.toString());
    } catch (_) { }
  };

  // ── State ──────────────────────────────────────────────────────────────────
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
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);
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
  const [waitingMessage, setWaitingMessage] = useState("Maybe they fainted, you're that hot!");
  const [waitingMatchedUser, setWaitingMatchedUser] = useState(null);
  const [matchedRoom, setMatchedRoom] = useState(null);
  const [activeMeetingCount, setActiveMeetingCount] = useState(0);
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVideoOn, setIsVideoOn] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('isVideoOn');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });
  const [discoveryBlockedByOtherTab, setDiscoveryBlockedByOtherTab] = useState(false);
  const [isDiscoveryUserFetching, setIsDiscoveryUserFetching] = useState(false);
  /** user | cityHandoff | cityBoxes | emptyOrbit */
  const [deckPhase, setDeckPhase] = useState('user');
  const [availableCities, setAvailableCities] = useState([]);
  const [handoffSecondsLeft, setHandoffSecondsLeft] = useState(5);
  const [handoffCountdownSeconds, setHandoffCountdownSeconds] = useState(10);
  const [handoffValidityPollMs, setHandoffValidityPollMs] = useState(3000);
  const [availableCitiesPollMs, setAvailableCitiesPollMs] = useState(5000);

  // ── Refs ───────────────────────────────────────────────────────────────────
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
  const waitingForMatchRef = useRef(false);
  const waitingMatchedUserRef = useRef(null);
  const currentCardRef = useRef(null);
  const raincheckRematchInFlightRef = useRef(false);
  /** Partners we must never re-show after a raincheck (this session). */
  const excludedPartnerIdsRef = useRef(new Set());
  const sessionIdRef = useRef(null);
  const modeRef = useRef('solo');
  const myUserIdRef = useRef(null);
  const allowUnmountCleanupRef = useRef(false);
  const mountCleanupArmTimerRef = useRef(null);
  const latestSilentFetchIdRef = useRef(0);
  const deckPhaseRef = useRef('user');
  const handoffCityRef = useRef(null);
  const availableCitiesPollRef = useRef(null);
  const handoffTimerRef = useRef(null);
  const handoffCompletingRef = useRef(false);
  const handoffCancelledRef = useRef(false);
  /** After Cancel on city handoff: stay on city boxes until the user taps a city. */
  const manualCitySelectOnlyRef = useRef(false);
  const applyAvailableCitiesRef = useRef(null);
  /** Bumped whenever search is stopped so in-flight enter/fetch/handoff can't re-open matchmaking. */
  const discoveryEpochRef = useRef(0);

  // Mirror some state in refs for event handler closures
  const squadLobbyMicMutedRef = useRef(squadLobbyMicMuted);
  squadLobbyMicMutedRef.current = squadLobbyMicMuted;
  const squadLobbyAudioOffRef = useRef(squadLobbyAudioOff);
  squadLobbyAudioOffRef.current = squadLobbyAudioOff;

  // ── Notifications ──────────────────────────────────────────────────────────
  const { unreadCount } = useNotifications();

  // ── Derived values ─────────────────────────────────────────────────────────
  const myUserId = myProfile?.id;

  const squadGuestIds = useMemo(() => {
    if (!squadLobby?.memberIds?.length) {
      return [null, null, null];
    }
    const others = squadLobby.memberIds.filter((id) => id && id !== myUserId).slice(0, 3);
    return [0, 1, 2].map((i) => others[i] || null);
  }, [squadLobby, myUserId]);

  const isInSquadLobby = Boolean(
    squadLobby &&
    myUserId &&
    Array.isArray(squadLobby?.memberIds) &&
    squadLobby.memberIds.includes(myUserId),
  );

  const canSquadMeet = isInSquadLobby && squadLobby.memberIds.length >= 2;

  const squadHomeInviteMeetSlotActive = mode === 'squad';

  const getStreamingWsUrl = useCallback(() => {
    return API.STREAMING.WS_URL;
  }, []);

  const isPullStrangerDisabled = false;
  const isRoomFull = false;

  const allPhotos = getFacecardPhotos(currentCard);

  const discoveryCityFaceUser = useMemo(() => {
    if (!currentCard || (currentCard.type !== 'LOCATION' && !currentCard.isLocationCard)) return null;
    return buildDiscoveryCityFaceCardUser({
      city: currentCard.city,
      faceCardImageUrl: currentCard.faceCardImageUrl,
      intent: currentCard.intent,
      label: currentCard.label,
      brands: currentCard.brands,
      musicPreference: currentCard.musicPreference,
    });
  }, [
    currentCard?.type,
    currentCard?.isLocationCard,
    currentCard?.city,
    currentCard?.faceCardImageUrl,
    currentCard?.intent,
    currentCard?.label,
    currentCard?.brands,
    currentCard?.musicPreference,
  ]);

  const citiesSignature = useCallback((cities) => {
    return (cities || []).map((c) => c.city).join('|');
  }, []);

  const applyAvailableCities = useCallback(
    (cities) => {
      const next = Array.isArray(cities) ? cities.slice(0, 3) : [];
      setAvailableCities((prev) => {
        if (citiesSignature(prev) === citiesSignature(next)) return prev;
        return next;
      });
      return next;
    },
    [citiesSignature],
  );
  applyAvailableCitiesRef.current = applyAvailableCities;

  const enterEmptyOrbit = useCallback(() => {
    handoffCityRef.current = null;
    setCurrentCard(null);
    setAvailableCities([]);
    setDeckPhase('emptyOrbit');
    deckPhaseRef.current = 'emptyOrbit';
  }, []);

  const enterCityBoxes = useCallback(
    (cities) => {
      handoffCityRef.current = null;
      const next = applyAvailableCities(cities);
      setCurrentCard(null);
      if (next.length === 0) {
        enterEmptyOrbit();
        return;
      }
      setDeckPhase('cityBoxes');
      deckPhaseRef.current = 'cityBoxes';
    },
    [applyAvailableCities, enterEmptyOrbit],
  );

  const enterCityHandoff = useCallback(
    (card) => {
      if (!card?.city) {
        enterEmptyOrbit();
        return;
      }
      // User cancelled auto-switch — never start another handoff until they tap a box.
      if (manualCitySelectOnlyRef.current) {
        return;
      }
      handoffCityRef.current = card.city;
      handoffCompletingRef.current = false;
      handoffCancelledRef.current = false;
      setCurrentCard(card);
      setHandoffSecondsLeft(handoffCountdownSeconds);
      setDeckPhase('cityHandoff');
      deckPhaseRef.current = 'cityHandoff';
    },
    [enterEmptyOrbit, handoffCountdownSeconds],
  );

  const resetHandoffUiState = useCallback(() => {
    if (handoffTimerRef.current) {
      clearInterval(handoffTimerRef.current);
      handoffTimerRef.current = null;
    }
    handoffCityRef.current = null;
    handoffCompletingRef.current = false;
    handoffCancelledRef.current = false;
    manualCitySelectOnlyRef.current = false;
    setAvailableCities([]);
    setHandoffSecondsLeft(handoffCountdownSeconds);
    setDeckPhase('user');
    deckPhaseRef.current = 'user';
  }, [handoffCountdownSeconds]);

  const applyUiConfigFromResponse = useCallback((ui) => {
    if (!ui) return;
    if (ui.cityHandoffCountdownSeconds > 0) {
      setHandoffCountdownSeconds(ui.cityHandoffCountdownSeconds);
    }
    if (ui.cityHandoffValidityPollMs >= 1000) {
      setHandoffValidityPollMs(ui.cityHandoffValidityPollMs);
    }
    if (ui.availableCitiesPollMs >= 1000) {
      setAvailableCitiesPollMs(ui.availableCitiesPollMs);
    }
  }, []);

  const applyCardResponse = useCallback(
    (data, { silent = false } = {}) => {
      // Meet rn wait must keep the peer face card until both accept (or cancel).
      if (waitingForMatchRef.current || isEnteringCallRef.current) return;

      const card = data?.card || null;
      const exhausted = Boolean(data?.exhausted);
      const nextId = card?.userId || card?._id || card?.id || null;
      // Never flash a partner we just rainchecked / were rainchecked by.
      if (nextId && excludedPartnerIdsRef.current.has(nextId)) {
        enterEmptyOrbit();
        return;
      }

      const isLocation =
        card && (card.type === 'LOCATION' || data?.isLocationCard || card.isLocationCard);

      if (isLocation && card?.city) {
        enterCityHandoff(card);
        return;
      }

      if (!card || exhausted) {
        enterEmptyOrbit();
        return;
      }

      handoffCityRef.current = null;
      setDeckPhase('user');
      deckPhaseRef.current = 'user';
      setCurrentCard((prev) => {
        const prevId = prev?.userId || prev?._id || prev?.id;
        if (silent && nextId === prevId && prevId) {
          return { ...prev, ...card };
        }
        return card;
      });
    },
    [enterCityHandoff, enterEmptyOrbit],
  );

  const user = currentCard;

  // ── Squad Audio hook ───────────────────────────────────────────────────────
  const { cleanupSquadLobbyBackgroundAudio, squadLobbyCallBootstrapBusyRef } = useSquadAudio({
    mode,
    isInSquadLobby,
    squadLobbyCall,
    squadLobbyMicMuted,
    squadLobbyAudioOff,
    getStreamingWsUrl,
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    clearPendingReferralCode();
    window.location.href = '/';
  };

  const fetchMyProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      const response = await fetch(API.USERS.GET_ME, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyProfile(data.user);

        // Only prompt when city preference is truly unset (Anywhere is valid).
        if (!String(data.user.preferredCity || '').trim()) {
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
          Authorization: `Bearer ${token}`,
        },
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
      const soloMode = isSolo !== null ? isSolo : mode === 'solo';
      const data = await apiRequest(API.DISCOVERY.GET_CARD(currentSid, soloMode));
      console.log('Got Card:', data);
      // Meet rn wait must keep the pinned peer card (same guard as silent fetch).
      if (waitingForMatchRef.current || isEnteringCallRef.current) return;
      applyCardResponse(data);
      setSessionId(data.sessionId || currentSid || Date.now().toString());
      if (soloMode) {
        startDiscoveryHeartbeat(data.sessionId || currentSid);
      }
    } catch (error) {
      console.error('Error fetching card:', error);
      setError('Failed to load card. Please check your connection.');
    } finally {
      setLoading(false);
      setTimeout(() => setIsResumeLoading(false), 300);
    }
  };

  const fetchCardSilently = async (sid = null, isSolo = null) => {
    const reqId = ++latestSilentFetchIdRef.current;
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      if (waitingForMatchRef.current || isEnteringCallRef.current) return;

      const currentSid = sid || Date.now().toString();
      const soloMode = isSolo !== null ? isSolo : mode === 'solo';
      flowLog('fetchCardSilently_start', { currentSid, soloMode });
      const data = await apiRequest(API.DISCOVERY.GET_CARD(currentSid, soloMode));
      if (reqId !== latestSilentFetchIdRef.current) return;
      // Never reopen matchmaking from a late poll after the user left search.
      if (!isSearchingRef.current) return;
      // Late response after Meet rn wait started — keep the waiting face card.
      if (waitingForMatchRef.current || isEnteringCallRef.current) return;
      if (data?.card || data?.exhausted) {
        setIsSearching(true);
      }

      const card = data?.card;
      const isLocation = card && (card.type === 'LOCATION' || data?.isLocationCard);
      const phase = deckPhaseRef.current;

      if (phase === 'cityHandoff') {
        // Mid-countdown: only accept a USER match (don't reset timer with LOCATION).
        if (card && !isLocation) {
          applyCardResponse(data, { silent: true });
        }
      } else if (phase === 'cityBoxes' || manualCitySelectOnlyRef.current) {
        // User cancelled auto-switch — stay on boxes; never auto LOCATION / USER.
        // (City entry only via box tap → select-location.)
      } else if (phase === 'emptyOrbit') {
        // Recover as soon as someone is showable — USER or next-city LOCATION.
        if (card && !isLocation) {
          applyCardResponse(data, { silent: true });
        } else if (isLocation && card?.city) {
          applyCardResponse(data, { silent: true });
        }
      } else {
        applyCardResponse(data, { silent: true });
      }

      setSessionId(data?.sessionId || currentSid || Date.now().toString());
      if (soloMode) {
        startDiscoveryHeartbeat(data.sessionId || currentSid);
      }
      flowLog('fetchCardSilently_done', {
        hasCard: Boolean(data?.card),
        cardType: data?.card?.type || 'USER',
        exhausted: Boolean(data?.exhausted),
      });
    } catch (_) {
      flowLog('fetchCardSilently_error');
    } finally {
      setTimeout(() => setIsResumeLoading(false), 500);
    }
  };

  /** Immediate card pull when a mutual match is pushed over WS — no phase gating delay. */
  const fetchMatchedCardNow = useCallback(async () => {
    if (waitingForMatchRef.current || isEnteringCallRef.current) return;
    // Cancelled auto-switch: don't yank them off city boxes into a face card.
    if (
      manualCitySelectOnlyRef.current ||
      deckPhaseRef.current === 'cityBoxes'
    ) {
      return;
    }
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const soloMode = modeRef.current === 'solo';
      const data = await apiRequest(API.DISCOVERY.GET_CARD(sid, soloMode));
      const card = data?.card;
      const isLocation = card && (card.type === 'LOCATION' || data?.isLocationCard);
      if (card && !isLocation) {
        handoffCancelledRef.current = true;
        handoffCompletingRef.current = false;
        if (handoffTimerRef.current) {
          clearInterval(handoffTimerRef.current);
          handoffTimerRef.current = null;
        }
        applyCardResponse(data, { silent: false });
        setIsSearching(true);
        if (soloMode) {
          startDiscoveryHeartbeat(data.sessionId || sid);
        }
      }
    } catch (_) {
      /* next poll retries */
    }
  }, [applyCardResponse]);

  const stopDiscoverySearch = useCallback(
    (reason = 'stop') => {
      flowLog('stop_discovery_search', { reason });
      discoveryEpochRef.current += 1;
      handoffCancelledRef.current = true;
      handoffCompletingRef.current = false;
      manualCitySelectOnlyRef.current = false;
      if (handoffTimerRef.current) {
        clearInterval(handoffTimerRef.current);
        handoffTimerRef.current = null;
      }
      if (availableCitiesPollRef.current) {
        clearInterval(availableCitiesPollRef.current);
        availableCitiesPollRef.current = null;
      }
      if (discoveryPollRef.current) {
        clearInterval(discoveryPollRef.current);
        discoveryPollRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (rescueTimeoutRef.current) {
        clearTimeout(rescueTimeoutRef.current);
        rescueTimeoutRef.current = null;
      }
      resetHandoffUiState();
      setWaitingForMatch(false);
      setWaitingMatchedUser(null);
      setIsSearching(false);
      setIsResumeLoading(false);
      setCurrentCard(null);
      clearSearchingUrlParam();
      clearDiscoveryResumeIntent();
      if (isDiscoveryLeader() || !isDiscoveryActiveElsewhere()) {
        void exitDiscovery().catch(() => setPresenceStatusKeepalive('ONLINE'));
      }
    },
    [resetHandoffUiState],
  );

  const beginDiscoverySearch = async (sid = null) => {
    if (isDiscoveryActiveElsewhere()) {
      setDiscoveryBlockedByOtherTab(true);
      return;
    }
    const nextSid = sid || sessionId || Date.now().toString();
    const epoch = ++discoveryEpochRef.current;
    setSessionId(nextSid);
    setIsSearching(true);
    // Same meme loader as video-call connect while we look for a face card.
    setIsResumeLoading(true);
    setCurrentCard(null);
    excludedPartnerIdsRef.current = new Set();
    resetHandoffUiState();
    setDiscoveryBlockedByOtherTab(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('searching', '1');
      // Solo meet-someone must never keep a stale squad deep-link param.
      if (modeRef.current === 'solo') {
        url.searchParams.delete('squad');
      }
      window.history.pushState({ searching: true }, '', url.toString());
    }
    try {
      await enterDiscovery(nextSid);
    } catch (err) {
      if (String(err?.message || err).includes('another tab')) {
        setDiscoveryBlockedByOtherTab(true);
        setIsSearching(false);
        setIsResumeLoading(false);
        return;
      }
      setIsResumeLoading(false);
      throw err;
    }
    // User backed out (or search was stopped) while enterDiscovery was in flight.
    if (discoveryEpochRef.current !== epoch || !isSearchingRef.current) {
      setIsResumeLoading(false);
      return;
    }
    await fetchCard(nextSid, true);
    if (discoveryEpochRef.current !== epoch || !isSearchingRef.current) {
      setCurrentCard(null);
      setIsResumeLoading(false);
    }
  };

  const clearWaitingState = useCallback(() => {
    clearInterval(pollRef.current);
    clearTimeout(rescueTimeoutRef.current);
    pollRef.current = null;
    waitingForMatchRef.current = false;
    setWaitingForMatch(false);
    setWaitingMatchedUser(null);
  }, []);

  /**
   * Instantly leave face-card / waiting UI into matchmaking loader.
   * Optionally POSTs raincheck and applies nextCard — never re-shows excludedId.
   */
  const enterMatchmakingAfterRaincheck = async (
    excludedId,
    { postRaincheck = false } = {},
  ) => {
    if (excludedId) {
      excludedPartnerIdsRef.current.add(excludedId);
    }
    clearWaitingState();
    setCurrentCard(null);
    setWaitingMatchedUser(null);
    setIsResumeLoading(true);
    setIsSearching(true);
    setDeckPhase('user');
    deckPhaseRef.current = 'user';

    let nextCard = null;
    if (postRaincheck && excludedId && sessionIdRef.current) {
      try {
        const res = await apiRequest(API.DISCOVERY.RAINCHECK, {
          method: 'POST',
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            raincheckedUserId: excludedId,
          }),
        });
        nextCard = res?.nextCard || null;
      } catch (error) {
        console.error('Error rainchecking:', error);
      }
    }

    const nextId = nextCard?.userId || nextCard?._id || nextCard?.id || null;
    if (
      nextCard &&
      nextId &&
      !excludedPartnerIdsRef.current.has(nextId) &&
      nextCard.type !== 'LOCATION' &&
      !nextCard.isLocationCard
    ) {
      applyCardResponse({ card: nextCard, exhausted: false });
      setTimeout(() => setIsResumeLoading(false), 300);
    } else {
      await fetchCardSilently(sessionIdRef.current, modeRef.current === 'solo');
    }
  };

  const enterMatchmakingAfterRaincheckRef = useRef(enterMatchmakingAfterRaincheck);
  enterMatchmakingAfterRaincheckRef.current = enterMatchmakingAfterRaincheck;

  const handleRaincheck = async () => {
    const partner = waitingMatchedUser || currentCard;
    if (!partner || swiping) return;

    // Raincheck is only for real user face cards
    if (partner.type === 'LOCATION' || partner.isLocationCard) {
      return;
    }

    if (raincheckRematchInFlightRef.current) return;
    raincheckRematchInFlightRef.current = true;
    setSwiping(true);
    try {
      await enterMatchmakingAfterRaincheckRef.current(partner.userId, {
        postRaincheck: true,
      });
    } finally {
      setSwiping(false);
      window.setTimeout(() => {
        raincheckRematchInFlightRef.current = false;
      }, 1500);
    }
  };

  const handleProceed = async () => {
    if (!currentCard || swiping || waitingForMatch || waitingForMatchRef.current) return;

    // Meet rn only enters a call for real user cards — never opens a city deck
    if (currentCard.type === 'LOCATION' || currentCard.isLocationCard) {
      return;
    }

    setSwiping(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No token found');

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;
      const partnerCard = currentCard;

      // Pull-stranger join is only for live squad hosts — never for mutual MATCHED face cards.
      if (partnerCard.status === 'IN_SQUAD_AVAILABLE') {
        try {
          let roomInfo = await apiRequest(API.STREAMING.GET_PULL_STRANGER_ROOM(partnerCard.userId));
          if (!roomInfo?.exists || !roomInfo?.roomId) {
            roomInfo = await apiRequest(API.STREAMING.GET_USER_ROOM(partnerCard.userId));
          }

          if (roomInfo?.exists && roomInfo?.roomId) {
            console.log('[PullStranger] Target user room:', roomInfo.roomId);

            const joinData = await apiRequest(API.STREAMING.JOIN_VIA_PULL_STRANGER(roomInfo.roomId), {
              method: 'POST',
              body: JSON.stringify({
                joiningUserId: userId,
                targetUserId: partnerCard.userId,
              }),
            });

            if (joinData?.roomId) {
              localStorage.setItem(
                'currentRoom',
                JSON.stringify({
                  roomId: joinData.roomId,
                  sessionId: joinData.sessionId || roomInfo.roomId,
                  partner: {
                    id: partnerCard.userId,
                    username: partnerCard.username,
                    age: partnerCard.age,
                    city: partnerCard.city,
                    displayPictureUrl: partnerCard.displayPictureUrl,
                  },
                }),
              );
              isEnteringCallRef.current = true;
              await enterCall();
              router.push('/video-chat');
              return;
            }
          }
        } catch (err) {
          console.warn('[PullStranger] Direct join failed:', err);
          setError('Could not join this squad right now. Please fetch next card.');
          return;
        }
        return;
      }

      const data = await apiRequest(API.DISCOVERY.PROCEED, {
        method: 'POST',
        body: JSON.stringify({
          matchedUserId: partnerCard.userId,
        }),
      });

      console.log('Proceed Result:', data);

      const enterCallWithRoom = async (roomId, roomSessionId) => {
        if (!roomId || isEnteringCallRef.current) return;
        clearInterval(pollRef.current);
        clearTimeout(rescueTimeoutRef.current);
        localStorage.setItem(
          'currentRoom',
          JSON.stringify({
            roomId,
            sessionId: roomSessionId || roomId,
            partner: {
              id: partnerCard.userId,
              username: partnerCard.username,
              age: partnerCard.age,
              city: partnerCard.city,
              displayPictureUrl: partnerCard.displayPictureUrl,
            },
          }),
        );
        isEnteringCallRef.current = true;
        waitingForMatchRef.current = false;
        setWaitingForMatch(false);
        setWaitingMatchedUser(null);
        await enterCall();
        router.push('/video-chat');
      };

      // Both already accepted — room ready from discovery.
      if (data.roomId) {
        await enterCallWithRoom(data.roomId, data.sessionId);
        return;
      }

      // First accepter: stay on the same face card with waiting UI until peer also Meet rns.
      if (data.waiting) {
        waitingForMatchRef.current = true;
        setWaitingForMatch(true);
        setWaitingMatchedUser(partnerCard);
        setCurrentCard(partnerCard);
        setDeckPhase('user');
        deckPhaseRef.current = 'user';

        let emptyPollCount = 0;
        // Align with backend MATCH_ACCEPTANCE_TIMEOUT_SECONDS (~30s): ~30 × 1s
        const MAX_POLL_TICKS = 30;
        const POLL_MS = 1000;
        const partnerId = partnerCard.userId;

        // Any room already in Redis is from a prior call — ignore until mutual accept
        // overwrites it with a new roomId (or until it clears and a fresh one appears).
        let baselineRoomId = null;
        try {
          const existing = await apiRequest(API.DISCOVERY.MY_ROOM);
          baselineRoomId = existing?.roomId || null;
        } catch (_) {
          baselineRoomId = null;
        }

        const leaveWaitForMatchmaking = async () => {
          if (!waitingForMatchRef.current) return;
          clearInterval(pollRef.current);
          clearTimeout(rescueTimeoutRef.current);
          if (raincheckRematchInFlightRef.current || isEnteringCallRef.current) return;
          raincheckRematchInFlightRef.current = true;
          try {
            // Peer rainchecked (or match broke) — mirror raincheck + matchmaking UI now.
            await enterMatchmakingAfterRaincheckRef.current(partnerId, {
              postRaincheck: true,
            });
          } finally {
            window.setTimeout(() => {
              raincheckRematchInFlightRef.current = false;
            }, 1500);
          }
        };

        const pollWaitingTick = async () => {
          if (!waitingForMatchRef.current || isEnteringCallRef.current) {
            clearInterval(pollRef.current);
            return;
          }
          try {
            // 1) Mutual accept room first — both-accepted deletes active_matches,
            // so match-status goes false; that is NOT a raincheck.
            const assigned = await apiRequest(API.DISCOVERY.MY_ROOM);
            const nextRoomId = assigned?.roomId || null;
            if (assigned?.hasRoom && nextRoomId && nextRoomId !== baselineRoomId) {
              await enterCallWithRoom(nextRoomId, assigned.sessionId);
              return;
            }

            // 2) Still waiting on peer Meet rn — keep face card.
            let stillMatchedWithPartner = true;
            try {
              const matchStatus = await apiRequest(API.DISCOVERY.MATCH_STATUS);
              stillMatchedWithPartner =
                Boolean(matchStatus?.matched) &&
                (!matchStatus.partnerId || matchStatus.partnerId === partnerId);
            } catch (_) {
              stillMatchedWithPartner = true;
            }

            if (!stillMatchedWithPartner) {
              // No match and no room → peer rainchecked / match cancelled.
              await leaveWaitForMatchmaking();
              return;
            }

            emptyPollCount++;
            if (emptyPollCount >= MAX_POLL_TICKS) {
              clearInterval(pollRef.current);
              clearTimeout(rescueTimeoutRef.current);
              waitingForMatchRef.current = false;
              setWaitingForMatch(false);
              setWaitingMatchedUser(null);
              setError('The other person did not join in time. Finding someone new...');
              setTimeout(() => setError(''), 3000);
              await fetchCard(sessionId);
            }
          } catch {
            emptyPollCount++;
            if (emptyPollCount >= MAX_POLL_TICKS) {
              clearInterval(pollRef.current);
              waitingForMatchRef.current = false;
              setWaitingForMatch(false);
              setWaitingMatchedUser(null);
              await fetchCard(sessionId);
            }
          }
        };

        // Immediate first tick, then poll.
        void pollWaitingTick().finally(() => {
          if (!waitingForMatchRef.current || isEnteringCallRef.current) return;
          pollRef.current = setInterval(pollWaitingTick, POLL_MS);
        });
        return;
      }

      // Both accepted but discovery room create failed — frontend fallback.
      if (data.success && !data.waiting && !data.roomId) {
        console.log('Both accepted, but backend room creation failed. Creating room via frontend...');
        try {
          const roomData = await apiRequest(API.STREAMING.CREATE_ROOM, {
            method: 'POST',
            body: JSON.stringify({
              userIds: [userId, partnerCard.userId],
              callType: 'matched',
            }),
          });
          if (roomData && roomData.roomId) {
            await enterCallWithRoom(roomData.roomId, roomData.sessionId || sessionId);
            return;
          }
        } catch (roomErr) {
          console.error('Frontend fallback room creation failed:', roomErr);

          if (roomErr.message && roomErr.message.includes('already in an active room')) {
            try {
              const existingRoom = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
              if (existingRoom?.exists && existingRoom?.roomId) {
                await enterCallWithRoom(existingRoom.roomId, existingRoom.sessionId || sessionId);
                return;
              }
            } catch (_) { }
          }

          setError('Match found, but video servers are currently unreachable. Please try again.');
          return;
        }
      }

      await fetchCard(sessionId);
    } catch (error) {
      console.error('Error proceeding:', error);
      setError('Failed to connect. Please try again.');
    } finally {
      setSwiping(false);
    }
  };

  // X on "Waiting for response" = raincheck the peer so both leave this match.
  const handleCancelWaiting = async () => {
    await handleRaincheck();
  };

  const handleSelectLocation = async (city, { persistPreference = false } = {}) => {
    if (!city || !isSearchingRef.current) return;
    setSwiping(true);
    // Explicit box tap — allow leaving city-boxes mode.
    manualCitySelectOnlyRef.current = false;
    const epoch = discoveryEpochRef.current;
    try {
      const soloMode = mode === 'solo';
      const data = await apiRequest(API.DISCOVERY.SELECT_LOCATION, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: sessionId,
          city: city,
          persistPreference,
          soloOnly: soloMode,
        }),
      });

      if (!isSearchingRef.current || discoveryEpochRef.current !== epoch) return;

      handoffCityRef.current = null;
      handoffCancelledRef.current = false;
      if (data.success && data.nextCard) {
        const next = data.nextCard;
        const isLocation = next.type === 'LOCATION' || data.isLocationCard;
        if (isLocation) {
          // Prefer boxes/empty over chaining another handoff from a box tap failure path
          await cancelCityHandoff();
        } else {
          setDeckPhase('user');
          deckPhaseRef.current = 'user';
          setCurrentCard(next);
          setIsSearching(true);
          void fetchCardSilently(sessionId, soloMode);
        }
      } else {
        await cancelCityHandoff();
      }
    } catch (error) {
      console.error('Error selecting location:', error);
      if (isSearchingRef.current) {
        setError('Failed to select location. Please try again.');
        await cancelCityHandoff();
      }
    } finally {
      setSwiping(false);
      handoffCompletingRef.current = false;
    }
  };

  const cancelCityHandoff = useCallback(async () => {
    // Cancel always wins over a late countdown complete
    handoffCancelledRef.current = true;
    handoffCompletingRef.current = false;
    // Stay on city boxes until the user explicitly taps a city — no auto-switch back.
    manualCitySelectOnlyRef.current = true;
    if (handoffTimerRef.current) {
      clearInterval(handoffTimerRef.current);
      handoffTimerRef.current = null;
    }
    handoffCityRef.current = null;
    const sid = sessionIdRef.current || sessionId;
    if (!sid) {
      enterEmptyOrbit();
      return;
    }
    try {
      const data = await apiRequest(
        API.DISCOVERY.AVAILABLE_CITIES(sid, {
          limit: 3,
          soloOnly: modeRef.current === 'solo',
        }),
      );
      applyUiConfigFromResponse(data?.ui);
      if (handoffCancelledRef.current === false) {
        // A newer handoff may have started; don't clobber it
        return;
      }
      enterCityBoxes(data?.cities || []);
    } catch (err) {
      console.error('Error loading available cities:', err);
      if (handoffCancelledRef.current) {
        enterEmptyOrbit();
      }
    }
  }, [applyUiConfigFromResponse, enterCityBoxes, enterEmptyOrbit, sessionId]);

  const completeCityHandoff = useCallback(async () => {
    if (handoffCancelledRef.current) return;
    if (handoffCompletingRef.current) return;
    // Back / stop left matchmaking — never reopen search from a leftover countdown.
    if (!isSearchingRef.current) return;
    const city = handoffCityRef.current;
    if (!city) {
      await cancelCityHandoff();
      return;
    }
    const epoch = discoveryEpochRef.current;
    handoffCompletingRef.current = true;
    setSwiping(true);
    try {
      if (handoffCancelledRef.current || !isSearchingRef.current) return;
      const soloMode = modeRef.current === 'solo';
      const sid = sessionIdRef.current;
      const data = await apiRequest(API.DISCOVERY.SELECT_LOCATION, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: sid,
          city,
          persistPreference: false,
          soloOnly: soloMode,
        }),
      });

      // User cancelled / backed out while select-location was in flight
      if (
        handoffCancelledRef.current ||
        !isSearchingRef.current ||
        discoveryEpochRef.current !== epoch
      ) {
        return;
      }

      const next = data?.success ? data.nextCard : null;
      const isLocation = next && (next.type === 'LOCATION' || data.isLocationCard);
      const isUserCard = next && !isLocation;

      if (isUserCard) {
        handoffCityRef.current = null;
        setDeckPhase('user');
        deckPhaseRef.current = 'user';
        setCurrentCard(next);
        setIsSearching(true);
        void fetchCardSilently(sid, soloMode);
      } else {
        // No user card (failure, empty, or another LOCATION) → never stuck on dead handoff
        await cancelCityHandoff();
      }
    } catch (error) {
      console.error('Error completing city handoff:', error);
      if (!handoffCancelledRef.current && isSearchingRef.current) {
        setError('Failed to enter city. Please try again.');
        await cancelCityHandoff();
      }
    } finally {
      setSwiping(false);
      handoffCompletingRef.current = false;
    }
  }, [cancelCityHandoff]);

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

  const toggleFullscreen = () => {
    try {
      const doc = window.document;
      const docEl = doc.documentElement;

      const requestFullScreen =
        docEl.requestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.webkitRequestFullScreen ||
        docEl.msRequestFullscreen;

      const cancelFullScreen =
        doc.exitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.webkitExitFullscreen ||
        doc.msExitFullscreen;

      if (
        !doc.fullscreenElement &&
        !doc.mozFullScreenElement &&
        !doc.webkitFullscreenElement &&
        !doc.msFullscreenElement
      ) {
        if (requestFullScreen) {
          requestFullScreen.call(docEl).catch((err) => {
            console.error('Error attempting to enable fullscreen:', err);
          });
        }
      } else {
        if (cancelFullScreen) {
          cancelFullScreen.call(doc);
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle error:', error);
    }
  };

  // ── Squad Handlers ─────────────────────────────────────────────────────────
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
            displayPictureUrl: u.displayPictureUrl,
          };
        } catch {
          partner = {
            id: others[0],
            username: 'Squad',
            age: '',
            city: '',
            displayPictureUrl: '',
          };
        }
      } else {
        partner = {
          id: '',
          username: 'Squad',
          age: '',
          city: '',
          displayPictureUrl: '',
        };
      }
      isEnteringCallRef.current = true;
      await enterCall();
      localStorage.setItem(
        'currentRoom',
        JSON.stringify({
          roomId: data.roomId,
          sessionId: data.sessionId,
          callType: 'squad',
          memberIds,
          partner,
          pullStrangerEnabled: Boolean(data.pullStrangerEnabled),
          pullStrangerRemainingSec: Number(data.pullStrangerRemainingSec) || 0,
          pullStrangerEnabledBy: data.pullStrangerEnabledBy || null,
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

  const handleSquadEnterCall = async () => {
    if (!canSquadMeet || squadMeetBusy) return;
    setSquadProductMessage('');
    setSquadMeetBusy(true);
    try {
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
    [getSquadInviteLink, squadShareBusy],
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
            photoUrl: s.displayPictureUrl || s.photoUrl || '',
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

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGenderFilter(localStorage.getItem('genderPreference') || 'ALL');
    }
  }, []);

  useEffect(() => {
    let messageInterval = null;

    const fetchWaitingMessage = async () => {
      try {
        const res = await apiRequest(API.DISCOVERY.MEET_RN_WAITING_MESSAGE);
        if (res && res.ok && res.message) {
          setWaitingMessage(res.message);
        }
      } catch (err) {
        console.error('Error fetching waiting message:', err);
      }
    };

    if (waitingForMatch) {
      // Hard stop handoff/boxes polling + countdown while Meet rn is waiting
      if (handoffTimerRef.current) {
        clearInterval(handoffTimerRef.current);
        handoffTimerRef.current = null;
      }
      if (availableCitiesPollRef.current) {
        clearInterval(availableCitiesPollRef.current);
        availableCitiesPollRef.current = null;
      }
      void fetchWaitingMessage();
      messageInterval = setInterval(fetchWaitingMessage, 5000);
    } else {
      setWaitingMessage("Maybe they fainted, you're that hot!");
    }

    return () => {
      if (messageInterval) {
        clearInterval(messageInterval);
      }
    };
  }, [waitingForMatch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isVideoOn', String(isVideoOn));
      localStorage.setItem('isCamOff', String(!isVideoOn));
    }
    const updateCamStatus = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        await fetch(API.USERS.UPDATE_PROFILE, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            videoEnabled: isVideoOn
          })
        });
      } catch (err) {
        console.error('Failed to sync cam status with backend:', err);
      }
    };
    updateCamStatus();
  }, [isVideoOn]);

  // Deep-link ?squad=1 → enter squad mode, then strip the param so refresh/solo
  // don't keep forcing squad (and so meet-someone search never becomes ?squad=1&searching=1).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('squad') !== '1') return;
    setMode('squad');
    url.searchParams.delete('squad');
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', next);
    try {
      router.replace(next || '/', { scroll: false });
    } catch {
      // history already updated
    }
  }, [router]);

  // Keep URL in sync with mode: solo must not retain ?squad=1.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mode !== 'solo') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('squad')) return;
    url.searchParams.delete('squad');
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [mode]);

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

  // Mount effect
  useEffect(() => {
    let aborted = false;

    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const resumeDiscoveryFromUrl = params?.get('resumeDiscovery') === '1';
    const resumeSessionFromUrl = params?.get('sessionId');
    const pendingRaincheckRaw =
      localStorage.getItem('pendingRaincheckResume') || localStorage.getItem('pendingRaincheckNextCard');
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
      hasResumeOnHomeRaw: Boolean(resumeOnHomeRaw),
    });

    fetchMyProfile();
    fetchWalletBalance();

    localStorage.removeItem('currentRoom');

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
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId }),
          }).catch(() => { });
        }
      } catch (_) { }
    };
    clearGhostRoom();

    const resumePayload =
      safeParse(resumeOnHomeRaw) ||
      safeParse(forcedResumeRaw) ||
      safeParse(pendingRaincheckRaw) ||
      safeParse(stickyResumeRaw);
    const resumeSessionId =
      resumeSessionFromUrl || resumePayload?.sessionId || Date.now().toString();

    // Only auto-enter matchmaking after an intentional call exit (raincheck / next).
    // Require ?resumeDiscovery=1 — ignore stale pending/force localStorage and leftover
    // ?searching=1 (those caused idle homepage → search after back).
    const shouldResumeDiscovery = resumeDiscoveryFromUrl;

    const beginDiscoverySearchOnMount = async (sid) => {
      if (isDiscoveryActiveElsewhere()) {
        setDiscoveryBlockedByOtherTab(true);
        setIsSearching(false);
        clearSearchingUrlParam();
        return;
      }
      const nextSid = sid || Date.now().toString();
      const epoch = ++discoveryEpochRef.current;
      // Clean resume from call: wipe leftover handoff/boxes/countdown before GET /card
      resetHandoffUiState();
      setWaitingForMatch(false);
      setWaitingMatchedUser(null);
      setSessionId(nextSid);
      setIsSearching(true);
      setIsResumeLoading(true);
      setCurrentCard(null);
      setDiscoveryBlockedByOtherTab(false);
      try {
        await enterDiscovery(nextSid);
        if (aborted || discoveryEpochRef.current !== epoch || !isSearchingRef.current) {
          setIsResumeLoading(false);
          return;
        }
        await fetchCard(nextSid, true);
        if (aborted || discoveryEpochRef.current !== epoch || !isSearchingRef.current) {
          setCurrentCard(null);
          setIsResumeLoading(false);
        }
      } catch (err) {
        setIsResumeLoading(false);
        if (String(err?.message || err).includes('another tab')) {
          setDiscoveryBlockedByOtherTab(true);
          setIsSearching(false);
          clearSearchingUrlParam();
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
      } catch (_) { }

      if (leftCallToHome) {
        flowLog('home_idle_online');
        stopDiscoverySearch('left_call_to_home');
        setDiscoveryBlockedByOtherTab(isDiscoveryActiveElsewhere());
        void exitCallToHome().catch(() => setPresenceStatusKeepalive('ONLINE'));
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('searching');
          url.searchParams.delete('resumeDiscovery');
          url.searchParams.delete('sessionId');
          window.history.replaceState({}, '', url.toString());
        }
      } else if (shouldResumeDiscovery) {
        flowLog('resume_discovery_from_call', { resumeSessionId });
        clearDiscoveryResumeIntent();
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('resumeDiscovery');
          url.searchParams.delete('squad');
          url.searchParams.set('searching', '1');
          window.history.replaceState({ searching: true }, '', url.toString());
        }
        void beginDiscoverySearchOnMount(resumeSessionId);
      } else {
        flowLog('home_idle_online');
        setDiscoveryBlockedByOtherTab(isDiscoveryActiveElsewhere());
        stopDiscoverySearch('home_idle_mount');
        if (typeof window !== 'undefined') {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('resumeDiscovery');
            url.searchParams.delete('sessionId');
            window.history.replaceState({}, '', url.toString());
          } catch (_) { }
        }
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
      // Back to idle homepage — fully stop matchmaking (incl. city handoff countdown).
      if (nextParams.get('searching') !== '1' && nextParams.get('resumeDiscovery') !== '1') {
        stopDiscoverySearch('popstate_home');
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
    waitingForMatchRef.current = waitingForMatch;
  }, [waitingForMatch]);

  useEffect(() => {
    waitingMatchedUserRef.current = waitingMatchedUser;
  }, [waitingMatchedUser]);

  useEffect(() => {
    currentCardRef.current = currentCard;
  }, [currentCard]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    myUserIdRef.current = myProfile?.id || null;
  }, [myProfile?.id]);

  useEffect(() => {
    const syncTabDiscoveryState = () => {
      setDiscoveryBlockedByOtherTab(isDiscoveryActiveElsewhere() && !isDiscoveryLeader());
    };

    const rematchAfterPeerRaincheck = (partnerId, { mirrorRaincheck = true } = {}) => {
      if (raincheckRematchInFlightRef.current) return;
      raincheckRematchInFlightRef.current = true;

      const excludedId =
        partnerId ||
        waitingMatchedUserRef.current?.userId ||
        currentCardRef.current?.userId ||
        null;

      void (async () => {
        try {
          await enterMatchmakingAfterRaincheckRef.current(excludedId, {
            postRaincheck: mirrorRaincheck,
          });
        } finally {
          window.setTimeout(() => {
            raincheckRematchInFlightRef.current = false;
          }, 1500);
        }
      })();
    };

    const unsubTab = subscribeTabCoordinator(syncTabDiscoveryState);
    const unsubPresence = subscribePresenceRealtime((payload) => {
      if (payload?.eventType === 'discovery:matched') {
        // Peer already has our face card — show theirs immediately (any deck phase).
        if (isSearchingRef.current && !waitingForMatchRef.current) {
          const matchedId = payload.partnerId;
          if (matchedId && excludedPartnerIdsRef.current.has(matchedId)) {
            return;
          }
          void fetchMatchedCardNow();
        }
        return;
      }
      if (payload?.eventType === 'discovery:rainchecked') {
        const partnerId = payload.partnerId;
        const waitingPartnerId = waitingMatchedUserRef.current?.userId;
        const shownPartnerId = currentCardRef.current?.userId;
        // Waiting for Meet rn response — peer rainchecked; leave wait and rematch.
        if (waitingForMatchRef.current) {
          rematchAfterPeerRaincheck(partnerId || waitingPartnerId, {
            mirrorRaincheck: true,
          });
          return;
        }
        // Still on that mutual face card — drop it and find someone new.
        if (
          isSearchingRef.current &&
          partnerId &&
          (partnerId === shownPartnerId || partnerId === waitingPartnerId)
        ) {
          rematchAfterPeerRaincheck(partnerId, { mirrorRaincheck: true });
        }
        return;
      }
      if (payload?.eventType === 'squad:call_started' && payload?.roomId) {
        // Another member pressed Meet someone now — join without waiting on lobby poll.
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/video-chat')) {
          return;
        }
        void (async () => {
          try {
            cleanupSquadLobbyBackgroundAudio();
            const data = await apiRequest(API.SQUAD.ENTER_CALL, { method: 'POST' });
            await applySquadEnterResponse(data, { navigate: true });
          } catch (e) {
            if (e?.status === 410) {
              await refreshSquadLobby();
            } else {
              // Fall back to poll-driven IN_CALL effect.
              await refreshSquadLobby();
            }
          }
        })();
        return;
      }
      if (!payload?.userId) return;
      if (payload.userId === myUserIdRef.current) {
        void fetchMyProfile();
        // While waiting: IN_SQUAD means peer also Meet rn'd — room poll will join.
        // AVAILABLE/ONLINE means peer rainchecked — leave waiting into matchmaking.
        if (
          waitingForMatchRef.current &&
          payload.status &&
          payload.status !== 'MATCHED'
        ) {
          if (payload.status === 'IN_SQUAD') {
            return;
          }
          rematchAfterPeerRaincheck(
            waitingMatchedUserRef.current?.userId || currentCardRef.current?.userId,
            { mirrorRaincheck: true },
          );
          return;
        }
        if (payload.status === 'ONLINE' && isSearchingRef.current) {
          setIsSearching(false);
          setCurrentCard(null);
          clearSearchingUrlParam();
        }
        if (payload.status === 'MATCHED' && isSearchingRef.current && !waitingForMatchRef.current) {
          void fetchMatchedCardNow();
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
  }, [
    myProfile?.id,
    fetchMatchedCardNow,
    applySquadEnterResponse,
    cleanupSquadLobbyBackgroundAudio,
    refreshSquadLobby,
    clearWaitingState,
  ]);

  useEffect(() => {
    const prev = prevModeSquadRef.current;
    prevModeSquadRef.current = mode;
    if (prev === 'squad' && mode === 'solo') {
      void apiRequest(API.SQUAD.TOGGLE_SOLO, { method: 'POST' }).catch(() => { });
    }
    if (mode !== 'squad') {
      setSquadProductMessage('');
      setSquadLobbyCall(null);
      cleanupSquadLobbyBackgroundAudio();
      setSquadLobbyMicMuted(false);
      setSquadLobbyAudioOff(false);
    } else {
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
    // Poll faster while waiting in lobby so Meet someone now is picked up quickly
    // if the realtime push is missed. Slow down once already in call / video-chat.
    const pollMs = squadLobby?.status === 'IN_CALL' ? 4000 : 1000;
    squadPollRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void refreshSquadLobby();
    }, pollMs);
    return () => {
      if (squadPollRef.current) {
        clearInterval(squadPollRef.current);
        squadPollRef.current = null;
      }
    };
  }, [mode, refreshSquadLobby, squadLobby?.status]);

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
    if (mode !== 'squad' || !squadLobby) {
      squadVideoRoomNavKeyRef.current = '';
    }
  }, [mode, squadLobby]);

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

  useEffect(() => {
    if (mode !== 'squad' || squadLobby?.status !== 'IN_CALL') return;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/video-chat')) return;

    let cancelled = false;
    (async () => {
      try {
        cleanupSquadLobbyBackgroundAudio();
        const data = await apiRequest(API.SQUAD.ENTER_CALL, { method: 'POST' });
        if (cancelled) return;
        await applySquadEnterResponse(data, { navigate: true });
      } catch (e) {
        if (e?.status === 410) {
          await refreshSquadLobby();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySquadEnterResponse, cleanupSquadLobbyBackgroundAudio, mode, refreshSquadLobby, squadLobby?.status]);

  useEffect(() => {
    if (mode !== 'squad') {
      setQuickInviteFriends([]);
      setQuickInvitePendingIds(new Set());
      return;
    }
    void loadQuickInviteFriends();
  }, [mode, pathname, loadQuickInviteFriends]);

  useEffect(() => {
    const cardId =
      currentCard?.userId ||
      currentCard?._id ||
      currentCard?.id ||
      (currentCard?.type === 'LOCATION' || currentCard?.isLocationCard
        ? `location:${currentCard?.city ?? ''}`
        : null);
    if (cardId) {
      setCurrentImageIndex(0);

      const needsFullProfile = (!currentCard.photos || currentCard.photos.length === 0) && !currentCard.zodiac;
      if (needsFullProfile && currentCard.type !== 'LOCATION' && !currentCard.isLocationCard) {
        const fetchFullCardProfile = async () => {
          try {
            setIsDiscoveryUserFetching(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(API.USERS.GET_USER(cardId), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.user) {
                setCurrentCard((prev) => {
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



  useEffect(() => {
    if (!modeInitRef.current) {
      modeInitRef.current = true;
      return;
    }

    if (mode === 'squad') {
      setIsSearching(false);
      setCurrentCard(null);
      setWaitingForMatch(false);
      setWaitingMatchedUser(null);
      clearInterval(pollRef.current);
      clearInterval(discoveryPollRef.current);
      clearTimeout(rescueTimeoutRef.current);
      localStorage.removeItem('stickyDiscoveryResume');
      clearSearchingUrlParam();
      void exitDiscovery();
    } else {
      setIsSearching(false);
      setCurrentCard(null);
      setWaitingForMatch(false);
      setWaitingMatchedUser(null);
      clearInterval(pollRef.current);
      clearTimeout(rescueTimeoutRef.current);
      localStorage.removeItem('stickyDiscoveryResume');
      clearSearchingUrlParam();
      void exitDiscovery();
    }
  }, [mode]);

  useEffect(() => {
    // Always watch for mutual USER cards while searching — including handoff/boxes/empty.
    // Fast poll when we don't already have a user face card (realtime reciprocity).
    const shouldPollDiscovery = isSearching && !waitingForMatch && !swiping;
    const hasUserFaceCard =
      deckPhase === 'user' &&
      currentCard &&
      currentCard.type !== 'LOCATION' &&
      !currentCard.isLocationCard;
    const pollMs = hasUserFaceCard ? 5000 : 1000;

    if (!shouldPollDiscovery) {
      if (discoveryPollRef.current) {
        clearInterval(discoveryPollRef.current);
        discoveryPollRef.current = null;
      }
      return;
    }

    discoveryPollRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (waitingForMatchRef.current || isEnteringCallRef.current) return;
      fetchCardSilently(sessionIdRef.current || sessionId || null, modeRef.current === 'solo');
    }, pollMs);

    return () => {
      if (discoveryPollRef.current) {
        clearInterval(discoveryPollRef.current);
        discoveryPollRef.current = null;
      }
    };
  }, [isSearching, waitingForMatch, swiping, sessionId, mode, deckPhase, currentCard]);

  // Load handoff / poll UI config once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest(API.DISCOVERY.UI_CONFIG);
        if (cancelled || !data) return;
        applyUiConfigFromResponse(data);
      } catch (_) {
        /* defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUiConfigFromResponse]);

  // City handoff countdown
  useEffect(() => {
    if (deckPhase !== 'cityHandoff' || waitingForMatch) {
      if (handoffTimerRef.current) {
        clearInterval(handoffTimerRef.current);
        handoffTimerRef.current = null;
      }
      return;
    }

    setHandoffSecondsLeft(handoffCountdownSeconds);
    handoffTimerRef.current = setInterval(() => {
      if (handoffCancelledRef.current || waitingForMatchRef.current || isEnteringCallRef.current) {
        return;
      }
      setHandoffSecondsLeft((prev) => {
        if (prev <= 1) {
          if (handoffTimerRef.current) {
            clearInterval(handoffTimerRef.current);
            handoffTimerRef.current = null;
          }
          void completeCityHandoff();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (handoffTimerRef.current) {
        clearInterval(handoffTimerRef.current);
        handoffTimerRef.current = null;
      }
    };
  }, [deckPhase, handoffCountdownSeconds, completeCityHandoff, waitingForMatch]);

  // Quiet available-cities poll:
  // - cityHandoff: ~3s validity
  // - cityBoxes / emptyOrbit: fixed 8s
  // - hard stop while waiting for Meet rn or entering a call
  useEffect(() => {
    const active =
      isSearching &&
      !waitingForMatch &&
      (deckPhase === 'cityHandoff' || deckPhase === 'cityBoxes' || deckPhase === 'emptyOrbit');

    if (!active) {
      if (availableCitiesPollRef.current) {
        clearInterval(availableCitiesPollRef.current);
        availableCitiesPollRef.current = null;
      }
      return;
    }

    const pollMs =
      deckPhase === 'cityHandoff' ? handoffValidityPollMs : availableCitiesPollMs;

    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (waitingForMatchRef.current || isEnteringCallRef.current) return;
      const sid = sessionIdRef.current;
      if (!sid) return;
      const phase = deckPhaseRef.current;
      if (phase !== 'cityHandoff' && phase !== 'cityBoxes' && phase !== 'emptyOrbit') return;

      try {
        const data = await apiRequest(
          API.DISCOVERY.AVAILABLE_CITIES(sid, {
            limit: 3,
            soloOnly: modeRef.current === 'solo',
          }),
        );
        applyUiConfigFromResponse(data?.ui);
        if (waitingForMatchRef.current || isEnteringCallRef.current) return;

        const cities = Array.isArray(data?.cities) ? data.cities : [];
        const phaseNow = deckPhaseRef.current;

        if (phaseNow === 'cityHandoff') {
          if (handoffCancelledRef.current || handoffCompletingRef.current) return;
          const handoffCity = handoffCityRef.current;
          const stillValid =
            handoffCity &&
            cities.some((c) => String(c.city).toLowerCase() === String(handoffCity).toLowerCase());
          if (!stillValid) {
            // Peer may already have matched us after hopping into our city — prefer that
            // USER card over canceling into empty boxes while mid opposite-direction handoff.
            try {
              const soloMode = modeRef.current === 'solo';
              const cardData = await apiRequest(API.DISCOVERY.GET_CARD(sid, soloMode));
              if (handoffCancelledRef.current || handoffCompletingRef.current) return;
              if (waitingForMatchRef.current || isEnteringCallRef.current) return;
              const card = cardData?.card;
              const isLocation =
                card && (card.type === 'LOCATION' || cardData?.isLocationCard);
              if (card && !isLocation) {
                applyCardResponse(cardData, { silent: true });
                return;
              }
            } catch (_) {
              /* fall through to cancel */
            }
            await cancelCityHandoff();
          }
          return;
        }

        if (phaseNow === 'cityBoxes') {
          applyAvailableCitiesRef.current?.(cities);
          if (cities.length === 0) {
            // Never auto-handoff from boxes — only empty orbit when nothing left.
            enterEmptyOrbit();
          }
          return;
        }

        if (phaseNow === 'emptyOrbit') {
          // After Cancel: show boxes when cities reappear — never auto-start handoff.
          if (manualCitySelectOnlyRef.current) {
            if (cities.length > 0) {
              enterCityBoxes(cities);
            }
            return;
          }

          try {
            const cardData = await apiRequest(
              API.DISCOVERY.GET_CARD(sid, modeRef.current === 'solo'),
            );
            if (waitingForMatchRef.current || isEnteringCallRef.current) return;
            const card = cardData?.card;
            const isLocation = card && (card.type === 'LOCATION' || cardData?.isLocationCard);
            if (card && !isLocation) {
              applyCardResponse(cardData, { silent: true });
              return;
            }
            if (isLocation && card?.city) {
              enterCityHandoff(card);
              return;
            }
          } catch (_) {
            /* keep empty */
          }
          // Someone appeared elsewhere — hop straight into the top city when there's only one.
          if (cities.length === 1) {
            const top = cities[0];
            enterCityHandoff({
              type: 'LOCATION',
              city: top.city,
              availableCount: top.availableCount,
              faceCardImageUrl: top.faceCardImageUrl,
              intent: top.intent,
              label: top.label,
              brands: top.brands || [],
              musicPreference: top.musicPreference || null,
              isLocationCard: true,
            });
            return;
          }
          if (cities.length > 1) {
            enterCityBoxes(cities);
          }
        }
      } catch (_) {
        /* keep UI stable on poll errors */
      }
    };

    void tick();
    availableCitiesPollRef.current = setInterval(tick, pollMs);

    return () => {
      if (availableCitiesPollRef.current) {
        clearInterval(availableCitiesPollRef.current);
        availableCitiesPollRef.current = null;
      }
    };
  }, [
    isSearching,
    waitingForMatch,
    deckPhase,
    handoffValidityPollMs,
    availableCitiesPollMs,
    applyCardResponse,
    applyUiConfigFromResponse,
    cancelCityHandoff,
    enterCityBoxes,
    enterCityHandoff,
    enterEmptyOrbit,
  ]);

  // Keep deckPhaseRef in sync
  useEffect(() => {
    deckPhaseRef.current = deckPhase;
  }, [deckPhase]);

  // ── Return everything the UI needs ─────────────────────────────────────────
  return {
    // State
    currentCard,
    setCurrentCard,
    sessionId,
    loading,
    error,
    setError,
    swiping,
    coins,
    setCoins,
    mode,
    setMode,
    isGenderModalOpen,
    setIsGenderModalOpen,
    isLocationModalOpen,
    setIsLocationModalOpen,
    myProfile,
    squadInviteOpen,
    setSquadInviteOpen,
    genderFilter,
    setGenderFilter,
    scale,
    translateY,
    squadLobby,
    squadMeetBusy,
    squadShareBusy,
    quickInviteFriends,
    quickInviteBusyId,
    quickInvitePendingIds,
    squadMemberActionBusyId,
    squadProductMessage,
    squadLobbyCall,
    squadLobbyMicMuted,
    setSquadLobbyMicMuted,
    squadLobbyAudioOff,
    setSquadLobbyAudioOff,
    guestProfiles,
    isSearching,
    setIsSearching,
    isResumeLoading,
    isCoinModalOpen,
    setIsCoinModalOpen,
    waitingForMatch,
    waitingMessage,
    waitingMatchedUser,
    matchedRoom,
    activeMeetingCount,
    overlay,
    setOverlay,
    currentImageIndex,
    setCurrentImageIndex,
    unreadCount,
    isVideoOn,
    setIsVideoOn,
    discoveryBlockedByOtherTab,
    isDiscoveryUserFetching,
    deckPhase,
    availableCities,
    handoffSecondsLeft,
    handoffCountdownSeconds,
    // Derived
    myUserId,
    squadGuestIds,
    isInSquadLobby,
    canSquadMeet,
    squadHomeInviteMeetSlotActive,
    allPhotos,
    discoveryCityFaceUser,
    user,
    isPullStrangerDisabled,
    isRoomFull,
    // Handlers
    handleLogout,
    fetchMyProfile,
    fetchWalletBalance,
    fetchCard,
    fetchCardSilently,
    beginDiscoverySearch,
    handleRaincheck,
    handleProceed,
    handleCancelWaiting,
    handleSelectLocation,
    cancelCityHandoff,
    handleNextImage,
    handlePrevImage,
    toggleFullscreen,
    // Squad handlers
    refreshSquadLobby,
    applySquadEnterResponse,
    ensureSquadLobbyCallStarted,
    handleSquadEnterCall,
    handleRemoveSquadMember,
    handleLeaveSquadSelf,
    getSquadInviteLink,
    shareSquadInvite,
    loadQuickInviteFriends,
    handleQuickSquadInvite,
    handleQuickSquadCancelInvite,
    cleanupSquadLobbyBackgroundAudio,
    getStreamingWsUrl,
  };
}
