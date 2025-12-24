'use client';

import { useState } from 'react';
import Image from 'next/image';
import SignUpModal from '@/components/auth/SignUpModal';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import { IoMenu, IoHome, IoTimeOutline, IoChatbubbleEllipsesOutline, IoPersonOutline, IoLogoSnapchat, IoLogoInstagram, IoLogoWhatsapp, IoCopyOutline } from 'react-icons/io5';

export default function MeetSomeoneMobile() {
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    const [coins] = useState(25500);
    const [mode, setMode] = useState('solo'); // solo | squad
    const [invited, setInvited] = useState(['Austin']);

    const toggleInvite = (name) =>
        setInvited((prev) =>
            prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
        );

    return (
        <div className="relative min-h-screen w-full overflow-hidden font-sans text-white flex flex-col font-[family-name:var(--font-otomanopee)]">


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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex  rounded-full p-1 border border-white">
                <button
                    onClick={() => setMode('solo')}
                    className={`px-8 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'solo'
                        ? 'bg-[#1a003d] text-white shadow-sm border border-white'
                        : 'text-white hover:text-white'
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

            {/* --- Content Area --- */}
            <div className="flex-1 flex flex-col relative z-10">

                {mode === 'solo' ? (
                    /* ===== SOLO VIEW ===== */
                    <div className="flex-1 flex flex-col">
                        {/* --- Main Content (Solo) --- */}
                        <div className="flex-1 flex flex-col items-center justify-start text-center px-6 relative pointer-events-none -mt-5">
                            <div className="">
                                <img src="/assets/Logo.svg" alt="" className='w-44 h-44' />
                            </div>
                            <div className='-mt-14 '>

                                <p className="text-lg font-medium leading-none font-[family-name:var(--font-otomanopee)]">
                                    Meet someone here,
                                </p>
                                <p className="text-lg font-medium leading-none font-[family-name:var(--font-otomanopee)]">
                                    Not sure who, but someone
                                </p>

                                <p className="text-white/80 text-sm font-light mt-4">
                                    140,567 meeting now
                                </p>
                            </div>

                            {/* Free Coins Icon */}
                            <div className="absolute right-4 bottom-26 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
                                <button className="relative">
                                    <img src="/assets/watch add free coins.svg" alt="Free Coins" className="w-12 h-12" />
                                </button>

                            </div>
                        </div>

                        {/* --- Bottom Controls (Solo) --- */}
                        <div className="relative z-10 w-full px-6 pb-24 flex flex-col gap-6">
                            <button
                                onClick={() => setIsSignUpOpen(true)}
                                className="w-full bg-[#150030] border border-white/30 rounded-2xl py-5 flex items-center justify-center gap-3 active:scale-95 transition-transform"
                            >
                                <img src="/assets/video-off.svg" className="w-6 h-6 invert opacity-80" alt="Camera" />
                                <span className="text-lg font-bold tracking-wide">Meet that someone</span>
                            </button>

                            <div className="w-full bg-[#150030]/80 border border-white/10 rounded-2xl flex items-center h-16 relative overflow-hidden">
                                <button
                                    onClick={() => setIsGenderModalOpen(true)}
                                    className="flex-1 h-full flex items-center justify-center gap-2 hover:bg-white/5 transition px-2"
                                >
                                    <span className="text-xl">⚥</span>
                                    <div className="text-left flex flex-col justify-center">
                                        <span className="text-xs font-bold leading-tight">Girls only</span>
                                        <span className="text-[10px] text-white/50 leading-tight">18/20 Remaining</span>
                                    </div>
                                </button>

                                <div className="w-[1px] h-3/4 bg-white/10"></div>

                                <button
                                    onClick={() => setIsLocationModalOpen(true)}
                                    className="flex-1 h-full flex items-center justify-center gap-2 hover:bg-white/5 transition px-2 text-right"
                                >
                                    <div className="text-right flex flex-col justify-center">
                                        <span className="text-xs font-bold leading-tight">Location</span>
                                        <span className="text-[10px] text-white/50 leading-tight">Bhuwaneshwar</span>
                                    </div>
                                    <span className="text-xl">📍</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ===== SQUAD VIEW ===== */
                    <div className="relative w-full max-w-3xl text-center mt-auto mb-30 px-6">
                        {/* Members */}
                        <div className='flex justify-between items-center mb-6'>
                            <img src="/assets/search-icon.svg" alt="" className="w-6 h-6" />
                            <img src="/assets/Vector.svg" alt="" className="w-6 h-6" />
                        </div>
                        <div className="flex items-center justify-center gap-4 mb-10 font-sans">
                            {['Me', 'Who', 'Who'].map((label, i, arr) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="relative w-20 h-20 rounded-full border border-white/30 flex items-center justify-center overflow-hidden bg-white/5">
                                            {label === 'Me' ? (
                                                <Image src="/assets/ico.png" alt="me" fill className="object-cover" />
                                            ) : (
                                                <span className="text-2xl text-white/50">?</span>
                                            )}
                                        </div>
                                        <span className="text-xs">{label}</span>
                                    </div>

                                    {/* Show plus icon if not the last item */}
                                    {i < arr.length - 1 && (
                                        <div className="mb-6">
                                            <img src="/assets/plus.png" alt="+" className="w-4 h-4 opacity-70" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Share */}
                        <div className="inline-flex items-center gap-4 bg-black/20 rounded-full px-6 py-3 mb-8 font-sans">
                            <span className="text-white/80 text-sm font-medium mr-2">Share to</span>
                            <button className="hover:bg-white/10 p-2 rounded-full transition text-white">
                                <IoLogoSnapchat className="text-2xl" />
                            </button>
                            <button className="hover:bg-white/10 p-2 rounded-full transition text-white">
                                <IoLogoInstagram className="text-2xl" />
                            </button>
                            <button className="hover:bg-white/10 p-2 rounded-full transition text-white">
                                <IoLogoWhatsapp className="text-2xl" />
                            </button>
                            <button className="hover:bg-white/10 p-2 rounded-full transition text-white">
                                <IoCopyOutline className="text-2xl" />
                            </button>
                        </div>

                        {/* Invite */}
                        <div className="flex justify-center gap-4">
                            <span className="text-white/80 text-sm font-medium mr-2 border-r-2 border-white/60 pr-2 flex items-center gap-2">Invite</span>
                            <div className="flex justify-center gap-6">
                                {[
                                    { name: 'Austin', img: '/assets/ico.png' },
                                    { name: 'Rose', img: '/assets/img1.png' },
                                    { name: 'Peter', img: '/assets/ico.png' }
                                ].map((person) => (
                                    <div key={person.name} className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={() => toggleInvite(person.name)}
                                            className={`relative w-12 h-12 rounded-full border-2 ${invited.includes(person.name)
                                                ? 'border-yellow-400'
                                                : 'border-white/20'
                                                }`}
                                        >
                                            <Image src={person.img} alt={person.name} fill className='object-cover rounded-full' />
                                            {invited.includes(person.name) ? (
                                                <span className="absolute -top-2 -right-2 bg-yellow-400 text-black w-5 h-5 text-xs rounded-full flex items-center justify-center font-bold">
                                                    ✓
                                                </span>
                                            ) : (
                                                <span className="absolute -top-0 -right-0 bg-white text-black w-3 h-3 text-xs rounded-full flex items-center justify-center font-bold shadow-sm">
                                                    +
                                                </span>
                                            )}    </button>
                                        <span className="text-white/70 text-xs font-sans">{person.name}</span>
                                    </div>
                                ))}
                                <button className="text-sm underline text-white/70 ml-2 self-center font-sans">
                                    See all
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Bottom Navigation Bar --- */}
            <div className="absolute bottom-0 left-0 w-full bg-[#1a003d] border-t border-white/5 px-6 py-4 flex justify-between items-center z-10">
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
