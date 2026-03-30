'use client';

import React from 'react';
import { IoLocationSharp, IoArrowForward } from 'react-icons/io5';

export default function LocationCard({ city, count, onSelect, onSkip }) {
  return (
    <div className="relative w-full md:max-w-[420px] aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-white/20 bg-gradient-purple-dark backdrop-blur-xl flex flex-col items-center justify-between p-6 md:p-12 text-center group">
      {/* Background Image with Opacity */}
      <div
        className="absolute inset-0 z-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: 'url(/assets/mb.jpg)',
          backgroundRepeat: 'repeat',
          backgroundSize: 'cover',
        }}
      />
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 mt-12">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
          <IoLocationSharp className="text-4xl text-white animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {city || "Anywhere"}
          </h2>
          <p className="text-white/60 text-base md:text-lg font-medium">
            {count || 0} people meeting now
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full space-y-4 mb-4">
        <button
          onClick={onSelect}
          className="w-full py-5 px-8 bg-white text-indigo-950 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-50 transition-all active:scale-[0.98] shadow-lg shadow-white/10 group/btn"
        >
          Explore this city
          <IoArrowForward className="text-xl group-hover/btn:translate-x-1 transition-transform" />
        </button>
        
        <button
          onClick={onSkip}
          className="w-full py-4 text-white/50 font-semibold hover:text-white transition-colors"
        >
          Check another city
        </button>
      </div>

      {/* Modern Badge */}
      <div className="absolute top-6 right-8 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
        <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Suggested City</span>
      </div>
    </div>
  );
}
