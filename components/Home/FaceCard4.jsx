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

const FaceCard4 = ({
  user,
  hideArrows,
  currentIndex,
  onIndexChange,
  hideHeader,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);

  if (!user) return null;

  const hideFacecardAge = Boolean(user.hideFacecardAge);
  const age = user.age ?? calculateAge(user.dateOfBirth);
  const rawCity = user.city || user.preferredCity || "Unknown";
  const city = (!rawCity || rawCity === 'ANYWHERE_IN_INDIA' || rawCity === 'Anywhere')
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
        <div className="absolute left-0 top-4 z-20 flex w-full items-center justify-between px-5 hidden md:flex">
          <div>
            <h1 className="text-[18px] font-semibold text-[#FFB800] text-start">
              {user.username || "User"}
              {!hideFacecardAge && (
                <>
                  {" "}
                  <span
                    className="font-sm text-transparent  px-2 py-0.5 rounded-full"
                    style={{ WebkitTextStroke: "0.7px white" }}
                  >
                    {age || "—"}
                  </span>
                </>
              )}
            </h1>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
              {/* <IoLocationOutline className="shrink-0" /> */}
              <span className="truncate font-outfit">{city}</span>
            </div>
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
            <span
              className="flex h-6 w-6 items-center justify-center text-white"
              title={isVideoOn ? "Video on" : "Video off"}
            >
              {isVideoOn ? (
                <IoVideocam className="h-5 w-5" />
              ) : (
                <IoVideocamOff className="h-5 w-5" />
              )}
            </span>
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
        className="w-[85vw] aspect-[360/670] max-w-[360px] 
                   sm:w-[340px] md:w-[320px] lg:w-[360px] 
                md:aspect-[366/660] shrink-0 rounded-[30px] 
                border border-white/40 p-[2px]
                md:border-0 md:p-0 mt-4 md:scale-90"
      >
        <div className="relative h-full w-full overflow-hidden rounded-[28px] ">
          {/* HEADER */}
          {!hideHeader && (
            <div className="absolute left-0 top-4 z-20 flex w-full items-center justify-between px-5 md:hidden">
              <div>
                <h1 className="text-[18px] font-semibold text-[#FFB800]">
                  {user.username || "User"}
                  {!hideFacecardAge && (
                    <>
                      {" "}
                      <span
                        className="font-sm text-transparent  px-2 py-0.5 rounded-full"
                        style={{ WebkitTextStroke: "0.7px white" }}
                      >
                        {age || "—"}
                      </span>
                    </>
                  )}
                </h1>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
                  <IoLocationOutline className="shrink-0" />
                  <span className="truncate">{city}</span>
                </div>
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
                <span
                  className="flex h-6 w-6 items-center justify-center text-white"
                  title={isVideoOn ? "Video on" : "Video off"}
                >
                  {isVideoOn ? (
                    <IoVideocam className="h-5 w-5" />
                  ) : (
                    <IoVideocamOff className="h-5 w-5" />
                  )}
                </span>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center text-white"
                >
                  <IoEllipsisVerticalSharp />
                </button>
              </div>
            </div>
          )}


          <div className="absolute bottom-0 left-1 right-1 top-[3.3rem] rounded-[34.46px] border border-white/45">
            {/* Intent */}
            <div className="absolute left-0 right-0 top-2 z-20 px-2">
              <div className="rounded-[29.1px] font-outfit border border-white/35 px-3 h-[90px] md:h-[115px] flex items-center justify-center text-center text-[10px] leading-snug text-white backdrop-blur-[2px]">
                <p className="line-clamp-3">
                  {user.intent || "Here to meet strangers and overthink later."}
                </p>
              </div>
            </div>

            {/* MAIN BODY — flex row: left sidebar + right image */}
            <div className="absolute bottom-2 left-0 right-2 top-[6.4rem]  md:top-[8.1rem] flex gap-1 md:gap-0">
              {/* LEFT SIDEBAR */}
              <div className="w-[26%] flex flex-col items-center gap-[6px] z-20">
                {/* Brands capsule */}
                <div className="flex w-fit max-w-[90px] flex-col items-center rounded-full border border-white/40 px-[10px] py-2 shadow-inner">
                  <div className="flex flex-col items-center gap-1">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const src = brandLogos[idx];
                      return (
                        <div
                          key={`brand-slot-${idx}`}
                          className="flex h-[2.8rem] w-[2.8rem] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 shadow-inner"
                        >
                          {src && (
                            <img
                              src={src}
                              className="h-full w-full object-cover object-center"

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
                      alt={user.zodiac.name || "Zodiac"}
                      className="h-8 w-10 object-contain"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center ">
                      <span className="text-[20px] leading-none text-white/30">
                        +
                      </span>
                    </div>
                  )}
                  <span className="mt-1 w-full break-words text-center text-[7px] font-semibold uppercase leading-tight tracking-wide text-white/75">
                    {user?.zodiac?.name}
                  </span>
                </div>

                {/* Music */}
                <div className="flex h-[125px] w-[80px] shrink-0 flex-col items-center  border border-white/40 rounded-t-[79.52px] rounded-b-[49.52px] px-1 pb-1 pt-2 shadow-inner backdrop-blur-sm">


                  <img src="/musicline.svg" alt="" className=" left-1 bottom-14 z-50 absolute   " />
                  <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-2 border-white/35 shadow-md">
                    {user.musicPreference ? (
                      <img
                        src={albumArt}
                        className="h-full w-full object-cover animate-spin-slow"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" />
                    )}
                  </div>


                  <div className="mt-2 h-px w-[90%] bg-white/30" />
                  <div className="mt-1.5 w-full px-0.5 text-center text-white">

                    <div className="marquee">
                      <p className="text-[9px] font-medium font-outfit leading-tight tracking-wide whitespace-nowrap">
                        {user.musicPreference ? songTitle : '\u00a0'}
                      </p>
                    </div>

                    <div className="marquee  mt-[1px]">
                      <p className="text-[9px]  marquee font-extralight font-outfit leading-tight text-white whitespace-nowrap">
                        {user.musicPreference ? artist : '\u00a0'}
                      </p>
                    </div>
                  </div>
                </div>


              </div>

              {/* RIGHT IMAGE */}
              <div className="flex-1 h-full overflow-hidden ">
                <img
                  src={allPhotos[activeIndex]}
                  className="h-full w-full object-cover rounded-[20px]"
                  alt=""
                />
              </div>


            </div>

            {/* Pagination */}
            <div className="absolute -bottom-2 left-0 right-0 z-20 flex justify-center gap-2">
              {allPhotos.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${idx === activeIndex ? "w-6 bg-white" : "w-2 bg-white/35"}`}
                />
              ))}
              {allPhotos.length === 1 && (
                <>
                  <div className="h-1 w-2 rounded-full bg-white/35" />
                  <div className="h-1 w-2 rounded-full bg-white/35" />
                </>
              )}
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

export default FaceCard4;


// "use client";

// import { useState } from "react";
// import FaceCard from "@/components/Home/FaceCard";
// import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
// import { getFacecardPhotos } from "@/lib/facecard-utils";

// export default function FacecardDisplay({ user, age, setView, router }) {
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const allPhotos = getFacecardPhotos(user);

//   const handlePrev = (e) => {
//     e?.stopPropagation();
//     setCurrentImageIndex((prev) =>
//       prev > 0 ? prev - 1 : allPhotos.length - 1,
//     );
//   };

//   const handleNext = (e) => {
//     e?.stopPropagation();
//     setCurrentImageIndex((prev) =>
//       prev < allPhotos.length - 1 ? prev + 1 : 0,
//     );
//   };

//   return (
//     <div
//       className="flex min-h-screen  w-full flex-col  text-white outfit-font overflow-hidden  "
//       style={{
//         backgroundImage: "url('/assets/mb.jpg')",
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         repeat: "repeat"
//       }}
//     >
//       <div
//         className=" flex w-full flex-1 flex-col gap-3 px-3 py-3 
//                       sm:px-4 md:flex-row md:gap-4 md:px-6 lg:gap-6 xl:gap-10"
//       >


//         {/* LEFT — phone preview area */}
//         <div
//           className="flex md:flex-1 flex-col items-center justify-center md:justify-center
//                        md:min-h-0
//                       md:overflow-visible
                      
//                       md:border md:border-white/30 md:rounded-[60px] 
//                         sm:px-4 "
//         >
//           <div
//             className="flex w-full flex-col items-center text-center 
//                        md:flex-1 justify-center 
//                         md:mt-0
//                          md:scale-100 justify-between "
//           >
//             <div >
//               <p className="text-lg font-semibold sm:text-lg md:text-sm lg:text-base md:hidden ">
//                 This is Your FaceCard
//               </p>

//               <p className="text-[10px] sm:text-[14px] font-outfit md:text-[11px] font-thin  md:hidden">
//                 People will see this before meeting you <br />
//                 You can add more info to get better matches
//               </p>
//             </div>

//             {/* CARD */}
//             <div
//               className="w-full mx-auto flex justify-center 
//    max-[321px]:scale-65 max-[321px]:-translate-y-30
//       max-[340px]:scale-70 max-[340px]:-translate-y-28
//    max-[370px]:scale-75 max-[370px]:-translate-y-20
//   max-[390px]:scale-78 max-[390px]:-translate-y-18
//   max-[403px]:scale-83 max-[403px]:-translate-y-[7vh]
//  max-[405px]:scale-85 max-[405px]:-translate-y-[10vh]




//    max-[416px]:scale-88 max-[416px]:-translate-y-8


//       max-[440px]:scale-98 max-[440px]:-translate-y-2"

//             >
//               <FaceCard
//                 user={{
//                   ...user,
//                   age,
//                   city: user?.preferredCity || user?.city,
//                 }}
//                 currentIndex={currentImageIndex}
//                 onIndexChange={setCurrentImageIndex}
//               />
//             </div>

//             {/* MOBILE BUTTONS */}

//             <div className="flex absolute w-full px-6 justify-center gap-4 mx-auto md:hidden bottom-[1vh]  ">


//               <button
//                 onClick={() => router.push("/")}
//                 className="rounded-full w-full px-6 py-4 text-[12px] sm:text-sm  border border-white/30 transition hover:bg-yellow-400 hover:text-black whitespace-nowrap"
//               >
//                 Later 🥱
//               </button>

//               <button
//                 onClick={() => setView("editor")}
//                 className="rounded-full px-6 py-4 w-full text-[12px] sm:text-sm  border border-white/30 transition hover:bg-yellow-400 hover:text-black whitespace-nowrap"
//               >
//                 Add Info More 😤
//               </button>


//             </div>



//           </div>
//         </div>

//         {/* RIGHT — desktop info panel */}
//         <div
//           className="hidden md:flex flex-1 flex-col items-center justify-center text-center 
//                         rounded-[60px] border border-white/30 
//                         px-4 py-5 
//                         lg:px-6 lg:py-6 xl:px-10"
//         >
//           <h1 className="text-center justify-center text-white text-[36px] font-normal font-Otomanopee_One">
//             Meet your Facecard
//           </h1>

//           <p className="mt-3 max-w-md font-thin text-xs md:text-[20px] lg:text-xl text-white/90 font-outfit">
//             This is what people see before meeting you. Adding more details
//             makes it cooler and gets you better matches &amp; conversations.
//           </p>

//           <div className="w-full max-w-[400px] mt-20 space-y-3 md:space-y-7">
//             <button
//               onClick={() => setView("editor")}
//               className="w-full rounded-[18px] border-[2px] border-white/50 border-b-[4px] md:py-5 py-3 md:px-2 px-6 text-sm md:text-[18px] lg:text-[20px] font-semibold transition hover:bg-yellow-400 hover:text-black"
//             >
//               Make my Facecard cooler 😤
//             </button>

//             <button
//               onClick={() => router.push("/")}
//               className="text-xs md:text-[18px] text-white/90 hover:text-white"
//             >
//               I’ll do it later 🥱
//             </button>
//           </div>
//         </div>
//       </div>
//     </div >
//   );
// }