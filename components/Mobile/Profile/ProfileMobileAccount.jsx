"use client";

import { ArrowLeft } from "lucide-react";
import FacecardProfile from "../../Home/FacecardProfile";

export default function ProfileMobileAccount({
  onBack,
  user,
  age,
  currentImageIndex,
  setCurrentImageIndex,
  handleDownloadFacecard,
  handleShareFacecard,
  facecardExportRef
}) {
  return (
    <div className="w-full flex flex-col h-full min-h-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto overflow-x-hidden">
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="min-w-11 min-h-11 w-11 h-11 border border-white/40 rounded-full flex items-center justify-center"
          aria-label="Back to profile"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-base">My account</p>
      </div>
      {user ? (
        <div className="flex justify-center w-full min-h-0 flex-1 pb-8">
          <div
            ref={facecardExportRef}
            className="
    origin-top
    min-[320px]:scale-75
    min-[370px]:scale-84
    min-[390px]:scale-86
  min-[402px]:scale-90
    min-[410px]:scale-96
    min-[416px]:scale-100
  
  "
          >
            <FacecardProfile
              user={{
                ...user,
                age,
                city: user?.preferredCity || user?.city,
              }}
              currentIndex={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
              onDownload={handleDownloadFacecard}
              onShare={handleShareFacecard}
            />
          </div>

        </div>
      ) : (
        <p className="text-center text-white/60 text-sm">Loading…</p>
      )}
    </div>
  );
}
