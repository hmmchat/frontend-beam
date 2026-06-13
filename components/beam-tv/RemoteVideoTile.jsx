'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import ParticipantCluster from './ParticipantCluster';

/** Shared RemoteVideoTile for rendering each broadcast participant */
export default function RemoteVideoTile({
  stream,
  screenShareStream,
  name,
  age,
  city,
  displayPictureUrl,
  forceMuted,
  showFollow,
  isFollowing,
  onToggleFollow,
  showAddFriend,
  isFriendRequestSent,
  onSendFriendRequest,
  allParticipants = [],
  isFirst = false,
  tileIndex = 0,
  totalTiles = 1
}) {
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const pipRef = useRef(null);

  useEffect(() => {
    if (screenShareStream) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    const p = v.play?.();
    if (p && typeof p.catch === 'function') p.catch(() => { });
  }, [stream, screenShareStream]);

  useEffect(() => {
    if (!screenShareStream) return;
    const s = screenRef.current;
    const p = pipRef.current;
    if (s && s.srcObject !== screenShareStream) s.srcObject = screenShareStream;
    if (p && p.srcObject !== stream) p.srcObject = stream;
    const play = (el) => {
      const pr = el?.play?.();
      if (pr && typeof pr.catch === 'function') pr.catch(() => { });
    };
    play(s);
    play(p);
  }, [stream, screenShareStream]);

  const roundedClasses = totalTiles === 2
    ? (tileIndex === 0
        ? ['rounded-t-[1.5rem]', 'rounded-b-none', 'md:rounded-[4rem]']
        : ['rounded-b-[1.5rem]', 'rounded-t-none', 'md:rounded-[4rem]']
      )
    : ['rounded-[1.5rem]', 'md:rounded-[4rem]'];

  return (
    <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', roundedClasses, 'overflow-hidden', 'bg-gray-900', 'border', 'border-white/5', 'shadow-2xl')}>
      {screenShareStream ? (
        <>
          <video
            ref={screenRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 z-0 h-full w-full bg-black object-contain"
          />
          <video
            ref={pipRef}
            autoPlay
            playsInline
            muted={forceMuted}
            className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-[5] aspect-video max-h-[28%] w-[28%] md:max-h-[32%] md:w-[32%] max-w-[160px] md:max-w-[220px] rounded-xl border-2 border-white/50 object-cover shadow-2xl"
          />
        </>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted={forceMuted} className="h-full w-full min-h-0 object-cover" />
      )}

      {isFirst && (
        <div className="absolute top-3 md:top-4 left-3 md:left-5 right-3 md:right-5 flex items-start justify-between z-10">
          <div className="flex items-center ">
            <div className="flex items-center  px-1 md:px-3 py-1 md:py-2 rounded-[2.5rem]  min-w-0  md:max-w-[320px]">
              <ParticipantCluster participants={allParticipants.length > 0 ? allParticipants : [{ userId: 'self', displayPictureUrl }]} />

            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {showFollow && (
              <button
                type="button"
                onClick={onToggleFollow}
                className={clsx(
                  'w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border shadow-xl active:scale-95 transition',
                  isFollowing
                    ? 'bg-pink-500/35 border-pink-300/40 text-pink-50'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                )}
                title={isFollowing ? 'Following broadcaster' : 'Follow broadcaster'}
              >
                <svg className="w-5 h-5 md:w-7 md:h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.1 21.35l-1.1-1.02C5.14 14.88 2 12.03 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.53-3.14 6.38-8.9 11.83l-1 .92z" />
                </svg>
              </button>
            )}
            {showAddFriend && (
              <button
                type="button"
                onClick={onSendFriendRequest}
                disabled={isFriendRequestSent}
                className={clsx(
                  'w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border shadow-xl active:scale-95 transition',
                  isFriendRequestSent
                    ? 'bg-green-500/30 border-green-400/30 text-green-50'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                )}
                title={isFriendRequestSent ? 'Friend request sent' : 'Add friend'}
              >
                {isFriendRequestSent ? (
                  <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
