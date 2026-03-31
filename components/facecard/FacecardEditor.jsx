'use client';
import React, { useState, useEffect } from 'react';

export default function FacecardEditor({
  user,
  firstName,
  zodiac,
  setView,
  handleSlotClick,
  setShowSelector,
  onPickZodiac,
  progress,
  fileInputRef,
  handleFileChange,
  onOpenFacecardPreview,
  photoUploading = false,
}) {
  const [interestIndex, setInterestIndex] = useState(0);
  const [causeIndex, setCauseIndex] = useState(0);
  const interests = user?.interests?.map(i => i.interest?.name || i.name).filter(Boolean) || [];
  const causes = user?.values?.map(v => v.value?.name || v.name).filter(Boolean) || [];

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
      className="relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden p-0 text-white outfit-font md:p-4"
      style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* --- MOBILE VIEW (Matches Screenshot) --- */}
      
<div className=" p-2  ">
  <div className="flex border border-white/60 rounded-[2rem] w-full flex-col overflow-y-auto px-4  gap-6  relative z-10">
        
        {/* TOP ROW: Close, Name Box, Progress */}
        <div className="grid grid-cols-12 gap-2 items-center px-2 mt-2">
          {/* Close Button */}


     
          <div className="col-span-2">
            <button
              onClick={() => setView('success')}
              className="w-9 h-9 rounded-full border border-white/50 flex items-center justify-center text-md hover:bg-white/10 transition-all active:scale-95"
            >✕</button>
          </div>

          {/* Name Box with Brackets */}
          <div className="col-span-6 flex justify-center">
            <div className="relative px-6 py-1 min-w-[140px]">
              <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/50"></span>
              <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/50"></span>
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/50"></span>
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/50"></span>
              <div className="flex flex-col text-start">
                <h2 className="text-xl  tracking-tight text-white">{firstName}</h2>
                <p className="text-[10px] opacity-40 uppercase tracking-[0.2em] font-mono text-white">
                  UserID:{user?.id?.slice(0, 8) || '4heu24sds'}
                </p>
              </div>
            </div>
          </div>


       
<div className="col-span-4 row-span-2 flex justify-center items-center">
  <div className="relative w-28 h-28">

    <div className="absolute inset-0 rounded-full border-[8px] border-yellow-400 opacity-20 blur-md animate-pulse" />
    <div className="absolute inset-0 rounded-full border-2 border-white/10" />

    <svg className="w-full h-full" viewBox="0 0 100 100">
      <circle
        className="text-white/5"
        strokeWidth="6"
        cx="50"
        cy="50"
        r="42"
        fill="transparent"
        stroke="currentColor"
      />
      <circle
        className="text-yellow-400"
        strokeWidth="10"
        strokeLinecap="round"
        cx="50"
        cy="50"
        r="42"
        fill="transparent"
        stroke="currentColor"
        strokeDasharray="264"
        strokeDashoffset={264 - (264 * (progress / 100))}
        transform="rotate(-90 50 50)"
      />
    </svg>

    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-2xl font-black text-white">
        {progress}<span className="text-sm opacity-60">%</span>
      </span>
    </div>

  </div>
</div>


   <div className="col-span-5 mt-2">
            <div className="relative  px-4 h-14 flex flex-col justify-center">
              <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/30"></span>
              <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/30"></span>
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/30"></span>
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/30"></span>
              
              <div className="space-y-1">
                <p className="text-xs uppercase  opacity-60 text-white">DOB : {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("en-GB") : "22/08/1998"}</p>
                <p className="text-xs font-thin  text-white">Zodiac : {zodiac?.name || 'Gemini'}</p>
              </div>
            </div>
          </div>

          <div className="col-span-3 flex justify-center mt-2">
            <button
              onClick={onPickZodiac || (() => setShowSelector('zodiacs'))}
              className="w-16 h-16 border-2 border-white/40 border-b-4 rounded-2xl flex items-center justify-center text-4xl text-white"
            >
              {user?.zodiac?.imageUrl ? <img src={user.zodiac.imageUrl} className="h-10 w-10 object-contain" /> : zodiac?.symbol}
            </button>
          </div>



          <div className="col-span-5 mt-2">
            <div className="relative px-6 py-6 h-14 flex flex-col justify-center">
              <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/30"></span>
              <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/30"></span>
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/30"></span>
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/30"></span>
              
              <div className="space-y-1">
                <p className="text-xs  opacity-60 text-white">Gender Identity</p>
                <p className="text-xs  text-white">{user?.gender || "Female"}</p>
              </div>
            </div>
          </div>

          {/* Gender Icon + Facecard Button Column */}
          <div className="col-span-3 flex flex-col gap-4 mt-2">
            <div className="flex justify-center">
              <button
                className="w-16 h-16 border-2 border-white/40 border-b-4 rounded-2xl flex items-center justify-center text-4xl text-white"
              >
                {user?.gender === 'MALE' ? '♂' : user?.gender === 'FEMALE' ? '♀' : '⚧'}
              </button>
            </div>
            
            
          </div>



