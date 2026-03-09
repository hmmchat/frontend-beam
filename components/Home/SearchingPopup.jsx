'use client';

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { IoVideocamOutline, IoSearchOutline, IoSparklesOutline } from 'react-icons/io5';

/**
 * SearchingPopup Component
 * Highlights: Premium UI, Pulsing animation, Yellow Highlights
 */
const SearchingPopup = ({ 
  isVisible, 
  onCancel 
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={clsx(
      'absolute inset-0 z-30 flex items-center justify-center p-6',
      'backdrop-blur-md bg-black/40 animate-in fade-in zoom-in duration-500',
      'rounded-2xl border border-white/10'
    )}>
      <div className="relative w-full max-w-sm text-center space-y-10">
        {/* Animated Rings Container */}
        <div className="relative w-32 h-32 mx-auto">
          {/* Animated expansion rings */}
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className="absolute inset-0 rounded-full border border-yellow-400/30 animate-ping"
              style={{ animationDelay: `${i * 0.5}s`, animationDuration: '3s' }}
            />
          ))}
          
          {/* Core Icon */}
          <div className={clsx(
            'absolute inset-0 rounded-full flex items-center justify-center shadow-2xl',
            'bg-gradient-to-tr from-purple-800 to-black border border-white/20'
          )}>
            <IoVideocamOutline className="text-yellow-400 text-5xl animate-bounce" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-white text-3xl font-black italic tracking-tight uppercase">
            Finding Match{dots}
          </h2>
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
            <IoSearchOutline className="animate-pulse" />
            <span>Connecting to Global Discovery</span>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="flex justify-center gap-8 py-4 opacity-50">
          <div className="flex flex-col items-center gap-2">
             <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                <IoSparklesOutline className="text-yellow-400 text-sm" />
             </div>
             <span className="text-[10px] text-white/80 font-bold uppercase">Verified Only</span>
          </div>
          <div className="flex flex-col items-center gap-2">
             <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                <div className="w-1 h-4 bg-yellow-400/50 rounded-full animate-pulse" />
             </div>
             <span className="text-[10px] text-white/80 font-bold uppercase">Low Latency</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-8">
          <button
            onClick={onCancel}
            className="px-10 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
          >
            Cancel Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchingPopup;
