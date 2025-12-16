'use client';

import { useState } from 'react';
import Image from 'next/image';
import SignUpModal from '@/components/auth/SignUpModal';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import Button from '@/components/ui/Button';
import { IoPersonCircleOutline, IoTimeOutline } from 'react-icons/io5';

export default function Home() {
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    return (
        <div className="relative h-screen overflow-hidden bg-basecolor">
            {/* Header */}
            <header className="md:absolute static top-0 left-0 right-0 z-20 flex justify-between items-center px-6 md:px-12 py-4 md:py-6">
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
                            className="mx-auto w-[120px] md:w-auto mb-6"
                        />
                        <p className="text-xl leading-[1.5] md:text-[22px] text-white leading-relaxed font-medium opacity-95 font-[family-name:var(--font-otomanopee)]">
                            Meet someone here,
                            <br />
                            Not sure who, but someone
                        </p>
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
                    <div className="absolute top-4 bg-black/40 rounded-full px-12 py-1 md:top-6 left-1/2 -translate-x-1/2 flex gap-5 z-[3]">
                        <button className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition">
                            <img src="/assets/chat-with-indicator.svg" alt="" className="w-8 h-8" />
                        </button>
                        <button className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition">
                            <IoTimeOutline className="text-2xl w-8 h-8" />
                        </button>
                    </div>

                    {/* Pattern */}

                    {/* Action Card */}
                    <div className="relative z-[2] w-full max-w-[500px] flex flex-col gap-8 md:mt-130 mt-16 h-full justify-between pb-60">
                        {/* Stats */}
                        <div className=" text-center mt-auto flex items-center justify-between w-full ml-auto">
                            <div className=" ml-40 flex items-center gap-2 text-white/90 text-xs font-[family-name:var(--font-otomanopee)]">
                                <img src="/assets/video-on.svg" alt="" className="w-6 h-6" />
                                <span>140,567 meeting now</span>
                            </div>
                            <img src="/assets/Frame.png" alt="" className='w-9 h-9' />
                        </div>

                        {/* CTA */}
                        <Button
                            fullWidth
                            className="w-full border-1 border-white py-6 px-32 font-[family-name:var(--font-otomanopee)] bg-black/30 text-white border-white/80 rounded-[1.3rem] border-b-4"
                            onClick={() => setIsSignUpOpen(true)}
                        >
                            <img src="/assets/video-on.svg" alt="" className="w-8 h-8 opacity-70 " />
                            Meet that someone
                        </Button>

                        {/* Filters */}
                        <div className="font-[family-name:var(--font-otomanopee)] flex flex-row items-center justify-center gap-0 w-[80%] mx-auto border border-white/30 rounded-[20px] overflow-hidden mt-auto bg-black/30">
                            <button
                                onClick={() => setIsGenderModalOpen(true)}
                                className="flex-1 flex items-center justify-center w-full gap-2 px-6 py-4 bg-transparent text-white/80 font-medium hover:bg-white/10 transition"
                            >
                                <img src="/assets/gender-intersex.svg" alt="" className='w-6 h-6 opacity-60' />
                                Both
                            </button>

                            <div className="w-px h-12 bg-white/30"></div>

                            <button
                                onClick={() => setIsLocationModalOpen(true)}
                                className="flex-1 flex items-center justify-center w-full gap-2 px-6 py-4 bg-transparent text-white/80 font-medium hover:bg-white/10 transition"
                            >
                                Location
                                <img src="/assets/location-pin.svg" alt="" className='w-6 h-6 ' />
                            </button>
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
