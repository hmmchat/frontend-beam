'use client';

import clsx from 'clsx';

export default function BeamTVActions({
  viewerChatInput,
  setViewerChatInput,
  sendViewerChat,
  joinState,
  handleJoinBroadcast,
  onGiftClick,
  isModerator = false
}) {
  return (
    <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-auto z-40 flex items-center justify-between md:justify-end gap-2 md:gap-3">
      {/* Comment Box */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          sendViewerChat();
        }} 
        className="flex-1 min-w-0 md:flex-initial md:w-80"
      >
        <input
          value={viewerChatInput}
          onChange={(e) => setViewerChatInput(e.target.value)}
          placeholder={isModerator ? 'Moderator notice…' : 'Add comment'}
          className={clsx(
            'w-full rounded-[16px] px-4 py-3 text-sm outline-none transition-all',
            isModerator
              ? 'bg-[#F2AD00]/20 border border-[#F2AD00]/70 text-white placeholder:text-[#F2AD00]/70 focus:border-[#F2AD00]'
              : 'bg-white/10 border border-white/60 text-white placeholder:text-white/50 focus:border-white/90'
          )}
        />
      </form>

      {/* Join / Waitlist */}
      <div className="relative flex flex-col items-center shrink-0">
        <button
          onClick={handleJoinBroadcast}
          disabled={joinState.state === 'requesting' || joinState.state === 'requested'}
          className={clsx(
            'px-6 md:px-8 py-2.5 rounded-full font-bold tracking-wide border shadow-2xl backdrop-blur-[2px] transition-all active:scale-95 text-xs md:text-sm',
            joinState.state === 'requested'
              ? 'bg-green-500/20 text-green-100 border-green-400/30'
              : 'bg-white/5 text-white border-white/20 hover:bg-white/20',
            (joinState.state === 'requesting') && 'opacity-60 cursor-not-allowed'
          )}
        >
          {joinState.state === 'requesting'
            ? 'Requesting...'
            : joinState.state === 'requested'
              ? 'Requested'
              : 'Join'}
        </button>
        {joinState.message && (
          <div className={clsx('absolute -top-10 right-0 whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10', joinState.state === 'error' ? 'text-red-300' : 'text-white/70')}>
            {joinState.message}
          </div>
        )}
      </div>

      {/* Gift Button */}
      <button
        type="button"
        onClick={onGiftClick}
        className={clsx('w-12 h-12 md:w-14 md:h-14 flex items-center justify-center active:scale-95 transition-transform relative group rounded-full shrink-0')}
        aria-label="Send gift"
      >
        <img
          src="/circle.png"
          alt=""
          className="absolute inset-0 w-full h-full bg-pink-700 rounded-full object-contain group-hover:scale-105 transition-transform opacity-100"
        />
        <img
          src="/giftboc.png"
          alt="gift"
          className="relative w-6 h-6 object-contain group-hover:rotate-12 transition-transform"
        />
      </button>
    </div>
  );
}
