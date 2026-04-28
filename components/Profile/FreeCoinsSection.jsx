"use client";

import { useEffect, useMemo, useState } from "react";
import { API, apiRequest } from "@/lib/api";

const DEFAULT_AD_UNIT_ID = process.env.NEXT_PUBLIC_REWARDED_AD_UNIT_ID || "wallet_free_coins";
const DEV_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_REWARDED_AD_DEV_FALLBACK === "true";

function getWindowAdSdk() {
  if (typeof window === "undefined") return null;
  return window.HmmRewardedAds || window.rewardedAds || null;
}

async function showRewardedAd(adUnitId) {
  const sdk = getWindowAdSdk();
  if (sdk?.showRewardedAd) {
    return sdk.showRewardedAd({ adUnitId, placement: "wallet_free_coins" });
  }

  if (!DEV_FALLBACK_ENABLED) {
    throw new Error("Rewarded ads are not available yet. Please try again later.");
  }

  await new Promise((resolve) => setTimeout(resolve, 8000));
  return {
    adNetwork: "client-dev",
    providerTransactionId: `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

export default function FreeCoinsSection({ onRewardGranted }) {
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [watching, setWatching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        const rewardConfig = await apiRequest(API.ADS.GET_REWARD_CONFIG);
        if (mounted) setConfig(rewardConfig);
      } catch (err) {
        if (mounted) setError(err?.message || "Could not load ad rewards right now.");
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    };
    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const cooldownSeconds = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  }, [cooldownUntil, now]);

  const disabled = loadingConfig || watching || !config?.isActive || cooldownSeconds > 0;
  const coinsPerAd = Number(config?.coinsPerAd) || 0;
  const maxAdsPerDay = config?.maxAdsPerDay;

  const handleWatchAd = async () => {
    if (disabled) return;

    setWatching(true);
    setError("");
    setMessage("Loading rewarded ad...");

    try {
      const proof = await showRewardedAd(DEFAULT_AD_UNIT_ID);
      setMessage("Verifying ad reward...");

      const result = await apiRequest(API.ADS.VERIFY_REWARD, {
        method: "POST",
        body: JSON.stringify({
          adUnitId: proof?.adUnitId || DEFAULT_AD_UNIT_ID,
          adNetwork: proof?.adNetwork,
          providerTransactionId: proof?.providerTransactionId,
          rewardToken: proof?.rewardToken,
          rewardSignature: proof?.rewardSignature,
          revenue: proof?.revenue,
          eCPM: proof?.eCPM,
        }),
      });

      onRewardGranted?.(result);
      setMessage(`You earned ${result?.coinsAwarded || coinsPerAd} coins.`);

      if (config?.minCooldown) {
        setCooldownUntil(Date.now() + Number(config.minCooldown) * 1000);
      }
    } catch (err) {
      const text = err?.message || "Could not complete the reward.";
      setError(text);
      setMessage("");

      const match = text.match(/wait\s+(\d+)\s+seconds/i);
      if (match?.[1]) {
        setCooldownUntil(Date.now() + Number(match[1]) * 1000);
      }
    } finally {
      setWatching(false);
    }
  };

  return (
    <section className="w-full rounded-3xl border border-white/30 bg-white/10 p-5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">Free coins</p>
          <h3 className="mt-1 text-xl font-semibold text-white">
            Watch a rewarded ad
          </h3>
          <p className="mt-2 text-sm text-white/70">
            Complete the full ad to earn {coinsPerAd || "..."} coins.
          </p>
          {maxAdsPerDay ? (
            <p className="mt-1 text-xs text-white/50">
              Limit: {maxAdsPerDay} ads per day.
            </p>
          ) : null}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-2xl">
          +
        </div>
      </div>

      <button
        type="button"
        onClick={handleWatchAd}
        disabled={disabled}
        className="mt-5 w-full rounded-2xl border border-white px-4 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-white/30 disabled:text-white/40 disabled:hover:bg-transparent disabled:hover:text-white/40"
      >
        {loadingConfig
          ? "Loading rewards..."
          : watching
            ? "Ad in progress..."
            : cooldownSeconds > 0
              ? `Try again in ${cooldownSeconds}s`
              : config?.isActive
                ? `Watch ad for ${coinsPerAd} coins`
                : "Rewards unavailable"}
      </button>

      {message ? <p className="mt-3 text-center text-xs text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-3 text-center text-xs text-rose-200">{error}</p> : null}
    </section>
  );
}
