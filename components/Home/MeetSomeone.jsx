'use client';

import { useState } from 'react';
import Image from 'next/image';
import SignUpModal from '@/components/auth/SignUpModal';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import Button from '@/components/ui/Button';
import FilterButtons from '@/components/ui/FilterButtons';
import { IoTimeOutline, IoLogoSnapchat, IoLogoInstagram, IoLogoWhatsapp, IoCopyOutline } from 'react-icons/io5';

export default function MeetSomeone() {
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    const [coins] = useState(25500);
    const [mode, setMode] = useState('solo'); // solo | squad
    const [filter, setFilter] = useState('both');

    const [invited, setInvited] = useState(['Austin']);

    const toggleInvite = (name) =>
        setInvited((prev) =>
            prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
        );

    return (
        <div className="relative min-h-screen w-full overflow-hidden font-[family-name:var(--font-otomanopee)]">
            <main className="grid grid-cols-1 md:grid-cols-2 h-screen overflow-hidden">

                {/* LEFT SIDE — UNCHANGED */}
                <div
                    className="relative flex items-center justify-center px-8 lg:px-24 bg-repeat"
                    style={{
                        backgroundImage: "url('/assets/mb.jpg')",
                        backgroundRepeat: 'repeat',
                        backgroundSize: 'auto',
                        backgroundPosition: 'top left',
                    }}
                >
                    <div className="absolute top-8 left-8 z-10">
                        <Button variant="outline" width="hex" onClick={() => setIsSignUpOpen(true)}>
                            <img src="/assets/Coin-token.svg" className="w-6 h-6" />
                            <div className="text-sm font-semibold">{coins.toLocaleString()}</div>
                            <img src="/assets/plus.png" className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="z-10 text-center max-w-lg">
                        <img src="/assets/Logo.svg" className="md:w-64 mx-auto w-44" />
                        <p className="text-white text-2xl mt-4">Meet someone,</p>
                        <p className="text-white text-2xl">Only god knows who</p>
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="relative flex items-center justify-center px-6 md:px-16 overflow-hidden h-full">

                    {/* Background */}
                    <div
                        className="absolute inset-0 z-0"
                        style={{
                            backgroundImage: 'url(/assets/image50.png)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />

                    {/* Top Icons */}
                    <div className="absolute top-4 md:top-10 left-1/2 -translate-x-1/2 flex gap-5 z-[3] bg-black/40 rounded-full px-12 py-1">
                        <button className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-full">
                            <img src="/assets/chat-with-indicator.svg" className="w-8 h-8" />
                        </button>
                        <button className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-full">
                            <img src="/assets/history.svg" className="w-8 h-8" />
                        </button>
                    </div>

                    {/* SOLO / SQUAD TOGGLE — ONLY LOGIC ADDED */}
                    <div className="absolute top-30 z-[3] flex gap-2  border-white/40 border-1 rounded-full p-1">
                        <button
                            onClick={() => setMode('solo')}
                            className={`px-6 py-1 rounded-full transition ${mode === 'solo'
                                ? 'text-white bg-black/40  border-1'
                                : 'text-white hover:bg-white/20'
                                }`}
                        >
                            solo
                        </button>

                        <button
                            onClick={() => setMode('squad')}
                            className={`px-6 py-1 rounded-full transition ${mode === 'squad'
                                ? 'bg-black/40 border-1 text-white'
                                : 'text-white hover:bg-white/10'
                                }`}
                        >
                            squad
                        </button>
                    </div>

                    {/* Profile */}
                    <div className="absolute top-8 right-6 z-[20]">
                        <img src="/assets/ico.png" className="w-12 h-12 rounded-full" />
                    </div>

                    {/* ================= CONTENT SWITCH ================= */}
                    {mode === 'solo' ? (
                        /* ===== SOLO VIEW (100% UNCHANGED) ===== */
                        <div className="relative z-[2] w-full max-w-[520px] flex flex-col gap-8 h-full justify-end">

                            <div className="text-center mt-auto flex items-center justify-between w-full ml-auto outfit-font ">
                                <div className="ml-40 flex items-center gap-2 text-white/90 text-xs">
                                    <img src="/assets/video-on.svg" className="w-6 h-6" />
                                    <span className='text-md'>140,567 meeting now</span>
                                </div>
                                <img src="/assets/Frame.png" className="w-9 h-9 mr-6" />
                            </div>

                            <Button
                                fullWidth
                                className="w-full border border-white py-6 px-32 bg-[#4E0093]/30 text-white rounded-[1.3rem] border-b-4"
                                onClick={() => setIsSignUpOpen(true)}
                            >
                                <img src="/assets/video-off.svg" className="w-8 h-8 p-1 rounded-full" />
                                Meet that someone
                            </Button>


                            <FilterButtons
                                onGenderClick={() => setIsGenderModalOpen(true)}
                                onLocationClick={() => setIsLocationModalOpen(true)}
                                className="mt-20 mb-20"
                            />
                        </div>
                    ) : (
                        /* ===== SQUAD VIEW (ADDED) ===== */
                        <div className="relative z-10 w-full max-w-3xl text-center mt-auto mb-30">

                            {/* Members */}
                            <div className='flex justify-between items-center'>
                                <img src="/assets/search-icon.svg" alt="" />
                                <img src="/assets/Vector.svg" alt="" />
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
            </main>

            {/* Modals */}
            <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
            <GenderModal isOpen={isGenderModalOpen} onClose={() => setIsGenderModalOpen(false)} />
            <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        </div>
    );
}
