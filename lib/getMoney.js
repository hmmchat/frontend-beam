const DEFAULT_MIN_REDEMPTION_DIAMONDS = 100;
const DEFAULT_DIAMOND_TO_INR_RATE = 0.4;

function readPositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getMoneyConfig() {
  const minRedemptionDiamonds = readPositiveNumber(
    process.env.NEXT_PUBLIC_MIN_REDEMPTION_DIAMONDS,
    DEFAULT_MIN_REDEMPTION_DIAMONDS,
  );
  const diamondToInrRate = readPositiveNumber(
    process.env.NEXT_PUBLIC_DIAMOND_TO_INR_RATE,
    DEFAULT_DIAMOND_TO_INR_RATE,
  );
  return { minRedemptionDiamonds, diamondToInrRate };
}

export function buildGetMoneyModel({ diamonds = 0, coins = 0 } = {}) {
  const { minRedemptionDiamonds, diamondToInrRate } = getMoneyConfig();
  const safeDiamonds = Math.max(0, Number(diamonds) || 0);
  const safeCoins = Math.max(0, Number(coins) || 0);
  const diamondsLeft = Math.max(0, minRedemptionDiamonds - safeDiamonds);
  const unlockProgress = Math.max(
    0,
    Math.min(100, (safeDiamonds / minRedemptionDiamonds) * 100),
  );

  return {
    diamonds: safeDiamonds,
    coins: safeCoins,
    minRedemptionDiamonds,
    diamondToInrRate,
    diamondsLeft,
    isUnlocked: diamondsLeft === 0,
    unlockProgress,
    currentInrValue: safeDiamonds * diamondToInrRate,
  };
}

export function formatInrValue(value) {
  const amount = Math.max(0, Number(value) || 0);
  if (amount >= 1000) return Math.round(amount).toLocaleString("en-IN");
  if (amount >= 100) return amount.toFixed(1).replace(/\.0$/, "");
  return amount.toFixed(2).replace(/\.00$/, "");
}
