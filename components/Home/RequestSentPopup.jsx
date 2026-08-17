'use client';

import React from 'react';
import { clsx } from 'clsx';
import { IoCloseOutline, IoHeartOutline } from 'react-icons/io5';
import { displayUsername } from '@/lib/username';

/**
 * RequestSentPopup Component
 * Highlights: Premium UI, Glassmorphism, Bold Typography matching FaceCard theme
 */
const RequestSentPopup = ({ 
  isVisible, 
  user, 
  onCancel 
}) => {
  if (!isVisible) return null;

  return (
    <div className={clsx(
      'absolute inset-0 z-30 flex items-center justify-center p-6',
      'backdrop-blur-md bg-black/60 animate-in fade-in duration-300',
      'rounded-[2.5rem]' // Matches FaceCard rounding
    )}>
      <div className={clsx(
        'relative w-full max-w-sm bg-black/40 border border-white/20 rounded-[2.5rem] p-8 text-center',
        'shadow-2xl overflow-hidden'
      )}>
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] animate-pulse" />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-4">
             {/* Spinning Border */}
            <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-yellow-400 animate-spin" />
            
            {/* Pulsing Heart */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm">
                <IoHeartOutline className="text-yellow-400 text-4xl animate-pulse" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 
              className="text-yellow-400 text-3xl font-black italic tracking-tighter uppercase"
              style={{ WebkitTextStroke: '0.5px rgba(0,0,0,0.5)' }}
            >
              Request Sent!
            </h1>
            <p className="text-white/80 text-sm font-medium leading-relaxed">
              Waiting for <span className="text-white font-black">{displayUsername(user?.username, 'them')}</span> to accept your invitation...
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-6">
            <button
              onClick={onCancel}
              className={clsx(
                'group w-full py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20',
                'border border-white/20 text-white/70 hover:text-white',
                'transition-all duration-300 flex items-center justify-center gap-2',
                'text-xs font-black uppercase tracking-[0.2em]'
              )}
            >
              <IoCloseOutline className="text-lg group-hover:rotate-90 transition-transform duration-300" />
              Keep Swiping
            </button>
          </div>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/10 rounded-tl-3xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/10 rounded-br-3xl" />
      </div>
    </div>
  );
};

export default RequestSentPopup;
