'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import ParticipantCluster from './ParticipantCluster';
import { GiftAnimationGroup } from '@/components/VideoChat/GiftAnimation';
import SyncedMarqueeText from '@/components/VideoChat/SyncedMarqueeText';
import SummoningOverlay from '@/components/VideoChat/SummoningOverlay';

function UnavailableWaitingOverlay({ roundedClasses }) {
  return (
    <div
      className={clsx(
        'absolute inset-0 z-20 flex items-center justify-center overflow-hidden pointer-events-none',
        roundedClasses
      )}
    >
      <div className="relative z-10 flex items-center gap-2 rounded-full bg-[#0A032D]/80 px-4 py-1.5 md:px-5 md:py-2 outline outline-[1.5px] outline-white/40">
        <span className="font-otomanopee text-white text-xs md:text-sm tracking-wide whitespace-nowrap">
          Holding their Beam
        </span>
        <span className="flex items-center gap-[3px] pt-0.5" aria-hidden>
          <span className="w-1 h-1 rounded-full bg-[#B388FF] animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1 h-1 rounded-full bg-[#B388FF] animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1 h-1 rounded-full bg-[#B388FF] animate-bounce" />
        </span>
      </div>
    </div>
  );
}

/** Shared RemoteVideoTile for rendering each broadcast participant */
export default function RemoteVideoTile({
  stream,
  screenShareStream,
  name,
  age,
  city,
  displayPictureUrl,
  forceMuted,
  allParticipants = [],
  isFirst = false,
  tileIndex = 0,
  totalTiles = 1,
  isGiftModalOpen = false,
  isRightTile = false,
  userId,
  borderBottomClass,
  onAvatarClick,
  gifts = [],
  onGiftAnimationComplete,
  activeGiftLabel,
  activeDareLabel,
  activeRemoteDareText,
  activeRemoteDareMarqueeStartAt,
  isVideoOn = true,
  isUnavailable = false,
  isSummoning = false,
}) {
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const pipRef = useRef(null);

  const hasDare = Boolean(activeRemoteDareText || activeDareLabel);
  const showAway = isVideoOn && !isSummoning && isUnavailable;

  useEffect(() => {
    if (isSummoning || screenShareStream) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    const p = v.play?.();
    if (p && typeof p.catch === 'function') p.catch(() => { });
  }, [stream, screenShareStream, isSummoning]);

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

  const roundedClasses = (() => {
    if (totalTiles === 2) {
      return tileIndex === 0
        ? ['rounded-t-[1.5rem]', 'rounded-b-none', 'md:rounded-[4rem]']
        : ['rounded-b-[1.5rem]', 'rounded-t-none', 'md:rounded-[4rem]'];
    }
    if (totalTiles === 3) {
      if (tileIndex === 0) {
        return ['rounded-t-[1.5rem]', 'rounded-b-none', 'md:rounded-[4rem]'];
      }
      if (tileIndex === 1) {
        return ['rounded-bl-[1.5rem]', 'rounded-tl-none', 'rounded-tr-none', 'rounded-br-none', 'md:rounded-[4rem]'];
      }
      if (tileIndex === 2) {
        return ['rounded-br-[1.5rem]', 'rounded-tl-none', 'rounded-tr-none', 'rounded-bl-none', 'md:rounded-[4rem]'];
      }
    }
    if (totalTiles >= 4) {
      if (tileIndex === 0) {
        return ['rounded-tl-[1.5rem]', 'rounded-tr-none', 'rounded-bl-none', 'rounded-br-none', 'md:rounded-[4rem]'];
      }
      if (tileIndex === 1) {
        return ['rounded-tr-[1.5rem]', 'rounded-tl-none', 'rounded-bl-none', 'rounded-br-none', 'md:rounded-[4rem]'];
      }
      if (tileIndex === 2) {
        return ['rounded-bl-[1.5rem]', 'rounded-tl-none', 'rounded-tr-none', 'rounded-br-none', 'md:rounded-[4rem]'];
      }
      if (tileIndex === 3) {
        return ['rounded-br-[1.5rem]', 'rounded-tl-none', 'rounded-tr-none', 'rounded-bl-none', 'md:rounded-[4rem]'];
      }
    }
    return ['rounded-[1.5rem]', 'md:rounded-[4rem]'];
  })();

  const isBottomTile = totalTiles > 1 && (
    (totalTiles === 2 && tileIndex === 1) ||
    (totalTiles === 3 && (tileIndex === 1 || tileIndex === 2)) ||
    (totalTiles >= 4 && (tileIndex === 2 || tileIndex === 3))
  );

  const getNameBottomClass = () => {
    if (borderBottomClass) {
      if (borderBottomClass.includes("md:bottom-24")) return "md:bottom-32";
      if (borderBottomClass.includes("md:bottom-4")) return "md:bottom-10";
    }
    if (isRightTile) {
      return isGiftModalOpen ? "md:bottom-36" : "md:bottom-32";
    }
    return "md:bottom-10";
  };

  const getPhoneNameBottomClass = () => {
    if (borderBottomClass) {
      if (borderBottomClass.includes("bottom-18")) return "bottom-24";
      if (borderBottomClass.includes("bottom-2")) return "bottom-8";
    }
    if (isRightTile) {
      return "bottom-24";
    }
    return "bottom-8";
  };

  return (
    <div
      className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', roundedClasses, 'overflow-hidden', 'bg-gray-900', 'border', 'border-white/5', 'shadow-2xl', 'isolate')}
      style={{ transform: 'translateZ(0)' }}
    >
      {/* Background backdrop image shown when video is shrunk/active tray */}
      <div
        className={clsx("absolute inset-0 z-0 transition-opacity duration-500", roundedClasses)}
        style={{
          backgroundImage: "url(/assets/mb.jpg)",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
        }}
      />

      {isSummoning ? (
        <div className={clsx('absolute inset-0 z-10 bg-[#0A032D]', roundedClasses)}>
          <SummoningOverlay cooldownActive={false} variant={totalTiles >= 4 ? 'layout4' : 'layout3'} />
        </div>
      ) : screenShareStream ? (
        <>
          <video
            ref={screenRef}
            autoPlay
            playsInline
            muted
            className={clsx(
              "absolute inset-0 z-0 h-full w-full bg-black object-contain transition-all duration-500",
              (isGiftModalOpen && isRightTile) ? "md:h-[87vh] h-[45vh]" : "h-full",
              roundedClasses
            )}
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
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={forceMuted}
          className={clsx(
            "h-full w-full min-h-0 object-cover relative z-0 transition-all duration-500",
            (isGiftModalOpen && isRightTile)
              ? "md:h-[85vh] rounded-b-[1.5rem] md:rounded-b-[4rem]"
              : "h-full",
            roundedClasses
          )}
        />
      )}

      {!isSummoning && !isVideoOn && !showAway && (
        <div className={clsx('absolute inset-0 z-[12] w-full h-full bg-gray-950 flex flex-col items-center justify-center', roundedClasses)}>
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-[3px] border-white/30 shadow-2xl bg-[#0d0726]">
            <img
              src={displayPictureUrl || "/assets/ico.png"}
              className="w-full h-full object-cover"
              alt=""
            />
          </div>
          <span className="text-white/70 text-xs md:text-sm mt-4 tracking-wider font-semibold font-outfit bg-black/70 px-4 py-1.5 rounded-full border border-white/10">
            Camera is off
          </span>
        </div>
      )}

      {showAway && <UnavailableWaitingOverlay roundedClasses={roundedClasses} />}

      {hasDare && (
        <div
          className="absolute top-0 left-1/2 z-[60] w-[80%] max-w-[80%] px-4 md:px-6 py-1.5 md:py-2.5 bg-[#8A1515] rounded-b-[16px] md:rounded-b-[20px] text-white text-[10px] md:text-xs font-medium shadow-md flex items-center gap-1 overflow-hidden box-border"
          style={{ transform: 'translate3d(-50%, 0, 2px)' }}
        >
          <span className="opacity-90 shrink-0">{name || 'Someone'}&apos;s Dare: </span>
          {activeRemoteDareText && (
            <SyncedMarqueeText
              text={activeRemoteDareText}
              marqueeStartAt={activeRemoteDareMarqueeStartAt}
              className="flex-1 min-w-0"
              textClassName="font-bold"
            />
          )}
        </div>
      )}
      {!hasDare && activeGiftLabel && (
        <div
          className="absolute top-0 left-1/2 z-[60] px-5 py-1.5 md:py-2.5 bg-[#4E0093] rounded-b-[16px] md:rounded-b-[20px] text-white text-[10px] md:text-xs font-medium shadow-md whitespace-nowrap font-outfit"
          style={{ transform: 'translate3d(-50%, 0, 2px)' }}
        >
          <span>{activeGiftLabel}</span>
        </div>
      )}

      {isFirst && (
        <div className="absolute top-3 md:top-8 left-3 md:left-6 right-6 md:right-16 flex items-start justify-between z-10">
          <div className="flex items-center">
            <div
              className="flex items-center px-1 md:px-3 py-1 md:py-2 rounded-[2.5rem] min-w-0 md:max-w-[320px] pointer-events-auto cursor-pointer active:scale-95 transition-transform"
              onClick={() => {
                if (onAvatarClick) {
                  onAvatarClick();
                }
              }}
            >
              <ParticipantCluster participants={allParticipants.length > 0 ? allParticipants : [{ userId: 'self', displayPictureUrl }]} />
            </div>
          </div>

          <div className="text-[12px] md:text-lg mt-3 text-xs font-black leading-none">
            beam
            <span
              className="block text-right uppercase text-white
             font-['Permanent_Marker']
             -rotate-10
             font-normal"
              style={{ fontFeatureSettings: "'liga' off, 'clig' off" }}
            >
              tv
            </span>
          </div>
        </div>
      )}

      {/* 🔲 HUD BORDER FRAME */}
      <div
        className={clsx(
          "absolute md:top-4 top-2 md:left-4 left-2 md:right-4 right-2 border rounded-3xl md:rounded-[60px] pointer-events-none z-20 transition-colors",
          "border-white/50 md:border-white/30",
          borderBottomClass
            ? borderBottomClass
            : (isRightTile
              ? (isGiftModalOpen
                ? "md:bottom-28 bottom-18"
                : "md:bottom-24 bottom-18")
              : "md:bottom-4 bottom-2")
        )}
      />

      {!isSummoning && (
        <div
          className="absolute top-2 left-2 right-2 bottom-2 md:top-4 md:left-4 md:right-4 md:bottom-8 overflow-hidden rounded-3xl md:rounded-[60px] pointer-events-none z-[998]"
          style={{ transform: 'translateZ(3px)' }}
        >
          <GiftAnimationGroup
            gifts={(Array.isArray(gifts) ? gifts : []).map((giftItem) => {
              const inner = giftItem.gift || giftItem;
              return giftItem.gift ? { ...inner, isDismissed: giftItem.isDismissed ?? inner.isDismissed } : inner;
            })}
            onComplete={onGiftAnimationComplete}
            persistUntilDismissed={true}
            interactive={false}
          />
        </div>
      )}

      {name && (
        <span
          className={clsx(
            "absolute z-30 text-white md:bottom-12 font-semibold text-sm md:text-lg select-none pointer-events-none font-outfit text-white/60",
            isBottomTile
              ? ["top-6 md:top-10 right-6 md:right-12", getNameBottomClass(), "md:right-8 md:top-auto"]
              : [getPhoneNameBottomClass(), "right-6", getNameBottomClass(), "md:right-12"]
          )}
        >
          {name}
        </span>
      )}
    </div>
  );
}
