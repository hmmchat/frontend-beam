"use client";

import { formatInrValue } from "@/lib/getMoney";
import FreeCoinsSection from "../FreeCoinsSection";

export default function GetMoneyTab({ moneyModel, loading = false, onRewardGranted }) {
  const diamondsLeft = moneyModel?.diamondsLeft ?? 0;
  const diamonds = moneyModel?.diamonds ?? 0;
  const progress = moneyModel?.unlockProgress ?? 0;
  const isUnlocked = Boolean(moneyModel?.isUnlocked);
  const currentInr = moneyModel?.currentInrValue ?? 0;

  return (
    <div className="flex h-full w-full flex-col items-center text-center px-4 md:px-8">
      {/* Top text */}
      <p className="text-sm text-white/80">Hmm. You being nice is paying back!!</p>
      <p className="text-sm text-white/60 mt-1">
        {loading
          ? "Loading wallet details..."
          : isUnlocked
            ? "Unlocked! You can withdraw now"
            : `${diamondsLeft} left to withdraw`}
      </p>
      <p className="text-lg font-semibold text-white mt-2">
        💎 {diamonds}
      </p>

      {/* Amount */}
      <h2 className="text-3xl font-bold mt-5 mb-6">₹{formatInrValue(currentInr)}</h2>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="h-5 border border-white rounded-full p-[3px] border-b-4">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Free coins section + button */}
      <div className="w-full max-w-lg space-y-4 flex-1 flex flex-col">
        <FreeCoinsSection onRewardGranted={onRewardGranted} />

        <button className="flex w-full items-center justify-center gap-3 border border-white px-6 py-3 rounded-[10.986px] text-lg border-b-4 hover:bg-white hover:text-black transition">
          <span className="w-4 h-4 flex items-center justify-center border border-white/40 rounded-full">
            +
          </span>
          Add withdrawal method
        </button>
      </div>

      {/* Bottom info - pushed to bottom */}
      <div className="mt-auto pt-6 text-sm text-white/70 space-y-5 text-left w-full">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 flex items-center justify-center border border-white rounded-full text-lg leading-none">
            ?
          </span>
          <div>
            <p className="font-medium text-white">Learn How to earn diamonds?</p>
            <p className="text-white/80 text-xs">Your current balance: 💎 {diamonds}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img src="/call.png" alt="" className="w-6 h-6" />
          <p className="text-sm">Reach Support</p>
        </div>
      </div>
    </div>
  );
}