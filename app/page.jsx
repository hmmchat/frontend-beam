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
    <div className="relative h-screen overflow-hidden bg-primary">
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

        <button className="w-12 h-12 rounded-full glass-effect flex items-center justify-center text-white hover:bg-white/15 hover:border-white/30 hover:scale-105 transition-all duration-300">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </header>

      {/* Main Layout */}
      <main className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* LEFT SIDE */}
        <div
          className="relative flex items-center justify-center px-6 md:px-15 py-16 md:py-20 lg:py-0 overflow-hidden bg-gradient-purple-dark"
          style={{
            backgroundImage: 'url(/assets/1.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
          }}
        >
          <div className="relative z-[2] text-center">
            <img
              src="/assets/Logo.svg"
              alt="Logo"
              className="mx-auto w-[160px] md:w-auto mb-6"
            />
            <p className="text-xl md:text-[32px] text-white leading-relaxed font-medium opacity-95">
              Meet someone here,
              <br />
              Not sure who, but someone
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="relative flex items-center justify-center px-6 md:px-15 py-16 md:py-20 overflow-hidden">
          {/* Background */}
          <div
            className="absolute inset-0 z-0 md:animate-zoom-slow"
            style={{
              backgroundImage: 'url(/assets/5471985.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Overlay */}
          <div className="absolute inset-0 z-[1] bg-[#0D0048]/50" />

          {/* Top Icons */}
          <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 flex gap-3 z-[3]">
            <button className="w-12 h-12 rounded-full glass-effect flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition">
              <IoPersonCircleOutline className="text-2xl" />
            </button>
            <button className="w-12 h-12 rounded-full glass-effect flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition">
              <IoTimeOutline className="text-2xl" />
            </button>
          </div>

          {/* Pattern */}
          <div className="absolute inset-0 z-[1] pattern-bg" />

          {/* Action Card */}
          <div className="relative z-[2] w-full max-w-[500px] flex flex-col gap-8 md:mt-60 mt-16">
            {/* Stats */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-white/90 text-sm font-medium">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span>140,567 meeting now</span>
              </div>
            </div>

            {/* CTA */}
            <Button
              variant="primary"
              fullWidth
              className="border border-white"
              onClick={() => setIsSignUpOpen(true)}
            >
              Meet that someone
            </Button>

            {/* Filters */}
            <div className="flex flex-row md:flex-row gap-0 pt-6 border-t border-white/10">
              <button
                onClick={() => setIsGenderModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-primary border-2 border-purple-500/80 rounded-l-[10px] border-r-0 text-white font-semibold hover:shadow-lg transition"
              >
                Both
              </button>

              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white/8 border-2 border-purple-500/30 rounded-r-[10px] border-l-0 text-white/70 font-semibold hover:bg-white/12 hover:text-white transition"
              >
                Location
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
