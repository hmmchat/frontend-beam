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
  allParticipants = [],
  isFirst = false,
  tileIndex = 0,
  totalTiles = 1,
  isGiftModalOpen = false,
  isRightTile = false,
  userId,
  borderBottomClass,
  onAvatarClick
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

      {screenShareStream ? (
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
            "h-full w-full min-h-0 object-cover relative z-10 transition-all duration-500",
            (isGiftModalOpen && isRightTile)
              ? "md:h-[85vh] rounded-b-[1.5rem] md:rounded-b-[4rem]"
              : "h-full",
            roundedClasses
          )}
        />
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
          borderBottomClass
            ? ["border-white/30", borderBottomClass]
            : (isRightTile
              ? (isGiftModalOpen
                ? "border-white/50 md:bottom-28 bottom-18"
                : "border-white/30 md:bottom-24 bottom-18")
              : "border-white/30 md:bottom-4 bottom-2")
        )}
      />

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
