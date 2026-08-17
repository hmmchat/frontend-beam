'use client';

import clsx from 'clsx';
import PressableActionButton from '@/components/VideoChat/PressableActionButton';

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
    <div className="relative flex items-center justify-between md:justify-end gap-2 md:gap-3 w-full">
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
            'w-full rounded-[16px] px-4 py-3 text-sm outline-none transition-all backdrop-blur-md',
            isModerator
              ? 'bg-[#F2AD00]/20 border border-[#F2AD00]/70 text-white placeholder:text-[#F2AD00]/70 focus:border-[#F2AD00]'
              : 'bg-[#0A032D]/20 border border-white/60 text-white placeholder:text-white/50 focus:border-white/90'
          )}
        />
      </form>

      {/* Join / Waitlist */}
      <div className="relative flex flex-col items-center shrink-0">
        <button
          onClick={handleJoinBroadcast}
          disabled={joinState.state === 'requesting' || joinState.state === 'requested'}
          className={clsx(
            'px-6 md:px-8 py-2.5 rounded-full font-bold tracking-wide border shadow-2xl backdrop-blur-md transition-all active:scale-95 text-xs md:text-sm',
            joinState.state === 'requested'
              ? 'bg-green-500/20 text-green-100 border-green-400/30'
              : 'bg-[#0A032D]/20 text-white border-white/20 hover:bg-[#0A032D]/40',
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
      <PressableActionButton
        onPress={onGiftClick}
        className="w-12 h-12 md:w-14 md:h-14 shrink-0"
        circleClassName="bg-pink-800"
        iconSrc="/giftboc.png"
        iconClassName="w-6 h-6 object-contain"
        alt="gift"
        aria-label="Send gift"
      />
    </div>
  );
}
