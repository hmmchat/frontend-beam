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
  <div className="absolute inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
    <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
      
    <div className="relative overflow-hidden w-[80%] mx-auto border border-white/20 rounded-full py-3 text-center">
  <div
    className="absolute inset-0 z-0"
    style={{
      backgroundImage: 'url(/assets/mb.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  />
  <div className="absolute inset-0 z-[1]" />

  <h2 className="relative z-10 text-white text-xl font-black tracking-wider">
    Add randomness
  </h2>
</div>


      {isLocalHost ? (
        <>
          <button
            onClick={handlePullStranger}
            disabled={isPullStrangerDisabled}
            className={`relative overflow-hidden w-full  border border-white/20 rounded-[2rem] p-6 flex items-center gap-6 text-left transition-all ${
              isPullStrangerDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-[1.02] active:scale-95'
            }`}
          >
            <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url(/assets/mb.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="absolute inset-0  z-[1]" />

            <div className="relative z-10 w-20 h-20  rounded-3xl border border-white/10 flex items-center justify-center">
              <img src="/pullstranger.svg" className="w-10 h-10" alt="" />
            </div>

            <div className="relative z-10 flex-1">
              <h3 className="text-white text-lg font-black">Pull in a stranger</h3>
              <p className="text-white/70 text-[11px] font-medium">
                {isRoomFull
                  ? 'Room is full (4/4)'
                  : isEnablingPullStranger
                    ? 'Enabling...'
                    : pullStrangerCooldownSec > 0
                      ? `Active for ${pullStrangerCooldownSec}s`
                      : 'Summons a random person in the call'}
              </p>
            </div>
          </button>

          {!isBroadcasting ? (
            <button
              onClick={handleBeamcast}
              className="relative overflow-hidden w-full  border border-white/20 rounded-[2rem] p-6 flex items-center gap-6 text-left hover:scale-[1.02] transition-all active:scale-95"
            >
              <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url(/assets/mb.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="absolute inset-0 z-[1]" />

              <div className="relative z-10 w-20 h-20  rounded-3xl border border-white/10 flex items-center justify-center">
                <img src="/broadcast.svg" className="w-10 h-10" alt="" />
              </div>

              <div className="relative z-10 flex-1">
                <h3 className="text-white text-lg font-black">Beamcast</h3>
                <p className="text-white/70 text-[11px] font-medium">Starts streaming this call live on Beam TV</p>
              </div>
            </button>
          ) : (
            <button
              onClick={handleStopBeamcast}
              className="relative overflow-hidden w-full backdrop-blur-md border border-white/20 rounded-[2rem] p-6 flex items-center gap-6 text-left hover:scale-[1.02] transition-all active:scale-95"
            >
              <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url(/assets/mb.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="absolute inset-0 z-[1]" />

              <div className="relative z-10 w-20 h-20 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center">
                <img src="/beamcast.svg" className="w-10 h-10" alt="" />
              </div>

              <div className="relative z-10 flex-1">
                <h3 className="text-white text-lg font-black">Stop Beamcast</h3>
                <p className="text-white/70 text-[11px] font-medium">Stops streaming and removes this room from Beam TV</p>
              </div>
            </button>
          )}

          <button
            onClick={() => { setShowWaitlist(true); onClose(); }}
            disabled={!isBroadcasting}
            className={`relative overflow-hidden w-full backdrop-blur-md border border-white/20 rounded-[2rem] p-6 flex items-center gap-6 text-left transition-all ${
              !isBroadcasting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
            }`}
          >
            <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url(/assets/mb.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="absolute inset-0  z-[1]" />

            <div className="relative z-10 w-20 h-20 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center">
              <img src="/msg.png" className="w-10 h-10 object-contain" alt="" />
            </div>

            <div className="relative z-10 flex-1">
              <h3 className="text-white text-lg font-black">Waitlist</h3>
              <p className="text-white/70 text-[11px] font-medium">
                {isBroadcasting ? 'See who requested to join and accept them' : 'Start Beamcast to enable join requests'}
              </p>
            </div>
          </button>
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
