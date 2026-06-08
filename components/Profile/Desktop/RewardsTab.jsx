"use client";

import { ArrowLeft } from "lucide-react";
import RewardsReferralsPanel from "../RewardsReferralsPanel";

export default function RewardsTab({ onBack }) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden">



      {/* header */}
      <RewardsReferralsPanel />

    </div>
  );
}
