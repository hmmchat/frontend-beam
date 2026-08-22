"use client";

import React, { useState, useEffect } from "react";
import { subscribePresenceRealtime } from "@/lib/presence-realtime";
import { API, apiRequest } from "@/lib/api";
import { displayCardName } from "@/lib/username";
import { submitUserReport } from "@/lib/report-user";
import ReportUserModal from "@/components/modals/ReportUserModal";
import BlockUserModal from "@/components/modals/BlockUserModal";
import {
  IoEllipsisVerticalSharp,
  IoLocationOutline,
  IoRadio,
  IoVideocam,
  IoVideocamOff,
} from "react-icons/io5";
import { calculateAge, getFacecardPhotos } from "@/lib/facecard-utils";
import { useFacecardPhotoPager } from "@/lib/use-facecard-photo-pager";
import FacecardPhotoDots from "@/components/facecard/FacecardPhotoDots";

import { IoIosArrowForward } from "react-icons/io";
import Report from "../facecard/Report";
import KycVerifiedBadge from "../facecard/KycVerifiedBadge";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

function brandLogoUrl(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  return entry.brand?.logoUrl || entry.logoUrl || null;
}

/** Only real logos — no empty placeholders (max 5). */
function buildBrandLogos(prefs, legacy) {
  const logos = [];
  if (prefs?.length) {
    for (const p of prefs) {
      const u = brandLogoUrl(p);
      if (u) logos.push(u);
    }
  } else if (legacy?.length) {
    for (const b of legacy) {
      if (typeof b === "string" && b) {
        logos.push(b);
      } else if (b && typeof b === "object") {
        const u = b.logoUrl || b.url || brandLogoUrl(b);
        if (u) logos.push(u);
      }
    }
  }
  return logos.slice(0, 5);
}

