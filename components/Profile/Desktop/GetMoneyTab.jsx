"use client";

import { formatInrValue } from "@/lib/getMoney";

export default function GetMoneyTab({ moneyModel, loading = false }) {
  const diamondsLeft = moneyModel?.diamondsLeft ?? 0;
  const diamonds = moneyModel?.diamonds ?? 0;
  const progress = moneyModel?.unlockProgress ?? 0;
  const isUnlocked = Boolean(moneyModel?.isUnlocked);
  const currentInr = moneyModel?.currentInrValue ?? 0;

  return (
    <div className="flex flex-col items-center text-center h-full">
      <p className="text-sm text-white/80">
        Hmm. You being nice is paying back!!
      </p>

      <p className="text-sm text-white/60 mt-1">
        {loading
          ? "Loading wallet details..."
          : isUnlocked
            ? "Unlocked! You can withdraw now"
            : `Just 💎 ${diamondsLeft} left to unlock`}
      </p>

      <h2 className="text-3xl font-bold mt-4 mb-10">₹{formatInrValue(currentInr)}</h2>

      <div className="w-full max-w-lg mb-12">
        <div className="h-5 border border-white rounded-full p-[3px] border-b-4">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button className="flex items-center gap-3 border border-white px-6 py-3 rounded-[10.986px] text-lg border-b-4 hover:bg-white hover:text-black transition">
        <span className="w-4 h-4 flex items-center justify-center border border-white/40 rounded-full">
          +
        </span>
        Add withdrawal method
      </button>

      <div className="mt-auto text-sm text-white/70 space-y-6 text-left w-full pt-12">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 flex items-center justify-center border border-white rounded-full">
            ?
          </span>
          <div>
            <p className="font-medium text-white">
              Learn How to earn diamonds?
            </p>
            <p className="text-white/80 text-xs">
              Your current balance: 💎 {diamonds}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img src="/call.png" alt="" />
          <p>Reach Support</p>
        </div>
      </div>
    </div>
  );
}
