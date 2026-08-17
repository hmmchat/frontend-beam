"use client";

import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";

/**
 * Shows static text when it fits. When the slot is too narrow, loops the
 * full string so nothing stays hidden behind ellipsis.
 */
export default function OverflowMarquee({
  text = "",
  className,
  gapClassName = "pr-8",
}) {
  const wrapRef = useRef(null);
  const measureRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const content = String(text ?? "");

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) {
      setOverflows(false);
      return;
    }

    const update = () => {
      setOverflows(measure.scrollWidth > wrap.clientWidth + 1);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [content]);

  const durationSec = Math.min(24, Math.max(6, content.length * 0.35));

  return (
    <span
      ref={wrapRef}
      className={clsx(
        "relative block min-w-0 w-full overflow-hidden whitespace-nowrap",
        className,
      )}
      title={content}
    >
      <span
        ref={measureRef}
        className="invisible absolute left-0 top-0 whitespace-nowrap pointer-events-none"
        aria-hidden
      >
        {content}
      </span>
      {overflows ? (
        <span
          className="inline-flex w-max will-change-transform animate-overflow-marquee motion-reduce:animate-none"
          style={{ animationDuration: `${durationSec}s` }}
        >
          <span className={gapClassName}>{content}</span>
          <span className={gapClassName} aria-hidden>
            {content}
          </span>
        </span>
      ) : (
        <span className="inline-block">{content}</span>
      )}
    </span>
  );
}
