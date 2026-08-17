'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { displayUsername } from '@/lib/username';

/**
 * Figma-style row: "Invite" + up to 3 friend avatars (+ badge) + "See all".
 */
export default function SquadQuickInviteStrip({
  friends,
  busyId,
  pendingInviteeIds,
  onInvite,
  onCancelInvite,
  onSeeAll,
  className = '',
}) {
  return (
    <div
      className={clsx(
        'flex w-full items-center gap-2 mt-5 mb-4 md:mb-0 md:w-[50%]',
        className,
      )}
    >
      <div className="flex shrink-0 flex-row items-center gap-3">
        <span className="text-sm font-outfit text-white/95 md:text-16">Invite</span>
        <span className="h-[4.5vh] w-[1.5px] shrink-0 bg-white/50" aria-hidden />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-evenly gap-1 overflow-visible pt-2">
        {(friends || []).map((f) => {
          const pending = pendingInviteeIds?.has?.(String(f.friendId));
          return (
            <div
              key={f.friendId}
              className="flex min-w-0 max-w-[4.5rem] flex-1 flex-col items-center"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-visible md:h-11 md:w-11">
                <div className="absolute inset-0 rounded-full border border-white bg-white/10" />

                <div className="absolute inset-0 overflow-hidden rounded-full border">
                  {(typeof f.photoUrl === 'string' && f.photoUrl.trim()) ? (
                    <Image
                      src={f.photoUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex h-full w-full select-none items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-600 text-sm font-bold text-white">
                      {(f.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={busyId === f.friendId}
                  onClick={() =>
                    pending
                      ? onCancelInvite?.(f.friendId)
                      : onInvite?.(f.friendId)
                  }
                  className={clsx(
                    'absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full',
                    'border border-white/90 shadow-md active:scale-95 disabled:opacity-40',
                    pending
                      ? 'bg-yellow-400 hover:bg-yellow-300'
                      : 'bg-white hover:bg-white/95'
                  )}
                >
                  {pending ? (
                    <span className="text-sm leading-none text-black">-</span>
                  ) : (
                    <img
                      src="/assets/plus.png"
                      alt=""
                      className="h-3 w-3 object-contain invert"
                    />
                  )}
                </button>
              </div>
              <span className="mt-0.5 w-full truncate text-center font-outfit text-[10px] text-white md:text-[14px]">
                {displayUsername(f.username)}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSeeAll?.()}
        className="shrink-0 self-center whitespace-nowrap pl-1 text-sm font-outfit text-white underline underline-offset-[3px] hover:text-white md:text-16"
      >
        See all
      </button>
    </div>
  );
}
