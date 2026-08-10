/**
 * Runtime diamond→coin rate from backend (gift catalog / wallet balance).
 * Source of truth is wallet-service `DIAMOND_TO_COIN_RATE` — not a frontend env var.
 */
const FALLBACK_DIAMOND_TO_COIN_RATE = 100;

let runtimeDiamondToCoinRate = null;

export function setDiamondToCoinRate(rate) {
  const n = Number(rate);
  if (Number.isFinite(n) && n > 0) {
    runtimeDiamondToCoinRate = n;
  }
}

export function getDiamondToCoinRate() {
  return runtimeDiamondToCoinRate ?? FALLBACK_DIAMOND_TO_COIN_RATE;
}

/** Prefer server `coinPrice`; otherwise diamonds × backend rate. */
export function diamondsToCoinPrice(diamonds, rate) {
  const amount = Math.max(0, Number(diamonds) || 0);
  const n = Number(rate);
  const resolved =
    Number.isFinite(n) && n > 0 ? n : getDiamondToCoinRate();
  return amount * resolved;
}

/** Apply rate + gift coin prices from GET /me/gifts/catalog. */
export function mapCatalogGift(g, idx = 0, catalogRate) {
  if (catalogRate != null) setDiamondToCoinRate(catalogRate);
  const diamondsVal = g.diamonds ?? g.coins ?? 0;
  const rate = catalogRate ?? getDiamondToCoinRate();
  const coinPrice = Number(g.coinPrice);
  return {
    id: g.giftId || idx,
    name: g.name,
    price:
      Number.isFinite(coinPrice) && coinPrice >= 0
        ? coinPrice
        : diamondsToCoinPrice(diamondsVal, rate),
    diamonds: diamondsVal,
    img: g.emoji || "🎁",
    imageUrl: g.imageUrl,
  };
}
