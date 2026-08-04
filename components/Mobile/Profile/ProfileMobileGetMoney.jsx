"use client";

import { FaAngleLeft } from "react-icons/fa6";
import MysteryBeamBoxPanel from "../../Profile/MysteryBeamBoxPanel";

export default function ProfileMobileGetMoney({ onBack }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <MysteryBeamBoxPanel
        onBack={
          <button
            type="button"
            onClick={onBack}
            className="self-start mb-2 flex items-center gap-2 text-white/80 hover:text-white"
            aria-label="Back"
          >
            <FaAngleLeft />
            <span className="text-sm font-outfit">Back</span>
          </button>
        }
      />
    </div>
  );
}
