'use client';

import Image from 'next/image';
import clsx from 'clsx';



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
        'flex w-full  mt-5    ',


      )}

    >
      <div className="flex shrink-0 flex-row items-center gap-4">
        <span className="text-xs font-outfit  text-white/95 md:text-sm">Invite</span>
        <span className="h-14 w-[1.5px] shrink-0 bg-white/50" aria-hidden />
      </div>

      <div className="flex px-5 pt-2 flex-1 flex-row items-center gap-7 overflow-x-auto">
        {(friends || []).map((f) => {
          const pending = pendingInviteeIds?.has?.(String(f.friendId));
          return (



            <div key={f.friendId} className="flex shrink-0 flex-col items-center ">
              <div className="relative h-[40px] w-[40px] shrink-0 md:h-11 md:w-11">

                <div className="absolute inset-0 rounded-full border border-white bg-white/10" />

                <div className="absolute inset-0 rounded-full overflow-hidden border">
                  <Image
                    src={f.photoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
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
                    'absolute -right-1 -top-1 z-50 flex h-5 w-5 items-center justify-center rounded-full',
                    'border border-white/90 shadow-md active:scale-95 disabled:opacity-40',
                    pending
                      ? 'bg-yellow-400 hover:bg-yellow-300'
                      : 'bg-white hover:bg-white/95'
                  )}
                >
                  {pending ? (
                    <span className="text-black text-sm leading-none">-</span>
                  ) : (
                    <img
                      src="/assets/plus.png"
                      alt=""
                      className="w-3 h-3 object-contain invert"
                    />
                  )}
                </button>
              </div>
              <span className="max-w-[5.5rem] font-outfit truncate text-center text-[10px] text-white md:text-xs">
                {f.username}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSeeAll?.()}
        className="shrink-0  text-xs font-outfit  text-white underline decoration-white/50 underline-offset-[3px] hover:text-white md:text-sm"
      >
        See all
      </button>
    </div>
  );
}
