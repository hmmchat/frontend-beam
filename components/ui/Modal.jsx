"use client";

import OverlayBackdrop from '@/components/ui/OverlayBackdrop';
import { useEffect } from "react";

export default function Modal({
  isOpen,
  onClose,
  children,
  className = "",
  maxWidth = "125vh",
  maxHeight = "90vh",
  bottom,
  left,
  right,
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => (document.body.style.overflow = "unset");
  }, [isOpen]);

  if (!isOpen) return null;

  // Custom positioning logic
  const customPositionStyles =
    bottom !== undefined || left !== undefined || right !== undefined
      ? { bottom, left, right, top: "auto", transform: "none" }
      : {};

  const isBottomSheet = bottom === "0";

  return (
    <div
      className={`fixed inset-0 z-[50] md:p-5 md:animate-fade-in ${
        isBottomSheet
          ? "flex items-end justify-center"
          : "flex items-center justify-center"
      }`}
    >
      <OverlayBackdrop onClick={onClose} />
      <div
        className={`
    relative overflow-y-auto overscroll-contain animate-slide-up z-12
    bg-[#02004A]/80 backdrop-blur-xl
    
    /* MOBILE */

    p-3 rounded-none 
    ${isBottomSheet ? "w-full rounded-t-[32px] max-h-[min(92dvh,100%)] pb-[env(safe-area-inset-bottom)]" : "absolute inset-0 h-[100dvh]"}
    ${isBottomSheet ? "" : "md:h-auto md:overflow-hidden"}

    /* DESKTOP – APPLE GLASS */
    md:w-full md:h-auto
    md:inset-auto /* Reset absolute inset for desktop if not bottom sheet, or keep standard modal behavior */

    md:p-12
    md:rounded-[60px]
   

   

    md:border-[2px] md:border-white/30

    ${className}
  `}
        style={{
          backgroundImage: "url(/assets/mb.jpg)",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
          maxWidth: isBottomSheet ? "100%" : maxWidth,
          maxHeight,
          ...customPositionStyles,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
