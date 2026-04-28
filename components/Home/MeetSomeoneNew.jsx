'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IoVideocam, IoNavigate, IoTimeOutline, IoChatbubbleOutline, IoPersonOutline, IoHomeOutline, IoLayersOutline } from 'react-icons/io5';
import { FaCrown, FaMobileAlt } from 'react-icons/fa';
import { API, apiRequest } from '@/lib/api';
import {
  getNotificationBadgeCount,
  getNotificationCountThrottled,
  subscribeNotificationRealtime,
  subscribeNotificationCount,
} from '@/lib/notification-count';
import { clearPendingReferralCode } from '@/components/CaptureReferralFromUrl';
import clsx from 'clsx';
import Image from 'next/image';
import FilterButtons from '@/components/ui/FilterButtons';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import MeetNowButton from '@/components/ui/MeetNowButton';
import OverlayLayer from '@/components/ui/OverlayLayer';
import Link from 'next/link';


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
  const [unreadCount, setUnreadCount] = useState(0);
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });

  // Sync or use local state
  const mode = externalMode || internalMode;
  const setMode = setExternalMode || setInternalMode;
  const coins = externalCoins !== undefined ? externalCoins : internalCoins;
  const activeUsers = externalActiveUsers !== undefined ? externalActiveUsers : internalActiveUsers;
  const myProfile = externalMyProfile || internalMyProfile;

  async function fetchMyProfile() {
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
  }

  async function fetchWalletBalance() {
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
  }

  useEffect(() => {
    if (!externalMyProfile) void Promise.resolve().then(() => fetchMyProfile());
    if (externalCoins === undefined) void Promise.resolve().then(() => fetchWalletBalance());

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const notifRes = await getNotificationCountThrottled();
        if (notifRes) {
          const count = getNotificationBadgeCount(notifRes);
          setUnreadCount(count);
        }
      } catch (e) {
        // silent failure
      }
    };

    const unsubscribe = subscribeNotificationCount((notifRes) => {
      setUnreadCount(getNotificationBadgeCount(notifRes));
    });
    const unsubscribeRealtime = subscribeNotificationRealtime();
    fetchNotifications();
    const notifInterval = setInterval(fetchNotifications, 10000);

    if (externalActiveUsers === undefined) {
        const activeUsersInterval = setInterval(() => {
            setInternalActiveUsers(prev => prev + Math.floor(Math.random() * 10) - 5);
        }, 10000);
        return () => {
            unsubscribe();
            unsubscribeRealtime();
            clearInterval(notifInterval);
            clearInterval(activeUsersInterval);
        };
    }
    return () => {
      unsubscribe();
      unsubscribeRealtime();
      clearInterval(notifInterval);
    };
  }, [externalMyProfile, externalCoins, externalActiveUsers]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    clearPendingReferralCode();
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

      

<div className="border border-white/30 absolute top-4 left-1/2 -translate-x-1/2  h-[39vh] w-[96vw] rounded-t-3xl rounded-b-2xl" />
      {/* Overlay Glow */}
<div className='border border-white/30 bottom-28 h-[38vh] absolute  left-1/2 -translate-x-1/2 w-[96vw] rounded-b-3xl  rounded-t-2xl'/>

      {/* Top Bar */}
    <div className="relative z-10 w-full px-6 pt-10 flex justify-between items-center">

  {/* LEFT BUTTON (COINS) */}
  <div>
    <button
      className="h-12 px-5 py-7 flex items-center gap-2 border-[1px] border-b-[3px] border-white/50 rounded-full"
      onClick={() => setIsCoinModalOpen(true)}
    >
      <img src="/assets/Coin-token.svg" className="w-5 h-5" />
      <div className="text-sm font-semibold">{coins.toLocaleString()}</div>
      <img src="/assets/plus.png" className="w-4 h-4" />
    </button>
  </div>

  {/* RIGHT BUTTONS */}
          <div className='absolute     right-8 z-50 flex gap-2'>

  <Link href="/beam-tv">
  <button className=' h-14 w-14 rounded-full border-[1px] border-b-[3px] border-white/60 shadow-md transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] items-center justify-center flex'>
    <img src="/crown.svg" alt="crown" className={clsx('h-[24px]', 'w-[24px]')} />
  </button>
</Link>



          <Link href="/onboarding?intent=1">
            <button 
              className=' h-14 w-14 rounded-full border-[1px] border-b-[3px] border-white/60 shadow-md transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] items-center justify-center flex'>
              <img src="/icon1.svg" alt="Prompt" className={clsx('h-[24px]', 'w-[24px]')} />
            </button>
          </Link>



</div>

