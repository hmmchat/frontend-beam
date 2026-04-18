'use client';

import React, { useState } from 'react';
import {
  IoEllipsisVerticalSharp,
  IoLocationOutline,
  IoRadio,
  IoVideocam,
  IoVideocamOff
} from 'react-icons/io5';
import { IoIosArrowBack } from "react-icons/io";
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


<div className="w-[85vw] aspect-[360/670] max-w-[400px] 
                sm:w-[340px] md:w-[360px] lg:w-[480px] 
                md:aspect-[376/660] shrink-0 rounded-[30px] 
                p-[2px]
                 md:p-0">







                  
      <div className="relative h-full w-full overflow-hidden rounded-[28px]">
        {/* HEADER */}
        <div className="absolute left-0 top-4 z-20 flex w-full items-center justify-between px-5 ">
          <div>
            <h1 className="text-[18px] font-semibold text-[#FFB800]">
              {user.username || 'User'}{' '}
<span
  className="font-sm text-transparent  px-2 py-0.5 rounded-full"
  style={{ WebkitTextStroke: "0.7px white" }}
>
  {age || '—'}
</span>
            </h1>
           
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
          
          
           
            <button type="button" className="flex h-6 w-6 items-center justify-center text-white md:hidden" >
              <IoEllipsisVerticalSharp />
            </button>
          </div>
        </div>

        {/* Inner chrome */}
        <div className="absolute bottom-2 left-1 right-1 top-[4.25rem] rounded-[26px] border border-white/45">
          {/* Intent */}
          <div className="absolute left-0 right-0 top-2 z-20 px-2 ">
            <div className="rounded-[22px] border border-white/35 md:py-12 px-3 py-6 text-center text-[10px] leading-snug text-white backdrop-blur-[2px]">
              {user.intent || 'Here to meet strangers and overthink later.'}
            </div>
          </div>

          {/* MAIN BODY — flex row: left sidebar + right image */}
          <div className="absolute bottom-2 left-2 right-2 top-[5.25rem]  md:top-[8rem] flex ">

            {/* LEFT SIDEBAR */}
            <div className="w-[24%] flex flex-col items-center gap-1 z-20">
              {/* Brands capsule */}
              <div className="flex w-fit max-w-[90px] flex-col items-center rounded-full border border-white/40 px-2 py-2.5 shadow-inner">
                <div className="flex flex-col items-center gap-1">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/85 border border-white/20">
                    <span className="text-[20px] leading-none text-white/30">+</span>
                  </div>
                )}
                <span className="mt-1 w-full break-words text-center text-[7px] font-semibold uppercase leading-tight tracking-wide text-white/75">
                  {user?.zodiac?.name || 'Vacant'}
                </span>
              </div>

              {/* Music */}
              <div className="flex w-[80px] shrink-0 flex-col items-center rounded-t-[999px] rounded-b-[400px] border border-white/40 px-1 pb-2 pt-2 shadow-inner backdrop-blur-sm">
                <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-2 border-white/35 shadow-md">
                  {user.musicPreference ? (
                    <img src={albumArt} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" />
                  )}
                </div>
                <div className="mt-2 h-px w-[90%] bg-white/30" />
                <div className="mt-1.5 w-full px-0.5 text-center text-white">
                  <p className="line-clamp-2 text-[9px] font-medium leading-tight tracking-wide">
                    {user.musicPreference ? songTitle : 'Music Vacant'}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[7px] font-extralight leading-tight text-white/70">
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
   


   {(onClose || onDownload || onShare) && (
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
   )}
 </>

  );
};

export default FaceCard2;
