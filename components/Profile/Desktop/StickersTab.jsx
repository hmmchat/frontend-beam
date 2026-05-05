"use client";

import Image from "next/image";
import { useState } from "react";

export default function StickersTab() {
  const allStickers = [
    "/stickers/s1.png", "/stickers/s2.png", "/stickers/s3.png", "/stickers/s4.png", "/stickers/s5.png",
    "/stickers/s6.png", "/stickers/s7.png", "/stickers/s7.png", "/stickers/s5.png", "/stickers/s5.png",
    "/stickers/s1.png", "/stickers/s2.png", "/stickers/s3.png", "/stickers/s4.png", "/stickers/s5.png",
        "/stickers/s1.png", "/stickers/s2.png", "/stickers/s3.png", "/stickers/s4.png", "/stickers/s5.png",
            "/stickers/s1.png", "/stickers/s2.png", "/stickers/s3.png", "/stickers/s4.png", "/stickers/s5.png",
                "/stickers/s1.png", "/stickers/s2.png", "/stickers/s3.png", "/stickers/s4.png", "/stickers/s5.png",
                    "/stickers/s1.png", "/stickers/s2.png", "/stickers/s3.png", "/stickers/s4.png", "/stickers/s5.png",
  ];

  const stickersPerPage = 20;
  const totalPages = Math.ceil(allStickers.length / stickersPerPage);

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null); // only one can be selected

  const currentStickers = allStickers.slice(
    currentPage * stickersPerPage,
    (currentPage + 1) * stickersPerPage
  );

  const toggleSelection = (globalIndex) => {
    setSelectedIndex((prev) => (prev === globalIndex ? null : globalIndex));
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden px-2">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <p className="text-white font-semibold text-xl">Your Stickers</p>
        <p className="text-xs text-white/60 mt-1 leading-tight">
          Apply a sticker next to your profile photo. <br />
          Stickers expire 7 days after you receive them
        </p>
      </div>


<div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto pb-8">


        
   <div className="grid grid-cols-5 gap-3 place-items-center">
          {currentStickers.map((src, localIndex) => {
            const globalIndex = currentPage * stickersPerPage + localIndex;
            const isSelected = selectedIndex === globalIndex;

            return (
              <div
                key={globalIndex}
                onClick={() => toggleSelection(globalIndex)}
                className="cursor-pointer transition-all active:scale-95 hover:scale-105"
              >
                <div
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all ${
                    isSelected
                      ? "border-[#FACC15] scale-110"
                      : "border-white/50 hover:border-white/50 border-[1px]"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`Sticker ${globalIndex + 1}`}
                    width={65}
                    height={65}
                    className="object-contain"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Dots (3-dot slider style) */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 flex justify-center gap-2 mb-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === currentPage ? "bg-white w-6" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <button className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-2xl leading-none">
            −
          </div>
          <span className="text-sm font-medium">Remove sticker</span>
        </button>

        <button className="rounded-3xl bg-white px-10 py-3 text-black font-medium hover:bg-white/90 transition">
          Save
        </button>
      </div>
    </div>
  );
}