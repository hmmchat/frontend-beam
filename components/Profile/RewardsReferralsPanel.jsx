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
    const lean = new URL(`${u.origin}${u.pathname}`);
    lean.searchParams.set("ref", ref);
    if (u.hash) lean.hash = u.hash;
    return lean.toString();
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

const QR_PURPLE = "#4c1484";

/**
 * Styled, scannable QR (qr-code-styling): white rounded modules on purple,
 * soft corner eyes, small center beam asset. ECC M + lean URL → sparser matrix
 * than long URLs at level H (still not identical to static Figma art).
 */
function MinimalStyledReferralQr({ encodeData }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !encodeData) {
      if (el) QRCodeStyling._clearContainer(el);
      return;
    }

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const beamSrc = origin ? `${origin}/code.png` : "/code.png";

    const qr = new QRCodeStyling({
      width: 220,
      height: 220,
      type: "svg",
      data: encodeData,
      margin: 0,
      qrOptions: {
        errorCorrectionLevel: "M",
      },
      image: beamSrc,
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.22,
        margin: 0,
        crossOrigin: "anonymous",
      },
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
        color: QR_PURPLE,
      },
      backgroundOptions: {
        color: QR_PURPLE,
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
      ref={hostRef}
      className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full"
    />
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
  const stats = overview?.stats;

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

  const coinsEarned =
    stats?.totalCoinsEarned != null ? stats.totalCoinsEarned : 0;

  return (
    <div className="flex w-full min-h-0 flex-col items-center gap-2 md:gap-3">
      <div className={`${box} mx-auto px-6 py-5 md:px-8 md:py-6`}>
        <p className="mb-2 font-[family-name:var(--font-outfit),sans-serif] text-[15px] font-semibold text-white">
          Invite your gang and win
        </p>
        <p className="mb-4 flex items-center justify-center gap-2 text-2xl font-bold text-white">
          <img src="/Coins/coin1.png" alt="" className="h-9 w-9" />
          {coinsEarned}
        </p>

        <div className="mx-auto mb-4 flex w-max justify-center">
          <div className="rounded-2xl bg-white p-1 shadow-sm">
            <div
              className="relative h-[88px] w-[88px] overflow-hidden rounded-xl bg-[#4c1484]"
              role="img"
              aria-label="Scan QR code to open your referral link"
            >
              <MinimalStyledReferralQr encodeData={qrEncodedUrl} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={copyInviteMessage}
          className="mx-auto w-full max-w-[17.5rem] rounded-full bg-[#2a1548] py-2.5 text-white transition hover:bg-[#351a5a] md:max-w-xs"
        >
          {referralCode ? (
            <span className="font-mono text-[15px] tracking-wide">
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
