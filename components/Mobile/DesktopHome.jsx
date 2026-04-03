'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import SignUpModal from '@/components/auth/SignUpModal';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import Button from '@/components/ui/Button';
import { API, apiRequest } from '@/lib/api';
import Link from 'next/link';

export default function DesktopHome() {
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [activeMeetingCount, setActiveMeetingCount] = useState(0);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await apiRequest(API.USERS.GET_ACTIVE_MEETINGS).catch(() => null);
                if (res && typeof res.count === 'number') {
                    setActiveMeetingCount(res.count);
                }
            } catch (e) {
                // silent failure
            }
        };
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative h-screen font-[family-name:var(--font-otomanopee)]">
            {/* Header */}


            {/* Main Layout */}
            <main className="grid grid-cols-1 md:grid-cols-2 h-screen">
                {/* LEFT SIDE */}
                <div className="relative flex items-center justify-center px-6  py-16 md:py-20 lg:py-0 overflow-hidden bg-gradient-purple-dark  ">
                    {/* Background Image with Opacity */}


                    <div
                        className="absolute inset-0 z-0 "
                        style={{
                            backgroundImage: 'url(/assets/mb.jpg)',
                            backgroundRepeat: 'repeat',
                            backgroundSize: 'cover',
                        }}
                    />
                    <div className='border-2 z-10 border-white/40 w-full h-[96vh] justify-center items-center flex  rounded-2xl'>
                        <div className="z-10 text-center max-w-lg  p-2">
                            <img src="/LOGO.png" className="md:w-64 mx-auto w-44 sm:w-5" />
                            <p className="text-white text-2xl">Meet someone here,</p>
                            <div className="inline-flex gap-2 mt-3 font-[family-name:var(--font-otomanopee)]">
                                <img src="/assets/video-on.svg" alt="" className="w-4 h-4" />
                                <p className='text-xs'>
                                    {activeMeetingCount !== null ? activeMeetingCount.toLocaleString() : '0'} meeting now
                                </p>
                            </div>
                        </div>
                    </div>
                </div>


                {/* RIGHT SIDE */}
                <div className="relative flex items-center justify-center px-6  py-16 md:py-20 overflow-hidden ">
                    {/* Background */}
                    <div
                        className="absolute inset-0 z-[1] opacity-70 mix-blend-hard-light md:animate-zoom-slow"
                        style={{
                            backgroundImage: 'url(/bg.jpg)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'repeat',
                        }}
                    />

                    {/* Top Icons */}

                    <div className='border-2 z-10 border-white/40 w-full h-[96vh] justify-center items-center flex  rounded-2xl'>
                        {/* Pattern */}


                        {/* Action Card */}
                <div className="relative z-[2] w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col h-full px-8">

  {/* CENTER CTA */}
<div className="flex-1 flex items-center justify-center mt-40">
  <Button
    className="w-full max-w-lg py-7 bg-black/30 text-white border-white/80 rounded-[1.3rem] border-b-4 flex items-center justify-center gap-3"
    onClick={() => setIsSignUpOpen(true)}
  >
    <img src="/assets/video-on.svg" className="w-8 h-8 opacity-70" />
    Meet that someone
  </Button>
</div>

  {/* BOTTOM SECTION */}
  <div className="mb-10 flex justify-between items-center">
    <Link href="/beam-tv">
      <button className="h-14 w-14 rounded-full p-3 border border-white shadow-md hover:border-white hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 active:border-b-2">
        <img src="/assets/Frame.png" />
      </button>
    </Link>

    <button
      className="rounded-full border-2 border-b-4 border-white/80 py-3 px-10  hover:border-white hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 active:border-b-2" 
      onClick={() => setIsSignUpOpen(true)}
    >
      Sign Up
    </button>
  </div>

</div>

                    </div>

                </div>

            </main>

            {/* Modals */}
            <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
            <GenderModal isOpen={isGenderModalOpen} onClose={() => setIsGenderModalOpen(false)} />
            <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        </div>
    );
}