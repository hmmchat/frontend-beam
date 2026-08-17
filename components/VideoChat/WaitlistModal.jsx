'use client';

import OverlayBackdrop from '@/components/ui/OverlayBackdrop';
import FaceCard from '../Home/FaceCard';
import { displayUsername } from '@/lib/username';

export default function WaitlistModal({
  isOpen,
  onClose,
  waitlist,
  waitlistLoading,
  waitlistError,
  refreshWaitlist,
  acceptFromWaitlist,
  selectedWaitlistUser,
  setSelectedWaitlistUser
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center p-4">
      <OverlayBackdrop onClick={onClose} />
      <div className="relative z-10 overflow-hidden w-full md:h-[50vh] h-[40vh] max-w-2xl bg-gradient-to-b from-[#7015cc]/55 via-[#5e10b8]/52 to-[#4b0e9d]/50 border border-white/20 rounded-[2.2rem] px-5 py-6 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>

        <div
          className="absolute inset-0 bg-[#02004A] -z-50 pointer-events-none"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundRepeat: "repeat",
            backgroundSize: "cover",
          }}
        />
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-white text-xl font-black tracking-wide">Waitlist</div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full  border border-white/20 text-white/85 hover:bg-white/5"
            title="Close"
          >
            ✕
          </button>
        </div>

        {waitlistError && (
          <div className="mb-3 text-red-200 text-xs font-bold">{waitlistError}</div>
        )}

        <div className="flex-1 min-h-0 overflow-auto pr-1">
          {waitlistLoading && waitlist.length === 0 && (
            <div className="text-white/50 text-sm font-bold animate-pulse">Loading…</div>
          )}
          {!waitlistLoading && waitlist.length === 0 && (
            <div className="text-white/50 text-sm font-outfit">No one is waiting to join yet.</div>
          )}

          <div className="flex flex-col">
            {waitlist.map((w) => {
              const u = w.profile || {
                id: w.userId,
                username: w.username || w.userId,
                displayPictureUrl: w.displayPictureUrl,
                preferredCity: '',
                city: ''
              };
              return (
                <div
                  key={w.userId}
                  className="w-full px-2 py-3 flex items-center gap-4 hover:bg-white/10 transition 0  meeting now border-b border-white/20"
                  onClick={() => setSelectedWaitlistUser(u)}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden border-[3px] border-yellow-300/90 bg-gray-200 shrink-0">
                    <img src={u.displayPictureUrl} alt={u.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[2rem] leading-none font-black truncate">{displayUsername(u.username)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      acceptFromWaitlist(w.userId);
                    }}
                    className="w-12 h-12 rounded-full border-2 border-white/45 text-white text-2xl leading-none flex items-center justify-center hover:bg-white/15 active:scale-95"
                    title="Add to call"
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={refreshWaitlist}
            className="flex-1 px-4 py-3 rounded-full text-white border border-white/30 font-black text-xs hover:bg-white/5"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-full text-white border border-white/30 font-black text-xs hover:bg-white/5"
          >
            Done
          </button>
        </div>
      </div>

      {/* Profile Detail View Overlay */}
      {selectedWaitlistUser && (
        <div className="absolute inset-0 z-[56] bg-black/45 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSelectedWaitlistUser(null)}>
          <div className="relative animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <FaceCard user={selectedWaitlistUser} />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[82%] flex gap-2">
              <button
                type="button"
                onClick={() => {
                  acceptFromWaitlist(selectedWaitlistUser.id);
                  setSelectedWaitlistUser(null);
                }}
                className="flex-1 px-4 py-3 rounded-full bg-green-500/30 text-green-50 border border-green-400/30 font-black text-sm hover:bg-green-500/40 active:scale-95 transition"
              >
                Meet rn
              </button>
              <button
                type="button"
                onClick={() => setSelectedWaitlistUser(null)}
                className="px-4 py-3 rounded-full bg-white/10 text-white border border-white/15 font-black text-sm hover:bg-white/15"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
