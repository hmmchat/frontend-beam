'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * Call-control screen-share toggle.
 * Hover copy/styles follow live sharing state (native `title` stays stale).
 * Touch starts on pointerdown so the first tap owns the getDisplayMedia gesture.
 */
export default function ScreenShareButton({
  isScreenSharing,
  onToggle,
  className,
  iconClassName,
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const touchToggleAtRef = useRef(0);
  const label = isScreenSharing ? 'Stop sharing screen' : 'Share screen or window';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isScreenSharing}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setTipOpen(true);
      }}
      onPointerLeave={() => setTipOpen(false)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
        touchToggleAtRef.current = Date.now();
        onToggle?.();
      }}
      onClick={() => {
        if (Date.now() - touchToggleAtRef.current < 600) return;
        onToggle?.();
      }}
      className={clsx(
        'relative rounded-full border border-b-[3px] flex items-center justify-center transition-all active:scale-95 backdrop-blur-md touch-manipulation select-none',
        isScreenSharing
          ? 'border-emerald-400/80 bg-emerald-500/20 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-500/35'
          : 'border-white/40 bg-[#0A032D]/20 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#0A032D]/40',
        className,
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <svg
        className={clsx('text-white', iconClassName)}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
      </svg>
      {tipOpen && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] font-medium text-white shadow-lg"
        >
          {label}
        </span>
      )}
    </button>
  );
}
