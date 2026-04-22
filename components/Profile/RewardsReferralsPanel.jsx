"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import QRCodeStyling from "qr-code-styling";
import { API, apiRequest } from "@/lib/api";

/**
 * QR matrix density is driven by encoded byte length. Strip non-essential query
 * params so only `ref` remains when possible → often a lower QR version → fewer
 * modules (closer to sparse reference art) while scans still open the referral.
 */
function getQrEncodedUrl(deepLink, referralCode) {
  if (!deepLink) return "";
  try {
    const u = new URL(deepLink);
    const ref = u.searchParams.get("ref") || referralCode || "";
    if (!ref) return deepLink;

    // If backend already returns a compact short-link (/r/<code>), keep it.
    const compactPath = u.pathname.replace(/\/+$/, "");
    if (/\/r\/[A-Za-z0-9]+$/i.test(compactPath)) {
      return deepLink;
    }

    // Fallback to canonical query shape for compatibility.
    const leanQueryLink = new URL(`${u.origin}${u.pathname}`);
    leanQueryLink.searchParams.set("ref", ref);
    if (u.hash) leanQueryLink.hash = u.hash;

    // Prefer gateway short-link when available (auth-service exposes /v1/r/:referralCode).
    let gatewayShortLink = "";
    try {
      const overviewUrl = new URL(API.REFERRALS.GET_OVERVIEW);
      gatewayShortLink = `${overviewUrl.origin}/v1/r/${encodeURIComponent(ref)}`;
    } catch {
      gatewayShortLink = "";
    }

    // Choose shortest valid candidate to reduce matrix density.
    const candidates = [deepLink, leanQueryLink.toString(), gatewayShortLink].filter(
      Boolean,
    );
    return candidates.reduce((shortest, cur) =>
      cur.length < shortest.length ? cur : shortest,
    );
  } catch {
    return deepLink;
  }
}

async function trackShareEvent(channel, opts = {}) {
  const { target, metadata } = opts;
  try {
    await apiRequest(API.REFERRALS.SHARE_EVENTS, {
      method: "POST",
      body: JSON.stringify({
        channel,
        ...(target ? { target } : {}),
        metadata: { screen: "profile_rewards", ...metadata },
      }),
    });
  } catch (e) {
    console.warn("[referrals] share event failed:", e?.message || e);
  }
}

/**
 * Styled, scannable QR (qr-code-styling): white rounded modules over transparent
 * background, with a centered Beam mark. Parent surface provides the purple fill.
 */
function MinimalStyledReferralQr({ encodeData }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !encodeData) {
      if (el) QRCodeStyling._clearContainer(el);
      return;
    }

    const qr = new QRCodeStyling({
      width: 220,
      height: 220,
      type: "svg",
      data: encodeData,
      margin: 2,
      qrOptions: { errorCorrectionLevel: "H" },
      dotsOptions: {
        type: "rounded",
        color: "#ffffff",
        roundSize: true,
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: "#ffffff",
      },
      cornersDotOptions: {
        type: "dot",
        color: "#ffffff",
      },
      backgroundOptions: {
        color: "transparent",
      },
    });

    QRCodeStyling._clearContainer(el);
    qr.append(el);

    return () => {
      QRCodeStyling._clearContainer(el);
    };
  }, [encodeData]);

  if (!encodeData) {
    return (
      <span className="flex h-full items-center justify-center text-[10px] text-neutral-400">
        No link yet
      </span>
    );
  }

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
    >
      <div
        ref={hostRef}
        className="h-full w-full [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full"
      />
      <img
        src="/beam-logo-center.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[24px] w-auto -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}

