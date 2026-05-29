'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';

export default function QuickActions({
  callRoles,
  toggleRandomness,
  handleIcebreaker,
  isDareOpen,
  isGiftModalOpen
}) {
  const [diceIndex, setDiceIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [isBroken, setIsBroken] = useState(false);

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

      // Stop rolling after 1.5 seconds
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

  const handleDiceClick = () => {
    setIsRolling(true);
    toggleRandomness?.();
  };

  return (
    <div className={clsx(
      "absolute top-[58%] -translate-y-1/2 md:top-auto md:bottom-0 left-0 w-full h-14 z-40 pointer-events-none px-10",
      isOverlayOpen && "hidden md:block"
    )}>

      {/* LEFT (Dice) - Positioned far left */}
      {callRoles.isLocalHost && (
        <button
          onClick={handleDiceClick}
          className="absolute top-0 left-4 md:left-8 bg-[#0A032D]/20 w-14 h-14 rounded-full flex items-center justify-center border border-white/80 hover:bg-[#0A032D]/40 transition pointer-events-auto shadow-2xl"
        >
          <img
            src={isRolling ? diceImages[diceIndex] : '/dice.png'}
            className={`w-7 h-7 ${isRolling ? 'rotate-180 scale-110' : ''
              }`}
          />
        </button>
      )}
      {/* CENTER LOGO - Desktop Only */}
      {/* <div className="hidden md:flex absolute bottom-2 left-1/2 -translate-x-1/2 h-14 items-center justify-center pointer-events-none">
    <img src="/logotransparent.png" className="h-8 w-auto object-contain z-10" alt="Beam" />
  </div> */}
      {/* CENTER-RIGHT (Icecream) - Positioned at the right side of the left video (near 50% mark) */}
      <button
        onClick={() => {
          setIsBroken(true);
          handleIcebreaker?.();
          setTimeout(() => setIsBroken(false), 3000);
        }}
        className={clsx(
          "absolute top-0 bg-[#0A032D]/20 w-14 h-14 rounded-full flex items-center justify-center border border-white/80 hover:bg-[#0A032D]/40 transition pointer-events-auto ",
          "right-4 md:left-[44%]" // Positioned to be at the right edge of the left tile
        )}
      >
        <img src={isBroken ? "/icecreambreak.png" : "/icecream.png"} className={clsx(isBroken ? "w-6.5 h-6.8  transition-transform" : "w-5 h-6 transition-transform")} />
      </button>

    </div>
  );
}