<div className="col-span-4 flex justify-center items-center">

     <button
              onClick={() => onOpenFacecardPreview?.()}
              className="w-full py-4 px-2 border-2 border-white/40 rounded-2xl flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
            >
              <span className="text-xl">👁</span>
              <span className="text-xs font-bold  tracking-widest text-white">Facecard</span>
            </button> 

         </div>
         </div>
          
  

        {/* MIDDLE SECTION: DOB/Zodiac Box + Zodiac Icon */}
      

        {/* BOTTOM SECTION: Gender Box, Gender Icon, Facecard Button */}
   
        {/* Action Rows: Interests, Causes, Brands */}
        <div className="flex flex-col gap-5">
          {/* Interests */}
       <div className="flex items-center justify-between gap-3">

  {/* LEFT → Label */}
  <span className="text-[12px] font-black  tracking-wide">
    Interests
  </span>

  {/* RIGHT → Box + Button */}
  <div className="flex items-center gap-3">

    <div
      onClick={() => setShowSelector('interests')}
      className="w-48 h-12 border border-white/40 rounded-full px-4 flex items-center justify-center text-[11px] cursor-pointer overflow-hidden"
    >
      {interests.length > 0 ? (
        <div key={interestIndex} className="animate-slide-down">
          {interests[interestIndex]}
        </div>
      ) : (
        'Select'
      )}
    </div>

    <button
      onClick={() => setShowSelector('interests')}
      className="w-12 h-12 border border-white/60 border-b-2 rounded-xl text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition"
    >
      +
    </button>

  </div>

</div>

       <div className="flex items-center justify-between gap-3">

  {/* LEFT → Label */}
  <span className="text-[12px] font-black  tracking-wide">
    Causes
  </span>

  {/* RIGHT → Box + Button */}
  <div className="flex items-center gap-3">

    <div
      onClick={() => setShowSelector('values')}
      className="w-48 h-12 border border-white/40 rounded-full px-4 flex items-center justify-center text-[11px] cursor-pointer overflow-hidden"
    >
      {causes.length > 0 ? (
        <div key={causeIndex} className="animate-slide-down italic">
          {causes[causeIndex]}
        </div>
      ) : (
        'Select'
      )}
    </div>

    <button
      onClick={() => setShowSelector('values')}
      className="w-12 h-12 border border-white/60 rounded-xl border-b-2 text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition"
    >
      +
    </button>

  </div>

</div>

          {/* Brands */}
<div className="flex items-center justify-between gap-3">

  {/* LEFT → Label */}
  <span className="text-[12px] font-black  tracking-wide">
    Brands
  </span>

  {/* RIGHT → Icons */}
  <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">

    {[0, 1, 2, 3, 4].map(i => {
      const selection = user?.brandPreferences?.[i];
      return (
        <div
          key={i}
          onClick={() => setShowSelector('brands')}
          className="w-11 h-11 shrink-0 border-2 border-white/40 rounded-full flex items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10"
        >
          {selection
            ? <img src={selection.brand?.logoUrl} className="w-10 h-10 rounded-full object-contain" />
            : <span className="opacity-40 text-xl">+</span>}
        </div>
      )
    })}

  </div>

