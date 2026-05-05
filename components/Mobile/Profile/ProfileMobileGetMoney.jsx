"use client";

import { ArrowLeft } from "lucide-react";
import FreeCoinsSection from "../../Profile/FreeCoinsSection";
import { formatInrValue } from "@/lib/getMoney";

export default function ProfileMobileGetMoney({ 
  onBack, 
  walletSnapshot, 
  moneyModel, 
  handleAdRewardGranted 
}) {
  return (
    <div className="w-full flex flex-col h-full pb-6">
      <div className="flex items-center gap-3 mb-4">
        <div
          onClick={onBack}
          className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft size={18} />
        </div>
        <p>Get money</p>
      </div>
      <div className="border border-white/30 rounded-[2.5rem] p-6 flex flex-col items-center text-center">
        <p className="text-sm text-white/80 font-outfit">
          Hmm. You being nice is paying back!!
        </p>

        <p className="text-sm text-white/60 mt-1 font-outfit">
          {walletSnapshot.loading
            ? "Loading wallet details..."
            : moneyModel.isUnlocked
              ? "Unlocked! You can withdraw now"
              : `Just 💎 ${moneyModel.diamondsLeft} left to unlock`}
        </p>

        <h2 className="text-3xl font-bold mt-4 mb-10">
          ₹{formatInrValue(moneyModel.currentInrValue)}
        </h2>

        <div className="w-full max-w-lg mb-12">
          <div className="h-5 border border-white rounded-full p-[3px] border-b-4">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${moneyModel.unlockProgress}%` }}
            />
          </div>
        </div>

        <div className="w-full space-y-5">
          <FreeCoinsSection onRewardGranted={handleAdRewardGranted} />

          <button className="flex w-full items-center justify-center gap-3 border border-white/70 px-6 py-3 rounded-[10.986px] text-xs md:text-lg border-b-4 hover:bg-white hover:text-black transition">
            <span className="w-4 h-4 flex items-center justify-center border border-white/40 rounded-full">
              +
            </span>
            Add withdrawal method
          </button>
        </div>
      </div>

      <div className="mt-12 text-sm text-white/70 space-y-6 text-left w-full pt-6 mx-8">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center border border-white rounded-full">
            ?
          </span>
          <div>
            <p className="font-medium font-outfit text-white">
              Learn How to earn diamonds?
            </p>
            <p className="text-white/80 text-xs font-outfit">
              You literally need to do nothing, <br/> its that simple
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img
            src="/call.png"
            alt=""
            className="w-7 h-7 object-contain"
          />
          <p className="font-medium font-outfit text-white">Reach Support</p>
        </div>
      </div>
    </div>
  );
}
