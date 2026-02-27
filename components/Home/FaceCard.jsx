'use client';

import React from 'react';
import Image from 'next/image';
import { IoNotificationsOutline, IoLocationOutline } from 'react-icons/io5';

const FaceCard = ({ user, onRaincheck, onMeetPerson }) => {
  if (!user) return null;

  // Age calculation
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = user.age || calculateAge(user.dateOfBirth);

  return (
    <div className="relative w-full h-[96vh] rounded-2xl overflow-hidden border-2 border-white/40 bg-purple-900 shadow-2xl">
      {/* User Photo Background */}
      <div className="absolute inset-0">
        <img 
          src={user.displayPictureUrl || "/assets/placeholder-user.jpg"} 
          alt={user.username}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
      </div>

      {/* Top Info */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
        <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/20">
          <IoLocationOutline className="text-white text-lg" />
          <div className="text-white">
            <p className="text-sm font-bold">{user.city || "Unknown"}, {user.country || ""}</p>
            <p className="text-[10px] opacity-80">2 miles away</p>
          </div>
        </div>
        <button className="bg-black/30 backdrop-blur-md p-3 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors">
          <IoNotificationsOutline className="text-xl" />
        </button>
      </div>

      {/* Brands List */}
      <div className="absolute top-24 left-6 right-6 z-10">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 overflow-x-auto flex gap-4 no-scrollbar">
          {user.brands?.length > 0 ? (
            user.brands.map((brand, idx) => (
              <div key={idx} className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg p-1 flex items-center justify-center">
                <img src={brand.logoUrl || `https://ui-avatars.com/api/?name=${brand.name}`} alt={brand.name} className="max-w-full max-h-full object-contain filter invert" />
              </div>
            ))
          ) : (
            <p className="text-white/40 text-xs italic py-2">No brand tags</p>
          )}
        </div>
        <p className="text-[10px] text-white/50 text-center mt-1 uppercase tracking-widest">Can't live w/o these</p>
      </div>

      {/* Vertical Name on the left */}
      <div className="absolute left-4 bottom-32 z-10 transform -rotate-90 origin-left translate-y-full translate-x-12">
        <div className="flex items-center gap-2">
           {user.verified && (
            <img src="/assets/blue-tick.svg" alt="Verified" className="w-6 h-6 rotate-90" />
          )}
          <h1 className="text-yellow-400 text-5xl font-black italic tracking-tighter uppercase whitespace-nowrap" 
              style={{ WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}>
            {user.username} {age}
          </h1>
        </div>
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col gap-4">
        
        {/* Bio / Info */}
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-white/20">
          {/* Music Info */}
          {user.musicPreference && (
            <div className="flex items-center gap-3 mb-4 bg-white/5 p-2 rounded-xl">
              <img 
                src={user.musicPreference.albumArtUrl || "/assets/music-placeholder.png"} 
                className="w-10 h-10 rounded-lg"
                alt="Album Art"
              />
              <div className="flex-grow">
                <p className="text-white text-xs font-bold truncate">{user.musicPreference.name}</p>
                <p className="text-white/60 text-[10px] truncate">{user.musicPreference.artist}</p>
              </div>
              <img src="/assets/pieces.svg" className="w-8 h-8 opacity-80" alt="Zodiac" />
            </div>
          )}

          {/* Bio Tip */}
          <div className="relative">
            <span className="absolute -left-2 -top-2 text-3xl text-white/20">"</span>
            <p className="text-white/90 text-sm leading-relaxed italic pl-3">
              {user.intent || "Here to meet strangers and overthink later."}
            </p>
            <span className="absolute -right-2 -bottom-2 text-3xl text-white/20">"</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={onRaincheck}
            className="flex-1 py-4 text-white text-sm font-bold border border-white/20 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest"
          >
            Raincheck!
          </button>
          <button 
            onClick={onMeetPerson}
            className="flex-[2] py-4 bg-white text-purple-900 text-sm font-black border-2 border-white rounded-2xl hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
          >
            Meet this person rn 👉
          </button>
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center gap-2 mt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === 0 ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FaceCard;
