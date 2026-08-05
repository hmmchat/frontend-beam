'use client';
import clsx from 'clsx';

/**
 * Empty discovery orbit when no showable users remain anywhere.
 */
export default function EmptyOrbitPanel() {
  return (
    <div
      className={clsx(
        'w-full',
        'max-w-md',
        'mx-auto',
        'px-6',
        'py-10',
        'text-center',
        'space-y-3',
      )}
    >
      <div
        className={clsx(
          'mx-auto',
          'h-16',
          'w-16',
          'rounded-full',
          'border',
          'border-white/25',
          'flex',
          'items-center',
          'justify-center',
        )}
        aria-hidden
      >
        <span className={clsx('h-2', 'w-2', 'rounded-full', 'bg-yellow-300/90', 'animate-pulse')} />
      </div>
      <p
        className={clsx(
          'text-white',
          'text-lg',
          'sm:text-xl',
          'font-[family-name:var(--font-otomanopee)]',
          'leading-snug',
        )}
      >
        Empty orbit. Hang here; someone always beams in.
      </p>
    </div>
  );
}
