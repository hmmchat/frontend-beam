"use client";

import React, { useState } from "react";
import {
  IoEllipsisVerticalSharp,
  IoLocationOutline,
  IoRadio,
  IoVideocam,
  IoVideocamOff,
} from "react-icons/io5";
import { IoIosArrowBack } from "react-icons/io";
import { calculateAge, getFacecardPhotos } from "@/lib/facecard-utils";

import { IoIosArrowForward } from "react-icons/io";
import Report from "../facecard/Report";
import { usePathname, useSearchParams } from "next/navigation";
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
  className,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const age = user.age ?? calculateAge(user.dateOfBirth);
  const rawCity = user.city || user.preferredCity || "Unknown";
  const city = (!rawCity || rawCity === rawCity === 'Anywhere')
    ? 'Anywhere'
    : rawCity === 'Unknown'
      ? 'Unknown'
      : rawCity.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const brandLogos = buildBrandLogos(user.brandPreferences, user.brands);

  const mp = user.musicPreference;
  const songTitle = mp?.name || mp?.songName || "Select Song";
  const artist = mp?.artist || mp?.artistName || "";
  const albumArt = mp?.albumArtUrl || "/spotify1.png";

  // Status-driven header badges/icons
  const rawStatus = String(user.status || user.userStatus || "").toUpperCase();
  const inSquad = rawStatus.includes("IN_SQUAD") || rawStatus === "SQUAD";
  const isBroadcasting =
    Boolean(user.isBroadcasting || user.broadcastUrl) ||
    rawStatus.includes("IN_BROADCAST") ||
    rawStatus === "BROADCAST";
  // Default to ON unless explicitly false.
  const isVideoOn = user.videoEnabled !== false && user.videoOn !== false;

  // Combine all photos
  const allPhotos = getFacecardPhotos(user);

  const activeIndex = currentIndex !== undefined ? currentIndex : internalIndex;

  const handlePrev = (e) => {
    e?.stopPropagation();
    const newIdx = activeIndex > 0 ? activeIndex - 1 : allPhotos.length - 1;
    if (onIndexChange) onIndexChange(newIdx);
    else setInternalIndex(newIdx);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    const newIdx = activeIndex < allPhotos.length - 1 ? activeIndex + 1 : 0;
    if (onIndexChange) onIndexChange(newIdx);
    else setInternalIndex(newIdx);
  };

  return (
    <>

      <div className="absolute left-0 top-[3vh] z-20   flex w-full items-center justify-between px-5 hidden md:flex">
        <div>
          <h1 className="font-sigmar text-xl font-extrabold text-[#F2AD00]">
            {user.username || "User"}
            {!hideFacecardAge && (
              <>
                {" "}
                <span
                  className="text-stroke-yellow"

                >
                  {age || "—"}
                </span>
              </>
            )}
          </h1>
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





          {showReportUi && <Report layer={reportLayer} />}
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center text-white"
          >
            <IoEllipsisVerticalSharp />
          </button>
        </div>
      </div>





      <div
        data-facecard-boundary="true"
        className="w-[380px] h-[660px] md:h-[673px]   
                 md:w-[320px] lg:w-[360px] 
           shrink-0 rounded-[30px] 
            
               "
      >
        <div className={clsx("relative h-full w-full overflow-hidden rounded-[28px]", className)}>
          {/* HEADER — now both desktop + mobile headers are INSIDE the relative container so absolute positioning is consistent on EVERY screen size */}
          {!hideHeader && (
            <>
              {/* Desktop header (larger laptops) */}










              {/* Mobile header (phones + very small tablets) */}
              <div className="absolute left-0 top-4 z-20 flex w-full items-center justify-between px-5 md:hidden">
                <div>
                  <h1 className="font-sigmar text-xl font-bold text-[#F2AD00]">
                    {user.username || "User"}
                    {!hideFacecardAge && (
                      <>
                        {" "}
                        <span
                          className="text-stroke-yellow  text-2xl"

                        >
                          {age || "—"}
                        </span>
                      </>
                    )}
                  </h1>
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
                  {/* <span
                    className="flex h-6 w-6 items-center justify-center text-white"
                    title={isVideoOn ? "Video on" : "Video off"}
                  >
                    {isVideoOn ? (
                      <IoVideocam className="h-5 w-5" />
                    ) : (
                      <IoVideocamOff className="h-5 w-5" />
                    )}
                  </span> */}
                  {showReportUi && <Report layer={reportLayer} />}
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center text-white"
                  >
                    <IoEllipsisVerticalSharp />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Inner chrome */}
          <div className="absolute md:bottom-12  bottom-1 left-[5px] right-1 md:top-[1.75rem] top-[3.5rem] rounded-[26px] border border-white/45">
            {/* Intent */}
            <div className="absolute left-0 right-0 top-[8px] z-20 px-2 ">
              <div className="md:rounded-[22px] font-outfit rounded-[20px] border border-white/35 h-[100px] md:h-[100px] flex items-center justify-center px-3 text-center text-[12px] leading-snug text-white backdrop-blur-[2px]">
                <span className="line-clamp-3">
                  {user.intent || "Here to meet strangers and overthink later."}
                </span>
              </div>
            </div>


            <div className="absolute md:bottom-2 bottom-1.5  right-2 top-[7.1rem]  md:top-[7.22rem] flex  md:gap-0">
              {/* LEFT SIDEBAR */}
              <div className="w-[26%] flex flex-col items-center gap-2 z-20">
                {/* Brands capsule */}
                <div className="flex w-fit max-w-[90px] flex-col items-center rounded-full border border-white/40 md:px-2  px-[9px] py-2.5  shadow-inner">
                  <div className="flex flex-col items-center gap-1">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const src = brandLogos[idx];
                      return (
                        <div
                          key={`brand-slot-${idx}`}
                          className={`flex h-[3.1rem] w-[3.1rem] md:h-[3rem] md:w-[3rem] shrink-0 items-center justify-center overflow-hidden rounded-full border ${src ? "border-black" : "border-white/30"} shadow-inner`}
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

                {/* Zodiac */}
                <div className="flex w-[75px] md:w-[72px] shrink-0 flex-col items-center rounded-[15.2px] border border-white/45 px-2 py-2 shadow-inner">
                  {user?.zodiac?.imageUrl ? (
                    <img
                      src={user.zodiac.imageUrl}
                      alt={user.zodiac.name || "Zodiac"}
                      className="h-8 w-10 object-contain"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20">
                      <span className="text-[20px] leading-none text-white/30">
                        +
                      </span>
                    </div>
                  )}
                  <span className="mt-1 w-full break-words text-center text-[7px] font-semibold uppercase leading-tight tracking-wide text-white/75">
                    {user?.zodiac?.name}
                  </span>
                </div>

                {/* Music — FIXED: added "relative" so the musicline.svg stays inside the music capsule on ALL screen sizes */}
                <div className="relative flex w-[75px] md:w-[72px]  shrink-0 flex-col items-center rounded-t-[999px] md:rounded-b-[500px] rounded-b-[500px] border border-white/40 px-1  pb-1 pt-1 shadow-inner backdrop-blur-sm">
                  {user.musicPreference && (
                    <img src="/musicline.svg" alt="" className="left-0 bottom-12 z-50 absolute" />
                  )}
                  <div className="w-full aspect-square shrink-0 overflow-hidden rounded-full border-2 border-white/35 shadow-md">
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
                  <div className="md:mt-2 mt-1 h-px w-[90%] bg-white/30" />
                  <div className="mt-1.5 w-full px-0.5 text-center text-white overflow-hidden">
                    <div className="marquee">
                      <p className="text-[9px] font-medium font-outfit leading-tight tracking-wide whitespace-nowrap">
                        {user.musicPreference ? songTitle : '\u00a0'}
                      </p>
                    </div>

                    <div className="marquee  md:mt-[1px]">
                      <p className="text-[9px]  marquee font-extralight font-outfit leading-tight text-white whitespace-nowrap">
                        {user.musicPreference ? artist : '\u00a0'}
                      </p>
                    </div>
                  </div>
                </div>



              </div>

              {/* RIGHT IMAGE */}
              <div className="relative flex w-[286px] md:w-[268px] border border-white/40 h-[99.5%] md:h-[99.8%] rounded-[20px] flex flex-col items-center overflow-hidden">
                <img
                  src={allPhotos[activeIndex]}
                  className={`h-full w-full object-cover rounded-[20px] ${allPhotos.length > 1 ? "cursor-pointer" : ""}`}
                  alt=""
                  onClick={allPhotos.length > 1 ? handleNext : undefined}
                />

                {/* Pagination */}
                {allPhotos.length > 1 && (
                  <div
                    data-facecard-pagination="true"
                    className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2"
                  >
                    {allPhotos.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 rounded-full transition-all duration-300 ${idx === activeIndex ? "w-6 bg-white" : "w-2 bg-white/35"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>





          </div>
        </div>
      </div>


    </>
  );
};

export default FaceCard;









