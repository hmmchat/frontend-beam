"use client";

import React, { useState, useEffect } from "react";
import { subscribePresenceRealtime } from "@/lib/presence-realtime";
import { API, apiRequest } from "@/lib/api";
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
import { IoIosArrowBack } from "react-icons/io";
import { calculateAge, getFacecardPhotos } from "@/lib/facecard-utils";
import clsx from 'clsx';
import { IoIosArrowForward } from "react-icons/io";
import Report from "../facecard/Report";
import KycVerifiedBadge from "../facecard/KycVerifiedBadge";
import { usePathname, useSearchParams } from "next/navigation";
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

const FaceCard4 = ({
  user,
  hideArrows,
  currentIndex,
  onIndexChange,
  hideHeader,
  hideMenu = false,
  className,
  onBlockOrReportSuccess,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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
      if (res.success || res.message) {
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const normalizedPathname = pathname?.replace(/\/$/, "");
  const isFacecardPage = normalizedPathname === "/facecard";

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
        console.log("Realtime presence update in FaceCard4:", targetUserId, payload);
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
  const isCityCard = user.type === 'LOCATION' || Boolean(user.isLocationCard) || hideFacecardAge;
  const age = user.age ?? calculateAge(user.dateOfBirth);
  const rawCity = user.city || user.preferredCity || '';
  const city = isCityCard
    ? ''
    : (!rawCity || rawCity === 'ANYWHERE_IN_INDIA' || rawCity === 'Anywhere' || rawCity === 'Unknown')
      ? (rawCity === 'ANYWHERE_IN_INDIA' || rawCity === 'Anywhere' ? 'Anywhere' : '')
      : rawCity.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const brandLogos = buildBrandLogos(user.brandPreferences, user.brands);

  const mp = user.musicPreference;
  const songTitle = mp?.name || mp?.songName || "Select Song";
  const artist = mp?.artist || mp?.artistName || "";
  const albumArt = mp?.albumArtUrl || "/spotify1.png";

  // Status-driven header badges/icons
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

  // Combine all photos
  const allPhotos = getFacecardPhotos(user);

  const activeIndex = currentIndex !== undefined ? currentIndex : internalIndex;

  console.log("FaceCard Debug:", {
    username: user.username,
    photosCount: allPhotos.length,
    activeIndex,
    allPhotos,
  });

  const handlePrev = (e) => {
    e?.stopPropagation();
    const newIdx = activeIndex > 0 ? activeIndex - 1 : allPhotos.length - 1;
    console.log("FaceCard handlePrev:", {
      activeIndex,
      newIdx,
      allPhotosCount: allPhotos.length,
    });
    if (onIndexChange) onIndexChange(newIdx);
    else setInternalIndex(newIdx);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    const newIdx = activeIndex < allPhotos.length - 1 ? activeIndex + 1 : 0;
    console.log("FaceCard handleNext:", {
      activeIndex,
      newIdx,
      allPhotosCount: allPhotos.length,
    });
    if (onIndexChange) onIndexChange(newIdx);
    else setInternalIndex(newIdx);
  };

  return (
    <>
      {!hideHeader && (
        <div className={clsx('absolute', 'left-0', 'top-4', 'z-20', 'flex', 'w-full', 'items-center', 'justify-between', 'px-5', 'hidden', 'md:flex')}>
          <div>
            <h1 className={clsx('font-sigmar', 'text-xl', 'font-bold', 'text-[#F2AD00]')}>
              {user?.kycStatus === "VERIFIED" && !isFacecardPage && (
                <img src="/Verified.svg" alt="logo" className="absolute left-2 top-1" />
              )}
              {user.username || "User"}
              <KycVerifiedBadge user={user} />
              {!hideFacecardAge && (
                <>
                  {" "}
                  <span
                    className={clsx('text-stroke-yellow', 'text-2xl')}
                    style={{ WebkitTextStroke: "0.7px white" }}
                  >
                    {age || "—"}
                  </span>
                </>
              )}
            </h1>
            {!isCityCard && city ? (
              <div className={clsx('mt-0.5', 'flex', 'items-center', 'gap-1', 'text-xs', 'text-white/80')}>
                {/* <IoLocationOutline className="shrink-0" /> */}
                <span className={clsx('truncate', 'font-outfit')}>{city}</span>
              </div>
            ) : null}
          </div>

          <div className={clsx('flex', 'shrink-0', 'items-center', 'gap-1.5')}>
            {inSquad && (
              <button
                type="button"
                className={clsx('rounded-full', 'border', 'border-yellow-300/90', 'px-2.5', 'py-1', 'text-[10px]', 'font-medium', 'text-yellow-300')}
              >
                Squad
              </button>
            )}
            {isBroadcasting && (
              <span
                className={clsx('flex', 'h-6', 'w-6', 'items-center', 'justify-center', 'text-white')}
                title="Broadcasting"
              >
                <IoRadio className={clsx('h-5', 'w-5')} />
              </span>
            )}
            <span
              className={clsx('flex', 'h-6', 'w-6', 'items-center', 'justify-center', 'text-white')}
              title={isVideoOn ? "Video on" : "Video off"}
            >
              {isVideoOn ? (
                <IoVideocam className={clsx('h-5', 'w-5')} />
              ) : (
                <IoVideocamOff className={clsx('h-5', 'w-5')} />
              )}
            </span>
            {showReportUi && <Report layer={reportLayer} className="left-10" />}
            {!hideMenu && (
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
                      Block User
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

      <div
        className={clsx('w-[85vw]', 'aspect-[360/670]', 'max-w-[360px]', 'sm:w-[340px]', 'md:w-[320px]', 'lg:w-[360px]', 'md:aspect-[366/660]', 'shrink-0', 'rounded-[30px]', 'border', 'border-white/40', 'p-[2px]', 'overflow-hidden', 'md:border-0', 'md:p-0', 'mt-4', 'md:scale-90')}
      >
        <div className={clsx('relative', 'h-full', 'w-full', 'overflow-hidden', 'rounded-[28px]')}>
          {/* HEADER */}
          {!hideHeader && (
            <div className={clsx('absolute', 'left-0', 'top-4', 'z-20', 'flex', 'w-full', 'items-center', 'justify-between', 'px-5', 'md:hidden')}>
              <div>
                <h1 className={clsx('font-sigmar', 'text-xl', 'font-bold', 'text-[#F2AD00]')}>
                  {user?.kycStatus === "VERIFIED" && !isFacecardPage && (
                    <img src="/Verified.svg" alt="logo" className="absolute left-2 top-1" />
                  )}
                  {user.username || "User"}
                  <KycVerifiedBadge user={user} />
                  {!hideFacecardAge && (
                    <>
                      {" "}
                      <span
                        className={clsx('font-sm', 'text-transparent', 'px-2', 'py-0.5', 'rounded-full')}
                        style={{ WebkitTextStroke: "0.7px white" }}
                      >
                        {age || "—"}
                      </span>
                    </>
                  )}
                </h1>
                {!isCityCard && city ? (
                  <div className={clsx('mt-0.5', 'flex', 'items-center', 'gap-1', 'text-xs', 'text-white/80')}>
                    <IoLocationOutline className="shrink-0" />
                    <span className="truncate">{city}</span>
                  </div>
                ) : null}
              </div>

              <div className={clsx('flex', 'shrink-0', 'items-center', 'gap-1.5')}>
                {inSquad && (
                  <button
                    type="button"
                    className={clsx('rounded-full', 'border', 'border-yellow-300/90', 'px-2.5', 'py-1', 'text-[10px]', 'font-medium', 'text-yellow-300')}
                  >
                    Squad
                  </button>
                )}
                {isBroadcasting && (
                  <span
                    className={clsx('flex', 'h-6', 'w-6', 'items-center', 'justify-center', 'text-white')}
                    title="Broadcasting"
                  >
                    <IoRadio className={clsx('h-5', 'w-5')} />
                  </span>
                )}
                <span
                  className={clsx('flex', 'h-6', 'w-6', 'items-center', 'justify-center', 'text-white')}
                  title={isVideoOn ? "Video on" : "Video off"}
                >
                  {isVideoOn ? (
                    <IoVideocam className={clsx('h-5', 'w-5')} />
                  ) : (
                    <IoVideocamOff className={clsx('h-5', 'w-5')} />
                  )}
                </span>
                {showReportUi && <Report layer={reportLayer} />}
                {!hideMenu && (
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
                          Block User
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


          <div className={clsx('absolute', 'bottom-0', 'left-1', 'right-1', 'top-[3.3rem]', 'rounded-[34.46px]', 'border', 'border-white/45')}>
            {/* Intent */}
            <div className={clsx('absolute', 'left-0', 'right-0', 'top-2', 'z-20', 'px-2')}>
              <div className={clsx('rounded-[29.1px]', 'font-outfit', 'border', 'border-white/35', 'px-3', 'h-[90px]', 'md:h-[115px]', 'flex', 'items-center', 'justify-center', 'text-center', 'text-[10px]', 'leading-snug', 'text-white', 'backdrop-blur-[2px]')}>
                <p className="line-clamp-3">
                  {user.intent || "Here to meet strangers and overthink later."}
                </p>
              </div>
            </div>

            {/* MAIN BODY — flex row: left sidebar + right image */}
            <div className={clsx('absolute', 'bottom-2', 'left-0', 'right-2', 'top-[6.4rem]', 'md:top-[8.1rem]', 'flex', 'gap-1', 'md:gap-0')}>
              {/* LEFT SIDEBAR */}
              <div className={clsx('w-[26%]', 'flex', 'flex-col', 'items-center', 'gap-[6px]', 'z-20')}>
                {/* Brands capsule */}
                <div className={clsx('flex', 'w-fit', 'max-w-[90px]', 'flex-col', 'items-center', 'rounded-full', 'border', 'border-white/40', 'px-[10px]', 'py-2', 'shadow-inner')}>
                  <div className={clsx('flex', 'flex-col', 'items-center', 'gap-1')}>
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const src = brandLogos[idx];
                      return (
                        <div
                          key={`brand-slot-${idx}`}
                          className={`flex h-[2.8rem] w-[2.8rem] shrink-0 items-center justify-center overflow-hidden rounded-full border ${src ? "border-black" : "border-white/30"} shadow-inner`}
                        >
                          {src && (
                            <img
                              src={src}
                              className={clsx('h-full', 'w-full', 'object-cover', 'object-center')}

                              alt=""
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Zodiac */}
                <div className={clsx('flex', 'w-[75px]', 'shrink-0', 'flex-col', 'items-center', 'rounded-[15.2px]', 'border', 'border-white/45', 'px-2', 'py-2', 'shadow-inner')}>
                  {user?.zodiac?.imageUrl ? (
                    <img
                      src={user.zodiac.imageUrl}
                      alt={user.zodiac.name || "Zodiac"}
                      className={clsx('h-8', 'w-10', 'object-contain')}
                    />
                  ) : (
                    <div className={clsx('flex', 'h-10', 'w-10', 'items-center', 'justify-center')}>
                      <span className={clsx('text-[20px]', 'leading-none', 'text-white/30')}>
                        +
                      </span>
                    </div>
                  )}
                  <span className={clsx('mt-1', 'w-full', 'break-words', 'text-center', 'text-[7px]', 'font-semibold', 'uppercase', 'leading-tight', 'tracking-wide', 'text-white/75')}>
                    {user?.zodiac?.name}
                  </span>
                </div>

                {/* Music */}
                <div className={clsx('flex', 'h-[125px]', 'w-[80px]', 'shrink-0', 'flex-col', 'items-center', 'border', 'border-white/40', 'rounded-t-[79.52px]', 'rounded-b-[49.52px]', 'px-1', 'pb-1', 'pt-2', 'shadow-inner', 'backdrop-blur-sm')}>


                  <img src="/musicline.svg" alt="" className={clsx('left-0', 'bottom-14', 'z-50', 'absolute')} />
                  <div className={clsx('h-[72px]', 'w-[72px]', 'shrink-0', 'overflow-hidden', 'rounded-full', 'border-2', 'border-white/35', 'shadow-md')}>
                    {user.musicPreference ? (
                      <img
                        src={albumArt}
                        className={clsx('h-full', 'w-full', 'object-cover', 'animate-spin-slow')}
                        alt=""
                      />
                    ) : (
                      <div className={clsx('w-full', 'h-full', 'flex', 'items-center', 'justify-center')} />
                    )}
                  </div>


                  <div className={clsx('mt-2', 'h-px', 'w-[90%]', 'bg-white/30')} />
                  <div className={clsx('mt-1.5', 'w-full', 'px-0.5', 'text-center', 'text-white')}>

                    <div className="marquee">
                      <p className={clsx('text-[9px]', 'font-medium', 'font-outfit', 'leading-tight', 'tracking-wide', 'whitespace-nowrap')}>
                        {user.musicPreference ? songTitle : '\u00a0'}
                      </p>
                    </div>

                    <div className={clsx('marquee', 'mt-[1px]')}>
                      <p className={clsx('text-[9px]', 'marquee', 'font-extralight', 'font-outfit', 'leading-tight', 'text-white', 'whitespace-nowrap')}>
                        {user.musicPreference ? artist : '\u00a0'}
                      </p>
                    </div>
                  </div>
                </div>


              </div>

              {/* RIGHT IMAGE */}
              <div className={clsx('flex-1', 'h-full', 'overflow-hidden')}>
                <img
                  src={allPhotos[activeIndex]}
                  className={`h-full w-full object-cover rounded-[20px] ${allPhotos.length > 1 ? "cursor-pointer" : ""}`}
                  alt=""
                  onClick={allPhotos.length > 1 ? handleNext : undefined}
                />
              </div>


            </div>

            {/* Pagination */}
            {allPhotos.length > 1 && (
              <div className={clsx('absolute', '-bottom-2', 'left-0', 'right-0', 'z-20', 'flex', 'justify-center', 'gap-2')}>
                {allPhotos.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-300 ${idx === activeIndex ? "w-6 bg-white" : "w-2 bg-white/35"}`}
                  />
                ))}
              </div>
            )}



            <ReportUserModal
              isOpen={showReportModal}
              onClose={() => setShowReportModal(false)}
              userId={user.userId || user.id || user._id}
              name={user.username || 'User'}
              onReportUser={handleReportUser}
              isAbsolute={false}
            />

            <BlockUserModal
              isOpen={showBlockModal}
              onClose={() => setShowBlockModal(false)}
              userId={user.userId || user.id || user._id}
              name={user.username || 'User'}
              onBlockUser={handleBlockUser}
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
      </div>

      {!hideArrows && (
        <div className={clsx('flex', 'items-center', 'justify-center', 'gap-6', 'mt-4', 'hidden', 'md:flex')}>
          {/* Left Button */}
          <button
            onClick={handlePrev}
            className={clsx('w-12', 'h-12', 'rounded-full', 'border', 'border-white/40', 'flex', 'items-center', 'justify-center', 'text-white', 'text-3xl', 'hover:text-white', 'transition', 'active:scale-90')}
          >
            <IoIosArrowBack />
          </button>

          {/* Right Button */}
          <button
            onClick={handleNext}
            className={clsx('w-12', 'h-12', 'rounded-full', 'border', 'border-white/40', 'flex', 'items-center', 'justify-center', 'text-white', 'text-3xl', 'hover:border-white', 'transition', 'active:scale-90')}
          >
            <IoIosArrowForward />
          </button>
        </div>
      )}
    </>
  );
};

export default FaceCard4;


// "use client";

// import { useState } from "react";
// import FaceCard from "@/components/Home/FaceCard";
// import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
// import { getFacecardPhotos } from "@/lib/facecard-utils";

// export default function FacecardDisplay({ user, age, setView, router }) {
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const allPhotos = getFacecardPhotos(user);

//   const handlePrev = (e) => {
//     e?.stopPropagation();
//     setCurrentImageIndex((prev) =>
//       prev > 0 ? prev - 1 : allPhotos.length - 1,
//     );
//   };

//   const handleNext = (e) => {
//     e?.stopPropagation();
//     setCurrentImageIndex((prev) =>
//       prev < allPhotos.length - 1 ? prev + 1 : 0,
//     );
//   };

//   return (
//     <div
//       className={clsx('flex', 'min-h-screen', 'w-full', 'flex-col', 'text-white', 'outfit-font', 'overflow-hidden')}
//       style={{
//         backgroundImage: "url('/assets/mb.jpg')",
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         repeat: "repeat"
//       }}
//     >
//       <div
//         className={clsx('flex', 'w-full', 'flex-1', 'flex-col', 'gap-3', 'px-3', 'py-3', '//', 'sm:px-4', 'md:flex-row', 'md:gap-4', 'md:px-6', 'lg:gap-6', 'xl:gap-10')}
//       >


//         {/* LEFT — phone preview area */}
//         <div
//           className={clsx('flex', 'md:flex-1', 'flex-col', 'items-center', 'justify-center', 'md:justify-center', '//', 'md:min-h-0', '//', 'md:overflow-visible', '//', 'md:border', 'md:border-white/30', 'md:rounded-[60px]', '//', 'sm:px-4')}
//         >
//           <div
//             className={clsx('flex', 'w-full', 'flex-col', 'items-center', 'text-center', '//', 'md:flex-1', 'justify-center', '//', 'md:mt-0', '//', 'md:scale-100', 'justify-between')}
//           >
//             <div >
//               <p className={clsx('text-lg', 'font-semibold', 'sm:text-lg', 'md:text-sm', 'lg:text-base', 'md:hidden')}>
//                 This is Your FaceCard
//               </p>

//               <p className={clsx('text-[10px]', 'sm:text-[14px]', 'font-outfit', 'md:text-[11px]', 'font-thin', 'md:hidden')}>
//                 People will see this before meeting you <br />
//                 You can add more info to get better matches
//               </p>
//             </div>

//             {/* CARD */}
//             <div
//               className={clsx('w-full', 'mx-auto', 'flex', 'justify-center', '//', 'max-[321px]:scale-65', 'max-[321px]:-translate-y-30', '//', 'max-[340px]:scale-70', 'max-[340px]:-translate-y-28', '//', 'max-[370px]:scale-75', 'max-[370px]:-translate-y-20', '//', 'max-[390px]:scale-78', 'max-[390px]:-translate-y-18', '//', 'max-[403px]:scale-83', 'max-[403px]:-translate-y-[7vh]', '//', 'max-[405px]:scale-85', 'max-[405px]:-translate-y-[10vh]', '//', 'max-[416px]:scale-88', 'max-[416px]:-translate-y-8', '//', 'max-[440px]:scale-98', 'max-[440px]:-translate-y-2')}

//             >
//               <FaceCard
//                 user={{
//                   ...user,
//                   age,
//                   city: user?.preferredCity || user?.city,
//                 }}
//                 currentIndex={currentImageIndex}
//                 onIndexChange={setCurrentImageIndex}
//               />
//             </div>

//             {/* MOBILE BUTTONS */}

//             <div className={clsx('flex', 'absolute', 'w-full', 'px-6', 'justify-center', 'gap-4', 'mx-auto', 'md:hidden', 'bottom-[1vh]')}>


//               <button
//                 onClick={() => router.push("/")}
//                 className={clsx('rounded-full', 'w-full', 'px-6', 'py-4', 'text-[12px]', 'sm:text-sm', 'border', 'border-white/30', 'transition', 'hover:bg-yellow-400', 'hover:text-black', 'whitespace-nowrap')}
//               >
//                 Later 🥱
//               </button>

//               <button
//                 onClick={() => setView("editor")}
//                 className={clsx('rounded-full', 'px-6', 'py-4', 'w-full', 'text-[12px]', 'sm:text-sm', 'border', 'border-white/30', 'transition', 'hover:bg-yellow-400', 'hover:text-black', 'whitespace-nowrap')}
//               >
//                 Add Info More 😤
//               </button>


//             </div>



//           </div>
//         </div>

//         {/* RIGHT — desktop info panel */}
//         <div
//           className={clsx('hidden', 'md:flex', 'flex-1', 'flex-col', 'items-center', 'justify-center', 'text-center', '//', 'rounded-[60px]', 'border', 'border-white/30', '//', 'px-4', 'py-5', '//', 'lg:px-6', 'lg:py-6', 'xl:px-10')}
//         >
//           <h1 className={clsx('text-center', 'justify-center', 'text-white', 'text-[36px]', 'font-normal', 'font-Otomanopee_One')}>
//             Meet your Facecard
//           </h1>

//           <p className={clsx('mt-3', 'max-w-md', 'font-thin', 'text-xs', 'md:text-[20px]', 'lg:text-xl', 'text-white/90', 'font-outfit')}>
//             This is what people see before meeting you. Adding more details
//             makes it cooler and gets you better matches &amp; conversations.
//           </p>

//           <div className={clsx('w-full', 'max-w-[400px]', 'mt-20', 'space-y-3', 'md:space-y-7')}>
//             <button
//               onClick={() => setView("editor")}
//               className={clsx('w-full', 'rounded-[18px]', 'border-[2px]', 'border-white/50', 'border-b-[4px]', 'md:py-5', 'py-3', 'md:px-2', 'px-6', 'text-sm', 'md:text-[18px]', 'lg:text-[20px]', 'font-semibold', 'transition', 'hover:bg-yellow-400', 'hover:text-black')}
//             >
//               Make my Facecard cooler 😤
//             </button>

//             <button
//               onClick={() => router.push("/")}
//               className={clsx('text-xs', 'md:text-[18px]', 'text-white/90', 'hover:text-white')}
//             >
//               I’ll do it later 🥱
//             </button>
//           </div>
//         </div>
//       </div>
//     </div >
//   );
// }