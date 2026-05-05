"use client";

import { ArrowLeft } from "lucide-react";
import RewardsReferralsPanel from "../RewardsReferralsPanel";

export default function RewardsTab({ onBack }) {
  return (
<div className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10"
          aria-label="Back to profile"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="font-[family-name:var(--font-outfit),sans-serif] text-base font-medium text-white">
          Rewards and Referrals
        </p>
      </div>

<div className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden">
  {/* header */}
  <RewardsReferralsPanel />
</div>
    </div>
  );
}
