'use client';

export default function BroadcastHud({
  isBroadcasting,
  broadcastHud,
  setShowWaitlist,
  handleShareBroadcastLink,
  setBroadcastHud,
  copyShareUrl,
  variant = 'normal',
  className,
  soundEnabled = true,
  audioUnlocked = false,
  onToggleSound
}) {
  if (!isBroadcasting && variant !== 'beam-tv') return null;

  const topClass = variant === 'beam-tv' ? 'top-20 md:top-32' : 'top-28 md:top-32';

  return (
    <div className={`absolute left-8 md:left-12 ${topClass} z-40 flex flex-col gap-3 ${className || ''}`}>
      {/* Eye (viewer count) + Waitlist/Heart + Share + Sound */}
      <div className="md:w-10 w-8 rounded-[1.4rem] bg-black/20 backdrop-blur-md border border-white/40 overflow-hidden py-1.5 md:py-5">
        <button
          type="button"
          className="w-full h-10 md:h-14 flex items-center justify-center text-white/90"
          title="Viewers"
        >
          <div className="flex flex-col items-center leading-none">
            <div className="text-[18px]"><img src="/eye-line.svg" className="md:w-5 md:h-5 w-4 h-4" alt="" /></div>
            <div className="text-[11px] font-black mt-0.5 md:mt-1">{broadcastHud.viewerCount}</div>
          </div>
        </button>


        <button
          type="button"
          onClick={() => setShowWaitlist(true)}
          className="w-full h-8 md:h-14 flex items-center justify-center border-white/10 text-white/90 hover:bg-white/5"
          title={variant === 'beam-tv' ? 'Liked Broadcasters' : 'Waitlist'}
        >
          <div className="flex flex-col items-center leading-none">
            <div className="text-[18px]"><img src={variant === 'beam-tv' ? '/heart.svg' : '/3queue.svg'} className="md:w-5 md:h-5 w-4 h-4" alt="" /></div>
            {variant !== 'beam-tv' && (
              <div className="text-[11px] font-black mt-0.5 md:mt-1">{broadcastHud.waitlistCount}</div>
            )}
          </div>
        </button>


        <button
          type="button"
          onClick={handleShareBroadcastLink}
          className="w-full h-8 md:h-14 flex items-center justify-center border-white/10 text-white/90 hover:bg-white/5"
          title="Share"
        >
          <div className="text-[18px]"><img src="/share.svg" className="w-4 h-4 md:w-5 md:h-5" alt="" /></div>
        </button>

        {variant === 'beam-tv' && onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            className="w-full h-8 md:h-14 flex items-center justify-center border-white/10 text-white/90 hover:bg-white/5"
            title={soundEnabled ? (audioUnlocked ? 'Sound on' : 'Tap to enable sound') : 'Sound off'}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            aria-pressed={soundEnabled}
          >
            <img
              src={soundEnabled ? '/sound-on.svg' : '/sound-off.svg'}
              className="md:w-5 md:h-5 w-4 h-4"
              alt=""
            />
          </button>
        )}
      </div>

      {broadcastHud.lastShareMsg && (
        <div className="text-white/70 text-xs font-bold bg-black/60 border border-white/10 rounded-full px-3 py-2 w-fit animate-in fade-in slide-in-from-left-2">
          {broadcastHud.lastShareMsg}
        </div>
      )}

      {broadcastHud.shareOpen && (
        <div className="w-[260px] bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl p-3 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white font-black text-xs tracking-wider">Share link</div>
            <button
              type="button"
              onClick={() => setBroadcastHud((prev) => ({ ...prev, shareOpen: false }))}
              className="w-8 h-8 rounded-full bg-white/10 border border-white/10 text-white/70 hover:bg-white/15"
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={broadcastHud.shareUrl}
              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white/80 text-[11px] font-mono outline-none"
            />
            <button
              type="button"
              onClick={copyShareUrl}
              className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white font-black text-xs hover:bg-white/15"
              title="Copy"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
