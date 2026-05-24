import { API, apiRequest } from '@/lib/api';
import { notifyLocalPresenceChanged } from '@/lib/presence-realtime';

let statusChain = Promise.resolve();

async function readProfileStatus() {
  try {
    const profile = await apiRequest(API.USERS.GET_ME);
    return profile?.status || profile?.user?.status || null;
  } catch (_) {
    return null;
  }
}

async function patchStatusOnce(status) {
  await apiRequest(API.USERS.UPDATE_STATUS, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

async function verifyAndRetryStatus(expectedStatus) {
  const actual = await readProfileStatus();
  if (actual && actual !== expectedStatus) {
    await patchStatusOnce(expectedStatus);
  }
  return actual || expectedStatus;
}

/**
 * Serialize status PATCHes so rapid transitions (AVAILABLE → ONLINE) are not dropped.
 */
export async function setPresenceStatus(status) {
  const run = statusChain.then(async () => {
    await patchStatusOnce(status);
    const actual = await verifyAndRetryStatus(status);
    notifyLocalPresenceChanged({ status: actual || status, source: 'presence-status' });
  });
  statusChain = run.catch(() => {});
  await run;
}

export function setPresenceStatusKeepalive(status) {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    fetch(API.USERS.UPDATE_STATUS, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status }),
      keepalive: true
    }).catch(() => {});
  } catch (_) {}
}

export { readProfileStatus as refreshProfileStatusFromApi };
