'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

const HOLD_MS = 8000;
const OUT_MS = 400;

/**
 * In-call only. Outfit for the line, Otomanopee + gold for the drop.
 * Drops in, holds 8s (or tap anywhere), then lifts out.
 */
export default function MiningToast({ coins, isOpen, noticeId = 0, onDismissed }) {
  const n = Number(coins) || 0;
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState('in');
  const [animReady, setAnimReady] = useState(false);
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || n <= 0) {
      setPhase('in');
      setAnimReady(false);
      return undefined;
    }
    setPhase('in');
    setAnimReady(false);
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setAnimReady(true));
    });
    const hold = window.setTimeout(() => setPhase('out'), HOLD_MS);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(hold);
    };
  }, [isOpen, n, noticeId]);

  useEffect(() => {
    if (phase !== 'out') return undefined;
    const done = window.setTimeout(() => onDismissedRef.current?.(), OUT_MS);
    return () => window.clearTimeout(done);
  }, [phase]);

  if (!mounted || !isOpen || n <= 0) return null;

  const dismiss = () => setPhase('out');
  const motionClass =
    phase === 'out'
      ? 'animate-mining-toast-out'
      : animReady
        ? 'animate-mining-toast-in'
        : 'opacity-0';

  return createPortal(
    <div
      className="fixed inset-0 z-[400]"
      onPointerDown={dismiss}
      role="presentation"
    >
      <div className="absolute top-[max(4.5rem,env(safe-area-inset-top)+3.25rem)] left-1/2 w-[min(92vw,24rem)] -translate-x-1/2 px-2 pointer-events-none">
        <div
          key={`${noticeId}-${phase}`}
          className={clsx(
            'flex items-center justify-center gap-2 md:gap-2.5',
            'px-3.5 py-2 md:px-5 md:py-2.5 rounded-full',
            'bg-[#0A032D]/80',
            'border border-yellow-400/35',
            'shadow-[0_8px_32px_rgba(10,3,45,0.45)]',
            'will-change-transform',
            motionClass,
          )}
        >
          <img
            src="/Coins/coin10.png"
            alt=""
            className="w-5 h-5 md:w-6 md:h-6 shrink-0 rounded-full object-contain"
          />
          <p className="font-outfit text-[11px] md:text-sm font-medium text-white leading-snug text-center">
            This vibe is now sponsored.
          </p>
          <span className="font-otomanopee text-yellow-400 text-sm md:text-base leading-none shrink-0">
            +{n.toLocaleString()}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
