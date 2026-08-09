'use client';

import OverlayBackdrop from '@/components/ui/OverlayBackdrop';
import { useState } from 'react';
import clsx from 'clsx';
import ReportUserModal from '@/components/modals/ReportUserModal';

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
  const [reportTarget, setReportTarget] = useState(null);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in"
    >
      <OverlayBackdrop onClick={onClose} />
      <div
        className="relative z-10 border border-white/10 rounded-[1.5rem] w-full max-w-sm overflow-hidden  animate-in zoom-in-95 duration-200 "
        onClick={(e) => e.stopPropagation()}
      >

        <div
          className="absolute inset-0 z-0 "
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            opacity: 0.8,
          }}
        />



        <div className="relative z-10 p-5 max-h-[70vh] overflow-y-auto scrollbar-none flex flex-col gap-2">
          {remoteStreams.map((s) => {
            const profile = getRemoteTileProfile(s);
            const isSent = friendRequestSentTo[s.userId];
            const isFriend = friendshipWithRemote[s.userId];

            return (
              <div
                key={s.userId}
                className="flex items-center gap-4 py-4 border-b border-white/10 last:border-0 last:pb-0"
              >
                {/* Avatar with yellow/golden border */}
                <div className="w-14 h-14 rounded-full border-[3px] border-[#FFD338] overflow-hidden bg-gray-800 flex-shrink-0">
                  <img
                    src={profile.displayPictureUrl}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>

                {/* User Info (Name only) */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-black text-md md:text-lg truncate font-otomanopee">
                    {profile.name || "Matched!"}
                  </div>
                </div>

                {/* Actions: Heart + Report */}
                <div className="flex gap-2.5">
                  {/* Heart / Add Friend Button */}
                  <button
                    onClick={() => {
                      if (!isFriend && !isSent) handleSendFriendRequest(s.userId);
                    }}
                    disabled={isFriend || isSent}
                    className={clsx(
                      "w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border",
                      isFriend
                        ? "border-pink-400/60 bg-pink-500/20 cursor-default"
                        : isSent
                          ? "border-green-400/60 bg-green-500/20 cursor-default"
                          : "border-white/40 bg-white/5 hover:bg-white/10"
                    )}
                    title={isFriend ? 'Already friends' : isSent ? 'Friend request sent' : 'Send friend request'}
                  >
                    <img
                      src="/history/heart.svg"
                      alt="heart"
                      className={clsx("w-6 h-6 object-contain", (isSent || isFriend) && "opacity-60")}
                    />
                  </button>

                  {/* Report Button */}
                  <button
                    onClick={() => {
                      if (!reportedUserIds.has(s.userId)) {
                        setReportTarget({
                          userId: s.userId,
                          name: profile.name || 'User',
                        });
                      }
                    }}
                    disabled={reportedUserIds.has(s.userId)}
                    className={clsx(
                      "w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border",
                      reportedUserIds.has(s.userId)
                        ? "border-green-500/60 bg-green-500/20 cursor-not-allowed"
                        : "border-white/40 bg-white/5 hover:bg-white/10"
                    )}
                    title={reportedUserIds.has(s.userId) ? 'Reported' : 'Report user'}
                  >
                    {reportedUserIds.has(s.userId) ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <img
                        src="/report-line.svg"
                        className={clsx('md:w-6', 'md:h-6', 'w-5', 'h-5', 'object-contain', 'pointer-events-none')}
                        alt="Report"
                      />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ReportUserModal
        isOpen={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        userId={reportTarget?.userId}
        name={reportTarget?.name}
        isAbsolute={false}
        onReportUser={async (userId, reason) => {
          await handleReportUser?.(userId, reason);
        }}
      />
    </div>
  );
}
