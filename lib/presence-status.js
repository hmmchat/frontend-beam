import { API, apiRequest } from '@/lib/api';

let inFlight = false;
let queued = null;

export async function setPresenceStatus(status) {
  if (inFlight) {
    queued = status;
    return;
  }

  inFlight = true;
  try {
    await apiRequest(API.USERS.UPDATE_STATUS, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  } finally {
    inFlight = false;
    if (queued && queued !== status) {
      const next = queued;
      queued = null;
      await setPresenceStatus(next);
    } else {
      queued = null;
    }
  }
}

export function setPresenceStatusKeepalive(status) {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    fetch(API.USERS.UPDATE_STATUS, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status }),
      keepalive: true
    }).catch(() => {});
  } catch (_) {}
}
