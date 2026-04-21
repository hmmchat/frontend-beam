'use client';

import React from 'react';
import clsx from 'clsx';

export default function MeetNowButton({ 
  onClick, 
  isSearching = false, 
  className = "", 
  text = "Meet Someone now",
  searchingText = "Searching..."
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group relative z-20 border-[1.89px] border-b-[5.4px] rounded-[20px] flex items-center justify-center gap-4 active:scale-[0.98] transition-all overflow-hidden shadow-2xl',
        isSearching
          ? 'bg-yellow-500 text-black border-black animate-pulse'
          : 'bg-black/20 text-white border-white hover:bg-black/30 backdrop-blur-[1px]',
        className
      )}
    >
      {!isSearching && (
        <div className={clsx('absolute', 'inset-0', 'bg-gradient-to-r', 'from-purple-500/10', 'via-pink-500/10', 'to-purple-500/10', 'opacity-50')} />
      )}
      <div className={clsx(
        "w-11 h-11 rounded-full border flex items-center justify-center group-hover:scale-110 transition-transform z-10",
        isSearching ? "border-black" : "border-white/60"
      )}>
        <img
          src="/assets/video-on.svg"
          className={clsx(
            "text-xl transition-all h-7 w-7",
            isSearching ? "brightness-0" : "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          )}
          alt=""
        />
      </div>
      <span className={clsx(
        "text-xl font-bold tracking-tight z-10 text-[20px]",
        isSearching ? "text-black" : "text-white"
      )}>
        {isSearching ? searchingText : text}
      </span>
    </button>
  );
}
