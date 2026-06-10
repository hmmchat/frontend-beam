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
    <div className="w-full  flex flex-col h-full pb-6  overflow-hidden ">
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center"
          aria-label="Back to profile"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-base">My account</p>
      </div>
      {user ? (
        <div className="flex justify-center  w-full  ">
          <div
            ref={facecardExportRef}
            className="
    origin-top

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
