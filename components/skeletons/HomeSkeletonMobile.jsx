"use client";

import Skeleton from "@/components/ui/Skeleton";

/**
 * Very light skeleton for the mobile home page.
 * Mirrors only the key elements: logo area, meet-now button, bottom bar.
 * Everything else stays transparent/invisible so the background shows through.
 */
export default function HomeSkeletonMobile() {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden flex flex-col">
      {/* Background — same as real home */}
      <div
        className="absolute inset-0 opacity-70 mix-blend-hard-light"
        style={{
          backgroundImage: "url(/bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "15% center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Main box border */}
        <div className="w-[96vw] mt-3 mx-auto flex-1 rounded-4xl overflow-hidden flex items-center justify-center border border-white/20">
          <div className="flex w-full flex-col items-center justify-center h-full text-center px-4 relative">

            {/* Info icon placeholder — top right */}
            <Skeleton className="absolute top-6 right-6 w-9 h-9 rounded-full opacity-40" />

            {/* Logo skeleton — centered upper area */}
            <div className="absolute bottom-[71%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
              {/* Logo image shape */}
              <Skeleton className="w-36 h-10 rounded-xl opacity-40" />
              {/* "Meet someone here" tagline */}
              <Skeleton className="w-28 h-3 rounded-full opacity-30 mt-1" />
              {/* meeting count badge */}
              <Skeleton className="w-20 h-3 rounded-full opacity-25 mt-1" />
            </div>

            {/* Meet Now button skeleton */}
            <div className="absolute bottom-[25%] sm:bottom-[20%] left-1/2 -translate-x-1/2 w-full max-w-[520px] px-3 sm:px-4">
              <Skeleton className="w-full h-14 rounded-2xl opacity-40" />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="w-full flex items-center justify-between px-4 py-4">
          {/* Beam TV button */}
          <Skeleton className="w-14 h-14 rounded-full opacity-35" />
          {/* Sign Up button */}
          <Skeleton className="w-24 h-12 rounded-full opacity-35" />
        </div>
      </div>
    </div>
  );
}
