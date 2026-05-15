"use client";
import React, { useState, useEffect } from "react";
import { CiCirclePlus } from "react-icons/ci";
import { FaArrowLeft } from "react-icons/fa";

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
      className="relative flex w-full min-h-screen flex-col items-center justify-start md:justify-center overflow-visible md:overflow-x-auto p-0 text-white outfit-font md:p-2"
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* --- Mobile VIEW (Original Scaled Design) --- */}

       <div className="min-h-[100dvh] flex items-center justify-center md:hidden px-2">
         <div className="flex border border-white/30 rounded-[2.5rem] w-full min-h-[90dvh] flex-col gap-5 px-2 relative z-10">
      {/* TOP ROW: Close, Name Box, Progress */}
         <div className="grid grid-cols-12 gap-2 items-center px-2 mt-2 mt-4 ">
            {/* Close Button */}

           <div className="col-span-2">
           <button
                onClick={leaveEditor}
                className="w-9 h-9 rounded-full border border-white/50 flex items-center justify-center text-md hover:bg-white/10 transition-all active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Name Box with Brackets */}
            <div className="col-span-5 flex justify-center">
              <div className="relative px-6 py-1 min-w-[140px] h-[42px]">
                <span className="absolute top-0 left-0 w-3 h-3 border-t-1 border-l-1 border-white/50"></span>
                <span className="absolute top-0 right-0 w-3 h-3 border-t-1 border-r-1 border-white/50"></span>
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b-1 border-l-1 border-white/50"></span>
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b-1 border-r-1 border-white/50"></span>
                <div className="flex flex-col justify-center h-full">
                  <h2 className="text-[12px] text-white">{firstName}</h2>

                  <p className="text-[10px]  font-outfit text-white">
                    UserID:{user?.id?.slice(0, 8) || "4heu24sds"}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-5 row-span-2 flex justify-center items-center">
              <div className="relative w-[120px] h-[120px] flex items-center justify-center">
                {/* Glow */}

                {/* Outer ring */}
                <div className="absolute w-[104px] h-[104px] rounded-full border-[2px] border-pink-500/60 shadow-[0_0_15px_rgba(236,72,153,0.7),inset_0_0_10px_rgba(236,72,153,0.5)]" />

                <div className="absolute w-[100px] h-[100px] rounded-full border-[2px] border-white" />

                <div className="absolute w-[96px] h-[96px] rounded-full border-[2px] border-pink-500/60" />

                {/* Main yellow ring with pink glow */}
                <div className="w-[88px] h-[88px] rounded-full border-[5px] border-yellow-400 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.8),inset_0_0_12px_rgba(236,72,153,0.6)]">
                  {/* Inner thin ring */}
                  <div className="absolute w-[75px] h-[75px] rounded-full border-[3px] border-[#FFBC2B]" />

                  {/* Center text */}
                  <span className="text-[18px] text-white font-semibold">
                    {progress}
                    <span className="text-sm opacity-60">%</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-5 mt-1">
              <div className="relative px-6 py-1 min-w-[140px] h-[42px]">
                <span className="absolute top-0 left-0 w-3 h-3 border-t-1 border-l-1 border-white/50"></span>
                <span className="absolute top-0 right-0 w-3 h-3 border-t-1 border-r-1 border-white/50"></span>
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b-1 border-l-1 border-white/50"></span>
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b-1 border-r-1 border-white/50"></span>

                <div className="">
                  <p className="text-[10px] uppercase  font-outfit  text-white">
                    DOB :{" "}
                    {user?.dateOfBirth
                      ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
                      : "22/08/1998"}
                  </p>
                  <p className="text-[10px] font-outfit font-thin  text-white">
                    Zodiac : {zodiac?.name || "Gemini"}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-2 flex justify-center mt-1">
              <button
                onClick={onPickZodiac || (() => setShowSelector("zodiacs"))}
                className="w-12 h-12 border border-white/40 border-b-[3px] rounded-[10.986px] flex items-center justify-center text-4xl text-white hover:bg-white/5 transition"
              >
                {zodiac?.imageUrl ? (
                  <img
                    src={zodiac.imageUrl}
                    className="h-[20px] w-[20px] object-contain brightness-0 invert"
                  />
                ) : (
                  <span className="opacity-40 text-2xl">+</span>
                )}
              </button>
            </div>

            <div className="col-span-5 ">
              <div className="relative px-6 py-1 min-w-[140px] h-[42px]">
                <span className="absolute top-0 left-0 w-3 h-3 border-t-1 border-l-1 border-white/50"></span>
                <span className="absolute top-0 right-0 w-3 h-3 border-t-1 border-r-1 border-white/50"></span>
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b-1 border-l-1 border-white/50"></span>
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b-1 border-r-1 border-white/50"></span>

                <div className="">
                  <p className="text-[10px] font-outfit  text-white">
                    Gender Identity
                  </p>
                  <p className="text-[10px] font-outfit  text-white">{user?.gender}</p>
                </div>
              </div>
            </div>

            {/* Gender Icon + Facecard Button Column */}
            <div className="col-span-2 flex flex-col gap-4 ">
              <div className="flex justify-center">
                <button className="w-12 h-12 border border-white/40 border-b-[3px] rounded-[10.986px] flex items-center justify-center text-xl text-white">
                  {user?.gender === "MALE"
                    ? "♂"
                    : user?.gender === "FEMALE"
                      ? "♀"
                      : "⚧"}
                </button>
              </div>
            </div>

            <div className="col-span-5 px-2 flex justify-center items-center">
              <button
                onClick={() => onOpenFacecardPreview?.()}
                className="w-full py-3.5 px-2 border border-white/40 rounded-2xl flex items-center justify-center gap-2  hover:bg-white/10 active:scale-95 transition-all"
              >
                <span className="text-xl">
                  <img src="/eye.svg" alt="" />
                </span>
                <span className="text-xs font-bold  tracking-widest text-white">
                  Facecard
                </span>
              </button>
            </div>

          </div>

          {/* MIDDLE SECTION: DOB/Zodiac Box + Zodiac Icon */}

          {/* BOTTOM SECTION: Gender Box, Gender Icon, Facecard Button */}

          {/* Action Rows: Interests, Causes, Brands */}
          <div className="flex flex-col gap-3 px-2">
            {/* Interests */}
            <div className="flex items-center justify-between gap-3">
              {/* LEFT → Label */}
              <span className="text-[12px] font-black   tracking-wide">
                Interests
              </span>

              {/* RIGHT → Box + Button */}
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setShowSelector("interests")}
                  className="w-48 h-12 border border-white/40 rounded-full px-4 flex items-center justify-center text-[11px] 0  meeting now overflow-hidden"
                >
                  {interests.length > 0 ? (
                    <div key={interestIndex} className="animate-slide-down">
                      {interests[interestIndex]}
                    </div>
                  ) : (
                    "Select"
                  )}
                </div>

                <button
                  onClick={() => setShowSelector("interests")}
                  className="w-12 h-12 border border-white/60 border-b-2 rounded-xl text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* LEFT → Label */}
              <span className="text-[12px] font-black tracking-wide">
                Causes
              </span>

              {/* RIGHT → Box + Button */}
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setShowSelector("values")}
                  className="w-48 h-12 border border-white/40 rounded-full px-4 flex items-center justify-center text-[11px] 0  meeting now overflow-hidden"
                >
                  {causes.length > 0 ? (
                    <div key={causeIndex} className="animate-slide-down italic">
                      {causes[causeIndex]}
                    </div>
                  ) : (
                    "Select"
                  )}
                </div>

                <button
                  onClick={() => setShowSelector("values")}
                  className="w-12 h-12 border border-white/60 rounded-xl border-b-2 text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Brands */}
            <div className="flex items-center justify-between gap-3">
              {/* LEFT → Label */}
              <span className="text-[12px] font-black   tracking-wide">
                Brands
              </span>

              {/* RIGHT → Icons */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                {[0, 1, 2, 3, 4].map((i) => {
                  const selection = user?.brandPreferences?.[i];
                  return (
                    <div
                      key={i}
                      onClick={() => setShowSelector("brands")}
                      className="w-11 h-11 shrink-0 border-2 border-white/40 rounded-full flex items-center justify-center bg-white/5 0  meeting now hover:bg-white/10"
                    >
                      {selection ? (
                        <img
                          src={selection.brand?.logoUrl}
                          className="w-10 h-10 rounded-full object-contain"
                        />
                      ) : (
                        <span className="opacity-40 text-xl">+</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Photo Slots Section */}
          <div className="relative group px-2">
            {photoUploading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                <div className="h-10 w-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {/* Photo 1 (DP) */}
              <div
                onClick={() => handleSlotClick(0)}
                className="w-full aspect-[2/3] border-2  border-white/50 rounded-[1rem] overflow-hidden relative shadow-2xl"
              >
                <img
                  src={user?.displayPictureUrl || "/imageprofile.png"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-black text-[10px]">
                  ✎
                </div>
              </div>

              {/* Other Slots */}
              {[0, 1].map((idx) => {
                const photo = user?.photos?.find((p) => p.order === idx);
                return (
                  <div
                    key={idx}
                    onClick={() => handleSlotClick(idx + 1)}
                    className="w-full aspect-[2/3] border-2 border-white/20 rounded-[1rem] flex items-center justify-center relative overflow-hidden bg-white/5"
                  >
                    {photo ? (
                      <>
                        <img
                          src={photo.url}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeletePhoto) onDeletePhoto(photo.id);
                          }}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-xs z-10 hover:bg-red-600 active:scale-90 transition-all shadow-lg"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="w-12 h-12 border-2 border-white/60 rounded-full flex items-center justify-center text-3xl opacity-40">
                        +
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full flex items-center justify-between  mb-4 px-3 ">
            {/* LEFT: Album + Info */}
            <div className="flex items-center gap-5">
              {/* Album */}
              <div
                onClick={() => setShowSelector("music")}
                className="relative 0  meeting now active:scale-95 transition"
              >
                <div
                  className={`w-30 h-30 rounded-full border border-white/20 flex items-center justify-center border rounded-full border-white/80 border-[2px] ${user?.musicPreference ? "" : "bg-white/5"}`}
                >
                  <div
                    className={`w-29 h-29 rounded-full  p-1 overflow-hidden flex items-center justify-center  ${user?.musicPreference ? "animate-spin-slow" : ""}`}
                  >
                    {user?.musicPreference?.albumArtUrl ? (
                      <img
                        src={user.musicPreference.albumArtUrl}
                        className="w-full h-full rounded-full object-cover border-[2px] border-white/40"
                        alt="Album Art"
                      />
                    ) : (
                      <span className="text-4xl opacity-20 text-white">+</span>
                    )}
                  </div>

       
                
                </div>
              </div>

              <div className="relative px-6 py-1 min-w-[120px]">
                <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/50"></span>
                <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/50"></span>
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/50"></span>
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/50"></span>
                {/* Text */}
                <div className="inline-flex flex-col  justify-end items-start">
               <p className="text-white text-[10px] font-outfit leading-tight">
  {(user?.musicPreference?.name ||
    user?.musicPreference?.songName ||
    "Select Song")
    .split(" ")
    .slice(0, 2)
    .join(" ")}
</p>

<p className="text-white/60 font-outfit text-[10px] text-center">
  {(user?.musicPreference?.artist ||
    user?.musicPreference?.artistName ||
    "Spotify")
    .split(" ")
    .slice(0, 2)
    .join(" ")}
</p>
                </div>
              </div>
            </div>

            {/* RIGHT: Dots */}
            <div className="grid grid-cols-6 gap-1.5 opacity-50">
              {[...Array(48)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-white rounded-full"></div>
              ))}
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      {/* --- DESKTOP VIEW (Original Scaled Design) --- */}

      <div className=" transition-all duration-300 max-w-[1200px] w-full px-6 mx-auto">



        <div className="relative hidden lg:flex lg:flex-row  w-full  flex-col  gap-4 md:gap-6    rounded-[60px] md:rounded-[60px] border border-white/60 p-4 md:p-4">
          {/* Main Editor UI */}

          <div className="flex-1 w-full border border-2 border-white/30 rounded-[54px] p-8 px-11 relative flex flex-col gap-10">
            {/* Top Header Row */}
            <div className="flex items-start gap-10  ">
              {/* Left: Back + Vertical Name */}
     <div className="relative flex flex-col items-start h-full justify-between">
                {/* Back Button */}
                <button
                  onClick={leaveEditor}
                  className="w-[58px] h-18  p-1 rounded-full border border-white/80 flex items-center justify-center hover:bg-white/10 transition"
                >
                  <span className="text-xl "><FaArrowLeft /></span>
                </button>

                {/* Vertical Name Wrapper */}
<div className="relative w-[70px] h-full flex items-center justify-center">
                  {/* Rotated content */}
                  <div className="absolute rotate-[-90deg] whitespace-nowrap px-12 py-5 mt-2   relative">
                    {/* Corner brackets */}
                    <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/50"></span>
                    <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/50"></span>
                    <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/50"></span>
                    <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/50"></span>

                    <h2 className="text-2xl  tracking-wide  leading-none text-start">
                      {firstName}
                    </h2>

                    <p className="text-[11px] opacity-90 font-outfit tracking-widest uppercase mt-1 text-center">
                      USERID: {user?.id?.slice(0, 8)}
                    </p>
                  </div>
                </div>


              </div>

              {/* Right: Photo Slots */}
              <div className="relative flex gap-5 justify-center">
                {photoUploading && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-[2.5rem] bg-black/55 backdrop-blur-sm">
                    <div className="h-10 w-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
                      Uploading &amp; saving…
                    </p>
                  </div>
                )}

                {/* Slot 1 */}
<div
  onClick={() => handleSlotClick(0)}
  className={`w-[160px] sm:w-[180px] md:w-[198px] aspect-[2/3] border-2 border-white/80 rounded-[32px] overflow-visible relative border-b-[6px] ${
    photoUploading ? "pointer-events-none opacity-60" : ""
  }`}
>
  {user?.displayPictureUrl ? (
    <img
      src={user.displayPictureUrl}
      alt="Photo 1"
      className="w-full h-full object-cover rounded-[30px] rounded-b-[26px]"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-[30px]">
       <span className="text-5xl opacity-40 border-4 border-white/80 rounded-full px-3">
        +
      </span>
    </div>
  )}

  <button className="absolute -top-1 -right-3 z-20 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm shadow-lg">
    ✎
  </button>
</div>

                {/* Slot 2 (Photo Order 0) */}
                <div
  onClick={() => handleSlotClick(1)}
  className={`w-[160px] sm:w-[180px] md:w-[198px] aspect-[2/3] border-2 border-white/80 rounded-[32px] border-b-[6px] flex items-center justify-center relative overflow-visible bg-white/5 transition-colors ${
    photoUploading
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
      className="absolute -top-1 -right-3 z-20 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm shadow-lg hover:bg-gray-50 active:scale-90 transition-all"
    >
      ✕
    </button>
  )}

  {user?.photos?.find((p) => p.order === 0)?.url ? (
    <img
      src={user.photos.find((p) => p.order === 0).url}
      alt="Photo 2"
      className="w-full h-full object-cover rounded-[30px] rounded-b-[26px]"
    />
  ) : (
  
         <CiCirclePlus className="text-[60px] opacity-60  rounded-full "/>

  )}
</div>

                {/* Slot 3 (Photo Order 1) */}
                <div
                  onClick={() => handleSlotClick(2)}
                  className={`w-[160px] sm:w-[180px] md:w-[198px] aspect-[2/3] border-2 border-white/80 rounded-[32px] border-b-[6px] flex items-center justify-center relative overflow-visible bg-white/5 transition-colors ${
                    photoUploading
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
                      className="absolute -top-1 -right-3 z-20 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm shadow-lg hover:bg-gray-50 active:scale-90 transition-all"
                    >
                      ✕
                    </button>
                  )}
                  {user?.photos?.find((p) => p.order === 1)?.url ? (
                    <img
                      src={user.photos.find((p) => p.order === 1).url}
                      className="w-full h-full object-cover rounded-[30px] rounded-b-[26px]"
                      alt="Photo 3"
                    />
                  ) : (
                            <CiCirclePlus className="text-[60px] opacity-60  rounded-full "/>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />
              </div>





            </div>

            {/* Info Sections Area */}
            <div className="grid grid-cols-10 mt-5  gap-2  items-center">
              {/* DOB & Gender Text Labels */}
              <div className="col-span-3 w-[90%] flex flex-col gap-10 ">
                {/* DOB + Zodiac */}
                <div className="relative px-1 py-4 flex justify-center">
                  <div className="flex flex-col items-start text-left">
                    <span className="absolute top-0 left-0 w-4 h-4 border-t-[2px] border-l-[2px] border-white/40"></span>
                    <span className="absolute top-0 right-0 w-4 h-4 border-t-[2px] border-r-[2px] border-white/40"></span>
                    <span className="absolute bottom-0 left-0 w-4 h-4 border-b-[2px] border-l-[2px] border-white/40"></span>
                    <span className="absolute bottom-0 right-0 w-4 h-4 border-b-[2px] border-r-[2px] border-white/40"></span>

                    <p className="text-[12px] uppercase opacity-80 font-outfit">
                      DOB :{" "}
                      {user?.dateOfBirth
                        ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
                        : ""}
                    </p>

                    <p className="text-[12px]  mt-1 font-outfit">
                      Zodiac : {zodiac?.name || "Vacant"}
                    </p>
                  </div>
                </div>

                {/* Gender */}
                <div className="relative px-1 py-4 flex justify-center">
                  <div className="flex flex-col items-start text-left">
                    <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/40"></span>
                    <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/40"></span>
                    <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/40"></span>
                    <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/40"></span>

                    <p className="text-[12px] font-outfit  ">Gender Identity</p>
                    <p className="text-[12px] font-outfit   mt-1">
                      {user?.gender || "Female"}
                    </p>
                  </div>
                </div>

                {/* Brands */}
                <div className="relative px-1 py-4 mt-5 flex justify-center">
                  <div className="flex flex-col items-start text-left">
                    <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/40"></span>
                    <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/40"></span>
                    <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/40"></span>
                    <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/40"></span>

                    <p className="text-[12px]   ">Brands</p>
                    <p className="text-[12px] font-outfit  ">
                      Can&apos;t live w/o &#39;em
                    </p>
                  </div>
                </div>
              </div>



              {/* Icon Pills & Brand Grid */}
              <div className="col-span-7 space-y-7 ">
                <div className="flex items-center gap-4">
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onPickZodiac === "function") onPickZodiac();
                      else setShowSelector("zodiacs");
                    }}
                    className="w-[84px] h-[84px] rounded-[20px] border border-[1.5px] border-b-[4px] border-white/60 flex items-center justify-center shadow-inner overflow-hidden hover:bg-white/5 transition  "
                    aria-label="Change zodiac"
                  >
                    {user?.zodiac?.imageUrl ? (
                      <img
                        src={user.zodiac.imageUrl}
                        alt={user.zodiac.name || "Zodiac"}
                        className="h-[75%] w-[75%] object-contain p-2 font-outfit text-sm"
                      />
                    ) : (
                      zodiac?.symbol || (
                        <span className="opacity-40 text-3xl">+</span>
                      )
                    )}
                  </button>

                  <div
                    onClick={() => setShowSelector("interests")}
className=" ml-4   flex-1 min-w-0 h-18 rounded-full border border-white/60 px-5 flex items-center justify-between hover:bg-white/5 transition overflow-hidden"
                  >
                    <span className="text-sm font-thin tracking-wide font-outfit">Interests:</span>
                    <div className="flex-1 flex justify-end overflow-hidden">
                      {interests.length > 0 ? (
                        <span
                          key={interestIndex}
                          className="text-sm font-outfit opacity-90 truncate max-w-[150px] animate-slide-down"
                        >
                          {interests[interestIndex]}
                        </span>
                      ) : (
                        <span className="text-sm opacity-90"></span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSelector("interests")}
                    className="w-18 h-18 rounded-2xl border border-white/70  border border-b-[3px] flex items-center justify-center text-3xl font-outfit font-thin transition text-white/70 hover:bg-white/10"
                  >
                    +
                  </button>
                </div>










                

                <div className="flex items-center font-outfit gap-4 ">
                  <div className="w-[84px] h-[84px] rounded-[20px] border-2 border-white/60 flex items-center justify-center text-3xl shadow-inner">
                    {user?.gender === "MALE"
                      ? "♂"
                      : user?.gender === "FEMALE"
                        ? "♀"
                        : ""}
                  </div>

                  <div
                    onClick={() => setShowSelector("values")}
className=" ml-4   flex-1 min-w-0 h-18 rounded-full border border-white/60 px-5 flex items-center justify-between hover:bg-white/5 transition overflow-hidden"
                  >
                    <span className="text-sm  tracking-wide">Causes:</span>
                    <div className="flex-1 flex justify-end overflow-hidden">
                      {causes.length > 0 ? (
                        <span
                          key={causeIndex}
                          className="text-sm opacity-90 font-outfit truncate max-w-[150px] animate-slide-down"
                        >
                          {causes[causeIndex]}
                        </span>
                      ) : (
                        <span className="text-sm opacity-90 italic"></span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSelector("values")}
                    className="w-18 mt-1 h-18 rounded-2xl border border-b-[3px] border-white/70 flex items-center justify-center text-3xl font-thin transition text-white/70 hover:bg-white/10"
                  >
                    +
                  </button>
                </div>

                {/* Brand Icons Row */}
                <div className="flex gap-8 mt-12  scrollbar-hide">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const selection = user?.brandPreferences?.[i];
                    return (
                      <div
                        key={i}
                        onClick={() => setShowSelector("brands")}
                        className={`relative w-20 h-20 rounded-full border border-2  border-white/50 flex items-center justify-center shadow-inner 0  meeting now transition-all hover:scale-105 ${selection ? "bg-white/10" : "bg-transparent"}`}
                      >
                        {selection &&
                          (selection.brand?.logoUrl ? (
                            <img
                              src={selection.brand.logoUrl}
                              alt={selection.brand.name}
                              className="w-[100%] h-[100%] rounded-full  object-contain"
                            />
                          ) : (
                            <span className="text-white font-bold text-xl">
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
          <div className="w-full lg:w-[260px] xl:w-[300px] flex flex-col gap-10 py-6 pr-4">
            {/* Progress Area */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-56 h-56 flex items-center justify-center">
                {/* Outer ring */}
                <div className="absolute w-[190px] h-[190px] rounded-full border-[5px] border-pink-500/60 shadow-[0_0_20px_rgba(236,72,153,0.7),inset_0_0_15px_rgba(236,72,153,0.5)]" />
                <div className="absolute w-[180px] h-[180px] rounded-full border-[4px] border-white" />
                <div className="absolute w-[174px] h-[174px] rounded-full border-[5px] border-pink-500/70" />

                {/* Main yellow ring */}
                <div className="w-[160px] h-[160px] rounded-full border-[8px] border-yellow-400 flex items-center justify-center ">
                  {/* Inner thin ring */}
                  <div className="absolute w-[140px] h-[140px] rounded-full border-[4px] border-[#FFBC2B]" />

                  {/* Center text */}
                  <span className="text-4xl text-white font-semibold">
                    {progress}
                    <span className="text-2xl opacity-60 ml-1">%</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenFacecardPreview?.()}
                className="w-[80%] py-6 border-2 border-b-4 border-white/40 rounded-xl flex items-center justify-center gap-3 hover:bg-white/5 transition font-bold tracking-widest uppercase text-xs"
              >
                <span className="text-xl">
                  <img src="/eye.svg" alt="" />
                </span>
                <span className="text-xs font-bold tracking-widest text-white">
                  Facecard
                </span>
              </button>
            </div>

            {/* Music Section */}
            <div
              onClick={() => setShowSelector("music")}
              className="flex-1 flex flex-col items-center gap-6 relative 0  meeting now group"
            >
              {user?.musicPreference ? (
                <div className="absolute -right-16  z-20 -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    <div className="absolute bottom-10 -left-4 w-16 h-[2px] bg-white/40  origin-left"></div>
                    <div className="absolute  -left-8  rotate-25 w-[2px] h-18 z-10  bg-white/40 mt-9"></div>
                    <div className="absolute -bottom-8 right-[7.5rem] w-3 h-3 bg-white/40 rounded-full"></div>
                  </div>
                </div>
              ) : (
                <div className="absolute -right-16  -translate-y-1/2">
                  <div className="relative w-20 h-20">
                    <div className="absolute bottom-10 -left-1 w-16 h-[2px] bg-white/40 -rotate-[25deg] origin-left"></div>
                    <div className="absolute  -left-1 w-[2px] top-10 h-12 bg-white/40"></div>
                    <div className="absolute -bottom-5 right-[77px] w-3 h-3 bg-white/40 rounded-full"></div>
                  </div>
                </div>
              )}

              <div className="relative w-32 sm:w-36 md:w-44 aspect-square flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-white/20" />

                <div className="absolute inset-2 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl bg-black animate-spin-slow flex items-center justify-center">
                  {user?.musicPreference?.albumArtUrl ? (
                    <img
                      src={user.musicPreference.albumArtUrl}
                      className="w-full h-full object-cover rounded-full"
                      alt="Album Art"
                    />
                  ) : (
                    <span className="text-6xl opacity-20 text-white">+</span>
                  )}
                </div>

                <div className="absolute w-6 h-6 rounded-full bg-black border border-white/20 flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-white/40"></div>
                </div>
              </div>

              
              <div className="relative w-full py-6 flex justify-center">
                <div className="relative px-1 w-48 py-4 text-center text-white">
                  <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/60" />
                  <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/60" />
                  <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/60" />
                  <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/60" />

                  <p className="text-[12px]  text-center font-outfit items-center justify-center">
                    {user?.musicPreference?.name ||
                      user?.musicPreference?.songName ||
                      "Select Song"}
                  </p>
                  <p className="text-[12px] text-center   font-outfit">
                    {user?.musicPreference?.artist ||
                      user?.musicPreference?.artistName ||
                      "Spotify"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-1 opacity-70">
                {[...Array(36)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-white rounded-full"></div>
                ))}
              </div>
            </div>
          </div>


        </div>
      </div>

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
      `}</style>
    </div>
  );
}





 