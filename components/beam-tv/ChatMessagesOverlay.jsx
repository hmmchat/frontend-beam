'use client';

import clsx from 'clsx';

export default function ChatMessagesOverlay({ chatMessages, chatProfilesByUserId, openChatProfileSheet }) {
  return (
    <div className="absolute bottom-24 left-6 z-40 flex flex-col  max-w-[60%] pointer-events-none">
      {chatMessages.map((m) => (
        <div
          key={m.id}
          className={clsx(
            'rounded-[1.2rem] text-xs   flex items-center  gap-2 md:gap-3 p-1 md:p-2',
            m.isModeratorOverlay
              ? 'bg-[#F2AD00]/90 border border-white/50 text-black ring-2 ring-[#F2AD00]/70'
              : m.isParticipant
                ? 'bg-yellow-300/80 border-yellow-200 text-black ring-2 ring-yellow-200/80'
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
              className="pointer-events-auto rounded-full overflow-hidden "
              title="Open profile"
            >
              <img
                src={chatProfilesByUserId[String(m.userId || '')]?.displayPictureUrl || m.avatarUrl}
                alt={m.name || 'User'}
                className="w-[22px] h-[22px] aspect-square border   object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '';
                }}
              />
            </button>
          )}

          <div className="min-w-0 border-[8B5CF6]/10 bg-white/20 p-1 flex-1 rounded-sm">
            {(m.isParticipant || m.isModeratorOverlay) && (
              <div
                className={clsx(
                  'text-[11px] font-black tracking-wide mb-0.5 truncate',
                  m.isModeratorOverlay ? 'text-black' : 'text-black/80'
                )}
              >
                {m.isModeratorOverlay ? (m.label || 'Moderator') : m.name}
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
      ))}
    </div>
  );
}
