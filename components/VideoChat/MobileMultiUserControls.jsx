'use client';

import React from 'react';
import clsx from 'clsx';

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
    <div className="md:hidden absolute inset-x-0 bottom-4 px-4 flex justify-between items-end z-50 pointer-events-auto">
      {/* Left buttons (Camera + Message) */}
      <div className="flex gap-1.5 mb-2">
        <button
          type="button"
          onClick={toggleCam}
          className="w-11 h-11 rounded-full border border-b-[3px] border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 bg-black/40 backdrop-blur-md"
        >
          <img
            src={isCamOff ? "/assets/video-on.svg" : "/assets/video-off.svg"}
            className="w-5 h-5 object-contain"
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
              "w-11 h-11 rounded-full border border-b-[3px] flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 bg-black/40 backdrop-blur-md",
              isScreenSharing
                ? "border-emerald-400/80 bg-emerald-500/20"
                : "border-white/40"
            )}
          >
            <svg
              className="h-5 w-5 text-white"
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
          className="w-11 h-11 rounded-full border border-b-[3px] border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 bg-black/40 backdrop-blur-md"
        >
          <img
            src="/msg.png"
            className="w-5 h-5 object-contain"
            alt="Message"
          />
        </button>
      </div>

      {/* Center Logo */}
      <div className="mb-4 mr-4">
        <img src="/logotransparent.png" className="h-7 w-auto object-contain" alt="Beam" />
      </div>

      {/* Right buttons (Dare + Gift) */}
      <div className="flex gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => setIsDareOpen(true)}
          className="relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <img
            src="/circle.png"
            className="absolute inset-0 w-full h-full bg-red-900 rounded-full"
            alt=""
          />
          <img
            src="/dare.png"
            className="relative w-8 h-auto"
            alt="DARE"
          />
        </button>
        <button
          type="button"
          onClick={() => setIsGiftModalOpen(true)}
          className="relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <img
            src="/circle.png"
            className="absolute inset-0 w-full h-full rounded-full bg-pink-800"
            alt=""
          />
          <img
            src="/giftboc.png"
            className="relative w-8 h-8 object-contain"
            alt="GIFT"
          />
        </button>
      </div>
    </div>
  );
}
