"use client";
import React, { useState, useEffect } from "react";
import { CiCirclePlus } from "react-icons/ci";
import { FaArrowLeft } from "react-icons/fa";
import clsx from 'clsx';
import ErrorAlert from "@/components/ui/ErrorAlert";
import CompletionMeter from "@/components/facecard/CompletionMeter";
import OverflowMarquee from "@/components/ui/OverflowMarquee";
import useFitScale from "@/lib/useFitScale";

/** Figma iPhone editor card width (node 9074:5711). */
const FIGMA_EDITOR_WIDTH = 383;

function BracketFrame({ children, className, align = "start" }) {
  const centered = align === "center";
  return (
    <div
      className={clsx(
        "relative min-w-0 w-full py-2.5 min-h-[42px]",
        centered ? "px-3.5" : "pl-3.5 pr-5",
        className,
      )}
    >
      <span className="pointer-events-none absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-white/50" />
      <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-white/50" />
      <span className="pointer-events-none absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-white/50" />
      <span className="pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-white/50" />
      <div
        className={clsx(
          "flex min-w-0 w-full flex-col justify-center leading-tight overflow-hidden",
          centered && "items-center text-center",
        )}
      >
        {children}
      </div>
    </div>
  );
}

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
  const { containerRef, contentRef, scale, supportsZoom } = useFitScale();
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
      className={clsx('relative', 'flex', 'w-full', 'h-[100dvh]', 'max-h-[100dvh]', 'overflow-hidden', 'flex-col', 'items-center', 'justify-start', 'md:justify-center', 'lg:h-auto', 'lg:min-h-screen', 'lg:max-h-none', 'lg:overflow-visible', 'md:overflow-x-auto', 'p-0', 'text-white', 'outfit-font', 'md:p-2')}
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

      {/* Phone + tablet: Figma layout, scaled to fill the screen */}
      <div
        ref={containerRef}
        className="lg:hidden absolute inset-0 overflow-hidden p-1 flex items-center justify-center"
      >
        <div
          style={
            supportsZoom
              ? { zoom: scale }
              : {
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                }
          }
        >
        <div
          ref={contentRef}
          className="flex flex-col"
          style={{ width: FIGMA_EDITOR_WIDTH }}
        >
        <div className="flex flex-col w-full border border-white/50 rounded-[36px] p-2">
          <div className="relative grid w-full shrink-0 aspect-[367/581] grid-cols-[minmax(0,232fr)_minmax(0,135fr)] grid-rows-[200fr_381fr]">
            <svg
              aria-hidden
              viewBox="0 0 367 581"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
            >
              {/* Outer 36px − 8px inset = 28px inner corners so the two frames stay parallel */}
              <path
                d="M28 0H204A28 28 0 0 1 232 28V180A20 20 0 0 0 252 200H339A28 28 0 0 1 367 228V553A28 28 0 0 1 339 581H28A28 28 0 0 1 0 553V28A28 28 0 0 1 28 0Z"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.25"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="relative z-10 flex flex-col justify-between gap-1.5 p-2 pr-6 min-h-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={leaveEditor}
                  className="size-[36.111px] shrink-0 rounded-full border border-white/50 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
                >
                  <img src="/assets/facecard/close.svg" alt="" className="size-3" />
                </button>
                <BracketFrame className="flex-1" align="center">
                  <h2 className="font-otomanopee text-[12px] text-white min-w-0 w-full overflow-hidden text-center">
                    <OverflowMarquee text={firstName} className="text-center" />
                  </h2>
                  <p className="text-[10px] font-outfit font-light text-white min-w-0 w-full overflow-hidden text-center">
                    <OverflowMarquee text={`UserId: ${user?.id?.slice(0, 8) || "4heu24sds"}`} className="text-center" />
                  </p>
                </BracketFrame>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <BracketFrame className="flex-1">
                  <p className="text-[10px] font-outfit font-normal text-white min-w-0 w-full overflow-hidden">
                    <OverflowMarquee
                      text={`DOB : ${
                        user?.dateOfBirth
                          ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
                          : "22/08/1998"
                      }`}
                    />
                  </p>
                  <p className="text-[10px] font-outfit font-light text-white min-w-0 w-full overflow-hidden">
                    <OverflowMarquee text={`Zodiac : ${zodiac?.name || "Gemini"}`} />
                  </p>
                </BracketFrame>
                <button
                  type="button"
                  onClick={onPickZodiac || (() => setShowSelector("zodiacs"))}
                  className="size-[58.276px] shrink-0 border border-white/50 border-b-[3px] rounded-[13.986px] flex items-center justify-center overflow-hidden text-white hover:bg-white/5 transition"
                >
                  {zodiac?.imageUrl ? (
                    <img
                      src={zodiac.imageUrl}
                      className="size-6 object-contain brightness-0 invert"
                      alt=""
                    />
                  ) : (
                    <img src="/assets/facecard/plus-sm.svg" alt="" className="size-6 opacity-40" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <BracketFrame className="flex-1">
                  <p className="text-[10px] font-outfit font-normal text-white min-w-0 w-full overflow-hidden">
                    <OverflowMarquee text="Gender Identity" />
                  </p>
                  <p className="text-[10px] font-outfit font-light text-white min-w-0 w-full overflow-hidden">
                    <OverflowMarquee
                      text={(user?.gender || "Female")
                        .toLowerCase()
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    />
                  </p>
                </BracketFrame>
                <button
                  type="button"
                  className="size-[58.276px] shrink-0 border border-white/50 rounded-[13.986px] flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={
                      user?.gender === "MALE"
                        ? "/assets/gender-male.svg"
                        : user?.gender === "FEMALE" || !user?.gender
                          ? "/assets/facecard/gender-female.svg"
                          : "/assets/gender-intersex.svg"
                    }
                    alt=""
                    className="size-6 object-contain"
                  />
                </button>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-start gap-4 px-1 pt-1 min-h-0">
              <CompletionMeter percent={progress} size="mobile" className="w-full max-w-[104px]" />
              <button
                onClick={() => onOpenFacecardPreview?.()}
                className="w-full max-w-[128px] h-[58px] min-w-0 p-3 border border-white/50 rounded-[18px] flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
              >
                <img src="/assets/facecard/eye.svg" alt="" className="size-5 shrink-0 object-contain" />
                <span className="min-w-0">
                  <OverflowMarquee
                    text="Facecard"
                    className="font-otomanopee text-[12px] text-white"
                  />
                </span>
              </button>
            </div>

            <div className="relative z-10 col-span-2 flex min-h-0 flex-col px-2 pt-2 pb-2">

              <div className="grid grid-cols-[auto_minmax(0,1fr)_2.5rem] gap-x-2 gap-y-2 items-center px-1 shrink-0">
                <span className="font-otomanopee text-[12px] text-white">
                  Interests
                </span>
                <div
                  onClick={() => setShowSelector("interests")}
                  className="min-w-0 w-full h-10 border border-white/40 rounded-full px-3 flex items-center justify-center text-[10px] font-outfit font-normal overflow-hidden"
                >
                  {interests.length > 0 ? (
                    <OverflowMarquee
                      key={interestIndex}
                      text={interests[interestIndex]}
                      className="animate-slide-down font-outfit font-normal text-center"
                    />
                  ) : (
                    "Select"
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSelector("interests")}
                  className="size-10 shrink-0 flex items-center justify-center border border-white/50 border-b-[3px] rounded-[8px] hover:bg-white/10 active:scale-90 transition"
                >
                  <img src="/assets/facecard/plus-sm.svg" alt="" className="size-[11.655px] opacity-60" />
                </button>

                <span className="font-otomanopee text-[12px] text-white">
                  Causes
                </span>
                <div
                  onClick={() => setShowSelector("values")}
                  className="min-w-0 w-full h-10 border border-white/40 rounded-full px-3 flex items-center justify-center text-[10px] font-outfit font-normal overflow-hidden"
                >
                  {causes.length > 0 ? (
                    <OverflowMarquee
                      key={causeIndex}
                      text={causes[causeIndex]}
                      className="animate-slide-down font-outfit font-normal text-center"
                    />
                  ) : (
                    "Select"
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSelector("values")}
                  className="size-10 shrink-0 flex items-center justify-center border border-white/50 border-b-[3px] rounded-[8px] hover:bg-white/10 active:scale-90 transition"
                >
                  <img src="/assets/facecard/plus-sm.svg" alt="" className="size-[11.655px] opacity-60" />
                </button>

                <span className="font-otomanopee text-[12px] text-white">
                  Brands
                </span>
                <div className="col-span-2 grid grid-cols-5 gap-[6px] min-w-0 w-full">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const selection = user?.brandPreferences?.[i];
                    return (
                      <div
                        key={i}
                        onClick={() => setShowSelector("brands")}
                        className={`w-full aspect-square border border-white/50 border-b-2 rounded-full flex items-center justify-center overflow-hidden hover:bg-white/10 transition-all ${selection ? "border-white/80" : ""}`}
                      >
                        {selection ? (
                          <img
                            src={selection.brand?.logoUrl}
                            alt=""
                            className="w-[53%] h-[53%] object-contain"
                          />
                        ) : (
                          <img src="/assets/facecard/plus-sm.svg" alt="" className="w-[53%] h-[53%] opacity-60" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={clsx('relative', 'group', 'mt-auto', 'pt-2')}>
                {photoUploading && (
                  <div className={clsx('absolute', 'inset-0', 'z-30', 'flex', 'items-center', 'justify-center', 'rounded-xl', 'bg-black/60', 'backdrop-blur-sm')}>
                    <div className={clsx('h-10', 'w-10', 'border-2', 'border-yellow-400', 'border-t-transparent', 'rounded-full', 'animate-spin')} />
                  </div>
                )}

                <div className={clsx('grid', 'grid-cols-3', 'gap-2.5')}>
                  <div className="relative overflow-visible">
                    <div
                      onClick={() => handleSlotClick(0)}
                      className={clsx('w-full', 'aspect-[2/3]', 'border', 'border-white/50', 'border-b-[3px]', 'rounded-2xl', 'overflow-hidden', 'flex', 'items-center', 'justify-center')}
                    >
                      {user?.displayPictureUrl ? (
                        <img
                          src={user.displayPictureUrl}
                          className={clsx('w-full', 'h-full', 'object-cover')}
                          alt="Photo 1"
                        />
                      ) : (
                        <img
                          src="/assets/facecard/plus-circle.svg"
                          alt=""
                          className="size-[39px]"
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label="Edit photo"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSlotClick(0);
                      }}
                      className={clsx('absolute', '-top-2.5', 'right-0', 'z-20', 'size-5')}
                    >
                      <img src="/assets/facecard/edit-circle.svg" alt="" className="size-5" />
                    </button>
                  </div>

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
                            'border',
                            'border-white/50',
                            'border-b-[3px]',
                            'rounded-2xl',
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
                              alt={`Photo ${idx + 2}`}
                            />
                          ) : (
                            <img
                              src="/assets/facecard/plus-circle.svg"
                              alt=""
                              className="size-[39px]"
                            />
                          )}
                        </div>

                        {photo && (
                          <button
                            type="button"
                            aria-label="Remove photo"
                            onClick={(e) => {
                              e.stopPropagation();
                              const selectedPhoto = user.photos.find(
                                (p) => p.order === idx
                              );
                              if (onDeletePhoto && selectedPhoto) {
                                onDeletePhoto(selectedPhoto.id);
                              }
                            }}
                            className={clsx('absolute', '-top-2.5', 'right-0', 'z-20', 'size-5')}
                          >
                            <img src="/assets/facecard/close-solid.svg" alt="" className="size-5" />
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
            </div>
          </div>

          <div className="w-full flex items-center gap-2 px-3 pt-1 pb-1 min-w-0 shrink-0 overflow-visible">
            <div
              onClick={() => setShowSelector("music")}
              className="relative size-[120px] shrink-0 overflow-visible active:scale-95 transition"
            >
              <div className="absolute inset-0 rounded-full border-2 border-white/60" />
              <div
                className={`absolute inset-[2px] rounded-full overflow-hidden flex items-center justify-center ${user?.musicPreference ? "animate-spin-slow" : "bg-white/5"}`}
              >
                {user?.musicPreference?.albumArtUrl ? (
                  <img
                    src={user.musicPreference.albumArtUrl}
                    className="w-full h-full rounded-full object-cover border-[2px] border-white/40"
                    alt="Album Art"
                  />
                ) : (
                  <img src="/assets/facecard/plus-circle.svg" alt="" className="size-[39px]" />
                )}
              </div>

              {user?.musicPreference ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 130 88"
                  fill="none"
                  className="pointer-events-none absolute z-20 h-auto w-[70%] -scale-x-100 overflow-visible"
                  style={{ left: "-28%", top: "14%" }}
                >
                  <path d="M127.589 1.93553L52.3248 1.93551L11.4682 73.876" stroke="white" strokeOpacity="0.5" strokeWidth="3.87091" strokeLinecap="round" />
                  <circle cx="7.06439" cy="7.06439" r="7.06439" transform="matrix(-1.03187e-07 1 1 1.03187e-07 3.74761e-06 71.542)" fill="white" fillOpacity="0.85" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 154 140"
                  fill="none"
                  className="pointer-events-none absolute z-20 h-auto w-[52%] -scale-x-100 overflow-visible"
                  style={{ left: "-48%", top: "8%" }}
                >
                  <path d="M111.059 1.93613L45.5457 38.9875L45.3976 121.72" stroke="white" strokeOpacity="0.5" strokeWidth="3.87091" strokeLinecap="round" />
                  <circle cx="8.06439" cy="8.06439" r="8.06439" transform="matrix(0.492282 0.870436 0.870436 -0.492282 34.2666 125.335)" fill="white" fillOpacity="0.5" />
                </svg>
              )}
            </div>

            <div
              onClick={() => setShowSelector("music")}
              className="relative flex-1 min-w-0 px-4 py-2 flex items-center"
            >
              <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-white/50" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-white/50" />
              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-white/50" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-white/50" />
              <div className="flex flex-col justify-center items-stretch w-full min-w-0 overflow-hidden">
                <OverflowMarquee
                  text={user?.musicPreference?.name || user?.musicPreference?.songName || "Select Song"}
                  className="text-white text-[10px] font-outfit font-normal leading-tight"
                />
                <OverflowMarquee
                  text={user?.musicPreference?.artist || user?.musicPreference?.artistName || "Artist name"}
                  className="text-white font-outfit font-light text-[10px]"
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 shrink-0 pt-4">
              <div className="flex w-[44px] flex-col gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
                  <div key={row} className="flex items-center gap-1">
                    {Array.from({ length: 6 }, (_, i) => (
                      <span
                        key={i}
                        className="size-1 shrink-0 rounded-full bg-white/50"
                      />
                    ))}
                  </div>
                ))}
              </div>
              <img
                src={user?.musicPreference ? "/assets/facecard/toggle-on.svg" : "/assets/facecard/toggle-off.svg"}
                alt=""
                className="h-6 w-6"
              />
            </div>
          </div>
        </div>
        <p className="shrink-0 font-outfit font-light text-[10px] text-center pt-1 pb-0.5">
          Facecard creation tool V1
        </p>
        </div>
        </div>
      </div>

      {/* --- DESKTOP VIEW (Original Scaled Design) --- */}
      <section className={clsx('hidden', 'lg:block', '[@media(max-height:947px)]:scale-[0.99][@media(max-height:950px)]:scale-[1]', '[@media(max-height:850px)]:scale-[0.90]')}>
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

                      <h2 className={clsx('font-otomanopee', 'text-[20px]', 'leading-none', 'text-start')}>
                        {firstName}
                      </h2>

                      <p className={clsx('text-[16px]', 'font-outfit', 'font-light', 'mt-1', 'text-center')}>
                        UserId: {user?.id?.slice(0, 8)}
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

                      <p className={clsx('text-[16px]', 'font-outfit', 'font-normal')}>
                        DOB :{" "}
                        {user?.dateOfBirth
                          ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
                          : ""}
                      </p>

                      <p className={clsx('text-[16px]', 'mt-1', 'font-outfit', 'font-light')}>
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

                      <p className={clsx('text-[16px]', 'font-outfit', 'font-normal')}>Gender Identity</p>
                      <p className={clsx('text-[16px]', 'font-outfit', 'font-light', 'mt-1')}>
                        {(user?.gender || "Female")
                          .toLowerCase()
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
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

                      <p className={clsx('text-[16px]', 'font-otomanopee')}>Brands</p>
                      <p className={clsx('text-[16px]', 'font-outfit', 'font-light')}>
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
                      <span className={clsx('text-[16px]', 'font-otomanopee')}>Interests:</span>
                      <div className={clsx('flex-1', 'flex', 'justify-end', 'overflow-hidden')}>
                        {interests.length > 0 ? (
                          <span
                            key={interestIndex}
                            className={clsx('text-[16px]', 'font-otomanopee', 'opacity-90', 'truncate', 'max-w-[150px]', 'animate-slide-down')}
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












                  <div className={clsx('flex', 'items-center', 'gap-4')}>
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
                      <span className={clsx('text-[16px]', 'font-otomanopee')}>Causes:</span>
                      <div className={clsx('flex-1', 'flex', 'justify-end', 'overflow-hidden')}>
                        {causes.length > 0 ? (
                          <span
                            key={causeIndex}
                            className={clsx('text-[16px]', 'font-otomanopee', 'opacity-90', 'truncate', 'max-w-[150px]', 'animate-slide-down')}
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
            <div className={clsx('w-full', 'lg:w-[260px]', 'xl:w-[300px]', 'flex', 'flex-col', 'gap-10', 'py-6', 'pr-4', 'overflow-visible')}>
              {/* Progress Area */}
              <div className={clsx('flex', 'flex-col', 'items-center', 'gap-6', 'overflow-visible')}>
                <CompletionMeter percent={progress} size="desktop" />

                <button
                  type="button"
                  onClick={() => onOpenFacecardPreview?.()}
                  className={clsx('w-[80%]', 'py-6', 'border-2', 'border-b-4', 'border-white/40', 'rounded-[18px]', 'flex', 'items-center', 'justify-center', 'gap-3', 'hover:bg-white/5', 'transition')}
                >
                  <span className="text-xl">
                    <img src="/eye.svg" alt="" />
                  </span>

                  <span className={clsx('font-otomanopee', 'text-[20px]', 'text-white')}>
                    Facecard
                  </span>
                </button>
              </div>

              {/* Music Section */}
              <div
                onClick={() => setShowSelector("music")}
                className={clsx('flex-1', 'flex', 'flex-col', 'items-center', 'gap-6', 'relative', 'overflow-visible', 'group')}
              >
                <div className={clsx('relative', 'w-32', 'sm:w-36', 'md:w-44', 'aspect-square', 'flex', 'items-center', 'justify-center', 'overflow-visible')}>
                  <div className={clsx('absolute', 'inset-0', 'rounded-full', 'border-[2px]', 'border-white/80')} />
                  <div className={clsx('absolute', 'inset-[2.2px]', 'rounded-full', 'border-[2px]', 'border-white/50')} />

                  <div
                    className={clsx(
                      'absolute',
                      'inset-3',
                      'rounded-full',
                      'overflow-hidden',
                      'border-2',
                      'border-white/30',
                      'flex',
                      'items-center',
                      'justify-center',
                      user?.musicPreference && 'animate-spin-slow',
                    )}
                  >
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

                  {user?.musicPreference ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 130 88"
                      fill="none"
                      className="pointer-events-none absolute z-20 h-auto w-[72%] overflow-visible"
                      style={{ left: "58%", top: "-8%" }}
                    >
                      <path d="M127.589 1.93553L52.3248 1.93551L11.4682 73.876" stroke="white" strokeOpacity="0.5" strokeWidth="3.87091" strokeLinecap="round" />
                      <circle cx="7.06439" cy="7.06439" r="7.06439" transform="matrix(-1.03187e-07 1 1 1.03187e-07 3.74761e-06 71.542)" fill="white" fillOpacity="0.85" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 154 140"
                      fill="none"
                      className="pointer-events-none absolute z-20 h-auto w-[58%] overflow-visible"
                      style={{ left: "82%", top: "10%" }}
                    >
                      <path d="M111.059 1.93613L45.5457 38.9875L45.3976 121.72" stroke="white" strokeOpacity="0.5" strokeWidth="3.87091" strokeLinecap="round" />
                      <circle cx="8.06439" cy="8.06439" r="8.06439" transform="matrix(0.492282 0.870436 0.870436 -0.492282 34.2666 125.335)" fill="white" fillOpacity="0.5" />
                    </svg>
                  )}
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
                      <div className={clsx('animate-marquee-reverse', 'whitespace-nowrap', 'text-[16px]', 'font-outfit', 'font-normal', 'text-white')}>
                        <span className="px-4">
                          {user?.musicPreference?.name || user?.musicPreference?.songName || "Tap to add music"}
                        </span>

                        <span className="px-4">
                          {user?.musicPreference?.name || user?.musicPreference?.songName || "Tap to add music"}
                        </span>
                      </div>
                    </div>

                    {/* Artist */}
                    <div className={clsx('w-[60%]', 'mx-auto', 'overflow-hidden', 'whitespace-nowrap', '-mt-1', 'mask-grad')}>
                      <div className={clsx('animate-marquee-reverse', 'whitespace-nowrap', 'text-[16px]', 'font-outfit', 'font-light', 'text-white')}>
                        <span className="px-4">
                          {user?.musicPreference?.artist || user?.musicPreference?.artistName || "Artist name"}
                        </span>

                        <span className="px-4">
                          {user?.musicPreference?.artist || user?.musicPreference?.artistName || "Artist name"}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                <div className={clsx('mt-auto', 'flex', 'w-full', 'items-center', 'justify-between', 'gap-3')}>
                  <div className={clsx('flex', 'w-[181px]', 'shrink-0', 'flex-col', 'gap-1')}>
                    {[0, 1, 2].map((row) => (
                      <div key={row} className={clsx('flex', 'items-center', 'gap-[5.18px]')}>
                        {Array.from({ length: 18 }, (_, i) => (
                          <span
                            key={i}
                            className={clsx('size-[5.18px]', 'shrink-0', 'rounded-full', 'bg-white/50')}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <img
                    src={user?.musicPreference ? "/assets/facecard/toggle-on.svg" : "/assets/facecard/toggle-off.svg"}
                    alt=""
                    className="h-10 w-10 shrink-0"
                  />
                </div>
              </div>
            </div>


          </div>
        </div>

        <p className={clsx('font-outfit', 'font-light', 'md:w-[90%]', 'mt-3', 'text-[14px]', 'text-right')}>Facecard creation tool V1</p>
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





