'use client';

import clsx from 'clsx';
import BeamColourLogo from '@/components/ui/BeamColourLogo';

export default function BeamTvIdleScreen({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-[2.5rem] md:rounded-[60px] border border-white/30 shadow-2xl">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/assets/mb.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-2 md:inset-4 rounded-3xl md:rounded-[60px] border border-white/30 pointer-events-none" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 flex items-end justify-center">
          <BeamColourLogo alt="beam" className="w-36 md:w-52" />
          <span
            className="mb-0.5 -ml-0.5 md:mb-1 md:-ml-1 -rotate-10 text-[2rem] md:text-5xl uppercase leading-none text-white font-['Permanent_Marker'] font-normal"
            style={{ fontFeatureSettings: "'liga' off, 'clig' off" }}
            aria-hidden
          >
            tv
          </span>
        </div>

        <p className="text-white font-black tracking-[0.18em] uppercase text-lg md:text-2xl mb-2">
          {title}
        </p>
        {subtitle && (
          <p className="text-white/55 text-sm md:text-base mb-8 max-w-sm leading-relaxed">
            {subtitle}
          </p>
        )}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={clsx(
              'px-8 py-3 rounded-full font-bold tracking-wide text-white',
              'bg-[#0A032D]/30 border border-white/40 border-b-[3px] backdrop-blur-md',
              'hover:bg-[#0A032D]/50 active:scale-95 transition-all',
            )}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
