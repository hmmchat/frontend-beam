import { API, apiRequest } from '@/lib/api';

const DEFAULT_MIN_GAP_MS = 10000;
const DEFAULT_429_BACKOFF_MS = 60000;

let cachedNotificationCount = null;
let hasCachedNotificationCount = false;
let nextAllowedAt = 0;
let inFlight = null;
const listeners = new Set();
const realtimeListeners = new Set();
let realtimeWs = null;
let realtimeReconnectTimer = null;
let realtimeReconnectAttempt = 0;
let realtimeRefreshTimer = null;

const isRateLimitError = (error) => {
  const msg = String(error?.message || error || '');
  return error?.status === 429 || /429|rate limit|too many/i.test(msg);
};

const emitNotificationCount = () => {
  listeners.forEach((listener) => {
    try {
      listener(cachedNotificationCount);
    } catch {
      // ignore listener failures
    }
  });
};

export function subscribeNotificationCount(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  if (hasCachedNotificationCount) listener(cachedNotificationCount);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotificationBadgeCount(data = cachedNotificationCount) {
  if (!data) return 0;
  return (data.totalUnreadMessages || 0) + (data.pendingFriendRequests || 0);
}

export function setCachedNotificationCount(data) {
  cachedNotificationCount = data || null;
  hasCachedNotificationCount = true;
  emitNotificationCount();
}

function scheduleForcedNotificationRefresh(delayMs = 250) {
  if (typeof window === 'undefined') return;
  if (realtimeRefreshTimer) return;
  realtimeRefreshTimer = window.setTimeout(() => {
    realtimeRefreshTimer = null;
    void getNotificationCountThrottled({ force: true, minGapMs: 5000 });
  }, delayMs);
}

function closeRealtimeNotificationSocket() {
  if (realtimeReconnectTimer) {
    clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = null;
  }
  if (realtimeRefreshTimer) {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = null;
  }
  try {
    realtimeWs?.close();
  } catch {
    // ignore close failures
  }
  realtimeWs = null;
}

function connectRealtimeNotificationSocket() {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('accessToken') || '';
  const base = API?.FRIENDS_WS?.WS_URL;
  if (!token || !base || realtimeListeners.size === 0) return;
  if (
    realtimeWs &&
    (realtimeWs.readyState === WebSocket.OPEN || realtimeWs.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const ws = new WebSocket(`${base}?token=${encodeURIComponent(token)}`);
  realtimeWs = ws;
  ws.onopen = () => {
    realtimeReconnectAttempt = 0;
  };
  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg?.type === 'friend:message' || msg?.type === 'friend:refresh') {
      scheduleForcedNotificationRefresh();
    }
  };
  ws.onclose = () => {
    if (realtimeWs === ws) realtimeWs = null;
    if (realtimeListeners.size === 0) return;
    const attempt = Math.min(8, realtimeReconnectAttempt + 1);
    realtimeReconnectAttempt = attempt;
    const delay = Math.min(15000, 500 * 2 ** attempt);
    realtimeReconnectTimer = window.setTimeout(() => {
      realtimeReconnectTimer = null;
      connectRealtimeNotificationSocket();
    }, delay);
  };
  ws.onerror = () => {};
}

export function subscribeNotificationRealtime(listener = () => {}) {
  if (typeof window === 'undefined') return () => {};
  realtimeListeners.add(listener);
  connectRealtimeNotificationSocket();
  return () => {
    realtimeListeners.delete(listener);
    if (realtimeListeners.size === 0) {
      closeRealtimeNotificationSocket();
    }
  };
}

export async function getNotificationCountThrottled(options = {}) {
  const {
    force = false,
    minGapMs = DEFAULT_MIN_GAP_MS,
    backoff429Ms = DEFAULT_429_BACKOFF_MS,
  } = options;

  if (typeof window === 'undefined') return cachedNotificationCount;
  if (!localStorage.getItem('accessToken')) return null;

  const now = Date.now();
  if (!force && hasCachedNotificationCount && now < nextAllowedAt) {
    return cachedNotificationCount;
  }
  if (inFlight) {
    if (!force) return inFlight;
    await inFlight.catch(() => null);
  }

  nextAllowedAt = now + minGapMs;
  inFlight = apiRequest(API.FRIENDS.GET_NOTIFICATIONS_COUNT)
    .then((data) => {
      setCachedNotificationCount(data || null);
      return cachedNotificationCount;
    })
    .catch((error) => {
      if (isRateLimitError(error)) {
        nextAllowedAt = Date.now() + backoff429Ms;
      }
      return cachedNotificationCount;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
