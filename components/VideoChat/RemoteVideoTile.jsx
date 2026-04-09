'use client';

import { useRef, useEffect } from 'react';
import clsx from 'clsx';

export default function RemoteVideoTile({
  stream,
  /** Remote display/window share (camera+audio stay on `stream` for PiP). */
  screenShareStream,
  name,
  age,
  city,
  displayPictureUrl,
  /** Report + emoji: only on the primary peer tile (not every remote in group calls). */
  showReportEmoji,
  /** HOST removing a PARTICIPANT — server enforces; UI only when eligible. */
  showKickParticipant,
  onKickParticipant,
  onSendFriendRequest,
  /** Show + for any in-call peer (not only discovery match); server enforces same room. */
  showAddFriend,
  isAlreadyFriend,
  isFriendRequestSent
}) {
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const pipRef = useRef(null);

  useEffect(() => {
    if (screenShareStream) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) {
      v.srcObject = stream;
    }
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
    <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative',  'overflow-hidden', 'bg-gray-900', 'border', 'border-white/5', 'shadow-2xl')}>
      {screenShareStream ? (
        <>
          <video
            ref={screenRef}
            autoPlay
            playsInline
            className="absolute inset-0 z-0 h-full w-full bg-black object-contain"
          />
          <video
            ref={pipRef}
            autoPlay
            playsInline
            className="absolute bottom-4 right-4 z-[5] aspect-video max-h-[32%] w-[32%] max-w-[220px] rounded-xl border-2 border-white/50 object-cover shadow-2xl"
          />
        </>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-full w-full min-h-0 object-cover"
        />
      )}

      <div className="absolute top-4 left-5 right-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-[#C7BCB1]/80 backdrop-blur-2xl px-3 py-2 rounded-[2.5rem] border border-white/30 shadow-xl">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 bg-gray-200">
                <img 
                  src={displayPictureUrl || "/assets/ico.png"} 
                  className="w-full h-full object-cover" 
                  alt="" 
                />
              </div>
              <div className="absolute -bottom-1.5 -left-1 text-2xl filter drop-shadow-md">🐒</div>
            </div>
            <div className="flex flex-col pr-4">
              <span className="text-white text-base font-extrabold tracking-tight leading-tight whitespace-nowrap">
                {name || 'Matched!'}{age && age !== '?' ? `, ${age}` : ''}
              </span>
              {(city && city !== 'Unknown') && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-white/90 font-bold flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    {city}
                  </span>
                </div>
              )}
            </div>
          </div>

          {showAddFriend && !isAlreadyFriend && (
            <button
              type="button"
              onClick={onSendFriendRequest}
              disabled={isFriendRequestSent}
              className={clsx(
                'w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center transition-all border-2 border-white/40 shadow-xl active:scale-95',
                isFriendRequestSent ? 'bg-green-500/50' : 'bg-[#C7BCB1]/80 hover:bg-[#B7ACA1]'
              )}
            >
              {isFriendRequestSent ? (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-9 h-9 text-white opacity-90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4 hidden">
          {showKickParticipant && onKickParticipant && (
            <button
              type="button"
              onClick={onKickParticipant}
              title="Remove guest from call"
              className="w-10 h-10 rounded-full bg-red-600/80 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 border border-white/20"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
          {showReportEmoji && (
            [
              { img: '/gravecurrent.png', alt: 'Report' },
              { img: '/smile.png', alt: 'Emoji' }
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="w-10 h-10 rounded-full bg-purple-900/80 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border border-white/20"
              >
                <img src={item.img} className="w-5 h-5 object-contain" alt={item.alt} />
              </button>
            ))
          )}
        </div>
      </div>
      {/* 🔲 HUD BORDER FRAME */}
      <div className="absolute inset-4 border border-white/30 rounded-[30px] pointer-events-none z-20" />
    </div>
  );
}
