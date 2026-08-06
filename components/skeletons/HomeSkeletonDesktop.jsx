"use client";

import Bone from "@/components/skeletons/Bone";

/**
 * Instagram-style desktop home skeleton.
 * Mirrors the two-panel meet-someone home; bones overlay the real backgrounds.
 */
export default function HomeSkeletonDesktop() {
  return (
    <div
      className="relative h-screen grid grid-cols-2 overflow-hidden"
      role="status"
      aria-label="Loading home"
    >
      {/* ── LEFT PANEL ── */}
      <div className="relative flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundRepeat: "repeat",
            backgroundSize: "cover",
          }}
        />
        <div className="absolute inset-0 bg-black/10" />
        <div className="pointer-events-none absolute inset-6 z-10 rounded-[60px] border-2 border-white/25" />

        {/* Logo / status bones — centered like idle left panel */}
        <div className="relative z-20 flex flex-col items-center gap-3">
          <Bone className="h-12 w-52 !rounded-xl" />
          <Bone className="h-3.5 w-36" />
          <div className="mt-1 flex items-center gap-2">
            <Bone className="h-5 w-5" />
            <Bone className="h-3 w-24" />
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 z-0 opacity-70 mix-blend-hard-light"
          style={{
            backgroundImage: "url(/bg.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-black/15" />
        <div className="pointer-events-none absolute inset-6 z-10 rounded-[60px] border-2 border-white/25" />

        {/* Top HUD */}
        <div className="absolute top-[4.5rem] left-16 right-16 z-20 flex items-center justify-between">
          <Bone className="h-12 w-36" />
          <Bone className="h-12 w-40" />
          <div className="flex items-center gap-2">
            <Bone className="h-14 w-14" />
            <Bone className="h-14 w-14" />
          </div>
        </div>

        {/* Meet + filters */}
        <div className="absolute inset-x-0 top-[42%] z-20 flex flex-col items-center gap-5 px-12">
          <Bone className="h-16 w-[79%] !rounded-3xl" />
          <div className="flex w-[55%] gap-2">
            <Bone className="h-11 flex-1" />
            <Bone className="h-11 flex-[1.3]" />
          </div>
        </div>

        {/* Bottom: TV + cards | Solo/Squad */}
        <div className="absolute bottom-16 left-16 right-16 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bone className="h-14 w-14" />
            <Bone className="h-14 w-14" />
          </div>
          <Bone className="h-12 w-44" />
        </div>
      </div>
    </div>
  );
}
