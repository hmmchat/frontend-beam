'use client';

import clsx from 'clsx';

export default function Skeleton({
  className,
  circle = false,
  shimmer = true,
}) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden',

        // 🔥 Premium base (glass look)
        'bg-white/[0.06] backdrop-blur-xl',
        'border border-white/[0.08]',

        // shape
        circle ? 'rounded-full' : 'rounded-xl',

        // subtle inner glow
        'shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]',

        // pulse effect
        'animate-pulse',

        // shimmer layer
        shimmer &&
          'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.12] before:to-transparent',

        // soft highlight overlay
        'after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/[0.05] after:to-transparent',

        className
      )}
    />
  );
}