'use client';

import { useRef, useEffect, useState } from 'react';
import clsx from 'clsx';
import GiftAnimation from './GiftAnimation';

export default function RemoteVideoTile({
  userId,
  isReported = false,
  onReportUser,
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
  isFriendRequestSent,
  showLeaveNextButton,
  onLeaveOrNext,
  isRainchecking,
  className,
  borderBottomClass = "md:bottom-24 ",
  leaveIconType = "next",
  hideNameOnMobile = false,
  multiUserAvatars = [],
  hideAddFriendOnMobile = false,
  hideReportOnMobile = false,
  hideReport = false,
  showNextButton,
  onNext,
  onClickMultiUserAvatars,
  onReportClick,
  gift,
  onGiftAnimationComplete,
  forceDismiss,
  showMinusButton = false,
  onMinus,
  activeBadgeImageUrl,
  activeBadge
}) {
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const pipRef = useRef(null);
  const formattedCity = (() => {
    if (!city || city === 'ANYWHERE_IN_INDIA' || city === 'Anywhere') return 'Anywhere';
    if (city === 'Unknown') return '';
    return city.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  })();
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const timeoutRef = useRef(null);

  const handleTouch = () => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;

    setAreControlsVisible(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setAreControlsVisible(false);
    }, 5000);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setAreControlsVisible(true);
      } else {
        setAreControlsVisible(false);
      }
    };
    window.addEventListener('resize', handleResize);

    if (window.innerWidth >= 768) {
      setAreControlsVisible(true);
    } else {
      setAreControlsVisible(false);
    }

    const handleGlobalTouch = () => {
      handleTouch();
    };

    window.addEventListener('touchstart', handleGlobalTouch, { passive: true });
    window.addEventListener('touchmove', handleGlobalTouch, { passive: true });
    window.addEventListener('mousedown', handleGlobalTouch, { passive: true });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', handleGlobalTouch);
      window.removeEventListener('touchmove', handleGlobalTouch);
      window.removeEventListener('mousedown', handleGlobalTouch);
    };
  }, []);

  const playSafely = (el) => {
    const pr = el?.play?.();
    if (pr && typeof pr.catch === 'function') pr.catch(() => { });
  };

  useEffect(() => {
    if (screenShareStream) return;
    const v = videoRef.current;
    if (!v || !stream) return;

    const attachAndPlay = () => {
      if (!videoRef.current || !stream) return;
      const el = videoRef.current;
      if (el.srcObject !== stream) el.srcObject = stream;
      playSafely(el);
    };

    attachAndPlay();

    const onVisible = () => {
      if (document.hidden) return;
      attachAndPlay();
    };

    const videoTrack = stream.getVideoTracks?.()[0];
    videoTrack?.addEventListener?.('unmute', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);

    return () => {
      videoTrack?.removeEventListener?.('unmute', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [stream, screenShareStream]);

  useEffect(() => {
    if (!screenShareStream) return;
    const s = screenRef.current;
    const p = pipRef.current;
    if (s && s.srcObject !== screenShareStream) s.srcObject = screenShareStream;
    if (p && p.srcObject !== stream) p.srcObject = stream;
    if (s) playSafely(s);
    if (p) playSafely(p);
  }, [stream, screenShareStream]);

  return (
    <div
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      onMouseDown={handleTouch}
      className={clsx(className || 'flex-1', 'min-h-0', 'min-w-0', 'relative', 'overflow-hidden', 'border', 'border-white/5', 'shadow-2xl')}
    >


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
          className="h-full w-full min-h-0 object-cover md:rounded-[60px] "
          style={{ transform: 'translateZ(0)' }}
        />
      )}

      {/* Next (Arrow) Button — far right */}
      {showNextButton && onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={isRainchecking}
          className={clsx(
            "absolute md:top-13 top-6 md:right-10 right-6 z-20 md:w-12 w-10 h-10 md:h-12 rounded-full outline outline-[1.5px] outline-white/40 bg-slate-900/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:opacity-40",
            "transition-all duration-300",
            areControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <img
            src="/arrowright.png"
            className="md:w-6 w-5 h-5 md:h-6 mt-1 md:mt-2 object-contain pointer-events-none"
            alt="Next"
          />
        </button>
      )}

      {/* Leave Button — top right (shifted left if Next is shown) */}
      {showLeaveNextButton && onLeaveOrNext && (
        <div className={clsx(
          "absolute md:top-13 top-6 z-20",
          (showNextButton && onNext) ? "md:right-25 right-18" : "md:right-10 right-6",
          "transition-all duration-300",
          areControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {leaveIconType === 'exit' ? (
            <button
              type="button"
              onClick={onLeaveOrNext}
              disabled={isRainchecking}
              className="md:w-12 w-10 h-10 md:h-12 rounded-full outline outline-[1.5px] outline-white/40 bg-slate-900/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              <svg
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5.5 h-5.5"
                fill="none"
              >
                <path
                  d="M4.22656 29.5746V21.1246H7.04323V26.7579H26.7599V7.04128H7.04323V12.6746H4.22656V4.22461H29.5766V29.5746H4.22656ZM14.7891 23.9413L12.8174 21.8992L16.4086 18.3079H4.22656V15.4913H16.4086L12.8174 11.9L14.7891 9.85794L21.8307 16.8996L14.7891 23.9413Z"
                  fill="white"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLeaveOrNext}
              disabled={isRainchecking}
              className="md:w-12 w-10 h-10 md:h-12 rounded-full outline outline-[1.5px] outline-white/40 bg-slate-900/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              <img
                src="/arrowright.png"
                className="md:w-6 w-5 h-5 md:h-6 mt-1 md:mt-2 object-contain pointer-events-none"
                alt="Next"
              />
            </button>
          )}
        </div>
      )}

      {/* Minus Button */}
      {showMinusButton && onMinus && (
        <button
          type="button"
          onClick={onMinus}
          disabled={isRainchecking}
          className={clsx(
            "absolute z-20 rounded-full outline outline-[1.5px] outline-white/40 bg-slate-900/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:opacity-40",
            "md:top-13 md:w-12 md:h-12 md:left-auto md:translate-x-0 md:translate-y-0",
            (showLeaveNextButton && onLeaveOrNext) ? "md:right-40" : "md:right-25",
            "w-10 h-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "transition-all duration-300",
            areControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Arrow icon on desktop, minus icon on mobile */}
          <img
            src="/arrowright.png"
            className="hidden md:block md:w-6 md:h-6 mt-1 md:mt-2 object-contain pointer-events-none"
            alt="Next"
          />
          <svg
            className="block md:hidden w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Report Button */}
      {!hideReport && (
        <button
          type="button"
          disabled={isReported}
          onClick={() => onReportClick ? onReportClick() : setShowReportModal(true)}
          className={clsx(
            "absolute md:top-13 top-6 z-20 md:w-12 md:h-12 w-10 h-10 rounded-full bg-slate-900/20 backdrop-blur-md outline outline-[1.5px] outline-white/40 flex items-center justify-center transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:opacity-50",
            ((showNextButton && onNext) && (showLeaveNextButton && onLeaveOrNext)) ? "md:right-40 right-30" :
              ((showNextButton && onNext) || (showLeaveNextButton && onLeaveOrNext)) ? "md:right-25 right-18" :
                "md:right-10 right-6",
            hideReportOnMobile ? "hidden md:flex" : "flex",
            isReported && "bg-green-500/20 outline-green-500/40",
            "transition-all duration-300",
            areControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {isReported ? (
            <svg className="w-5 h-5 md:w-6 md:h-6 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <img
              src="/report-line.svg"
              className="md:w-6 md:h-6 w-5 h-5 object-contain pointer-events-none"
              alt="Report"
            />
          )}
        </button>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="absolute  inset-0 top-14 md:top-0   z-50 flex items-center justify-center p-6 font-otomanopee " onClick={() => !isReporting && setShowReportModal(false)}>
          <div className="w-full max-w-[320px]  space-y-1 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>

            {/* Pill Header */}
            <div className="relative overflow-hidden md:w-[80%] w-[60%] mx-auto border border-white/50 rounded-full py-4 text-center">
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: 'url(/assets/mb.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="absolute inset-0 z-[1]" />
              <h2 className="relative z-10 text-white md:text-xl text-md font-black tracking-wider">
                Report User
              </h2>
            </div>

            {/* Main Content Box */}
            <div className="relative overflow-hidden md:w-full w-[90%] mx-auto border border-white/50 rounded-[3rem] p-3 py-14 md:py-18 flex flex-col items-center gap-6 text-center shadow-2xl">
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: 'url(/assets/mb.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="absolute inset-0 z-[1]" />

              <div className="relative z-10 space-y-2 ">
                <h3 className="text-white md:text-2xl text-lg font-black">Report {name || "this user"}</h3>
                <p className="text-white/70 md:text-sm text-xs font-outfit px-2 leading-relaxed">
                  Are you sure you want to <br /> report this user?
                </p>
              </div>

              <button
                disabled={isReporting}
                onClick={async () => {
                  setIsReporting(true);
                  try {
                    if (onReportUser) {
                      await onReportUser(userId);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsReporting(false);
                    setShowReportModal(false);
                  }
                }}
                className="relative text-sm md:text-md z-10 mt-4 md:px-10 px-6 py-3.5 md:py-4 border border-white/40 border-b-[3px] rounded-2xl text-white font-black hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
              >
                {isReporting ? "Reporting..." : "Report this user"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute md:top-12 top-6  md:left-12 left-6  flex items-center justify-between z-10">
        <div className="flex items-center md:gap-2 gap-2">
          <div className={clsx(
            "relative items-center gap-2.5 pl-1.5 pr-5 py-1.5 md:py-2.5 rounded-full bg-slate-900/20 backdrop-blur-md outline outline-2 outline-white/40",
            hideNameOnMobile ? "hidden md:inline-flex" : "inline-flex"
          )}>
            <div className="relative">
              <div className="md:w-10 md:h-10 w-8 h-8 rounded-full overflow-hidden outline outline-[1.35px] outline-white bg-gray-200">
                <img
                  src={displayPictureUrl}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>


            </div>

            <div className="flex flex-col justify-center items-start">
              <div className="flex items-center gap-2">
                <div className="text-white text-xs md:text-base font-normal font-otomanopee whitespace-nowrap">
                  {name || "Matched!"}
                  {age && age !== "?" ? `, ${age}` : ""}
                </div>
              </div>

              {formattedCity && (
                <div className="flex items-center ">
                  <svg
                    className="w-3 h-3 md:w-4 md:h-4 fill-white"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>

                  <span className="text-white text-[10px] md:text-sm font-normal font-['Outfit']">
                    {formattedCity}
                  </span>
                </div>
              )}
            </div>
            {activeBadgeImageUrl ? (
              <div className="absolute left-5 top-5 w-10 md:w-11 pointer-events-none">
                <img
                  src={activeBadgeImageUrl}
                  className="w-full h-auto object-contain"
                  alt="sticker"
                />
              </div>
            ) : activeBadge?.giftEmoji ? (
              <div className="absolute left-5 top-5 w-10 md:w-11 pointer-events-none flex items-center justify-center">
                <span className="text-xl md:text-2xl leading-none">
                  {activeBadge.giftEmoji}
                </span>
              </div>
            ) : null}
          </div>

          {/* New Mobile Multi-User Overlapping Avatars */}
          {multiUserAvatars.length > 0 && (
            <button onClick={onClickMultiUserAvatars} type="button" className="flex items-center md:hidden pl-2 pb-2 transition-transform active:scale-95 bg-slate-900/20 backdrop-blur-md outline outline-2 outline-white/40 border rounded-full p-2 px-3">
              {multiUserAvatars.slice(0, 3).map((url, i) => (
                <div
                  key={i}
                  className="w-[2.2rem] h-[2.2rem] rounded-full overflow-hidden border-[3px] bg-gray-200 shadow-md"
                  style={{
                    marginLeft: i === 0 ? '0' : '-1.5rem',
                    zIndex: 10 - i,
                    borderColor: i === 0 ? 'white' : '#f59e0b'
                  }}
                >
                  <img src={url} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
            </button>
          )}

          {showAddFriend && !isAlreadyFriend && (
            <button
              type="button"
              onClick={onSendFriendRequest}
              disabled={isFriendRequestSent}
              className={clsx(
                "relative md:w-[60px] md:h-[60px] w-10.5 h-[2.6rem] rounded-full items-center justify-center transition-all active:scale-95 backdrop-blur-md outline outline-2 outline-white/40",
                hideAddFriendOnMobile ? "hidden md:flex" : "flex",
                isFriendRequestSent
                  ? "bg-green-500/40"
                  : "bg-slate-900/20 hover:bg-[#B7ACA1]/70"
              )}
            >
              {isFriendRequestSent ? (
                <svg
                  className="md:w-7 md:h-7 w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <img
                  src="/addfriend.svg"
                  alt="Add Friend"
                  className="md:w-[34px] md:h-[34px] w-5 h-5 object-contain"
                />
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

      <div className={clsx(
        "absolute hidden md:block md:top-4 top-2 md:left-4 left-2 md:right-4 right-2 border md:border-white/30 border-white/50 md:rounded-[60px] rounded-3xl pointer-events-none z-20",
        borderBottomClass
      )} />

      <GiftAnimation
        gift={gift}
        onComplete={onGiftAnimationComplete}
        persistUntilDismissed={true}
        forceDismiss={forceDismiss}
      />
    </div>
  );
}
