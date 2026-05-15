'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';

export default function QuickActions({
  showChatInput,
  callRoles,
  toggleRandomness,
  handleIcebreaker
}) {
  const [diceIndex, setDiceIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

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

  if (showChatInput) return null;

  const handleDiceClick = () => {
    setIsRolling(true);
    toggleRandomness?.();
  };

  return (
   <div className="absolute  bottom-[365px] md:bottom-8 left-0 w-full z-40 pointer-events-none">
  
  {/* LEFT (Dice) - Positioned far left */}
  {callRoles.isLocalHost && (
    <button
      onClick={handleDiceClick}
      className="absolute bottom-0 left-4 md:left-8 bg-black/20 w-14 h-14 rounded-full flex items-center justify-center border border-white/80 hover:bg-black/80 transition pointer-events-auto shadow-2xl"
    >
      <img
        src={isRolling ? diceImages[diceIndex] : '/dice.png'}
        className={`w-8 h-8 ${
          isRolling ? 'rotate-180 scale-110' : ''
        }`}
      />
    </button>
  )}

  {/* CENTER-RIGHT (Icecream) - Positioned at the right side of the left video (near 50% mark) */}
  <button
    onClick={handleIcebreaker}
    className={clsx(
      "absolute bottom-0 bg-black/20 w-14 h-14 rounded-full flex items-center justify-center border border-white/80 hover:bg-black/80 transition pointer-events-auto shadow-2xl",
      "right-4 md:left-[44%]" // Positioned to be at the right edge of the left tile
    )}
  >
    <img src="/icecream.png" className="w-8 h-8" />
  </button>

</div>
  );
}