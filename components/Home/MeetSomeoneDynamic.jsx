'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import FilterButtons from '@/components/ui/FilterButtons';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import { IoLogOutOutline } from 'react-icons/io5';
import { API, apiRequest } from '@/lib/api';
import { setPresenceStatus, setPresenceStatusKeepalive } from '@/lib/presence-status';
import FaceCard from './FaceCard';
import LocalVideo from './LocalVideo';
import clsx from 'clsx';
import LocationCard from './LocationCard';
import SearchingPopup from './SearchingPopup';
import CoinModal from '@/components/modals/CoinModal';

export default function MeetSomeoneDynamic() {
  const router = useRouter();
  const flowLog = (...args) => console.log('[RaincheckFlow][home]', ...args);
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

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

    // If user rainchecked from in-call "next", resume directly with next discovery card.
    if (resumeDiscoveryFromUrl || pendingRaincheckRaw || forcedResumeRaw || resumeOnHomeRaw) {
      try {
        const pendingParsed = safeParse(pendingRaincheckRaw);
        const forcedParsed = safeParse(forcedResumeRaw);
        const resumeOnHomeParsed = safeParse(resumeOnHomeRaw);
        const parsed = pendingParsed || forcedParsed || resumeOnHomeParsed || {};
        const resumedSessionId = resumeSessionFromUrl || parsed?.sessionId || Date.now().toString();
        localStorage.setItem('stickyDiscoveryResume', JSON.stringify({
          sessionId: resumedSessionId,
          ts: Date.now()
        }));
        flowLog('resume_branch_entered', {
          resumedSessionId,
          hasParsedNextCard: Boolean(parsed?.nextCard)
        });
        setSessionId(resumedSessionId);
        setIsSearching(true);
        // After in-call raincheck, user should stay in discovery pool.
        handleUpdateStatus('AVAILABLE');

        // Always fetch a fresh card on resume to prevent stale-card flashes.
        flowLog('resume_branch_fetch_card_silently');
        setIsResumeLoading(true);
        setCurrentCard(null);
        fetchCardSilently(resumedSessionId, true);
      } catch (_) {
        flowLog('resume_branch_error_parsing_payload');
      } finally {
        if (resumeDiscoveryFromUrl && typeof window !== 'undefined') {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
        localStorage.removeItem('forceDiscoveryResume');
        localStorage.removeItem('pendingRaincheckResume');
        localStorage.removeItem('pendingRaincheckNextCard');
        localStorage.removeItem('resumeDiscoveryOnHome');
        flowLog('resume_branch_cleanup_flags_done');
      }
    } else {
      const stickyParsed = safeParse(stickyResumeRaw);
      const stickyAgeMs = stickyParsed?.ts ? Date.now() - stickyParsed.ts : Number.POSITIVE_INFINITY;
      const stickyStillFresh = Number.isFinite(stickyAgeMs) && stickyAgeMs >= 0 && stickyAgeMs < 15000;
      if (stickyStillFresh) {
        const stickySessionId = stickyParsed?.sessionId || Date.now().toString();
        flowLog('sticky_resume_recover', { stickySessionId, stickyAgeMs });
        setSessionId(stickySessionId);
        setIsSearching(true);
        setIsResumeLoading(true);
        fetchCardSilently(stickySessionId, true);
        return;
      }

      // Recovery guard: if backend still says user is AVAILABLE, auto-resume discovery.
      // This prevents deadlocks when navigation flags are lost during room teardown races.
      (async () => {
        try {
          const me = await apiRequest(API.USERS.GET_ME);
          const currentStatus = String(me?.status || me?.user?.status || '');
          flowLog('recovery_guard_me_status', { currentStatus });
          if (currentStatus === 'AVAILABLE') {
            const recoveredSessionId = Date.now().toString();
            setSessionId(recoveredSessionId);
            setIsSearching(true);
            flowLog('recovery_guard_auto_resume', { recoveredSessionId });
            setIsResumeLoading(true);
            fetchCardSilently(recoveredSessionId, true);
            return;
          }
        } catch (_) {
          flowLog('recovery_guard_me_status_error');
          // Non-blocking: fall back to homepage baseline status
        }
        // Homepage default state is ONLINE unless user explicitly enters discovery pool.
        flowLog('recovery_guard_set_online');
        handleUpdateStatus('ONLINE');
      })();
    }

    const setOnlineKeepalive = () => {
      setPresenceStatusKeepalive('ONLINE');
    };
    window.addEventListener('beforeunload', setOnlineKeepalive);

    // CLEANUP: Stop polling if the component unmounts
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (discoveryPollRef.current) clearInterval(discoveryPollRef.current);
      if (rescueTimeoutRef.current) clearTimeout(rescueTimeoutRef.current);
      window.removeEventListener('beforeunload', setOnlineKeepalive);
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
      setCurrentCard(data.card);
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
      setCurrentCard(data?.card || null);
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

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="relative min-h-screen w-full overflow-hidden font-[family-name:var(--font-otomanopee)]"
      />
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="relative min-h-screen w-full overflow-hidden font-[family-name:var(--font-otomanopee)]"
    >
      <main className="grid grid-cols-1 md:grid-cols-2 h-screen overflow-hidden">

        {/* LEFT SIDE */}
<div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-gradient-purple-dark px-6 py-6 md:py-6 lg:py-6">

  <div
    className="absolute inset-0 z-0"
    style={{
      backgroundImage: 'url(/assets/mb.jpg)',
      backgroundRepeat: 'repeat',
      backgroundSize: 'cover',
    }}
  />
        
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
                  <div className={clsx('border-2', 'border-white/30', 'w-full', 'h-full', 'max-h-full', 'justify-center', 'items-center', 'flex', 'rounded-2xl', 'relative')}>
                    <div className={clsx('z-10', 'text-center', 'max-w-lg', 'p-2')}>
                      <img src="/LOGO.png" className={clsx('md:w-64', 'mx-auto', 'w-44')} />
                      <p className={clsx('text-white', 'text-2xl', 'font-[family-name:var(--font-otomanopee)]')}>Finding face cards...</p>
                      <p className={clsx('text-white/80', 'text-sm', 'mt-2')}>You are still in discovery pool.</p>
                    </div>
                    <SearchingPopup
                      isVisible={true}
                      onCancel={() => {
                        setIsSearching(false);
                        setCurrentCard(null);
                        localStorage.removeItem('stickyDiscoveryResume');
                        handleUpdateStatus('ONLINE');
                      }}
                    />
                  </div>
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
                    'justify-start',
                    'overflow-hidden',
                    'pt-2',
                    'pb-1'
                  )}
                >
                  <div className="relative flex w-full max-w-[392px] flex-col items-center justify-start gap-2 px-2">
                    <FaceCard user={currentCard} />

  {/* BUTTONS */}
