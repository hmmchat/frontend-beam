'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import SignUpModal from '@/components/auth/SignUpModal';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import Button from '@/components/ui/Button';
import { IoPersonCircleOutline, IoTimeOutline } from 'react-icons/io5';
import { API, apiRequest } from '@/lib/api';

export default function Home() {
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
        <div className="relative h-screen bg-basecolor">
            {/* Header */}
            <header className="md:absolute static top-0 left-0 right-0 z-20 flex justify-between items-center px-4 md:px-12 py-2 md:py-6">
                <Button
                    variant="outline"
                    width="hex"
                    onClick={() => setIsSignUpOpen(true)}
                    position="left"
                >
                    Sign Up
                </Button>

                <button className="hidden md:block w-16 h-16 rounded-full  flex items-center justify-center text-white hover:bg-white/15 hover:border-white/30 hover:scale-105 transition-all duration-300">
                    <img src="assets/profile-no-setup.svg" alt="" className='w-14 h-14' />
                </button>
            </header>

            {/* Main Layout */}
            <main className="grid grid-cols-1 md:grid-cols-2 h-screen">
                {/* LEFT SIDE */}
                <div className="relative flex items-center justify-center px-6 md:px-15 py-16 md:py-20 lg:py-0 overflow-hidden bg-gradient-purple-dark">
                    {/* Background Image with Opacity */}
                    <div
                        className="absolute inset-0 z-0 "
                        style={{
                            backgroundImage: 'url(/assets/mb.jpg)',
                            backgroundRepeat: 'repeat',
                            backgroundSize: 'cover',
                        }}
                    />

                    <div className="relative z-10 text-center flex flex-col items-center my-auto">
                        <img
                            src="/assets/Logo.svg"
                            alt="Logo"
                            className="mx-auto w-[120px] md:w-auto md:mb-6 mb-2"
                        />
                        <p className="text-sm md:mb-0 mb-2 md:leading-[1.5] leading-tight md:text-[22px] text-white leading-relaxed font-medium opacity-95 font-[family-name:var(--font-otomanopee)]">
                            Meet someone here,
                            <br />
                            Not sure who, but someone
                        </p>
                        <div className="inline-flex gap-2 font-[family-name:var(--font-otomanopee)]">
                            <img src="/assets/video-on.svg" alt="" className="w-4 h-4" />
                            <p className='text-xs'>
                                {activeMeetingCount !== null ? activeMeetingCount.toLocaleString() : '0'} meeting now
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="relative flex items-center justify-center px-6 md:px-15 py-16 md:py-20 overflow-hidden ">
                    {/* Background */}
                    <div
                        className="absolute inset-0 z-0 md:animate-zoom-slow"
                        style={{
                            backgroundImage: 'url(/assets/image50.png)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'repeat',
                            zIndex: 1,
                        }}
                    />
                    {/* Top Icons */}

                    {/* Pattern */}

                    {/* Action Card */}
                    <div className="relative z-[2] w-full max-w-[500px] flex flex-col gap-8 md:mt-130 mt-16 h-full justify-between pb-60">
                        {/* Stats */}


                        {/* CTA */}
                        <Button
                            fullWidth
                            className="w-full border-1 border-white md:py-6 md:px-32 py-8  font-[family-name:var(--font-otomanopee)] bg-black/30 text-white border-white/80 rounded-[1.3rem] border-b-4"
                            onClick={() => setIsSignUpOpen(true)}
                        >
                            <div className="w-8 h-8 md:opacity-70 opacity-100 bg-[#4E0093]/50  rounded-full border-1 border-white flex items-center justify-center">
                                <img src="/assets/video-on.svg" alt="" className="w-6 h-6" />
                            </div>
                            Meet that someone
                        </Button>
                        <div className='flex items-center justify-center gap-2 border-2 border-white/50 max-w-[250px]  w-full mx-auto rounded-[1.3rem] bg-black/30'>
                            <div className='flex gap-2 p-4  border-white'>
                                <img src="/assets/gender-intersex.svg" alt="" className='w-5 h-5 md:w-6 md:h-6 opacity-60 ' />
                                <span>Both</span>
                            </div>
                            <div className='flex gap-2 p-4 border-l border-white/40'>
                                <span>Location</span>
                                <img src="/assets/location-pin.svg" alt="" className='w-5 h-5 md:w-6 md:h-6 opacity-60' />
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