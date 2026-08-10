"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { GiftAnimationGroup } from "./GiftAnimation";
import BeamTransparentLogo from "@/components/ui/BeamTransparentLogo";
import SyncedMarqueeText from "./SyncedMarqueeText";
import PressableActionButton from "./PressableActionButton";

export default function LocalVideoSection({
  localVideoRef,
  localStreamRef,
  isCamOff,
  /** Screen share to call participants (getDisplayMedia — user picks window/screen). */
  isScreenSharing,
  onToggleScreenShare,
  chatMessages,
  chatInput,
  setChatInput,
  sendChatMessage,
  showChatInput,
  setShowChatInput,
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
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;

    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages]);


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
          (isGiftModalOpen || isDareOpen) &&
          selectedGiftId &&
          " mb-2",
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
            isGiftModalOpen || isDareOpen
              ? (isGroupCall ? "h-[70%]" : "md:h-[87vh] h-[70%]")
              : "h-full",
          )}
        />

        <div className="absolute top-2 left-2 right-2 bottom-14 md:top-4 md:left-4 md:right-4 md:bottom-22 overflow-hidden rounded-3xl md:rounded-[60px] pointer-events-none z-[998]">
          <GiftAnimationGroup
            gifts={Array.isArray(gifts) ? gifts : gift ? [gift] : []}
            onComplete={onGiftAnimationComplete}
            onDismissStart={onGiftDismissStart}
            persistUntilDismissed={true}
            forceDismiss={forceDismiss}
          />
        </div>

        {activeLocalDareText && (
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
        {!activeLocalDareText && activeLocalGiftLabel && (
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
              roundedClass
            )}
          >
            Camera is off
          </div>
        )}

        <div
          ref={chatContainerRef}
          className={clsx(
            "absolute",
            "md:left-10",
            "left-4",
            "flex",
            "flex-col",
            "gap-2",
            "max-w-[85%]",
            "md:max-h-[40vh]",
            "max-h-[20vh]",
            "overflow-y-auto",
            "overflow-x-hidden",
            "overscroll-behavior-y-contain",
            "scrollbar-hide",
            "pr-2",
            "z-10",
            showChatInput
              ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom))] md:bottom-44"
              : "bottom-[calc(7rem+env(safe-area-inset-bottom))] md:bottom-28",
            "pointer-events-auto"
          )}
        >
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={clsx('flex', 'items-start', 'gap-2', 'animate-in', 'fade-in', 'slide-in-from-bottom-2', 'duration-300')}
            >
              <img
                src={msg.displayPictureUrl || ''}
                alt=""
                className={clsx('w-8', 'h-8', 'rounded-full', 'border', 'border-white/20', 'object-cover', 'flex-shrink-0', 'shadow-md')}
              />
              <div
                className={clsx(
                  "px-3 py-1.5",
                  "rounded-md ",
                  "bg-[#0A032D]/40 ",
                  "border border-white/5",
                  "text-white text-xs font-normal leading-relaxed",
                  "break-words max-w-[calc(100%-2.5rem)]",
                  "shadow-lg"
                )}
              >
                {msg.message}
              </div>
            </div>
          ))}
        </div>



        {/* Call Controls (only if gift or dare is not open) */}
        {!isGiftModalOpen && !isDareOpen && !hideAllControls && (
          <div
            className={clsx(
              "absolute md:bottom-[3%] bottom-[max(4%,calc(env(safe-area-inset-bottom)+0.5rem))] left-2 right-2 z-20",
              "flex items-end justify-center gap-3",
              "pointer-events-none"
            )}
          >
            <div
              className={clsx(
                "flex",
                "flex-col",
                "gap-4",
                "w-full md:w-[75%]",
                "max-w-[280px] md:max-w-none",
                "md:px-4",
                "pointer-events-auto"
              )}
            >
              {showChatInput && (
                <form
                  onSubmit={sendChatMessage}
                  className={clsx("animate-in mb-[7%] ml-[2.5%]", hideMobileControlsRow && "hidden md:block")}
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



              {/* 3 button */}
              <div
                className={clsx(
                  "flex items-center flex-nowrap gap-1 sm:gap-1 w-full ",
                  "overflow-hidden",
                  hideMobileControlsRow ? "hidden md:flex" : "flex"
                )}
              >
                <button
                  type="button"
                  onClick={toggleCam}
                  className={clsx('w-11', 'h-11', 'md:h-12', 'md:w-12', 'rounded-full', 'border', 'border-b-[3px]', 'border-white/40', 'flex', 'items-center', 'justify-center', 'transition-all', 'hover:bg-white/10', 'active:scale-95')}
                >
                  <img
                    src={isCamOff ? "/assets/video-on.svg" : "/assets/video-off.svg"}
                    className={clsx('w-[18px]', 'h-[18px]', 'md:h-6', 'md:w-6', 'object-contain')}
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
                      "w-11 h-11 md:h-12 md:w-12 rounded-full  border-b-[3px] border flex items-center justify-center transition-all hover:bg-white/10 active:scale-95",
                      isScreenSharing
                        ? "border-emerald-400/80 bg-emerald-500/20"
                        : "border-white/40",
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
                  className={clsx('w-11', 'h-11', 'md:h-12', 'md:w-12', 'rounded-full', 'border', 'border-b-[3px]', 'border-white/40', 'flex', 'items-center', 'justify-center', 'transition-all', 'hover:bg-white/10', 'active:scale-95')}
                >
                  <img
                    src="/msg.png"
                    className={clsx('w-[18px]', 'h-[18px]', 'md:w-5', 'md:h-5', 'object-contain')}
                    alt="Message"
                  />
                </button>

                {/* logo */}


              </div>


            </div>
            {/* Dare + Gift launchers */}
            <div className={clsx("gap-2 md:gap-1 ", hideMobileControlsRow ? "hidden md:flex" : "flex", "pointer-events-auto")}>
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

            {/* Center logo — own layer so asymmetric control columns can't shift it */}
            <div
              className={clsx(
                "absolute inset-x-0 bottom-2 z-10 flex justify-center pointer-events-none md:hidden",
                hideMobileControlsRow && "hidden",
              )}
            >
              <BeamTransparentLogo className="h-6" />
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
