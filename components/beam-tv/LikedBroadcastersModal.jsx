'use client';

export default function LikedBroadcastersModal({ likedBroadcasters, onClose, onSelectBroadcaster }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg border border-white/20 rounded-[2.5rem] p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div
          className="absolute rounded-[40px] inset-0"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
          }}
        />
        {/* Floating Header */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-full flex justify-center">
          <div className="border border-white/30 px-10 py-3 rounded-full relative overflow-hidden">
            <div
              className="absolute rounded-[40px] inset-0"
              style={{
                backgroundImage: "url(/assets/mb.jpg)",
                backgroundSize: "cover",
              }}
            />
            <span className="text-white font-black tracking-widest text-lg uppercase whitespace-nowrap relative z-50">Beamcasting rn</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-4 gap-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar relative">
          {likedBroadcasters.length > 0 ? (
            likedBroadcasters.map((b) => (
              <div
                key={b.roomId}
                className="aspect-square rounded-2xl overflow-hidden border-2 border-white/10 hover:border-white/40 transition-all cursor-pointer group relative shadow-lg"
                onClick={() => onSelectBroadcaster(b)}
              >
                <img
                  src={b.participants?.[0]?.displayPictureUrl || '/avatar-placeholder.png'}
                  alt=""
                  className="w-full h-full object-cover filter brightness-90 group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-[#8B5CF6]/30 mix-blend-overlay group-hover:bg-transparent transition-colors duration-300" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </div>
            ))
          ) : (
            <div className="col-span-4 py-12 text-center">
              <p className="text-white/50 font-bold uppercase tracking-widest text-sm">No live broadcasters in your list</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
