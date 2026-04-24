import { API, apiRequest } from '@/lib/api';

/**
 * Persists squad video co-participants for the authenticated user (MRU, max 3 server-side).
 * Discovery-service: POST /v1/squad/me/quick-invite/record-call-peers — see API.SQUAD.RECORD_QUICK_INVITE_CALL_PEERS.
 */
export async function recordSquadCallPeersAsync(roomSnapshot, localUserId) {
  if (!roomSnapshot || roomSnapshot.callType !== 'squad' || !localUserId) return;
  const ids = Array.isArray(roomSnapshot.memberIds) ? roomSnapshot.memberIds : [];
  const peerUserIds = ids.filter((id) => id && String(id) !== String(localUserId));
  if (!peerUserIds.length) return;
  await apiRequest(API.SQUAD.RECORD_QUICK_INVITE_CALL_PEERS, {
    method: 'POST',
    body: JSON.stringify({ peerUserIds }),
  });
}

/** Same as {@link recordSquadCallPeersAsync} but non-blocking; for `beforeunload` / sync leave paths. */
export function recordSquadCallPeersKeepalive(roomSnapshot, localUserId) {
  if (typeof window === 'undefined') return;
  if (!roomSnapshot || roomSnapshot.callType !== 'squad' || !localUserId) return;
  const ids = Array.isArray(roomSnapshot.memberIds) ? roomSnapshot.memberIds : [];
  const peerUserIds = ids.filter((id) => id && String(id) !== String(localUserId));
  if (!peerUserIds.length) return;
  const token = localStorage.getItem('accessToken');
  if (!token) return;
  try {
    fetch(API.SQUAD.RECORD_QUICK_INVITE_CALL_PEERS, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ peerUserIds }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
