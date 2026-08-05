'use client';

import React from 'react';
import { clsx } from 'clsx';

/**
 * Searching loader with cancel on the ring itself (used for blank discovery wait).
 */
const SearchingPopup = ({ isVisible, onCancel, label = 'Searching' }) => {
  if (!isVisible) return null;

  const size = 72;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={clsx(
        'w-full',
        'max-w-[min(100%,20rem)]',
        'mx-auto',
        'px-3',
        'py-2',
        'flex',
        'flex-col',
        'items-center',
        'gap-2',
      )}
    >
      <p
        className={clsx(
          'text-white',
          'text-xs',
          'sm:text-sm',
          'font-[family-name:var(--font-otomanopee)]',
          'text-center',
        )}
      >
        {label}
      </p>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel searching"
        title="Cancel"
        className={clsx(
          'relative',
          'shrink-0',
          'rounded-full',
          'outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-yellow-300/80',
          'active:scale-95',
          'transition-transform',
          'bg-black/40',
          'border',
          'border-white/20',
        )}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90 animate-spin"
          style={{ animationDuration: '1.4s' }}
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#FACC15"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.28} ${circumference}`}
          />
        </svg>
        <span
          className={clsx(
            'absolute',
            'inset-0',
            'flex',
            'items-center',
            'justify-center',
            'text-[10px]',
            'uppercase',
            'tracking-wide',
            'text-white/85',
          )}
        >
          Cancel
        </span>
      </button>
    </div>
  );
};

export default SearchingPopup;
