'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import FilterButtons from '@/components/ui/FilterButtons';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import { IoLogOutOutline, IoClose, IoVideocam } from 'react-icons/io5';
import { API, apiRequest } from '@/lib/api';
import { setPresenceStatus, setPresenceStatusKeepalive } from '@/lib/presence-status';
import FaceCard from './FaceCard';
import LocalVideo from './LocalVideo';
import clsx from 'clsx';
import LocationCard from './LocationCard';
import { getFacecardPhotos } from '@/lib/facecard-utils';

import CoinModal from '@/components/modals/CoinModal';
import MeetSomeoneNew from './MeetSomeoneNew';
import OverlayLayer from '@/components/ui/OverlayLayer';
import Link from 'next/link';
import Skeleton from '@/components/ui/Skeleton';
import { IoIosArrowBack, IoIosArrowForward,} from 'react-icons/io';



const LocationCardSkeleton = () => (
  <div className="h-[620px] md:h-[660px] w-[340px] md:w-[360px] shrink-0 aspect-[360/660] rounded-[30px] border border-white/30 p-[2px]">
    <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-black/20 backdrop-blur-md flex flex-col items-center justify-center p-8">
      <Skeleton circle className="w-40 h-40 border-4 border-white/5 mb-8" />
      <Skeleton className="h-6 w-40 mb-4" />
      <Skeleton className="h-3 w-56 mb-8 opacity-50" />
      <Skeleton className="h-14 w-full border border-white/10 rounded-2xl" />
    </div>
  </div>
);

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
  const [invited, setInvited] = useState(['Austin']);
  const [myProfile, setMyProfile] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isResumeLoading, setIsResumeLoading] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [waitingForMatch, setWaitingForMatch] = useState(false);
  const [waitingMatchedUser, setWaitingMatchedUser] = useState(null);
  const [matchedRoom, setMatchedRoom] = useState(null);
  const [activeMeetingCount, setActiveMeetingCount] = useState(0);
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const pollRef = useRef(null);
  const discoveryPollRef = useRef(null);
  const rescueTimeoutRef = useRef(null);
  const initDoneRef = useRef(false);
  const isEnteringCallRef = useRef(false);
  const modeInitRef = useRef(false);
  const isSearchingRef = useRef(false);
  const latestSilentFetchIdRef = useRef(0);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    // Clear any other session data if needed
    window.location.href = '/'; // Using href for a full reload to reset all states
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

  const fetchMyProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      const response = await fetch(API.USERS.GET_USER(userId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMyProfile(data.user);
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
   console.log('MeetSomeoneDynamic Debug (currentCard photos):', {
    username: currentCard?.username,
    photosCount: allPhotos?.length,
    currentImageIndex,
    allPhotos
  });

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

  const toggleInvite = (name) =>
    setInvited((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

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
          <div className="block md:hidden ">
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
<div className="hidden md:flex relative h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-gradient-purple-dark px-6 py-10 md:py-16 lg:py-8">

  <div
    className="absolute inset-0 z-0"
    style={{
      backgroundImage: 'url(/assets/mb.jpg)',
      backgroundRepeat: 'repeat',
      backgroundSize: 'cover',
    }}
  />

  {/* 🔲 HUD BORDER FRAME (Desktop Left) */}
  <div className="hidden md:block absolute inset-4 border-2 border-white/30 rounded-[40px] pointer-events-none z-30" />
        
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
                    'overflow-hidden',
                    'py-0'
                  )}
                >
                  <div className="flex w-full flex-col items-center gap-2 
                max-h-[80vh] justify-center
                [@media(max-height:800px)]:scale-[0.9]
                [@media(max-height:700px)]:scale-[0.8]">

  <FaceCard 
    user={currentCard} 
    hideArrows={true} 
    currentIndex={currentImageIndex}
    onIndexChange={setCurrentImageIndex}
  />

  {/* BUTTONS */}
  <div className="flex w-full items-center justify-between gap-3 px-2 mt-4 md:mt-6">

    <button onClick={handlePrevImage} className="w-12 h-12 flex items-center justify-center rounded-full border border-white/30 text-white text-2xl backdrop-blur-md hover:bg-white/10 transition active:scale-90">
      <IoIosArrowBack />
    </button>

    <div className="flex flex-1 items-center gap-3">
      <button onClick={handleRaincheck} className="flex-1 py-3 rounded-full border border-white/30 text-white text-sm backdrop-blur-md hover:bg-white/10 transition active:scale-95">
        Raincheck!
      </button>

      <button onClick={handleProceed} className="flex-1 py-3 rounded-full border border-white/30 text-white text-sm backdrop-blur-md hover:bg-white/10 transition active:scale-95">
        Meet rn
      </button>
    </div>

    <button onClick={handleNextImage} className="w-12 h-12 flex items-center justify-center rounded-full border border-white/30 text-white text-2xl backdrop-blur-md hover:bg-white/10 transition active:scale-90">
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
                  <img src="/LOGO.png" className={clsx('md:w-64', 'mx-auto', 'w-44')} />
                  <p className={clsx('text-white', 'text-2xl', 'font-[family-name:var(--font-otomanopee)]')}>Meet someone here,</p>
                  <div className={clsx('inline-flex', 'gap-2', 'mt-3', 'font-[family-name:var(--font-otomanopee)]')}>
                    <img src="/assets/video-on.svg" alt="" className={clsx('w-4', 'h-4')} />
                    <p className='text-xs'>
                      {activeMeetingCount !== null ? activeMeetingCount.toLocaleString() : '0'} meeting now
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

<div
  className="absolute inset-0 z-[1] opacity-70 mix-blend-hard-light md:animate-zoom-slow"
  style={{
    backgroundImage: 'url(/bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'repeat',
  }}
/>    

      

          {/* Overlay for better text visibility */}



          {/* Coins pill (restore original placement) */}
          <div className={clsx('absolute', 'top-2', 'md:top-10', 'left-8', 'z-50', isSearching && 'hidden')}>
            <button className=' inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full text-base font-semibold border border-b-4 border-white/50 transition-all duration-300 ease-out relative overflow-hidden' onClick={() => setIsCoinModalOpen(true)}>
              <img src="/assets/Coin-token.svg" className={clsx('w-6', 'h-6')} alt="" />
              <div className={clsx('text-sm', 'font-semibold')}>{coins.toLocaleString()}</div>
              <img src="/assets/plus.png" className={clsx('w-4', 'h-4')} alt="" />
            </button>
          </div>

          {/* Top Icons */}
          <div className={clsx('absolute', 'top-2', 'md:top-10', 'left-1/2', '-translate-x-1/2', 'flex', 'gap-2', 'md:gap-5', 'z-50', 'border-2', 'border-white/40', 'rounded-full', 'px-4', 'md:px-12', 'py-1', isSearching && 'hidden')}>
            <button 
              onClick={() => {
                if (isSearching) {
                  setOverlay({ open: true, url: '/inbox', title: 'Messages' });
                } else {
                  router.push('/inbox');
                }
              }}
              className="w-10 md:w-12 h-10 md:h-12 flex items-center justify-center hover:bg-white/20 rounded-full"
            >
              <img src="/assets/chat-with-indicator.svg" className="w-8 h-8" alt="Messages" />
            </button>
            <button 
              onClick={() => {
                if (isSearching) {
                  setOverlay({ open: true, url: '/history', title: 'History' });
                } else {
                  router.push('/history');
                }
              }}
              className="w-10 md:w-12 h-10 md:h-12 flex items-center justify-center hover:bg-white/20 rounded-full"
            >
              <img src="/assets/history.svg" className="w-8 h-8" alt="History" />
            </button>
               {/* Profile */}
<button 
  onClick={() => {
    if (isSearching) {
      setOverlay({ open: true, url: '/facecard?view=editor', title: 'Profile' });
    } else {
      router.push('/facecard?view=editor');
    }
  }}
  className="w-10 md:w-10 h-10 md:h-10 flex items-center justify-center hover:bg-white/20 rounded-full overflow-hidden my-auto"
>
  {myProfile ? (
    <img 
      src={myProfile.displayPictureUrl || "/assets/ico.png"} 
      onError={(e) => e.currentTarget.src = "/assets/ico.png"}
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full bg-white/20 animate-pulse rounded-full" />
  )}
</button>
    
    <button 
      onClick={handleLogout}
      className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'hover:bg-red-500/20', 'rounded-full', 'transition-colors')}
      title="Logout"
    >
      <IoLogOutOutline className={clsx('text-white', 'text-2xl')} />
    </button>




        

          </div>


          <div className={clsx('absolute', 'top-4', 'md:top-11', 'right-8', 'z-50', 'flex', 'gap-2', isSearching && 'hidden')}>

  <Link href="/beam-tv">
  <button className="h-12 w-12 rounded-full p-2 border-2 border-white/60 shadow-md transition-all duration-200 items-center justify-center flex">
    <img src="/crown.png" alt="crown" />
  </button>
