"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

const DEFAULT_DELAY_MS = 220;

/**
 * Circular dare/gift launcher that plays a press animation, then fires `onPress`
 * after a short delay so the click feels readable on touch devices.
 *
 * Pass `iconSrc` for image buttons, or `children` for custom content (e.g. SEND DARE).
 */
export default function PressableActionButton({
  onPress,
  delayMs = DEFAULT_DELAY_MS,
  className,
  circleClassName,
  iconSrc,
  iconClassName,
  alt = "",
  disabled = false,
  showCircle = true,
  children,
  "aria-label": ariaLabel,
}) {
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleActivate = useCallback(() => {
    if (disabled || busyRef.current || typeof onPress !== "function") return;
    busyRef.current = true;
    setPressed(true);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setPressed(false);
      busyRef.current = false;
      onPress();
    }, delayMs);
  }, [disabled, onPress, delayMs]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel || alt}
      onClick={handleActivate}
      onPointerDown={(e) => {
        // Make :pressed-style feedback start on touch immediately (iOS :active is flaky).
        if (e.pointerType === "touch" || e.pointerType === "pen") {
          if (!disabled) setPressed(true);
        }
      }}
      onPointerUp={() => {
        // Keep pressed visual until the delayed open fires; don't clear early.
      }}
      onPointerCancel={() => {
        if (timerRef.current) return;
        setPressed(false);
      }}
      className={clsx(
        "group relative flex items-center justify-center border-2 border-b-4 border-[#13133b] rounded-full touch-manipulation select-none",
        "transition-transform duration-150 ease-out",
        className,
        pressed ? "scale-95 !border-b-2" : "hover:scale-105",
        disabled && "opacity-50 pointer-events-none",
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {showCircle && (
        <img
          src="/circle.png"
          alt=""
          aria-hidden
          className={clsx(
            "absolute inset-0 w-full h-full rounded-full transition-transform duration-200 ease-out",
            pressed && "rotate-180",
            circleClassName,
          )}
        />
      )}
      {children != null ? (
        <div
          className={clsx(
            "relative transition-transform duration-150 ease-out",
            pressed ? "scale-[0.8]" : "scale-100",
          )}
        >
          {children}
        </div>
      ) : (
        <img
          src={iconSrc}
          alt={alt}
          className={clsx(
            "relative transition-transform duration-150 ease-out",
            pressed ? "scale-[0.8]" : "scale-100",
            iconClassName,
          )}
        />
      )}
    </button>
  );
}
