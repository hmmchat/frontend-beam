'use client';

import { useState } from 'react';
import Image from 'next/image';
import SignUpModal from '@/components/auth/SignUpModal';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import { IoMenu, IoHome, IoTimeOutline, IoChatbubbleEllipsesOutline, IoPersonOutline } from 'react-icons/io5';

export default function MeetSomeoneMobile() {
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    const [coins] = useState(25500);
    const [mode, setMode] = useState('solo'); // solo | squad

    return (
        <div className="relative min-h-screen w-full overflow-hidden font-sans text-white flex flex-col font-[family-name:var(--font-otomanopee)]">

            {/* --- Backgrounds --- */}
            {/* Layer 1: Stars Pattern (Top Half) */}
            <div
                className="absolute top-0 left-0 w-full h-1/2 z-0 opacity-50"
                style={{
                    backgroundImage: "url('/assets/mb.jpg')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: 'auto',
                    backgroundPosition: 'top left',
                }}
            />

            {/* Layer 2: Waves/Gradient Overlay (Bottom Half) */}
            <div
                className="absolute bottom-0 left-0 w-full h-1/2 z-0"
                style={{
                    backgroundImage: "url('/assets/image50.png')",
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'cover',
                    backgroundPosition: 'top center',
                }}
            />

            {/* --- Top Header --- */}
            <div className="relative z-10 flex justify-between items-center px-6 pt-12 pb-4">
                {/* Coins Pill */}
                <button
                    onClick={() => setIsSignUpOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm"
                >
                    <span className="font-bold text-sm tracking-wide">{coins}</span>
                    <span className="text-xl leading-none mb-1">+</span>
                </button>

                {/* Hamburger Menu */}
                <button className="p-2">
                    <IoMenu className="text-3xl" />
                </button>
            </div>

            {/* --- Toggle Squad/Solo (Centered on split line) --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex bg-[#2a0060] rounded-full p-1 border border-white/20">
                <button
                    onClick={() => setMode('solo')}
                    className={`px-8 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'solo'
                        ? 'bg-[#1a003d] text-white shadow-sm border border-white/10'
                        : 'text-white/60 hover:text-white'
                        }`}
                >
                    Solo
                </button>
                <button
                    onClick={() => setMode('squad')}
                    className={`px-8 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'squad'
                        ? 'bg-[#1a003d] text-white shadow-sm border border-white/10'
                        : 'text-white/60 hover:text-white'
                        }`}
                >
                    Squad
                </button>
            </div>

            {/* --- Main Content --- */}
            <div className="flex-1 flex flex-col items-center justify-start pt-10 text-center px-6 relative pointer-events-none">
                <div
                    className="relative flex items-center justify-center px-8 lg:px-24 bg-repeat"
                    style={{
                        backgroundImage: "url('/assets/mb.jpg')",
                        backgroundRepeat: 'repeat',
                        backgroundSize: 'auto',
                        backgroundPosition: 'top left',
                    }}
                ></div>

                {/* Logo */}
                <div className="relative mb-4">
                    {/* Using text fallback if image not perfect, but image is preferred if available. 
                         The screenshot has a specific 'HMM..' yellow text. 
                         I'll try to use the Logo.svg if it matches, otherwise styled text.
                     */}
                    <div className="text-5xl font-black tracking-widest text-yellow-400 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]" style={{ fontFamily: 'var(--font-otomanopee), sans-serif', textShadow: '4px 4px 0px #000' }}>
                        HMM..
                    </div>
                </div>

                {/* Tagline */}
                <p className="text-lg font-medium leading-relaxed mb-1 font-[family-name:var(--font-otomanopee)]">
                    Meet someone here,
                </p>
                <p className="text-lg font-medium leading-relaxed mb-6 font-[family-name:var(--font-otomanopee)]">
                    Not sure who, but someone
                </p>

                {/* Counter */}
                <p className="text-white/80 text-sm font-light mb-12">
                    140,567 meeting now
                </p>

                {/* --- Free Coins Icon (Floating Right) --- */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <button className="relative">
                        <img src="/assets/watch add free coins.svg" alt="Free Coins" className="w-12 h-12" />
                        {/* Fallback if file doesn't exist perfectly, but I found it in search */}
                    </button>
                    <span className="text-[10px] font-bold mt-1 bg-white text-[#3b0087] px-2 py-0.5 rounded-full">FREE</span>
                </div>

            </div>

            {/* --- Bottom Controls --- */}
            <div className="relative z-10 w-full px-6 pb-24 flex flex-col gap-6">

                {/* Meet Button */}
                <button
                    onClick={() => setIsSignUpOpen(true)}
                    className="w-full bg-[#150030] border border-white/30 rounded-2xl py-5 flex items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                    <img src="/assets/video-off.svg" className="w-6 h-6 invert opacity-80" alt="Camera" />
                    {/* Or usage of react icon: <span className="text-2xl"><IoVideocamOutline /></span> */}
                    <span className="text-lg font-bold tracking-wide">Meet that someone</span>
                </button>

                {/* Filter Bar */}
                <div className="w-full bg-[#150030]/80 border border-white/10 rounded-2xl flex items-center h-16 relative overflow-hidden">
                    {/* Left: Girls Only */}
                    <button
                        onClick={() => setIsGenderModalOpen(true)}
                        className="flex-1 h-full flex items-center justify-center gap-2 hover:bg-white/5 transition px-2"
                    >
                        <span className="text-xl">⚥</span> {/* Icon placeholder */}
                        <div className="text-left flex flex-col justify-center">
                            <span className="text-xs font-bold leading-tight">Girls only</span>
                            <span className="text-[10px] text-white/50 leading-tight">18/20 Remaining</span>
                        </div>
                    </button>

                    {/* Divider */}
                    <div className="w-[1px] h-3/4 bg-white/10"></div>

                    {/* Right: Location */}
                    <button
                        onClick={() => setIsLocationModalOpen(true)}
                        className="flex-1 h-full flex items-center justify-center gap-2 hover:bg-white/5 transition px-2 text-right"
                    >
                        <div className="text-right flex flex-col justify-center">
                            <span className="text-xs font-bold leading-tight">Location</span>
                            <span className="text-[10px] text-white/50 leading-tight">Bhuwaneshwar</span>
                        </div>
                        <span className="text-xl">📍</span> {/* Icon placeholder */}
                    </button>
                </div>

            </div>

            {/* --- Bottom Navigation Bar --- */}
            <div className="absolute bottom-0 left-0 w-full bg-[#1a003d] border-t border-white/5 px-6 py-4 flex justify-between items-center z-20">
                <button className="flex flex-col items-center gap-1 text-white hover:text-purple-300 transition">
                    <IoHome className="text-2xl" />
                </button>
                <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition">
                    <IoTimeOutline className="text-2xl" />
                </button>
                <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition relative">
                    <IoChatbubbleEllipsesOutline className="text-2xl" />
                    <span className="absolute top-0 right-[-2px] w-2 h-2 bg-yellow-400 rounded-full"></span>
                </button>
                <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition">
                    <div className="w-7 h-7 rounded-full border border-white/50 bg-white/10"></div>
                </button>
            </div>


            {/* Modals */}
            <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
            <GenderModal isOpen={isGenderModalOpen} onClose={() => setIsGenderModalOpen(false)} />
            <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        </div>
    );
}
