"use client";

import React, { useState } from "react";
import { displayUsername } from "@/lib/username";
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

const FacecardProfile = ({
  user,
  hideArrows,
  currentIndex,
  onIndexChange,
  hideHeader,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);

  if (!user) return null;

  const age = user.age ?? calculateAge(user.dateOfBirth);
  const rawCity = user.city || user.preferredCity || '';
  const city = (!rawCity || rawCity === 'Unknown')
    ? ''
    : (rawCity === 'ANYWHERE_IN_INDIA' || rawCity === 'Anywhere')
      ? 'Anywhere'
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
        <div className="absolute left-0 top-4 z-20 flex w-full items-center justify-between pl-5 px-3 md:hidden">
          <div>
            <h1 className="text-[22px]  leading-none font-sigmar text-xl font-extrabold text-[#F2AD00]">
              {displayUsername(user.username)}{" "}
              <span className=" text-stroke-yellow ">
                {age || "—"}
              </span>
            </h1>

          </div>

          <div className="flex shrink-0 items-center ">

            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center text-white"
            >
              <IoEllipsisVerticalSharp />
            </button>
          </div>
        </div>
      )}







      <div
        data-facecard-boundary="true"
        className="w-[396px] h-[652px] md:h-[673px]  max-w-[360px] 
                 md:w-[320px] lg:w-[360px] 
           shrink-0 rounded-[30px] 
            
               "
      >
        <div className="relative h-full w-full overflow-hidden rounded-[28px]">
          {/* HEADER */}


          {/* Inner chrome */}
          <div className={`absolute left-[5px] right-1 bottom-1 ${hideArrows ? "md:bottom-2" : "md:bottom-12"} md:top-[1.75rem] top-[3.5rem] rounded-[26px] border border-white/45`}>
            {/* Intent */}
            <div className="absolute left-0 right-0 top-[8px] z-20 px-2 ">
              <div className="md:rounded-[22px] font-outfit rounded-[20px] border border-white/35 h-[100px] md:h-[100px] flex items-center justify-center px-3 text-center text-[12px] leading-snug text-white backdrop-blur-[2px]">
                <span className="line-clamp-3">
                  {user.intent || "Here to meet strangers and overthink later."}
                </span>
              </div>
            </div>

            {/* MAIN BODY — flex row: left sidebar + right image */}
            <div className="absolute md:bottom-2 bottom-1.5  right-2 top-[7.1rem]  md:top-[7.22rem] flex gap-1 md:gap-0">
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
                          className={`flex h-[3rem] w-[3rem] shrink-0 items-center justify-center overflow-hidden rounded-full border ${src ? "border-black" : "border-white/30"} shadow-inner`}
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
                      />
                    </span>
                  ) : (
                    <div className="flex size-[30px] shrink-0 items-center justify-center">
                      <span className="text-[18px] leading-none text-white/30">
                        +
                      </span>
                    </div>
                  )}
                  <span className="w-full truncate text-center font-outfit text-[10px] font-normal leading-normal text-white normal-case">
                    {(user?.zodiac?.name || 'Vacant')
                      .toLowerCase()
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>

                {/* Music */}
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
              <div className="relative flex w-[260px] md:w-[268px] border border-white/40 h-[99.5%] md:h-[99.8%] rounded-[20px] flex flex-col items-center overflow-hidden">
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

      {!hideArrows && (
        <div className="flex items-center justify-center gap-6 mt-4 hidden md:flex">
          {/* Left Button */}
          <button
            onClick={handlePrev}
            className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:text-white transition active:scale-90"
          >
            <IoIosArrowBack />
          </button>

          {/* Right Button */}
          <button
            onClick={handleNext}
            className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:border-white transition active:scale-90"
          >
            <IoIosArrowForward />
          </button>
        </div>
      )}
    </>
  );
};

export default FacecardProfile;
