'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';

export default function ChatMessagesOverlay({ chatMessages, chatProfilesByUserId, openChatProfileSheet }) {
  const chatContainerRef = useRef(null);
  const didInitScrollRef = useRef(false);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (!didInitScrollRef.current || distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
      didInitScrollRef.current = true;
    }
  }, [chatMessages]);

  return (
    <div
      ref={chatContainerRef}
      data-beam-tv-chat-scroll
      className="relative z-40 mb-0.5 flex min-h-0 max-h-[70dvh] w-full max-w-[min(100%,18rem)] flex-col overflow-y-scroll overflow-x-hidden overscroll-y-contain scrollbar-hide pointer-events-auto touch-pan-y md:w-80"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="mt-auto flex flex-col items-start">
        {chatMessages.map((m) => {
          const profile = chatProfilesByUserId[String(m.userId || '')];
          const rawAvatar = profile?.displayPictureUrl || m.avatarUrl || '';
          const avatarSrc = (rawAvatar === '/avatar-placeholder.png' || rawAvatar === '/assets/ico.png') ? '' : rawAvatar;
          return (
            <div
              key={m.id}
              className={clsx(
                'rounded-[1.2rem] text-xs w-fit max-w-full flex items-center gap-2 md:gap-3 p-1 md:p-2',
                m.isModeratorOverlay
                  ? 'bg-[#F2AD00]/90 border border-white/50 text-black ring-2 ring-[#F2AD00]/70'
                  : m.isParticipant
                    ? 'bg-yellow-300/55 backdrop-blur-sm border-yellow-200/70 text-black ring-1 ring-yellow-200/50'
                    : ' text-white'
              )}
            >
              {m.isModeratorOverlay ? (
                <span
                  className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-black/20 bg-black/15 text-[10px] font-black"
                  aria-hidden
                >
                  M
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => openChatProfileSheet(m.userId)}
                  className="rounded-full overflow-hidden "
                  title="Open profile"
                >
                  <img
                    src={avatarSrc || undefined}
                    alt={m.name || 'User'}
                    className="w-[22px] h-[22px] aspect-square border   object-cover"
                  />
                </button>
              )}

              <div
                className={clsx(
                  'min-w-0 flex-1 rounded-sm p-1',
                  m.isParticipant || m.isModeratorOverlay ? 'bg-transparent' : 'border-[8B5CF6]/10 bg-white/20'
                )}
              >
                {m.isModeratorOverlay && (
                  <div className="mb-0.5 truncate text-[11px] font-black tracking-wide text-black">
                    {m.label || 'Moderator'}
                  </div>
                )}
                <div
                  className={clsx(
                    'font-bold leading-tight break-words',
                    m.isModeratorOverlay || m.isParticipant ? 'text-black' : 'text-white'
                  )}
                >
                  {m.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