</div>


        </div>




        {/* Photo Slots Section */}
       <div className="relative group">
  {photoUploading && (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
      <div className="h-10 w-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )}

  <div className="grid grid-cols-3 gap-4">

    {/* Photo 1 (DP) */}
    <div
      onClick={() => handleSlotClick(0)}
      className="w-full h-[160px] border-2  border-white/50 rounded-[1rem] overflow-hidden relative shadow-2xl"
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
      const photo = user?.photos?.find(p => p.order === idx);
      return (
        <div
          key={idx}
          onClick={() => handleSlotClick(idx + 1)}
          className="w-full h-[160px] border-2 border-white/20 rounded-[1rem] flex items-center justify-center relative overflow-hidden bg-white/5"
        >
          {photo ? (
            <img src={photo.url} className="w-full h-full object-cover" />
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
       
       


       
       
       <div className="w-full flex items-center justify-between  mb-4 ">

  {/* LEFT: Album + Info */}
  <div className="flex items-center gap-5">

    {/* Album */}
    <div
      onClick={() => setShowSelector('music')}
      className="relative cursor-pointer active:scale-95 transition"
    >
      <div className="w-28 h-28 rounded-full border border-white/20 flex items-center justify-center border rounded-full border-white border-2">

        <div className="w-28 h-28 rounded-full overflow-hidden animate-spin-slow ">
          <img
            src={user?.musicPreference?.albumArtUrl || "/spotify1.png"}
            className="w-full h-full object-cover"
          />
        </div>

        {/* center dot */}
        <div className="absolute w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white/30"></div>
        </div>

      </div>
    </div>



    <div className="relative px-6 py-3 min-w-[140px]">
              <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/50"></span>
              <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/50"></span>
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/50"></span>
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/50"></span>
    {/* Text */}
    <div className="flex flex-col">
      
      <p className="text-white text-xs leading-tight">
        {user?.musicPreference?.name || "Starboy"}
      </p>
      <p className="text-white/60 text-xs">
        {user?.musicPreference?.artist || ""}
      </p>
    </div>
    </div>

  </div>

  {/* RIGHT: Dots */}
  <div className="grid grid-cols-6 gap-2 opacity-30">
    {[...Array(48)].map((_, i) => (
      <div key={i} className="w-1 h-1 bg-white rounded-full"></div>
    ))}
  </div>

</div>





        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>
</div>

      {/* --- DESKTOP VIEW (Original Scaled Design) --- */}
      <div className="relative hidden md:flex max-h-full min-h-0 w-full max-w-[1150px] origin-center scale-[0.62] flex-col gap-4 overflow-hidden rounded-[3rem] border-2 border-white/60 p-3 sm:scale-[0.72] md:scale-90 md:flex-row md:gap-6 md:rounded-[4rem] md:p-5 lg:scale-100">

        {/* Main Editor UI */}
        <div className="flex-1 border border-2 border-white/40 rounded-[3.5rem] p-8 relative flex flex-col gap-10">

          {/* Top Header Row */}
          <div className="flex items-start gap-6 ">

            {/* Left: Back + Vertical Name */}
            <div className="relative flex flex-col items-start ">

              {/* Back Button */}
              <button
                onClick={() => setView('success')}
                className="w-14 h-14 rounded-full border border-white/80 flex items-center justify-center hover:bg-white/10 transition"
              >
                <span className="text-2xl mb-1">←</span>
              </button>

              {/* Vertical Name Wrapper */}
              <div className="relative h-[264px] w-[70px] flex items-center justify-center">

                {/* Rotated content */}
                <div className="absolute rotate-[-90deg] whitespace-nowrap px-12 py-2 relative">

                  {/* Corner brackets */}
                  <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/60"></span>
                  <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/60"></span>
                  <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/60"></span>
                  <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/60"></span>

                  <h2 className="text-3xl font-black tracking-wide uppercase leading-none text-center">
                    {firstName}
                  </h2>

                  <p className="text-[11px] opacity-40 font-mono tracking-widest uppercase mt-1 text-center">
                    USERID: {user?.id?.slice(0, 8)}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Photo Slots */}
            <div className="relative flex gap-4 justify-center">
              {photoUploading && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-[2.5rem] bg-black/55 backdrop-blur-sm">
                  <div className="h-10 w-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/90">Uploading &amp; saving…</p>
                </div>
              )}

              {/* Slot 1 */}
              <div
                onClick={() => handleSlotClick(0)}
                className={`w-[200px] h-[300px] border-b-6 rounded-[2.5rem] border border-2 border-white/50 overflow-hidden relative ${photoUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'
                  }`}
              >
                <img
                  src={user?.displayPictureUrl || "/imageprofile.png"}
                  className="w-full h-full object-cover"
                  alt="Photo 1"
                />
                <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm shadow-lg">
                  ✎
                </button>
              </div>

              {/* Slot 2 (Photo Order 0) */}
              <div
                onClick={() => handleSlotClick(1)}
                className={`w-[200px] border-b-6 h-[300px] border-white/50 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center relative overflow-hidden bg-white/5 transition-colors ${photoUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:bg-white/10'
                  }`}
              >
                {user?.photos?.find(p => p.order === 0)?.url ? (
                  <img src={user.photos.find(p => p.order === 0).url} className="w-full h-full object-cover" alt="Photo 2" />
                ) : (
                  <span className="text-5xl opacity-60 border border-4 border-white/80 rounded-full px-3">+</span>
                )}
              </div>

              {/* Slot 3 (Photo Order 1) */}
              <div
                onClick={() => handleSlotClick(2)}
                className={`w-[200px] border-b-6 h-[300px] border-white/50 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center relative overflow-hidden bg-white/5 transition-colors ${photoUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:bg-white/10'
                  }`}
              >
                {user?.photos?.find(p => p.order === 1)?.url ? (
                  <img src={user.photos.find(p => p.order === 1).url} className="w-full h-full object-cover" alt="Photo 3" />
                ) : (
                  <span className="text-5xl opacity-60 border border-4 border-white/80 rounded-full px-3">+</span>
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
          <div className="grid grid-cols-10 gap-10 items-center">

            {/* DOB & Gender Text Labels */}
            <div className="col-span-3 space-y-14">

              {/* DOB + Zodiac */}
              <div className="relative px-5 py-5">
                <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></span>
                <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></span>
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></span>
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></span>

                <p className="text-[9px] uppercase tracking-widest opacity-80">
                  DOB : {user?.dateOfBirth
                    ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
                    : "22/08/1998"}
                </p>
                <p className="text-[9px] uppercase tracking-widest opacity-80 mt-1">
                  Zodiac : {zodiac?.name}
                </p>
              </div>

              {/* Gender */}
              <div className="relative px-4 py-5">
                <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></span>
                <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></span>
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></span>
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></span>

                <p className="text-[9px] uppercase tracking-widest opacity-80">
                  Gender Identity
                </p>
                <p className="text-[9px] uppercase tracking-widest opacity-80 mt-1">
                  {user?.gender || "Female"}
                </p>
              </div>

              {/* Brands */}
              <div className="relative px-4 py-5">
                <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></span>
                <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></span>
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></span>
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></span>

                <p className="text-[9px] font-bold uppercase tracking-widest">
                  Brands
                </p>
                <p className="text-[9px] uppercase tracking-tight opacity-50 mt-1">
                  Can&apos;t live w/o &#39;em
                </p>
              </div>
            </div>

            {/* Icon Pills & Brand Grid */}
            <div className="col-span-7 space-y-12 mb-2">

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof onPickZodiac === 'function') onPickZodiac();
                    else setShowSelector('zodiacs');
                  }}
                  className="w-20 h-20 rounded-2xl border border-white/80 flex items-center justify-center shadow-inner overflow-hidden hover:bg-white/5 transition"
                  aria-label="Change zodiac"
                >
                  {user?.zodiac?.imageUrl ? (
                    <img src={user.zodiac.imageUrl} alt={user.zodiac.name || 'Zodiac'} className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-4xl">{zodiac?.symbol}</span>
                  )}
                </button>

                <div
                  onClick={() => setShowSelector('interests')}
                  className="flex-1 h-16 rounded-full border border-white/60 px-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition overflow-hidden"
                >
                  <span className="text-sm opacity-60 tracking-wide">Interests:</span>
                  <div className="flex-1 flex justify-end overflow-hidden">
                    {interests.length > 0 ? (
                      <span key={interestIndex} className="text-sm opacity-90 truncate max-w-[150px] animate-slide-down">
                        {interests[interestIndex]}
                      </span>
                    ) : (
                      <span className="text-sm opacity-90">Basketball, Music...</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowSelector('interests')}
                  className="w-18 h-18 rounded-2xl border border-white/80 flex items-center justify-center text-3xl transition hover:bg-white/10"
                >+</button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border border-white/80 flex items-center justify-center text-3xl shadow-inner">
                  {user?.gender === 'MALE' ? '♂' : user?.gender === 'FEMALE' ? '♀' : '⚧'}
                </div>

                <div
                  onClick={() => setShowSelector('values')}
                  className="flex-1 h-16 rounded-full border border-white/50 px-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition overflow-hidden"
                >
                  <span className="text-sm opacity-60 tracking-wide">Causes:</span>
                  <div className="flex-1 flex justify-end overflow-hidden">
                    {causes.length > 0 ? (
                      <span key={causeIndex} className="text-sm opacity-90 italic truncate max-w-[150px] animate-slide-down">
                        {causes[causeIndex]}
                      </span>
                    ) : (
                      <span className="text-sm opacity-90 italic">Environment, Equality...</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowSelector('values')}
                  className="w-18 h-18 rounded-2xl border border-white/80 flex items-center justify-center text-3xl transition hover:bg-white/10"
                >+</button>
              </div>

              {/* Brand Icons Row */}
              <div className="flex gap-6 mt-5  scrollbar-hide">
                {[0, 1, 2, 3, 4].map(i => {
                  const selection = user?.brandPreferences?.[i];
                  return (
                    <div
                      key={i}
                      onClick={() => setShowSelector('brands')}
                      className={`relative w-20 h-20 rounded-2xl border border-2 border-b-6 border-white/50 flex items-center justify-center shadow-inner cursor-pointer transition-all hover:scale-105 ${selection ? 'bg-white/10' : 'bg-transparent'}`}
                    >
                      {selection && (
                        selection.brand?.logoUrl ? (
                          <img
                            src={selection.brand.logoUrl}
                            alt={selection.brand.name}
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <span className="text-white font-bold text-xl">
                            {selection.brand?.name?.slice(0, 2)}
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>


            </div>

            
          </div>
        </div>

        {/* Right Side Info Col */}
        <div className="w-72 flex flex-col gap-10 py-6 pr-4">

          {/* Progress Area */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 rounded-full border-[10px] border-white/5"></div>
              <div className="absolute inset-0 rounded-full border-[12px] border-yellow-400 opacity-20 blur-xl scale-110"></div>

              <svg className="w-full h-full drop-shadow-[0_0_15px_rgba(255,200,0,0.5)]" viewBox="0 0 100 100">
                <circle className="text-white/10" strokeWidth="6" cx="50" cy="50" r="44" fill="transparent" stroke="currentColor"></circle>
                <circle
                  className="text-yellow-400 transition-all duration-1000"
                  strokeWidth="8"
                  strokeLinecap="round"
                  cx="50"
                  cy="50"
                  r="44"
                  fill="transparent"
                  stroke="currentColor"
                  strokeDasharray="276"
                  strokeDashoffset={276 - (276 * (progress / 100))}
                  transform="rotate(-90 50 50)"
                ></circle>
              </svg>

              <div className="absolute inset-0 flex items-end justify-center mb-18">
                <span className="text-5xl font-black text-white/90">{progress}<span className="text-xl opacity-40 ml-1">%</span></span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenFacecardPreview?.()}
              className="w-full py-4 border-2 border-white/30 rounded-3xl flex items-center justify-center gap-3 hover:bg-white/5 transition font-bold tracking-widest uppercase text-xs"
            >
              <span className="text-lg">👁</span> Facecard
            </button>
          </div>

          {/* Music Section */}
          <div
            onClick={() => setShowSelector('music')}
            className="flex-1 flex flex-col items-center gap-6 relative cursor-pointer group"
          >
            <div className="relative w-44 h-44">
              <div className="absolute inset-0 rounded-full border-[3px] border-white/20 animate-spin-slow"></div>
              <div className="absolute inset-2 rounded-full overflow-hidden animate-spin-slow border-2 border-white/10 shadow-2xl">
                <img
                  src={user?.musicPreference?.albumArtUrl || "/spotify1.png"}
                  className="w-full h-full object-cover rounded-full opacity-90 group-hover:opacity-100 transition-opacity"
                  alt="Album Art"
                />
              </div>
              <div className="absolute inset-[4.5rem] bg-black/40 rounded-full border border-white/20 z-10 flex items-center justify-center shadow-inner backdrop-blur-md">
                <div className="w-4 h-4 rounded-full bg-white/20 border border-white/40"></div>
              </div>
            </div>

            <div className="relative w-full py-6 flex justify-center">
              <div className="relative px-16 py-4 text-center text-white">
                <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/60" />
                <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/60" />
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/60" />
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/60" />

                <p className="text-sm font-medium">{user?.musicPreference?.name || user?.musicPreference?.songName || 'Select Song'}</p>
                <p className="text-xs opacity-60">{user?.musicPreference?.artist || user?.musicPreference?.artistName || 'Spotify'}</p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-1 opacity-70">
              {[...Array(36)].map((_, i) => <div key={i} className="w-1 h-1 bg-white rounded-full"></div>)}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          0% { opacity: 0; transform: translateY(-20px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(20px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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





