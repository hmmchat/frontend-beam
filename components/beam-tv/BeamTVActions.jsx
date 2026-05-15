'use client';

import clsx from 'clsx';

export default function BeamTVActions({
  viewerChatInput,
  setViewerChatInput,
  sendViewerChat,
  joinState,
  handleJoinBroadcast
}) {
  return (
    <div className="absolute bottom-6 w-[46%] right-0 z-40 flex items-center gap-3">
      {/* Comment Box */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          sendViewerChat();
        }} 
        className="relative flex items-center"
      >
        <input
          value={viewerChatInput}
          onChange={(e) => setViewerChatInput(e.target.value)}
          placeholder="Add comment"
          className="w-48 sm:w-120 bg-blue/20 border border-white/60 rounded-[16px] px-4 py-3.5 text-white text-sm outline-none placeholder:text-white/50 focus:border-white/40 transition-all"
        />
      </form>

      {/* Join / Waitlist */}
      <div className="relative flex flex-col items-center">
        <button
          onClick={handleJoinBroadcast}
          disabled={joinState.state === 'requesting' || joinState.state === 'requested'}
          className={clsx(
            'px-8 py-2.5 rounded-full font-bold tracking-wide border shadow-2xl backdrop-blur-[2px] transition-all active:scale-95',
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
        className={clsx('w-14 h-14 flex items-center justify-center active:scale-95 transition-transform relative group rounded-full')}
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
