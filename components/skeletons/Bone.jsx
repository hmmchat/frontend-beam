"use client";

import clsx from "clsx";

/** Crisp Instagram-style bone — light, no blur. */
export default function Bone({ className }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-full bg-white/20",
        "animate-pulse",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.6s_ease-in-out_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
        className,
      )}
      aria-hidden
    />
  );
}
