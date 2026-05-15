"use client";

import clsx from "clsx";
import { useState } from "react";
import GiftAnimation from "./GiftAnimation";
import { FaAngleRight } from "react-icons/fa6";
import { FaAngleLeft } from "react-icons/fa6";
const giftItems = [
  { id: 1, name: "Lucky", price: 50, img: "🐒" },
  { id: 2, name: "Pika", price: 250, img: "⚡" },
  { id: 3, name: "Hero", price: 2000, img: "🦸" },
  { id: 4, name: "Iron", price: 25000, img: "🤖" },
  { id: 5, name: "Pool", price: 100, img: "⚔️" },
  { id: 6, name: "Blue", price: 300, img: "👾" },
  { id: 7, name: "Monster", price: 5000, img: "🧶" },
  { id: 8, name: "Dora", price: 10000, img: "🐱" },
  { id: 9, name: "Candy", price: 20, img: "🍭" },
  { id: 10, name: "Cone", price: 150, img: "🍦" },
  { id: 11, name: "Car", price: 800, img: "🏎️" },
  { id: 12, name: "Gem", price: 1200, img: "💎" },
  { id: 13, name: "King", price: 7000, img: "👑" },
  { id: 14, name: "Galaxy", price: 15000, img: "🪐" },
  { id: 15, name: "Magic", price: 12000, img: "🦄" },
  { id: 16, name: "Blast", price: 50000, img: "🚀" },
];

export default function GiftOverlay({
  isOpen,
  onClose,
  onOpenCoinModal,
  onSelectGift,
  selectedGiftId,
}) {
  const [animGift, setAnimGift] = useState(null);
  const [page, setPage] = useState(0);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(giftItems.length / itemsPerPage);

  const displayedGifts = giftItems.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );

  const handleNext = () => {
    setPage((prev) => (prev + 1) % totalPages);
  };

  const handlePrev = () => {
    setPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Animation Layer */}
      <GiftAnimation gift={animGift} onComplete={() => setAnimGift(null)} />
      <div className="fixed inset-0 z-20 " onClick={onClose} />
      {/* Main UI */}
      <div className="absolute bottom-3 right-5  -translate-y-[34%] z-30 flex flex-col items-end w-full px-4">
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
              opacity: 0.9,
            }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between mb-8">
            <h2 className="text-white text-xl font-otomanopee flex justify-center items-center gap-2">
              <img src="/gift-light.svg" alt="coin" className="w-7" /> Add Gift
            </h2>
            <div className="flex gap-4">
              <FaAngleLeft
                onClick={handlePrev}
                className="text-white text-xl border-2 border-white rounded-full w-6 h-6 p-0.5 flex items-center justify-center cursor-pointer transition-all active:scale-90"
              />
              <FaAngleRight
                onClick={handleNext}
                className="text-white text-xl border-2 border-white rounded-full w-6 h-6 p-0.5 flex items-center justify-center cursor-pointer transition-all active:scale-90"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="relative z-10 grid grid-cols-4 gap-4 mb-1">
            {displayedGifts.map((gift) => (
              <div
                key={gift.id}
                onClick={() => onSelectGift(gift)}
                onDoubleClick={() => setAnimGift(gift)}
                className={clsx(
                  "border-2 border-white/60 border-b-4 rounded-3xl px-4 py-3 flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-105",
                  selectedGiftId === gift.id
                    ? "border-yellow-400 bg-white/5"
                    : "border-white/10"
                )}
              >
                <div className="text-4xl">{gift.img}</div>
                <div className="text-white text-xs">💎 {gift.price}</div>
              </div>
            ))}
          </div>

          {/* Page Indicators */}
          <div className="relative z-10 flex justify-center gap-1.5 mt-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "h-1 rounded-full transition-all duration-300",
                  page === i ? "w-6 bg-white" : "w-2 bg-white/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-6 left-10 right-10 z-50 flex justify-between">
        <div className="text-white text-sm">Insufficient balance</div>
        <button
          onClick={onOpenCoinModal}
          className="bg-black/40 border border-white/20 px-6 py-2 rounded-xl text-white hover:bg-white/10 active:scale-95 transition-all"
        >
          Buy Coins
        </button>
      </div>
    </>
  );
}

