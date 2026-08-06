'use client';
import clsx from 'clsx';

/**
 * City handoff: copy + circular countdown loader that is itself the Cancel control.
 */
export default function CityHandoffBar({
  cityLabel,
  secondsLeft,
  totalSeconds = 10,
  onCancel,
}) {
  const label = cityLabel || 'the next city';
  const total = Math.max(1, Number(totalSeconds) || 10);
  const left = Math.max(0, Number(secondsLeft) || 0);
  const progress = Math.min(1, left / total);

  const size = 72;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

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
        'shrink-0',
      )}
    >
      <p
        className={clsx(
          'text-white',
          'text-xs',
          'sm:text-sm',
          'font-[family-name:var(--font-otomanopee)]',
          'leading-snug',
          'text-center',
          'px-1',
        )}
      >
        {`Hopping to ${label} — the vibe’s still up`}
      </p>

      <button
        type="button"
        onClick={onCancel}
        aria-label={`Cancel city switch (${left}s left)`}
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
          className="absolute inset-0 -rotate-90"
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
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-1000 linear"
          />
        </svg>
        <span
          className={clsx(
            'absolute',
            'inset-0',
            'flex',
            'flex-col',
            'items-center',
            'justify-center',
            'leading-none',
            'gap-0.5',
          )}
        >
          <span
            className={clsx(
              'tabular-nums',
              'text-yellow-300',
              'text-lg',
              'font-semibold',
            )}
            aria-live="polite"
          >
            {left}
          </span>
          <span
            className={clsx(
              'text-sm',
              'leading-none',
              'text-white/80',
              'font-medium',
            )}
            aria-hidden
          >
            ×
          </span>
        </span>
      </button>
    </div>
  );
}
