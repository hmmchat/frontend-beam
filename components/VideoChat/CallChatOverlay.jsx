'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';

export default function CallChatOverlay({
  chatMessages = [],
  showChatMessages = false,
  isBroadcasting = false,
  chatParticipantUserIds = [],
  className,
}) {
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el || !showChatMessages) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages, showChatMessages]);

  if (!showChatMessages || chatMessages.length === 0) return null;

  const participantIds = new Set((chatParticipantUserIds || []).map((id) => String(id)));

  return (
    <div
      ref={chatContainerRef}
      className={clsx(
        'relative flex min-h-0 w-full max-w-full flex-col overflow-y-auto overflow-x-hidden overscroll-behavior-y-contain scrollbar-hide pointer-events-auto',
        className,
      )}
    >
      <div className="mt-auto flex flex-col items-start gap-2">
      {chatMessages.map((msg) => {
        const highlightParticipant = Boolean(
          isBroadcasting && (
            msg.isParticipant ||
            msg.name === 'You' ||
            participantIds.has(String(msg.userId || ''))
          )
        );
        return (
          <div
            key={msg.id}
            className={clsx(
              'flex w-fit max-w-full items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300',
              highlightParticipant && 'rounded-[1.2rem] bg-yellow-300/55 backdrop-blur-sm border border-yellow-200/70 p-1 md:p-2'
            )}
          >
            <img
              src={(msg.displayPictureUrl && msg.displayPictureUrl !== '/avatar-placeholder.png' && msg.displayPictureUrl !== '/assets/ico.png') ? msg.displayPictureUrl : undefined}
              alt={msg.name || ''}
              className={clsx('w-8 h-8 rounded-full border border-white/20 object-cover flex-shrink-0 shadow-md')}
            />
            <div
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs leading-relaxed break-words max-w-[calc(100%-2.5rem)]',
                highlightParticipant
                  ? 'bg-transparent text-black font-bold'
                  : 'bg-[#0A032D]/40 border border-white/5 text-white font-normal shadow-lg'
              )}
            >
              {msg.message}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
