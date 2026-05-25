import { API, apiRequest } from '@/lib/api';
import { setPresenceStatus, setPresenceStatusKeepalive, refreshProfileStatusFromApi } from '@/lib/presence-status';
import { notifyLocalPresenceChanged } from '@/lib/presence-realtime';
import {
  canManageDiscoverySession,
  isDiscoveryLeader,
  isDiscoveryActiveElsewhere,
  markDiscoverySessionActive,
  markDiscoverySessionInactive,
  releaseDiscoveryLeadership,
  renewDiscoveryLeadership,
} from '@/lib/tab-coordinator';

let heartbeatTimer = null;
let leaderRenewTimer = null;
let activeSessionId = null;

async function refreshProfileStatus() {
  const status = await refreshProfileStatusFromApi();
  notifyLocalPresenceChanged({ status, source: 'discovery-presence' });
  return status;
}

function stopDiscoveryHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (leaderRenewTimer) {
    clearInterval(leaderRenewTimer);
    leaderRenewTimer = null;
  }
  activeSessionId = null;
}

function startDiscoveryHeartbeat(sessionId) {
  if (!sessionId || !isDiscoveryLeader()) return;
  stopDiscoveryHeartbeat();
  activeSessionId = sessionId;
  markDiscoverySessionActive(sessionId);

  const ping = () => {
    if (!activeSessionId || !isDiscoveryLeader()) return;
    renewDiscoveryLeadership();
    apiRequest(API.DISCOVERY.SESSION_HEARTBEAT, {
      method: 'POST',
      body: JSON.stringify({ sessionId: activeSessionId })
    }).catch(() => {});
  };

  ping();
  heartbeatTimer = setInterval(ping, 30000);
  leaderRenewTimer = setInterval(() => renewDiscoveryLeadership(), 3000);
}

async function enterDiscoverySession(sessionId) {
  if (!canManageDiscoverySession()) {
    throw new Error('Discovery session is active in another tab');
  }
  await apiRequest(API.DISCOVERY.SESSION_ENTER, {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  });
}

/**
 * User clicked Meet Someone — enter solo discovery pool.
 */
export async function enterDiscovery(sessionId) {
  if (isDiscoveryActiveElsewhere()) {
    throw new Error('Discovery session is active in another tab');
  }
  const sid = sessionId || Date.now().toString();
  await enterDiscoverySession(sid);
  startDiscoveryHeartbeat(sid);
  return refreshProfileStatus();
}

/**
 * User cancelled search or navigated away from discovery UI.
 */
export async function exitDiscovery() {
  stopDiscoveryHeartbeat();
  markDiscoverySessionInactive();

  if (!isDiscoveryLeader() && isDiscoveryActiveElsewhere()) {
    return refreshProfileStatus();
  }

  try {
    await apiRequest(API.DISCOVERY.SESSION_END, { method: 'POST', body: JSON.stringify({}) });
  } catch (_) {
    await setPresenceStatus('ONLINE');
  }
  releaseDiscoveryLeadership();
  return refreshProfileStatus();
}

export function exitDiscoveryKeepalive() {
  stopDiscoveryHeartbeat();
  markDiscoverySessionInactive();

  if (!isDiscoveryLeader() && isDiscoveryActiveElsewhere()) {
    return;
  }

  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    fetch(API.DISCOVERY.SESSION_END, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({}),
      keepalive: true
    }).catch(() => {});
  } catch (_) {
    setPresenceStatusKeepalive('ONLINE');
  }
  releaseDiscoveryLeadership();
}

/**
 * Mark navigation into /video-chat so Strict Mode unmount does not leave the room.
 */
export function markEnteringVideoChat() {
  try {
    sessionStorage.setItem('hmm:enteringVideoChat', String(Date.now()));
  } catch (_) {}
}

/**
 * Transitioning from home into an active video call.
 */
export async function enterCall() {
  markEnteringVideoChat();
  stopDiscoveryHeartbeat();
  markDiscoverySessionInactive();
  try {
    await apiRequest(API.DISCOVERY.SESSION_END, { method: 'POST', body: JSON.stringify({}) });
  } catch (_) {
    // User may already be MATCHED; still leave discovery pool locally.
  }
  return refreshProfileStatus();
}

/**
 * Leave call and return to homepage idle (not in discovery pool).
 */
export async function exitCallToHome() {
  stopDiscoveryHeartbeat();
  markDiscoverySessionInactive();
  try {
    await apiRequest(API.DISCOVERY.SESSION_END, { method: 'POST', body: JSON.stringify({}) });
  } catch (_) {
    // Fall through to status PATCH below.
  }
  await setPresenceStatus('ONLINE');
  releaseDiscoveryLeadership();
  return refreshProfileStatus();
}

export function exitCallToHomeKeepalive() {
  stopDiscoveryHeartbeat();
  markDiscoverySessionInactive();
  try {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch(API.DISCOVERY.SESSION_END, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({}),
        keepalive: true
      }).catch(() => {});
    }
  } catch (_) {}
  setPresenceStatusKeepalive('ONLINE');
  releaseDiscoveryLeadership();
}

/**
 * Leave call and resume discovery (raincheck / auto-resume).
 */
export async function exitCallResumeDiscovery(sessionId) {
  const sid = sessionId || Date.now().toString();
  await enterDiscoverySession(sid);
  startDiscoveryHeartbeat(sid);
  return refreshProfileStatus();
}

/** Host enabled pull-in-stranger — visible in non-solo discovery pool. */
export async function enablePullStrangerDiscovery() {
  await setPresenceStatus('IN_SQUAD_AVAILABLE');
  return refreshProfileStatus();
}

/** Host disabled pull-in-stranger. */
export async function disablePullStrangerDiscovery(isBroadcasting = false) {
  await setPresenceStatus(isBroadcasting ? 'IN_BROADCAST' : 'IN_SQUAD');
  return refreshProfileStatus();
}

/** Host started beamcast availability. */
export async function enableBeamcastDiscovery() {
  await setPresenceStatus('IN_BROADCAST_AVAILABLE');
  return refreshProfileStatus();
}

/** Host stopped beamcast availability. */
export async function disableBeamcastDiscovery() {
  await setPresenceStatus('IN_SQUAD_AVAILABLE');
  return refreshProfileStatus();
}

/** Viewer leaving Beam TV — return to idle presence. */
export async function exitBeamTvViewer() {
  await setPresenceStatus('ONLINE');
  return refreshProfileStatus();
}

export function exitBeamTvViewerKeepalive() {
  setPresenceStatusKeepalive('ONLINE');
}

/** Clear raincheck / resume-discovery flags so homepage mounts idle (facecard), not matchmaking. */
export function clearDiscoveryResumeIntent() {
  try {
    localStorage.removeItem('forceDiscoveryResume');
    localStorage.removeItem('pendingRaincheckResume');
    localStorage.removeItem('pendingRaincheckNextCard');
    localStorage.removeItem('resumeDiscoveryOnHome');
    localStorage.removeItem('stickyDiscoveryResume');
  } catch (_) {}
}

export { refreshProfileStatus, stopDiscoveryHeartbeat, startDiscoveryHeartbeat, isDiscoveryActiveElsewhere, isDiscoveryLeader };
