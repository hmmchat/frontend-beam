"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import QRCodeStyling from "qr-code-styling";
import { API, apiRequest } from "@/lib/api";
import BeamColourLogo from "@/components/ui/BeamColourLogo";

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
      <BeamColourLogo
        alt=""
        className="pointer-events-none absolute left-1/2 top-1/2 w-[94px] -translate-x-1/2 -translate-y-1/2"
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
    "w-full  rounded-[2rem] border border-[rgba(200,180,255,0.4)]  text-center md:max-w-none md:rounded-[2.5rem]";

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
    <div className="flex w-full min-h-0 flex-col items-center gap-6 overflow-y-auto scrollbar-hide px-3 py-2 md:py-4">

      {/* === INVITE BOX === */}
      <div className="w-full mx-auto">
        <div className={`${box} px-8 py-12 md:px-8 md:py-12`}>
          <p className="mb-2 text-center font-[family-name:var(--font-outfit),sans-serif] text-[15px] font-semibold text-white md:text-[17px]">
            Invite your gang and win
          </p>

          <p className="mb-4 flex items-center justify-center gap-1  font-semibold text-white text-xl md:text-2xl">
            <img
              src="/Coins/coin1.png"
              alt=""
              className="h-8 w-8 md:h-9 md:w-9"
            />
            {referralRewardCoins}
          </p>

          <div className="mx-auto mb-4 flex w-max justify-center">
            <div
              className="relative p-[6px] h-[150px] w-[150px] md:h-[118px] md:w-[118px]"
              role="img"
              aria-label="Scan QR code to open your referral link"
            >
              <MinimalStyledReferralQr encodeData={qrEncodedUrl} />
            </div>
          </div>

          <button
            type="button"
            onClick={copyInviteMessage}
            className="mx-auto w-full max-w-[260px] rounded-full bg-[#2a1548]/40 py-3 text-white transition hover:bg-[#351a5a]"
          >
            {referralCode ? (
              <span className="font-[family-name:var(--font-outfit),sans-serif] text-[17px] font-semibold">
                {referralCode}
              </span>
            ) : (
              <span className="text-sm text-white/80">Your referral code</span>
            )}
          </button>
        </div>
      </div>

      {/* === SHARE BOX === */}
      <div className="w-full mx-auto">
        <div className={`${box} px-8 py-12 md:px-8 md:py-10`}>
          <p className=" text-center font-[family-name:var(--font-outfit),sans-serif] text-[14px] font-semibold text-white md:text-[17px]">
            Share to
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mt-6">
            <button
              type="button"
              onClick={shareSnapchat}
              className="p-0.5 transition hover:scale-110"
              aria-label="Share on Snapchat"
            >
              <Image src="/shareicon3.svg" alt="" width={40} height={40} className="brightness-0 invert" />
            </button>
            <button
              type="button"
              onClick={shareInstagram}
              className="p-0.5 transition hover:scale-110"
              aria-label="Share on Instagram"
            >
              <Image src="/shareicon2.svg" alt="" width={40} height={40} className="brightness-0 invert" />
            </button>
            <button
              type="button"
              onClick={openWhatsApp}
              className="p-0.5 transition hover:scale-110"
              aria-label="Share on WhatsApp"
            >
              <Image src="/shareicon1.svg" alt="" width={40} height={40} className="brightness-0 invert" />
            </button>
            <button
              type="button"
              onClick={copyInviteMessage}
              className="p-0.5 transition hover:scale-110"
              aria-label="Copy invite to clipboard"
            >
              <Image src="/shareicon4.svg" alt="" width={40} height={40} className="brightness-0 invert" />
            </button>
          </div>
        </div>
      </div>

      {hint && <p className="text-center text-[10px] text-white/50">{hint}</p>}
    </div>
  );
}
