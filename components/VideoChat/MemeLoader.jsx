'use client';

import clsx from 'clsx';

export default function MemeLoader({ loadingMeme }) {
  return (
    <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'md:rounded-[60px]', 'overflow-hidden')}>
      <div
        className="
          absolute inset-0
          h-[95%] w-[95%]
          border border-white/40
          rounded-3xl md:rounded-[60px]
          pointer-events-none
          z-20
          transition-colors
          box-border
          mx-auto
          my-auto
        "
      />
      <div
        className="absolute inset-0 z-0 "
        style={{
          backgroundImage: 'url(/assets/mb.jpg)',
          backgroundRepeat: 'repeat',
          backgroundSize: 'cover',
        }}
      />

      <div
        className={clsx(
          'absolute',
          'inset-0',
          'flex',
          'flex-col',
          'items-center',
          'justify-center',
          'px-4',
          'py-6',
          'text-white'
        )}
      >
        {/* Beam Logo */}
        <img
          src="/logo.png"
          alt="Beam Logo"
          className="h-8 md:h-16 md:w-40 md:mb-2 object-contain"
        />

        {/* Meme API text */}
        {loadingMeme?.text && (
          <p className="text-[11px] md:text-sm text-center max-w-[90%] md:max-w-md mb-4 md:mb-10 leading-relaxed">
            {loadingMeme.text}
          </p>
        )}

        {loadingMeme?.imageUrl ? (
          <img
            src={loadingMeme.imageUrl}
            alt={loadingMeme.text}
            className={clsx(
              'w-32 sm:w-40 md:w-48',
              'max-w-[75%] md:max-w-xl',
              'rounded-2xl md:rounded-[1.5rem]',
              'object-contain',
              'border-2 md:border-4',
              'border-white'
            )}
          />
        ) : (
          <div
            className={clsx(
              'flex',
              'h-full',
              'max-h-[60%] md:max-h-[72%]',
              'w-full',
              'max-w-2xl',
              'items-center',
              'justify-center',
              'rounded-[1.5rem]',
              'text-center'
            )}
          >
            <p
              className={clsx(
                'text-base sm:text-lg md:text-xl',
                'leading-tight',
                'tracking-tight',
                'text-white',
                'px-4'
              )}
            >
              {loadingMeme?.text}
            </p>
          </div>
        )}

        {/* Delivering Text */}
        <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mt-4 md:mt-6" />
        <p className="text-[8px] md:text-[9px] text-white mt-3 text-center">
          Delivering you a human now
        </p>
      </div>
    </div>
  );
}
