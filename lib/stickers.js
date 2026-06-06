import { API, apiRequest } from "@/lib/api";

let giftCatalogMapCache = null;

/** Same catalog source as video-call GiftOverlay (`GET /me/gifts/catalog`). */
export async function getGiftCatalogMap(forceRefresh = false) {
  if (!forceRefresh && giftCatalogMapCache) return giftCatalogMapCache;

  const res = await apiRequest(API.FRIENDS.GET_GIFT_CATALOG).catch(() => null);
  const map = {};
  for (const gift of Array.isArray(res?.gifts) ? res.gifts : []) {
    if (gift?.giftId) map[gift.giftId] = gift;
  }
  giftCatalogMapCache = map;
  return map;
}

/** Resolve sticker art from catalog `imageUrl` — no static giftId → png mappings. */
export function resolveStickerImage(giftId, imageUrl, catalogMap) {
  const direct = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (direct) return direct;

  const fromCatalog = catalogMap?.[giftId]?.imageUrl;
  if (typeof fromCatalog === "string" && fromCatalog.trim()) {
    return fromCatalog.trim();
  }

  return null;
}

export async function resolveStickerImageForGiftId(giftId) {
  if (!giftId) return null;
  const catalogMap = await getGiftCatalogMap();
  return resolveStickerImage(giftId, null, catalogMap);
}

/** @deprecated Use resolveStickerImage / catalog imageUrl instead. */
export function resolveStickerPath(giftId, catalogMap) {
  return resolveStickerImage(giftId, null, catalogMap) || "";
}

export function enrichStickerBadge(badge, catalogMap) {
  const catalog = catalogMap?.[badge?.giftId] || {};
  const imageUrl = resolveStickerImage(
    badge?.giftId,
    badge?.imageUrl || catalog.imageUrl,
    catalogMap
  );

  return {
    ...badge,
    giftName: badge?.giftName || catalog.name || badge?.giftId || "",
    giftEmoji: badge?.giftEmoji || catalog.emoji || "🎁",
    imageUrl,
  };
}

/** Active sticker instance id on profile (UserBadge.id). */
export function getActiveBadgeId(user) {
  if (!user) return null;
  return user.activeBadgeId ?? user.activeBadge?.id ?? null;
}

/** Gift catalog id for the active profile sticker (for image lookup). */
export function getActiveBadgeGiftId(user) {
  if (!user) return null;
  return user.activeBadge?.giftId ?? null;
}

export function withActiveBadgeId(user) {
  if (!user) return user;
  return { ...user, activeBadgeId: getActiveBadgeId(user) };
}

/** Attach catalog image URL for the active profile sticker badge. */
export async function enrichUserStickerFields(user) {
  if (!user) return user;
  const normalized = withActiveBadgeId(user);
  const giftId = getActiveBadgeGiftId(normalized);
  if (!giftId) return normalized;

  const catalogMap = await getGiftCatalogMap();
  const activeBadgeImageUrl = resolveStickerImage(
    giftId,
    normalized.activeBadge?.imageUrl || normalized.activeBadgeImageUrl,
    catalogMap
  );

  return activeBadgeImageUrl
    ? { ...normalized, activeBadgeImageUrl }
    : normalized;
}

function formatExpiryLabel(expiresAt) {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "Expired";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days === 1 ? "Expires in 1 day" : `Expires in ${days} days`;
}

/**
 * Load stickers for profile: one row per gift/dare received, with per-instance expiry.
 * @returns {{ stickerExpiryDays: number, badges: Array }}
 */
export async function fetchUserStickers(userId) {
  const catalogMap = await getGiftCatalogMap();

  const badgeData = await apiRequest(API.USERS.GET_BADGES(userId)).catch(() => null);

  if (badgeData && Array.isArray(badgeData.badges)) {
    return {
      stickerExpiryDays: badgeData.stickerExpiryDays ?? 7,
      badges: badgeData.badges.map((badge) => ({
        ...enrichStickerBadge(badge, catalogMap),
        expiryLabel: formatExpiryLabel(badge.expiresAt),
      })),
    };
  }

  if (Array.isArray(badgeData) && badgeData.length > 0) {
    return {
      stickerExpiryDays: 7,
      badges: badgeData.map((badge) => enrichStickerBadge(badge, catalogMap)),
    };
  }

  const [txRes, catalogRes] = await Promise.all([
    apiRequest(API.WALLET.GET_GIFTS).catch(() => null),
    apiRequest(API.FRIENDS.GET_GIFT_CATALOG).catch(() => null),
  ]);

  const transactions = Array.isArray(txRes) ? txRes : [];
  const catalogGifts = Array.isArray(catalogRes?.gifts) ? catalogRes.gifts : [];

  const walletCatalogMap = { ...catalogMap };
  catalogGifts.forEach((g) => {
    if (g.giftId) walletCatalogMap[g.giftId] = g;
  });

  const stickerExpiryDays = 7;
  const badges = transactions
    .filter((tx) => tx.giftId)
    .map((tx) =>
      enrichStickerBadge(
        {
          id: tx.id,
          giftId: tx.giftId,
          receivedAt: tx.createdAt,
          expiresAt: tx.createdAt
            ? new Date(new Date(tx.createdAt).getTime() + stickerExpiryDays * 86400000).toISOString()
            : null,
        },
        walletCatalogMap
      )
    );

  return { stickerExpiryDays, badges };
}
