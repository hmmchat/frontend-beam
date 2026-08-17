"use client";

import { useLayoutEffect, useRef, useState } from "react";

function contentBoxSize(el) {
  const style = getComputedStyle(el);
  return {
    width:
      el.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight),
    height:
      el.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom),
  };
}

/**
 * Uniformly scale `contentRef` to fit inside `containerRef` without clipping.
 * Pass `active` when the measured nodes mount/unmount (e.g. tab switches).
 */
export default function useFitScale(active = true) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const supportsZoom =
    typeof CSS !== "undefined" && CSS.supports?.("zoom", "1");

  useLayoutEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const update = () => {
      const { width: cw, height: ch } = contentBoxSize(container);
      const nw = content.offsetWidth;
      const nh = content.offsetHeight;
      if (cw < 8 || ch < 8 || nw < 8 || nh < 8) return;
      const next = Math.floor(Math.min(cw / nw, ch / nh) * 1000) / 1000;
      setScale((prev) => (Math.abs(prev - next) < 0.002 ? prev : next));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, [active]);

  return { containerRef, contentRef, scale, supportsZoom };
}
