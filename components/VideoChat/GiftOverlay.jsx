"use client";

import clsx from "clsx";
import { useState } from "react";
import GiftAnimation from "./GiftAnimation";

const giftItems = [
  { id: 1, name: "Lucky", price: 50, img: "🐒" },
  { id: 2, name: "Pika", price: 250, img: "⚡" },
  { id: 3, name: "Hero", price: 2000, img: "🦸" },
  { id: 4, name: "Iron", price: 25000, img: "🤖" },
  { id: 5, name: "Pool", price: 100, img: "⚔️" },
  { id: 6, name: "Blue", price: 300, img: "👾" },
  { id: 7, name: "Monster", price: 5000, img: "🧶" },
  { id: 8, name: "Dora", price: 10000, img: "🐱" },
];

export default function GiftOverlay({
  isOpen,
  onClose,
  onOpenCoinModal,
  onSelectGift,
  selectedGiftId,
}) {
  const [animGift, setAnimGift] = useState(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Animation Layer */}
      <GiftAnimation gift={animGift} onComplete={() => setAnimGift(null)} />
      <div className="fixed inset-0 z-20 " onClick={onClose} />
      {/* Main UI */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-[34%] z-30 flex flex-col items-end w-full px-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="border-2 border-white rounded-[40px] w-full max-w-[500px] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Background */}
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: "url(/assets/mb.jpg)",
              backgroundSize: "cover",
            }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between mb-8">
            <h2 className="text-white text-2xl font-bold">🎁 Add Gift</h2>
          </div>

          {/* Grid */}
          <div className="relative z-10 grid grid-cols-4 gap-4 mb-6">
            {giftItems.map((gift) => (
              <div
                key={gift.id}
                onClick={() => onSelectGift(gift)}
                onDoubleClick={() => setAnimGift(gift)}
                className={clsx(
                  "bg-[#2D1F4D]/60 border rounded-3xl p-4 flex flex-col items-center gap-2 cursor-pointer",
                  selectedGiftId === gift.id
                    ? "border-yellow-400"
                    : "border-white/10",
                )}
              >
                <div className="text-4xl">{gift.img}</div>

                <div className="text-white text-xs">💎 {gift.price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-6 left-10 right-10 z-50 flex justify-between">
        <div className="text-white text-sm">Insufficient balance</div>

        <button
          onClick={onOpenCoinModal}
          className="bg-black/40 border border-white/20 px-6 py-2 rounded-xl text-white"
        >
          Buy Coins
        </button>
      </div>
    </>
  );
}
