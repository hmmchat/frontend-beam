"use client";

import { useRef } from "react";

const SWIPE_THRESHOLD_PX = 40;

/**
 * Prev/next + mobile swipe for facecard portraits.
 * Dots should render only when photoCount > 1 (2 dots for 2 photos, 3 for 3).
 */
export function useFacecardPhotoPager({
  photoCount,
  currentIndex,
  onIndexChange,
  internalIndex,
  setInternalIndex,
}) {
  const activeIndex = currentIndex !== undefined ? currentIndex : internalIndex;
  const swipeRef = useRef({ x: 0, y: 0, consumed: false });

  const setIndex = (next) => {
    if (photoCount <= 1) return;
    const wrapped = ((next % photoCount) + photoCount) % photoCount;
    if (onIndexChange) onIndexChange(wrapped);
    else setInternalIndex(wrapped);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    setIndex(activeIndex - 1);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setIndex(activeIndex + 1);
  };

  const onTouchStart = (e) => {
    if (photoCount <= 1) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    swipeRef.current = { x: t.clientX, y: t.clientY, consumed: false };
  };

  const onTouchEnd = (e) => {
    if (photoCount <= 1) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - swipeRef.current.x;
    const dy = t.clientY - swipeRef.current.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
    swipeRef.current.consumed = true;
    e.stopPropagation();
    if (dx < 0) setIndex(activeIndex + 1);
    else setIndex(activeIndex - 1);
  };

  const onPhotoClick = (e) => {
    if (photoCount <= 1) return;
    if (swipeRef.current.consumed) {
      swipeRef.current.consumed = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    handleNext(e);
  };

  return {
    activeIndex,
    showDots: photoCount > 1,
    handlePrev,
    handleNext,
    onTouchStart,
    onTouchEnd,
    onPhotoClick,
  };
}