export default function RewardsReferralsPanel() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hint, setHint] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(API.REFERRALS.GET_OVERVIEW);
      setOverview(data);
    } catch (e) {
      setError(e.message || "Could not load referral data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shareUrl =
    overview?.share?.deepLink || overview?.share?.copyText || "";
  const messageText = overview?.share?.messageTemplate || shareUrl || "";
  const referralCode = overview?.referralCode || "";

  const qrEncodedUrl = useMemo(
    () => getQrEncodedUrl(shareUrl, referralCode),
    [shareUrl, referralCode],
  );

  const showHint = (text) => {
    setHint(text);
    setTimeout(() => setHint(""), 2200);
  };

  const copyInviteMessage = async () => {
    const text = messageText || shareUrl;
    if (!text) return;
    try {
      await trackShareEvent("copy", { target: "invite_message" });
      await navigator.clipboard.writeText(text);
    } catch {
      showHint("Could not copy — try again");
    }
  };

  const openWhatsApp = async () => {
    await trackShareEvent("whatsapp");
    const q = encodeURIComponent(messageText || shareUrl);
    window.open(`https://wa.me/?text=${q}`, "_blank", "noopener,noreferrer");
  };

  const shareInstagram = async () => {
    await trackShareEvent("instagram");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Beam",
          text: messageText || shareUrl,
          url: shareUrl || undefined,
        });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(messageText || shareUrl);
      showHint("Copied — paste in Instagram");
    } catch {
      showHint("Could not share or copy");
    }
  };

  const shareSnapchat = async () => {
    await trackShareEvent("snapchat");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Beam",
          text: messageText || shareUrl,
          url: shareUrl || undefined,
        });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(messageText || shareUrl);
      showHint("Copied — paste in Snapchat");
    } catch {
      showHint("Could not share or copy");
    }
  };

  const box =
    "w-full max-w-[min(100%,22rem)] rounded-[2rem] border border-[rgba(200,180,255,0.4)] bg-black/15 text-center md:max-w-[24rem] md:rounded-[2.5rem]";

  if (loading) {
    return (
      <div className={`${box} mx-auto px-5 py-6 text-sm text-white/70`}>
        Loading rewards…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${box} mx-auto space-y-3 px-5 py-6`}>
        <p className="text-sm text-red-300/90">{error}</p>
        <button
          type="button"
          onClick={load}
          className="rounded-full border border-white/40 px-4 py-2 text-sm hover:bg-white/10"
        >
          Retry
        </button>
      </div>
    );
  }

  const referralRewardCoins =
    overview?.rewardConfig?.referrerCoins != null
      ? overview.rewardConfig.referrerCoins
      : 0;

  return (
    <div className="flex w-full min-h-0 flex-col items-center gap-2 md:gap-3">
      <div className={`${box} mx-auto px-6 py-5 md:px-8 md:py-6`}>
        <p className="mb-2 font-[family-name:var(--font-outfit),sans-serif] text-[15px] font-semibold text-white">
          Invite your gang and win
        </p>
        <p className="mb-4 flex items-center justify-center gap-2 text-2xl font-bold text-white">
          <img src="/Coins/coin1.png" alt="" className="h-9 w-9" />
          {referralRewardCoins}
        </p>

        <div className="mx-auto mb-4 flex w-max justify-center">
          <div
            className="relative h-[116px] w-[116px] p-[6px]"
            role="img"
            aria-label="Scan QR code to open your referral link"
          >
            <MinimalStyledReferralQr encodeData={qrEncodedUrl} />
          </div>
        </div>

        <button
          type="button"
          onClick={copyInviteMessage}
          className="mx-auto w-full max-w-[17.5rem] rounded-full bg-[#2a1548] py-2.5 text-white transition hover:bg-[#351a5a] md:max-w-xs"
        >
          {referralCode ? (
            <span className="font-[family-name:var(--font-outfit),sans-serif] text-[15px] font-semibold">
              {referralCode}
            </span>
          ) : (
            <span className="text-sm text-white/80">Your referral code</span>
          )}
        </button>
      </div>

      <div className={`${box} mx-auto px-6 py-5 md:px-8 md:py-6`}>
        <p className="mb-4 font-[family-name:var(--font-outfit),sans-serif] text-[15px] font-semibold text-white">
          Share to
        </p>
        <div className="flex flex-wrap items-center justify-center gap-7">
          <button
            type="button"
            onClick={shareSnapchat}
            className="p-0.5"
            aria-label="Share on Snapchat"
          >
            <Image
              src="/shareicon4.png"
              alt=""
              width={36}
              height={36}
              className="brightness-0 invert"
            />
          </button>
          <button
            type="button"
            onClick={shareInstagram}
            className="p-0.5"
            aria-label="Share on Instagram"
          >
            <Image
              src="/shareicon2.png"
              alt=""
              width={36}
              height={36}
              className="brightness-0 invert"
            />
          </button>
          <button
            type="button"
            onClick={openWhatsApp}
            className="p-0.5"
            aria-label="Share on WhatsApp"
          >
            <Image
              src="/shareicon1.png"
              alt=""
              width={36}
              height={36}
              className="brightness-0 invert"
            />
          </button>
          <button
            type="button"
            onClick={copyInviteMessage}
            className="p-0.5"
            aria-label="Copy invite to clipboard"
          >
            <Image
              src="/shareicon3.png"
              alt=""
              width={36}
              height={36}
              className="brightness-0 invert"
            />
          </button>
        </div>
      </div>

      {hint ? (
        <p className="text-center text-[10px] text-white/50">{hint}</p>
      ) : null}
    </div>
  );
}
