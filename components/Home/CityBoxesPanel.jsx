'use client';
import clsx from 'clsx';

/**
 * 0–3 city name boxes when handoff is cancelled. Name only; ordered by availability server-side.
 */
export default function CityBoxesPanel({ cities = [], onSelectCity, busy = false }) {
  if (!cities.length) return null;

  return (
    <div
      className={clsx(
        'w-full',
        'max-w-md',
        'mx-auto',
        'flex',
        'flex-col',
        'items-center',
        'gap-4',
        'px-4',
      )}
    >
      <p
        className={clsx(
          'text-white/80',
          'text-sm',
          'text-center',
          'font-[family-name:var(--font-otomanopee)]',
        )}
      >
        Pick a city still beaming
      </p>
      <div
        className={clsx(
          'w-full',
          'grid',
          'gap-3',
          cities.length === 1 ? 'grid-cols-1' : cities.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
        )}
      >
        {cities.map((c) => {
          const name = c.label || c.city;
          return (
            <button
              key={c.city}
              type="button"
              disabled={busy}
              onClick={() => onSelectCity?.(c.city)}
              className={clsx(
                'min-h-[72px]',
                'rounded-2xl',
                'border',
                'border-white/30',
                'bg-white/5',
                'backdrop-blur-md',
                'px-2',
                'py-4',
                'text-white',
                'text-sm',
                'sm:text-base',
                'font-[family-name:var(--font-otomanopee)]',
                'hover:bg-white/10',
                'hover:border-white/50',
                'transition',
                'active:scale-95',
                'disabled:opacity-50',
                'disabled:pointer-events-none',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
