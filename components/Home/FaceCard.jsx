'use client';

import React from 'react';
import { IoEllipsisVerticalSharp, IoLocationOutline } from 'react-icons/io5';
import { getZodiac, calculateAge } from '@/lib/facecard-utils';

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

const FaceCard = ({ user }) => {
  if (!user) return null;

  const age = user.age ?? calculateAge(user.dateOfBirth);
  const zodiac = getZodiac(user.dateOfBirth);
  const city = user.city || user.preferredCity || 'Unknown';

  const brandLogos = buildBrandLogos(user.brandPreferences, user.brands);

  const mp = user.musicPreference;
  const songTitle = mp?.name || mp?.songName || 'Select Song';
  const artist = mp?.artist || mp?.artistName || '';
  const albumArt = mp?.albumArtUrl || '/spotify1.png';

  return (
    <div className="h-[660px] w-[360px] shrink-0 rounded-[30px] border border-white/40 p-[2px]">
      <div className="relative h-full w-full overflow-hidden rounded-[28px]">
        {/* HEADER */}
        <div className="absolute left-0 top-4 z-20 flex w-full items-center justify-between px-5">
          <div>
            <h1 className="text-[18px] font-semibold text-[#FFB800]">
              {user.username || 'User'}{' '}
              <span className="font-medium text-white">{age || '—'}</span>
            </h1>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
              <IoLocationOutline className="shrink-0" />
              <span className="truncate">{city}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="rounded-full border border-yellow-300/90 px-2.5 py-1 text-[10px] font-medium text-yellow-300"
            >
              Squad
            </button>
            <img src="./broadcast.png" alt="" className="h-6 w-6" />
            <img src="./video-outline.png" alt="" className="h-6 w-6" />
            <button type="button" className="flex h-6 w-6 items-center justify-center text-white">
              <IoEllipsisVerticalSharp />
            </button>
          </div>
        </div>

        {/* Inner chrome */}
        <div className="absolute bottom-2 left-1 right-1 top-[4.25rem] rounded-[26px] border border-white/45">
          {/* Intent */}
          <div className="absolute left-0 right-0 top-1 z-20 px-2">
            <div className="rounded-[22px] border border-white/35 bg-black/20 px-3 py-6 text-center text-sm leading-snug text-white backdrop-blur-[2px]">
              {user.intent || 'Here to meet strangers and overthink later.'}
            </div>
          </div>

          {/* Main photo — right */}
          <div className="absolute bottom-10 right-1.5 top-[5.25rem] w-[71%] overflow-hidden rounded-[18px]">
            <img
              src={user.displayPictureUrl || '/assets/placeholder-user.jpg'}
              className="h-full w-full object-cover"
              alt=""
            />
          </div>

          {/*
            Left rail (template): (1) brands inside a pill border (2) wider zodiac block (3) music with larger album circle.
          */}
          <div className="absolute bottom-11 left-2 top-[5.25rem] z-20 flex w-[76px] flex-col items-center gap-3">
            {/* Brands — single capsule boundary around the stack */}
            {brandLogos.length > 0 && (
              <div className="flex w-fit max-w-[46px] flex-col items-center rounded-full border border-white/45 bg-black/30 px-2 py-2.5 shadow-inner">
                <div className="flex flex-col items-center gap-2">
                  {brandLogos.map((src, i) => (
                    <div
                      key={`${src}-${i}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-black/85 shadow-inner"
                    >
                      <img
                        src={src}
                        className="h-full w-full object-cover object-center"
                        style={{ transform: 'scale(1.1)' }}
                        alt=""
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zodiac — wider than brand capsule (~46px → ~58px) */}
            <div className="flex w-[58px] shrink-0 flex-col items-center rounded-2xl border border-white/45 bg-black/40 px-1.5 py-2 shadow-inner">
              {user?.zodiac?.imageUrl ? (
                <img
                  src={user.zodiac.imageUrl}
                  alt={user.zodiac.name || 'Zodiac'}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <span className="text-[28px] leading-none text-white">{zodiac.symbol}</span>
              )}
              <span className="mt-1 w-full break-words text-center text-[7px] font-semibold uppercase leading-tight tracking-wide text-white/75">
                {user?.zodiac?.name || zodiac.name}
              </span>
            </div>

            {/* Music — album circle clearly larger than brand circles (36px → 72px) */}
            <div className="flex w-[72px] shrink-0 flex-col items-center rounded-2xl border border-white/40 bg-black/35 px-1 pb-2 pt-2 shadow-inner backdrop-blur-sm">
              <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-2 border-white/35 shadow-md">
                <img src={albumArt} className="h-full w-full object-cover" alt="" />
              </div>
              <div className="mt-2 h-px w-[90%] bg-white/30" />
              <div className="mt-1.5 w-full px-0.5 text-center text-white">
                <p className="line-clamp-2 text-[9px] font-medium leading-tight tracking-wide">{songTitle}</p>
                <p className="mt-0.5 line-clamp-2 text-[7px] font-extralight leading-tight text-white/70">
                  {artist || '\u00a0'}
                </p>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="absolute bottom-1 left-0 right-0 z-20 flex justify-center gap-2">
            <div className="h-1 w-6 rounded-full bg-white" />
            <div className="h-1 w-2 rounded-full bg-white/35" />
            <div className="h-1 w-2 rounded-full bg-white/35" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceCard;
