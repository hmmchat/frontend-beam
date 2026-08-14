"use client";
import React, { useState, useEffect } from "react";
import { CiCirclePlus } from "react-icons/ci";
import { FaArrowLeft } from "react-icons/fa";
import clsx from 'clsx';
import ErrorAlert from "@/components/ui/ErrorAlert";
import CompletionMeter from "@/components/facecard/CompletionMeter";
export default function FacecardEditor({
  className,

  user,
  firstName,
  zodiac,
  setView,
  /** When set (e.g. opened from /profile), back/close uses this instead of setView("success"). */
  onExitEditor,
  handleSlotClick,
  setShowSelector,
  onPickZodiac,
  progress,
  fileInputRef,
  handleFileChange,
  onOpenFacecardPreview,
  photoUploading = false,
  photoError = "",
  onDeletePhoto,
}) {
  const leaveEditor = () => {
    if (onExitEditor) onExitEditor();
    else setView?.("success");
  };
  const [interestIndex, setInterestIndex] = useState(0);
  const [causeIndex, setCauseIndex] = useState(0);
  const interests =
    user?.interests?.map((i) => i.interest?.name || i.name).filter(Boolean) ||
    [];
  const causes =
    user?.values?.map((v) => v.value?.name || v.name).filter(Boolean) || [];

  useEffect(() => {
    if (interests.length <= 1) return;
    const interval = setInterval(() => {
      setInterestIndex((prev) => (prev + 1) % interests.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [interests.length]);

  useEffect(() => {
    if (causes.length <= 1) return;
    const interval = setInterval(() => {
      setCauseIndex((prev) => (prev + 1) % causes.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [causes.length]);

  return (
    <div
      className={clsx('relative', 'flex', 'w-full', 'min-h-screen', 'flex-col', 'items-center', 'justify-start', 'md:justify-center', 'overflow-visible', 'md:overflow-x-auto', 'p-0', 'text-white', 'outfit-font', 'md:p-2')}
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Single file input — must not live inside `hidden` layouts (iOS ignores those). */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="absolute w-px h-px opacity-0 overflow-hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
      {/* --- Mobile VIEW (Original Scaled Design) --- */}

      {/* Phone + tablet editor; desktop uses the lg:flex layout below */}
      <div className={clsx('py-4', 'flex', 'items-center', 'justify-center', 'lg:hidden', 'px-2', 'w-full', 'max-w-xl', 'mx-auto')}>
        <div className={clsx('flex', 'border', 'border-white/30', 'rounded-[2.5rem]', 'w-full', 'min-h-[90dvh]', 'flex-col', 'gap-5', 'px-2', 'relative', 'z-10')}>
          {/* TOP ROW: Close, Name Box, Progress */}
          <div className={clsx('grid', 'grid-cols-12', 'gap-2', 'items-center', 'px-2', 'mt-2', 'mt-4')}>
            {/* Close Button */}

            <div className="col-span-2">
              <button
                onClick={leaveEditor}
                className={clsx('w-9', 'h-9', 'rounded-full', 'border', 'border-white/50', 'flex', 'items-center', 'justify-center', 'text-md', 'hover:bg-white/10', 'transition-all', 'active:scale-95')}
              >
                ✕
              </button>
            </div>

            {/* Name Box with Brackets */}
            <div className={clsx('col-span-5', 'flex', 'justify-center')}>
              <div className={clsx('relative', 'px-6', 'py-1', 'min-w-[140px]', 'h-[42px]')}>
                <span className={clsx('absolute', 'top-0', 'left-0', 'w-3', 'h-3', 'border-t-1', 'border-l-1', 'border-white/50')}></span>
                <span className={clsx('absolute', 'top-0', 'right-0', 'w-3', 'h-3', 'border-t-1', 'border-r-1', 'border-white/50')}></span>
                <span className={clsx('absolute', 'bottom-0', 'left-0', 'w-3', 'h-3', 'border-b-1', 'border-l-1', 'border-white/50')}></span>
                <span className={clsx('absolute', 'bottom-0', 'right-0', 'w-3', 'h-3', 'border-b-1', 'border-r-1', 'border-white/50')}></span>
                <div className={clsx('flex', 'flex-col', 'justify-center', 'h-full')}>
                  <h2 className={clsx('text-[12px]', 'text-white')}>{firstName}</h2>

                  <p className={clsx('text-[10px]', 'font-outfit', 'text-white')}>
                    UserID:{user?.id?.slice(0, 8) || "4heu24sds"}
                  </p>
                </div>
              </div>
            </div>

            <div className={clsx('col-span-5', 'row-span-2', 'flex', 'justify-center', 'items-center', 'overflow-visible')}>
              <CompletionMeter percent={progress} size="mobile" />
            </div>

            <div className={clsx('col-span-5', 'mt-1')}>
              <div className={clsx('relative', 'px-6', 'py-1', 'min-w-[140px]', 'h-[42px]')}>
                <span className={clsx('absolute', 'top-0', 'left-0', 'w-3', 'h-3', 'border-t-1', 'border-l-1', 'border-white/50')}></span>
                <span className={clsx('absolute', 'top-0', 'right-0', 'w-3', 'h-3', 'border-t-1', 'border-r-1', 'border-white/50')}></span>
                <span className={clsx('absolute', 'bottom-0', 'left-0', 'w-3', 'h-3', 'border-b-1', 'border-l-1', 'border-white/50')}></span>
                <span className={clsx('absolute', 'bottom-0', 'right-0', 'w-3', 'h-3', 'border-b-1', 'border-r-1', 'border-white/50')}></span>

                <div className="">
                  <p className={clsx('text-[10px]', 'uppercase', 'font-outfit', 'text-white')}>
                    DOB :{" "}
                    {user?.dateOfBirth
                      ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
                      : "22/08/1998"}
                  </p>
                  <p className={clsx('text-[10px]', 'font-outfit', 'font-thin', 'text-white')}>
                    Zodiac : {zodiac?.name || "Gemini"}
                  </p>
                </div>
              </div>
            </div>

            <div className={clsx('col-span-2', 'flex', 'justify-center', 'mt-1')}>
              <button
                onClick={onPickZodiac || (() => setShowSelector("zodiacs"))}
                className={clsx('w-12', 'h-12', 'border', 'border-white/40', 'border-b-[3px]', 'rounded-[10.986px]', 'flex', 'items-center', 'justify-center', 'text-4xl', 'text-white', 'hover:bg-white/5', 'transition')}
              >
                {zodiac?.imageUrl ? (
                  <img
                    src={zodiac.imageUrl}
                    className={clsx('h-[20px]', 'w-[20px]', 'object-contain', 'brightness-0', 'invert')}
                  />
                ) : (
                  <span className={clsx('opacity-40', 'text-2xl')}>  <img src="/assets/plus.png" alt="" /></span>
                )}
              </button>
            </div>

            <div className="col-span-5 ">
              <div className={clsx('relative', 'px-6', 'py-1', 'min-w-[140px]', 'h-[42px]')}>
                <span className={clsx('absolute', 'top-0', 'left-0', 'w-3', 'h-3', 'border-t-1', 'border-l-1', 'border-white/50')}></span>
                <span className={clsx('absolute', 'top-0', 'right-0', 'w-3', 'h-3', 'border-t-1', 'border-r-1', 'border-white/50')}></span>
                <span className={clsx('absolute', 'bottom-0', 'left-0', 'w-3', 'h-3', 'border-b-1', 'border-l-1', 'border-white/50')}></span>
                <span className={clsx('absolute', 'bottom-0', 'right-0', 'w-3', 'h-3', 'border-b-1', 'border-r-1', 'border-white/50')}></span>

                <div className="">
                  <p className={clsx('text-[10px]', 'font-outfit', 'text-white')}>
                    Gender Identity
                  </p>
                  <p className={clsx('text-[10px]', 'font-outfit', 'text-white')}>{user?.gender}</p>
                </div>
              </div>
            </div>

            {/* Gender Icon + Facecard Button Column */}
            <div className={clsx('col-span-2', 'flex', 'flex-col', 'gap-4')}>
              <div className={clsx('flex', 'justify-center')}>
                <button className={clsx('w-12', 'h-12', 'border', 'border-white/40', 'border-b-[3px]', 'rounded-[10.986px]', 'flex', 'items-center', 'justify-center', 'text-xl', 'text-white')}>
                  {user?.gender === "MALE"
                    ? "♂"
                    : user?.gender === "FEMALE"
                      ? "♀"
                      : "⚧"}
                </button>
              </div>
            </div>

            <div className={clsx('col-span-5', 'px-2', 'flex', 'justify-center', 'items-center')}>
              <button
                onClick={() => onOpenFacecardPreview?.()}
                className={clsx('w-full', 'py-3.5', 'px-2', 'border', 'border-white/40', 'rounded-2xl', 'flex', 'items-center', 'justify-center', 'gap-2', 'hover:bg-white/10', 'active:scale-95', 'transition-all')}
              >
                <span className="text-xl">
                  <img src="/eye.svg" alt="" />
                </span>
                <span className={clsx('text-xs', 'font-bold', 'tracking-widest', 'text-white')}>
                  Facecard
                </span>
              </button>
            </div>

          </div>

          {/* MIDDLE SECTION: DOB/Zodiac Box + Zodiac Icon */}

          {/* BOTTOM SECTION: Gender Box, Gender Icon, Facecard Button */}

          {/* Action Rows: Interests, Causes, Brands */}
          <div className={clsx('flex', 'flex-col', 'gap-3', 'px-2')}>
            {/* Interests */}
            <div className={clsx('flex', 'items-center', 'justify-between', 'gap-3')}>
              {/* LEFT → Label */}
              <span className={clsx('text-[12px]', 'font-black', 'tracking-wide')}>
                Interests
              </span>

              {/* RIGHT → Box + Button */}
              <div className={clsx('flex', 'items-center', 'gap-3')}>
                <div
                  onClick={() => setShowSelector("interests")}
                  className={clsx('w-48', 'h-12', 'border', 'border-white/40', 'rounded-full', 'px-4', 'flex', 'items-center', 'justify-center', 'text-[11px]', '0', 'meeting', 'now', 'overflow-hidden')}
                >
                  {interests.length > 0 ? (
                    <div key={interestIndex} className={clsx('animate-slide-down', 'font-outfit')}>
                      {interests[interestIndex]}
                    </div>
                  ) : (
                    "Select"
                  )}
                </div>

                <button
                  onClick={() => setShowSelector("interests")}
                  className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'border', 'border-white/60', 'border-b-2', 'rounded-xl', 'text-2xl', 'bg-white/5', 'hover:bg-white/10', 'active:scale-90', 'transition')}
                >
                  <img src="/assets/plus.png" alt="" className={clsx('w-4', 'h-4')} />
                </button>
              </div>
            </div>

            <div className={clsx('flex', 'items-center', 'justify-between', 'gap-3')}>
              {/* LEFT → Label */}
              <span className={clsx('text-[12px]', 'font-black', 'tracking-wide')}>
                Causes
              </span>

              {/* RIGHT → Box + Button */}
              <div className={clsx('flex', 'items-center', 'gap-3')}>
                <div
                  onClick={() => setShowSelector("values")}
                  className={clsx('w-48', 'h-12', 'border', 'border-white/40', 'rounded-full', 'px-4', 'flex', 'items-center', 'justify-center', 'text-[11px]', '0', 'meeting', 'now', 'overflow-hidden')}
                >
                  {causes.length > 0 ? (
                    <div key={causeIndex} className={clsx('animate-slide-down', 'font-outfit')}>
                      {causes[causeIndex]}
                    </div>
                  ) : (
                    "Select"
                  )}
                </div>

                <button
                  onClick={() => setShowSelector("values")}
                  className={clsx('w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'border', 'border-white/60', 'rounded-xl', 'border-b-2', 'text-2xl', 'bg-white/5', 'hover:bg-white/10', 'active:scale-90', 'transition')}
                >
                  <img src="/assets/plus.png" alt="" className={clsx('w-4', 'h-4')} />
                </button>
              </div>
            </div>

            {/* Brands */}
            <div className={clsx('flex', 'items-center', 'justify-between', 'gap-3')}>
              {/* LEFT → Label */}
              <span className={clsx('text-[12px]', 'font-black', 'tracking-wide')}>
                Brands
              </span>

              {/* RIGHT → Icons */}
              <div className={clsx('flex', 'gap-2', 'overflow-x-auto', 'scrollbar-hide', 'py-1')}>
                {[0, 1, 2, 3, 4].map((i) => {
                  const selection = user?.brandPreferences?.[i];
                  return (
                    <div
                      key={i}
                      onClick={() => setShowSelector("brands")}
                      className={`w-11 h-11 shrink-0 border-2 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all ${selection ? "border-black" : "border-white/40"}`}
                    >
                      {selection ? (
                        <img
                          src={selection.brand?.logoUrl}
                          className={clsx('w-10', 'h-10', 'rounded-full', 'object-contain')}
                        />
                      ) : (
                        <img src="/assets/plus.png" alt="" className={clsx('w-4', 'h-4', 'opacity-60')} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Photo Slots Section */}
          <div className={clsx('relative', 'group', 'px-2')}>
            {photoUploading && (
              <div className={clsx('absolute', 'inset-0', 'z-30', 'flex', 'items-center', 'justify-center', 'rounded-xl', 'bg-black/60', 'backdrop-blur-sm')}>
                <div className={clsx('h-10', 'w-10', 'border-2', 'border-yellow-400', 'border-t-transparent', 'rounded-full', 'animate-spin')} />
              </div>
            )}

            <div className={clsx('grid', 'grid-cols-3', 'gap-4')}>
              {/* Photo 1 (DP) */}
              <div className="relative overflow-visible">
                <div
                  onClick={() => handleSlotClick(0)}
                  className={clsx('w-full', 'aspect-[2/3]', 'border-2', 'border-white/50', 'rounded-[1rem]', 'overflow-hidden')}
                >
                  <img
                    src={user?.displayPictureUrl}
                    className={clsx('w-full', 'h-full', 'object-cover')}
                    alt="Photo 1"
                  />
                </div>

                <button
                  type="button"
                  aria-label="Edit photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlotClick(0);
                  }}
                  className={clsx('absolute', '-top-3', '-right-3', 'z-20', 'flex', 'h-11', 'w-11', 'items-center', 'justify-center')}
                >
                  <span className={clsx('flex', 'h-8', 'w-8', 'items-center', 'justify-center', 'rounded-full', 'bg-white', 'text-black', 'text-sm', 'shadow-lg')}>
                    ✎
                  </span>
                </button>
              </div>

              {/* Other Slots */}
              {[0, 1].map((idx) => {
                const photo = user?.photos?.find((p) => p.order === idx);

                return (
                  <div
                    key={idx}
                    className={clsx('relative', 'overflow-visible')}
                  >
                    <div
                      onClick={() => handleSlotClick(idx + 1)}
                      className={clsx(
                        'w-full',
                        'aspect-[2/3]',
                        'border-2',
                        'border-white/40',
                        'rounded-[1rem]',
                        'flex',
                        'items-center',
                        'justify-center',
                        'overflow-hidden',

                      )}
                    >
                      {photo ? (
                        <img
                          src={photo.url}
                          className={clsx('w-full', 'h-full', 'object-cover')}
                        />
                      ) : (
                        <div className={clsx('w-8', 'h-8', 'border-2', 'border-white/60', 'rounded-full', 'flex', 'items-center', 'justify-center', 'text-3xl', 'opacity-80')}>
                          <img
                            src="/assets/plus.png"
                            alt=""
                            className={clsx('w-4', 'h-4', 'opacity-80')}
                          />
                        </div>
                      )}
                    </div>

                    {photo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const selectedPhoto = user.photos.find(
                            (p) => p.order === idx
                          );
                          if (onDeletePhoto && selectedPhoto) {
                            onDeletePhoto(selectedPhoto.id);
                          }
                        }}
                        className={clsx('absolute', '-top-2', '-right-2', 'z-[999]', 'text-[10px]', 'w-5', 'h-5', 'rounded-full', 'bg-white', 'text-black', 'flex', 'items-center', 'justify-center')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {photoError ? (
              <div className="px-1 sm:px-2 w-full max-w-md mx-auto">
                <ErrorAlert message={photoError} className="mt-3 mb-1" />
              </div>
            ) : null}
          </div>

          <div className={clsx('w-full', 'flex', 'items-center', 'justify-between', 'mb-4', 'px-3')}>
            {/* LEFT: Album + Info */}
            <div className={clsx('flex', 'items-center', 'gap-5')}>
              {/* Album */}
              <div
                onClick={() => setShowSelector("music")}
                className={clsx('relative', '0', 'meeting', 'now', 'active:scale-95', 'transition')}
              >
                <div
                  className={`w-30 h-30 rounded-full border border-white/20 flex items-center justify-center border rounded-full border-white/60 border-[2px] ${user?.musicPreference ? "" : "bg-white/5"}`}
                >
                  <div
                    className={`w-29 h-29 rounded-full  p-1 overflow-hidden flex items-center justify-center  ${user?.musicPreference ? "animate-spin-slow" : ""}`}
                  >
                    {user?.musicPreference?.albumArtUrl ? (
                      <img
                        src={user.musicPreference.albumArtUrl}
                        className={clsx('w-full', 'h-full', 'rounded-full', 'object-cover', 'border-[2px]', 'border-white/40')}
                        alt="Album Art"
                      />
                    ) : (
                      <img src="/assets/plus.png" alt="" className={clsx('w-4', 'h-4', 'opacity-60')} />
                    )}
                  </div>



                </div>
              </div>

              <div className={clsx('relative', 'px-6', 'min-w-[100px]', 'max-w-[120px]', 'py-1', 'flex', 'items-center', 'justify-center', 'overflow-hidden')}>
                <span className={clsx('absolute', 'top-0', 'left-0', 'w-3', 'h-3', 'border-t', 'border-l', 'border-white/50')}></span>
                <span className={clsx('absolute', 'top-0', 'right-0', 'w-3', 'h-3', 'border-t', 'border-r', 'border-white/50')}></span>
                <span className={clsx('absolute', 'bottom-0', 'left-0', 'w-3', 'h-3', 'border-b', 'border-l', 'border-white/50')}></span>
                <span className={clsx('absolute', 'bottom-0', 'right-0', 'w-3', 'h-3', 'border-b', 'border-r', 'border-white/50')}></span>
                {/* Text */}
                <div className={clsx('flex', 'flex-col', 'justify-end', 'items-start', 'w-full', 'overflow-hidden')}>
                  <div className={clsx('w-full', 'overflow-hidden', 'whitespace-nowrap', 'mask-grad')}>
                    <div className={clsx('inline-block', 'animate-marquee', 'whitespace-nowrap', 'text-white', 'text-[10px]', 'font-outfit', 'leading-tight')}>
                      <span className="">
                        {user?.musicPreference?.name || user?.musicPreference?.songName || "Select Song"}
                      </span>
                      <span className="">
                        {user?.musicPreference?.name || user?.musicPreference?.songName || "Select Song"}
                      </span>
                    </div>
                  </div>

                  <div className={clsx('w-full', 'overflow-hidden', 'whitespace-nowrap', 'mask-grad', '-mt-2')}>
                    <div className={clsx('inline-block', 'animate-marquee', 'whitespace-nowrap', 'text-white/60', 'font-outfit', 'text-[10px]')}>
                      <span className="">
                        {user?.musicPreference?.artist || user?.musicPreference?.artistName || "Spotify"}
                      </span>
                      <span className="">
                        {user?.musicPreference?.artist || user?.musicPreference?.artistName || "Spotify"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Dots */}
            <div className={clsx('grid', 'grid-cols-6', 'gap-1.5', 'opacity-50')}>
              {[...Array(48)].map((_, i) => (
                <div key={i} className={clsx('w-1', 'h-1', 'bg-white', 'rounded-full')}></div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* --- DESKTOP VIEW (Original Scaled Design) --- */}
      <section className={clsx('[@media(max-height:947px)]:scale-[0.99][@media(max-height:950px)]:scale-[1]', '[@media(max-height:850px)]:scale-[0.90]')}>
        <div className={clsx('transition-all', 'duration-300', 'max-w-[1200px]', 'w-full', 'px-6', 'mx-auto')}>



          <div className={clsx('relative', 'hidden', 'lg:flex', 'lg:flex-row', 'w-full', 'flex-col', 'gap-4', 'md:gap-6', 'rounded-[60px]', 'md:rounded-[60px]', 'border', 'border-white/60', 'p-4', 'md:p-4')}>
            {/* Main Editor UI */}

            <div className={clsx('flex-1', 'w-full', 'border', 'border-2', 'border-white/30', 'rounded-[54px]', 'p-8', 'px-11', 'relative', 'flex', 'flex-col', 'gap-10')}>
              {/* Top Header Row */}
              <div className={clsx('flex', 'items-start', 'gap-10')}>
                {/* Left: Back + Vertical Name */}
                <div className={clsx('relative', 'flex', 'flex-col', 'items-start', 'h-full', 'justify-between')}>
                  {/* Back Button */}
                  <button
                    onClick={leaveEditor}
                    className={clsx('w-[58px]', 'h-18', 'p-1', 'rounded-full', 'border', 'border-white/80', 'flex', 'items-center', 'justify-center', 'hover:bg-white/10', 'transition')}
                  >
                    <span className="text-xl "><FaArrowLeft /></span>
                  </button>

                  {/* Vertical Name Wrapper */}
                  <div className={clsx('relative', 'w-[70px]', 'h-full', 'flex', 'items-center', 'justify-center')}>
                    {/* Rotated content */}
                    <div className={clsx('absolute', 'rotate-[-90deg]', 'whitespace-nowrap', 'px-12', 'py-4', 'mt-2', 'relative')}>
                      {/* Corner brackets */}
                      <span className={clsx('absolute', 'top-0', 'left-0', 'w-4', 'h-4', 'border-t-2', 'border-l-2', 'border-white/50')}></span>
                      <span className={clsx('absolute', 'top-0', 'right-0', 'w-4', 'h-4', 'border-t-2', 'border-r-2', 'border-white/50')}></span>
                      <span className={clsx('absolute', 'bottom-0', 'left-0', 'w-4', 'h-4', 'border-b-2', 'border-l-2', 'border-white/50')}></span>
                      <span className={clsx('absolute', 'bottom-0', 'right-0', 'w-4', 'h-4', 'border-b-2', 'border-r-2', 'border-white/50')}></span>

                      <h2 className={clsx('text-2xl', 'tracking-wide', 'leading-none', 'text-start')}>
                        {firstName}
                      </h2>

                      <p className={clsx('text-[11px]', 'opacity-90', 'font-outfit', 'tracking-widest', 'uppercase', 'mt-1', 'text-center')}>
                        USERID: {user?.id?.slice(0, 8)}
                      </p>
                    </div>
                  </div>


                </div>

                {/* Right: Photo Slots */}
                <div className={clsx('relative', 'flex', 'gap-5', 'justify-center')}>
                  {photoUploading && (
                    <div className={clsx('absolute', 'inset-0', 'z-30', 'flex', 'flex-col', 'items-center', 'justify-center', 'rounded-[2.5rem]', 'bg-black/55', 'backdrop-blur-sm')}>
                      <div className={clsx('h-10', 'w-10', 'border-2', 'border-yellow-400', 'border-t-transparent', 'rounded-full', 'animate-spin', 'mb-3')} />
                      <p className={clsx('text-xs', 'font-semibold', 'uppercase', 'tracking-widest', 'text-white/90')}>
                        Uploading &amp; saving…
                      </p>
                    </div>
                  )}

                  {/* Slot 1 */}
                  <div
                    onClick={() => handleSlotClick(0)}
                    className={`w-[160px] sm:w-[180px] md:w-[198px] aspect-[2/3] border-2 border-white/80 rounded-[32px] overflow-visible relative border-b-[6px] ${photoUploading ? "pointer-events-none opacity-60" : ""
                      }`}
                  >
                    {user?.displayPictureUrl ? (
                      <img
                        src={user.displayPictureUrl}
                        alt="Photo 1"
                        className={clsx('w-full', 'h-full', 'object-cover', 'rounded-[30px]', 'rounded-b-[26px]')}
                      />
                    ) : (
                      <div className={clsx('w-full', 'h-full', 'flex', 'items-center', 'justify-center', 'bg-white/5', 'rounded-[30px]')}>
                        <span className={clsx('text-5xl', 'opacity-40', 'border-4', 'border-white/80', 'rounded-full', 'px-3')}>
                          <img src="/assets/plus.png" alt="" />
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      aria-label="Edit photo"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSlotClick(0);
                      }}
                      className={clsx('absolute', '-top-1', '-right-3', 'z-20', 'w-8', 'h-8', 'rounded-full', 'bg-white', 'text-black', 'flex', 'items-center', 'justify-center', 'text-sm', 'shadow-lg')}
                    >
                      ✎
                    </button>
                  </div>

                  {/* Slot 2 (Photo Order 0) */}
                  <div
                    onClick={() => handleSlotClick(1)}
                    className={`w-[160px] sm:w-[180px] md:w-[198px] aspect-[2/3] border-2 border-white/80 rounded-[32px] border-b-[6px] flex items-center justify-center relative overflow-visible bg-white/5 transition-colors ${photoUploading
                      ? "pointer-events-none opacity-60"
                      : "hover:bg-white/10"
                      }`}
                  >
                    {user?.photos?.find((p) => p.order === 0)?.url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const photo = user.photos.find((p) => p.order === 0);
                          if (onDeletePhoto && photo) onDeletePhoto(photo.id);
                        }}
                        className={clsx('absolute', '-top-1', '-right-3', 'z-20', 'w-8', 'h-8', 'rounded-full', 'bg-white', 'text-black', 'flex', 'items-center', 'justify-center', 'text-sm', 'shadow-lg', 'hover:bg-gray-50', 'active:scale-90', 'transition-all')}
                      >
                        ✕
                      </button>
                    )}

                    {user?.photos?.find((p) => p.order === 0)?.url ? (
                      <img
                        src={user.photos.find((p) => p.order === 0).url}
                        alt="Photo 2"
                        className={clsx('w-full', 'h-full', 'object-cover', 'rounded-[30px]', 'rounded-b-[26px]')}
                      />
                    ) : (

                      <CiCirclePlus className={clsx('text-[60px]', 'opacity-60', 'rounded-full')} />

                    )}
                  </div>

                  {/* Slot 3 (Photo Order 1) */}
                  <div
                    onClick={() => handleSlotClick(2)}
                    className={`w-[160px] sm:w-[180px] md:w-[198px] aspect-[2/3] border-2 border-white/80 rounded-[32px] border-b-[6px] flex items-center justify-center relative overflow-visible bg-white/5 transition-colors ${photoUploading
                      ? "pointer-events-none opacity-60"
                      : "0  meeting now hover:bg-white/10"
                      }`}
                  >
                    {user?.photos?.find((p) => p.order === 1)?.url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const photo = user.photos.find((p) => p.order === 1);
                          if (onDeletePhoto && photo) onDeletePhoto(photo.id);
                        }}
                        className={clsx('absolute', '-top-1', '-right-3', 'z-20', 'w-8', 'h-8', 'rounded-full', 'bg-white', 'text-black', 'flex', 'items-center', 'justify-center', 'text-sm', 'shadow-lg', 'hover:bg-gray-50', 'active:scale-90', 'transition-all')}
                      >
                        ✕
                      </button>
                    )}
                    {user?.photos?.find((p) => p.order === 1)?.url ? (
                      <img
                        src={user.photos.find((p) => p.order === 1).url}
                        className={clsx('w-full', 'h-full', 'object-cover', 'rounded-[30px]', 'rounded-b-[26px]')}
                        alt="Photo 3"
                      />
                    ) : (
                      <CiCirclePlus className={clsx('text-[60px]', 'opacity-60', 'rounded-full')} />
                    )}
                  </div>

                </div>

              </div>

              {photoError ? (
                <div className="w-full max-w-lg mx-auto px-2 -mt-4">
                  <ErrorAlert message={photoError} className="mt-0 mb-1" />
                </div>
              ) : null}

              {/* Info Sections Area */}
              <div className={clsx('grid', 'grid-cols-10', 'mt-5', 'gap-2', 'items-center')}>
                {/* DOB & Gender Text Labels */}
                <div className={clsx('col-span-3', 'w-[90%]', 'flex', 'flex-col', 'gap-12')}>
                  {/* DOB + Zodiac */}
                  <div className={clsx('relative', 'px-1', 'py-3', 'flex', 'justify-center')}>
                    <div className={clsx('flex', 'flex-col', 'items-start', 'text-left')}>
                      <span className={clsx('absolute', 'top-0', 'left-0', 'w-4', 'h-4', 'border-t-[2px]', 'border-l-[2px]', 'border-white/40')}></span>
                      <span className={clsx('absolute', 'top-0', 'right-0', 'w-4', 'h-4', 'border-t-[2px]', 'border-r-[2px]', 'border-white/40')}></span>
                      <span className={clsx('absolute', 'bottom-0', 'left-0', 'w-4', 'h-4', 'border-b-[2px]', 'border-l-[2px]', 'border-white/40')}></span>
                      <span className={clsx('absolute', 'bottom-0', 'right-0', 'w-4', 'h-4', 'border-b-[2px]', 'border-r-[2px]', 'border-white/40')}></span>

                      <p className={clsx('text-[12px]', 'uppercase', 'opacity-80', 'font-outfit')}>
                        DOB :{" "}
                        {user?.dateOfBirth
                          ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
                          : ""}
                      </p>

                      <p className={clsx('text-[12px]', 'mt-1', 'font-outfit')}>
                        Zodiac : {zodiac?.name || "Vacant"}
                      </p>
                    </div>
                  </div>

                  {/* Gender */}
                  <div className={clsx('relative', 'px-1', 'py-3', 'flex', 'justify-center')}>
                    <div className={clsx('flex', 'flex-col', 'items-start', 'text-left')}>
                      <span className={clsx('absolute', 'top-0', 'left-0', 'w-4', 'h-4', 'border-t-2', 'border-l-2', 'border-white/40')}></span>
                      <span className={clsx('absolute', 'top-0', 'right-0', 'w-4', 'h-4', 'border-t-2', 'border-r-2', 'border-white/40')}></span>
                      <span className={clsx('absolute', 'bottom-0', 'left-0', 'w-4', 'h-4', 'border-b-2', 'border-l-2', 'border-white/40')}></span>
                      <span className={clsx('absolute', 'bottom-0', 'right-0', 'w-4', 'h-4', 'border-b-2', 'border-r-2', 'border-white/40')}></span>

                      <p className={clsx('text-[12px]', 'font-outfit')}>Gender Identity</p>
                      <p className={clsx('text-[12px]', 'font-outfit', 'mt-1')}>
                        {user?.gender || "Female"}
                      </p>
                    </div>
                  </div>

                  {/* Brands */}
                  <div className={clsx('relative', 'px-1', 'py-3', 'mt-5', 'flex', 'justify-center')}>
                    <div className={clsx('flex', 'flex-col', 'items-start', 'text-left')}>
                      <span className={clsx('absolute', 'top-0', 'left-0', 'w-4', 'h-4', 'border-t-2', 'border-l-2', 'border-white/40')}></span>
                      <span className={clsx('absolute', 'top-0', 'right-0', 'w-4', 'h-4', 'border-t-2', 'border-r-2', 'border-white/40')}></span>
                      <span className={clsx('absolute', 'bottom-0', 'left-0', 'w-4', 'h-4', 'border-b-2', 'border-l-2', 'border-white/40')}></span>
                      <span className={clsx('absolute', 'bottom-0', 'right-0', 'w-4', 'h-4', 'border-b-2', 'border-r-2', 'border-white/40')}></span>

                      <p className="text-[12px]   ">Brands</p>
                      <p className={clsx('text-[12px]', 'font-outfit')}>
                        Can&apos;t live w/o &#39;em
                      </p>
                    </div>
                  </div>
                </div>



                {/* Icon Pills & Brand Grid */}
                <div className={clsx('col-span-7', 'space-y-7')}>
                  <div className={clsx('flex', 'items-center', 'gap-4')}>

                    <button
                      type="button"
                      onClick={() => {
                        if (typeof onPickZodiac === "function") onPickZodiac();
                        else setShowSelector("zodiacs");
                      }}
                      className={clsx('w-[84px]', 'h-[84px]', 'rounded-[20px]', 'border', 'border-[1.5px]', 'border-b-[4px]', 'border-white/60', 'flex', 'items-center', 'justify-center', 'shadow-inner', 'overflow-hidden', 'hover:bg-white/5', 'transition')}
                      aria-label="Change zodiac"
                    >
                      {user?.zodiac?.imageUrl ? (
                        <img
                          src={user.zodiac.imageUrl}
                          alt={user.zodiac.name || "Zodiac"}
                          className={clsx('h-[75%]', 'w-[75%]', 'object-contain', 'p-2', 'font-outfit', 'text-sm')}
                        />
                      ) : (
                        zodiac?.symbol || (
                          <span className={clsx('opacity-40', 'text-3xl')}>  <img src="/assets/plus.png" alt="" /></span>
                        )
                      )}
                    </button>

                    <div
                      onClick={() => setShowSelector("interests")}
                      className={clsx('ml-4', 'flex-1', 'min-w-0', 'h-18', 'rounded-full', 'border', 'border-white/60', 'px-5', 'flex', 'items-center', 'justify-between', 'hover:bg-white/5', 'transition', 'overflow-hidden')}
                    >
                      <span className={clsx('text-sm', 'font-thin', 'tracking-wide', 'font-outfit')}>Interests:</span>
                      <div className={clsx('flex-1', 'flex', 'justify-end', 'overflow-hidden')}>
                        {interests.length > 0 ? (
                          <span
                            key={interestIndex}
                            className={clsx('text-sm', 'font-outfit', 'opacity-90', 'truncate', 'max-w-[150px]', 'animate-slide-down')}
                          >
                            {interests[interestIndex]}
                          </span>
                        ) : (
                          <span className={clsx('text-sm', 'opacity-90')}></span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowSelector("interests")}
                      className={clsx('w-18', 'h-18', 'rounded-2xl', 'border', 'border-white/70', 'border', 'border-b-[3px]', 'flex', 'items-center', 'justify-center', 'text-3xl', 'font-outfit', 'font-thin', 'transition', 'text-white/70', 'hover:bg-white/10')}
                    >
                      +
                    </button>
                  </div>












                  <div className={clsx('flex', 'items-center', 'font-outfit', 'gap-4')}>
                    <div className={clsx('w-[84px]', 'h-[84px]', 'rounded-[20px]', 'border-2', 'border-white/60', 'flex', 'items-center', 'justify-center', 'text-3xl', 'shadow-inner')}>
                      {user?.gender === "MALE"
                        ? "♂"
                        : user?.gender === "FEMALE"
                          ? "♀"
                          : ""}
                    </div>

                    <div
                      onClick={() => setShowSelector("values")}
                      className={clsx('ml-4', 'flex-1', 'min-w-0', 'h-18', 'rounded-full', 'border', 'border-white/60', 'px-5', 'flex', 'items-center', 'justify-between', 'hover:bg-white/5', 'transition', 'overflow-hidden')}
                    >
                      <span className={clsx('text-sm', 'tracking-wide')}>Causes:</span>
                      <div className={clsx('flex-1', 'flex', 'justify-end', 'overflow-hidden')}>
                        {causes.length > 0 ? (
                          <span
                            key={causeIndex}
                            className={clsx('text-sm', 'opacity-90', 'font-outfit', 'truncate', 'max-w-[150px]', 'animate-slide-down')}
                          >
                            {causes[causeIndex]}
                          </span>
                        ) : (
                          <span className={clsx('text-sm', 'opacity-90', 'italic')}></span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowSelector("values")}
                      className={clsx('w-18', 'mt-1', 'h-18', 'rounded-2xl', 'border', 'border-b-[3px]', 'border-white/70', 'flex', 'items-center', 'justify-center', 'text-3xl', 'font-thin', 'transition', 'text-white/70', 'hover:bg-white/10')}
                    >
                      +
                    </button>
                  </div>

                  {/* Brand Icons Row */}
                  <div className={clsx('flex', 'gap-8', 'mt-12', 'scrollbar-hide')}>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const selection = user?.brandPreferences?.[i];
                      return (
                        <div
                          key={i}
                          onClick={() => setShowSelector("brands")}
                          className={`relative w-20 h-20 rounded-full border border-2 flex items-center justify-center shadow-inner transition-all hover:scale-105 ${selection ? "border-black bg-white/10" : "border-white/50 bg-transparent"}`}
                        >
                          {selection &&
                            (selection.brand?.logoUrl ? (
                              <img
                                src={selection.brand.logoUrl}
                                alt={selection.brand.name}
                                className={clsx('w-[100%]', 'h-[100%]', 'rounded-full', 'object-contain')}
                              />
                            ) : (
                              <span className={clsx('text-white', 'font-bold', 'text-xl')}>
                                {selection.brand?.name?.slice(0, 2)}
                              </span>
                            ))}
                        </div>
                      );
                    })}
                  </div>



                </div>



              </div>
            </div>

            {/* Right Side Info Col */}
            <div className={clsx('w-full', 'lg:w-[260px]', 'xl:w-[300px]', 'flex', 'flex-col', 'gap-10', 'py-6', 'pr-4')}>
              {/* Progress Area */}
              <div className={clsx('flex', 'flex-col', 'items-center', 'gap-6', 'overflow-visible')}>
                <CompletionMeter percent={progress} size="desktop" />

                <button
                  type="button"
                  onClick={() => onOpenFacecardPreview?.()}
                  className={clsx('w-[80%]', 'py-6', 'border-2', 'border-b-4', 'border-white/40', 'rounded-[18px]', 'flex', 'items-center', 'justify-center', 'gap-3', 'hover:bg-white/5', 'transition', 'font-bold', 'tracking-widest', 'uppercase', 'text-xs')}
                >
                  <span className="text-xl">
                    <img src="/eye.svg" alt="" />
                  </span>

                  <span className={clsx('text-xs', 'font-bold', 'tracking-widest', 'text-white')}>
                    Facecard
                  </span>
                </button>
              </div>

              {/* Music Section */}
              <div
                onClick={() => setShowSelector("music")}
                className={clsx('flex-1', 'flex', 'flex-col', 'items-center', 'gap-6', 'relative', '0', 'meeting', 'now', 'group')}
              >
                {user?.musicPreference ? (
                  /* when music is selected */
                  <div className={clsx('absolute', '-right-8', 'z-10')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="90" viewBox="0 0 130 88" fill="none">
                      <path d="M127.589 1.93553L52.3248 1.93551L11.4682 73.876" stroke="white" strokeOpacity="0.5" strokeWidth="3.87091" strokeLinecap="round" />
                      <circle cx="7.06439" cy="7.06439" r="7.06439" transform="matrix(-1.03187e-07 1 1 1.03187e-07 3.74761e-06 71.542)" fill="white" fillOpacity="0.5" />
                    </svg>
                  </div>
                ) : (
                  /* when music is not selected */
                  <div className={clsx('absolute', '-right-16', 'z-10')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="124" height="130" viewBox="0 0 154 140" fill="none">
                      <path d="M111.059 1.93613L45.5457 38.9875L45.3976 121.72" stroke="white" strokeOpacity="0.5" strokeWidth="3.87091" strokeLinecap="round" />
                      <circle cx="8.06439" cy="8.06439" r="8.06439" transform="matrix(0.492282 0.870436 0.870436 -0.492282 34.2666 125.335)" fill="white" fillOpacity="0.5" />
                    </svg>
                  </div>
                )}



                <div className={clsx('relative', 'w-32', 'sm:w-36', 'md:w-44', 'aspect-square', 'flex', 'items-center', 'justify-center')}>
                  <div className={clsx('absolute', 'inset-0', 'rounded-full', 'border-[2px]', 'border-white/80')} />
                  <div className={clsx('absolute', 'inset-[2.2px]', 'rounded-full', 'border-[2px]', 'border-white/50')} />

                  <div className={clsx('absolute', 'inset-3', 'rounded-full', 'overflow-hidden', 'border-2', 'border-white/30', 'animate-spin-slow', 'flex', 'items-center', 'justify-center')}>
                    {user?.musicPreference?.albumArtUrl ? (
                      <img
                        src={user.musicPreference.albumArtUrl}
                        className={clsx('w-full', 'h-full', 'object-cover', 'rounded-full')}
                        alt="Album Art"
                      />
                    ) : (
                      <span className={clsx('text-6xl', 'opacity-80', 'text-white')}><img src="/assets/plus.png" alt="" /></span>
                    )}
                  </div>


                </div>


                <div className={clsx('relative', 'w-full', 'py-3', 'flex', 'justify-center')}>
                  <div className={clsx('relative', 'w-48', 'px-1', 'py-3', 'text-center', 'text-white')}>

                    <span className={clsx('absolute', 'top-0', 'left-0', 'w-4', 'h-4', 'border-t', 'border-l', 'border-white/60')} />
                    <span className={clsx('absolute', 'top-0', 'right-0', 'w-4', 'h-4', 'border-t', 'border-r', 'border-white/60')} />
                    <span className={clsx('absolute', 'bottom-0', 'left-0', 'w-4', 'h-4', 'border-b', 'border-l', 'border-white/60')} />
                    <span className={clsx('absolute', 'bottom-0', 'right-0', 'w-4', 'h-4', 'border-b', 'border-r', 'border-white/60')} />

                    {/* Song */}
                    {/* Song */}
                    <div className={clsx('w-[60%]', 'mx-auto', 'overflow-hidden', 'whitespace-nowrap', 'mask-grad')}>
                      <div className={clsx('animate-marquee-reverse', 'whitespace-nowrap', 'text-[12px]', 'font-outfit', 'text-white')}>
                        <span className="px-4">
                          {user?.musicPreference?.name || user?.musicPreference?.songName || "Select Song"}
                        </span>

                        <span className="px-4">
                          {user?.musicPreference?.name || user?.musicPreference?.songName || "Select Song"}
                        </span>
                      </div>
                    </div>

                    {/* Artist */}
                    <div className={clsx('w-[60%]', 'mx-auto', 'overflow-hidden', 'whitespace-nowrap', '-mt-1', 'mask-grad')}>
                      <div className={clsx('animate-marquee-reverse', 'whitespace-nowrap', 'text-[12px]', 'font-outfit', 'text-white/60')}>
                        <span className="px-4">
                          {user?.musicPreference?.artist || user?.musicPreference?.artistName || "Spotify"}
                        </span>

                        <span className="px-4">
                          {user?.musicPreference?.artist || user?.musicPreference?.artistName || "Spotify"}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                <div className={clsx('grid', 'grid-cols-12', 'gap-1', 'opacity-70')}>
                  {[...Array(36)].map((_, i) => (
                    <div key={i} className={clsx('w-1', 'h-1', 'bg-white', 'rounded-full')}></div>
                  ))}
                </div>
              </div>
            </div>


          </div>
        </div>

        <p className={clsx('font-outfit', 'md:w-[90%]', 'mt-3', 'text-xs', 'font-thin', 'text-right')}>Facecard Creation tool V1</p>
      </section >


      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          20% {
            opacity: 1;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(20px);
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        .animate-slide-down {
          animation: slide-down 2.5s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 12s linear infinite;
        }
        @keyframes marquee-reverse {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        .animate-marquee-reverse {
          display: inline-block;
          white-space: nowrap;
          animation: marquee-reverse 12s linear infinite;
        }
        .mask-grad {
          mask-image: linear-gradient(to right, transparent, white 8%, white 92%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, white 8%, white 92%, transparent);
        }
      `}</style>
    </div >
  );
}





