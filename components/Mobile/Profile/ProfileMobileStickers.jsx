"use client";

import Image from "next/image";

export default function ProfileMobileStickers({ 
  activeTab, 
  setActiveTab, 
  selectedSticker, 
  setSelectedSticker 
}) {
  return (
    <>
      {activeTab === "stickers" && (
        <div
          onClick={() => setActiveTab("main")}
          className="fixed inset-0 z-40 animate-in fade-in duration-300 "
        />
      )}

      <div
        className={`fixed bottom-0 w-full h-[62vh] bg-[#3D0075] rounded-[2.5rem] p-8 transition-transform duration-500 z-50 max-w-[400px] mx-auto ${
          activeTab === "stickers" ? "translate-y-0" : "translate-y-full"
        }`}
       style={{
  backgroundImage: `
    linear-gradient( rgba(0,0,0,0.2),  rgba(0,0,0,0.2)),
    url(/assets/mb.jpg)
  `,
  backgroundRepeat: "repeat",
  backgroundSize: "cover",
}}



      >
         
        {/* TITLE */}
        <div className="text-left mb-4">
          <p className="text-md font-semibold">Your Stickers</p>
          <p className="text-xs text-white/70 font-outfit mt-1 leading-snug">
          Apply a sticker next to your profile photo.
            <br />
            Stickers expire 7 days after you receive them
          </p>
        </div>

        {/* INNER CARD */}
        <div className=" ">
          {/* GRID */}
          <div className="grid grid-cols-4 gap-5 mb-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                onClick={() => setSelectedSticker(i)}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full aspect-square cursor-pointer transition-all duration-200 ${
                  selectedSticker === i
                    ? "border-[3px] border-yellow-400 border-b-4"
                    : "border border-white/50"
                }`}
              >
                <Image
                  src={`/stickers/s${(i % 6) + 1}.png`}
                  width={50}
                  height={50}
                  alt=""
                  className="object-contain"
                />
              </div>
            ))}
          </div>

          {/* PAGINATION DOTS */}
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-2 h-2 bg-white rounded-full" />
            <div className="w-2 h-2 bg-white/40 rounded-full" />
            <div className="w-2 h-2 bg-white/40 rounded-full" />
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-between">
            {/* REMOVE */}
            <div className="flex items-center gap-3 text-white/90 cursor-pointer">
              <div className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center">
                −
              </div>
              <p className="text-sm">Remove sticker</p>
            </div>

            {/* SAVE BUTTON */}
            <button className="px-10 py-4 border border-white/40 rounded-full text-white font-semibold hover:bg-white/10 transition">
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
