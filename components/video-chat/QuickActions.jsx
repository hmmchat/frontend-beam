'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';

export default function QuickActions({
  callRoles,
  toggleRandomness,
  handleIcebreaker,
  isDareOpen,
  isGiftModalOpen,
  isRolling,
  setIsRolling,
  isBroken,
}) {
  const [diceIndex, setDiceIndex] = useState(0);

  const diceImages = [
    '/dice/dice11.png',
    '/dice/dice12.svg',
    '/dice/dice13.svg',
    '/dice/dice14.svg',
    '/dice/dice15.svg',
    '/dice/dice16.svg',
    '/dice/dice17.svg',
    '/dice/dice18.svg',
    '/dice/dice19.png',
  ];

  useEffect(() => {
    let interval;
    if (isRolling) {
      interval = setInterval(() => {
        setDiceIndex((prev) => (prev + 1) % diceImages.length);
      }, 100);

      const timeout = setTimeout(() => {
        setIsRolling(false);
      }, 1500);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isRolling]);

  const isOverlayOpen = isGiftModalOpen || isDareOpen;

  return (
    <div className={clsx(
      "absolute top-[58%] -translate-y-1/2 md:top-auto md:bottom-0 left-0 w-full h-14 z-40 pointer-events-none px-10",
      isOverlayOpen && "hidden md:block"
    )}>

      {/* LEFT (Dice) - Only visible to host */}
      {callRoles.isLocalHost && (
        <button
          onClick={() => toggleRandomness?.()}
          className={clsx('absolute', 'top-0', 'left-4', 'md:left-8', 'bg-[#0A032D]/20', 'w-14', 'h-14', 'rounded-full', 'flex', 'items-center', 'justify-center', 'border', 'border-white/80', 'hover:bg-[#0A032D]/40', 'cursor-pointer', 'transition', 'pointer-events-auto', 'shadow-2xl')}
        >
          <img
            src={isRolling ? diceImages[diceIndex] : '/dice.png'}
            className={clsx(
              "w-7 h-7 transition-transform",
              isRolling && "rotate-180 scale-110"
            )}
          />
        </button>
      )}

      {/* Ice Cream - any user can toggle, syncs to all */}
      <button
        onClick={() => handleIcebreaker?.()}
        className={clsx(
          "absolute top-0 bg-[#0A032D]/20 w-14 h-14 rounded-full flex items-center justify-center border border-white/80 hover:bg-[#0A032D]/40 transition pointer-events-auto",
          "right-4 md:left-[44%]"
        )}
      >
        <img
          src={isBroken ? "/icecreambreak.svg" : "/icecream.svg"}
          className={clsx('w-5', 'h-6', 'transition-transform')}
        />
      </button>

    </div>
  );
}
