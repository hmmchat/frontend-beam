"use client";

import { ArrowLeft } from "lucide-react";
import RewardsReferralsPanel from "../../Profile/RewardsReferralsPanel";

export default function ProfileMobileRewards({ onBack, className }) {
  return (
    <div className={`${className ?? ""} flex h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]`}>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40"
          aria-label="Back to profile"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="font-[family-name:var(--font-outfit),sans-serif] text-base font-medium">
          Rewards and Referrals
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <RewardsReferralsPanel />
      </div>
    </div>
  );
}
