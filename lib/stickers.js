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

/** Normalize profile user so sticker UI can read activeBadgeId consistently. */
export function getActiveBadgeId(user) {
  if (!user) return null;
  return user.activeBadgeId ?? user.activeBadge?.giftId ?? null;
}

export function withActiveBadgeId(user) {
  if (!user) return user;
  return { ...user, activeBadgeId: getActiveBadgeId(user) };
}

/** Attach catalog image URL for the active profile sticker badge. */
export async function enrichUserStickerFields(user) {
  if (!user) return user;
  const normalized = withActiveBadgeId(user);
  const activeId = getActiveBadgeId(normalized);
  if (!activeId) return normalized;

  const catalogMap = await getGiftCatalogMap();
  const activeBadgeImageUrl = resolveStickerImage(
    activeId,
    normalized.activeBadge?.imageUrl || normalized.activeBadgeImageUrl,
    catalogMap
  );

  return activeBadgeImageUrl
    ? { ...normalized, activeBadgeImageUrl }
    : normalized;
}

/**
 * Load stickers for profile: user-service badges (synced from wallet) with catalog images.
 */
export async function fetchUserStickers(userId) {
  const catalogMap = await getGiftCatalogMap();

  const badgeData = await apiRequest(API.USERS.GET_BADGES(userId)).catch(() => null);
  if (Array.isArray(badgeData) && badgeData.length > 0) {
    return badgeData.map((badge) => enrichStickerBadge(badge, catalogMap));
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

  const seen = new Set();
  const resolved = [];
  for (const tx of transactions) {
    if (!tx.giftId || seen.has(tx.giftId)) continue;
    seen.add(tx.giftId);
    resolved.push(
      enrichStickerBadge(
        {
          giftId: tx.giftId,
          receivedAt: tx.createdAt,
        },
        walletCatalogMap
      )
    );
  }

  return resolved;
}