<div className="flex w-full max-w-[352px] shrink-0 items-center justify-between gap-2 px-1">

  {/* LEFT ARROW */}
  <button className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white text-xs">
    ←
  </button>

  {/* RAINCHECK */}
  <button
    onClick={handleRaincheck}
    className="px-3 py-1.5 rounded-full border border-white/30 text-white text-xs whitespace-nowrap"
  >
    Raincheck!
  </button>

  {/* MEET */}
  <button
    onClick={handleProceed}
    className="px-3 py-1.5 rounded-full border border-white/30 text-white text-xs whitespace-nowrap"
  >
    Meet rn
  </button>

  {/* RIGHT ARROW */}
  <button className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white text-xs">
    →
  </button>

</div>

  {/* STATUS MESSAGE SLOT (kept outside controls so layout doesn't jump) */}
  <div className="mt-1 w-full max-w-[352px] h-[44px]">
    <div
      className={clsx(
        'flex h-full w-full items-center justify-center overflow-hidden rounded-xl border px-3 text-[10px] text-center font-semibold leading-tight transition-opacity',
        (waitingForMatch || (currentCard?.otherUserAccepted && !waitingForMatch))
          ? 'border-yellow-300/40 bg-yellow-300/10 text-yellow-100 opacity-100'
          : 'border-transparent bg-transparent text-transparent opacity-0 pointer-events-none select-none'
      )}
    >
      <span>
        {waitingForMatch
          ? `Request sent to ${waitingMatchedUser?.username || 'them'}. Waiting for acceptance...`
          : `${currentCard?.username || "Your match"} accepted your match. Tap “Meet rn” to join now.`}
      </span>
    </div>
  </div>

                  </div>
                </div>
              )}

                </div>
          ) : (
            <div className={clsx('relative', 'w-full', 'h-full', 'flex', 'items-center', 'justify-center')}>
                  <div className={clsx('border-2', 'border-white/40', 'w-full', 'h-full', 'max-h-full', 'justify-center', 'items-center', 'flex', 'rounded-2xl', 'relative')}>
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



        {/* RIGHT SIDE */}
<div className="relative w-full h-full overflow-hidden">

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

          {!isSearching && (
            <div className={clsx('absolute', 'top-8', 'left-8', 'z-50')}>
            <Button variant="outline" width="hex" onClick={() => setIsCoinModalOpen(true)}>
              <img src="/assets/Coin-token.svg" className={clsx('w-6', 'h-6')} />
              <div className={clsx('text-sm', 'font-semibold')}>{coins.toLocaleString()}</div>
              <img src="/assets/plus.png" className={clsx('w-4', 'h-4')} />
            </Button>
          </div>
          )}


          {/* Top Icons */}
          {!isSearching && (
          <div className={clsx('absolute', 'top-4', 'md:top-10', 'left-1/2', '-translate-x-1/2', 'flex', 'gap-5', 'z-50', 'bg-black/40', 'rounded-full', 'px-12', 'py-1')}>
            <button 
              onClick={() => router.push('/inbox')}
              className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'hover:bg-white/20', 'rounded-full')}
            >
              <img src="/assets/chat-with-indicator.svg" className={clsx('w-8', 'h-8')} />
            </button>
            <button 
              onClick={() => router.push('/history')}
              className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'hover:bg-white/20', 'rounded-full')}
            >
              <img src="/assets/history.svg" className={clsx('w-8', 'h-8')} />
            </button>
               {/* Profile */}
