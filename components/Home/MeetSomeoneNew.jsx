'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IoVideocam, IoNavigate, IoTimeOutline, IoChatbubbleOutline, IoPersonOutline, IoHomeOutline, IoLayersOutline } from 'react-icons/io5';
import { FaCrown, FaMobileAlt } from 'react-icons/fa';
import { API, apiRequest } from '@/lib/api';
import clsx from 'clsx';
import Image from 'next/image';

export default function MeetSomeoneNew({ 
  onMeetNow, 
  mode: externalMode, 
  setMode: setExternalMode,
  coins: externalCoins,
  activeUsers: externalActiveUsers,
  myProfile: externalMyProfile
}) {
  const router = useRouter();
  const [internalMode, setInternalMode] = useState('solo');
  const [internalCoins, setInternalCoins] = useState(25500);
  const [internalActiveUsers, setInternalActiveUsers] = useState(140567);
  const [internalMyProfile, setInternalMyProfile] = useState(null);

  // Sync or use local state
  const mode = externalMode || internalMode;
  const setMode = setExternalMode || setInternalMode;
  const coins = externalCoins !== undefined ? externalCoins : internalCoins;
  const activeUsers = externalActiveUsers !== undefined ? externalActiveUsers : internalActiveUsers;
  const myProfile = externalMyProfile || internalMyProfile;

  useEffect(() => {
    if (!externalMyProfile) fetchMyProfile();
    if (externalCoins === undefined) fetchWalletBalance();
    
    if (externalActiveUsers === undefined) {
        const interval = setInterval(() => {
            setInternalActiveUsers(prev => prev + Math.floor(Math.random() * 10) - 5);
        }, 10000);
        return () => clearInterval(interval);
    }
  }, [externalMyProfile, externalCoins, externalActiveUsers]);

  const fetchMyProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;
      const response = await fetch(API.USERS.GET_USER(userId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInternalMyProfile(data.user);
      }
    } catch (error) {
      console.error('Error fetching my profile:', error);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const response = await fetch(API.WALLET.GET_BALANCE, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInternalCoins(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleMeetNow = () => {
    if (onMeetNow) {
        onMeetNow();
    } else {
        router.push('/');
    }
  };

  return (
<div className="relative h-[100dvh] w-full overflow-hidden flex flex-col">

  {/* 🔥 FULL SCREEN BACKGROUND */}
  <div
    className="absolute inset-0 z-0 opacity-70 mix-blend-hard-light"
    style={{
      backgroundImage: 'url(/bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}
  />

  {/* 🔥 OPTIONAL DARK OVERLAY */}
  <div className="absolute  inset-0 z-[1]" />

      {/* Overlay Glow */}


      {/* Top Bar */}
      <div className="relative z-10 w-full px-6 pt-10 flex justify-between items-center">

        <div className="  border border-white/20 rounded-full py-2 px-4 flex items-center gap-2 shadow-lg">
          <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-bold text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]">
            $
          </div>
          <span className="text-white font-bold text-sm">{coins.toLocaleString()}</span>
          <button className="text-white font-bold ml-1 text-lg leading-none flex items-center justify-center">+</button>
        </div>

        <div className="flex gap-3">
            <button className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center text-white shadow-lg  transition-all">
                <FaCrown className="text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" />
            </button>
            <button className="w-10 h-10   border border-white/20 rounded-full flex items-center justify-center text-white shadow-lg  transition-all">
                <FaMobileAlt />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 w-full max-w-sm px-6 flex flex-col items-center justify-center gap-10 mt-[-20px]">

        <div className="text-center">
          <h1 className="text-7xl font-black text-yellow-400 drop-shadow-[0_4px_0_rgba(0,0,0,1)] italic tracking-tighter" 
              style={{ fontFamily: 'var(--font-otomanopee), sans-serif' }}>
            beam
          </h1>
          <p className="text-white text-xl font-medium mt-1">Meet Someone here</p>
          <div className="flex items-center justify-center gap-2 mt-3 opacity-90">
            <IoVideocam className="text-white/70" size={18} />
            <p className="text-white/80 text-sm font-semibold">{activeUsers.toLocaleString()} beaming now</p>
          </div>
        </div>


        <div className="w-full relative py-10 px-0">
     
            <div className="absolute inset-0 border-[1.5px] border-white/15 rounded-[45px] pointer-events-none" />
            
            <div className="flex flex-col gap-10 items-center py-6 px-4">
        
                <div className="flex items-center justify-between w-full">
                     <button className="w-12 h-12  border border-white/20 rounded-2xl flex items-center justify-center text-white shadow-inner group">
                        <div className="flex flex-col items-center justify-center">
                              <Image
                                   src="/assets/Frame.png"
                                   alt="User"
                                   width={42}
                                   height={42}
                                 />
                           
                        </div>
                    </button>

                    <div className="flex   border border-white/10 p-1 rounded-full w-48 relative shadow-inner h-11">
                        <div 
                            className={clsx(
                                "absolute top-1 bottom-1 w-[calc(50%-4px)] border border-white/25 rounded-full transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)",
                                mode === 'solo' ? "left-1" : "left-[calc(50%+2px)]"
                            )}
                        />
                        <button 
                            onClick={() => setMode('solo')}
                            className={clsx("flex-1 rounded-full text-sm font-bold z-10 transition-all", 
                                mode === 'solo' ? "text-white scale-105" : "text-white/40 hover:text-white/60")}
                        >
                            Solo
                        </button>
                        <button 
                            onClick={() => setMode('squad')}
                            className={clsx("flex-1 rounded-full text-sm font-bold z-10 transition-all", 
                                mode === 'squad' ? "text-white scale-105" : "text-white/40 hover:text-white/60")}
                        >
                            Squad
                        </button>
                    </div>

                    <button className="w-12 h-12  border border-white/20 rounded-2xl flex items-center justify-center text-white shadow-inner group">
                        <IoLayersOutline size={24} className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    </button>
                </div>

  
                <div className="w-full px-2">
                    <button 
                        onClick={handleMeetNow}
                        className="group relative w-full h-20  border border-white/30 rounded-[30px] flex items-center justify-center gap-4 active:scale-[0.98] transition-all overflow-hidden shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 opacity-50" />
                        <div className="w-11 h-11 rounded-full border border-white/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IoVideocam className="text-white text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        </div>
                        <span className="text-white text-xl font-bold tracking-tight">Meet Someone now</span>
                    </button>
                </div>

 
                <div className="flex w-full gap-4 px-2">
                    <button className="flex-1 h-14   border border-white/15 rounded-[22px] flex items-center justify-center gap-2 text-white/90 font-bold  transition-all shadow-lg active:scale-95 group">
                        <IoPersonOutline size={22} className="opacity-70 group-hover:opacity-100" />
                        <span>Both</span>
                    </button>
                    <button className="flex-1 h-14 border border-white/15 rounded-[22px] flex items-center justify-center gap-2 text-white/90 font-bold  transition-all shadow-lg active:scale-95 group">
                        <span>Location</span>
                        <IoNavigate size={22} className="opacity-70 group-hover:opacity-100" />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="relative z-10 w-full max-w-sm px-6 pb-10 mt-auto">
        <div className="  border border-white/90 rounded-full h-18 w-full flex items-center justify-between px-8 shadow-2xl">
            <button className="text-white text-2xl hover:scale-125 transition-transform"><IoHomeOutline /></button>
            <button className="text-white/40 text-2xl hover:text-white/60 transition-colors"><IoTimeOutline /></button>
            <button className="relative text-white/40 text-2xl hover:text-white/60 transition-colors">
                <IoChatbubbleOutline />
                <div className="absolute top-0 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#201035] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            </button>
            <button className="flex items-center justify-center hover:scale-110 transition-transform">
                <div className="w-11 h-11 rounded-full border-2 border-white/40 overflow-hidden  shadow-lg">
                    {myProfile?.displayPictureUrl ? (
                         <img src={myProfile.displayPictureUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <IoPersonOutline className="text-white/30 w-full h-full p-2.5" />
                    )}
                </div>
            </button>
        </div>
      </div>

    </div>
  );
}
