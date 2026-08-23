'use client';

import React from 'react';
import clsx from 'clsx';
import BeamTransparentLogo from '@/components/ui/BeamTransparentLogo';
import PressableActionButton from './PressableActionButton';
import ScreenShareButton from './ScreenShareButton';

export default function MobileMultiUserControls({
  toggleCam,
  isCamOff,
  onChatButtonClick,
  showChatMessages = false,
  setIsDareOpen,
  setIsGiftModalOpen,
  isScreenSharing,
  onToggleScreenShare
}) {
  return (
    <div className="md:hidden absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] px-4 flex items-end gap-2 z-50 pointer-events-none">
      {/* Left buttons (Camera + Message) */}
      <div className="flex shrink-0 gap-1.5 mb-2 relative z-20 pointer-events-auto">
        <button
          type="button"
          onClick={toggleCam}
          aria-label={isCamOff ? "Turn camera on" : "Turn camera off"}
          className="min-w-11 min-h-11 w-11 h-11 rounded-full border border-b-[3px] border-white/40 flex items-center justify-center transition-all hover:bg-[#0A032D]/40 active:scale-95 bg-[#0A032D]/20 backdrop-blur-md"
        >
          <img
            src={isCamOff ? "/assets/video-on.svg" : "/assets/video-off.svg"}
            className="w-4 h-4 object-contain pointer-events-none"
            alt=""
          />
        </button>
        {typeof onToggleScreenShare === "function" && (
          <ScreenShareButton
            isScreenSharing={isScreenSharing}
            onToggle={onToggleScreenShare}
            className="min-w-11 min-h-11 w-11 h-11"
            iconClassName="h-4 w-4"
          />
        )}
        <button
          type="button"
          onClick={onChatButtonClick}
          aria-label={showChatMessages ? "Hide messages" : "Show messages"}
          aria-pressed={showChatMessages}
          className={clsx(
            "min-w-11 min-h-11 w-11 h-11 rounded-full border border-b-[3px] flex items-center justify-center transition-all active:scale-95 backdrop-blur-md",
            showChatMessages
              ? "border-white/70 bg-[#0A032D]/50 hover:bg-[#0A032D]/60"
              : "border-white/40 bg-[#0A032D]/20 hover:bg-[#0A032D]/40"
          )}
        >
          <img
            src="/msg.png"
            className="w-4 h-4 object-contain pointer-events-none"
            alt=""
          />
        </button>
      </div>

      {/* Center logo — shrinks to the remaining gap so it cannot overlap side buttons */}
      <div className="min-w-0 flex-1 flex justify-center items-end overflow-visible pointer-events-none self-end mb-2">
        <BeamTransparentLogo className="w-full max-h-6" />
      </div>

      {/* Right buttons (Dare + Gift) */}
      <div className="flex shrink-0 gap-1.5 relative z-20 pointer-events-auto">
        <PressableActionButton
          onPress={() => setIsDareOpen(true)}
          className="w-12 h-12"
          circleClassName="bg-red-900"
          iconSrc="/dare1.png"
          iconClassName="w-7 h-auto"
          alt="DARE"
          aria-label="Open dare"
        />
        <PressableActionButton
          onPress={() => setIsGiftModalOpen(true)}
          className="w-12 h-12"
          circleClassName="bg-pink-800"
          iconSrc="/giftboc.png"
          iconClassName="w-6 h-6 object-contain"
          alt="GIFT"
          aria-label="Open gift"
        />
      </div>
    </div>
  );
}
