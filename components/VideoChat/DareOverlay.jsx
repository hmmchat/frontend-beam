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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Overlay */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-[34%] z-30 flex flex-col items-end w-full px-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="border-2 border-white rounded-[40px] w-full max-w-[500px] p-8 shadow-2xl relative overflow-hidden"
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
      </div>
    </>
  );
}