</Link>



  <button
    type="button"
    onClick={() => setOverlay({ open: true, url: '/onboarding?intent=1&overlay=1', title: 'Intent' })}
    className="w-10 md:w-12 h-10 md:h-12 rounded-full hover:bg-white/10 active:scale-95 transition flex items-center justify-center"
    title="Intent"
  >
    <img src="/icones1.png" alt="Intent" className={clsx('w-12', 'h-12')} />
  </button>
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
     className="md:hidden absolute top-4 right-4 z-[100] w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 transition-all"
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
             <button
  onClick={async () => { 
    setIsSearching(true);
    // Push state to browser history so back button returns to home interface
    if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('searching', '1');
        window.history.pushState({ searching: true }, '', url.toString());
    }
    // Enter discovery pool first, then fetch card to avoid first-fetch mismatch.
    await handleUpdateStatus('AVAILABLE');
    await fetchCard(null, true);
  }}
  className={clsx(
    'group relative z-20 mt-60 w-[75%] h-24 border-2 border-b-4 rounded-[20px] flex items-center justify-center gap-4 active:scale-[0.98] transition-all overflow-hidden shadow-2xl',
    isSearching
      ? 'bg-yellow-500 text-black border-black animate-pulse'
      : 'bg-black/30 text-white border-white hover:bg-black/40'
  )}
