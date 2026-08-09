'use client';

import OverlayBackdrop from '@/components/ui/OverlayBackdrop';
import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

export const REPORT_REASON_OPTIONS = [
  { value: 'basic', label: 'General concern' },
  { value: 'violence_self_harm', label: 'Violence or Self-Harm' },
  { value: 'child_abuse', label: 'Child Abuse' },
];

export default function ReportUserModal({
  isOpen,
  onClose,
  userId,
  name,
  onReportUser,
  isAbsolute = true,
}) {
  const [isReporting, setIsReporting] = useState(false);
  const [reason, setReason] = useState('basic');

  useEffect(() => {
    if (isOpen) {
      setReason('basic');
      setIsReporting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={clsx(
        'pointer-events-auto z-50 flex items-center justify-center p-6 font-otomanopee',
        isAbsolute ? 'absolute inset-0 top-14 md:top-0' : 'absolute inset-0'
      )}
    >
      <OverlayBackdrop onClick={() => !isReporting && onClose()} />
      <div
        className={clsx(
          'relative z-10 w-full max-w-[320px] space-y-1 animate-in fade-in zoom-in duration-300'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pill Header */}
        <div className={clsx('relative overflow-hidden md:w-[80%]/80 w-[70%] mx-auto border border-white/50 rounded-full py-4 text-center')}>
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
            Report User
          </h2>
        </div>

        {/* Main Content Box */}
        <div className={clsx('relative overflow-hidden md:w-full w-[90%] mx-auto border border-white/50 rounded-[3rem]', 'p-3 py-10 md:py-14 flex flex-col items-center gap-5 text-center shadow-2xl')}>
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
            <h3 className={clsx('text-white', 'md:text-2xl', 'text-lg', 'font-black')}>Report {name || 'User'}</h3>
            <p className={clsx('text-white/70', 'md:text-sm', 'text-xs', 'font-outfit', 'px-2', 'leading-relaxed')}>
              Choose one reason for this report.
            </p>
          </div>

          <div className={clsx('relative z-10 w-full px-4 space-y-2')}>
            {REPORT_REASON_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={isReporting}
                onClick={() => setReason(option.value)}
                className={clsx(
                  'w-full rounded-2xl border px-3 py-2.5 text-sm font-outfit transition-all',
                  reason === option.value
                    ? 'border-white bg-white/15 text-white'
                    : 'border-white/30 text-white/75 hover:bg-white/5'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            disabled={isReporting}
            onClick={async () => {
              setIsReporting(true);
              try {
                if (onReportUser) {
                  await onReportUser(userId, reason);
                }
              } catch (err) {
                console.error(err);
              } finally {
                setIsReporting(false);
                onClose();
              }
            }}
            className={clsx('relative', 'text-sm', 'md:text-md', 'z-10', 'mt-2 md:px-10 px-6 py-3.5 md:py-4 border border-white/40 border-b-[3px] rounded-2xl', 'text-white', 'font-black', 'hover:bg-white/5', 'active:scale-95', 'transition-all', 'disabled:opacity-50')}
          >
            {isReporting ? 'Reporting...' : 'Report this user'}
          </button>
        </div>
      </div>
    </div>
  );
}
