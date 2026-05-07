'use client';

export default function RandomnessModal({
  isOpen,
  onClose,
  isLocalHost,
  handlePullStranger,
  isPullStrangerDisabled,
  isRoomFull,
  isEnablingPullStranger,
  pullStrangerCooldownSec,
  isBroadcasting,
  handleBeamcast,
  handleStopBeamcast,
  setShowWaitlist
}) {
  if (!isOpen) return null;

 return (
  <div className="absolute inset-0 z-50 flex items-center font-otomanopee justify-center p-6" onClick={onClose}>
    <div className="w-full max-w-md space-y-1 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
      
    <div className="relative overflow-hidden w-[80%] mx-auto border border-white/20 rounded-full py-6 text-center">
  <div
    className="absolute inset-0 z-0"
    style={{
      backgroundImage: 'url(/assets/mb.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  />
  <div className="absolute inset-0 z-[1]" />

  <h2 className="relative z-10 text-white text-xl font-otomanopee font-black tracking-wider">
    Add randomness
  </h2>
</div>


      {isLocalHost ? (
        <>
          {!isBroadcasting ? (
            /* Traditional single button view when not broadcasting */
            <>
              <button
                onClick={handlePullStranger}
                disabled={isPullStrangerDisabled}
                className={`relative overflow-hidden w-full border border-white/20 rounded-[2rem] p-6 flex items-center gap-6 text-left transition-all ${
                  isPullStrangerDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-[1.02] active:scale-95'
                }`}
              >
                <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url(/assets/mb.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="absolute inset-0  z-[1]" />

                <div className="relative z-10 w-10 h-10 md:w-28 md:h-28 rounded-3xl border border-white/10 flex items-center justify-center">
                  <img src="/pullstranger.svg" className="w-18 h-18" alt="" />
                </div>

                <div className="relative z-10 flex-1">
                  <h3 className="text-white text-sm text-center">Pull in a stranger</h3>
                  <p className="text-white/70 text-[12px] font-outfit text-center w-60 mt-1.5 mx-auto">
                    {isRoomFull
                      ? 'Room is full (4/4)'
                      : isEnablingPullStranger
                        ? 'Enabling...'
                        : pullStrangerCooldownSec > 0
                          ? `Active for ${pullStrangerCooldownSec}s`
                          : 'Summons a random person in the call, can be removed anytime'}
                  </p>
                </div>
              </button>

              <button
                onClick={handleBeamcast}
                className="relative overflow-hidden w-full border border-white/20 rounded-[2rem] p-6 flex items-center gap-6 text-left hover:scale-[1.02] transition-all active:scale-95"
              >
                <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url(/assets/mb.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="absolute inset-0 z-[1]" />

                <div className="relative z-10 w-10 h-10 md:w-28 md:h-28 rounded-3xl border border-white/10 flex items-center justify-center">
                  <img src="/broadcast.svg" className="w-18 h-18" alt="" />
                </div>

                <div className="relative z-10 flex-1">
                  <h3 className="text-white text-sm text-center">Beamcast</h3>
                  <p className="text-white/70 text-[12px] font-outfit w-62 text-center mt-1.5 mx-auto">Starts streaming this call live on Beam TV. Streamed Chat can gift and join</p>
                </div>
              </button>
            </>
          ) : (
            /* Split layout when broadcasting (matching image) */
            <>
              <div className="relative overflow-hidden w-full border border-white/20 rounded-[2rem] p-6 flex flex-col gap-6">
                <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url(/assets/mb.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="absolute inset-0 z-[1]" />

                <div className="relative z-10 text-center">
                  <h3 className="text-white text-lg font-black tracking-tight">Pull in a stranger</h3>
                  <p className="text-white/70 text-[11px] font-outfit mt-1">Adds a random person in the call, can be removed anytime</p>
                </div>

                <div className="relative z-10 flex items-center gap-5">
                  <div className="w-28 h-28 shrink-0 rounded-[2rem] border border-white/20 flex items-center justify-center">
                    <img src="/pullstranger.svg" className="w-16 h-16" alt="" />
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <button
                      onClick={() => { setShowWaitlist(true); onClose(); }}
                      className="w-full py-3.5 border border-white/40 rounded-2xl text-white text-sm font-bold hover:bg-white/5 active:scale-95 transition-all"
                    >
                      Pull from Waitlist
                    </button>
                    <button
                      onClick={handlePullStranger}
                      disabled={isPullStrangerDisabled}
                      className="w-full py-3.5 border border-white/40 rounded-2xl text-white text-sm font-bold hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      Pull randomly
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden w-full border border-white/20 rounded-[2.5rem] p-6 flex items-center gap-6">
                <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url(/assets/mb.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="absolute inset-0 z-[1]" />

                <div className="relative z-10 w-28 h-28 shrink-0 rounded-[2rem] border border-white/20 flex items-center justify-center">
                  <div className="relative">
                    <img src="/broadcast.svg" className="w-16 h-16" alt="" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white/20 animate-pulse" />
                  </div>
                </div>

                <div className="relative z-10 flex-1">
                  <button
                    onClick={handleStopBeamcast}
                    className="w-full py-4 border border-white/40 rounded-2xl text-white text-sm font-bold hover:bg-white/5 active:scale-95 transition-all"
                  >
                    Stop Beamcast
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <p className="text-center text-white/75 text-sm font-medium px-4 py-6 rounded-[2rem] border border-white/10 bg-white/5">
          Only hosts of this call can pull in a stranger or start Beamcast.
        </p>
      )}
    </div>
  </div>
);
}
