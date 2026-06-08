"use client";

import React from "react";
import clsx from "clsx";
import { FaRegBookmark, FaRegQuestionCircle } from "react-icons/fa";

export default function DareProposalOverlay({
  proposal,
  onAccept,
  onReject,
  isOpen
}) {
  const [hasAccepted, setHasAccepted] = React.useState(false);

  React.useEffect(() => {
    setHasAccepted(false);
  }, [proposal]);

  if (!isOpen || !proposal) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60]" />

      <div className="absolute z-[65] md:bottom-8 bottom-[6vh] left-1/2 -translate-x-1/2 md:-translate-x-0 sm:translate-y-0 w-full md:left-1/4 flex flex-col items-center px-4 pointer-events-none">

        {/* Modal Container */}
        <div
          className="w-full max-w-[400px] border-2 border-white md:rounded-[40px] rounded-[26px] px-5 py-4  relative overflow-hidden  pointer-events-auto"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.8,
          }}
        >
          {/* Header Icons */}
          <div className="flex justify-between items-center relative z-10 px-2">
            <button className="text-white/85 z-10">
              <FaRegBookmark className="text-[20px] md:text-[26.8]" />
            </button>
            <button className="text-white/80 z-10">
              <FaRegQuestionCircle className="text-white text-[22px] md:text-[28] cursor-pointer hover:text-white/80 transition" />
            </button>
          </div>

          {/* Dare Info */}
          <div className="text-center relative z-10 px-4 mb-2 ">
            <p className="md:text-[11px] text-[10px] text-white/90 font-medium mb-2">
              {proposal.senderName || "Someone"} is Daring you to
            </p>
            <div className="inline-block px-8 w-[80%] py-1.5 border border-white/60 rounded-full text-white md:text-md text-xs  whitespace-nowrap font-otomanopee">
              {proposal.dareText || "Do a dare"}
            </div>
          </div>

          {/* Circular HUD Display */}
          <div className="relative flex items-center justify-between w-full px-2 py-2 z-10 gap-2 border border-white/40 rounded-full  ">
            {/* Price Circle */}
            <div className="w-16 h-16 rounded-full border border-white/30 flex flex-col items-center justify-center shrink-0">
              <div className="text-xs mb-0.5">💎</div>
              <div className="text-[11px] font-bold text-white leading-none">
                {proposal.giftPrice || "0"}
              </div>
            </div>

            {/* Status Middle */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="w-8 h-8 flex items-center justify-center mb-1">
                <img src="/gift-light.svg" alt="gift" className="w-6" />
              </div>
              <p className="text-[10px] text-white/90 font-medium whitespace-nowrap uppercase tracking-tighter">
                Added gifts
              </p>
            </div>

            {/* Gift Image Circle */}
            <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center shrink-0 ">
              <div className="text-3xl filter drop-shadow-md">
                {proposal.giftImg && (proposal.giftImg.startsWith("http") || proposal.giftImg.startsWith("/")) ? (
                  <img src={proposal.giftImg} className="w-10 h-10 object-contain" alt="" />
                ) : (
                  proposal.giftImg
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}

        </div>

        {hasAccepted ? (
          <div className="flex justify-center items-center w-[350px] mt-2 z-10 pointer-events-auto">
            <div className="w-full text-center py-3.5 px-6 bg-black/60 border border-white/20 rounded-full text-white font-bold text-sm backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
              Waiting for {proposal.senderName || "Someone"}.
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center gap-3 relative w-[350px] mt-2 z-10 pointer-events-auto">
            <button
              onClick={onReject}
              style={{
                backgroundImage: "url(/assets/mb.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.8,
              }}
              className="flex-1 py-3.5 border border-white/60 rounded-full text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
              Nvm! 🥱
            </button>

            <button
              onClick={() => {
                onAccept();
                setHasAccepted(true);
              }}
              style={{
                backgroundImage: "url(/assets/mb.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.8,
              }}
              className="flex-1 py-3.5 border border-white/60 rounded-full text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md"
            >
              I'm in 💪
            </button>
          </div>
        )}
      </div>
    </>
  );
}
