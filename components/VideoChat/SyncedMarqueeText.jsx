"use client";

import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";

const MIN_DURATION_MS = 8000;
const MAX_DURATION_MS = 45000;
const MS_PER_CHAR = 150;
const LOOP_GAP = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";

/** Deterministic duration so every client uses the same loop length for the same text. */
export function getDareMarqueeDurationMs(text = "") {
  const len = String(text).length;
  return Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, Math.round(len * MS_PER_CHAR)));
}

function buildAnimStyle(text, marqueeStartAt) {
  const durationMs = getDareMarqueeDurationMs(text);
  const start =
    typeof marqueeStartAt === "number" && Number.isFinite(marqueeStartAt)
      ? marqueeStartAt
      : Date.now();
  const elapsed = Math.max(0, Date.now() - start);
  const delayMs = -(elapsed % durationMs);

  // Full shorthand — split animation-* props are flaky on some mobile WebKits.
  return {
    animation: `dare-synced-marquee ${durationMs}ms linear ${delayMs}ms infinite`,
    WebkitAnimation: `dare-synced-marquee ${durationMs}ms linear ${delayMs}ms infinite`,
  };
}

/**
 * Overflow-only marquee whose CSS animation phase is locked to `marqueeStartAt`
 * so all call participants read the same scroll position at the same time.
 */
export default function SyncedMarqueeText({
  text = "",
  marqueeStartAt,
  className,
  textClassName,
}) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const [animStyle, setAnimStyle] = useState(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const update = () => {
      // Prefer the laid-out width; if the flex parent hasn't constrained yet,
      // fall back to the offsetParent / parent client width.
      const parent = container.parentElement;
      const containerWidth = container.clientWidth;
      const constraintWidth =
        containerWidth > 0
          ? containerWidth
          : parent?.clientWidth || 0;
      const contentWidth = measure.scrollWidth;
      const overflows =
        constraintWidth > 0
          ? contentWidth > constraintWidth + 1
          : contentWidth > 0 && String(text).length > 18;

      setNeedsMarquee(overflows);
      if (overflows && text) {
        setAnimStyle(buildAnimStyle(text, marqueeStartAt));
      } else {
        setAnimStyle(null);
      }
    };

    update();
    // Re-measure after fonts/layout settle (common mobile miss on first paint).
    const raf = requestAnimationFrame(update);
    const t = window.setTimeout(update, 100);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(container);
    if (container.parentElement) ro?.observe(container.parentElement);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      ro?.disconnect();
    };
  }, [text, marqueeStartAt]);

  return (
    <div
      ref={containerRef}
      className={clsx("relative overflow-hidden whitespace-nowrap min-w-0 w-full max-w-full", className)}
    >
      <span
        ref={measureRef}
        className={clsx(
          "invisible absolute left-0 top-0 whitespace-nowrap pointer-events-none",
          textClassName,
        )}
        aria-hidden
      >
        {text}
      </span>

      {needsMarquee ? (
        <div
          className="dare-synced-marquee inline-flex whitespace-nowrap will-change-transform"
          style={animStyle || undefined}
        >
          <span className={textClassName}>
            {text}
            {LOOP_GAP}
          </span>
          <span className={textClassName} aria-hidden>
            {text}
            {LOOP_GAP}
          </span>
        </div>
      ) : (
        <span className={clsx("inline-block max-w-full truncate", textClassName)}>
          {text || ""}
        </span>
      )}

      <style>{`
        @keyframes dare-synced-marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @-webkit-keyframes dare-synced-marquee {
          0% { -webkit-transform: translate3d(0, 0, 0); transform: translate3d(0, 0, 0); }
          100% { -webkit-transform: translate3d(-50%, 0, 0); transform: translate3d(-50%, 0, 0); }
        }
        .dare-synced-marquee {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}
