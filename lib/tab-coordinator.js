const CHANNEL_NAME = 'hmm-presence-v1';
const LEADER_KEY = 'discoveryTabLeader';
const ACTIVE_KEY = 'discoverySessionActive';
const LEADER_TTL_MS = 8000;

const listeners = new Set();
let channel = null;

function getTabId() {
  if (typeof sessionStorage === 'undefined') return 'ssr';
  let id = sessionStorage.getItem('hmmTabId');
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('hmmTabId', id);
  }
  return id;
}

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      listeners.forEach((listener) => {
        try {
          listener(event.data);
        } catch {
          // ignore listener failures
        }
      });
    };
  }
  return channel;
}

function broadcast(message) {
  try {
    getChannel()?.postMessage(message);
  } catch {
    // ignore broadcast failures
  }
}

function readLeaderLock() {
  try {
    const raw = localStorage.getItem(LEADER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isLeaderLockValid(lock) {
  return Boolean(lock?.tabId && typeof lock.expiresAt === 'number' && lock.expiresAt > Date.now());
}

export function isDiscoveryLeader() {
  const lock = readLeaderLock();
  return isLeaderLockValid(lock) && lock.tabId === getTabId();
}

export function isDiscoveryActiveElsewhere() {
  const lock = readLeaderLock();
  if (!isLeaderLockValid(lock)) return false;
  return lock.tabId !== getTabId();
}

export function tryClaimDiscoveryLeadership() {
  if (typeof localStorage === 'undefined') return true;
  const tabId = getTabId();
  const lock = readLeaderLock();
  if (isLeaderLockValid(lock) && lock.tabId !== tabId) {
    return false;
  }
  localStorage.setItem(
    LEADER_KEY,
    JSON.stringify({ tabId, expiresAt: Date.now() + LEADER_TTL_MS })
  );
  broadcast({ type: 'discovery:leader', tabId });
  return true;
}

export function renewDiscoveryLeadership() {
  if (!isDiscoveryLeader()) return false;
  localStorage.setItem(
    LEADER_KEY,
    JSON.stringify({ tabId: getTabId(), expiresAt: Date.now() + LEADER_TTL_MS })
  );
  return true;
}

export function releaseDiscoveryLeadership() {
  const lock = readLeaderLock();
  if (lock?.tabId === getTabId()) {
    localStorage.removeItem(LEADER_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    broadcast({ type: 'discovery:released', tabId: getTabId() });
  }
}

export function canManageDiscoverySession() {
  return tryClaimDiscoveryLeadership() || isDiscoveryLeader();
}

export function markDiscoverySessionActive(sessionId) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    ACTIVE_KEY,
    JSON.stringify({ tabId: getTabId(), sessionId, at: Date.now() })
  );
  broadcast({ type: 'discovery:active', tabId: getTabId(), sessionId });
}

export function markDiscoverySessionInactive() {
  const activeRaw = localStorage.getItem(ACTIVE_KEY);
  try {
    const active = activeRaw ? JSON.parse(activeRaw) : null;
    if (active?.tabId === getTabId()) {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch {
    localStorage.removeItem(ACTIVE_KEY);
  }
  broadcast({ type: 'discovery:inactive', tabId: getTabId() });
}

export function readDiscoverySessionActive() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function subscribeTabCoordinator(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  // Open the channel so this tab receives BroadcastChannel messages too.
  getChannel();
  if (typeof window !== 'undefined') {
    const onStorage = (event) => {
      if (event.key === LEADER_KEY || event.key === ACTIVE_KEY) {
        listener({ type: 'storage', key: event.key });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }
  return () => listeners.delete(listener);
}

/** Non-leader tabs use this so the discovery leader immediately pulls a mutual face card. */
export function broadcastDiscoveryMatchedHint(partnerId) {
  broadcast({
    type: 'discovery:matched-hint',
    partnerId: partnerId || null,
    at: Date.now(),
  });
}

export { getTabId, LEADER_TTL_MS };
