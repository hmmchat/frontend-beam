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
  isFirst = false
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
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [stream, screenShareStream]);

  useEffect(() => {
    if (!screenShareStream) return;
    const s = screenRef.current;
    const p = pipRef.current;
    if (s && s.srcObject !== screenShareStream) s.srcObject = screenShareStream;
    if (p && p.srcObject !== stream) p.srcObject = stream;
    const play = (el) => {
      const pr = el?.play?.();
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
    };
    play(s);
    play(p);
  }, [stream, screenShareStream]);

  return (
    <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[1.5rem]', 'md:rounded-[2rem]', 'overflow-hidden', 'bg-gray-900', 'border', 'border-white/5', 'shadow-2xl')}>
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
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 md:gap-4 bg-[#C7BCB1]/80 backdrop-blur-2xl px-2 md:px-3 py-1.5 md:py-2 rounded-[2.5rem] border border-white/30 shadow-xl min-w-0 max-w-[200px] md:max-w-[320px]">
              <ParticipantCluster participants={allParticipants.length > 0 ? allParticipants : [{ userId: 'self', displayPictureUrl }]} />
              <div className="flex flex-col pr-2 md:pr-4 overflow-hidden">
                <span className="text-white text-sm md:text-base font-extrabold tracking-tight leading-tight truncate">
                  {allParticipants.length > 1 
                    ? allParticipants.map(p => p.name || 'Broadcaster').join(' & ')
                    : (name || 'Broadcaster') + (age && age !== '?' ? `, ${age}` : '')}
                </span>
                {(allParticipants.length <= 1 && city && city !== 'Unknown') && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] md:text-[11px] text-white/90 font-bold flex items-center gap-1">
                      <svg className="w-2 h-2 md:w-2.5 md:h-2.5 fill-white" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      {city}
                    </span>
                  </div>
                )}
                {allParticipants.length > 1 && (
                  <span className="text-[9px] md:text-[10px] text-white/70 font-bold uppercase tracking-wider mt-0.5">
                    Beamcasting Live
                  </span>
                )}
              </div>
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
