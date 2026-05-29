'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  IoEllipsisVerticalSharp,
  IoLocationOutline,
  IoRadio,
  IoVideocam,
  IoVideocamOff
} from 'react-icons/io5';
import { IoIosArrowBack, IoMdArrowRoundBack } from "react-icons/io";
import { calculateAge, getFacecardPhotos } from '@/lib/facecard-utils';

import { IoIosArrowForward } from "react-icons/io";
function brandLogoUrl(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
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
      if (typeof b === 'string' && b) {
        logos.push(b);
      } else if (b && typeof b === 'object') {
        const u = b.logoUrl || b.url || brandLogoUrl(b);
        if (u) logos.push(u);
      }
    }
  }
  return logos.slice(0, 5);
}

const FaceCard2 = ({ user, currentIndex, onIndexChange, onClose, onDownload, onShare }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isCardsPage = pathname?.includes('/cards');
  const [internalIndex, setInternalIndex] = useState(0);

  if (!user) return null;

  const age = user.age ?? calculateAge(user.dateOfBirth);
  const city = user.city || user.preferredCity || 'Unknown';

  const brandLogos = buildBrandLogos(user.brandPreferences, user.brands);

  const mp = user.musicPreference;
  const songTitle = mp?.name || mp?.songName || 'Select Song';
  const artist = mp?.artist || mp?.artistName || '';
  const albumArt = mp?.albumArtUrl || '/spotify1.png';

  // Status-driven header badges/icons
  const rawStatus = String(user.status || user.userStatus || '').toUpperCase();
  const inSquad = rawStatus.includes('IN_SQUAD') || rawStatus === 'SQUAD';
  const isBroadcasting =
    Boolean(user.isBroadcasting || user.broadcastUrl) ||
    rawStatus.includes('IN_BROADCAST') ||
    rawStatus === 'BROADCAST';
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
      {/* DESKTOP HEADER (Outside scaled card) */}
      <div className="absolute left-0 top-4 z-20 hidden w-full items-center justify-between md:flex md:px-5 md:pt-4">
        <div className="flex items-center gap-4">

          <div>
            <h1 className="inline-flex items-baseline gap-2 font-sigmar text-2xl font-extrabold text-[#F2AD00]">
              <span>{user.username || "User"}</span>
              <span
                className="inline-block text-2xl  text-stroke-yellow"

              >
                {age || "—"}
              </span>
            </h1>
            <div className=" flex items-center gap-1 text-xs text-white /80">
              <IoLocationOutline className="shrink-0" />
              <span className="font-outfit">{city}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center text-white"
          >
            <IoEllipsisVerticalSharp />
          </button>
        </div>
      </div >



      <div
        data-facecard-boundary="true"
        className="w-[90vw] aspect-[360/670] max-w-[400px] 
                sm:w-[340px] md:w-[360px] lg:w-[480px] 
                md:aspect-[376/660] shrink-0 rounded-[30px] 
                p-[2px]
                 md:p-0"
      >








        <div className="relative h-full w-full overflow-visible  mt-6   border border-white/60 md:border-none rounded-[28px]">
          {/* HEADER */}
          {/* MOBILE HEADER (Inside card) */}
          <div className="absolute left-0 top-4 z-20 flex w-full items-center justify-between px-4 md:hidden">
            <div className="flex items-center gap-2">
              {isCardsPage && (
                <button
                  onClick={() => router.back()}
                  className="mr-1 flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm border border-white/80 rounded-full p-1.5"
                >
                  <IoMdArrowRoundBack className="text-xl" />

                </button>
              )}
              <div className='flex flex-col'>
                <h1 className="inline-flex items-baseline gap-1 font-[family-name:var(--font-outfit),sans-serif] text-[18px] font-bold leading-none text-[#FFB800] ">
                  <span>{user.username || "User"}</span>
                  <span
                    className="inline-block text-[18px] font-bold leading-none text-[#FFB800]"
                    style={{
                      WebkitTextStroke: "0.8px #4f0b99",
                    }}
                  >
                    {age || "—"}
                  </span>
                </h1>

                <div className="mt-0.5 flex items-center gap-1 text-xs text-white/80">

                  <span className="truncate font-outfit">{city}</span>
                </div>
              </div>



            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center text-white"
              >
                <IoEllipsisVerticalSharp />
              </button>
            </div>
          </div>


          {/* Inner chrome */}
          <div className="absolute bottom-2 left-2 right-2 md:left-1 md:right-1 top-[4.25rem] rounded-[26px] border border-white/40">
            {/* Intent */}
            <div className="absolute left-0 right-0 top-2 z-20 px-2">
              <div className="relative rounded-[22px] border border-white/35 font-outfit h-[90px] md:h-[115px] flex items-center justify-center px-3 text-center text-[10px] md:text-[12px] leading-snug text-white backdrop-blur-[2px] overflow-visible">
                <span className="line-clamp-3">
                  {user.intent || 'Here to meet strangers and overthink later.'}
                </span>

                {/* Red Warning Effect (Concentric Glows) */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none scale-75 md:scale-100 ">
                  {/* Layer 3: Largest Glow */}
                  <div className="absolute w-14 h-14 rounded-full bg-red-500/60 blur-[2px]" />

                  {/* 🔴 OUTER LAYER (bahar se start) */}
                  <div className="absolute w-32 h-32 rounded-full bg-red-500/40 blur-[5px]" />


                  <div className="absolute w-64 h-64 rounded-full bg-red-500/20 " />

                  {/* The Warning Icon */}
                  <div className="relative w-5 h-5 bg-red-600 rounded-lg flex items-center justify-center   shadow-[0_0_15px_rgba(220,38,38,0.6)]">
                    <div className="w-4 h-4 border-[2px] border-white rounded-sm flex items-center justify-center">
                      <span className="text-white font-black text-xs">!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN BODY — flex row: left sidebar + right image */}
            <div className="absolute bottom-2 left-0 right-2 top-[7rem]  md:top-[8rem] flex ">

              {/* LEFT SIDEBAR */}
              <div className="md:w-[24%] w-[26%] flex flex-col items-center gap-1 z-20">
                {/* Brands capsule */}
                <div className="flex w-fit max-w-[90px] flex-col items-center rounded-full border border-white/40 px-2 py-2.5 shadow-inner">
                  <div className="flex flex-col items-center gap-[7.5px]">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const src = brandLogos[idx];
                      return (
                        <div
                          key={`brand-slot-${idx}`}
                          className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 shadow-inner"
                        >
                          {src && (
                            <img
                              src={src}
                              className="h-full w-full object-cover object-center"
                              style={{ transform: 'scale(1.1)' }}
                              alt=""
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Zodiac */}
                <div className="flex w-[75px] shrink-0 flex-col items-center rounded-[15.2px] border border-white/45 px-2 py-2 shadow-inner">
                  {user?.zodiac?.imageUrl ? (
                    <img
                      src={user.zodiac.imageUrl}
                      alt={user.zodiac.name || 'Zodiac'}
                      className="h-8 w-10 object-contain"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20">
                      <span className="text-[20px] leading-none text-white/30">+</span>
                    </div>
                  )}
                  <span className="mt-1 w-full break-words text-center text-[7px] font-semibold uppercase leading-tight tracking-wide text-white/75">
                    {user?.zodiac?.name}
                  </span>
                </div>

                {/* Music */}
                <div className="flex w-[80px] shrink-0 flex-col items-center rounded-t-[999px] rounded-b-[400px] border border-white/40 px-1 pb-2 pt-2 shadow-inner backdrop-blur-sm">
                  <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-2 border-white/35 shadow-md">
                    {user.musicPreference ? (
                      <img src={albumArt} className="h-full w-full object-cover animate-spin-slow" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" />
                    )}
                  </div>
                  <div className="mt-2 h-px w-[90%] bg-white/30" />
                  <div className="mt-1.5 w-full px-0.5 text-center text-white">
                    <p className="text-[9px] font-medium leading-tight tracking-wide truncate whitespace-nowrap overflow-hidden">
                      {user.musicPreference ? songTitle : '\u00a0'}
                    </p>
                    <p className="mt-0.5 text-[7px] font-extralight leading-tight text-white/70 truncate">
                      {user.musicPreference ? artist : '\u00a0'}
                    </p>
                  </div>
                </div>


              </div>

              {/* RIGHT IMAGE */}
              <div className="flex-1 h-full overflow-hidden rounded-[18px]">
                <img
                  src={allPhotos[activeIndex]}
                  className="h-full w-full object-cover"
                  alt=""
                />
              </div>

            </div>



          </div>
        </div>


      </div>



      {
        (onClose || onDownload || onShare) && (
          <div className="flex items-center justify-center gap-6 mt-4">
            {onClose && (
              <button
                type="button"
                className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:border-white transition active:scale-90"
                onClick={onClose}
                aria-label="Close preview"
              >
                ✕
              </button>
            )}

            {onDownload && (
              <button
                type="button"
                className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:border-white transition active:scale-90"
                onClick={onDownload}
                aria-label="Download facecard"
              >
                <img src="/download.svg" alt="Download" />
              </button>
            )}

            {onShare && (
              <button
                type="button"
                className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:border-white transition active:scale-90"
                onClick={onShare}
                aria-label="Share facecard"
              >
                <img src="/share-outline.svg" alt="Share" />
              </button>
            )}
          </div>
        )
      }
    </>

  );
};

export default FaceCard2;
