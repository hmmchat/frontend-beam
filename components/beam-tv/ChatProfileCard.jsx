'use client';

export default function ChatProfileCard({ user, isLoggedIn, friendRequestSent, onSendFriendRequest, onClose }) {
  if (!user) return null;
  return (
    <div className="absolute inset-0 z-[68] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-gray-950/85 border border-white/15 rounded-[2rem] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-black tracking-wider">Profile</div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/15 text-white/80 hover:bg-white/15"
          >
            ✕
          </button>
        </div>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-300/80 bg-gray-200">
            <img src={user.displayPictureUrl || '/avatar-placeholder.png'} alt={user.username || 'User'} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="text-white text-xl font-black truncate">{user.username || 'User'}</div>
            {!!user.preferredCity && (
              <div className="text-white/55 text-xs font-bold truncate">{user.preferredCity}</div>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={!isLoggedIn || friendRequestSent}
          onClick={() => onSendFriendRequest(user.id)}
          className="w-full px-4 py-3 rounded-2xl bg-green-500/25 text-green-100 border border-green-400/40 font-black text-sm hover:bg-green-500/35 disabled:opacity-45"
        >
          {!isLoggedIn
            ? 'Sign in to send request'
            : friendRequestSent
              ? 'Friend request sent'
              : 'Send friend request'}
        </button>
      </div>
    </div>
  );
}
