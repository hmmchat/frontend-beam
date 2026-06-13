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
  const sessionIdRef = useRef(null);
  const modeRef = useRef('solo');
  const myUserIdRef = useRef(null);
  const allowUnmountCleanupRef = useRef(false);
  const mountCleanupArmTimerRef = useRef(null);
  const latestSilentFetchIdRef = useRef(0);

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
      setCurrentCard((prev) => {
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
      if (reqId !== latestSilentFetchIdRef.current) return;
      if (data?.card) {
        setIsSearching(true);
      }
      setCurrentCard((prev) => {
        const nextId = data?.card?.userId || data?.card?._id || data?.card?.id;
        const prevId = prev?.userId || prev?._id || prev?.id;
        if (nextId === prevId && prevId) {
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
        cardType: data?.card?.type || 'USER',
      });
    } catch (_) {
      flowLog('fetchCardSilently_error');
    } finally {
      setTimeout(() => setIsResumeLoading(false), 500);
    }
  };

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

  const handleRaincheck = async () => {
    if (!currentCard || swiping) return;

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
          raincheckedUserId: currentCard.userId,
        }),
      });
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

      let pullStrangerHandled = false;
      try {
        let roomInfo = await apiRequest(API.STREAMING.GET_PULL_STRANGER_ROOM(currentCard.userId));
        if ((!roomInfo?.exists || !roomInfo?.roomId) && currentCard.status === 'IN_SQUAD_AVAILABLE') {
          roomInfo = await apiRequest(API.STREAMING.GET_USER_ROOM(currentCard.userId));
        }

        if (roomInfo?.exists && roomInfo?.roomId) {
          console.log('[PullStranger] Target user room:', roomInfo.roomId);

          const joinData = await apiRequest(API.STREAMING.JOIN_VIA_PULL_STRANGER(roomInfo.roomId), {
            method: 'POST',
            body: JSON.stringify({
              joiningUserId: userId,
              targetUserId: currentCard.userId,
            }),
          });

          if (joinData?.roomId) {
            localStorage.setItem(
              'currentRoom',
              JSON.stringify({
                roomId: joinData.roomId,
                sessionId: joinData.sessionId || roomInfo.roomId,
                partner: {
                  id: currentCard.userId,
                  username: currentCard.username,
                  age: currentCard.age,
                  city: currentCard.city,
                  displayPictureUrl: currentCard.displayPictureUrl,
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
        if (currentCard.status === 'IN_SQUAD_AVAILABLE') {
          pullStrangerHandled = true;
          console.warn('[PullStranger] Direct join failed:', err);
          setError('Could not join this squad right now. Please fetch next card.');
          return;
        }
      }

      if (currentCard.status === 'IN_SQUAD_AVAILABLE' || pullStrangerHandled) {
        return;
      }

      const data = await apiRequest(API.DISCOVERY.PROCEED, {
        method: 'POST',
        body: JSON.stringify({
          matchedUserId: currentCard.userId,
        }),
      });

      console.log('Proceed Result:', data);

      if (data.roomId) {
        clearInterval(pollRef.current);
        localStorage.setItem(
          'currentRoom',
          JSON.stringify({
            roomId: data.roomId,
            sessionId: data.sessionId,
            partner: {
              id: currentCard.userId,
              username: currentCard.username,
              age: currentCard.age,
              city: currentCard.city,
              displayPictureUrl: currentCard.displayPictureUrl,
            },
          }),
        );
        isEnteringCallRef.current = true;
        await enterCall();
        router.push('/video-chat');
      } else if (data.success && !data.waiting && !data.roomId) {
        console.log('Both accepted, but backend room creation failed. Creating room via frontend...');
        try {
          const roomData = await apiRequest(API.STREAMING.CREATE_ROOM, {
            method: 'POST',
            body: JSON.stringify({
              userIds: [userId, currentCard.userId],
              callType: 'matched',
            }),
          });
          if (roomData && roomData.roomId) {
            clearInterval(pollRef.current);
            localStorage.setItem(
              'currentRoom',
              JSON.stringify({
                roomId: roomData.roomId,
                sessionId: roomData.sessionId || sessionId,
                partner: {
                  id: currentCard.userId,
                  username: currentCard.username,
                  age: currentCard.age,
                  city: currentCard.city,
                  displayPictureUrl: currentCard.displayPictureUrl,
                },
              }),
            );
            isEnteringCallRef.current = true;
            await enterCall();
            router.push('/video-chat');
            return;
          }
        } catch (roomErr) {
          console.error('Frontend fallback room creation failed:', roomErr);

          if (roomErr.message && roomErr.message.includes('already in an active room')) {
            try {
              const existingRoom = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
              if (existingRoom?.exists && existingRoom?.roomId) {
                clearInterval(pollRef.current);
                localStorage.setItem(
                  'currentRoom',
                  JSON.stringify({
                    roomId: existingRoom.roomId,
                    sessionId: existingRoom.sessionId || sessionId,
                    partner: {
                      id: currentCard.userId,
                      username: currentCard.username,
                      age: currentCard.age,
                      city: currentCard.city,
                      displayPictureUrl: currentCard.displayPictureUrl,
                    },
                  }),
                );
                isEnteringCallRef.current = true;
                await enterCall();
                router.push('/video-chat');
                return;
              }
            } catch (_) { }
          }

          setError('Match found, but video servers are currently unreachable. Please try again.');
        }
      } else if (data.waiting) {
        setWaitingForMatch(true);
        setWaitingMatchedUser(currentCard);

        let emptyPollCount = 0;
        const MAX_POLL_TICKS = 30;

        const startPollingRoom = () => {
          pollRef.current = setInterval(async () => {
            try {
              const streamData = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
              if (streamData.exists && streamData.roomId) {
                clearInterval(pollRef.current);
                clearTimeout(rescueTimeoutRef.current);
                localStorage.setItem(
                  'currentRoom',
                  JSON.stringify({
                    roomId: streamData.roomId,
                    sessionId: streamData.sessionId || streamData.roomId,
                    partner: {
                      id: currentCard.userId,
                      username: currentCard.username,
                      age: currentCard.age,
                      city: currentCard.city,
                      displayPictureUrl: currentCard.displayPictureUrl,
                    },
                  }),
                );
                isEnteringCallRef.current = true;
                await enterCall();
                router.push('/video-chat');
                return;
              }

              emptyPollCount++;
              if (emptyPollCount >= MAX_POLL_TICKS) {
                clearInterval(pollRef.current);
                setWaitingForMatch(false);
                setWaitingMatchedUser(null);
                setError('The other person did not respond in time. Fetching next card...');
                setTimeout(() => setError(''), 3000);
                fetchCard(sessionId);
              }
            } catch { }
          }, 3000);
        };

        startPollingRoom();
      } else {
        await fetchCard(sessionId);
      }
    } catch (error) {
      console.error('Error proceeding:', error);
      setError('Failed to connect. Please try again.');
    } finally {
      setSwiping(false);
    }
  };

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

      if (data.success && data.nextCard) {
        setCurrentCard(data.nextCard);
        setIsSearching(true);
        void fetchCardSilently(sessionId, soloMode);
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
      } catch (_) { }

      if (leftCallToHome) {
        flowLog('home_idle_online');
        setDiscoveryBlockedByOtherTab(isDiscoveryActiveElsewhere());
        void exitCallToHome().catch(() => setPresenceStatusKeepalive('ONLINE'));
        setIsSearching(false);
        setCurrentCard(null);
        localStorage.removeItem('forceDiscoveryResume');
        localStorage.removeItem('pendingRaincheckResume');
        localStorage.removeItem('pendingRaincheckNextCard');
        localStorage.removeItem('resumeDiscoveryOnHome');
        localStorage.removeItem('stickyDiscoveryResume');
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('searching');
          url.searchParams.delete('resumeDiscovery');
          url.searchParams.delete('sessionId');
          window.history.replaceState({}, '', url.toString());
        }
      } else if (shouldResumeDiscovery) {
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
        if (!isDiscoveryActiveElsewhere() && (isDiscoveryLeader() || !localStorage.getItem('discoveryTabLeader'))) {
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
    waitingForMatchRef.current = waitingForMatch;
  }, [waitingForMatch]);

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
    const unsubTab = subscribeTabCoordinator(syncTabDiscoveryState);
    const unsubPresence = subscribePresenceRealtime((payload) => {
      if (payload?.eventType === 'discovery:matched') {
        if (isSearchingRef.current && !waitingForMatchRef.current) {
          void fetchCardSilently(sessionIdRef.current, modeRef.current === 'solo');
        }
        return;
      }
      if (!payload?.userId) return;
      if (payload.userId === myUserIdRef.current) {
        void fetchMyProfile();
        if (payload.status === 'ONLINE' && isSearchingRef.current) {
          setIsSearching(false);
          setCurrentCard(null);
        }
        if (payload.status === 'MATCHED' && isSearchingRef.current && !waitingForMatchRef.current) {
          void fetchCardSilently(sessionIdRef.current, modeRef.current === 'solo');
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
      void exitDiscovery();
    } else {
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

  useEffect(() => {
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
