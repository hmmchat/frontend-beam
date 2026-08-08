'use client';
import clsx from 'clsx';
import { IoClose } from 'react-icons/io5';

export default function MatchButtons({
  waitingForMatch,
  waitingMessage,
  handleCancelWaiting,
  handleRaincheck,
  handleProceed,
  isDesktop = false,
}) {
  if (waitingForMatch) {
    return (
      <div
        className={clsx(
          'flex',
          'items-center',
          'gap-3',
          isDesktop ? 'h-[42px] px-3' : 'py-2 px-4',
          'backdrop-blur-md',
          'w-full',
        )}
      >
        <button
          onClick={handleCancelWaiting}
          className="text-white hover:text-white/80 transition text-lg shrink-0"
        >
          <IoClose className="w-5 h-5" />
        </button>
        <div className="flex-grow text-center pr-5">
          <div
            className={clsx(
              'text-white',
              'font-bold',
              isDesktop ? 'text-[11px] leading-tight' : 'text-xs sm:text-sm',
            )}
          >
            Waiting for response.
          </div>
          <div
            className={clsx(
              'text-white/85',
              'font-normal',
              isDesktop ? 'text-[9px] leading-none' : 'text-[10px] sm:text-xs mt-0.5',
            )}
          >
            {waitingMessage}
          </div>
        </div>
      </div>
    );
  }

  if (isDesktop) {
    // Figma phone facecard footer: ~120×52 pills, 12px label
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleRaincheck}
          className={clsx(
            'w-[120px]',
            'h-[52px]',
            'flex',
            'items-center',
            'justify-center',
            'rounded-[35px]',
            'border',
            'border-white/50',
            'text-white',
            'text-[12px]',
            'font-[family-name:var(--font-otomanopee)]',
            'whitespace-nowrap',
            'transition',
            'active:scale-95',
          )}
        >
          Raincheck!
        </button>

        <button
          onClick={handleProceed}
          className={clsx(
            'w-[120px]',
            'h-[52px]',
            'flex',
            'items-center',
            'justify-center',
            'rounded-[35px]',
            'border',
            'border-white/50',
            'text-white',
            'text-[12px]',
            'font-[family-name:var(--font-otomanopee)]',
            'whitespace-nowrap',
            'hover:bg-white/10',
            'transition',
            'active:scale-95',
          )}
        >
          Meet rn
        </button>
      </div>
    );
  }

  return (
    <div className={clsx('flex', 'flex-1', 'items-center', 'gap-3')}>
      <button
        onClick={handleRaincheck}
        className={clsx(
          'flex-1',
          'py-3',
          'rounded-full',
          'border',
          'border-white/30',
          'text-white',
          'text-sm',

          'hover:bg-white/10',
          'hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]',
          'hover:scale-105',
          'transition-all',
          'duration-300',
          'active:scale-95',
        )}
      >
        Raincheck!
      </button>
      <button
        onClick={handleProceed}
        className={clsx(
          'flex-1',
          'py-3',
          'rounded-full',
          'border',
          'border-white/30',
          'text-white',
          'text-sm',

          'hover:bg-white/10',
          'hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]',
          'hover:scale-105',
          'transition-all',
          'duration-300',
          'active:scale-95',
        )}
      >
        Meet rn
      </button>
    </div>
  );
}
