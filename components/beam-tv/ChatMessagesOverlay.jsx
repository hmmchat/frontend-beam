'use client';

import clsx from 'clsx';

export default function ChatMessagesOverlay({ chatMessages, chatProfilesByUserId, openChatProfileSheet }) {
  return (
    <div className="absolute bottom-24 left-6 z-40 flex flex-col gap-2 max-w-[60%] pointer-events-none">
      {chatMessages.map((m) => (
        <div
          key={m.id}
          className={clsx(
            'rounded-[1.2rem] text-xs border backdrop-blur-xl shadow-2xl flex items-start gap-3 p-2',
            m.isParticipant
              ? 'bg-yellow-300/80 border-yellow-200 text-black ring-2 ring-yellow-200/80 shadow-[0_0_38px_rgba(253,224,71,0.62)]'
              : 'bg-white/12 border-white/12 text-white'
          )}
        >
          <button
            type="button"
            onClick={() => openChatProfileSheet(m.userId)}
            className="pointer-events-auto w-10 h-10 rounded-full overflow-hidden border-2 border-white/70 bg-gray-200 shrink-0"
            title="Open profile"
          >
            <img
              src={chatProfilesByUserId[String(m.userId || '')]?.displayPictureUrl || m.avatarUrl}
              alt={m.name || 'User'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '';
              }}
            />
          </button>
          <div className="min-w-0 flex-1">
            {m.isParticipant && (
              <div className="text-[11px] font-black tracking-wide text-black/80 mb-0.5 truncate">
                {m.name}
              </div>
            )}
            <div className={clsx('font-bold leading-tight break-words', m.isParticipant ? 'text-black' : 'text-white')}>
              {m.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
