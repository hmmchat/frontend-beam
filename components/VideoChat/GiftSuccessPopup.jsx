"use client";

import OverlayBackdrop from '@/components/ui/OverlayBackdrop';
import { useEffect, useState } from "react";
import clsx from "clsx";

export default function GiftSuccessPopup({ isOpen, onClose, gift, recipientName }) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const t = setTimeout(() => setAnimateIn(true), 50);

      // Auto close after 2.5 seconds
      const autoClose = setTimeout(() => {
        handleClose();
      }, 2500);

      return () => {
        clearTimeout(t);
        clearTimeout(autoClose);
      };
    } else {
      handleClose();
    }
  }, [isOpen]);

  const handleClose = () => {
    setAnimateIn(false);
    const t = setTimeout(() => {
      setShouldRender(false);
      if (onClose) onClose();
    }, 250);
    return () => clearTimeout(t);
  };

  if (!shouldRender || !gift) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <OverlayBackdrop
        onClick={handleClose}
        className={clsx(
          "transition-opacity duration-300",
          animateIn ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Modal Container */}
      <div
        className={clsx(
          "relative z-10 border-2 border-white bg-slate-950  rounded-[32px] p-6 max-w-[280px] w-full text-center transition-all duration-300 ease-out transform overflow-hidden",
          animateIn ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-4"
        )}
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {/* Background Image matching GiftOverlay */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            opacity: 0.9,
          }}
        />

        {/* Content wrapper to float above background */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Small animated gift icon */}
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 animate-bounce shadow-inner mb-4">
            {gift.imageUrl ? (
              <img src={gift.imageUrl} className="w-10 h-10 object-contain" alt={gift.name || "gift"} />
            ) : (
              <span className="text-3xl">{gift.img || "🎁"}</span>
            )}
          </div>

          {/* Heading */}
          <h3 className="text-white text-xl font-bold mb-1 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            Gift Sent!
          </h3>

          {/* Subtext */}
          <p className="text-white/80 text-xs font-normal mb-5">
            Successfully sent to <span className="text-yellow-300 font-semibold">{recipientName || "user"}</span>
          </p>

          {/* Action Button */}
          <button
            onClick={handleClose}
            className="w-full bg-white text-purple-950 font-bold py-2.5 px-4 rounded-xl hover:bg-white/90 active:scale-95 transition-all text-xs shadow-md"
          >
            Awesome
          </button>
        </div>
      </div>
    </div>
  );
}
