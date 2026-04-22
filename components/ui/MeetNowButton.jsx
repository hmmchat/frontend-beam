'use client';

import React from 'react';
import clsx from 'clsx';

export default function MeetNowButton({ 
  onClick, 
  isSearching = false, 
  className = "", 
  text = "Meet Someone now",
  searchingText = "Searching...",
  isVideoOn = true,
  onVideoClick = null
}) {
  return (
    <button
   className={clsx(
  'group relative z-20 border-[1.89px] border-b-[5.4px] rounded-[20px] flex items-center justify-center gap-4 active:scale-[0.98] transition-all overflow-hidden shadow-2xl hover:scale-[1.01] hover:brightness-110 hover:shadow-purple-500/20 backdrop-blur-[2px]',
  isSearching
    ? 'bg-yellow-500/80 text-black border-black animate-pulse'
    : 'bg-[#0A032D]/30 text-white border-white hover:bg-black/30 backdrop-blur-[2px]',
  className
)}
    >
      {!isSearching && (
        <div className={clsx('absolute', 'inset-0', 'bg-gradient-to-r', 'from-purple-500/10', 'via-pink-500/10', 'to-purple-500/10', 'opacity-50')} />
      )}
      <div 
        onClick={(e) => {
          if (onVideoClick) {
            e.stopPropagation();
            onVideoClick();
          }
        }}
        className={clsx(
          "w-11 h-11 rounded-full border flex items-center justify-center hover:scale-110 transition-transform z-10",
          onVideoClick ? "cursor-pointer active:scale-95" : "",
          isSearching ? "border-black" : "border-white/60"
        )}
      >
        <img
          src={isVideoOn ? "/assets/video-on.svg" : "/assets/video-off.svg"}
          className={clsx(
            "text-xl transition-all h-8 w-8",
            isSearching ? "brightness-0" : "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          )}
          alt="video toggle"
        />
      </div>
      <span className={clsx(
        "text-xl font-bold  z-10 text-[20px]",
        isSearching ? "text-black" : "text-white"
      )}>
        {isSearching ? searchingText : text}
      </span>
    </button>
  );
}
