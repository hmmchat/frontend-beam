"use client";

import Skeleton from "@/components/ui/Skeleton";

/**
 * Very light skeleton for the desktop home page.
 * Mirrors only key elements: left-panel logo/text, right-panel button, bottom bar.
 * Background images show through so it feels native to the page.
 */
export default function HomeSkeletonDesktop() {
  return (
    <div className="relative h-screen grid grid-cols-2">

      {/* ── LEFT PANEL ── */}
      <div className="relative flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundRepeat: "repeat",
            backgroundSize: "cover",
          }}
        />

        {/* Card border */}
        <div className="rounded-[60px] border-2 border-white/20 z-10 w-full h-[96vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            {/* Logo */}
            <Skeleton className="w-52 h-12 rounded-xl opacity-40" />
            {/* Tagline */}
            <Skeleton className="w-36 h-4 rounded-full opacity-30" />
            {/* Meeting count row */}
            <div className="flex items-center gap-2 mt-1">
              <Skeleton className="w-5 h-5 rounded-full opacity-25" />
              <Skeleton className="w-24 h-3 rounded-full opacity-25" />
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="relative flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 z-[1] opacity-70 mix-blend-hard-light"
          style={{
            backgroundImage: "url(/bg.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Info icon placeholder */}
        <Skeleton className="absolute top-[54px] right-14 w-11 h-11 rounded-full opacity-35 z-50" />

        {/* Card border */}
        <div className="rounded-[60px] border-2 border-white/20 z-10 w-full h-[96vh] flex flex-col px-8">

          {/* Meet Now button — centered */}
          <div className="flex-1 flex items-center justify-center mt-44">
            <Skeleton className="w-[90%] h-16 rounded-3xl opacity-40" />
          </div>

          {/* Bottom bar */}
          <div className="mb-10 flex justify-between items-center px-2">
            {/* Beam TV */}
            <Skeleton className="w-16 h-16 rounded-full opacity-35" />
            {/* Sign Up */}
            <Skeleton className="w-32 h-13 rounded-full opacity-35" />
          </div>
        </div>
      </div>
    </div>
  );
}
