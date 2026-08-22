'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getPreviewVideoConstraints } from '@/lib/webrtc-media-utils';
import {
  acquireUserMedia,
  isDeniedMediaError,
  isMediaDeniedThisSession,
  queryMediaPermission,
  shouldDeferOptionalCameraPrompt,
} from '@/lib/media-permissions';

const LocalVideo = ({
  showSoloCheckbox,
  onSoloChange,
  isVideoOn = true,
  /** Only start the camera when this media query matches (avoids a hidden second prompt). */
  captureMedia = '(min-width: 0px)',
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [inViewport, setInViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      setInViewport(true);
      return undefined;
    }
    const mq = window.matchMedia(captureMedia);
    const sync = () => setInViewport(Boolean(mq.matches));
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, [captureMedia]);

  useEffect(() => {
    const videoEl = videoRef.current;
    let cancelled = false;

    const stopStream = () => {
      if (videoEl) videoEl.srcObject = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    async function startCamera({ fromGesture = false } = {}) {
      if (!isVideoOn || !inViewport) {
        stopStream();
        setNeedsGesture(false);
        return;
      }

      if (!fromGesture) {
        if (isMediaDeniedThisSession('camera') || (await queryMediaPermission('camera')) === 'denied') {
          if (cancelled) return;
          setNeedsGesture(false);
          setError('Camera access denied. Please enable camera permissions.');
          return;
        }
        if (await shouldDeferOptionalCameraPrompt()) {
          if (cancelled) return;
          setNeedsGesture(true);
          setError(null);
          return;
        }
      }

      try {
        const mediaStream = await acquireUserMedia({
          video: getPreviewVideoConstraints(),
          audio: false,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (videoEl) videoEl.srcObject = mediaStream;
        setNeedsGesture(false);
        setError(null);
      } catch (err) {
        console.error('Error accessing camera:', err);
        if (cancelled) return;
        setNeedsGesture(!isDeniedMediaError(err));
        setError('Camera access denied. Please enable camera permissions.');
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isVideoOn, inViewport]);

  const enableFromTap = async () => {
    setNeedsGesture(false);
    setError(null);
    const videoEl = videoRef.current;
    try {
      const mediaStream = await acquireUserMedia({
        video: getPreviewVideoConstraints(),
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = mediaStream;
      if (videoEl) videoEl.srcObject = mediaStream;
    } catch (err) {
      console.error('Error accessing camera:', err);
      setNeedsGesture(!isDeniedMediaError(err));
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-gray-900 overflow-hidden">
      {error && !needsGesture ? (
        <div className="text-white text-center p-4">
          <p className="text-4xl mb-4">📷🚫</p>
          <p className="text-sm opacity-70">{error}</p>
        </div>
      ) : (
        <div className="w-full h-full overflow-hidden bg-purple-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
          {needsGesture && (
            <button
              type="button"
              onClick={enableFromTap}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0A032D]/70 backdrop-blur-sm text-white"
            >
              <span className="font-outfit text-sm md:text-base font-semibold">Tap to turn on camera</span>
              <span className="font-outfit text-white/70 text-xs mt-2 px-6 text-center">
                We only ask once, when you need it here.
              </span>
            </button>
          )}
        </div>
      )}

      {showSoloCheckbox && (
        <div className="absolute bottom-12 right-12 z-20">
          <label className="flex items-center gap-2 text-white/90 text-sm 0  meeting now hover:text-white transition-all group">
            <div className="relative w-5 h-5 flex items-center justify-center">
              <input
                type="checkbox"
                className="peer shrink-0 appearance-none w-5 h-5 border-2 border-white/30 rounded bg-black/20 checked:bg-white checked:border-white transition-all 0  meeting now"
                onChange={(e) => onSoloChange?.(e.target.checked)}
              />
              <svg
                className="absolute w-3 h-3 pointer-events-none hidden peer-checked:block text-purple-900 stroke-[4]"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="font-medium">Only Solo matches</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default LocalVideo;
