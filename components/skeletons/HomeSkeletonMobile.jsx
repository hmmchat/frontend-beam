"use client";

import Bone from "@/components/skeletons/Bone";

/**
 * Instagram-style mobile home skeleton.
 * Mirrors MeetSomeoneNew phone layout: top HUD, logo, mid toggle,
 * Meet Now + filters, bottom nav — bones sit on the real home bg.
 */
export default function HomeSkeletonMobile() {
  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden"
      role="status"
      aria-label="Loading home"
    >
      {/* Real homepage background underneath */}
      <div
        className="absolute inset-0 opacity-70 mix-blend-hard-light"
        style={{
          backgroundImage: "url(/bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "15% center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="absolute inset-0 bg-black/15" />

      {/* Decorative frame — matches phone home border */}
      <div className="pointer-events-none absolute inset-x-[2.5%] top-3 bottom-[5.5rem] z-10 rounded-[2rem] border border-white/25" />

      {/* ── Top bar: coins | crown + scan ── */}
      <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-8">
        <Bone className="h-12 w-[7.25rem]" />
        <div className="flex items-center gap-2">
          <Bone className="h-12 w-12" />
          <Bone className="h-12 w-12" />
        </div>
      </div>

      {/* ── Logo cluster ── */}
      <div className="absolute top-[18%] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
        <Bone className="h-10 w-36 !rounded-xl" />
        <Bone className="h-3 w-28" />
        <Bone className="mt-1 h-3 w-24" />
      </div>

      {/* ── Mid: TV | Solo/Squad | Cards ── */}
      <div className="absolute top-[49%] left-1/2 z-20 flex w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 items-center justify-center px-3">
        <Bone className="absolute left-3 h-10 w-10" />
        <Bone className="h-[4.5vh] w-[40vw] min-h-9 max-w-[11rem]" />
        <Bone className="absolute right-3 h-12 w-12" />
      </div>

      {/* ── Meet Now + filters ── */}
      <div className="absolute bottom-[25%] left-1/2 z-20 w-full max-w-[520px] -translate-x-1/2 px-3 sm:bottom-[20%] sm:px-4">
        <Bone className="mx-auto aspect-[23/5] w-[clamp(300px,85vw,520px)] !rounded-2xl" />
        <Bone className="mx-auto mt-5 h-12 w-[clamp(295px,65vw,420px)] !rounded-2xl" />
      </div>

      {/* ── Bottom nav pill ── */}
      <div className="absolute bottom-[1.5%] left-1/2 z-20 w-[94%] max-w-sm -translate-x-1/2 px-4">
        <Bone className="h-16 w-full" />
      </div>
    </div>
  );
}
