'use client';

import OverlayBackdrop from '@/components/ui/OverlayBackdrop';
import React, { useState } from 'react';
import clsx from 'clsx';

export default function BlockUserModal({
  isOpen,
  onClose,
  userId,
  name,
  onBlockUser,
  mode = "block",
  isAbsolute = true,
}) {
  const [isBlocking, setIsBlocking] = useState(false);

  if (!isOpen) return null;

  const isUnblock = mode === "unblock";

  return (
    <div
      className={clsx(
        'pointer-events-auto z-50 flex items-center justify-center p-6 font-otomanopee',
        isAbsolute ? 'absolute inset-0 top-14 md:top-0' : 'absolute inset-0'
      )}
    >
      <OverlayBackdrop onClick={() => !isBlocking && onClose()} />
      <div
        className={clsx(
          'relative z-10 w-full max-w-[320px] space-y-1 animate-in fade-in zoom-in duration-300'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pill Header */}
        <div className={clsx('relative overflow-hidden md:w-[80%] w-[70%] mx-auto border border-white/50 rounded-full py-4 text-center')}>
          <div
            className={clsx('absolute inset-0 z-0')}
            style={{
              backgroundImage: 'url(/assets/mb.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className={clsx('absolute inset-0 z-[1]')} />
          <h2 className={clsx('relative', 'z-10', 'text-white', 'md:text-xl', 'text-md', 'font-black', 'tracking-wider')}>
            {isUnblock ? "Unblock" : "Block User"}
          </h2>
        </div>

        {/* Main Content Box */}
        <div className={clsx('relative overflow-hidden md:w-full w-[90%] mx-auto border border-white/50 rounded-[3rem]', 'p-3 py-14 md:py-18 flex flex-col items-center gap-6 text-center shadow-2xl')}>
          <div
            className={clsx('absolute inset-0 z-0')}
            style={{
              backgroundImage: 'url(/assets/mb.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className={clsx('absolute inset-0 z-[1]')} />

          <div className={clsx('relative', 'z-10', 'space-y-2')}>
            <h3 className={clsx('text-white', 'md:text-2xl', 'text-lg', 'font-black')}>
              {isUnblock ? `Unblock ${name || 'User'}` : `Block ${name || 'User'}`}
            </h3>
            <p className={clsx('text-white/70', 'md:text-sm', 'text-xs', 'font-outfit', 'px-2', 'leading-relaxed')}>
              {isUnblock ? (
                <>Are you sure you want to <br /> unblock this user?</>
              ) : (
                <>Are you sure you want to <br /> block this user?</>
              )}
            </p>
          </div>

          <button
            disabled={isBlocking}
            onClick={async () => {
              setIsBlocking(true);
              try {
                if (onBlockUser) {
                  await onBlockUser(userId);
                }
              } catch (err) {
                console.error(err);
              } finally {
                setIsBlocking(false);
                onClose();
              }
            }}
            className={clsx('relative', 'text-sm', 'md:text-md', 'z-10', 'mt-4 md:px-10 px-6 py-3.5 md:py-4 border border-white/40 border-b-[3px] rounded-2xl', 'text-[#FF4D4D] border-[#FF4D4D]/40 font-black hover:bg-red-500/5 active:scale-95 transition-all disabled:opacity-50')}
          >
            {isBlocking
              ? isUnblock
                ? 'Unblocking...'
                : 'Blocking...'
              : isUnblock
                ? 'Unblock this user'
                : 'Block this user'}
          </button>
        </div>
      </div>
    </div>
  );
}
