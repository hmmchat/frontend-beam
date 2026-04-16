"use client";

import { useState } from "react";
import clsx from "clsx";

const giftItems = [
  { id: 1, name: "Monkey", price: 50, img: "🐒" },
  { id: 2, name: "Pika", price: 250, img: "⚡" },
  { id: 3, name: "Super", price: 2000, img: "🦸" },
  { id: 4, name: "Iron", price: 25000, img: "🤖" },
];

export default function DareOverlay({
  isOpen,
  onClose,
  selectedGiftId,
  onSelectGift,
}) {
  if (!isOpen) return null;

  const selectedGift = giftItems.find((g) => g.id === selectedGiftId);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Overlay Container */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-[34%] z-30 flex flex-col items-end w-full px-4">
        {/* DESKTOP VIEW */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="hidden md:block border-2 border-white rounded-[40px] w-full max-w-[500px] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url(/assets/mb.jpg)",
              backgroundSize: "cover",
            }}
          />

          {/* Glow dots */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.2)_1px,_transparent_1px)] bg-[size:20px_20px] opacity-20" />

          {/* Content */}
          <div className="relative z-10 text-white">
            {/* Top Section */}
            <div className="flex items-center justify-between mb-4">
              <button className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center">
                ←
              </button>

              <div className="text-center">
                <p className="text-xs opacity-80">Dare Sanya to:</p>
                <div className="mt-2 px-4 py-2 border border-white/40 rounded-full text-sm font-medium">
                  Eat a chilli 🌶️
                </div>
              </div>

              <button className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center">
                →
              </button>
            </div>

            {/* Visibility note */}
            <div className="flex items-center justify-center gap-2 text-xs opacity-80 mb-6">
              👁️ Sanya can see this Dare too
            </div>

            {/* Gift Section */}
            <div className="border border-white/40 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                🎁
                <div>
                  <p className="text-sm font-semibold">Add gift</p>
                  <p className="text-xs opacity-70">
                    Put bet to see what happens
                  </p>
                </div>
              </div>

              {/* Gift Row */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {giftItems.map((gift) => (
                  <div
                    key={gift.id}
                    onClick={() => onSelectGift(gift.id)}
                    className={clsx(
                      "min-w-[80px] rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer border transition",
                      selectedGiftId === gift.id
                        ? "border-white bg-white/20"
                        : "border-white/20 bg-white/5",
                    )}
                  >
                    <div className="text-3xl">{gift.img}</div>
                    <div className="text-xs mt-1">💎 {gift.price}</div>
                  </div>
                ))}
              </div>

              {/* Pagination dots */}
              <div className="flex justify-center mt-3 gap-1">
                <div className="w-2 h-2 bg-white rounded-full" />
                <div className="w-2 h-2 bg-white/40 rounded-full" />
                <div className="w-2 h-2 bg-white/40 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE VIEW */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="md:hidden w-full max-w-[360px] bg-gradient-to-b from-[#4C1A99] to-[#2D1F4D] border-2 border-white/40 rounded-[32px] p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Header Icons */}
          <div className="flex justify-between items-center mb-0 px-2">
            <button className="text-white/80">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
              </svg>
            </button>
            <button className="text-white/80">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
              </svg>
            </button>
          </div>

          {/* Sanya Text */}
          <div className="text-center -mt-4 mb-4">
            <p className="text-[10px] text-white/70 uppercase tracking-widest font-medium">
              Sanya is ready to
            </p>
            <div className="mt-2 inline-block px-10 py-2.5 border border-white/60 rounded-full text-white font-bold text-base bg-white/5">
              Eat a chilli
            </div>
          </div>

          <div className="relative flex items-center justify-center mt-8 pb-4">
            {/* Circular Connector HUD Style Overlay */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center -z-0">
              <div className="w-[85%] h-px bg-white/20 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
            </div>

            <div className="relative flex items-center justify-between w-full px-2 z-10 gap-2">
              {/* Price Circle */}
              <div className="w-16 h-16 rounded-full border border-white/30 flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm">
                <div className="text-[10px] scale-125 mb-0.5">💎</div>
                <div className="text-[10px] font-bold text-white leading-none">
                  {selectedGift?.price || "---"}
                </div>
              </div>

              {/* Status Middle Circle */}
              <div className="flex flex-col items-center justify-center gap-1.5 min-w-[80px]">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 12V8H4v4M20 12v8H4v-8M20 12H4M12 4v16" />
                  </svg>
                </div>
                <p className="text-[9px] text-white/80 font-medium whitespace-nowrap uppercase tracking-tighter">
                  Gift added
                </p>
              </div>

              {/* Gift Image Circle */}
              <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                <div className="text-3xl filter drop-shadow-md">
                  {selectedGift?.img || "🎁"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
