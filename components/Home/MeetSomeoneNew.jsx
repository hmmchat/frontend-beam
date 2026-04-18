'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IoVideocam, IoNavigate, IoTimeOutline, IoChatbubbleOutline, IoPersonOutline, IoHomeOutline, IoLayersOutline } from 'react-icons/io5';
import { FaCrown, FaMobileAlt } from 'react-icons/fa';
import { API, apiRequest } from '@/lib/api';
import clsx from 'clsx';
import Image from 'next/image';
import FilterButtons from '@/components/ui/FilterButtons';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import OverlayLayer from '@/components/ui/OverlayLayer';


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
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });

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

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    window.location.href = '/';
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

<div
  className="absolute inset-0  opacity-70 mix-blend-hard-light md:animate-zoom-slow"
  style={{
    backgroundImage: 'url(/bg.jpg)',
    backgroundSize: 'cover',
          backgroundPosition: '25% center',
    backgroundRepeat: 'repeat',
  }}
/>    

      


      {/* Overlay Glow */}


      {/* Top Bar */}
    <div className="relative z-10 w-full px-6 pt-10 flex justify-between items-center">

  {/* LEFT BUTTON (COINS) */}
  <div>
    <button
      className="h-11 px-8 py-7 flex items-center gap-2 border border-white border-b-4 rounded-full"
      onClick={() => setIsCoinModalOpen(true)}
    >
      <img src="/assets/Coin-token.svg" className="w-5 h-5" />
      <div className="text-sm font-semibold">{coins.toLocaleString()}</div>
      <img src="/assets/plus.png" className="w-4 h-4" />
    </button>
  </div>

  {/* RIGHT BUTTONS */}
  <div className="flex gap-3">
    <button className="h-[45px] w-[45px] border border-white rounded-full border-b-4 flex items-center justify-center text-white shadow-lg">
      <FaCrown className="text-yellow-400" />
    </button>

    <button 
      onClick={() => router.push('/onboarding?intent=1')}
      className="h-[45px] p-[14px] w-[45px] border border-white border-b-4 rounded-full flex items-center justify-center text-white shadow-lg"
    >
      <FaMobileAlt className='h-[20px] w-[20px]' />
    </button>
  </div>

</div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 w-full max-w-xl mx-auto px-3 flex flex-col items-center justify-center gap-10">

    <div className="text-center flex flex-col items-center justify-center mx-auto">
  <img src="./LOGO.png" className="w-40 mx-auto" />
  
  <p className="text-white text-xl font-medium mt-1">
    Meet Someone here
  </p>

  <div className="flex items-center justify-center gap-2 mt-3 opacity-90">
    <IoVideocam className="text-white/70" size={18} />
    <p className="text-white/80 text-sm font-semibold">
      {activeUsers.toLocaleString()} beaming now
    </p>
  </div>
</div>


        <div className="w-full relative py-10 px-0">
     
            <div className="absolute inset-0 " />
            
            <div className="flex flex-col gap-10 items-center py-6 px-4">
        
                <div className="flex items-center justify-between w-full">
                     <button className="w-12 h-12  brounded-2xl flex items-center justify-center text-white shadow-inner group">
                        <div className="flex flex-col items-center justify-center">
                              <Image
                                   src="/assets/Frame.png"
                                   alt="User"
                                   width={42}
                                   height={42}
                                 />
                           
                        </div>
                    </button>

                    <div className="flex   border border-white p-1 rounded-full w-48 relative shadow-inner h-11">
                        <div 
                            className={clsx(
                                "absolute top-1 bottom-1 w-[calc(50%-4px)] border border-white rounded-full transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)",
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

                    <button className="w-12 h-12  rounded-2xl flex items-center justify-center text-white shadow-inner group">
                        <Image src="/Group.png" alt="User" width={42} height={42} className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    </button>
                </div>

  
                <div className="w-full mt-10 ">
                    <button 
                        onClick={handleMeetNow}
                        className="group relative w-full h-20  border border-white border-b-[3px] rounded-[20px] flex items-center justify-center gap-4 active:scale-[0.98] transition-all overflow-hidden shadow-2xl bg-black/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 opacity-50" />
                        <div className="w-10 h-10 rounded-full border border-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <IoVideocam className="text-white text-xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        </div>
                        <span className="text-white text-md  tracking-tight">Meet Someone now</span>
                    </button>
                </div>

 
                <FilterButtons 
                    onGenderClick={() => setIsGenderModalOpen(true)}
                    onLocationClick={() => setIsLocationModalOpen(true)}
                    className="w-[80%] mt-4"
                />
            </div>
        </div>




      </div>

      {/* Bottom Navigation */}
      <div className="relative z-10 w-full max-w-sm px-4 pb-10 mt-auto mx-auto">
        <div className=" border border-white rounded-full h-[54px] w-full flex items-center justify-between px-8 ">
            <button className="text-white text-2xl hover:scale-125 transition-transform"><img src="./mobhome.svg" alt="chat" className="w-6 h-6" /></button>
            <button 
                onClick={() => router.push('/history')}
                className="text-white/70 text-2xl hover:text-white/60 transition-colors"
            >
                   <img src="./mobhistory.svg" alt="chat" className="w-6 h-6" />
            </button>
            <button 
                onClick={() => router.push('/inbox')}
                className="relative text-white/70 text-2xl hover:text-white/60 transition-colors"
            >
                 <img src="./mobmessage.svg" alt="chat" className="w-6 h-6" />
                <div className="absolute top-0 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#201035] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            </button>
            <button 
                onClick={() => router.push('/facecard?view=editor')}
                className="flex items-center justify-center hover:scale-110 transition-transform"
            >
                <div className="w-[30px] h-[30px] rounded-full   overflow-hidden  shadow-lg">
                    {myProfile?.displayPictureUrl ? (
                         <img src={myProfile.displayPictureUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <IoPersonOutline className="text-white/30 w-full h-full p-2.5" />
                    )}
                </div>
            </button>
        </div>
      </div>




      {/* Modals */}
      <GenderModal isOpen={isGenderModalOpen} onClose={() => setIsGenderModalOpen(false)} />
      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
      
      <OverlayLayer
        open={overlay.open}
        url={overlay.url}
        title={overlay.title}
        onClose={() => setOverlay({ open: false, url: '', title: '' })}
      />
    </div>
  );
}
