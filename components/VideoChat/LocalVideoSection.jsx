"use client";

import { useCallback, useState } from "react";
import clsx from "clsx";
import GiftOverlay from "./GiftOverlay";
import DareOverlay from "./DareOverlay";
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
  hideAllControls = false
}) {
  const [selectedGiftId, setSelectedGiftId] = useState(null);
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
    <div className="w-full h-full flex flex-col   overflow-hidden relative">
      <div
        className="absolute inset-0 z-0 "
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
          (isGiftModalOpen || isDareOpen) &&
          selectedGiftId &&
          "shadow-2xl mb-2",
          (isGiftModalOpen || isDareOpen) &&
          selectedGiftId &&
          "shadow-2xl mb-2",
        )}
      >
        <video
          ref={setLocalVideoEl}
          autoPlay
          muted
          playsInline
          className={clsx(
            "absolute inset-0 w-full object-cover scale-x-[-1] md:rounded-[60px]",
            isGiftModalOpen || isDareOpen ? "h-[87vh]" : "h-full",
          )}
        />

        {isCamOff && (
          <div
            className={clsx(
              "absolute",
              "inset-0",
              "bg-gray-900/90",
              "flex",
              "items-center",
              "justify-center",
              "text-white/20",
              "font-bold",
              "uppercase",
              "tracking-widest",
              "italic",
              "z-10",
            )}
          >
            Camera is off
          </div>
        )}

        {/* Chat Messages Overlay */}
        <div
          className={clsx(
            "absolute",
            "left-1",
            "flex",
            "flex-col",
            "gap-1",
            "max-w-[70%]",
            "max-h-[36vh]",
            "overflow-y-auto",
            "pr-1",
            "z-10",
            showChatInput ? "bottom-44" : "bottom-28",
          )}
        >
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                "px-4",
                "py-1",
                "text-white",
                "text-xs",
                "font-thin",
                "animate-in",
                "fade-in",
              )}
            >
              <span className="text-white/70 mr-2 text-[10px] font-semibold">
                {msg.name}:
              </span>
              {msg.message}
            </div>
          ))}
        </div>

        {/* Gift Selection Grid Overlay */}
        <GiftOverlay
          isOpen={isGiftModalOpen}
          onClose={() => {
            setIsGiftModalOpen(false);
            setSelectedGiftId(null);
          }}
          onOpenCoinModal={() => setIsCoinModalOpen(true)}
          onSelectGift={(gift) => setSelectedGiftId(gift.id)}
          selectedGiftId={selectedGiftId}
          coins={coins}
        />

        <DareOverlay
          isOpen={isDareOpen}
          onClose={() => {
            setIsDareOpen(false);
            setSelectedGiftId(null);
          }}
          selectedGiftId={selectedGiftId}
          onSelectGift={(giftId) => setSelectedGiftId(giftId)}
        />

        {/* Call Controls (only if gift or dare is not open) */}
        {!isGiftModalOpen && !isDareOpen && !hideAllControls && (
          <div
            className={clsx(
              "absolute",
              "bottom-6",
              "left-5",
              "right-6",
              "flex",
              "items-end",
              "justify-between",
              "z-20",
            )}
          >
            <div
              className={clsx(
                "flex",
                "flex-col",
                "gap-4",
                "w-full",
                "max-w-[240px]",
              )}
            >
              {showChatInput && (
                <form
                  onSubmit={sendChatMessage}
                  className="animate-in slide-in-from-bottom-6"
                >
                  <input
                    autoFocus
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl px-4 py-3 text-white text-sm focus:border-white/40 mb-7 outline-none ml-4"
                  />
                </form>
              )}
              {/* 3 button */}
              <div className={clsx("gap-1 md:gap-2 mb-2", hideMobileControlsRow ? "hidden md:flex flex-wrap" : "flex flex-wrap")}>
                <button
                  type="button"
                  onClick={toggleCam}
                  className="w-11 h-11 rounded-full border border-b-[3px] border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
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
                      "w-11 h-11 rounded-full  border-b-[3px] border flex items-center justify-center transition-all hover:bg-white/10 active:scale-95",
                      isScreenSharing
                        ? "border-emerald-400/80 bg-emerald-500/20"
                        : "border-white/40",
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
                  onClick={
                    onChatButtonClick ||
                    (() => setShowChatInput(!showChatInput))
                  }
                  className="w-11 h-11 rounded-full border  border-b-[3px] border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
                >
                  <img
                    src="/msg.png"
                    className="w-5 h-5 object-contain"
                    alt="Message"
                  />
                </button>

                {/* logo */}
                <img src="/logotransparent.png" className=' z-10 md:hidden  mt-2 ml-2' />

              </div>
            </div>

            {/* 2 gift button  */}
            <div className={clsx("gap-2 md:gap-2", hideMobileControlsRow ? "hidden md:flex" : "flex")}>
              <button
                type="button"
                onClick={() => setIsDareOpen(true)}
                className="relative w-14 h-14 flex border-2 border-b-4 rounded-full border-[#13133b]   items-center justify-center transition-transform hover:scale-105 active:scale-95"
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
                className="relative w-14 h-14 flex items-center border-2 border-b-4 rounded-full border-[#13133b] justify-center transition-transform hover:scale-105 active:scale-95"
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
        )}

        {/* 🔲 HUD BORDER FRAME */}
        <div
          className={clsx(
            "absolute hidden  md:block top-4 left-4 right-4   border rounded-3xl md:rounded-[60px] pointer-events-none z-20 transition-colors",
            isGiftModalOpen || isDareOpen
              ? "border-white/50  bottom-28"
              : "border-white/30 bottom-24",
          )}
        />
      </div>


    </div>
  );
}
