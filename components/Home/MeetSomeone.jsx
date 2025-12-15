"use client";

import React, { useState } from "react";
import Image from "next/image";
import { IoPersonCircleOutline, IoTimeOutline } from "react-icons/io5";
import Button from "@/components/ui/Button";

export default function MeetSomeone() {
    const [mode, setMode] = useState("solo"); // 'solo' | 'squad'
    const [filter, setFilter] = useState("both"); // 'both' | 'location'
    const [coins] = useState(25500);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // modal states (placeholders)
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    // squad invited demo
    const [invited, setInvited] = useState(["Austin"]);

    const handleCTA = () => setIsSignUpOpen(true);
    const toggleInvite = (name) =>
        setInvited((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));

    return (
        <section className="min-h-screen bg-primary w-full flex overflow-hidden font-sans text-white">
            <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full">
                {/* LEFT column: stays hero */}
                <div
                    className="relative flex items-center justify-center px-8 lg:px-24 bg-repeat bg-gradient-purple-dark"
                    style={{
                        backgroundImage: "url('/assets/1.png')",
                        backgroundRepeat: "repeat",        // 🔁 repeat enabled
                        backgroundSize: "auto",             // important for repeat
                        backgroundPosition: "top left",
                    }}
                >
                    <div className="absolute top-8 left-8 flex items-center z-10">

                        <Button
                            variant="outline"
                            width="hex"
                            onClick={() => setIsSignUpOpen(true)}
                            position="left"
                        >
                            <img src="/assets/Coin-token.svg" alt="" className="w-6 h-6" />
                            <div className="text-sm font-semibold">{coins.toLocaleString()}</div>
                            <span className="ml-2 text-white/80">+</span>
                        </Button>
                    </div>

                    <div className="text-left z-10 max-w-lg">

                        <img src="/assets/Logo.svg" alt="" />

                        <div className="mt-8 text-white">
                            <p className="text-lg lg:text-2xl font-medium">Meet someone here,</p>
                            <p className="text-lg lg:text-2xl font-medium">Not sure who, but someone</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT column: CHANGES based on `mode` */}
                <div className="relative overflow-hidden">
                    {/* Right background */}

                    <div className="absolute inset-0 -z-10">
                        <Image src="/assets/5471985.jpg" alt="right-bg" fill style={{ objectFit: "cover" }} priority />
                        <div className="absolute inset-0 -z-10" />
                    </div>
                    <div className="absolute inset-0 z-[1] bg-[#0D0048]/50" />

                    {/* Top centered controls: icons + Solo/Squad */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
                        <div className="flex gap-4">
                            <button
                                className="w-12 h-12 rounded-full glass-effect flex items-center justify-center text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300"
                                title="Profile"
                            >
                                <IoPersonCircleOutline className="text-2xl" />
                            </button>

                            <button
                                className="w-12 h-12 rounded-full glass-effect flex items-center justify-center text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300"
                                title="Time"
                            >
                                <IoTimeOutline className="text-2xl" />
                            </button>
                        </div>

                        <div className="rounded-full bg-black/40 px-2 py-1 flex items-center gap-2 border border-white/10">
                            <button
                                onClick={() => setMode("solo")}
                                className={`px-4 py-2 rounded-full text-sm ${mode === "solo" ? "bg-white/6 border border-white/20" : "text-white/70"}`}
                            >
                                Solo
                            </button>
                            <button
                                onClick={() => setMode("squad")}
                                className={`px-4 py-2 rounded-full text-sm ${mode === "squad" ? "bg-white/6 border border-white/20" : "text-white/70"}`}
                            >
                                Squad
                            </button>
                        </div>
                    </div>

                    {/* Top-right avatar */}
                    <div className="absolute top-6 right-8 z-20">
                        <button
                            onClick={() => setShowProfileMenu((s) => !s)}
                            className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20"
                            aria-label="Open profile"
                        >
                            <Image src="/avatar.jpg" alt="me" fill style={{ objectFit: "cover" }} />
                        </button>
                    </div>

                    {/* RIGHT CONTENT — show different UI for solo vs squad */}
                    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
                        {mode === "solo" ? (
                            // SOLO UI (CTA + filters)
                            <div className="w-full max-w-3xl px-6">
                                <div className="mb-8 text-white/80 flex items-center justify-center gap-3 text-sm">
                                    <img src="/assets/video-on.svg" alt="" className="w-8 h-8 opacity-50" />
                                    <span>140,567 meeting now</span>
                                </div>
                                {/* <img src="" alt="" /> */}

                                <Button
                                    variant="primary"
                                    fullWidth
                                    className="border border-white/30 rounded-2xl py-8 text-left"
                                    icon={
                                        <img src="/assets/video-on.svg" alt="" className="w-8 h-8 opacity-50" />
                                    }
                                    onClick={handleCTA}
                                >
                                    <div className="flex items-center gap-6">

                                        <div className="flex-1">
                                            <div className="text-xl lg:text-2xl font-semibold">Meet that someone</div>
                                            {/* <div className="text-sm text-white/60 mt-1">Tap to start a random meet</div> */}
                                        </div>
                                    </div>
                                </Button>

                                {/* Filters */}
                                <div className="mt-12">
                                    <div className="rounded-2xl border border-white/20 overflow-hidden flex">
                                        <button
                                            onClick={() => setFilter("both")}
                                            className={`flex-1 py-4 text-center ${filter === "both" ? "bg-white/6" : "bg-transparent"} transition`}
                                        >
                                            <div className="text-sm">♂️ Both</div>
                                        </button>
                                        <button
                                            onClick={() => setFilter("location")}
                                            className={`flex-1 py-4 text-center ${filter === "location" ? "bg-white/6" : "bg-transparent"} transition`}
                                        >
                                            <div className="text-sm">📍 Location</div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // SQUAD UI (show invite, share, members) — now shown on RIGHT column
                            <div className="w-full max-w-3xl px-6 text-center">
                                {/* <div className="mb-6 text-white/80 text-sm">Assemble your squad</div> */}
                                <div className="absolute flex flex-col gap-6 items-center z-20">
                                    <button className="absolute left-10 w-12 h-12 rounded-full bg-white/6 border border-white/10 flex items-center justify-center">📺</button>
                                    <button className="absolute left-150 right-0 w-12 h-12 rounded-full bg-white/6 border border-white/10 flex items-center justify-center">⚙️</button>
                                </div>

                                <div className="flex items-center justify-center gap-8 mb-8">
                                    {/* Me */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/20">
                                            <Image src="/avatar.jpg" alt="me" fill style={{ objectFit: "cover" }} />
                                        </div>
                                        <div className="text-xs mt-2">Me</div>
                                    </div>

                                    {/* who placeholders */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center text-2xl">?</div>
                                        <div className="text-xs mt-2">Who</div>
                                    </div>

                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center text-2xl">?</div>
                                        <div className="text-xs mt-2">Who</div>
                                    </div>
                                </div>

                                {/* share row */}
                                <div className="mb-8 items-center ">
                                    <div className="inline-flex items-center  gap-4 rounded-full bg-black/30 px-6 py-3">
                                        <button className="px-3 py-2 rounded hover:bg-white/6">🔗</button>
                                        <button className="px-3 py-2 rounded hover:bg-white/6">Snap</button>
                                        <button className="px-3 py-2 rounded hover:bg-white/6">IG</button>
                                        <button className="px-3 py-2 rounded hover:bg-white/6">WA</button>
                                        <button className="px-3 py-2 rounded hover:bg-white/6">Copy</button>
                                    </div>
                                </div>

                                {/* Invite list */}
                                <div className="items-center justify-center text-left flex flex-row gap-4">
                                    <div className="mb-3 text-white/70">Invite</div>
                                    <div>|</div>
                                    <div className="flex items-center justify-center gap-4">
                                        {["Austin", "Rose", "Peter"].map((name) => (
                                            <button
                                                key={name}
                                                onClick={() => toggleInvite(name)}
                                                className={`relative w-12 h-12 rounded-full overflow-hidden border-2 ${invited.includes(name) ? "border-yellow-400" : "border-white/20"} `}
                                                title={name}
                                            >
                                                <Image src="/avatar.jpg" alt={name} fill style={{ objectFit: "cover" }} />
                                                {invited.includes(name) && (
                                                    <span className="absolute -top-2 -right-2 bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center text-xs text-black font-bold">✓</span>
                                                )}
                                            </button>
                                        ))}
                                        <button className="text-sm text-white/70 underline ml-3">See all</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* right-side small control icons (vertical) */}

                </div>
            </main>

            {/* placeholder modals */}
            {isSignUpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setIsSignUpOpen(false)} />
                    <div className="relative z-10 bg-white text-black rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-2">Sign Up</h3>
                        <p className="text-sm mb-4">Replace this with your signup/signin modal component.</p>
                        <button className="mt-2 rounded-md px-4 py-2 bg-indigo-600 text-white" onClick={() => setIsSignUpOpen(false)}>Close</button>
                    </div>
                </div>
            )}

            {isGenderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsGenderModalOpen(false)} />
                    <div className="relative z-10 bg-white text-black rounded-xl p-6 w-full max-w-sm">
                        <h4 className="font-semibold mb-3">Gender Filter</h4>
                        <p className="text-sm">Put your gender selection UI here.</p>
                        <button className="mt-3 px-4 py-2 rounded bg-gray-800 text-white" onClick={() => setIsGenderModalOpen(false)}>Close</button>
                    </div>
                </div>
            )}

            {isLocationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsLocationModalOpen(false)} />
                    <div className="relative z-10 bg-white text-black rounded-xl p-6 w-full max-w-sm">
                        <h4 className="font-semibold mb-3">Location Filter</h4>
                        <p className="text-sm">Put your location selection UI here.</p>
                        <button className="mt-3 px-4 py-2 rounded bg-gray-800 text-white" onClick={() => setIsLocationModalOpen(false)}>Close</button>
                    </div>
                </div>
            )}
        </section>
    );
}
