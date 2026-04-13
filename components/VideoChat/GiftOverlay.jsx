'use client';

import clsx from 'clsx';

const giftItems = [
  { id: 1, name: 'Lucky', price: 50, img: '🐒' },
  { id: 2, name: 'Pika', price: 250, img: '⚡' },
  { id: 3, name: 'Hero', price: 2000, img: '🦸' },
  { id: 4, name: 'Iron', price: 25000, img: '🤖' },
  { id: 5, name: 'Pool', price: 100, img: '⚔️' },
  { id: 6, name: 'Blue', price: 300, img: '👾' },
  { id: 7, name: 'Monster', price: 5000, img: '🧶' },
  { id: 8, name: 'Dora', price: 10000, img: '🐱' },
];

export default function GiftOverlay({
  isOpen,
  onClose,
  onOpenCoinModal,
  onSelectGift,
  selectedGiftId
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Floating Gift Grid */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] z-50 flex flex-col items-center w-full px-4">
        <div className="border-2 border-white rounded-[40px] w-full max-w-[500px] p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div
            className="absolute inset-0 z-0 "
            style={{
              backgroundImage: 'url(/assets/mb.jpg)',
              backgroundRepeat: 'repeat',
              backgroundSize: 'cover',
            }}
          />
          {/* Header */}
          <div className="relative z-10 flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center text-white text-2xl">🎁</div>
              <h2 className="text-white text-2xl font-bold tracking-tight">Add Gift</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors bg-white/5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors bg-white/5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="relative z-10 grid grid-cols-4 gap-4 mb-6">
            {giftItems.map((gift) => (
              <div
                key={gift.id}
                onClick={() => onSelectGift(gift)}
                className={clsx(
                  "relative bg-[#2D1F4D]/60 border rounded-3xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group hover:bg-[#3D2F5D]",
                  selectedGiftId === gift.id ? "border-[#FFD700] ring-2 ring-[#FFD700]/50" : "border-white/10"
                )}
              >
                <div className="text-4xl group-hover:scale-110 transition-transform duration-200">
                  {gift.img}
                </div>
                <div className="flex items-center gap-1.5 bg-[#1A1033]/60 px-2 py-0.5 rounded-full border border-white/5">
                  <span className="text-[#00F0FF] text-[10px]">💎</span>
                  <span className="text-white text-[11px] font-bold">{gift.price.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination & Recipients */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className="w-5 h-1.5 rounded-full bg-white/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#1A1033] overflow-hidden relative group">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} className="w-full h-full object-cover" alt="" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border border-[#1A1033]">
                      <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Balance Bar */}
      <div className="absolute bottom-6 left-10 right-10 z-50 flex items-end justify-between animate-in fade-in duration-300">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-yellow-400">
            <span className="text-xs">⚠️</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Insufficient balance</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <span className="text-xs font-medium opacity-60">Spend coins:</span>
            <div className="flex items-center gap-1.5">
              <img src="/assets/Coin-token.svg" className="w-4 h-4" alt="" />
              <span className="text-sm font-bold">10,00,000</span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenCoinModal}
          className="bg-black/40 backdrop-blur-xl border-2 border-white/20 hover:border-white/40 text-white px-10 py-4 rounded-3xl text-lg font-bold transition-all active:scale-95 shadow-2xl"
        >
          Buy Coins
        </button>
      </div>

      {/* Underlay / Backdrop click to close */}

    </>
  );
}
