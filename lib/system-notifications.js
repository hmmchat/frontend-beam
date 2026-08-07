/** System BEAM / BEAM MOD inbox helpers (matches friend-service defaults). */

export const BEAM_SYSTEM_USER_ID =
  process.env.NEXT_PUBLIC_BEAM_SYSTEM_USER_ID || "system_beam";
export const BEAM_MOD_SYSTEM_USER_ID =
  process.env.NEXT_PUBLIC_BEAM_MOD_SYSTEM_USER_ID || "system_beam_mod";

function normalizeUsername(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Resolve BEAM / BEAM MOD from conversation row, active chat, or peer id.
 * Order: explicit systemLine → known system user ids → username fallback →
 * SYSTEM_NOTIFICATION lastMessage.
 */
export function getSystemLine(conversationOrPeer) {
  if (!conversationOrPeer) return null;

  if (typeof conversationOrPeer === "string") {
    if (conversationOrPeer === BEAM_SYSTEM_USER_ID) return "BEAM";
    if (conversationOrPeer === BEAM_MOD_SYSTEM_USER_ID) return "BEAM_MOD";
    return null;
  }

  if (
    conversationOrPeer.systemLine === "BEAM" ||
    conversationOrPeer.systemLine === "BEAM_MOD"
  ) {
    return conversationOrPeer.systemLine;
  }

  const peerId = conversationOrPeer.otherUserId || conversationOrPeer.otherUser?.id;
  if (peerId != null && String(peerId) === BEAM_SYSTEM_USER_ID) return "BEAM";
  if (peerId != null && String(peerId) === BEAM_MOD_SYSTEM_USER_ID) return "BEAM_MOD";

  const username = normalizeUsername(conversationOrPeer.otherUser?.username);
  if (username === "beam mod" || username === "beam_mod") return "BEAM_MOD";
  if (username === "beam") return "BEAM";

  const lastType = conversationOrPeer.lastMessage?.messageType;
  const metaLine = conversationOrPeer.lastMessage?.notificationMeta?.line;
  if (metaLine === "BEAM" || metaLine === "BEAM_MOD") return metaLine;
  if (lastType === "SYSTEM_NOTIFICATION") {
    // Prefer MOD if username hints at it; otherwise BEAM.
    if (username.includes("mod")) return "BEAM_MOD";
    return "BEAM";
  }

  return null;
}

export function isSystemNotificationThread(conversationOrPeer) {
  return getSystemLine(conversationOrPeer) != null;
}

export function systemThreadDisplayName(line) {
  return line === "BEAM_MOD" ? "BEAM MOD" : "BEAM";
}
