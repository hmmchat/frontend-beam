"use client";

import { ArrowLeft } from "lucide-react";

export default function RewardsTab({ onBack }) {
  return (
    <div className="w-full  flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div
          onClick={onBack}
          className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft size={18} />
        </div>
        <p>Rewards and Referrals</p>
      </div>

      <div className="border border-white/30 rounded-[2.5rem] p-10 text-center">
        <p className="mb-2">Invite you gang and win</p>
        <p className="text-xl mb-6 flex items-center justify-center">
          <span>
            <img src="/Coins/coin1.png" alt="" className="w-8 h-8" />
          </span>
          100
        </p>

        <div className="w-20 h-20 rounded-xl mx-auto mb-6 flex items-center justify-center text-black">
          <img src="/profile/code.png" alt="" />
        </div>

        <div className="bg-black/20 rounded-full py-3">Ref- eral- code-12</div>
      </div>

      <div className="border border-white/30 rounded-[2.5rem] p-10 mt-6 text-center">
        <p className="mb-4">Share to</p>
        <div className="flex justify-center gap-6">
          <img src="/shareicon4.png" className="w-8 h-8" />
          <img src="/shareicon2.png" className="w-8 h-8" />
          <img src="/shareicon1.png" className="w-8 h-8" />
          <img src="/shareicon3.png" className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
