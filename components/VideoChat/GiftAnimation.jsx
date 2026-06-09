"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isMobileRuntime } from "@/lib/webrtc-media-utils";

const getGiftAnimationKey = (gift, index = 0) =>
  gift?.messageId || gift?.id || `${gift?.name || "gift"}-${gift?.targetUserId || "target"}-${index}`;

function GiftVisual({ gift }) {
  return gift.imageUrl ? (
    <img
      src={gift.imageUrl}
      className="w-16 h-16 object-contain "
      alt={gift.name || "gift"}
    />
  ) : (
    <span className="text-[64px] leading-none select-none">
      {gift.img || "🎁"}
    </span>
  );
}

export function GiftAnimationGroup({ gifts, onComplete, onDismissStart, persistUntilDismissed, forceDismiss, interactive = true }) {
  const containerRef = useRef(null);
  const itemRefs = useRef(new Map());
  const physicsRef = useRef(new Map());
  const dismissingRef = useRef(new Set());
  const onCompleteRef = useRef(onComplete);
  const onDismissStartRef = useRef(onDismissStart);
  const [fadingGiftKeys, setFadingGiftKeys] = useState(() => new Set());

  const giftItems = useMemo(() => Array.isArray(gifts) ? gifts.filter(Boolean) : [], [gifts]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onDismissStartRef.current = onDismissStart;
  }, [onDismissStart]);

  const dismissGift = useCallback((gift, key) => {
    if (dismissingRef.current.has(key)) return;
    dismissingRef.current.add(key);
    // Fire onDismissStart immediately so the parent can broadcast dismissal
    onDismissStartRef.current?.(gift);
    setFadingGiftKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setTimeout(() => {
      onCompleteRef.current?.(gift);
    }, 500);
  }, []);

  useEffect(() => {
    if (!forceDismiss) return;
    giftItems.forEach((gift, index) => dismissGift(gift, getGiftAnimationKey(gift, index)));
  }, [dismissGift, forceDismiss, giftItems]);

  useEffect(() => {
    giftItems.forEach((gift, index) => {
      if (gift.isDismissed) dismissGift(gift, getGiftAnimationKey(gift, index));
    });
  }, [dismissGift, giftItems]);

  useEffect(() => {
    const activeKeys = new Set(giftItems.map((gift, index) => getGiftAnimationKey(gift, index)));
    for (const key of physicsRef.current.keys()) {
      if (!activeKeys.has(key)) physicsRef.current.delete(key);
    }
    for (const key of dismissingRef.current) {
      if (!activeKeys.has(key)) dismissingRef.current.delete(key);
    }
  }, [giftItems]);

  useEffect(() => {
    if (giftItems.length === 0) return;

    const speed = 1.8;
    const throttlePhysics = persistUntilDismissed && isMobileRuntime();
    let rafId;
    let frame = 0;

    const getPhysics = (key, containerWidth, containerHeight, giftWidth, giftHeight) => {
      let physics = physicsRef.current.get(key);
      if (!physics) {
        const jitterX = (Math.random() - 0.5) * Math.min(containerWidth * 0.35, 160);
        const jitterY = (Math.random() - 0.5) * Math.min(containerHeight * 0.35, 160);
        physics = {
          x: Math.max(0, (containerWidth - giftWidth) / 2 + jitterX),
          y: Math.max(0, (containerHeight - giftHeight) / 2 + jitterY),
          vx: (Math.random() > 0.5 ? 1 : -1) * speed,
          vy: (Math.random() > 0.5 ? 1 : -1) * speed,
          rotation: Math.random() * 360,
        };
        physicsRef.current.set(key, physics);
      }
      return physics;
    };

    const animate = () => {
      frame += 1;
      const container = containerRef.current;
      if (!container) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      if (containerWidth <= 0 || containerHeight <= 0) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const activeItems = giftItems.map((gift, index) => {
        const key = getGiftAnimationKey(gift, index);
        const el = itemRefs.current.get(key);
        if (!el) return null;
        const width = el.clientWidth || 64;
        const height = el.clientHeight || 64;
        const physics = getPhysics(key, containerWidth, containerHeight, width, height);
        return { key, el, width, height, physics };
      }).filter(Boolean);

      const runPhysics = !(throttlePhysics && frame % 2 === 1);
      if (runPhysics) {
        activeItems.forEach(({ width, height, physics }) => {
          physics.x += physics.vx;
          physics.y += physics.vy;
          physics.rotation = (physics.rotation + 1.2) % 360;

          const maxX = Math.max(0, containerWidth - width);
          const maxY = Math.max(0, containerHeight - height);
          if (physics.x <= 0) {
            physics.x = 0;
            physics.vx = Math.abs(physics.vx);
          } else if (physics.x >= maxX) {
            physics.x = maxX;
            physics.vx = -Math.abs(physics.vx);
          }

          if (physics.y <= 0) {
            physics.y = 0;
            physics.vy = Math.abs(physics.vy);
          } else if (physics.y >= maxY) {
            physics.y = maxY;
            physics.vy = -Math.abs(physics.vy);
          }
        });

        for (let i = 0; i < activeItems.length; i += 1) {
          for (let j = i + 1; j < activeItems.length; j += 1) {
            const a = activeItems[i];
            const b = activeItems[j];
            const ar = Math.max(a.width, a.height) / 2;
            const br = Math.max(b.width, b.height) / 2;
            const ax = a.physics.x + a.width / 2;
            const ay = a.physics.y + a.height / 2;
            const bx = b.physics.x + b.width / 2;
            const by = b.physics.y + b.height / 2;
            const dx = bx - ax;
            const dy = by - ay;
            const distance = Math.hypot(dx, dy) || 1;
            const minDistance = ar + br;

            if (distance >= minDistance) continue;

            const nx = dx / distance;
            const ny = dy / distance;
            const overlap = (minDistance - distance) / 2;
            a.physics.x -= nx * overlap;
            a.physics.y -= ny * overlap;
            b.physics.x += nx * overlap;
            b.physics.y += ny * overlap;

            const relativeVx = a.physics.vx - b.physics.vx;
            const relativeVy = a.physics.vy - b.physics.vy;
            const movingTogether = relativeVx * nx + relativeVy * ny > 0;
            if (!movingTogether) continue;

            const aNormal = a.physics.vx * nx + a.physics.vy * ny;
            const bNormal = b.physics.vx * nx + b.physics.vy * ny;
            a.physics.vx += (bNormal - aNormal) * nx;
            a.physics.vy += (bNormal - aNormal) * ny;
            b.physics.vx += (aNormal - bNormal) * nx;
            b.physics.vy += (aNormal - bNormal) * ny;
          }
        }
      }

      activeItems.forEach(({ el, physics }) => {
        el.style.opacity = "1";
        el.style.transform = `translate3d(${physics.x}px, ${physics.y}px, 0) rotate(${physics.rotation}deg)`;
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [giftItems, persistUntilDismissed]);

  if (giftItems.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[999] overflow-hidden rounded-[inherit]"
    >
      {giftItems.map((gift, index) => {
        const key = getGiftAnimationKey(gift, index);
        const isFadingOut = fadingGiftKeys.has(key) || gift.isDismissed;
        return (
          <div
            key={key}
            ref={(el) => {
              if (el) itemRefs.current.set(key, el);
              else itemRefs.current.delete(key);
            }}
            onClick={interactive ? () => dismissGift(gift, key) : undefined}
            className={`absolute left-0 top-0 select-none transition-opacity duration-300 ease-out ${interactive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
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
              className={`transition-all duration-500 ease-in-out ${isFadingOut ? "scale-0 opacity-0" : "scale-100 opacity-100"
                }`}
            >
              <GiftVisual gift={gift} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GiftAnimation({ gift, onComplete, onDismissStart, persistUntilDismissed, forceDismiss, interactive = true }) {
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
    // Fire onDismissStart immediately so the parent can broadcast dismissal
    if (onDismissStart) onDismissStart(gift);
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
    let frame = 0;
    const throttlePhysics = persistUntilDismissed && isMobileRuntime();

    const animate = () => {
      frame += 1;
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

      const runPhysics = initialized && !(throttlePhysics && frame % 2 === 1);
      if (runPhysics) {
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
      } else if (initialized && giftRef.current) {
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
        onClick={interactive ? handleDismiss : undefined}
        className={`absolute left-0 top-0 select-none transition-opacity duration-300 ease-out ${interactive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
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
          className={`transition-all duration-500 ease-in-out ${isFadingOut ? "scale-0 opacity-0" : "scale-100 opacity-100"
            }`}
        >
          {gift.imageUrl ? (
            <img
              src={gift.imageUrl}
              className="w-16 h-16 object-contain "
              alt={gift.name || "gift"}
            />
          ) : (
            <span className="text-[64px]  leading-none select-none">
              {gift.img}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}