"use client";

import { ArrowLeft } from "lucide-react";
import RewardsReferralsPanel from "../RewardsReferralsPanel";

export default function RewardsTab({ onBack }) {
  return (
    <div className="h-full w-full min-h-0 overflow-hidden">
      <RewardsReferralsPanel />
    </div>
  );
}
