'use client';

import clsx from 'clsx';

export default function GroupMembersModal({
  isOpen,
  onClose,
  remoteStreams,
  getRemoteTileProfile,
  friendRequestSentTo,
  friendshipWithRemote,
  handleSendFriendRequest,
  reportedUserIds,
  handleReportUser,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

        <div className="relative z-10">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-white font-black text-lg">Group Members</h3>

            <button
              onClick={onClose}
              className="text-white/50 hover:text-white p-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {remoteStreams.map((s) => {
              const profile = getRemoteTileProfile(s);
              const isSent = friendRequestSentTo[s.userId];
              const isFriend = friendshipWithRemote[s.userId];

              return (
                <div
                  key={s.userId}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
                    <img
                      src={profile.displayPictureUrl}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold truncate font-otomanopee">
                      {profile.name || "Matched!"}
                    </div>

                    {profile.city && profile.city !== "Unknown" && (
                      <div className="text-white/50 text-xs truncate font-['Outfit']">
                        {profile.city}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isFriend && (
                      <button
                        onClick={() => {
                          if (!isSent) handleSendFriendRequest(s.userId);
                        }}
                        disabled={isSent}
                        className={clsx(
                          "px-4 py-2 rounded-full text-sm font-bold transition-all",
                          isSent
                            ? "bg-green-500/20 text-green-400"
                            : "bg-white/10 text-white hover:bg-white/20 active:scale-95"
                        )}
                      >
                        {isSent ? "Sent" : "Add"}
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (!reportedUserIds.has(s.userId)) {
                          await handleReportUser(s.userId);
                        }
                        onClose();
                      }}
                      disabled={reportedUserIds.has(s.userId)}
                      className={clsx(
                        "px-4 py-2 rounded-full text-sm font-bold transition-all",
                        reportedUserIds.has(s.userId)
                          ? "bg-green-500/20 text-green-400 cursor-not-allowed"
                          : "bg-red-500/20 text-red-400 hover:bg-red-500/40 active:scale-95"
                      )}
                    >
                      {reportedUserIds.has(s.userId) ? "Reported" : "Report"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
