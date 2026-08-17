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

/** Transparent hole so modules are cleared behind the centered Beam wordmark. */
const QR_CENTER_HOLE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="36"></svg>',
  );

function clearQrHost(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Sparse rounded QR with the Beam wordmark locked to the same grid cell
 * (Figma 9170:6569). Do not use BeamColourLogo here — its 794px stage
 * overflows and sits beside the code on mobile.
 */
function MinimalStyledReferralQr({ encodeData }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !encodeData) {
      clearQrHost(el);
      return;
    }

    const qr = new QRCodeStyling({
      width: 186,
      height: 186,
      type: "svg",
      data: encodeData,
      margin: 0,
      image: QR_CENTER_HOLE,
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.48,
        margin: 2,
      },
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

    clearQrHost(el);
    qr.append(el);
    const graphic = el.querySelector("svg, canvas");
    if (graphic) {
      graphic.setAttribute("width", "100%");
      graphic.setAttribute("height", "100%");
      graphic.style.display = "block";
      graphic.style.width = "100%";
      graphic.style.height = "100%";
    }

    return () => {
      clearQrHost(el);
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
    <div className="grid h-full w-full overflow-hidden">
      <div
        ref={hostRef}
        className="col-start-1 row-start-1 h-full w-full overflow-hidden [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
      />
      <div className="pointer-events-none col-start-1 row-start-1 z-[1] flex items-center justify-center">
        <span className="flex h-[36px] w-[90px] items-center justify-center overflow-hidden bg-[#4e0093] md:h-[42px] md:w-[108px]">
          <img
            src="/beam-logo-center.png"
            alt=""
            className="h-[35px] w-[83px] max-w-none object-contain mix-blend-lighten md:h-[40px] md:w-[100px]"
          />
        </span>
      </div>
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
      showHint("Copied invite to clipboard");
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
    const text = messageText || shareUrl;
    try {
      if (text) await navigator.clipboard.writeText(text);
      showHint("Copied invite — paste in Instagram");
      // Instagram web does not support direct prefilled text share; open app/site and let user paste.
      const appIntent = window.open("instagram://app", "_self");
      if (!appIntent) {
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      } else {
        setTimeout(() => {
          window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
        }, 500);
      }
    } catch {
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      showHint("Opened Instagram");
    }
  };

  const shareSnapchat = async () => {
    await trackShareEvent("snapchat");
    const text = messageText || shareUrl;
    try {
      if (text) await navigator.clipboard.writeText(text);
      const attachment = encodeURIComponent(shareUrl || window.location.origin);
      window.open(
        `https://www.snapchat.com/scan?attachmentUrl=${attachment}`,
        "_blank",
        "noopener,noreferrer",
      );
      showHint("Copied invite — opened Snapchat");
    } catch {
      window.open("https://www.snapchat.com/", "_blank", "noopener,noreferrer");
      showHint("Opened Snapchat");
    }
  };

  const box =
    "w-full rounded-[2rem] border border-white/40 text-center md:rounded-[2.5rem]";

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
    <div className="flex h-full min-h-0 w-full flex-col items-stretch gap-2 overflow-hidden md:gap-5">

      {/* === INVITE BOX === */}
      <div className={`${box} flex min-h-0 flex-col items-center justify-center overflow-hidden px-6 py-5 md:flex-1 md:px-10 md:py-6`}>
          <p className="mb-1 text-center font-outfit text-[12px] font-normal text-white md:text-[15px]">
            Invite your gang and win
          </p>

          <p className="mb-3 flex items-center justify-center gap-1 font-[family-name:var(--font-otomanopee-one),sans-serif] text-[16px] text-white md:mb-4 md:text-[28px]">
            <img
              src="/Coins/coin1.png"
              alt=""
              className="h-[18px] w-[18px] md:h-8 md:w-8"
            />
            {referralRewardCoins}
          </p>

          <div
            className="relative mx-auto size-[min(186px,52vw)] shrink-0 overflow-hidden md:size-[220px]"
            role="img"
            aria-label="Scan QR code to open your referral link"
          >
            <MinimalStyledReferralQr encodeData={qrEncodedUrl} />
          </div>

          <button
            type="button"
            onClick={copyInviteMessage}
            className="mx-auto mt-4 w-full max-w-[268px] rounded-full bg-[rgba(8,0,44,0.2)] px-[30px] py-4 text-white transition hover:bg-[rgba(8,0,44,0.35)] md:mt-5 md:max-w-[320px]"
          >
            {referralCode ? (
              <span className="font-[family-name:var(--font-otomanopee-one),sans-serif] text-[16px] md:text-[18px]">
                {referralCode}
              </span>
            ) : (
              <span className="text-sm text-white/80">Your referral code</span>
            )}
          </button>
      </div>

      {/* === SHARE BOX === */}
      <div className={`${box} shrink-0 px-6 py-5 md:px-10 md:py-6`}>
          <p className="text-center font-outfit text-[12px] font-normal text-white md:text-[15px]">
            Share to
          </p>
          <div className="mt-4 flex items-center justify-center gap-[30px] md:mt-5 md:gap-10">
            <button
              type="button"
              onClick={shareSnapchat}
              className="p-0.5 transition hover:scale-110"
              aria-label="Share on Snapchat"
            >
              <Image src="/shareicon3.svg" alt="" width={30} height={30} className="brightness-0 invert" />
            </button>
            <button
              type="button"
              onClick={shareInstagram}
              className="p-0.5 transition hover:scale-110"
              aria-label="Share on Instagram"
            >
              <Image src="/shareicon2.svg" alt="" width={30} height={30} className="brightness-0 invert" />
            </button>
            <button
              type="button"
              onClick={openWhatsApp}
              className="p-0.5 transition hover:scale-110"
              aria-label="Share on WhatsApp"
            >
              <Image src="/shareicon1.svg" alt="" width={30} height={30} className="brightness-0 invert" />
            </button>
            <button
              type="button"
              onClick={copyInviteMessage}
              className="p-0.5 transition hover:scale-110"
              aria-label="Copy invite to clipboard"
            >
              <Image src="/shareicon4.svg" alt="" width={30} height={30} className="brightness-0 invert" />
            </button>
          </div>
      </div>

      {hint && <p className="shrink-0 text-center text-[10px] text-white/50">{hint}</p>}
    </div>
  );
}
