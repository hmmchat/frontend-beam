'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { setPresenceStatus, setPresenceStatusKeepalive } from '@/lib/presence-status';
import clsx from 'clsx';

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
const WS_URL = null; // computed at runtime inside component
const PULL_STRANGER_WINDOW_SECONDS = (() => {
  const parsed = Number.parseInt(process.env.NEXT_PUBLIC_PULL_STRANGER_WINDOW_SECONDS || '60', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
})();

/** Module-level so React identity is stable — avoids remounting <video> on every parent re-render (e.g. 1s pull-stranger cooldown tick). */
function RemoteVideoTile({
  stream,
  name,
  age,
  city,
  displayPictureUrl,
  /** Report + emoji: only on the primary peer tile (not every remote in group calls). */
  showReportEmoji,
  /** HOST removing a PARTICIPANT — server enforces; UI only when eligible. */
  showKickParticipant,
  onKickParticipant,
  onSendFriendRequest,
  /** Show + for any in-call peer (not only discovery match); server enforces same room. */
  showAddFriend,
  isAlreadyFriend,
  isFriendRequestSent
}) {
  const videoRef = useRef(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
  }, [stream]);

  return (
    <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-900', 'border', 'border-white/5', 'shadow-2xl')}>
      <video ref={videoRef} autoPlay playsInline className="h-full w-full min-h-0 object-cover" />

      <div className="absolute top-4 left-5 right-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-[#C7BCB1]/80 backdrop-blur-2xl px-3 py-2 rounded-[2.5rem] border border-white/30 shadow-xl">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 bg-gray-200">
                <img src={displayPictureUrl} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="absolute -bottom-1.5 -left-1 text-2xl filter drop-shadow-md">🐒</div>
            </div>
            <div className="flex flex-col pr-4">
              <span className="text-white text-base font-extrabold tracking-tight leading-tight">
                {name || 'Matched!'}{age && age !== '?' ? `, ${age}` : ''}
              </span>
              {(city && city !== 'Unknown') && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-white/90 font-bold flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    {city}
                  </span>
                </div>
              )}
            </div>
          </div>

          {showAddFriend && !isAlreadyFriend && (
            <button
              type="button"
              onClick={onSendFriendRequest}
              disabled={isFriendRequestSent}
              className={`w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center transition-all border-2 border-white/40 shadow-xl active:scale-95 ${
                isFriendRequestSent ? 'bg-green-500/50' : 'bg-[#C7BCB1]/80 hover:bg-[#B7ACA1]'
              }`}
            >
              {isFriendRequestSent ? (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-9 h-9 text-white opacity-90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {showKickParticipant && onKickParticipant && (
            <button
              type="button"
              onClick={onKickParticipant}
              title="Remove guest from call"
              className="w-10 h-10 rounded-full bg-red-600/80 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 border border-white/20"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            </button>
          )}
          {showReportEmoji && (
            [
              { img: '/gravecurrent.png', alt: 'Report' },
              { img: '/smile.png', alt: 'Emoji' }
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="w-10 h-10 rounded-full bg-purple-900/80 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border border-white/20"
              >
                <img src={item.img} className="w-5 h-5 object-contain" alt={item.alt} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LocalVideoSection({
  localVideoRef,
  localStreamRef,
  isCamOff,
  chatMessages,
  chatInput,
  setChatInput,
  sendChatMessage,
  showChatInput,
  setShowChatInput,
  toggleCam,
  showLeaveNextButton,
  onLeaveOrNext,
  isRainchecking
}) {
  // Stable callback: inline ref functions change every render and make React detach/reattach <video> → visible flicker.
  const setLocalVideoEl = useCallback(
    (el) => {
      localVideoRef.current = el;
      if (el && localStreamRef.current) el.srcObject = localStreamRef.current;
    },
    [localVideoRef, localStreamRef]
  );

  return (
    <>
      <video
        ref={setLocalVideoEl}
        autoPlay
        muted
        playsInline
        className={clsx('w-full', 'h-full', 'object-cover', 'scale-x-[-1]')}
      />
      {isCamOff && (
        <div className={clsx('absolute', 'inset-0', 'bg-gray-900/90', 'flex', 'items-center', 'justify-center', 'text-white/20', 'font-bold', 'uppercase', 'tracking-widest', 'italic')}>
          Camera is off
        </div>
      )}

      <div className={clsx('absolute', 'bottom-32', 'left-6', 'flex', 'flex-col', 'gap-3', 'max-w-[70%]', 'z-10')}>
        {chatMessages.map((msg) => (
          <div key={msg.id} className={clsx('bg-white/10', 'backdrop-blur-xl', 'px-4', 'py-2.5', 'rounded-[1.2rem]', 'text-white', 'text-xs', 'font-bold', 'border', 'border-white/10', 'animate-in', 'fade-in', 'slide-in-from-left-4')}>
            <span className="text-white/50 mr-2 text-[10px]">{msg.name}:</span>
            {msg.message}
          </div>
        ))}
      </div>

      <div className={clsx('absolute', 'bottom-6', 'left-6', 'right-6', 'flex', 'items-end', 'justify-between', 'z-20')}>
        <div className={clsx('flex', 'flex-col', 'gap-4', 'w-full', 'max-w-[240px]')}>
          {showChatInput && (
            <form onSubmit={sendChatMessage} className="animate-in slide-in-from-bottom-4">
              <input
                autoFocus
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl px-4 py-3 text-white text-sm focus:border-white/40 mb-2 outline-none"
              />
            </form>
          )}
          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={toggleCam} className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95">
              <img src="/video.png" className={`w-5 h-5 object-contain ${isCamOff ? 'opacity-30' : 'opacity-100'}`} alt="Video" />
            </button>
            <button type="button" onClick={() => setShowChatInput(!showChatInput)} className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95">
              <img src="/msg.png" className="w-5 h-5 object-contain" alt="Message" />
            </button>
            {showLeaveNextButton && onLeaveOrNext && (
              <button
                type="button"
                onClick={onLeaveOrNext}
                disabled={isRainchecking}
                title="Next or leave call"
                className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 disabled:opacity-40"
              >
                <img src="/arrowright.png" className="w-5 h-5 object-contain" alt="Next" />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <button type="button" className="relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <img src="/circle.png" className="absolute inset-0 w-full h-full" alt="" />
            <img src="/dare.png" className="relative w-8 h-auto" alt="DARE" />
          </button>
          <button type="button" className="relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <img src="/circle.png" className="absolute inset-0 w-full h-full" alt="" />
            <img src="/giftboc.png" className="relative w-8 h-8 object-contain" alt="GIFT" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function VideoChat() {
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

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null); // Separate ref so srcObject can be re-assigned via useEffect
  const wsRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const localStreamRef = useRef(null);
  const producersRef = useRef({});
  const consumersRef = useRef({});
  /** mediasoup consumer id → departed user cleanup */
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
    // Nullify mediasoup refs (don't call .close() — it throws AwaitQueueStoppedError async)
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
        console.error('[Init] No room ID found!');
        setStatus('error');
        setError('No active match found.');
        setTimeout(() => resumeDiscoveryFromCall(), 200);
        return;
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
        if (!roomState?.exists || participantCount <= 1) {
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

  useEffect(() => {
    if (pullStrangerCooldownSec <= 0) return;
    const id = setInterval(() => {
      setPullStrangerCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [pullStrangerCooldownSec]);

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
          flowLog('media_health_auto_resume', { missingForMs });
          await handlePeerLeftAutoResume();
        }
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [status]);

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
      setPresenceStatusKeepalive(nextStatus);
    } catch (_) {}
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
        } catch (_) {}
      }

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

      try {
        await setPresenceStatus(nextStatus);
      } catch (err) {
        console.warn('[Leave] Reliable status update failed, falling back to keepalive:', err);
        setPresenceStatusKeepalive(nextStatus);
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1
        }
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Media error:', err);
      // Fallback to signaling anyway so we can see remote if they have camera
    }

    // Browsers cannot set custom headers on WebSocket connections.
    // Pass the JWT as a query param so the streaming gateway can authenticate.
    const accessToken = localStorage.getItem('accessToken') || '';
    
    const wsUrlWithAuth = `${WS_URL}?userId=${userId}${accessToken ? `&token=${encodeURIComponent(accessToken)}` : ''}`;
    const ws = new WebSocket(wsUrlWithAuth);
    wsRef.current = ws;
    console.log('[WebSocket] Connecting to:', wsUrlWithAuth.replace(/token=[^&]+/, 'token=<redacted>'));

    ws.onopen = () => send({ type: 'join-room', data: { roomId: info.roomId } });
    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      console.log('[WebSocket] Received message:', msg.type, msg);
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
    console.log('[WebRTC] Handling signal:', type, data);

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
        setStatus('connected');
        console.log('[WebRTC] Device loaded, creating send transport...');
        
        // Step 1: Create Send Transport
        send({ type: 'create-transport', data: { roomId: info.roomId, producing: true, consuming: false } });
        
        // Note: Backend will automatically notify us of existing producers via 'new-producer' events
        // No need to explicitly request producers list
        break;
      }

      case 'producers-list': {
        console.log('[WebRTC] Received producers list:', data);
        if (!data || !Array.isArray(data)) {
          console.log('[WebRTC] No producers in room yet');
          return;
        }
        
        console.log(`[WebRTC] Found ${data.length} existing producer(s) in room`);
        data.forEach(p => {
          if (!sameParticipantId(p.userId, userIdRef.current)) {
            console.log('[WebRTC] Consuming existing producer:', p.producerId, 'kind:', p.kind, 'from user:', p.userId);
            if (!recvTransportRef.current) {
              // Still not ready — queue it (shouldn't happen if we send get-producers after transport ready, but be safe)
              console.log('[WebRTC] Recv transport still not ready, queuing from producers-list:', p.producerId);
              pendingProducersRef.current.push({ producerId: p.producerId, remoteUserId: p.userId });
            } else {
              consume(p.producerId, p.userId);
            }
          } else {
            console.log('[WebRTC] Skipping own producer:', p.producerId);
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
            producersRef.current[`resolve_${kind}`] = cb;
            send({ type: 'produce', data: { roomId: info.roomId, transportId: id, kind, rtpParameters } });
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
                  console.warn('[WebRTC] Simulcast produce failed, using single layer', e);
                  await transport.produce({ track: vTrack, encodings: [{ maxBitrate: 2_500_000 }] }).catch(console.error);
                }
              }
              if (aTrack) {
                console.log('[WebRTC] Publishing audio track...');
                await transport.produce({ track: aTrack }).catch(console.error);
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
            queued.forEach(({ producerId, remoteUserId }) => consume(producerId, remoteUserId));
          }

          // Also ask backend for anyone we may still have missed
          send({ type: 'get-producers', data: { roomId: info.roomId } });
          scheduleGetProducersRetries(info.roomId);
        }
        break;
      }

      case 'produced': {
        console.log('[WebRTC] Producer created:', data.kind, data.id);
        producersRef.current[`resolve_${data.kind}`]?.({ id: data.id });
        break;
      }

      case 'new-producer': {
        console.log('[WebRTC] New producer available:', data.producerId, 'from user:', data.userId);
        if (sameParticipantId(data.userId, userIdRef.current)) {
          console.log('[WebRTC] Ignoring new-producer (own track)');
          return;
        }
        scheduleCallRoleRefresh();
        if (!recvTransportRef.current) {
          // Recv transport not ready yet — queue for drain when it becomes ready
          console.log('[WebRTC] Recv transport not ready, queuing producer:', data.producerId);
          pendingProducersRef.current.push({ producerId: data.producerId, remoteUserId: data.userId });
          return;
        }
        consume(data.producerId, data.userId);
        break;
      }

      case 'consumed': {
        console.log('[WebRTC] Consumer created:', data.kind, 'from user:', data.userId);
        const { id, producerId, kind, rtpParameters, userId: remoteId } = data;
        if (remoteId == null || remoteId === '') {
          console.warn('[WebRTC] consumed missing remote userId; using producerId for grouping', { producerId, kind });
        }
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
            // Do not use partnerInfo here — each remote has their own profile (fetched by userId).
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
        console.log('[WebRTC] Remote stream updated for user:', uiRemoteId, '| kind:', kind);
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
    }
  };

  const consume = (producerId, remoteUserId) => {
    // If receiving transport isn't ready yet, wait and retry
    if (!recvTransportRef.current) {
      console.log('[WebRTC] Recv transport not ready, retrying consume in 1s...');
      setTimeout(() => consume(producerId, remoteUserId), 1000);
      return;
    }

    send({
      type: 'consume',
      data: {
        roomId: roomInfoRef.current.roomId,
        transportId: recvTransportRef.current.id,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities
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
      await setPresenceStatus('IN_BROADCAST_AVAILABLE');
    } catch (_) {}
    setShowRandomness(false);
  };

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
  const localVideoProps = {
    localVideoRef,
    localStreamRef,
    isCamOff,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
    showChatInput,
    setShowChatInput,
    toggleCam,
    showLeaveNextButton: status === 'connected',
    onLeaveOrNext: handleLeaveGroupOrRaincheck,
    isRainchecking
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
    <div className={clsx('h-screen', 'w-screen', 'bg-black', 'flex', 'overflow-hidden', 'font-sans')}>
      <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'flex', 'p-2', 'gap-2')}>
        
        {/* Layout Engine */}
        {remoteStreams.length === 0 ? (
          /* Landing/Loading state: Full peer section placeholder and local */
          <>
            <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-900', 'border', 'border-white/5', 'shadow-2xl')}>
               <div className={clsx('absolute', 'inset-0', 'flex', 'flex-col', 'items-center', 'justify-center', 'text-white/30')}>
                  <div className={clsx('w-8', 'h-8', 'border-2', 'border-white/10', 'border-t-white', 'rounded-full', 'animate-spin', 'mb-4')} />
                  <p className={clsx('text-sm', 'font-bold', 'tracking-widest', 'uppercase')}>Waiting for match...</p>
               </div>
            </div>
            <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
               <LocalVideoSection {...localVideoProps} />
            </div>
          </>
        ) : remoteStreams.length === 1 ? (
          /* 1:1 Matched Layout: Peer 1 | Local */
          <>
            <RemoteVideoTile
              key={`remote-${remoteStreams[0].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              stream={remoteStreams[0].stream}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
            />
             <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
               <LocalVideoSection {...localVideoProps} />
            </div>
          </>
        ) : remoteStreams.length === 2 ? (
          /* Multi-User Layout (3 participants): Peer 1 (LEFT) | Peer 2 + Local (RIGHT) */
          <>
            <RemoteVideoTile
              key={`remote-${remoteStreams[0].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              stream={remoteStreams[0].stream}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <RemoteVideoTile
                key={`remote-${remoteStreams[1].userId}`}
                {...getRemoteFriendTileProps(remoteStreams[1])}
                stream={remoteStreams[1].stream}
                {...getRemoteTileProfile(remoteStreams[1])}
                showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[1])}
                showKickParticipant={canKickRemoteUser(remoteStreams[1].userId)}
                onKickParticipant={() => handleKickRemote(remoteStreams[1].userId)}
              />
              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
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
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
            />
            <RemoteVideoTile
              key={`remote-${remoteStreams[1].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[1])}
              stream={remoteStreams[1].stream}
              {...getRemoteTileProfile(remoteStreams[1])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[1])}
              showKickParticipant={canKickRemoteUser(remoteStreams[1].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[1].userId)}
            />
            <RemoteVideoTile
              key={`remote-${remoteStreams[2].userId}`}
              {...getRemoteFriendTileProps(remoteStreams[2])}
              stream={remoteStreams[2].stream}
              {...getRemoteTileProfile(remoteStreams[2])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[2])}
              showKickParticipant={canKickRemoteUser(remoteStreams[2].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[2].userId)}
            />
            <div className={clsx('relative', 'min-h-0', 'min-w-0', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
              <LocalVideoSection {...localVideoProps} />
            </div>
          </div>
        )}

        {/* Icebreaker: any participant. Dice / host-only randomness (pull stranger, Beamcast) per streaming-service. */}
        {!showChatInput && (
          <>
            {callRoles.isLocalHost && (
              <button type="button" onClick={toggleRandomness} className="absolute bottom-8 bg-black/60 left-8 text-2xl w-14 h-14 rounded-full flex items-center justify-center border border-white/10 hover:bg-black/80 transition-all z-40">
                <img src="/dice.png" alt="Dice" className="w-8 h-8 object-contain" />
              </button>
            )}
            <button type="button" onClick={handleIcebreaker} className={`absolute bottom-8 bg-black/60 left-[670px] w-14 h-14 rounded-full flex items-center justify-center border border-white/10 hover:bg-black/80 transition-all z-40 ${callRoles.isLocalHost ? '' : 'left-8 right-auto'}`}>
              <img src="/icecream.png" alt="Ice" className="w-8 h-8 object-contain" />
            </button>
          </>
        )}

        {/* Icebreaker Toast Overlay */}
        {showIcebreaker && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4">
            <div className="bg-purple-600/90 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white/20 shadow-2xl max-w-md text-center">
              <p className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Icebreaker</p>
              <p className="text-white text-base font-black leading-tight">{icebreaker}</p>
            </div>
          </div>
        )}

        {/* Randomness Modal Backdrop */}
        {showRandomness && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowRandomness(false)}>
            <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <div className="bg-purple-800/80 backdrop-blur-md border border-white/20 rounded-full py-3 text-center">
                <h2 className="text-white text-xl font-black tracking-wider">Add randomness</h2>
              </div>
              {callRoles.isLocalHost ? (
                <>
                  <button
                    onClick={handlePullStranger}
                    disabled={isPullStrangerDisabled}
                    className={`w-full bg-gradient-to-br from-purple-900/90 to-purple-800/90 backdrop-blur-md border border-white/20 rounded-[2rem] p-6 flex items-center gap-6 text-left transition-all ${
                      isPullStrangerDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    <div className="w-20 h-20 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center">
                      <img src="/pull.svg" className="w-10 h-10" alt="" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white text-lg font-black">Pull in a stranger</h3>
                      <p className="text-white/70 text-[11px] font-medium">
                        {isRoomFull
                          ? 'Room is full (4/4)'
                          : isEnablingPullStranger
                            ? 'Enabling...'
                            : pullStrangerCooldownSec > 0
                              ? `Active for ${pullStrangerCooldownSec}s`
                              : 'Summons a random person in the call'}
                      </p>
                    </div>
                  </button>
                  <button onClick={handleBeamcast} className="w-full bg-gradient-to-br from-purple-900/90 to-purple-800/90 backdrop-blur-md border border-white/20 rounded-[2rem] p-6 flex items-center gap-6 text-left hover:scale-[1.02] transition-all active:scale-95">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center">
                      <img src="/beamcast.svg" className="w-10 h-10" alt="" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white text-lg font-black">Beamcast</h3>
                      <p className="text-white/70 text-[11px] font-medium">Starts streaming this call live on Beam TV</p>
                    </div>
                  </button>
                </>
              ) : (
                <p className="text-center text-white/75 text-sm font-medium px-4 py-6 rounded-[2rem] border border-white/10 bg-white/5">
                  Only hosts of this call can pull in a stranger or start Beamcast.
                </p>
              )}
            </div>
          </div>
        )}

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
