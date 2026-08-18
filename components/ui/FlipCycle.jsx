"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

const FLIP_MS = 320;

/**
 * Shows one value at a time and flips to the next. Never stacks labels.
 */
export default function FlipCycle({
  items = [],
  intervalMs = 2500,
  className,
  itemClassName,
  align = "center",
  renderItem,
  empty = null,
}) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  const listKey = list.join("\0");
  const [index, setIndex] = useState(0);
  const [rotate, setRotate] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [instant, setInstant] = useState(false);
  const indexRef = useRef(0);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    setRotate(0);
    setHidden(false);
    setInstant(false);
    clearTimers();
  }, [listKey]);

  useEffect(() => {
    if (list.length <= 1) return undefined;

    const id = window.setInterval(() => {
      setInstant(false);
      setRotate(90);
      setHidden(true);
      const hideId = window.setTimeout(() => {
        const next = (indexRef.current + 1) % list.length;
        indexRef.current = next;
        setIndex(next);
        setInstant(true);
        setRotate(-90);
        const snapId = window.setTimeout(() => {
          setInstant(false);
          setRotate(0);
          setHidden(false);
        }, 32);
        timersRef.current.push(snapId);
      }, FLIP_MS);
      timersRef.current.push(hideId);
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      clearTimers();
    };
  }, [list.length, intervalMs]);

  if (list.length === 0) return empty;

  const safeIndex = list.length ? index % list.length : 0;
  const justify =
    align === "end"
      ? "justify-end"
      : align === "start"
        ? "justify-start"
        : "justify-center";

  const paint = (value) => (renderItem ? renderItem(value) : value);

  return (
    <span
      className={clsx(
        "flex h-full min-w-0 w-full items-center overflow-hidden",
        justify,
        className,
      )}
      style={{ perspective: 280 }}
    >
      <span
        className={clsx(
          "flex min-w-0 w-full items-center",
          justify,
          itemClassName,
        )}
        style={{
          transform: `rotateX(${rotate}deg)`,
          opacity: hidden ? 0 : 1,
          transformOrigin: "center",
          backfaceVisibility: "hidden",
          transition: instant
            ? "none"
            : `transform ${FLIP_MS}ms ease, opacity ${FLIP_MS}ms ease`,
        }}
      >
        {paint(list[safeIndex])}
      </span>
    </span>
  );
}
