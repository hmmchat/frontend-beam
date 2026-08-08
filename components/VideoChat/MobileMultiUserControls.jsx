'use client';

import React from 'react';
import clsx from 'clsx';
import BeamTransparentLogo from '@/components/ui/BeamTransparentLogo';

export default function MobileMultiUserControls({
  toggleCam,
  isCamOff,
  onChatButtonClick,
  setIsDareOpen,
  setIsGiftModalOpen,
  isScreenSharing,
  onToggleScreenShare
}) {
  return (
    <div className="md:hidden absolute inset-x-0 bottom-3 px-4 flex justify-between items-end z-50 pointer-events-auto">
      {/* Left buttons (Camera + Message) */}
      <div className="flex gap-1.5 mb-2">
        <button
          type="button"
          onClick={toggleCam}
          className="min-w-11 min-h-11 w-11 h-11 rounded-full border border-b-[3px] border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 bg-black/40 backdrop-blur-md"
        >
          <img
            src={isCamOff ? "/assets/video-on.svg" : "/assets/video-off.svg"}
            className="w-4 h-4 object-contain"
            alt="Video"
          />
        </button>
        {typeof onToggleScreenShare === "function" && (
          <button
            type="button"
            onClick={onToggleScreenShare}
            title={
              isScreenSharing
                ? "Stop sharing screen"
                : "Share screen or window"
            }
            className={clsx(
              "min-w-11 min-h-11 w-11 h-11 rounded-full border border-b-[3px] flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 bg-black/40 backdrop-blur-md",
              isScreenSharing
                ? "border-emerald-400/80 bg-emerald-500/20"
                : "border-white/40"
            )}
          >
            <svg
              className="h-4 w-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onChatButtonClick}
          className="min-w-11 min-h-11 w-11 h-11 rounded-full border border-b-[3px] border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 bg-black/40 backdrop-blur-md"
        >
          <img
            src="/msg.png"
            className="w-4 h-4 object-contain"
            alt="Message"
          />
        </button>
      </div>

      {/* Center Logo — own layer so justify-between columns can't skew visual center */}
      <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center pointer-events-none">
        <BeamTransparentLogo className="h-8" />
      </div>

      {/* Right buttons (Dare + Gift) */}
      <div className="flex gap-1.5 ">
        <button
          type="button"
          onClick={() => setIsDareOpen(true)}
          className="relative w-12 h-12 flex items-center border-2 border-b-4 rounded-full border-[#13133b] justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <img
            src="/circle.png"
            className="absolute inset-0 w-full h-full bg-red-900 rounded-full"
            alt=""
          />
          <img
            src="/dare1.png"
            className="relative w-7 h-auto"
            alt="DARE"
          />
        </button>
        <button
          type="button"
          onClick={() => setIsGiftModalOpen(true)}
          className="relative w-12 h-12 border-2 border-b-4 rounded-full border-[#13133b] flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <img
            src="/circle.png"
            className="absolute inset-0 w-full h-full rounded-full bg-pink-800"
            alt=""
          />
          <img
            src="/giftboc.png"
            className="relative w-6 h-6 object-contain"
            alt="GIFT"
          />
        </button>
      </div>
    </div>
  );
}
