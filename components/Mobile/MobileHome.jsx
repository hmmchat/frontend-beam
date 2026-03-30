'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import SignUpModal from '@/components/auth/SignUpModal';
import Button from '@/components/ui/Button';
import { API, apiRequest } from '@/lib/api';
import Link from 'next/link';

export default function Home() {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [activeMeetingCount, setActiveMeetingCount] = useState(0);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiRequest(API.USERS.GET_ACTIVE_MEETINGS).catch(() => null);
        if (res && typeof res.count === 'number') {
          setActiveMeetingCount(res.count);
        }
      } catch (e) {}
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
<div className="relative h-[100dvh] w-full overflow-hidden flex flex-col">

  {/* 🔥 FULL SCREEN BACKGROUND */}
  <div
    className="absolute inset-0 z-0 opacity-70 mix-blend-hard-light"
    style={{
      backgroundImage: 'url(/bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}
  />

  {/* 🔥 OPTIONAL DARK OVERLAY */}
  <div className="absolute inset-0 z-[1]" />

  {/* 🔥 CONTENT WRAPPER */}
  <div className="relative z-10 flex flex-col h-full">

    {/* 🔥 MAIN BOX (ROUNDED BORDER) */}
    <div className="border  border-white/40 w-[95vw] mt-2 mx-auto flex-1 rounded-4xl overflow-hidden flex items-center justify-center">

      <div className="flex w-full flex-col items-center justify-center h-full text-center px-4">

        <div className="flex flex-col items-center justify-center mb-40">
          <img src="/Logo.png" className="w-28 mb-3" />

          <p className="text-white text-lg font-medium">
            Meet someone here,
          </p>

          <div className="flex items-center gap-2 mt-4 text-white text-sm">
            <img src="/assets/video-on.svg" className="w-4 h-4" />
            {activeMeetingCount} meeting now
          </div>
        </div>

        <div className="w-full px-4">
          <Button
            fullWidth
            className="w-full py-5 bg-white/10 border border-white/70 border-b-6 text-white rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            onClick={() => setIsSignUpOpen(true)}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white">
                <img src="/assets/video-on.svg" className="w-5 h-5" />
              </div>
              Meet that someone
            </div>
          </Button>
        </div>

      </div>
    </div>

    {/* 🔥 BOTTOM BAR (NOW HAS BG BEHIND IT) */}
    <div className="w-full flex items-center justify-between px-4 py-4">



<Link href="/beam-tv">
  <button className="h-14 w-14 rounded-full p-3 border-2 border-white/60 border-b-4  transition-all duration-200">
    <img src="/assets/Frame.png" alt="beam-tv" />
  </button>
</Link>

      <button
        className="border-2 border-white/60 border-b-4 text-white px-6 py-2 rounded-full"
        onClick={() => setIsSignUpOpen(true)}
      >
        Sign Up
      </button>
    </div>

  </div>

  {/* MODAL */}
  <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />

</div>
  );
}