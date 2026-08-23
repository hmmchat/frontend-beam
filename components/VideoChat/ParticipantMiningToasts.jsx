'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

const HOLD_MS = 3000;
const OUT_MS = 400;

function ParticipantMinePill({ name, onDone }) {
  const [phase, setPhase] = useState('in');
  const [animReady, setAnimReady] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (phase !== 'out') return undefined;
    const done = window.setTimeout(() => onDoneRef.current?.(), OUT_MS);
    return () => window.clearTimeout(done);
  }, [phase]);

  const motionClass =
    phase === 'out'
      ? 'animate-mining-toast-out'
      : animReady
        ? 'animate-mining-toast-in'
        : 'opacity-0';

  return (
    <div
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
        Coins credited to {name}.
      </p>
    </div>
  );
}

/**
 * Viewer-only stack. Sits below the viewer's own mining toast so they never overlap.
 * Same drop-in motion, 3s hold, tap anywhere to clear.
 */
export default function ParticipantMiningToasts({ items = [], onDismiss, onDismissAll }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !items.length) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[390]"
      onPointerDown={onDismissAll}
      role="presentation"
    >
      <div className="absolute top-[max(8.5rem,calc(env(safe-area-inset-top)+7.25rem))] left-1/2 w-[min(92vw,24rem)] -translate-x-1/2 px-2 pointer-events-none flex flex-col items-stretch gap-2">
        {items.map((item) => (
          <ParticipantMinePill
            key={item.id}
            name={item.name}
            onDone={() => onDismiss(item.id)}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}
