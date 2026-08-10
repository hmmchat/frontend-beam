'use client';

import React from "react";
import clsx from "clsx";
import BeamColourLogo from "@/components/ui/BeamColourLogo";

/**
 * Home brand stack — spacing from Figma:
 * desktop 10945:28720 (24px between tagline and count)
 * mobile  10945:42032 (16px between tagline group and count)
 */
export default function MeetLogo({
  activeCount = 0,
  beamingText = "beaming now",
  className = "",
  logoClassName = "",
  textClassName = "",
  countClassName = "",
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center",
        className,
      )}
    >
      <BeamColourLogo
        alt="logo"
        className={clsx("w-[129px] md:w-[230px] mx-auto", logoClassName)}
      />

      <p
        className={clsx(
          /* Nestle into logo frame shadow band — mobile 10945:42032, desktop 10945:28720 */
          "text-white text-[12px] md:text-[24px] font-medium font-otomanopee tracking-wide -mt-3 md:-mt-6",
          textClassName,
        )}
      >
        Meet someone here
      </p>

      <div
        className={clsx(
          "flex font-outfit items-center gap-1 mt-4 md:mt-6 text-white/95 text-[12px] md:text-[16px]",
          countClassName,
        )}
      >
        <img
          src="/assets/video-on.svg"
          alt="video indicator"
          className="w-4 h-4 md:w-6 md:h-6"
        />
        <span>
          {activeCount !== null ? activeCount.toLocaleString() : "0"}{" "}
          {beamingText}
        </span>
      </div>
    </div>
  );
}