>
  {!isSearching && (
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 opacity-50" />
  )}
  <div className={clsx(
    "w-11 h-11 rounded-full border flex items-center justify-center group-hover:scale-110 transition-transform z-10",
    isSearching ? "border-black" : "border-white/60"
  )}>
    <IoVideocam className={clsx(
      "text-xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
      isSearching ? "text-black" : "text-white"
    )} />
  </div>
  <span className={clsx(
    "text-xl font-bold tracking-tight z-10 text-[20px]",
    isSearching ? "" : "text-white"
  )}>
    {isSearching ? 'Searching...' : 'Meet Someone now'}
  </span>
</button>

                  <FilterButtons
                    onGenderClick={() => setIsGenderModalOpen(true)}
                    onLocationClick={() => setIsLocationModalOpen(true)}
                    className={clsx('mt-2', 'text-white')}
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
                            <div className="absolute inset-2 border border-white/40 rounded-[2rem] pointer-events-none z-30" />

                            <div className={clsx(
                                "origin-center transition-transform duration-500",
                                isFaceCardState ? "scale-[0.8] sm:scale-[0.85]" : "scale-[0.75] sm:scale-[0.8]"
                            )}>
                              {isSearchingState ? (
                                <div className="flex flex-col items-center justify-center w-full">
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
                                <div className="relative group/card cursor-grab active:cursor-grabbing">
                                  <FaceCard 
                                    user={currentCard} 
                                    hideArrows={true} 
                                    currentIndex={currentImageIndex}
                                    onIndexChange={setCurrentImageIndex}
                                  />

                                  <div className="flex gap-2 mt-4 items-center justify-center gap-6 ">
                                    <button
                                      onClick={handlePrevImage}
                                      className="relative z-[110] w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:bg-white/10 transition active:scale-75 cursor-pointer backdrop-blur-sm"
                                    >
                                      ←
                                    </button>

                                    <button
                                      onClick={handleRaincheck}
                                      className="px-4 py-2 rounded-full border border-white/30 text-white text-xs whitespace-nowrap hover:bg-white/10 transition active:scale-95"
                                    >
                                      Raincheck!
                                    </button>

                                    {/* MEET (accept) */}
                                    <button
                                      onClick={handleProceed}
                                      className="px-4 py-2 rounded-full border border-white/30 text-white text-xs whitespace-nowrap hover:bg-white/10 transition active:scale-95"
                                    >
                                      Meet rn
                                    </button>

                                    <button
                                      onClick={handleNextImage}
                                      className="relative z-[110] w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:bg-white/10 transition active:scale-75 cursor-pointer backdrop-blur-sm"
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
                            <div className="flex md:hidden h-1/2 w-full relative z-[1] min-h-0">
                                <div className="absolute inset-2 border border-white/40 rounded-[2rem] pointer-events-none z-10" />
                                <LocalVideo 
                                    showSoloCheckbox={false} 
                                    onSoloChange={(checked) => setMode(checked ? 'solo' : 'squad')} 
                                />
                            </div>
                          )}
                        </>
                    );
                  })()}

                  <div className="hidden md:block relative flex-1 md:absolute md:inset-0 z-[1] w-full min-h-0">
                    {/* 🎥 VIDEO (Desktop only - Mobile video handled above) */}
                    <LocalVideo 
                      showSoloCheckbox={false} 
                      onSoloChange={(checked) => setMode(checked ? 'solo' : 'squad')} 
                    />
                    
                    {/* 🌫 LIGHT OVERLAY (Desktop only) */}
                    <div className="hidden md:block absolute inset-0 bg-black/10" />

                    {/* 🔲 BORDER FRAME (Desktop only) */}
                    <div className="hidden md:block absolute inset-4 border border-white/30 rounded-[40px] pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SQUAD VIEW */
            <div className={clsx('relative', 'z-10', 'w-full', 'h-full', 'flex', 'flex-col', 'items-center', 'justify-center')}>

              {/* Video background for squad mode */}
              <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl border-2 border-white/20">
                {isSearching ? (
                   <LocalVideo 
                     showSoloCheckbox={false}
                   />
                ) : (
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <img src="/LOGO.png" className="w-32 opacity-20" alt="" />
                   </div>
                )}
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-4 border border-white/40 rounded-[40px] pointer-events-none" />
              </div>

              {/* Squad UI overlay */}
              <div className={clsx('relative', 'z-10', 'w-full', 'max-w-3xl', 'text-center', 'justify-center', 'mt-20')}>
             
              <div className={clsx('flex', 'items-center', 'justify-center', 'gap-4', 'mb-10', 'font-sans')}>
                {['Me', 'Who', 'Who'].map((label, i, arr) => (
                  <div key={i} className={clsx('flex', 'items-center', 'gap-4')}>
                    <div className={clsx('flex', 'flex-col', 'items-center', 'gap-2')}>
                      <div className={clsx('relative', 'w-20', 'h-20', 'rounded-full', 'border', 'border-white/30', 'flex', 'items-center', 'justify-center', 'overflow-hidden', 'bg-white/5')}>
                        {label === 'Me' ? (
                          <img src={myProfile?.displayPictureUrl || "/assets/ico.png"} alt="me" className="w-full h-full object-cover" />
                        ) : (
                          <span className={clsx('text-2xl', 'text-white/50')}>?</span>
                        )}
                      </div>
                      <span className="text-xs">{label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="mb-6">
                        <img src="/assets/plus.png" alt="+" className={clsx('w-4', 'h-4', 'opacity-70')} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Share */}
              <div className={clsx('inline-flex', 'items-center', 'gap-4', 'bg-black/20', 'rounded-full', 'px-6', 'py-3', 'mb-8', 'font-sans')}>
                <span className={clsx('text-white/80', 'text-sm', 'font-medium', 'mr-2')}>Share to</span>
                <button className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white')}>
                  <img src="/shareicon1.png" className={clsx('w-6', 'h-6')} />
                </button>
                <button className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white')}>
                  <img src="/shareicon2.png" className={clsx('w-6', 'h-6')} />
                </button>
                <button className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white')}>
                  <img src="/shareicon3.png" className={clsx('w-6', 'h-6')} />
                </button>
                <button className={clsx('hover:bg-white/10', 'p-2', 'rounded-full', 'transition', 'text-white')}>
                  <img src="/shareicon4.png" className={clsx('w-6', 'h-6')} />
                </button>
              </div>

              {/* Invite */}
              <div className={clsx('flex', 'justify-center', 'gap-4')}>
                <span className={clsx('text-white/80', 'text-sm', 'font-medium', 'mr-2', 'border-r-2', 'border-white/60', 'pr-2', 'flex', 'items-center', 'gap-2')}>
                  Invite
                </span>
                <div className={clsx('flex', 'justify-center', 'gap-6')}>
                  {[
                    { name: 'Austin', img: '/assets/ico.png' },
                    { name: 'Rose', img: '/assets/img1.png' },
                    { name: 'Peter', img: '/assets/ico.png' }
                  ].map((person) => (
                    <div key={person.name} className={clsx('flex', 'flex-col', 'items-center', 'gap-2')}>
                      <button
                        onClick={() => toggleInvite(person.name)}
                        className={`relative w-12 h-12 rounded-full border-2 ${
                          invited.includes(person.name)
                            ? 'border-yellow-400'
                            : 'border-white/20'
                        }`}
                      >
                        <img src={person.img} alt={person.name} className={clsx('w-full', 'h-full', 'object-cover', 'rounded-full')} />
                        {invited.includes(person.name) ? (
                          <span className={clsx('absolute', '-top-2', '-right-2', 'bg-yellow-400', 'text-black', 'w-5', 'h-5', 'text-xs', 'rounded-full', 'flex', 'items-center', 'justify-center', 'font-bold')}>
                            ✓
                          </span>
                        ) : (
                          <span className={clsx('absolute', '-top-0', '-right-0', 'bg-white', 'text-black', 'w-3', 'h-3', 'text-xs', 'rounded-full', 'flex', 'items-center', 'justify-center', 'font-bold', 'shadow-sm')}>
                            +
                          </span>
                        )}
                      </button>
                      <span className={clsx('text-white/70', 'text-xs', 'font-sans')}>{person.name}</span>
                    </div>
                  ))}
                  <button className={clsx('text-sm', 'underline', 'text-white/70', 'ml-2', 'self-center', 'font-sans')}>
                    See all
                  </button>
                </div>
              </div>

              {!isSearching && (
                <button
                  onClick={async () => { 
                    setIsSearching(true);
                    if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.set('searching', '1');
                        window.history.pushState({ searching: true }, '', url.toString());
                    }
                    await handleUpdateStatus('AVAILABLE');
                    await fetchCard(null, false); // Squad mode matching
                  }}
                  className={clsx(
                    'group relative z-20 mt-10 w-4/6 h-20 border border-b-4 rounded-[20px] flex items-center justify-center gap-4 active:scale-[0.98] transition-all overflow-hidden shadow-2xl bg-black/30 text-white border-white hover:bg-black/40'
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 opacity-50" />
                  <div className="w-11 h-11 rounded-full border border-white flex items-center justify-center group-hover:scale-110 transition-transform z-10">
                    <IoVideocam className="text-white text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  </div>
                  <span className="text-white text-xl font-bold tracking-tight z-10">
                    Meet Someone now
                  </span>
                </button>
              )}
              </div> {/* end squad UI overlay */}
            </div>
          )}

          {/* SHARED BOTTOM BAR (ALWAYS VISIBLE) */}
          <div className={clsx('absolute', 'px-5', 'bottom-6', 'left-6', 'right-6', 'flex', 'items-center', 'justify-between', 'z-[100]', isSearching && 'hidden')}>
            {/* Beam TV: no icon rendered here (only click target over existing UI) */}
     
            {mode === 'solo' ? (
              <div className='border rounded-full  border-b-4 p-1 border-white/40'>
            <Link href="/beam-tv">
  <button className="h-14 w-14 rounded-full p-3   shadow-md transition-all duration-200">
    <img src="/assets/Frame.png" alt="beam-tv" />
  </button>
</Link>
              </div>
            ) : (
              <div className={clsx('flex', 'gap-6')}>
                <img src="/assets/search-icon.svg" alt="" className={clsx('border', 'rounded-full', 'p-2', 'border-white/70', 'w-10', 'h-10')} />
                <img src="/assets/Vector.svg" alt="" className={clsx('border', 'rounded-full', 'p-3', 'border-white/70', 'w-10', 'h-10')} />
              </div>
            )}

            <div className={clsx('w-fit', 'flex', 'gap-2', 'border-white/40', 'border-1', 'rounded-full', 'p-1', 'bg-black/20', 'backdrop-blur-sm')}>
              <button
                onClick={() => setMode('solo')}
                className={`px-6 py-1 rounded-full transition ${
                  mode === 'solo'
                    ? 'text-white bg-black/40 border-[1.5px] border-white/40'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                solo
              </button>

              <button
                onClick={() => setMode('squad')}
                className={`px-6 py-1 rounded-full transition ${
                  mode === 'squad'
                    ? 'bg-black/40 border-[1.5px] border-white/40 text-white'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                squad
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
      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
      <CoinModal isOpen={isCoinModalOpen} onClose={() => setIsCoinModalOpen(false)} />
    </div>
  );
}
