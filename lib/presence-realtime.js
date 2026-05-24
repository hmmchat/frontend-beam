import { API } from '@/lib/api';

const listeners = new Set();
let ws = null;
let reconnectTimer = null;
let reconnectAttempt = 0;

function dispatchPresenceChanged(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('presence:changed', { detail }));
}

function emitToListeners(payload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // ignore listener failures
    }
  });
  dispatchPresenceChanged(payload);
}

function closePresenceSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  try {
    ws?.close();
  } catch {
    // ignore close failures
  }
  ws = null;
}

function connectPresenceSocket() {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('accessToken') || '';
  const base = API?.DISCOVERY_WS?.WS_URL;
  if (!token || !base || listeners.size === 0) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const socket = new WebSocket(`${base}?token=${encodeURIComponent(token)}`);
  ws = socket;
  socket.onopen = () => {
    reconnectAttempt = 0;
  };
  socket.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg?.type === 'user:status' && msg?.data?.userId) {
      emitToListeners(msg.data);
    }
  };
  socket.onclose = () => {
    if (ws === socket) ws = null;
    if (listeners.size === 0) return;
    const attempt = Math.min(8, reconnectAttempt + 1);
    reconnectAttempt = attempt;
    const delay = Math.min(15000, 500 * 2 ** attempt);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connectPresenceSocket();
    }, delay);
  };
  socket.onerror = () => {};
}

export function subscribePresenceRealtime(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  connectPresenceSocket();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) closePresenceSocket();
  };
}

export function notifyLocalPresenceChanged(detail = {}) {
  emitToListeners(detail);
}
