'use client';

import { useCallback } from 'react';
import clsx from 'clsx';

export default function LocalVideoSection({
  localVideoRef,
  localStreamRef,
  isCamOff,
  /** Screen share to call participants (getDisplayMedia — user picks window/screen). */
  isScreenSharing,
  onToggleScreenShare,
  chatMessages,
  chatInput,
  setChatInput,
  sendChatMessage,
  showChatInput,
  setShowChatInput,
  onChatButtonClick,
  toggleCam,
  showLeaveNextButton,
  onLeaveOrNext,
  isRainchecking
}) {
  const setLocalVideoEl = useCallback(
    (el) => {
      localVideoRef.current = el;
      if (el && localStreamRef.current) {
        el.srcObject = localStreamRef.current;
      }
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

      {/* Chat Messages Overlay */}
      <div
        className={clsx(
          'absolute',
          'left-1',
          'flex',
          'flex-col',
          'gap-1',
          'max-w-[70%]',
          'max-h-[36vh]',
          'overflow-y-auto',
          'pr-1',
          'z-10',
          showChatInput ? 'bottom-44' : 'bottom-28'
        )}
      >
        {chatMessages.map((msg) => (
          <div key={msg.id} className={clsx('px-4', 'py-1', 'text-white', 'text-xs', 'font-thin', 'animate-in', 'fade-in')}>
            <span className="text-white/70 mr-2 text-[10px] font-semibold">{msg.name}:</span>
            {msg.message}
          </div>
        ))}
      </div>

      {/* Call Controls */}
      <div className={clsx('absolute', 'bottom-6', 'left-5', 'right-6', 'flex', 'items-end', 'justify-between', 'z-20')}>
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
            {typeof onToggleScreenShare === 'function' && (
              <button
                type="button"
                onClick={onToggleScreenShare}
                title={isScreenSharing ? 'Stop sharing screen' : 'Share screen or window'}
                className={clsx(
                  'w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:bg-white/10 active:scale-95',
                  isScreenSharing ? 'border-emerald-400/80 bg-emerald-500/20' : 'border-white/40'
                )}
              >
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
                </svg>
              </button>
            )}
            <button 
              type="button" 
              onClick={toggleCam} 
              className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
            >
              <img src="/video.png" className={`w-5 h-5 object-contain ${isCamOff ? 'opacity-30' : 'opacity-100'}`} alt="Video" />
            </button>
            <button 
              type="button" 
              onClick={onChatButtonClick || (() => setShowChatInput(!showChatInput))} 
              className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
            >
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

        {/* Action Buttons (Dare/Gift) */}
        <div className="flex gap-4">
          <button type="button" className="relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <img src="/circle.png" className="absolute inset-0 w-full h-full bg-red-900 rounded-full" alt="" />
            <img src="/dare.png" className="relative w-8 h-auto" alt="DARE" />
          </button>
          <button type="button" className="relative w-14 h-14 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <img src="/circle.png" className="absolute inset-0 w-full h-full bg-pink-800 rounded-full" alt="" />
            <img src="/giftboc.png" className="relative w-8 h-8 object-contain" alt="GIFT" />
          </button>
        </div>
      </div>
      {/* 🔲 HUD BORDER FRAME */}
      <div className="absolute inset-4 border border-white/30 rounded-[30px] pointer-events-none z-20" />
    </>
  );
}
