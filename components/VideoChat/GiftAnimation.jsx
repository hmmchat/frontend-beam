"use client";

import { useEffect, useRef, useState } from "react";

export default function GiftAnimation({ gift, onComplete, persistUntilDismissed, forceDismiss }) {
  const containerRef = useRef(null);
  const giftRef = useRef(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const isDismissingRef = useRef(false);

  // Keep a mutable ref for onComplete to insulate from identity changes
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const handleDismiss = () => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, 500); // Wait for the transition to finish
  };

  // Monitor forceDismiss to handle remote dismissal
  useEffect(() => {
    if (forceDismiss) {
      handleDismiss();
    }
  }, [forceDismiss]);

  useEffect(() => {
    if (!gift) return;

    // Reset dismissing states when a new gift is loaded
    isDismissingRef.current = false;
    setIsFadingOut(false);

    // Constant speed parameters using a fixed diagonal velocity vector
    const speed = 1.8; // pixels per frame
    let vx = (Math.random() > 0.5 ? 1 : -1) * speed;
    let vy = (Math.random() > 0.5 ? 1 : -1) * speed;

    let x = 0;
    let y = 0;
    let rotation = 0;
    let initialized = false;
    let rafId;

    const animate = () => {
      if (!containerRef.current || !giftRef.current) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Default to 64px if elements are not loaded yet
      const giftWidth = giftRef.current.clientWidth || 64;
      const giftHeight = giftRef.current.clientHeight || 64;

      // Position in the center initially once container size is known
      if (!initialized && containerWidth > 0 && containerHeight > 0) {
        x = (containerWidth - giftWidth) / 2;
        y = (containerHeight - giftHeight) / 2;
        initialized = true;
        
        // Fade in the outer container
        giftRef.current.style.opacity = "1";
      }

      if (initialized) {
        x += vx;
        y += vy;
        rotation = (rotation + 1.2) % 360;

        const maxW = containerWidth - giftWidth;
        const maxH = containerHeight - giftHeight;

        // Collision logic with boundary reflection
        if (x <= 0) {
          x = 0;
          vx = Math.abs(vx);
        } else if (x >= maxW) {
          x = maxW;
          vx = -Math.abs(vx);
        }

        if (y <= 0) {
          y = 0;
          vy = Math.abs(vy);
        } else if (y >= maxH) {
          y = maxH;
          vy = -Math.abs(vy);
        }

        // Keep values safely clamped in bounds (in case container resized)
        if (x < 0) x = 0;
        if (maxW > 0 && x > maxW) x = maxW;
        if (y < 0) y = 0;
        if (maxH > 0 && y > maxH) y = maxH;

        // Directly manipulate style transform to bypass React render lifecycle for 60fps performance
        giftRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    let fadeOutTimer;
    let completeTimer;

    // Only set auto-dismiss timers if NOT configured to persist
    if (!persistUntilDismissed) {
      // Fade out after 5 seconds
      fadeOutTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 5000);

      // Complete animation lifecycle after 5.5 seconds (gives time for fade out CSS transition)
      completeTimer = setTimeout(() => {
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }, 5500);
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (fadeOutTimer) clearTimeout(fadeOutTimer);
      if (completeTimer) clearTimeout(completeTimer);
    };
  }, [gift, persistUntilDismissed]); // Removed onComplete from dependencies to prevent restarts

  if (!gift) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[999] overflow-hidden rounded-[inherit]"
    >
      <div
        ref={giftRef}
        onClick={handleDismiss}
        className="absolute left-0 top-0 select-none transition-opacity duration-300 ease-out pointer-events-auto cursor-pointer"
        style={{
          transform: "translate3d(0px, 0px, 0px)",
          opacity: 0,
          willChange: "transform, opacity",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className={`transition-all duration-500 ease-in-out ${
            isFadingOut ? "scale-0 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          {gift.imageUrl ? (
            <img
              src={gift.imageUrl}
              className="w-16 h-16 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
              alt={gift.name || "gift"}
            />
          ) : (
            <span className="text-[64px] drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] leading-none select-none">
              {gift.img || "🎁"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}