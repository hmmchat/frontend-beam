'use client';

import { useEffect, useRef } from 'react';
import { IoIosInformationCircleOutline, IoMdClose } from 'react-icons/io';
import clsx from 'clsx';
import BeamColourLogo from "@/components/ui/BeamColourLogo";

const TOGGLE_ATTR = 'data-app-overview-toggle';

export function AppOverviewToggle({
  isOpen,
  onToggle,
  className,
  iconClassName = 'h-6 w-6',
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOpen ? 'Close app overview' : 'Open app overview'}
      data-app-overview-toggle=""
      className={clsx(
        'group rounded-full border-[1px] border-b-[3px] border-white/60 shadow-md transition-all duration-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] items-center justify-center flex',
        className,
      )}
    >
      {isOpen ? (
        <IoMdClose
          className={clsx(
            'text-white transition-transform duration-300 group-hover:scale-110',
            iconClassName,
          )}
        />
      ) : (
        <IoIosInformationCircleOutline
          className={clsx(
            'text-white transition-transform duration-300 group-hover:scale-110',
            iconClassName,
          )}
        />
      )}
    </button>
  );
}

export function AppOverviewPanel({
  className,
  style,
  contentMaxWidthClass = 'max-w-[287px]',
  onClose,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!onClose) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest(`[${TOGGLE_ATTR}]`)) return;
      onClose();
    };

    // Skip the opening click so the panel doesn't close immediately.
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      style={style}
      className={clsx(
        'z-50 bg-black/10 backdrop-blur-xs flex flex-col items-center pt-[70px] pb-6 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 rounded-[2.25rem] border border-[1px] border-white/70',
        className,
      )}
    >
      {/* Decorative Side Brackets */}
      <div className="absolute right-0 top-1/4 h-[174px] w-[18px] border-[1px] border-white/70 border-r-0 rounded-l-xl pointer-events-none" />
      <div className="absolute right-0 top-[26%] h-[158px] w-[13px] border-[1px] border-white/70 border-r-0 rounded-l-xl pointer-events-none" />

      <div className="flex flex-col items-center justify-center shrink-0 mb-4">
        <BeamColourLogo alt="beam" className="w-[129px] mx-auto" />
        <p className="text-white text-[12px] font-[family-name:var(--font-otomanopee)] text-center -mt-3">
          Meet Someone here
        </p>
      </div>

      <div className="w-full flex-1 min-h-0 flex overflow-y-auto justify-center opacity-80 px-8 custom-scroll">
        <div
          className={clsx(
            'text-white text-[14px] font-normal font-[family-name:var(--font-outfit)] leading-normal text-center pb-6 space-y-4',
            contentMaxWidthClass,
          )}
        >
          <p>
            Beam is the liminal corner of the internet. A place between awake
            and asleep. It&apos;s dreamy here. It&apos;s not listed on any map.
            This website is the only known way in.
          </p>
          <p>
            You&apos;ll only find real people here. You can&apos;t always tell,
            though. You&apos;re a projection too. Just like everyone else.
          </p>
          <p>
            Come here if you feel like talking about something, just to see what
            happens next.
          </p>
          <p className="text-[10px] pt-2">
            — Beam Serendipity Labs
            <br />
            © 2026 Beam
          </p>
        </div>
      </div>

      <p className="shrink-0 text-white/80 text-[10px] font-[family-name:var(--font-outfit)] underline underline-offset-2 pt-3">
        How to use Beam?
      </p>
    </div>
  );
}