<button 
  onClick={() => router.push('/facecard?view=editor')}
  className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-full overflow-hidden"
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
          )}


          {!isSearching && (
          <div className={clsx('absolute', 'top-4', 'md:top-10', 'right-8', 'z-50', 'flex', 'gap-2')}>
  <button
    type="button"
    onClick={() => router.push('/onboarding?step=2&from=home')}
    className="rounded-full transition hover:scale-105 active:scale-95"
    title="Add prompt"
  >
    <img src="/icones1.png" alt="Add prompt" className={clsx('w-12', 'h-12')} />
  </button>

  <img src="/icones2.png" alt="" className={clsx('w-12', 'h-12')} />
</div>
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
    // Enter discovery pool first, then fetch card to avoid first-fetch mismatch.
    await handleUpdateStatus('AVAILABLE');
    await fetchCard(null, true);
  }}
  className={clsx(
    'relative z-20 mt-60 w-4/6 py-6 px-12 font-bold flex items-center justify-center gap-3 border rounded-2xl transition-all uppercase tracking-widest',
    isSearching
      ? 'bg-yellow-500 text-black animate-pulse'
      : 'bg-black/30 text-white border-white hover:bg-black/40'
  )}
>
  {isSearching ? 'Searching...' : 'Meet Someone Now'}
</button>

                  <FilterButtons
                    onGenderClick={() => setIsGenderModalOpen(true)}
                    onLocationClick={() => setIsLocationModalOpen(true)}
                    className={clsx('mt-2', 'text-white')}
                  />
                </>
              ) : (
                <div className={clsx('absolute', 'inset-0', 'z-0', 'overflow-hidden', 'rounded-2xl', 'shadow-2xl', 'border-2', 'border-white/20')}>

<div className="absolute inset-0 z-[1]">

  {/* 🎥 FULL VIDEO */}
  <LocalVideo 
    showSoloCheckbox={false} 
    onSoloChange={(checked) => setMode(checked ? 'solo' : 'squad')} 
  />

  {/* 🌫 LIGHT OVERLAY */}
  <div className="absolute inset-0 bg-black/10" />

  {/* 🔲 BORDER FRAME */}
  <div className="absolute inset-4 border border-white/30 rounded-[40px] pointer-events-none" />

</div>



</div>
     
              )}
            </div>
          ) : (
            /* SQUAD VIEW */
            <div className={clsx('relative', 'z-10', 'w-full', 'h-full', 'flex', 'flex-col', 'items-center', 'justify-center')}>

              {/* Video background for squad mode */}
              <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl border-2 border-white/20">
                <LocalVideo 
                  showSoloCheckbox={false}
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-4 border border-white/20 rounded-[40px] pointer-events-none" />
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
              </div> {/* end squad UI overlay */}
            </div>
          )}

          {/* SHARED BOTTOM BAR (ALWAYS VISIBLE) */}
          <div className={clsx('absolute', 'px-5', 'bottom-6', 'left-6', 'right-6', 'flex', 'items-center', 'justify-between', 'z-[100]', isSearching && 'hidden')}>
            {mode === 'solo' ? (
              <button
                type="button"
                onClick={() => router.push('/beam-tv')}
                className="rounded-full transition hover:scale-105 active:scale-95"
                title="Open Beam TV"
              >
                <img src="/assets/Frame.png" className={clsx('w-9', 'h-9')} />
              </button>
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

      {/* Modals */}
      <GenderModal isOpen={isGenderModalOpen} onClose={() => setIsGenderModalOpen(false)} />
      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
      <CoinModal isOpen={isCoinModalOpen} onClose={() => setIsCoinModalOpen(false)} />
    </div>
  );
}
