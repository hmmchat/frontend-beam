'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { setPresenceStatus, setPresenceStatusKeepalive } from '@/lib/presence-status';

const PULL_STRANGER_WINDOW_SECONDS = (() => {
  const parsed = Number.parseInt(process.env.NEXT_PUBLIC_PULL_STRANGER_WINDOW_SECONDS || '60', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
})();

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

export default function useVideoChatRoom() {
  const router = useRouter();
  const flowLog = (...args) => console.log('[RaincheckFlow][video-chat]', ...args);
  const WS_URL = getWsUrl();
  
  const [roomInfo, setRoomInfo] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [remoteStreams, setRemoteStreams] = useState([]);
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
  const [friendRequestSentTo, setFriendRequestSentTo] = useState({});
  const [friendshipWithRemote, setFriendshipWithRemote] = useState({});
  const [isRainchecking, setIsRainchecking] = useState(false);
  const [showRandomness, setShowRandomness] = useState(false);
  const [isEnablingPullStranger, setIsEnablingPullStranger] = useState(false);
  const [pullStrangerCooldownSec, setPullStrangerCooldownSec] = useState(0);
  const [callRoles, setCallRoles] = useState({ isLocalHost: false, byUserId: {} });
  const [roomHealthDebug, setRoomHealthDebug] = useState({
    graceActive: false,
    graceRemainingSec: 0,
    failureCount: 0
  });
  const [icebreaker, setIcebreaker] = useState('');
  const [showIcebreaker, setShowIcebreaker] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChatInput, setShowChatInput] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const localStreamRef = useRef(null);
  const producersRef = useRef({});
  const consumersRef = useRef({});
  const consumerIdsByUserRef = useRef({});
  const callRoleRefreshTimerRef = useRef(null);
  const roomInfoRef = useRef(null);
  const userIdRef = useRef(null);
  const partnerInfoRef = useRef(null);
  const remoteStreamsRef = useRef([]);
  const allowUnmountCleanupRef = useRef(false);
  const cleanupArmTimerRef = useRef(null);
  const intentionalExitRef = useRef(false);
  const autoTransitioningRef = useRef(false);
  const hadRemoteMediaRef = useRef(false);
  const remoteMediaMissingSinceRef = useRef(null);
  const mediaEstablishGraceUntilRef = useRef(0);
  const hadRemotePeerInSessionRef = useRef(false);
  const pendingProducersRef = useRef([]);
  const roomHealthFailureCountRef = useRef(0);
  const suppressAutoResumeUntilRef = useRef(0);
  const prevRemoteStreamCountRef = useRef(0);
  const getProducersRetryTimeoutsRef = useRef([]);

  const sameParticipantId = (a, b) => String(a ?? '') === String(b ?? '');

  const isValidFriendTargetUserId = (userId) => {
    const u = String(userId ?? '');
    return u.length > 0 && !u.startsWith('producer:');
  };

  useEffect(() => {
    const stream = remoteStreams[0]?.stream;
    remoteStreamsRef.current = remoteStreams;
    const el = remoteVideoRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [remoteStreams]);

  function cleanup() {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pendingProducersRef.current = [];
    getProducersRetryTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
    getProducersRetryTimeoutsRef.current = [];
    producersRef.current = {};
    consumersRef.current = {};
    consumerIdsByUserRef.current = {};
    sendTransportRef.current = null;
    recvTransportRef.current = null;
  }

  const remoteUserIdsKey = remoteStreams.map((s) => String(s.userId)).sort().join('|');

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
  }, [remoteUserIdsKey]);

  useEffect(() => {
    if (!remoteUserIdsKey) return;
    const uids = remoteUserIdsKey.split('|').filter(Boolean).filter((uid) => !String(uid).startsWith('producer:'));
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

  useEffect(() => {
    let aborted = false;
    const init = async () => {
      hadRemotePeerInSessionRef.current = false;
      let info = null;
      let uid = null;

      const stored = localStorage.getItem('currentRoom');
      if (stored) {
        info = JSON.parse(stored);
        if (info.partner) {
          setPartnerInfo({
            id: info.partner.id || '',
            name: info.partner.username || 'Matched!',
            age: info.partner.age || '',
            city: info.partner.city || '',
            displayPictureUrl: info.partner.displayPictureUrl || '/avatar-placeholder.png'
          });

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
          setLocalUserInfo({ name: payload.name || 'You', age: payload.age || '' });
        } catch {}
      }

      if (!info?.roomId) {
        setStatus('error');
        setError('No active match found.');
        setTimeout(() => resumeDiscoveryFromCall(), 200);
        return;
      }

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
            setCallRoles({ isLocalHost: lastRoomPayload.userRole === 'HOST', byUserId });
          }

          if (verified && checkedRoom !== info.roomId) {
            info = { ...info, roomId: checkedRoom, sessionId: info.sessionId || checkedRoom };
            localStorage.setItem('currentRoom', JSON.stringify(info));
          }
        }
      } catch (_) {}

      await new Promise(r => setTimeout(r, 50));
      if (aborted) return;

      userIdRef.current = uid;
      roomInfoRef.current = info;
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

    const handleBeforeUnload = () => leaveRoomAndSetOnline();
    window.addEventListener('beforeunload', handleBeforeUnload);

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
      if (allowUnmountCleanupRef.current && !intentionalExitRef.current) {
        leaveRoomAndSetOnline();
      }
      cleanup();
    };
  }, [router]);

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

      if (
        (remoteStreamsRef.current?.length || 0) === 0 &&
        !hadRemotePeerInSessionRef.current &&
        Date.now() < (mediaEstablishGraceUntilRef.current || 0)
      ) {
        return;
      }

      if ((remoteStreamsRef.current?.length || 0) > 0) {
        roomHealthFailureCountRef.current = 0;
        mergeRoomHealthDebug({ graceActive: false, graceRemainingSec: 0, failureCount: 0 });
        return;
      }
      try {
        const roomState = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
        const participantCount = Number(roomState?.participantCount || 0);
        if (!roomState?.exists || participantCount <= 1) {
          roomHealthFailureCountRef.current += 1;
          mergeRoomHealthDebug({
            graceActive: false,
            graceRemainingSec: 0,
            failureCount: roomHealthFailureCountRef.current
          });
          if (roomHealthFailureCountRef.current < 6) return;
          await handlePeerLeftAutoResume();
          return;
        }
        roomHealthFailureCountRef.current = 0;
        mergeRoomHealthDebug({ graceActive: false, graceRemainingSec: 0, failureCount: 0 });
      } catch (_) {}
    };
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (pullStrangerCooldownSec <= 0) return;
    const id = setInterval(() => {
      setPullStrangerCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [pullStrangerCooldownSec]);

  useEffect(() => {
    const n = remoteStreams.length;
    const prev = prevRemoteStreamCountRef.current;
    prevRemoteStreamCountRef.current = n;

    if (n >= 2) {
      setPullStrangerCooldownSec((s) => (s > 0 ? 0 : s));
      suppressAutoResumeUntilRef.current = 0;
      setRoomHealthDebug((d) => d.graceActive ? { ...d, graceActive: false, graceRemainingSec: 0 } : d);
      return;
    }
    if (n === 1 && prev >= 2) {
      suppressAutoResumeUntilRef.current = 0;
      setPullStrangerCooldownSec((s) => (s > 0 ? 0 : s));
      setRoomHealthDebug((d) => (d.graceActive || d.graceRemainingSec !== 0) ? { ...d, graceActive: false, graceRemainingSec: 0 } : d);
    }
  }, [remoteStreams.length]);

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
          if (!remoteMediaMissingSinceRef.current) remoteMediaMissingSinceRef.current = Date.now();
        } else {
          remoteMediaMissingSinceRef.current = null;
        }
      } else if (hadRemoteMediaRef.current) {
        if (!remoteMediaMissingSinceRef.current) remoteMediaMissingSinceRef.current = Date.now();
      } else {
        remoteMediaMissingSinceRef.current = null;
      }

      if (remoteMediaMissingSinceRef.current) {
        const missingForMs = Date.now() - remoteMediaMissingSinceRef.current;
        if (missingForMs >= 4000) await handlePeerLeftAutoResume();
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [status]);

  function leaveRoomAndSetOnline(nextStatus = 'ONLINE') {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      let userId = userIdRef.current;
      const roomId = roomInfoRef.current?.roomId;
      if (roomId && userId) {
        fetch(API.STREAMING.LEAVE_ROOM(roomId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ userId }),
          keepalive: true,
        }).catch(() => {});
      }
      setPresenceStatusKeepalive(nextStatus);
    } catch (_) {}
  }

  async function leaveRoomAndSetStatusReliable(nextStatus = 'ONLINE') {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      let userId = userIdRef.current;
      const roomId = roomInfoRef.current?.roomId;
      if (roomId && userId) {
        try {
          await apiRequest(API.STREAMING.LEAVE_ROOM(roomId), {
            method: 'POST',
            body: JSON.stringify({ userId }),
          });
        } catch (err) {
          fetch(API.STREAMING.LEAVE_ROOM(roomId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId }),
            keepalive: true,
          }).catch(() => {});
        }
      }
      try {
        await setPresenceStatus(nextStatus);
      } catch (err) {
        setPresenceStatusKeepalive(nextStatus);
      }
    } catch (_) {}
  }

  const resumeDiscoveryFromCall = (sessionIdOverride = null) => {
    const sid = sessionIdOverride || roomInfoRef.current?.sessionId || Date.now().toString();
    localStorage.setItem('resumeDiscoveryOnHome', JSON.stringify({ sessionId: sid }));
    localStorage.setItem('forceDiscoveryResume', JSON.stringify({ sessionId: sid }));
    localStorage.setItem('pendingRaincheckResume', JSON.stringify({ sessionId: sid, nextCard: null }));
    router.push(`/?resumeDiscovery=1&sessionId=${encodeURIComponent(sid)}`);
  };

  const handleRaincheckNext = async () => {
    if (isRainchecking) return;
    setIsRainchecking(true);
    intentionalExitRef.current = true;
    try {
      const token = localStorage.getItem('accessToken');
      const partnerId = roomInfoRef.current?.partner?.id || partnerInfo.id;
      const sid = roomInfoRef.current?.sessionId || Date.now().toString();
      localStorage.setItem('resumeDiscoveryOnHome', JSON.stringify({ sessionId: sid }));
      localStorage.setItem('forceDiscoveryResume', JSON.stringify({ sessionId: sid }));
      if (token && partnerId) {
        try {
          await apiRequest(API.DISCOVERY.RAINCHECK, {
            method: 'POST',
            body: JSON.stringify({ sessionId: sid, raincheckedUserId: partnerId })
          });
          localStorage.setItem('pendingRaincheckResume', JSON.stringify({ sessionId: sid, nextCard: null }));
        } catch (error) {
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
    } finally {
      setIsRainchecking(false);
    }
  };

  const handlePeerLeftAutoResume = async () => {
    if (autoTransitioningRef.current) return;
    autoTransitioningRef.current = true;
    intentionalExitRef.current = true;
    const sid = roomInfoRef.current?.sessionId || Date.now().toString();
    try {
      await leaveRoomAndSetStatusReliable('AVAILABLE');
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

  const scheduleGetProducersRetries = (targetRoomId) => {
    const delays = [3500, 8000, 16000];
    getProducersRetryTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
    getProducersRetryTimeoutsRef.current = [];
    delays.forEach((ms) => {
      const tid = setTimeout(() => {
        if (intentionalExitRef.current || roomInfoRef.current?.roomId !== targetRoomId || remoteStreamsRef.current.length > 0) return;
        if (!recvTransportRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
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
      room.participants.forEach((p) => { byUserId[String(p.userId)] = p.role; });
      setCallRoles({ isLocalHost: room.userRole === 'HOST', byUserId });
    } catch (e) {}
  };

  const scheduleCallRoleRefresh = () => {
    if (callRoleRefreshTimerRef.current) clearTimeout(callRoleRefreshTimerRef.current);
    callRoleRefreshTimerRef.current = setTimeout(() => {
      callRoleRefreshTimerRef.current = null;
      refreshCallRolesFromServer();
    }, 400);
  };

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
    const cids = consumerIdsByUserRef.current[leftId];
    if (cids?.length) {
      cids.forEach((cid) => {
        try { consumersRef.current[cid]?.close?.(); } catch (_) {}
        delete consumersRef.current[cid];
      });
    }
    delete consumerIdsByUserRef.current[leftId];
    setCallRoles((prev) => {
      const nextBy = { ...prev.byUserId };
      delete nextBy[leftId];
      return { ...prev, byUserId: nextBy };
    });
    if (remainingAfter === 0 && remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remainingAfter === 0 && !skipPeerLeftAutoResume) {
      remoteMediaMissingSinceRef.current = Date.now();
      handlePeerLeftAutoResume();
    } else {
      remoteMediaMissingSinceRef.current = null;
    }
  };

  const handleKickRemote = (targetUserId) => {
    const rid = roomInfoRef.current?.roomId;
    if (!rid || !targetUserId) return;
    send({ type: 'kick-user', data: { roomId: rid, targetUserId: String(targetUserId) } });
  };

  const handleLeaveGroupOrRaincheck = async () => {
    if (isRainchecking) return;
    if (remoteStreamsRef.current.length <= 1) {
      await handleRaincheckNext();
      return;
    }
    setIsRainchecking(true);
    intentionalExitRef.current = true;
    try {
      const sid = roomInfoRef.current?.sessionId || Date.now().toString();
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {}

    const accessToken = localStorage.getItem('accessToken') || '';
    const wsUrlWithAuth = `${WS_URL}?userId=${userId}${accessToken ? `&token=${encodeURIComponent(accessToken)}` : ''}`;
    const ws = new WebSocket(wsUrlWithAuth);
    wsRef.current = ws;

    ws.onopen = () => send({ type: 'join-room', data: { roomId: info.roomId } });
    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'error') {
        if (msg.data?.error?.includes('not found')) handleStaleRoom();
        return;
      }
      await handleSignal(msg, info, userId);
    };
    ws.onerror = () => { setStatus('error'); setError('WebSocket connection failed'); };
  };

  const handleStaleRoom = () => {
    if (intentionalExitRef.current) return;
    localStorage.removeItem('currentRoom');
    resumeDiscoveryFromCall();
  };

  const handleSignal = async (msg, info, userId) => {
    const { type, data } = msg;

    switch (type) {
      case 'room-joined': {
        if (data.participantRoles?.length) {
          const byUserId = {};
          data.participantRoles.forEach(({ userId: id, role }) => { byUserId[String(id)] = role; });
          setCallRoles({ isLocalHost: data.myRole === 'HOST', byUserId });
        }
        mediaEstablishGraceUntilRef.current = Date.now() + 45_000;
        const { Device } = await import('mediasoup-client');
        const device = new Device();
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        deviceRef.current = device;
        setStatus('connected');
        send({ type: 'create-transport', data: { roomId: info.roomId, producing: true, consuming: false } });
        break;
      }

      case 'producers-list': {
        if (!data || !Array.isArray(data)) return;
        data.forEach(p => {
          if (!sameParticipantId(p.userId, userIdRef.current)) {
            if (!recvTransportRef.current) pendingProducersRef.current.push({ producerId: p.producerId, remoteUserId: p.userId });
            else consume(p.producerId, p.userId);
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
          transport.on('connect', ({ dtlsParameters: dp }, cb) => {
            send({ type: 'connect-transport', data: { roomId: info.roomId, transportId: id, dtlsParameters: dp } });
            cb();
          });
          transport.on('produce', ({ kind, rtpParameters }, cb) => {
            producersRef.current[`resolve_${kind}`] = cb;
            send({ type: 'produce', data: { roomId: info.roomId, transportId: id, kind, rtpParameters } });
          });
          send({ type: 'create-transport', data: { roomId: info.roomId, producing: false, consuming: true } });
          if (localStreamRef.current) {
            const vTrack = localStreamRef.current.getVideoTracks()[0];
            const aTrack = localStreamRef.current.getAudioTracks()[0];
            const publish = async () => {
              if (vTrack) {
                try {
                  await transport.produce({
                    track: vTrack,
                    encodings: [
                      { rid: 'r0', maxBitrate: 200_000, scaleResolutionDownBy: 4 },
                      { rid: 'r1', maxBitrate: 700_000, scaleResolutionDownBy: 2 },
                      { rid: 'r2', maxBitrate: 2_500_000, scaleResolutionDownBy: 1 }
                    ],
                    codecOptions: { videoGoogleStartBitrate: 600 }
                  });
                } catch (e) {
                  await transport.produce({ track: vTrack, encodings: [{ maxBitrate: 2_500_000 }] }).catch(() => {});
                }
              }
              if (aTrack) await transport.produce({ track: aTrack }).catch(() => {});
            };
            publish().catch(() => {});
          }
        } else {
          const transport = device.createRecvTransport({ id, iceParameters, iceCandidates, dtlsParameters });
          recvTransportRef.current = transport;
          transport.on('connect', ({ dtlsParameters: dp }, cb) => {
            send({ type: 'connect-transport', data: { roomId: info.roomId, transportId: id, dtlsParameters: dp } });
            cb();
          });
          const queued = pendingProducersRef.current.splice(0);
          queued.forEach(({ producerId, remoteUserId }) => consume(producerId, remoteUserId));
          send({ type: 'get-producers', data: { roomId: info.roomId } });
          scheduleGetProducersRetries(info.roomId);
        }
        break;
      }

      case 'produced': {
        producersRef.current[`resolve_${data.kind}`]?.({ id: data.id });
        break;
      }

      case 'new-producer': {
        if (sameParticipantId(data.userId, userIdRef.current)) return;
        scheduleCallRoleRefresh();
        if (!recvTransportRef.current) pendingProducersRef.current.push({ producerId: data.producerId, remoteUserId: data.userId });
        else consume(data.producerId, data.userId);
        break;
      }

      case 'consumed': {
        const { id, producerId, kind, rtpParameters, userId: remoteId } = data;
        const consumer = await recvTransportRef.current.consume({ id, producerId, kind, rtpParameters });
        consumersRef.current[id] = consumer;
        const uiRemoteId = remoteId != null && remoteId !== '' ? remoteId : `producer:${producerId}`;
        const uidKey = String(uiRemoteId);
        if (!consumerIdsByUserRef.current[uidKey]) consumerIdsByUserRef.current[uidKey] = [];
        consumerIdsByUserRef.current[uidKey].push(id);

        setRemoteStreams(prev => {
          const existing = prev.find(s => sameParticipantId(s.userId, uiRemoteId));
          let next;
          if (existing) {
            const newStream = new MediaStream([...existing.stream.getTracks(), consumer.track]);
            next = prev.map(s => (sameParticipantId(s.userId, uiRemoteId) ? { ...s, stream: newStream } : s));
          } else {
            next = [ ...prev, { userId: uiRemoteId, stream: new MediaStream([consumer.track]), name: '', age: '', displayPictureUrl: '/avatar-placeholder.png', city: '', profileFetched: false } ];
          }
          remoteStreamsRef.current = next;
          if (next.length > 0) hadRemotePeerInSessionRef.current = true;
          return next;
        });
        break;
      }
      
      case 'participant-left': { removeRemoteParticipantFromUi(data.userId); break; }
      case 'participant-kicked': { removeRemoteParticipantFromUi(data.kickedUserId, { skipPeerLeftAutoResume: true }); scheduleCallRoleRefresh(); break; }
      case 'user-kicked': { intentionalExitRef.current = true; cleanup(); localStorage.removeItem('currentRoom'); resumeDiscoveryFromCall(); break; }
      case 'user-kicked-success': { if (data.targetUserId) removeRemoteParticipantFromUi(data.targetUserId, { skipPeerLeftAutoResume: true }); scheduleCallRoleRefresh(); break; }

      case 'friend-request-sent': {
        const tid = data?.toUserId != null ? String(data.toUserId) : '';
        if (tid) setFriendRequestSentTo((prev) => ({ ...prev, [tid]: true }));
        setIcebreaker('Friend request sent!');
        setShowIcebreaker(true);
        setTimeout(() => setShowIcebreaker(false), 3000);
        break;
      }

      case 'friend-request-accepted': {
        const fid = data?.friendId != null ? String(data.friendId) : '';
        if (fid) { setFriendshipWithRemote((prev) => ({ ...prev, [fid]: true })); setFriendRequestSentTo((prev) => ({ ...prev, [fid]: true })); }
        break;
      }

      case 'icebreaker': { setIcebreaker(data.question); setShowIcebreaker(true); setTimeout(() => setShowIcebreaker(false), 8000); break; }

      case 'chat-message': {
        const myId = userIdRef.current;
        const pInfo = partnerInfoRef.current;
        const remotes = remoteStreamsRef.current;
        let name = 'Unknown';
        if (data.userId === myId) name = 'You';
        else if (pInfo && data.userId === pInfo.id) name = pInfo.name;
        else {
          const remote = remotes.find(s => s.userId === data.userId);
          if (remote) name = remote.name;
          else if (remotes.length > 0) name = remotes[0].name;
        }

        setChatMessages(prev => {
          if (data.id && prev.some(m => m.id === data.id)) return prev;
          return [...prev, { id: data.id || Date.now() + Math.random(), userId: data.userId, message: data.message, name }].slice(-5);
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

  const consume = (producerId, remoteUserId) => {
    if (!recvTransportRef.current) {
      setTimeout(() => consume(producerId, remoteUserId), 1000);
      return;
    }
    send({ type: 'consume', data: { roomId: roomInfoRef.current.roomId, transportId: recvTransportRef.current.id, producerId, rtpCapabilities: deviceRef.current.rtpCapabilities } });
  };

  const handleSendFriendRequest = (toUserId) => {
    const tid = String(toUserId ?? '');
    if (!roomInfo?.roomId || !isValidFriendTargetUserId(tid) || friendRequestSentTo[tid]) return;
    send({ type: 'send-friend-request', data: { roomId: roomInfo.roomId, toUserId: tid } });
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
    if (!roomInfo?.roomId || !userIdRef.current || participantCount >= 4 || isEnablingPullStranger || pullStrangerCooldownSec > 0) return;
    try {
      setIsEnablingPullStranger(true);
      await apiRequest(API.STREAMING.ENABLE_PULL_STRANGER(roomInfo.roomId), { method: 'POST', body: JSON.stringify({ userId: userIdRef.current }) });
      setPullStrangerCooldownSec(PULL_STRANGER_WINDOW_SECONDS);
      suppressAutoResumeUntilRef.current = Date.now() + (PULL_STRANGER_WINDOW_SECONDS * 1000);
      roomHealthFailureCountRef.current = 0;
      setRoomHealthDebug({ graceActive: true, graceRemainingSec: PULL_STRANGER_WINDOW_SECONDS, failureCount: 0 });
      setShowRandomness(false);
    } catch (err) {} finally { setIsEnablingPullStranger(false); }
  };

  const handleBeamcast = async () => {
    if (!roomInfo?.roomId || !userIdRef.current) return;
    send({ type: 'start-broadcast', data: { roomId: roomInfo.roomId } });
    try { await setPresenceStatus('IN_BROADCAST_AVAILABLE'); } catch (_) {}
    setIsBroadcasting(true);
    setShowRandomness(false);
  };

  const handleStopBeamcast = async () => {
    if (!roomInfo?.roomId || !userIdRef.current) return;
    send({ type: 'stop-broadcast', data: { roomId: roomInfo.roomId } });
    try { await setPresenceStatus('IN_SQUAD_AVAILABLE'); } catch (_) {}
    setIsBroadcasting(false);
    setShowRandomness(false);
  };

  const sendChatMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !roomInfo?.roomId) return;
    send({ type: 'chat-message', data: { roomId: roomInfo.roomId, message: chatInput.trim() } });
    setChatInput('');
  };

  const handleLeave = async () => {
    intentionalExitRef.current = true;
    if (wsRef.current?.readyState === WebSocket.OPEN && roomInfo?.roomId) {
      wsRef.current.send(JSON.stringify({ type: 'leave-room', data: { roomId: roomInfo.roomId } }));
    }
    await leaveRoomAndSetStatusReliable('ONLINE');
    cleanup();
    localStorage.removeItem('currentRoom');
    router.push('/');
  };

  return {
    roomInfo, status, remoteStreams, isMuted, isCamOff, error, localUserInfo, partnerInfo,
    friendRequestSentTo, friendshipWithRemote, isRainchecking, showRandomness, setShowRandomness,
    isEnablingPullStranger, pullStrangerCooldownSec, callRoles, roomHealthDebug, icebreaker,
    showIcebreaker, chatMessages, chatInput, setChatInput, showChatInput, setShowChatInput,
    localVideoRef, remoteVideoRef, localStreamRef,
    handleSendFriendRequest, toggleCam, handleIcebreaker, toggleRandomness, handlePullStranger,
    handleBeamcast,
    handleStopBeamcast,
    isBroadcasting,
    sendChatMessage, handleLeave, handleLeaveGroupOrRaincheck, handleKickRemote,
    isValidFriendTargetUserId, sameParticipantId
  };
}
