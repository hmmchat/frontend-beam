'use client';

import clsx from 'clsx';

export default function FavouritesPanel({ favouriteProfiles, onAvatarClick }) {
  return (
    <div className="absolute top-20 right-28 z-50 rounded-[2.2rem] border border-white/25 bg-[#390f87]/88 backdrop-blur-xl shadow-2xl p-5">
      <div className="overflow-y-auto pr-1">
        {favouriteProfiles.length === 0 && (
          <div className="text-white/70 text-sm font-bold py-6 text-center">No favourites yet.</div>
        )}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
          {favouriteProfiles.map((fav) => {
            const uid = String(fav?.userId || '');
            if (!uid) return null;
            const isLive = Boolean(fav?.isLive && fav?.liveRoomId);
            return (
              <button
                key={`fav-strip-${uid}`}
                type="button"
                disabled={!isLive}
                onClick={() => onAvatarClick(fav)}
                className={clsx(
                  'relative w-[84px] h-[84px] rounded-2xl overflow-hidden border-2 transition-all',
                  isLive
                    ? 'border-pink-400/90 shadow-[0_0_18px_rgba(236,72,153,0.55)] hover:scale-105 cursor-pointer'
                    : 'border-white/35 opacity-45 cursor-not-allowed'
                )}
                title={isLive ? 'Live now - open broadcast' : 'Offline'}
              >
                <img
                  src={fav?.displayPictureUrl || ''}
                  alt={fav?.username || 'Favourite'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '';
                  }}
                />
                {isLive && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.9)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
