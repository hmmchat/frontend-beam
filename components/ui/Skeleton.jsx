'use client';

import clsx from 'clsx';

export default function Skeleton({ className, circle = false, shimmer = true }) {
  return (
    <div
      className={clsx(
        'bg-white/10 relative overflow-hidden',
        circle ? 'rounded-full' : 'rounded-md',
        shimmer && 'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent',
        className
      )}
    />
  );
}
