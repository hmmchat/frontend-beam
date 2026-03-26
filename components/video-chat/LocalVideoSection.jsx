'use client';

import { useCallback } from 'react';
import clsx from 'clsx';

export default function LocalVideoSection({
  localVideoRef,
  localStreamRef,
  isCamOff,
  chatMessages,
  chatInput,
  setChatInput,
  sendChatMessage,
  showChatInput,
  setShowChatInput,
  toggleCam,
  showLeaveNextButton,
  onLeaveOrNext,
  isRainchecking
}) {
  // Stable callback: inline ref functions change every render and make React detach/reattach <video> → visible flicker.
  const setLocalVideoEl = useCallback(
    (el) => {
      localVideoRef.current = el;
      if (el && localStreamRef.current) el.srcObject = localStreamRef.current;
    },
    [localVideoRef, localStreamRef]
  );

  return (
    <>
      <video
        ref={setLocalVideoEl}
        autoPlay
        muted
        playsInline
        className={clsx('w-full', 'h-full', 'object-cover', 'scale-x-[-1]')}
      />
      {isCamOff && (
        <div className={clsx('absolute', 'inset-0', 'bg-gray-900/90', 'flex', 'items-center', 'justify-center', 'text-white/20', 'font-bold', 'uppercase', 'tracking-widest', 'italic')}>
          Camera is off
        </div>
      )}

      <div className={clsx('absolute', 'bottom-32', 'left-6', 'flex', 'flex-col', 'gap-3', 'max-w-[70%]', 'z-10')}>
        {chatMessages.map((msg) => (
          <div key={msg.id} className={clsx('bg-white/10', 'backdrop-blur-xl', 'px-4', 'py-2.5', 'rounded-[1.2rem]', 'text-white', 'text-xs', 'font-bold', 'border', 'border-white/10', 'animate-in', 'fade-in', 'slide-in-from-left-4')}>
            <span className="text-white/50 mr-2 text-[10px]">{msg.name}:</span>
            {msg.message}
          </div>
        ))}
      </div>

      <div className={clsx('absolute', 'bottom-6', 'left-6', 'right-6', 'flex', 'items-end', 'justify-between', 'z-20')}>
        <div className={clsx('flex', 'flex-col', 'gap-4', 'w-full', 'max-w-[240px]')}>
          {showChatInput && (
            <form onSubmit={sendChatMessage} className="animate-in slide-in-from-bottom-4">
              <input
                autoFocus
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl px-4 py-3 text-white text-sm focus:border-white/40 mb-2 outline-none"
              />
            </form>
          )}
          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={toggleCam} className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95">
              <img src="/video.png" className={`w-5 h-5 object-contain ${isCamOff ? 'opacity-30' : 'opacity-100'}`} alt="Video" />
            </button>
            <button type="button" onClick={() => setShowChatInput(!showChatInput)} className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95">
              <img src="/msg.png" className="w-5 h-5 object-contain" alt="Message" />
            </button>
            {showLeaveNextButton && onLeaveOrNext && (
              <button
                type="button"
                onClick={onLeaveOrNext}
                disabled={isRainchecking}
                title="Next or leave call"
                className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 disabled:opacity-40"
              >
                <img src="/arrowright.png" className="w-5 h-5 object-contain" alt="Next" />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <button type="button" className="relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <img src="/circle.png" className="absolute inset-0 w-full h-full" alt="" />
            <img src="/dare.png" className="relative w-8 h-auto" alt="DARE" />
          </button>
          <button type="button" className="relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <img src="/circle.png" className="absolute inset-0 w-full h-full" alt="" />
            <img src="/giftboc.png" className="relative w-8 h-8 object-contain" alt="GIFT" />
          </button>
        </div>
      </div>
    </>
  );
}
