"use client";

import Image from "next/image";

export default function AccountTab({
  user,
  firstName,
  progress,
  zodiac,
  interestIndex,
  causeIndex,
  interests,
  causes,
  photoUploading,
  handleSlotClick,
  setShowSelector,
  onPickZodiac,
  onOpenFacecardPreview,
  setView,
}) {
  return (
    <div className="w-full min-h-[75vh] flex flex-col">
      <div className="h-full flex items-center justify-center">
        <div className="flex border border-white/30 rounded-[2.5rem] w-full flex-col gap-5 p-10 relative z-10 h-full">
          {/* TOP ROW: Close, Name Box, Progress */}
          <div className="grid grid-cols-12 gap-2 items-center px-2 mt-2 mt-4 ">
            <div className="col-span-2">
              <button
                onClick={() => setView("success")}
                className="w-9 h-9 rounded-full border border-white/50 flex items-center justify-center text-md hover:bg-white/10 transition-all active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="col-span-6 flex justify-center">
              <div className="relative px-6 py-1 min-w-[140px] h-[42px]">
                <span className="absolute top-0 left-0 w-3 h-3 border-t-1 border-l-1 border-white/50"></span>
                <span className="absolute top-0 right-0 w-3 h-3 border-t-1 border-r-1 border-white/50"></span>
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b-1 border-l-1 border-white/50"></span>
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b-1 border-r-1 border-white/50"></span>
                <div className="flex flex-col justify-center h-full">
                  <h2 className="text-[12px] text-white">{firstName}</h2>
                  <p className="text-[10px] font-outfit text-white">
                    UserID:{user?.id?.slice(0, 8) || "4heu24sds"}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-4 row-span-2 flex justify-center items-center">
              <div className="relative w-[120px] h-[120px] flex items-center justify-center">
                <div className="absolute w-[104px] h-[104px] rounded-full border-[2px] border-pink-500/60 border-b-4" />
                <div className="absolute w-[100px] h-[100px] rounded-full border-[2px] border-white" />
                <div className="absolute w-[96px] h-[96px] rounded-full border-[2px] border-pink-500/60" />
                <div className="w-[88px] h-[88px] rounded-full border-[5px] border-yellow-400 flex items-center justify-center border-b-4">
                  <div className="absolute w-[75px] h-[75px] rounded-full border-[3px] border-[#FFBC2B]" />
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
                <div>
                  <p className="text-[10px] uppercase text-white">
                    DOB :{" "}
                    {user?.dateOfBirth
                      ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
                      : "22/08/1998"}
                  </p>
                  <p className="text-[10px] font-thin text-white">
                    Zodiac : {zodiac?.name || "Gemini"}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-3 flex justify-center mt-1">
              <button
                onClick={onPickZodiac || (() => setShowSelector("zodiacs"))}
                className="w-12 h-12 border border-white/40 border-b-[3px] rounded-[10.986px] flex items-center justify-center text-4xl text-white hover:bg-white/5 transition"
              >
                {zodiac?.imageUrl ? (
                  <img
                    src={zodiac.imageUrl}
                    className="h-[20px] w-[20px] object-contain brightness-0 invert"
                    alt="zodiac"
                  />
                ) : (
                  <span className="opacity-40 text-2xl">+</span>
                )}
              </button>
            </div>

            <div className="col-span-5 mt-1">
              <div className="relative px-6 py-1 min-w-[140px] h-[42px]">
                <span className="absolute top-0 left-0 w-3 h-3 border-t-1 border-l-1 border-white/50"></span>
                <span className="absolute top-0 right-0 w-3 h-3 border-t-1 border-r-1 border-white/50"></span>
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b-1 border-l-1 border-white/50"></span>
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b-1 border-r-1 border-white/50"></span>
                <div>
                  <p className="text-[10px] opacity-60 text-white">Gender Identity</p>
                  <p className="text-[10px] text-white">{user?.gender}</p>
                </div>
              </div>
            </div>

            <div className="col-span-3 flex flex-col gap-4 mt-2">
              <div className="flex justify-center">
                <button className="w-12 h-12 border border-white/40 border-b-[3px] rounded-[10.986px] flex items-center justify-center text-xl text-white">
                  {user?.gender === "MALE" ? "♂" : user?.gender === "FEMALE" ? "♀" : "⚧"}
                </button>
              </div>
            </div>

            <div className="col-span-4 flex justify-center items-center">
              <button
                onClick={() => onOpenFacecardPreview?.()}
                className="w-full py-2 px-1 border border-white/40 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
              >
                <span className="text-xl">
                  <img src="/eye.svg" alt="" />
                </span>
                <span className="text-xs font-bold tracking-widest text-white">Facecard</span>
              </button>
            </div>
          </div>

          {/* Action Rows */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-black tracking-wide">Interests</span>
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setShowSelector("interests")}
                  className="w-28 h-8 border border-white/40 rounded-full px-4 flex items-center justify-center text-[11px] overflow-hidden"
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
                  className="w-8 h-8 border border-white/60 border-b-2 rounded-xl text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-black tracking-wide">Causes</span>
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setShowSelector("values")}
                  className="w-28 h-8 border border-white/40 rounded-full px-4 flex items-center justify-center text-[11px] overflow-hidden"
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
                  className="w-8 h-8 border border-white/60 rounded-xl border-b-2 text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-black tracking-wide">Brands</span>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                {[0, 1, 2, 3, 4].map((i) => {
                  const selection = user?.brandPreferences?.[i];
                  return (
                    <div
                      key={i}
                      onClick={() => setShowSelector("brands")}
                      className="w-8 h-8 shrink-0 border-2 border-white/40 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10"
                    >
                      {selection ? (
                        <img src={selection.brand?.logoUrl} className="w-7 h-7 rounded-full object-contain" alt="brand" />
                      ) : (
                        <span className="opacity-40 text-xl">+</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Photo Slots */}
          <div className="relative group">
            {photoUploading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                <div className="h-8 w-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={() => handleSlotClick(0)}
                className="w-full aspect-[4/5] border-2 border-white/50 rounded-[1rem] overflow-hidden relative shadow-2xl"
              >
                <img src={user?.displayPictureUrl || "/imageprofile.png"} className="w-full h-full object-cover" alt="dp" />
                <div className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-black text-[10px]">✎</div>
              </div>
              {[0, 1].map((idx) => {
                const photo = user?.photos?.find((p) => p.order === idx);
                return (
                  <div
                    key={idx}
                    onClick={() => handleSlotClick(idx + 1)}
                    className="w-full border-2 border-white/20 rounded-[1rem] flex items-center justify-center relative overflow-hidden bg-white/5"
                  >
                    {photo ? (
                      <img src={photo.url} className="w-full h-full object-cover" alt={`photo-${idx}`} />
                    ) : (
                      <div className="w-8 h-8 border-2 border-white/60 rounded-full flex items-center justify-center text-3xl opacity-40">+</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full flex items-center justify-between mb-4 ">
            <div className="flex items-center gap-5">
              <div
                onClick={() => setShowSelector("music")}
                className="relative active:scale-95 transition"
              >
                <div className={`w-18 h-18 rounded-full border border-white/20 flex items-center justify-center border-white border-2 ${user?.musicPreference ? "bg-black" : "bg-white/5"}`}>
                  <div className={`w-18 h-18 rounded-full overflow-hidden flex items-center justify-center ${user?.musicPreference ? "animate-spin-slow" : ""}`}>
                    {user?.musicPreference?.albumArtUrl ? (
                      <img src={user.musicPreference.albumArtUrl} className="w-full h-full object-cover" alt="Album Art" />
                    ) : (
                      <span className="text-4xl opacity-20 text-white">+</span>
                    )}
                  </div>
                  <div className="absolute w-4 h-4 rounded-full bg-black border border-white/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white/30"></div>
                  </div>
                </div>
              </div>
              <div className="relative px-6 py-1 min-w-[60px]">
                <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/50"></span>
                <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/50"></span>
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/50"></span>
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/50"></span>
                <div className="inline-flex flex-col justify-end items-start">
                  <p className="text-white text-[10px] leading-tight">{user?.musicPreference?.name || user?.musicPreference?.songName || "Select Song"}</p>
                  <p className="text-white/60 text-[10px] text-center">{user?.musicPreference?.artist || user?.musicPreference?.artistName || "Spotify"}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2 opacity-30">
              {[...Array(42)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-white rounded-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
