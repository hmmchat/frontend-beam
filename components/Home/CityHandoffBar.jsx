'use client';
import clsx from 'clsx';

/**
 * Netflix-style handoff strip under a city face card.
 */
export default function CityHandoffBar({ cityLabel, secondsLeft, onCancel }) {
  const label = cityLabel || 'the next city';
  return (
    <div
      className={clsx(
        'w-full',
        'max-w-md',
        'mx-auto',
        'px-3',
        'py-3',
        'rounded-2xl',
        'border',
        'border-white/25',
        'bg-black/35',
        'backdrop-blur-md',
        'text-center',
        'space-y-2',
      )}
    >
      <p
        className={clsx(
          'text-white',
          'text-sm',
          'sm:text-base',
          'font-[family-name:var(--font-otomanopee)]',
          'leading-snug',
        )}
      >
        {`Hopping to ${label} — the vibe’s still up`}
      </p>
      <div className={clsx('flex', 'items-center', 'justify-center', 'gap-3')}>
        <span
          className={clsx(
            'tabular-nums',
            'text-yellow-300',
            'text-lg',
            'font-semibold',
            'min-w-[2ch]',
          )}
          aria-live="polite"
        >
          {Math.max(0, secondsLeft)}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className={clsx(
            'px-4',
            'py-1.5',
            'rounded-full',
            'border',
            'border-white/35',
            'text-white',
            'text-xs',
            'hover:bg-white/10',
            'transition',
            'active:scale-95',
          )}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
