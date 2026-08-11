'use client';

import clsx from 'clsx';
import { IoWarningOutline } from 'react-icons/io5';

/**
 * Figma insufficient footer — same structure mobile & desktop:
 *   ⚠ Insufficient balance
 *   Spend coins:
 *   🪙 {amount}                         [Buy Coins]
 * Desktop: 10945:27935 — Mobile: 10945:40974
 */
export default function InsufficientBalanceBar({
  spendAmount = 0,
  onBuyCoins,
  className = '',
  variant = 'mobile',
}) {
  const amount = Number(spendAmount) || 0;
  const isDesktop = variant === 'desktop';

  return (
    <div
      className={clsx(
        'relative z-10 flex w-full items-center justify-between gap-2',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-col items-start">
          <div
            className={clsx(
              'flex items-center gap-1 font-outfit text-white',
              isDesktop ? 'text-[14px]' : 'text-[10px]',
            )}
          >
            <IoWarningOutline
              className={clsx(
                'shrink-0 text-yellow-500',
                isDesktop ? 'text-[16px]' : 'text-[14px]',
              )}
            />
            Insufficient balance
          </div>
          <p
            className={clsx(
              'font-outfit text-white',
              isDesktop ? 'text-[16px]' : 'text-[12px]',
            )}
          >
            Spend coins:
          </p>
        </div>

        <div className="flex items-center gap-1">
          <img
            src="/Coins/coin10.png"
            className="h-4 w-[15px] rounded-full"
            alt=""
          />
          <span
            className={clsx(
              'font-otomanopee text-white',
              isDesktop ? 'text-[16px]' : 'text-[12px]',
            )}
          >
            {amount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onBuyCoins}
        className={clsx(
          'shrink-0 font-otomanopee text-white transition-all',
          'border-solid border-[rgba(255,255,255,0.5)] bg-[rgba(10,3,45,0.2)]',
          'hover:bg-white/10 active:scale-95',
          isDesktop
            ? 'rounded-[18px] border-2 border-b-4 px-12 py-6 text-[20px]'
            : 'h-[52px] rounded-[12px] border border-b-[3px] px-8 text-[12px]',
        )}
      >
        {isDesktop ? 'Buy Coins' : 'Buy coins'}
      </button>
    </div>
  );
}
