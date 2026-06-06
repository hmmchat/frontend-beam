'use client';

import clsx from 'clsx';

export default function SummoningOverlay({ cooldownActive, onCancel, variant = 'layout3' }) {
  const isLayout4 = variant === 'layout4';

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
      {/* Rotating ring wrapping the X button */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Slowly spinning arc ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/70 border-r-white/30"
          style={{ animation: 'spin 3s linear infinite' }}
        />
        {/* X cancel button — pointer-events enabled */}
        {cooldownActive && (
          <button
            type="button"
            onClick={onCancel}
            className={clsx(
              "pointer-events-auto rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-white/80",
              isLayout4 ? "w-10 h-10" : "w-6 h-6"
            )}
          >
            <svg
              className={isLayout4 ? "w-4 h-4" : "w-5 h-5"}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isLayout4 ? 2.5 : 1}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {/* Summoning text */}
      {isLayout4 ? (
        <span className="text-white/70 text-[11px] font-semibold tracking-widest animate-pulse">
          Summoning.....
        </span>
      ) : (
        <span className="text-white/70 text-[9px] animate-pulse">
          Summoning...
        </span>
      )}
    </div>
  );
}
