"use client";

import { useEffect, useMemo, useState } from "react";
import { API, apiRequest } from "@/lib/api";

const DEFAULT_AD_UNIT_ID = process.env.NEXT_PUBLIC_GAM_REWARDED_AD_UNIT || "";
const DEV_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_REWARDED_AD_DEV_FALLBACK === "true";
const GPT_SCRIPT_SRC = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function getRewardedAdUnitId() {
  return DEFAULT_AD_UNIT_ID.trim();
}

function getWindowAdSdk() {
  if (typeof window === "undefined") return null;
  return window.HmmRewardedAds || window.rewardedAds || null;
}

function loadGptScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Browser environment is required."));
  }

  if (window.googletag?.apiReady) {
    return Promise.resolve(window.googletag);
  }

  if (!window.__hmmGptLoaderPromise) {
    window.__hmmGptLoaderPromise = new Promise((resolve, reject) => {
      window.googletag = window.googletag || { cmd: [] };

      const existingScript = document.querySelector(`script[src="${GPT_SCRIPT_SRC}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.googletag), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Google ad script.")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = GPT_SCRIPT_SRC;
      script.onload = () => resolve(window.googletag);
      script.onerror = () => reject(new Error("Failed to load Google ad script."));
      document.head.appendChild(script);
    });
  }

  return window.__hmmGptLoaderPromise;
}

async function showGoogleRewardedAd(adUnitId) {
  const googletag = await loadGptScript();

  return new Promise((resolve, reject) => {
    googletag.cmd.push(() => {
      const pubads = googletag.pubads();
      const txId = `gam-${Date.now()}-${randomId()}`;
      let resolved = false;
      let rewardGranted = false;

      const slot = googletag.defineOutOfPageSlot(adUnitId, googletag.enums.OutOfPageFormat.REWARDED);
      if (!slot) {
        reject(new Error("No rewarded ad inventory available right now."));
        return;
      }

      slot.addService(pubads);

      const finishResolve = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve({
          adUnitId,
          adNetwork: "google-gam",
          providerTransactionId: txId,
        });
      };

      const finishReject = (message) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error(message));
      };

      const onReady = (event) => {
        if (event.slot !== slot) return;
        try {
          event.makeRewardedVisible();
        } catch {
          finishReject("Could not display rewarded ad.");
        }
      };

      const onGranted = (event) => {
        if (event.slot !== slot) return;
        rewardGranted = true;
      };

      const onClosed = (event) => {
        if (event.slot !== slot) return;
        if (rewardGranted) {
          finishResolve();
          return;
        }
        finishReject("Ad was closed before reward completion.");
      };

      const onRenderEnded = (event) => {
        if (event.slot !== slot) return;
        if (event.isEmpty) {
          finishReject("No ad available right now. Please try again later.");
        }
      };

      const cleanup = () => {
        pubads.removeEventListener("rewardedSlotReady", onReady);
        pubads.removeEventListener("rewardedSlotGranted", onGranted);
        pubads.removeEventListener("rewardedSlotClosed", onClosed);
        pubads.removeEventListener("slotRenderEnded", onRenderEnded);
        googletag.destroySlots([slot]);
      };

      pubads.addEventListener("rewardedSlotReady", onReady);
      pubads.addEventListener("rewardedSlotGranted", onGranted);
      pubads.addEventListener("rewardedSlotClosed", onClosed);
      pubads.addEventListener("slotRenderEnded", onRenderEnded);

      if (!window.__hmmGptServicesEnabled) {
        googletag.enableServices();
        window.__hmmGptServicesEnabled = true;
      }

      googletag.display(slot);
    });
  });
}

async function showRewardedAd(adUnitId) {
  const sdk = getWindowAdSdk();
  if (sdk?.showRewardedAd) {
    return sdk.showRewardedAd({ adUnitId, placement: "wallet_free_coins" });
  }

  if (adUnitId) {
    return showGoogleRewardedAd(adUnitId);
  }

  if (!DEV_FALLBACK_ENABLED) {
    throw new Error("Rewarded ads are not configured yet. Please try again later.");
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
  const adUnitId = getRewardedAdUnitId();
  const customSdk = getWindowAdSdk();

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
    return () => { mounted = false; };
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

  const adUnavailable = !customSdk && !adUnitId && !DEV_FALLBACK_ENABLED;
  const disabled = loadingConfig || watching || !config?.isActive || cooldownSeconds > 0 || adUnavailable;
  const coinsPerAd = Number(config?.coinsPerAd) || 0;
  const maxAdsPerDay = config?.maxAdsPerDay;

  const handleWatchAd = async () => {
    if (disabled) return;
    setWatching(true);
    setError("");
    setMessage("Loading rewarded ad...");

    try {
      const proof = await showRewardedAd(adUnitId);
      setMessage("Verifying ad reward...");

      const result = await apiRequest(API.ADS.VERIFY_REWARD, {
        method: "POST",
        body: JSON.stringify({
          adUnitId: proof?.adUnitId || adUnitId || "wallet_free_coins",
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
    <section className="w-full rounded-3xl border border-white/30 p-4 text-left shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">Free coins</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Watch a rewarded ad</h3>
          <p className="mt-1.5 text-sm text-white/70">
            Complete the full ad to earn {coinsPerAd || "..."} coins.
          </p>
          {adUnavailable && (
            <p className="mt-1 text-xs text-amber-200">
              Rewarded ad unit is not configured yet.
            </p>
          )}

          {maxAdsPerDay && (
            <p className="mt-1 text-xs text-white/50">
              Limit: {maxAdsPerDay} ads per day.
            </p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40  text-xl ">
          <img src="/assets/plus.png" alt="video" className="w-4" />
        </div>
      </div>

      <button
        type="button"
        onClick={handleWatchAd}
        disabled={disabled}
        className="mt-4 w-full rounded-2xl border border-white px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-white/30 disabled:text-white/40"
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

      {message && <p className="mt-3 text-center text-xs text-emerald-200">{message}</p>}
      {error && <p className="mt-3 text-center text-xs text-rose-200">{error}</p>}
    </section>
  );
}