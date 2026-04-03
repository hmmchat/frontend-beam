"use client";

import { useState, useMemo } from "react";
import { IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";
import Image from "next/image";
import { FaGift } from "react-icons/fa6";
import Skeleton from "@/components/ui/Skeleton";

/**
 * @param {{ isOpen: boolean, onClose: () => void, onSelectGift: (gift: { id: string, name: string, price: number, image?: string }) => void, catalogGifts?: Array<{ id: string, name: string, price: number, image?: string }>|null, catalogLoading?: boolean }} props
 */
export default function GiftModal({ isOpen, onClose, onSelectGift, catalogGifts, catalogLoading }) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;

  const gifts = useMemo(() => {
    if (catalogGifts && catalogGifts.length > 0) return catalogGifts;
    return [];
  }, [catalogGifts]);

  const totalPages = Math.ceil(gifts.length / itemsPerPage) || 1;

  if (!isOpen) return null;

  const currentGifts = gifts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <div
      className="fixed left-80 top-40 inset-0 z-[100] flex items-center justify-center p-4 "
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[40px] border border-white/20 p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-0 -z-50"
          style={{
            backgroundImage: "url('/assets/mb.jpg')",
            backgroundRepeat: "repeat",
            backgroundSize: "cover",
          }}
        />

        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 blur-[80px]" />

        <div className="relative z-10 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex w-10 h-10 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
              <FaGift className="text-xl text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-outfit)]">
              Add Gift
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 disabled:opacity-30 transition-all"
              >
                <IoChevronBack className="text-xl" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 disabled:opacity-30 transition-all"
              >
                <IoChevronForward className="text-xl" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all"
            >
              <IoClose className="text-2xl" />
            </button>
          </div>
        </div>

        {catalogLoading && (
          <div className="relative z-10 grid grid-cols-4 gap-3 md:gap-4 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-4">
                <Skeleton circle className="w-12 h-12 md:w-16 md:h-16 mb-2" />
                <Skeleton className="w-12 h-4 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {gifts.length === 0 && !catalogLoading ? (
          <div className="relative z-10 rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white/70">
            <p className="text-sm font-semibold text-white/80">No gifts configured</p>
            <p className="mt-1 text-xs text-white/60">
              Ask an admin to add gifts in the dashboard (Gifts section).
            </p>
          </div>
        ) : (
          <div className="relative z-10 grid grid-cols-4 gap-3 md:gap-4 mb-8">
            {currentGifts.map((gift) => (
              <button
                key={gift.id}
                type="button"
                onClick={() => onSelectGift(gift)}
                className="group relative flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-yellow-400/50 hover:shadow-[0_0_20px_rgba(250,204,21,0.2)] active:scale-95"
              >
                <div className="relative w-12 h-12 md:w-16 md:h-16 mb-2">
                  <Image
                    src={gift.image || "/gift/gift1.png"}
                    alt={gift.name}
                    fill
                    className="object-contain transition-transform group-hover:scale-110"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 relative">
                    <Image src="/gift/dimond.png" alt="" fill className="object-contain" />
                  </div>
                  <span className="text-xs md:text-sm font-bold text-white/90">{gift.price}</span>
                </div>
                <div className="absolute inset-0 rounded-3xl ring-2 ring-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}

        <div className="relative z-10 flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentPage === i ? "w-6 bg-white" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
