"use client";

import React from "react";
import clsx from "clsx";

export default function DareProposalOverlay({
  proposal,
  onAccept,
  onReject,
  isOpen
}) {
  if (!isOpen || !proposal) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onReject} />

      <div className="absolute z-[65] md:bottom-3 bottom-24 left-1/2 -translate-x-1/2 md:translate-y-0 w-full flex flex-col items-center px-4 pointer-events-none">
        
        {/* Modal Container */}
        <div
          className="w-full max-w-[400px] border-2 border-white/40 md:rounded-[40px] rounded-[32px] p-6 relative overflow-hidden shadow-2xl pointer-events-auto"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Header Icons */}
          <div className="flex justify-between items-center mb-4 relative z-10">
            <button className="text-white/80 cursor-pointer" onClick={onReject}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
              </svg>
            </button>
            <button className="text-white/80">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
              </svg>
            </button>
          </div>

          {/* Dare Info */}
          <div className="text-center relative z-10 px-4 mb-6">
            <p className="text-[11px] text-white/90 font-medium mb-2">
              {proposal.senderName || "Someone"} is Daring you to
            </p>
            <div className="inline-block px-8 py-2 border border-white/60 rounded-full text-white font-bold text-lg bg-white/5 whitespace-nowrap">
              {proposal.dareText || "Do a dare"}
            </div>
          </div>

          {/* Circular HUD Display */}
          <div className="relative flex items-center justify-between w-full px-2 py-3 z-10 gap-2 border border-white/40 rounded-[32px] bg-black/20 backdrop-blur-sm mb-6">
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
            <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center shrink-0 bg-white/5">
              <div className="text-3xl filter drop-shadow-md">
                {proposal.giftImg || "🎁"}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center gap-3 relative z-10">
            <button
              onClick={onReject}
              className="flex-1 py-3.5 border border-white/60 rounded-full text-white font-bold text-sm bg-black/40 hover:bg-white/10 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
              Nvm! 🥱
            </button>
            <button
              onClick={onAccept}
              className="flex-1 py-3.5 border border-white/60 rounded-full text-white font-bold text-sm bg-white/10 hover:bg-white/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md"
            >
              I'm in 💪
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
