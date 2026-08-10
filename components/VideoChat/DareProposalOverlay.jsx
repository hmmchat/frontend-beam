"use client";

import { useState, useEffect, useRef } from "react";
import { FaRegBookmark, FaRegQuestionCircle } from "react-icons/fa";

const KEYFRAMES = `
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0);   opacity: 0.4; }
    30%           { transform: translateY(-5px); opacity: 1;   }
  }
`;

function TypingDots() {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <span className="inline-flex items-center gap-[4px] align-middle px-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-[6px] h-[6px] rounded-full bg-white inline-block"
            style={{
              animation: "typingBounce 1s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </span>
    </>
  );
}

export default function DareProposalOverlay({ proposal, onAccept, onReject, isOpen }) {
  const [hasAccepted, setHasAccepted] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // Reset when sender changes
  useEffect(() => {
    setHasAccepted(false);
    setLiveText("");
    setIsTyping(false);
  }, [proposal?.senderId]);

  // Show dots for 1s, then reveal text
  useEffect(() => {
    if (!isOpen || proposal?.dareText === undefined) return;

    setLiveText("");      // hide text initially
    setIsTyping(true);    // show dots

    const timer = setTimeout(() => {
      setIsTyping(false);           // hide dots
      setLiveText(proposal.dareText); // show text
    }, 1000);

    return () => clearTimeout(timer);
  }, [proposal?.dareText, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [liveText]);

  if (!isOpen || !proposal) return null;

  const displayText = liveText;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm supports-[backdrop-filter]:bg-black/20" />

      <div className="absolute z-[65] md:bottom-8 bottom-[6vh] left-1/2 -translate-x-1/2 md:-translate-x-0 sm:translate-y-0 w-full md:left-1/4 flex flex-col items-center px-4 pointer-events-none">

        {/* Modal card */}
        <div
          className="w-full max-w-[400px] border-2 border-white md:rounded-[40px] rounded-[30px] px-5 py-4 relative overflow-visible pointer-events-auto"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.8,
          }}
        >
          {/* Header icons */}
          <div className="flex justify-between items-center relative z-10 px-2">
            <button className="text-white/85 z-10">
              <FaRegBookmark className="text-[20px] md:text-[26.8]" />
            </button>
            <button className="text-white/80 z-10">
              <FaRegQuestionCircle className="text-white text-[22px] md:text-[28] cursor-pointer hover:text-white/80 transition" />
            </button>
          </div>

          {/* Dare info */}
          <div className="text-center relative z-10 px-4 mb-2 -mt-2">
            <p className="md:text-[11px] text-[10px] text-white/90 font-medium mb-1 md:mb-2 flex items-center justify-center gap-1">
              {proposal.senderName || "Someone"} is Daring you to
            </p>

            {/* Dare bubble — scrollable */}
            <div
              ref={scrollRef}
              className="dare-scroll w-[80%] mx-auto overflow-x-auto overflow-y-hidden px-4 py-1.5 border border-white/60 rounded-full text-white text-xs font-otomanopee text-center"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style>{`.dare-scroll::-webkit-scrollbar{display:none}`}</style>
              <span className="whitespace-nowrap inline-flex items-center justify-center gap-1">
                {isTyping ? (
                  <TypingDots />
                ) : (
                  displayText || <span className="opacity-40">...</span>
                )}
              </span>
            </div>
          </div>

          {/* Circular HUD */}
          <div className="relative flex items-center justify-between w-full px-2 py-2 z-10 gap-2 border border-white/40 rounded-full">
            <div className="w-16 h-16 rounded-full border border-white/30 flex flex-col items-center justify-center shrink-0">
              <div className="text-xs mb-0.5">💎</div>
              <div className="text-[11px] font-bold text-white leading-none">
                {proposal.giftPrice || "0"}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1">
              <div className="w-8 h-8 flex items-center justify-center mb-1">
                <img src="/gift-light.svg" alt="gift" className="w-6" />
              </div>
              <p className="text-[10px] text-white/90 font-medium whitespace-nowrap uppercase tracking-tighter">
                Added gifts
              </p>
            </div>

            <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center shrink-0">
              <div className="text-3xl filter drop-shadow-md">
                {proposal.giftImg && (proposal.giftImg.startsWith("http") || proposal.giftImg.startsWith("/")) ? (
                  <img src={proposal.giftImg} className="w-10 h-10 object-contain" alt="" />
                ) : (
                  proposal.giftImg
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action area */}
        {hasAccepted ? (
          <div className="flex justify-center items-center w-[60%] md:w-[20%] mt-2 z-10 pointer-events-auto">
            <div className="w-full bg-[#0A032D]/40 text-center md:py-3.5 md:px-6 py-3 font-otomanopee rounded-full text-white text-sm flex items-center justify-center gap-2">
              Waiting for {proposal.senderName || "Someone"}
              <TypingDots />
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center gap-3 relative w-[350px] mt-2 z-10 pointer-events-auto">
            <button
              onClick={onReject}
              style={{ backgroundImage: "url(/assets/mb.jpg)", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.8 }}
              className="flex-1 py-3.5 border border-white/60 rounded-full text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
              Nvm! 🥱
            </button>
            <button
              onClick={() => { onAccept(); setHasAccepted(true); }}
              style={{ backgroundImage: "url(/assets/mb.jpg)", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.8 }}
              className="flex-1 py-3.5 border border-white/60 rounded-full text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md"
            >
              I&apos;m in 💪
            </button>
          </div>
        )}
      </div>
    </>
  );
}
