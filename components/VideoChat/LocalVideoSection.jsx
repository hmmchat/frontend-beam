"use client";

import { useCallback } from "react";
import clsx from "clsx";
import { GiftAnimationGroup } from "./GiftAnimation";
import BeamTransparentLogo from "@/components/ui/BeamTransparentLogo";
import SyncedMarqueeText from "./SyncedMarqueeText";
import PressableActionButton from "./PressableActionButton";
import CallChatOverlay from "./CallChatOverlay";

export default function LocalVideoSection({
  localVideoRef,
  localStreamRef,
  isCamOff,
  /** Screen share to call participants (getDisplayMedia — user picks window/screen). */
  isScreenSharing,
  onToggleScreenShare,
  chatMessages = [],
  chatInput,
  setChatInput,
  sendChatMessage,
  showChatInput,
  setShowChatInput,
  showChatMessages = false,
  isBroadcasting = false,
  chatParticipantUserIds = [],
  onChatButtonClick,
  toggleCam,
  isGiftModalOpen,
  setIsGiftModalOpen,
  isDareOpen,
  setIsDareOpen,
  setIsCoinModalOpen,
  coins,
  hideMobileControlsRow = false,
  hideAllControls = false,
  selectedGiftId,
  gift,
  gifts,
  onGiftAnimationComplete,
  onGiftDismissStart,
  forceDismiss,
  isGroupCall = false,
  activeLocalDareText,
  activeLocalDareMarqueeStartAt,
  activeLocalGiftLabel,
  giftAnimationActive = false,
  roundedClass = "",
}) {

  const setLocalVideoEl = useCallback(
    (el) => {
      localVideoRef.current = el;
      if (el && localStreamRef.current) {
        el.srcObject = localStreamRef.current;
      }
    },
    [localVideoRef, localStreamRef],
  );

  return (
    <div className={clsx('w-full', 'h-full', 'flex', 'flex-col', 'overflow-hidden', 'relative')}>
      <div
        className={clsx('absolute', 'inset-0', 'z-0')}
        style={{
          backgroundImage: "url(/assets/mb.jpg)",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
        }}
      />

      {/* 📹 Video Area */}
      <div
        className={clsx(
          "relative flex-1 min-h-0 min-w-0 transition-all duration-500 md:rounded-[60px] overflow-hidden",
          roundedClass,
          // Gift shrinks video to reveal purple dock; dare keeps full video
          // and draws its own dock (Figma 10945:40657).
          isGiftModalOpen && selectedGiftId && " mb-2",
        )}
      >
        <video
          ref={setLocalVideoEl}
          autoPlay
          muted
          playsInline
          className={clsx(
            "absolute inset-0 w-full object-cover scale-x-[-1] md:rounded-[60px]",
            roundedClass,
            isGiftModalOpen
              ? (isGroupCall ? "h-[70%]" : "md:h-[87vh] h-[70%]")
              : isDareOpen
                ? (isGroupCall ? "h-[70%]" : "md:h-[87vh] h-full")
                : "h-full",
          )}
        />

        <div className="absolute top-2 left-2 right-2 bottom-14 md:top-4 md:left-4 md:right-4 md:bottom-22 overflow-hidden rounded-3xl md:rounded-[60px] pointer-events-none z-[998]">
          {!hideAllControls && (
            <GiftAnimationGroup
              gifts={Array.isArray(gifts) ? gifts : gift ? [gift] : []}
              onComplete={onGiftAnimationComplete}
              onDismissStart={onGiftDismissStart}
              persistUntilDismissed={true}
              forceDismiss={forceDismiss}
            />
          )}
        </div>

        {!hideAllControls && activeLocalDareText && (
          <div className={clsx('flex', 'absolute', 'top-0', 'left-1/2', '-translate-x-1/2', 'z-30', 'w-[80%]', 'max-w-[80%]', 'px-4', 'md:px-6', 'py-1.5', 'md:py-2.5', 'bg-[#8A1515]', 'rounded-b-[16px]', 'md:rounded-b-[20px]', 'text-white', 'text-[10px]', 'md:text-xs', 'font-medium', 'shadow-md', 'items-center', 'gap-1', 'overflow-hidden', 'box-border')}>
            <span className="opacity-90 shrink-0">Your Dare: </span>
            <SyncedMarqueeText
              text={activeLocalDareText}
              marqueeStartAt={activeLocalDareMarqueeStartAt}
              className="flex-1 min-w-0"
              textClassName="font-bold"
            />
          </div>
        )}
        {!hideAllControls && !activeLocalDareText && activeLocalGiftLabel && (
          <div className={clsx('hidden', 'md:block', 'absolute', 'top-0', 'left-1/2', '-translate-x-1/2', 'z-30', 'px-6', 'py-1.5', 'md:py-2.5', 'bg-[#4E0093]', 'rounded-b-[16px]', 'md:rounded-b-[20px]', 'text-white', 'text-[10px]', 'md:text-xs', 'font-medium', 'shadow-md', 'whitespace-nowrap')}>
            <span>{activeLocalGiftLabel}</span>
          </div>
        )}

        {isCamOff && (
          <div
            className={clsx(
              "absolute",
              "inset-0",
              "bg-gray-900/90",
              "flex",
              "items-center",
              "justify-center",
              "text-white",
              "font-bold",
              "uppercase",
              "tracking-widest",
              "italic",
              "z-10",
              "pointer-events-none",
              roundedClass
            )}
          >
            Camera is off
          </div>
        )}

        {!hideAllControls && isScreenSharing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-md border border-white/30">
            Sharing screen
          </div>
        )}

        {/* Call Controls (only if gift or dare is not open) */}
        {!isGiftModalOpen && !isDareOpen && !hideAllControls && (
          <div
            className={clsx(
              "absolute md:bottom-[3%] bottom-[max(4%,calc(env(safe-area-inset-bottom)+0.5rem))] left-2 right-2 z-30",
              "flex items-end justify-between md:justify-center gap-2 md:gap-3",
              "pointer-events-none"
            )}
          >
            <div
              className={clsx(
                "flex",
                "flex-col",
                "gap-4",
                "relative",
                "shrink-0",
                "w-auto md:w-[75%]",
                "md:px-4",
                "pointer-events-auto"
              )}
            >
              {(showChatInput || (showChatMessages && chatMessages.length > 0)) && (
                <div
                  className={clsx(
                    "mb-[7%] ml-[2.5%] hidden w-[min(280px,70vw)] max-w-[280px] flex-col items-stretch gap-1.5 md:flex",
                  )}
                >
                  <CallChatOverlay
                    chatMessages={chatMessages}
                    showChatMessages={showChatMessages}
                    isBroadcasting={isBroadcasting}
                    chatParticipantUserIds={chatParticipantUserIds}
                    className="max-h-[min(70dvh,28rem)]"
                  />
                  {showChatInput && (
                    <form
                      onSubmit={sendChatMessage}
                      className="animate-in w-full"
                    >
                      <input
                        autoFocus
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message..."
                        className={clsx('w-full', 'bg-white/5', 'backdrop-blur-[1px]', 'border', 'border-white/20', 'rounded-2xl', 'px-4', 'py-3', 'text-white', 'text-sm', 'focus:border-white/40', 'mb-2', 'outline-none')}
                      />
                    </form>
                  )}
                </div>
              )}



              {/* 3 button */}
              <div
                className={clsx(
                  "flex items-center flex-nowrap gap-1 sm:gap-1 w-full ",
                  hideMobileControlsRow ? "hidden md:flex" : "flex"
                )}
              >
                <button
                  type="button"
                  onClick={toggleCam}
                  aria-label={isCamOff ? "Turn camera on" : "Turn camera off"}
                  className={clsx('relative z-30 shrink-0 w-11', 'h-11', 'md:h-12', 'md:w-12', 'rounded-full', 'border', 'border-b-[3px]', 'border-white/40', 'bg-[#0A032D]/20', 'backdrop-blur-md', 'flex', 'items-center', 'justify-center', 'transition-all', 'hover:bg-[#0A032D]/40', 'active:scale-95')}
                >
                  <img
                    src={isCamOff ? "/assets/video-on.svg" : "/assets/video-off.svg"}
                    className={clsx('w-[18px]', 'h-[18px]', 'md:h-6', 'md:w-6', 'object-contain', 'pointer-events-none')}
                    alt=""
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
                      "w-11 h-11 md:h-12 md:w-12 rounded-full border-b-[3px] border flex items-center justify-center transition-all hover:bg-[#0A032D]/40 active:scale-95 backdrop-blur-md",
                      isScreenSharing
                        ? "border-emerald-400/80 bg-emerald-500/20"
                        : "border-white/40 bg-[#0A032D]/20",
                    )}
                  >
                    <svg
                      className={clsx('h-[18px]', 'w-[18px]', 'md:h-5', 'md:w-5', 'text-white')}
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
                  onClick={
                    onChatButtonClick ||
                    (() => setShowChatInput(!showChatInput))
                  }
                  aria-label={showChatMessages ? "Hide messages" : "Show messages"}
                  aria-pressed={showChatMessages}
                  className={clsx(
                    'w-11', 'h-11', 'md:h-12', 'md:w-12', 'rounded-full', 'border', 'border-b-[3px]', 'flex', 'items-center', 'justify-center', 'transition-all', 'active:scale-95', 'backdrop-blur-md',
                    showChatMessages
                      ? 'border-white/70 bg-[#0A032D]/50 hover:bg-[#0A032D]/60'
                      : 'border-white/40 bg-[#0A032D]/20 hover:bg-[#0A032D]/40',
                  )}
                >
                  <img
                    src="/msg.png"
                    className={clsx('w-[18px]', 'h-[18px]', 'md:w-5', 'md:h-5', 'object-contain', 'pointer-events-none')}
                    alt=""
                  />
                </button>
              </div>


            </div>

            {/* Mobile center logo — shrinks to the gap between control clusters */}
            <div
              className={clsx(
                "min-w-0 flex-1 flex justify-center items-end overflow-visible pointer-events-none md:hidden",
                hideMobileControlsRow && "hidden",
              )}
            >
              <BeamTransparentLogo className="w-full max-h-6" />
            </div>

            {/* Dare + Gift launchers */}
            <div className={clsx("gap-2 md:gap-1 shrink-0", hideMobileControlsRow ? "hidden md:flex" : "flex", "pointer-events-auto")}>
              <PressableActionButton
                onPress={() => setIsDareOpen(true)}
                className="md:w-14 md:h-14 w-12 h-12"
                circleClassName="bg-red-900"
                iconSrc="/dare1.png"
                iconClassName="w-7 h-auto md:w-8"
                alt="DARE"
                aria-label="Open dare"
              />
              <PressableActionButton
                onPress={() => setIsGiftModalOpen(true)}
                className="md:w-14 md:h-14 w-12 h-12"
                circleClassName="bg-pink-800"
                iconSrc="/giftboc.png"
                iconClassName="w-7 h-7 object-contain"
                alt="GIFT"
                aria-label="Open gift"
              />
            </div>
          </div>
        )}

        {/* 🔲 HUD BORDER FRAME */}
        <div
          className={clsx(
            "absolute hidden md:block  md:top-4 top-2 md:left-4 left-2 md:right-4 right-2 border   border rounded-3xl md:rounded-[60px] pointer-events-none z-20 transition-colors",
            giftAnimationActive ? "!block" : "",
            isGiftModalOpen || isDareOpen
              ? "border-white/50  md:bottom-28 bottom-18"
              : "border-white/30 md:bottom-24 bottom-18",
          )}
        />
      </div>


    </div>
  );
}
