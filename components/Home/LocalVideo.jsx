'use client';

import React, { useEffect, useRef, useState } from 'react';

const LocalVideo = ({ showSoloCheckbox, onSoloChange, isVideoOn = true }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }, 
          audio: false 
        });
        streamRef.current = mediaStream;
        if (videoEl) {
          videoEl.srcObject = mediaStream;
        }
        const track = mediaStream.getVideoTracks()[0];
        if (track) track.enabled = isVideoOn;
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Camera access denied. Please enable camera permissions.");
      }
    }

    startCamera();

    return () => {
      if (videoEl) {
        videoEl.srcObject = null;
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, []); // removed isVideoOn from dependency array to avoid restarting camera

  useEffect(() => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) track.enabled = isVideoOn;
    }
  }, [isVideoOn]);

  return (
    <div className="absolute inset-0 w-full h-full bg-gray-900 overflow-hidden">
      {error ? (
        <div className="text-white text-center p-4">
          <p className="text-4xl mb-4">📷🚫</p>
          <p className="text-sm opacity-70">{error}</p>
        </div>
      ) : (

        <div className="w-full h-full rounded-3xl overflow-hidden bg-purple-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />
           </div>
      )}

      {/* Solo Toggle Overlay */}
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
      
      {/* Decorative Border for Video */}
  
    </div>
  );
};

export default LocalVideo;