const FaceCard = ({
  user,
  hideArrows,
  currentIndex,
  onIndexChange,
  hideHeader,
  hideMenu = false,
  className,
  onBlockOrReportSuccess,
  menuVariant = "default",
  onUnblockSuccess,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const isUnblockMenu = menuVariant === "unblock";

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReportUser = async (reportedUserId, reason = 'basic') => {
    try {
      const res = await submitUserReport({
        reportedUserId,
        reportType: 'participant',
        reason,
      });
      if (res.success) {
        triggerToast('User reported successfully.');
        if (onBlockOrReportSuccess) {
          setTimeout(() => onBlockOrReportSuccess(), 1000);
        }
      } else {
        triggerToast('Failed to report user.');
      }
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Failed to report user.');
    }
  };

  const handleBlockUser = async (blockedUserId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await apiRequest(API.FRIENDS.BLOCK_USER(blockedUserId), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok || res.success || res.message) {
        triggerToast('User blocked successfully.');
        if (onBlockOrReportSuccess) {
          setTimeout(() => onBlockOrReportSuccess(), 1000);
        }
      } else {
        triggerToast('Failed to block user.');
      }
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Failed to block user.');
    }
  };

  const handleUnblockUser = async (unblockedUserId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await apiRequest(API.FRIENDS.UNBLOCK_USER(unblockedUserId), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok || res.success || res.message) {
        triggerToast('User unblocked.');
        if (onUnblockSuccess) {
          setTimeout(() => onUnblockSuccess(), 800);
        }
      } else {
        triggerToast('Failed to unblock user.');
      }
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Failed to unblock user.');
    }
  };
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const normalizedPathname = pathname?.replace(/\/$/, "");
  const isCardsPage = normalizedPathname === "/cards";
  const isFacecardPage = normalizedPathname === "/facecard";
  const isCardsOrFacecardPage = isCardsPage || isFacecardPage;

  const handleBackHome = (e) => {
    e?.stopPropagation();
    router.push("/");
  };

  // Realtime presence state (mirrors FaceCard4 pattern)
  const [realtimeStatus, setRealtimeStatus] = useState("");
  const [realtimeVideoEnabled, setRealtimeVideoEnabled] = useState(null);
  const [realtimeVideoOn, setRealtimeVideoOn] = useState(null);

  useEffect(() => {
    if (!user) return;
    setRealtimeStatus(user.status || user.userStatus || "");
    setRealtimeVideoEnabled(user.videoEnabled);
    setRealtimeVideoOn(user.videoOn);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (user.type === "LOCATION" || user.isLocationCard) return;
    const targetUserId = user.userId || user.id || user._id;
    if (!targetUserId || String(targetUserId).startsWith("location:")) return;

    const unsub = subscribePresenceRealtime((payload) => {
      if (payload && String(payload.userId) === String(targetUserId)) {
        if (payload.status !== undefined) {
          setRealtimeStatus(payload.status);
        }
        if (payload.videoEnabled !== undefined) {
          setRealtimeVideoEnabled(payload.videoEnabled);
        }
        if (payload.videoOn !== undefined) {
          setRealtimeVideoOn(payload.videoOn);
        }
      }
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // City face cards use synthetic ids like `location:Delhi` — not real users.
    if (user.type === "LOCATION" || user.isLocationCard) return;
    const targetUserId = user.userId || user.id || user._id;
    if (!targetUserId || String(targetUserId).startsWith("location:")) return;

    const poll = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API.USERS.GET_USER(targetUserId)}?fields=videoEnabled,status`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.videoEnabled !== undefined) {
            setRealtimeVideoEnabled(data.user.videoEnabled);
          }
          if (data?.user?.status !== undefined) {
            setRealtimeStatus(data.user.status);
          }
        }
      } catch (err) {
        // ignore errors
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleGlobalClick = () => setShowDropdown(false);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [showDropdown]);

  if (!user) return null;

  // Compute report layer dynamically if not directly available
  let reportLayer = user.reportLayer;
  if (reportLayer === undefined && typeof user.reportCount === "number") {
    const thresholds = user.reportLayerThresholds || { layer1: 1, layer2: 3, layer3: 5, ban: 7 };
    if (user.reportCount >= thresholds.layer3) reportLayer = 3;
    else if (user.reportCount >= thresholds.layer2) reportLayer = 2;
    else if (user.reportCount >= thresholds.layer1) reportLayer = 1;
    else reportLayer = 0;
  }
  const hasReportLayer = typeof reportLayer === "number" && reportLayer >= 2;
  const isSearchingParam = searchParams ? searchParams.get("searching") === "1" : false;
  const showReportUi = (pathname === "/cards" || (pathname === "/" && isSearchingParam)) && hasReportLayer;

  const hideFacecardAge = Boolean(user.hideFacecardAge);
  const isCityCard =
    user.type === 'LOCATION' || Boolean(user.isLocationCard) || hideFacecardAge;
  const age = user.age ?? calculateAge(user.dateOfBirth);
  const rawCity = user.city || user.preferredCity || '';
  const city = isCityCard
    ? ''
    : (!rawCity || rawCity === 'ANYWHERE_IN_INDIA' || rawCity === 'Anywhere')
      ? 'Anywhere'
      : rawCity.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const showLocationRow = !isCityCard && Boolean(city);

  const brandLogos = buildBrandLogos(user.brandPreferences, user.brands);

  const mp = user.musicPreference;
  const songTitle = mp?.name || mp?.songName || "Select Song";
  const artist = mp?.artist || mp?.artistName || "";
  const albumArt = mp?.albumArtUrl || "/spotify1.png";

  // Status-driven header badges/icons — use realtime values
  const statusToUse = realtimeStatus || user.status || user.userStatus || "";
  const rawStatus = String(statusToUse).toUpperCase();
  const inSquad = rawStatus.includes("IN_SQUAD") || rawStatus === "SQUAD";
  const isBroadcasting =
    Boolean(user.isBroadcasting || user.broadcastUrl) ||
    rawStatus.includes("IN_BROADCAST") ||
    rawStatus === "BROADCAST";

  const videoEnabledToUse = realtimeVideoEnabled !== null && realtimeVideoEnabled !== undefined ? realtimeVideoEnabled : user.videoEnabled;
  const videoOnToUse = realtimeVideoOn !== null && realtimeVideoOn !== undefined ? realtimeVideoOn : user.videoOn;
  // Show camera ON only when explicitly true. If undefined/unknown, show OFF.
  const isVideoOn = videoEnabledToUse === true && videoOnToUse !== false;

  // Combine all photos (max 3: display picture + up to 2 extras)
  const allPhotos = getFacecardPhotos(user);
  const {
    activeIndex,
    onTouchStart,
    onTouchEnd,
    onPhotoClick,
  } = useFacecardPhotoPager({
    photoCount: allPhotos.length,
    currentIndex,
    onIndexChange,
    internalIndex,
    setInternalIndex,
  });

  return (
    <>
      <div
        data-facecard-boundary="true"
        className="w-[min(380px,calc(100vw-2rem))] max-w-[calc(100vw-1rem)] h-[660px] md:h-[673px]
                 md:w-[320px] lg:w-[360px] md:max-w-none
           shrink-0 rounded-[26px] md:rounded-[30px] border-0
           overflow-hidden"
      >
        <div className={clsx("relative h-full w-full overflow-hidden rounded-[24px] md:rounded-[28px]", className)}>
          {/* Header inside the card so back/name/location clear the chrome frames */}
          {!hideHeader && (
            <div className="absolute left-0 top-3 z-20 flex w-full items-center justify-between px-4 md:top-4 md:px-5">
              <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
                {isCardsPage && (
                  <button
                    type="button"
                    onClick={handleBackHome}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/50 pointer-events-auto transition-transform active:scale-95 hover:bg-white/10 md:size-10"
                    aria-label="Back to homepage"
                  >
                    <span className="relative block size-5 overflow-hidden">
                      <img src="/icons/arrow-back.svg" alt="" className="absolute inset-0 size-full" />
                    </span>
                  </button>
                )}
                <div className="min-w-0">
                  <h1 className="font-sigmar text-xl font-bold text-[#F2AD00] md:font-extrabold">
                    {user?.kycStatus === "VERIFIED" && !isFacecardPage && (
                      <img src="/Verified.svg" alt="logo" className="absolute left-2 top-1" />
                    )}
                    {displayCardName(user)}
                    <KycVerifiedBadge user={user} />
                    {!hideFacecardAge && (
                      <>
                        {" "}
                        <span className="text-stroke-yellow text-2xl">
                          {age || "—"}
                        </span>
                      </>
                    )}
                  </h1>
                  {showLocationRow ? (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
                      <IoLocationOutline className="shrink-0 md:hidden" />
                      <span className="truncate font-outfit">{city}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {inSquad && (
                  <button
                    type="button"
                    className="rounded-full border border-yellow-300/90 px-2.5 py-1 text-[10px] font-medium text-yellow-300"
                  >
                    Squad
                  </button>
                )}
                {isBroadcasting && (
                  <span
                    className="flex h-6 w-6 items-center justify-center text-white"
                    title="Broadcasting"
                  >
                    <IoRadio className="h-5 w-5" />
                  </span>
                )}
                {!isCityCard && !isCardsOrFacecardPage && (
                  <span
                    className="flex h-6 w-6 items-center justify-center text-white"
                    title={isVideoOn ? "Video on" : "Video off"}
                  >
                    {isVideoOn ? (
                      <IoVideocam className="h-5 w-5" />
                    ) : (
                      <IoVideocamOff className="h-5 w-5" />
                    )}
                  </span>
                )}
                {showReportUi && <Report layer={reportLayer} />}
                {!isCityCard && !hideMenu && !isFacecardPage && (
                  <div className="relative">
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center text-white pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(prev => !prev);
                      }}
                    >
                      <IoEllipsisVerticalSharp />
                    </button>
                    {showDropdown && (
                      <div
                        className="absolute right-0 top-8 z-30 w-32 rounded-xl border border-white/20 bg-black/75 backdrop-blur-md py-1 shadow-2xl font-outfit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-xs font-semibold text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                          onClick={() => {
                            setShowDropdown(false);
                            setShowBlockModal(true);
                          }}
                        >
                          {isUnblockMenu ? "Unblock" : "Block User"}
                        </button>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-xs font-semibold text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                          onClick={() => {
                            setShowDropdown(false);
                            setShowReportModal(true);
                          }}
                        >
                          Report User
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inner chrome — clear header (+ location) on both mobile and desktop */}
          <div
            className={clsx(
              'absolute bottom-2 left-2 right-2 md:bottom-12 md:left-[5px] md:right-[5px] rounded-[22px] md:rounded-[26px] border border-white/30 overflow-hidden',
              showLocationRow ? 'top-[4.75rem] md:top-[5.25rem]' : 'top-[3.5rem] md:top-[4rem]',
            )}
          >
            {/* Intent — Figma ~108px tall on phone */}
            <div className="absolute left-0 right-0 top-2 z-20 px-2">
              <div className="font-outfit rounded-[22px] border border-white/30 h-[108px] md:h-[100px] flex items-center justify-center px-4 text-center text-[12px] leading-snug text-white backdrop-blur-[2px]">
                <span className="line-clamp-4 max-w-[246px]">
                  {user.intent || "Here to meet strangers and overthink later."}
                </span>
              </div>
            </div>


            <div className="absolute bottom-5 md:bottom-2 right-1.5 left-1.5 top-[7.85rem] md:top-[7.22rem] flex min-h-0 overflow-hidden">
              {/* LEFT SIDEBAR — sized to stay inside chrome on desktop */}
              <div className="w-[26%] h-full min-h-0 flex flex-col items-center justify-between gap-1 md:gap-1 z-20 overflow-hidden pb-0.5">
                {/* Brands capsule */}
                <div className="flex w-fit max-w-[90px] flex-col items-center rounded-full border border-white/30 md:px-1.5 px-[8px] py-2 md:py-1.5 shadow-inner shrink min-h-0">
                  <div className="flex flex-col items-center gap-1 md:gap-0.5">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const src = brandLogos[idx];
                      return (
                        <div
                          key={`brand-slot-${idx}`}
                          className={`flex h-[2.75rem] w-[2.75rem] md:h-[2.55rem] md:w-[2.55rem] shrink-0 items-center justify-center overflow-hidden rounded-full border ${src ? "border-black" : "border-white/30"} shadow-inner`}
                        >
                          {src && (
                            <img
                              src={src}
                              className="h-full w-full object-cover object-center "
                              style={{ transform: "scale(1.1)" }}
                              alt=""
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Zodiac — Figma 10945:43264: 75×63, icon 30, Outfit Regular 10px */}
                <div className="flex h-[63px] w-[75px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[18px] border border-white/30 p-2 shadow-inner overflow-hidden">
                  {user?.zodiac?.imageUrl ? (
                    <span className="relative block size-[30px] shrink-0 overflow-hidden">
                      <img
                        src={user.zodiac.imageUrl}
                        alt={user.zodiac.name || "Zodiac"}
                        className="absolute inset-0 size-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </span>
                  ) : (
                    <div className="flex size-[30px] shrink-0 items-center justify-center">
                      <span className="text-[18px] leading-none text-white/30">+</span>
                    </div>
                  )}
                  <span className="w-full truncate text-center font-outfit text-[10px] font-normal leading-normal text-white normal-case">
                    {(user?.zodiac?.name || '')
                      .toLowerCase()
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>

                {/* Music — keep fully inside the chrome frame (desktop was overflowing) */}
                <div className="relative flex h-[111px] w-[75px] md:h-[108px] md:w-[72px] shrink-0 flex-col items-center rounded-t-[60px] rounded-b-[18px] border border-white/30 px-1 pb-1.5 pt-1.5 shadow-inner backdrop-blur-sm overflow-hidden">
                  {user.musicPreference && (
                    <img
                      src="/musicline.svg"
                      alt=""
                      className="pointer-events-none absolute left-0.5 top-[42px] z-20 h-[18px] w-auto"
                    />
                  )}
                  <div className="h-[58px] w-[58px] md:h-[56px] md:w-[56px] shrink-0 overflow-hidden rounded-full border-2 border-white/35 shadow-md">
                    {user.musicPreference ? (
                      <img
                        src={albumArt}
                        className="h-full w-full object-cover animate-spin-slow"
                        alt=""
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center" />
                    )}
                  </div>
                  <div className="mt-1.5 h-px w-[85%] shrink-0 bg-white/30" />
                  <div className="mt-1 w-full min-h-0 flex-1 px-0.5 text-center text-white overflow-hidden flex flex-col justify-center">
                    <div className="marquee">
                      <p className="text-[9px] font-medium font-outfit leading-none tracking-wide whitespace-nowrap">
                        {user.musicPreference ? songTitle : '\u00a0'}
                      </p>
                    </div>
                    <div className="marquee mt-0.5">
                      <p className="text-[9px] font-extralight font-outfit leading-none text-white/90 whitespace-nowrap">
                        {user.musicPreference ? artist : '\u00a0'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT IMAGE */}
              <div
                className={`relative flex flex-1 min-w-0 border border-white/30 h-[99.5%] md:h-[99.8%] rounded-[18px] flex-col items-center overflow-hidden touch-pan-y ${allPhotos.length > 1 ? "cursor-pointer" : ""}`}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onClick={allPhotos.length > 1 ? onPhotoClick : undefined}
              >
                <img
                  src={allPhotos[activeIndex] || ''}
                  className="h-full w-full object-cover rounded-[18px] pointer-events-none select-none"
                  alt=""
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0';
                  }}
                />
                <FacecardPhotoDots count={allPhotos.length} activeIndex={activeIndex} />
              </div>
            </div>
          </div>

          <ReportUserModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            userId={user.userId || user.id || user._id}
            name={displayCardName(user)}
            onReportUser={handleReportUser}
            isAbsolute={false}
          />

          <BlockUserModal
            isOpen={showBlockModal}
            onClose={() => setShowBlockModal(false)}
            userId={user.userId || user.id || user._id}
            name={displayCardName(user)}
            onBlockUser={isUnblockMenu ? handleUnblockUser : handleBlockUser}
            mode={isUnblockMenu ? "unblock" : "block"}
            isAbsolute={false}
          />

          {toastMessage && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[110] bg-slate-900/85 backdrop-blur-md outline outline-2 outline-white/20 border border-white/5 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-outfit text-sm font-semibold">{toastMessage}</span>
            </div>
          )}
        </div>
      </div>


    </>
  );
};

export default FaceCard;