</div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 w-full max-w-xl mx-auto px-3 flex flex-col items-center justify-center gap-10">

    <div className="text-center flex flex-col items-center justify-center mx-auto mt-10">
  <img src="./LOGO.png" className="w-34 mx-auto" />
  
  <p className="text-white text-[13px] font-medium ">
    Meet Someone here
  </p>

  <div className="flex items-center justify-center gap-2 mt-3 ">
<img src="/assets/video-on.svg" className="w-4 h-4" />
    <p className="text-white/90 text-sm font-thin font-outfit">
      {activeUsers.toLocaleString()} beaming now
    </p>
  </div>
</div>


        <div className="w-full relative py-10 px-0">
     
            <div className="absolute inset-0 " />
            
            <div className="flex flex-col gap-10 items-center py-6 px-4">
        
             <div className="relative w-full flex items-center justify-center">
  
  {/* LEFT BUTTON */}
  <div className="absolute left-0 w-12 h-12 flex items-center justify-center text-white shadow-inner">
             <Link href="/beam-tv">
                <button className={clsx('relative', 'h-11', 'w-11', 'l', 'p-3', 'shadow-md', 'hover:border-white', 'hover:scale-110', 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]', 'active:scale-95', 'active:border-b-2', 'transition-all', 'duration-300')}>
  
  {/* TV Frame (background) */}
  <img 
    src="/tvfame.png" 
    className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'object-contain')}
  />

  {/* Beam TV inside frame */}
  <img 
    src="/beamtv.png" 
    className={clsx('absolute', 'inset-0', 'm-auto', 'w-[27px]', 'h-[27px]', 'object-contain', 'ml-1', 'mt-3')}
  />

</button>
                </Link>
  </div>




      

  {/* CENTER TOGGLE */}
  <div className="flex border-[1px] border-white/50 p-1 rounded-full w-46 relative shadow-inner h-[44px] ">
    <div
      className={clsx(
        "absolute top-1 bottom-1 w-[calc(50%-4px)] border border-white/60 rounded-full transition-all duration-500 ",
        mode === 'solo' ? "left-1" : "left-[calc(50%+2px)]"
      )}
    />
    <button
      onClick={() => setMode('solo')}
      className={clsx(
        "flex-1 rounded-full text-xs  z-10 ",
        mode === 'solo' ? "text-white scale-105" : "text-white/70"
      )}
    >
      Solo
    </button>
    <button
      onClick={() => setMode('squad')}
      className={clsx(
        "flex-1 rounded-full text-sm z-10",
        mode === 'squad' ? "text-white scale-105" : "text-white/70"
      )}
    >
      Squad
    </button>
  </div>

  {/* RIGHT BUTTON */}
  <div className="absolute right-0 w-12 h-12  flex items-center justify-center text-white ">
             <Link href="/cards">
  <button className={clsx('h-16', 'w-16', 'rounded-full', 'p-3', 'transition-all', 'duration-300', 'hover:scale-110', 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]')}>
    <img src="/hugeiconscards.svg" alt="cards"  />
  </button>
</Link>
  </div>

</div>

  
             <div className="w-full mt-8">
  <MeetNowButton
    onClick={handleMeetNow}
    className="w-full h-20"
     iconClass="md:text-xl transition-all md:h-8 md:w-8 h-6 w-6"
                 borderClass = "md:border-[1.89px] md:border-b-[5.4px] border border-b-[3px] md:rounded-[26px] rounded-[16px]"
  />
</div>

<FilterButtons 
  onGenderClick={() => setIsGenderModalOpen(true)}
  onLocationClick={() => setIsLocationModalOpen(true)}
  className="mt-6"
/>
            </div>
        </div>




      </div>

      {/* Bottom Navigation */}
      <div className="relative z-10 w-full max-w-sm px-4 pb-10 mt-auto mx-auto">
        <div className=" border border-white/50 rounded-full h-[64px] w-full flex items-center justify-between px-8 ">
            <button className="text-white text-2xl hover:scale-125 transition-transform"><img src="./mobhome.svg" alt="chat" className="w-[30px] h-[30px]" /></button>
            <button 
                onClick={() => router.push('/history')}
                className="text-white/70 text-2xl hover:text-white/60 transition-colors"
            >
                   <img src="./mobhistory.svg" alt="chat" className="w-[30px] h-[30px]" />
            </button>
            <button 
                onClick={() => router.push('/inbox')}
                className="relative text-white/70 text-2xl hover:text-white/60 transition-colors"
            >
                 <img src="./mobmessage.svg" alt="chat" className="w-[30px] h-[30px]" />
                 {unreadCount > 0 && (
                   <div className="absolute top-0 -right-1 w-3 h-3 bg-[#ACE723] border-2 border-[#1ECB00] rounded-full shadow-[0_0_8px_rgba(172,231,35,0.6)]" />
                 )}
            </button>
            <button 
                type="button"
                title="My profile"
                onClick={() => router.push('/profile/')}
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
