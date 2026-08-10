"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import clsx from "clsx";

const MIN_DURATION_MS = 8000;
const MAX_DURATION_MS = 45000;
const MS_PER_CHAR = 150;
const LOOP_GAP = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
/** Long dares always marquee — no wait for async measure (that left mobile static). */
const FORCE_MARQUEE_CHARS = 18;

/** Deterministic duration so every client uses the same loop length for the same text. */
export function getDareMarqueeDurationMs(text = "") {
  const len = String(text).length;
  return Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, Math.round(len * MS_PER_CHAR)));
}

function getAvailableWidth(container) {
  const parent = container?.parentElement;
  if (!parent) return container?.clientWidth || 0;

  const parentStyle = window.getComputedStyle(parent);
  const paddingX =
    (parseFloat(parentStyle.paddingLeft) || 0) +
    (parseFloat(parentStyle.paddingRight) || 0);
  const gap = parseFloat(parentStyle.columnGap || parentStyle.gap) || 0;

  let siblingWidth = 0;
  let siblingCount = 0;
  for (const child of parent.children) {
    if (child === container) continue;
    siblingWidth += child.getBoundingClientRect().width;
    siblingCount += 1;
  }

  const gaps = siblingCount > 0 ? gap * siblingCount : 0;
  const parentInner = parent.clientWidth - paddingX - siblingWidth - gaps;
  return parentInner > 0 ? parentInner : container.clientWidth || 0;
}

/**
 * Marquee locked to `marqueeStartAt` so peers share scroll phase.
 * Long text marquees on the first paint (no async gate). Short text only
 * marquees when measured overflow says so.
 *
 * Driven by rAF + translate3d — CSS animations stay frozen in mobile overlays
 * until a later layout change (e.g. peer taps "I'm in").
 */
export default function SyncedMarqueeText({
  text = "",
  marqueeStartAt,
  className,
  textClassName,
  /** When true, always start this viewer at the beginning of the string. */
  startFromBeginning = false,
}) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const trackRef = useRef(null);
  const [measuredOverflow, setMeasuredOverflow] = useState(false);

  const trimmed = String(text || "").trim();
  // Synchronous for long copy — do not wait on useLayoutEffect/setState.
  const needsMarquee =
    trimmed.length >= FORCE_MARQUEE_CHARS || (Boolean(trimmed) && measuredOverflow);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || !trimmed) {
      setMeasuredOverflow(false);
      return;
    }
    // Long text already marquees; only measure for shorter copy.
    if (trimmed.length >= FORCE_MARQUEE_CHARS) return;

    const update = () => {
      const availableWidth = getAvailableWidth(container);
      const contentWidth = measure.scrollWidth;
      setMeasuredOverflow(
        availableWidth > 0
          ? contentWidth > availableWidth + 1
          : contentWidth > 0 && trimmed.length > 12,
      );
    };

    update();
    const raf = requestAnimationFrame(update);
    const t = window.setTimeout(update, 120);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(container);
    ro?.observe(measure);
    if (container.parentElement) ro?.observe(container.parentElement);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      ro?.disconnect();
    };
  }, [trimmed]);

  useEffect(() => {
    if (!needsMarquee || !trimmed) return;

    const durationMs = getDareMarqueeDurationMs(trimmed);
    const start = startFromBeginning
      ? Date.now()
      : typeof marqueeStartAt === "number" && Number.isFinite(marqueeStartAt)
        ? marqueeStartAt
        : Date.now();

    let rafId = 0;
    const tick = () => {
      const el = trackRef.current;
      if (el) {
        const elapsed = Math.max(0, Date.now() - start) % durationMs;
        // 0% = beginning of the dare text; -50% = seamless loop of the duplicate.
        const pct = (elapsed / durationMs) * -50;
        el.style.transform = `translate3d(${pct}%, 0, 0)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [needsMarquee, trimmed, marqueeStartAt, startFromBeginning]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative overflow-hidden whitespace-nowrap min-w-0 w-full max-w-full",
        className,
      )}
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
          ref={trackRef}
          className="inline-flex whitespace-nowrap will-change-transform"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translate3d(0, 0, 0)",
          }}
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
    </div>
  );
}
