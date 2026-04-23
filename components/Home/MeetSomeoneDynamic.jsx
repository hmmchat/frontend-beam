'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import FilterButtons from '@/components/ui/FilterButtons';
import MeetNowButton from '@/components/ui/MeetNowButton';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import { IoLogOutOutline, IoClose, IoVideocam } from 'react-icons/io5';
import { API, apiRequest } from '@/lib/api';
import { setPresenceStatus, setPresenceStatusKeepalive } from '@/lib/presence-status';
import FaceCard4 from './FaceCard4';
import LocalVideo from './LocalVideo';
import clsx from 'clsx';
import LocationCard from './LocationCard';
import { getFacecardPhotos } from '@/lib/facecard-utils';
import { clearPendingReferralCode } from '@/components/CaptureReferralFromUrl';

import FaceCard from './FaceCard';
import CoinModal from '@/components/modals/CoinModal';
import MeetSomeoneNew from './MeetSomeoneNew';
import OverlayLayer from '@/components/ui/OverlayLayer';
import SquadInviteFriendsModal from '@/components/Home/SquadInviteFriendsModal';
import Link from 'next/link';
import Skeleton from '@/components/ui/Skeleton';
import { IoIosArrowBack, IoIosArrowForward,} from 'react-icons/io';




export default function MeetSomeoneDynamic() {
  const router = useRouter();
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
  const [squadProductMessage, setSquadProductMessage] = useState('');
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
  const [isVideoOn, setIsVideoOn] = useState(true);


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
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        // GET_NOTIFICATIONS_COUNT returns counts for INBOX, RECEIVED_REQUESTS, SENT_REQUESTS, and FRIEND_REQUESTS.
        // It accounts for lastSeenAt, so visiting /inbox reduces the count appropriately.
        const notifRes = await apiRequest(API.FRIENDS.GET_NOTIFICATIONS_COUNT).catch(() => null);

        if (notifRes) {
          // unreadCount reflects anything "new" (unread messages or pending requests)
          // We sum totalUnreadMessages (inbox + requests) and pendingFriendRequests.
          const count = (notifRes.totalUnreadMessages || 0) + (notifRes.pendingFriendRequests || 0);
          setUnreadCount(count);
        }
      } catch (e) {
        // fail silently
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
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
  const latestSilentFetchIdRef = useRef(0);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    clearPendingReferralCode();
    window.location.href = '/';
  };

  useEffect(() => {
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
        // Only attempt leave if this user is still marked in an active room
        // Use LEAVE_ROOM (removes just this user) rather than END_ROOM (kills whole room)
        if (stuckRoom?.exists && stuckRoom?.roomId) {
          fetch(API.STREAMING.LEAVE_ROOM(stuckRoom.roomId), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId })
          }).catch(() => {}); // fire-and-forget; 404 = room already cleaned up, safe to ignore
        }
      } catch (_) {}
    };
    clearGhostRoom();

    // 1) URL-based recovery (searching mode) - DISABLED to prevent auto-camera open
    // We only react to URL changes via popstate now, or explicit clicks.
    /*
    const urlSearching = params?.get('searching') === '1';
    if (urlSearching) {
        setIsSearching(true);
        handleUpdateStatus('AVAILABLE');
        fetchCardSilently(Date.now().toString(), true);
    }
    */

    // 2) Original resume logic (rainchecks, sessions, etc.)
    // DISABLED to follow "explicit click only" rule for camera/discovery
    /*
    if (resumeDiscoveryFromUrl || pendingRaincheckRaw || forcedResumeRaw || resumeOnHomeRaw) {
      // ... logic disabled to prevent auto-camera open on mount ...
    }
    */

    // Default to ONLINE; never auto-start searching on mount
    flowLog('recovery_guard_set_online');
    handleUpdateStatus('ONLINE');
    setIsSearching(false);
    setCurrentCard(null);

    // Clean up all resume flags on visit
    localStorage.removeItem('forceDiscoveryResume');
    localStorage.removeItem('pendingRaincheckResume');
    localStorage.removeItem('pendingRaincheckNextCard');
    localStorage.removeItem('resumeDiscoveryOnHome');
    localStorage.removeItem('stickyDiscoveryResume');

    const setOnlineKeepalive = () => {
      setPresenceStatusKeepalive('ONLINE');
    };
    window.addEventListener('beforeunload', setOnlineKeepalive);

    // Synchronize isSearching state with URL for browser back button support
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('searching') !== '1') {
        setIsSearching(false);
        setCurrentCard(null);
        handleUpdateStatus('ONLINE');
      }
      // Removed auto-start of search on back/forward to follow "explicit click only" rule
    };
    window.addEventListener('popstate', handlePopState);

    // CLEANUP: Stop polling if the component unmounts
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (discoveryPollRef.current) clearInterval(discoveryPollRef.current);
      if (rescueTimeoutRef.current) clearTimeout(rescueTimeoutRef.current);
      window.removeEventListener('beforeunload', setOnlineKeepalive);
      window.removeEventListener('popstate', handlePopState);
      // Do not override status when transitioning into active video chat.
      if (!isEnteringCallRef.current) {
        const hasResumeFlags =
          Boolean(localStorage.getItem('stickyDiscoveryResume')) ||
          Boolean(localStorage.getItem('resumeDiscoveryOnHome')) ||
          Boolean(localStorage.getItem('forceDiscoveryResume')) ||
          Boolean(localStorage.getItem('pendingRaincheckResume'));
        // Avoid ONLINE flip during strict-mode remount and active discovery resume.
        if (!hasResumeFlags && !isSearchingRef.current) {
          handleUpdateStatus('ONLINE');
        }
      }
    };
  }, []);

  const handleUpdateStatus = async (status) => {
    try {
      await setPresenceStatus(status);
    } catch (err) {
      // Status update is non-critical — don't surface to user
    }
  };

  useEffect(() => {
    isSearchingRef.current = isSearching;
  }, [isSearching]);

  // Keep discovery users visible in matchmaking pool even when current card is LOCATION.
  useEffect(() => {
    if (!isSearching || waitingForMatch || mode !== 'solo') return;
    handleUpdateStatus('AVAILABLE');
  }, [isSearching, waitingForMatch, mode]);

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
  const canSquadMeet =
    isInSquadLobby &&
    squadLobby?.status !== 'IN_CALL' &&
    squadLobby.memberIds.length >= 2;

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
    if (mode !== 'squad') setSquadProductMessage('');
  }, [mode]);

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
      void refreshSquadLobby();
    }, 3000);
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

  const applySquadEnterResponse = useCallback(
    async (data) => {
      const roomKey = data?.roomId || '';
      if (!roomKey) return;
      if (squadVideoRoomNavKeyRef.current === roomKey) return;

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
      squadVideoRoomNavKeyRef.current = roomKey;
      router.push('/video-chat');
    },
    [myUserId, router],
  );

  useEffect(() => {
    if (mode !== 'squad' || squadLobby?.status !== 'IN_CALL') return;
    if (squadMeetBusy) return;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/video-chat')) return;
    // Host starts the call via the primary button; auto-join is for accepted guests (avoids duplicate enter + flicker).
    if (myUserId && squadLobby?.inviterId && String(squadLobby.inviterId) === String(myUserId)) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest(API.SQUAD.ENTER_CALL, { method: 'POST' });
        if (cancelled) return;
        await applySquadEnterResponse(data);
      } catch (e) {
        if (e?.status === 410) {
          await refreshSquadLobby();
        }
        // Host may still be creating the room; next membership poll will retry.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    mode,
    squadLobby?.status,
    squadLobby?.inviterId,
    myUserId,
    squadMeetBusy,
    applySquadEnterResponse,
    refreshSquadLobby,
  ]);

  const handleSquadEnterCall = async () => {
    if (!canSquadMeet || squadMeetBusy) return;
    setSquadProductMessage('');
    setSquadMeetBusy(true);
    try {
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
    const cardId = currentCard?.userId || currentCard?._id || currentCard?.id;
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
      handleUpdateStatus('ONLINE');
    } else {
      // Switching back to solo resets to the landing state
      setIsSearching(false);
      setCurrentCard(null);
      setWaitingForMatch(false);
      setWaitingMatchedUser(null);
      clearInterval(pollRef.current);
      clearTimeout(rescueTimeoutRef.current);
      localStorage.removeItem('stickyDiscoveryResume');
      handleUpdateStatus('ONLINE');
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
      handleSelectLocation(currentCard.city);
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

  const handleSelectLocation = async (city) => {
    setSwiping(true);
    try {
      const data = await apiRequest(API.DISCOVERY.SELECT_LOCATION, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: sessionId,
          city: city
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
      fetchCardSilently(sessionId || null, mode === 'solo');
    }, 2000);

    return () => {
      if (discoveryPollRef.current) {
        clearInterval(discoveryPollRef.current);
        discoveryPollRef.current = null;
      }
    };
  }, [isSearching, waitingForMatch, swiping, sessionId, mode]);

  return (
    <div className={clsx('relative', 'min-h-screen', 'w-full', 'overflow-hidden', 'font-[family-name:var(--font-otomanopee)]')}>
      <main className={clsx('grid', 'grid-cols-1', 'md:grid-cols-2', 'h-screen', 'overflow-hidden')}>

        {/* MOBILE VIEW (CONDITIONAL) */}
        {!isSearching && (
          <div className={clsx('block', 'md:hidden')}>
            <MeetSomeoneNew 
              onMeetNow={async () => {
                setIsSearching(true);
                // Push state to browser history so back button returns to home interface
                if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('searching', '1');
                    window.history.pushState({ searching: true }, '', url.toString());
                }
                await handleUpdateStatus('AVAILABLE');
                await fetchCard(null, true);
              }}
              mode={mode}
              setMode={setMode}
              coins={coins}
              activeUsers={activeMeetingCount}
              myProfile={myProfile}
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
                </div>
              ) : currentCard.type === 'LOCATION' || currentCard.isLocationCard ? (
                <LocationCard 
                  city={currentCard.city} 
                  count={currentCard.availableCount}
                  onSelect={() => handleSelectLocation(currentCard.city)}
                  onSkip={handleRaincheck}
                />
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




{/* MOBILE ONLY CLOSE BUTTON while searching */}
{isSearching && (
  <button
     onClick={async () => {
       setIsSearching(false);
       setCurrentCard(null);
       // Reset search state in URL
       if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('searching');
          window.history.pushState({}, '', url.toString());
       }
     }}
     className={clsx('md:hidden', 'absolute', 'top-4', 'right-4', 'z-[100]', 'w-12', 'h-12', 'rounded-full', 'flex', 'items-center', 'justify-center', 'text-white', 'shadow-xl', 'active:scale-95', 'transition-all')}
     title="Exit Search"
  >
     <IoClose className="text-3xl" />
  </button>
)}

          

    
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
                  setIsSearching(true);
                  if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href);
                      url.searchParams.set('searching', '1');
                      window.history.pushState({ searching: true }, '', url.toString());
                  }
                  await handleUpdateStatus('AVAILABLE');
                  await fetchCard(null, true);
                }}
                isSearching={isSearching}
                className="mt-40 w-[79%] h-30"
                isVideoOn={isVideoOn}
                onVideoClick={() => setIsVideoOn(!isVideoOn)}
              />


   

                  <FilterButtons
                    onGenderClick={() => setIsGenderModalOpen(true)}
                    onLocationClick={() => setIsLocationModalOpen(true)}
                    locationLabel={myProfile?.preferredCity === 'ANYWHERE_IN_INDIA' ? 'Anywhere' : (myProfile?.preferredCity || 'Anywhere')}
                    className={clsx( 'text-white')}
                  />
                </>
              ) : (
                <div className={clsx('absolute', 'inset-0', 'z-0', 'overflow-hidden', 'rounded-2xl', 'shadow-2xl', 'border-2', 'border-white/20', 'flex flex-col md:block')}>
                  
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
                                "flex md:hidden w-full relative z-20 items-center justify-center pt-14 pb-4 px-4 overflow-hidden transition-all duration-500",
                                isFaceCardState ? "h-full" : "h-1/2"
                            )}
                            style={{
                              backgroundImage: 'url(/assets/mb.jpg)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            {/* 🔲 HUD BORDER FRAME (Mobile Top/Full) */}
                            <div className={clsx('absolute', 'inset-2', 'border', 'border-white/40', 'rounded-[2rem]', 'pointer-events-none', 'z-30')} />

                            <div className={clsx(
                                "origin-center transition-transform duration-500",
                                isFaceCardState ? "scale-[0.8] sm:scale-[0.85]" : "scale-[0.75] sm:scale-[0.8]"
                            )}>
                              {isSearchingState ? (
                                <div className={clsx('flex', 'flex-col', 'items-center', 'justify-center', 'w-full')}>
                                </div>
                              ) : isLocationState ? (
                                <LocationCard 
                                  location={currentCard.location || {
                                    city: currentCard.city,
                                    country: currentCard.country,
                                    image: currentCard.image
                                  }} 
                                  onAccept={() => handleAcceptCard(currentCard)}
                                  onNext={() => fetchCard(null)}
                                />
                              ) : (

                                
                                <div className={clsx('relative', 'group/card', 'cursor-grab', 'active:cursor-grabbing')}>
                                  <FaceCard
                                    user={currentCard} 
                                    hideArrows={true} 
                                    currentIndex={currentImageIndex}
                                    onIndexChange={setCurrentImageIndex}
                                  />

                        <div className={clsx('absolute', 'bottom-6', 'left-0', 'w-full', 'flex', 'items-center', 'justify-between', 'gap-3', 'px-4')}>
                                    <button
                                      onClick={handlePrevImage}
                                      className={clsx('relative', 'z-[110]', 'w-12', 'h-12', 'rounded-full', 'border', 'border-white/40', 'flex', 'items-center', 'justify-center', 'text-white', 'text-3xl', 'hover:bg-white/10', 'transition', 'active:scale-75', 'cursor-pointer', 'backdrop-blur-sm')}
                                    >
                                      ←
                                    </button>

                                    <button
                                      onClick={handleRaincheck}
                                      className={clsx('px-4', 'py-2', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-xs', 'whitespace-nowrap', 'hover:bg-white/10', 'transition', 'active:scale-95')}
                                    >
                                      Raincheck!
                                    </button>

                                    {/* MEET (accept) */}
                                    <button
                                      onClick={handleProceed}
                                      className={clsx('px-4', 'py-2', 'rounded-full', 'border', 'border-white/30', 'text-white', 'text-xs', 'whitespace-nowrap', 'hover:bg-white/10', 'transition', 'active:scale-95')}
                                    >
                                      Meet rn.  
                                    </button>

                                    <button
                                      onClick={handleNextImage}
                                      className={clsx('relative', 'z-[110]', 'w-12', 'h-12', 'rounded-full', 'border', 'border-white/40', 'flex', 'items-center', 'justify-center', 'text-white', 'text-3xl', 'hover:bg-white/10', 'transition', 'active:scale-75', 'cursor-pointer', 'backdrop-blur-sm')}
                                    >
                                      →
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>

                          {/* BOTTOM HALF (CAM PREVIEW) - Hidden when FaceCard is shown on mobile */}
                          {!isFaceCardState && (
                            <div className={clsx('flex', 'md:hidden', 'h-1/2', 'w-full', 'relative', 'z-[1]', 'min-h-0')}>
                                <div className={clsx('absolute', 'inset-2', 'pointer-events-none', 'z-10')} />
                                <LocalVideo 
                                    showSoloCheckbox={false} 
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
            /* SQUAD VIEW */
            <div className={clsx('relative', 'z-10', 'w-full', 'h-full', 'flex', 'flex-col', 'items-center', 'justify-center')}>

              {/* Video background for squad mode */}
              <div className={clsx('absolute', 'inset-0', 'z-0', 'overflow-hidden', 'rounded-2xl')}>
                


              </div>

              {/* Squad UI overlay */}
              <div className={clsx('relative', 'z-10', 'w-full', 'max-w-4xl', 'text-center', 'justify-center', 'mt-12', 'md:mt-20', 'px-2')}>
                {squadProductMessage ? (
                  <div
                    role="alert"
                    className={clsx(
                      'mx-auto',
                      'mb-4',
                      'max-w-lg',
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
                <div className={clsx('flex', 'items-center', 'justify-center', 'gap-2', 'md:gap-4', 'mb-8', 'md:mb-10', 'font-sans', 'flex-wrap')}>
                  {/* Me */}
                  <div className={clsx('flex', 'items-center', 'gap-2', 'md:gap-4')}>
                    <div className={clsx('flex', 'flex-col', 'items-center', 'gap-2')}>
                      <div className={clsx('relative', 'w-16', 'h-16', 'md:w-20', 'md:h-20', 'rounded-full', 'border-[3.5px]', 'border-white/90', 'flex', 'items-center', 'justify-center', 'overflow-hidden', 'bg-black/10')}>
                        <img src={myProfile?.displayPictureUrl || '/assets/avatar1.png'} alt="me" className={clsx('w-full', 'h-full', 'object-cover')} />
                      </div>
                      <span className="text-xs">Me</span>
                    </div>
                  </div>
                  {squadGuestIds.map((guestId, i) => (
                    <div key={`g-${i}`} className={clsx('flex', 'items-center', 'gap-2', 'md:gap-4')}>
                      <div className="mb-6 md:mb-8">
                        <img src="/assets/plus.png" alt="" className={clsx('w-4', 'h-4', 'opacity-70')} />
                      </div>
                      <div className={clsx('flex', 'flex-col', 'items-center', 'gap-2')}>
                        <div className={clsx('relative', 'w-16', 'h-16', 'md:w-20', 'md:h-20', 'rounded-full', 'border-[3.5px]', 'border-white/90', 'flex', 'items-center', 'justify-center', 'overflow-hidden', 'bg-black/10')}>
                          {guestId && guestProfiles[guestId]?.displayPictureUrl ? (
                            <img src={guestProfiles[guestId].displayPictureUrl} alt="" className={clsx('w-full', 'h-full', 'object-cover')} />
                          ) : guestId ? (
                            <span className="text-xl md:text-3xl text-white/60">…</span>
                          ) : (
                            <span className={clsx('text-2xl', 'md:text-3xl', 'text-white')}>?</span>
                          )}
                        </div>
                        <span className="text-xs">{guestId ? guestProfiles[guestId]?.username || 'Friend' : 'Who'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {canSquadMeet && (
                  <div className="mb-6 flex justify-center px-4">
                    <button
                      type="button"
                      disabled={squadMeetBusy}
                      onClick={handleSquadEnterCall}
                      className={clsx(
                        'flex items-center justify-center gap-2 rounded-2xl px-6 py-3 md:px-10 md:py-4',
                        'bg-gradient-to-r from-fuchsia-600 to-violet-700 border border-white/30 text-white font-semibold text-sm md:text-base',
                        'hover:opacity-95 active:scale-[0.98] transition shadow-lg disabled:opacity-50'
                      )}
                    >
                      <IoVideocam className="text-xl" />
                      {squadMeetBusy ? 'Starting…' : 'Meet someone rn'}
                    </button>
                  </div>
                )}

              {/* Share */}
              <div className={clsx('inline-flex', 'items-center', 'gap-4', 'bg-[#0A032D]/40', 'rounded-full', 'px-10', 'py-3', 'mb-8', 'font-sans')}>
                <span className={clsx('text-white/80', 'text-sm', 'font-medium', 'mr-2')}>Share to</span>

                 <button className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white')}>
                  <img src="/shareicon4.png" className={clsx('w-6', 'h-6')} />
                </button>
                 <button className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white')}>
                  <img src="/shareicon2.png" className={clsx('w-6', 'h-6')} />
                </button>
                <button className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white')}>
                  <img src="/shareicon1.png" className={clsx('w-6', 'h-6')} />
                </button>
               
                <button className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white')}>
                  <img src="/shareicon3.png" className={clsx('w-6', 'h-6')} />
                </button>
               
              </div>

           

              </div> {/* end squad UI overlay */}
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
        onInviteSent={() => void refreshSquadLobby()}
      />
    </div>
  );
}
