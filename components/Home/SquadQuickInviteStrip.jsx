'use client';

import Image from 'next/image';
import clsx from 'clsx';

/** Figma Frame 1116605296: row, gap ~51.78px, ~505×77 — mirrored export transform omitted so text stays readable. */
const FIGMA_GAP = '51.78px';
const FIGMA_MAX_W = '505.15px';
const FIGMA_MIN_H = '76.69px';

/**
 * Figma-style row: "Invite" + up to 3 friend avatars (+ badge) + "See all".
 */
export default function SquadQuickInviteStrip({
  friends,
  busyId,
  onInvite,
  onSeeAll,
  className = '',
}) {
  if (!friends?.length) return null;

  return (
    <div
      className={clsx(
        'flex w-full flex-row items-center px-4 py-2 backdrop-blur-md',
        'rounded-[28px] border border-white/20 bg-black/25 shadow-[0_8px_32px_rgba(0,0,0,0.35)]',
        className,
      )}
      style={{
        gap: FIGMA_GAP,
        minHeight: FIGMA_MIN_H,
        maxWidth: FIGMA_MAX_W,
      }}
    >
      <div className="flex shrink-0 flex-row items-center gap-4">
        <span className="text-xs font-medium tracking-wide text-white/95 md:text-sm">Invite</span>
        <span className="h-9 w-px shrink-0 bg-white/30" aria-hidden />
      </div>

      <div
        className="flex min-w-0 flex-1 flex-row flex-wrap items-center justify-center sm:flex-nowrap"
        style={{ gap: FIGMA_GAP }}
      >
        {friends.map((f) => (
          <div key={f.friendId} className="flex shrink-0 flex-col items-center gap-1">
            <div className="relative h-[52px] w-[52px] shrink-0 md:h-14 md:w-14">
              <div className="absolute inset-0 rounded-full border-[2px] border-white/50 overflow-hidden bg-white/10">
                <Image src={f.photoUrl} alt="" fill className="object-cover" sizes="56px" />
              </div>
              <button
                type="button"
                disabled={busyId === f.friendId}
                onClick={() => onInvite?.(f.friendId)}
                className={clsx(
                  'absolute -right-0.5 -top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full',
                  'border border-white/90 bg-white text-sm font-bold leading-none text-[#5b21b6] shadow-md',
                  'hover:bg-white/95 active:scale-95 disabled:opacity-40',
                )}
                aria-label={`Invite ${f.username}`}
              >
                +
              </button>
            </div>
            <span className="max-w-[5.5rem] truncate text-center text-[10px] font-medium text-white md:text-xs">
              {f.username}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSeeAll?.()}
        className="shrink-0 text-xs font-medium text-white underline decoration-white/50 underline-offset-[3px] hover:text-white md:text-sm"
      >
        See all
      </button>
    </div>
  );
}
