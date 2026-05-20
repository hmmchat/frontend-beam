'use client';

import { useState, useEffect , useRef} from 'react';
import { useRouter } from 'next/navigation';
import { IoVideocam, IoNavigate, IoTimeOutline, IoChatbubbleOutline, IoPersonOutline, IoHomeOutline, IoLayersOutline, IoMic, IoMicOff, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
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
import CoinModal from '@/components/modals/CoinModal';
import MeetNowButton from '@/components/ui/MeetNowButton';
import OverlayLayer from '@/components/ui/OverlayLayer';
import Link from 'next/link';
import SquadInviteFriendsModal from '@/components/Home/SquadInviteFriendsModal';
import SquadQuickInviteStrip from '@/components/Home/SquadQuickInviteStrip';


export default function MeetSomeoneNew({ 
  onMeetNow, 
  mode: externalMode, 
  setMode: setExternalMode,
  coins: externalCoins,
  activeUsers: externalActiveUsers,
  myProfile: externalMyProfile,
  unreadCount: externalUnreadCount,

  // Squad props
  squadLobby,
  guestProfiles,
  squadGuestIds,
  canSquadMeet,
  handleSquadEnterCall,
  shareSquadInvite,
  squadShareBusy,
  squadMeetBusy,
  handleRemoveSquadMember,
  squadMemberActionBusyId,
  squadLobbyMicMuted,
  setSquadLobbyMicMuted,
  squadLobbyAudioOff,
  setSquadLobbyAudioOff,
  quickInviteFriends,
  quickInviteBusyId,
  quickInvitePendingIds,
  handleQuickSquadInvite,
  handleQuickSquadCancelInvite,
  refreshSquadLobby,
  loadQuickInviteFriends,
  squadProductMessage,
}) {
  const router = useRouter();
  const [internalMode, setInternalMode] = useState('solo');
  const [internalCoins, setInternalCoins] = useState(25500);
  const [internalActiveUsers, setInternalActiveUsers] = useState(140567);
  const [internalMyProfile, setInternalMyProfile] = useState(null);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [internalUnreadCount, setInternalUnreadCount] = useState(0);
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });
  const [isSquadInviteOpen, setIsSquadInviteOpen] = useState(false);

  // Sync or use local state
  const mode = externalMode || internalMode;
  const setMode = setExternalMode || setInternalMode;
  const coins = externalCoins !== undefined ? externalCoins : internalCoins;
  const activeUsers = externalActiveUsers !== undefined ? externalActiveUsers : internalActiveUsers;
  const myProfile = externalMyProfile || internalMyProfile;
  const unreadCount = externalUnreadCount !== undefined ? externalUnreadCount : internalUnreadCount;
  const navbarRef = useRef(null);
  const [navbarHeight, setNavbarHeight] = useState(88);

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
    if (!navbarRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setNavbarHeight(entry.contentRect.height + 24); // +24px extra breathing room
      }
    });
    observer.observe(navbarRef.current);
    return () => observer.disconnect();
  }, []); 


  useEffect(() => {
    if (!externalMyProfile) void Promise.resolve().then(() => fetchMyProfile());
    if (externalCoins === undefined) void Promise.resolve().then(() => fetchWalletBalance());

    if (externalUnreadCount !== undefined) {
      return undefined;
    }

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const notifRes = await getNotificationCountThrottled();
        if (notifRes) {
          const count = getNotificationBadgeCount(notifRes);
          setInternalUnreadCount(count);
        }
      } catch (e) {
        // silent failure
      }
    };

    const unsubscribe = subscribeNotificationCount((notifRes) => {
      setInternalUnreadCount(getNotificationBadgeCount(notifRes));
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
  }, [externalMyProfile, externalCoins, externalActiveUsers, externalUnreadCount]);

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
    <div className="relative h-[100vh] w-full overflow-hidden flex flex-col">


    {mode !== 'squad' && (
        <div
          className="absolute inset-0 z-[2] mt-3 mb-20 flex items-center justify-center pointer-events-none"
          style={{ bottom: navbarHeight }}   // ← dynamic, not hardcoded
        >
<svg
  viewBox="0 0 380 681"
className='w-[94%] h-full'
  preserveAspectRatio="none"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
      <path
        d="M93.7835 338C97.225 338 98.9457 338 100.067 338.335C101.639 338.805 101.514 338.739 102.792 339.768C103.703 340.501 105.757 343.486 109.864 349.456C113.83 355.22 120.474 359 128 359H252C259.526 359 266.17 355.22 270.136 349.456C274.243 343.486 276.297 340.501 277.208 339.768C278.486 338.739 278.361 338.805 279.933 338.335C281.054 338 282.775 338 286.217 338H298.463C301.033 338 303.143 339.915 304.722 341.943L320.442 362.142C322.337 364.576 325.249 366 328.334 366H365.817C369.848 366 371.863 366 373.568 366.864C374.992 367.585 376.329 368.912 377.061 370.33C377.938 372.028 377.952 373.931 377.981 377.737C378 380.246 378 382.988 378 386V633C378 649.801 378 658.203 374.73 664.62C371.854 670.265 367.265 674.854 361.62 677.73C355.203 681 346.801 681 330 681H48C31.1985 681 22.7972 681 16.3799 677.73C10.7353 674.854 6.14571 670.265 3.26953 664.62C-0.000251449 658.203 -3.49457e-09 649.801 0 633V386C0 383.446 0.000108949 381.086 0.0117415 378.897C0.0324858 374.995 0.0428579 373.044 0.918083 371.342C1.65451 369.909 2.976 368.595 4.41202 367.866C6.11869 367 8.16608 367 12.2609 367H49.5693C52.7088 367 55.6662 365.526 57.5557 363.019L73.5205 341.834C75.0172 339.848 77.0592 338 79.5462 338H93.7835ZM330 0C346.802 0 355.203 -0.000273228 361.62 3.26953C367.265 6.14571 371.854 10.7352 374.73 16.3799C378 22.7972 378 31.1987 378 48V286C378 288.554 378 290.914 377.988 293.103C377.968 297.005 377.957 298.956 377.082 300.658C376.346 302.091 375.024 303.405 373.588 304.134C371.881 305 369.834 305 365.739 305H328.408C325.282 305 322.334 306.462 320.443 308.952L304.649 329.754C303.009 331.914 300.808 334 298.095 334H286.217C282.775 334 281.055 334 279.934 333.665C278.362 333.195 278.487 333.261 277.209 332.232C276.297 331.499 274.243 328.514 270.136 322.544C266.17 316.779 259.526 313 252 313H128C120.474 313 113.83 316.779 109.864 322.544C105.757 328.514 103.703 331.499 102.791 332.232C101.513 333.261 101.638 333.195 100.066 333.665C98.9453 334 97.2246 334 93.7831 334H79.8815C77.2659 334 75.1402 331.999 73.5908 329.892L57.5518 308.076C55.6674 305.513 52.6761 304 49.4951 304H12.3305C8.18 304 6.10473 304 4.39651 303.132C2.94977 302.397 1.64214 301.094 0.901822 299.65C0.0276937 297.944 0.0206606 295.95 0.00659464 291.963C2.40291e-05 290.1 -4.40241e-10 288.117 0 286V48C0 31.1987 -0.000137434 22.7972 3.26953 16.3799C6.14568 10.7352 10.7352 6.14571 16.3799 3.26953C22.7972 -0.00027298 31.1984 0 48 0H330Z"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
      />
    </svg>
  </div>
)}
      {/* 🔥 FULL SCREEN BACKGROUND */}
      <div
        className="absolute inset-0 opacity-70 mix-blend-hard-light"
        style={{
          backgroundImage: "url(/bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "15% center",
          backgroundRepeat: "no-repeat",
        }}
      />



      

      
      {/* this div */}
  <div className="flex flex-col py-8"> 

      {/* Top Bar */}
    <div className="relative z-10 w-full px-6  flex justify-between items-center ">



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
      <div className="relative   z-10 flex-1 w-full max-w-xl mx-auto px-3 flex flex-col items-center justify-center gap-4">

    <div className="text-center flex flex-col items-center justify-center mx-auto mt-7">
  <img src="./logo.png" className="w-34 mx-auto" />
  
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
     
            {/* Empty space removed */}
            
            <div className="flex flex-col gap-6 items-center py-6 px-4 w-full">
        
             <div className="relative w-full flex items-center justify-center mb-22">
  
  {/* LEFT BUTTON */}
  {mode !== 'squad' && (
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
  )}

  {/* CENTER TOGGLE */}
<div className="flex border border-white/50  rounded-full w-40 relative shadow-inner h-[40px]  ">
  <div
    className={clsx(
      "absolute top-1 bottom-1 w-[calc(50%-4px)] border bg-black/10 border-white/60 rounded-full transition-all duration-500",
      mode === 'solo' ? "left-1" : "left-[calc(50%+2px)]"
    )}
  />

  <button
    onClick={() => setMode('solo')}
    className={clsx(
      "flex-1 rounded-full text-sm z-10 flex items-center justify-center",
      mode === 'solo' ? "text-white scale-105" : "text-white/70"
    )}
  >
    Solo
  </button>

  <button
    onClick={() => setMode('squad')}
    className={clsx(
      "flex-1 rounded-full text-sm z-10 flex items-center justify-center",
      mode === 'squad' ? "text-white scale-105" : "text-white/70"
    )}
  >
    Squad
  </button>
</div>
  {/* RIGHT BUTTON */}
  {mode !== 'squad' && (
  <div className="absolute right-0 w-12 h-12  flex items-center justify-center text-white ">
             <Link href="/cards">
  <button className={clsx('h-16', 'w-16', 'rounded-full', 'p-3', 'transition-all', 'duration-300', 'hover:scale-110', 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]')}>
    <img src="/hugeiconscards.svg" alt="cards"  />
  </button>
</Link>
  </div>
  )}

  
</div>

{mode === 'squad' ? (
  <div className="flex flex-col items-center     w-full -mt-10 ">
    {squadProductMessage && (
      <div role="alert" className="w-full  rounded-2xl border border-red-400/40 bg-red-950/45 px-4 py-3 text-sm font-medium text-red-50">
        {squadProductMessage}
      </div>
    )}


<div className="flex flex-col  gap-6   ">
    {/* Avatars */}
    <div className="flex flex-wrap items-center justify-center gap-2  ">
      {/* Me */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-18 h-18 rounded-full border-[3px] border-white/90 overflow-hidden bg-black/10">
          <img src={myProfile?.displayPictureUrl || '/assets/avatar1.png'} alt="me" className="w-full h-full object-cover" />
        </div>
        <span className="text-[10px] text-white/70 ">Me</span>
      </div>

{squadGuestIds?.slice(0, 2).map((guestId, i) => (
        <div key={`g-${i}`} className="flex items-center gap-2">
          <img src="/assets/plus.png" alt="" className="w-3 h-3 mb-4" />
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-18 h-18">
              <div className="w-full h-full rounded-full border-[3px] border-white/90 flex items-center justify-center overflow-hidden bg-black/10">
                {guestId && guestProfiles?.[guestId]?.displayPictureUrl ? (
                  <img src={guestProfiles[guestId].displayPictureUrl} alt="" className="w-full h-full object-cover" />
                ) : guestId ? (
                  <span className="text-xl text-white/60">…</span>
                ) : (
                  <span className="text-xl text-white">?</span>
                )}
              </div>
              {guestId && (
                <button
                  type="button"
                  disabled={squadMemberActionBusyId === guestId}
                  onClick={() => handleRemoveSquadMember?.(guestId)}
                  className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-red-600 border border-white/90 text-white text-[10px] font-bold flex items-center justify-center"
                >
                  x
                </button>
              )}
            </div>
            <span className="text-[10px] text-white/70">
              {guestId ? guestProfiles?.[guestId]?.username || 'Friend' : 'Who'}
            </span>
          </div>
        </div>
      ))}
    </div>

    {/* Mic/Audio Controls */}
    {canSquadMeet && (
      <div className="flex items-center gap-4 rounded-full border border-white/20 bg-black/40 px-4 py-2 backdrop-blur-sm">
        <button
          onClick={() => setSquadLobbyMicMuted?.((prev) => !prev)}
          className={clsx('p-2 rounded-full border', squadLobbyMicMuted ? 'border-red-400 bg-red-500/20 text-red-100' : 'border-white/40 text-white')}
        >
          {squadLobbyMicMuted ? <IoMicOff /> : <IoMic />}
        </button>
        <button
          onClick={() => setSquadLobbyAudioOff?.((prev) => !prev)}
          className={clsx('p-2 rounded-full border', squadLobbyAudioOff ? 'border-yellow-400 bg-yellow-500/20 text-yellow-100' : 'border-white/40 text-white')}
        >
          {squadLobbyAudioOff ? <IoVolumeMute /> : <IoVolumeHigh />}
        </button>
      </div>
    )}

    {/* Share Icons */}
    <div className="flex items-center gap-4 rounded-full border border-white/10 bg-black/30 px-6 py-2">
      <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider font-outfit">Share</span>
      <button onClick={() => shareSquadInvite?.('generic')} disabled={squadShareBusy} className="p-1 hover:bg-white/10 rounded-full transition">
        <img src="/shareicon4.png" className="w-7 h-7" alt="" />
      </button>
      <button onClick={() => shareSquadInvite?.('generic')} disabled={squadShareBusy} className="p-1 hover:bg-white/10 rounded-full transition">
        <img src="/shareicon2.png" className="w-6 h-6" alt="" />
      </button>
      <button onClick={() => shareSquadInvite?.('whatsapp')} disabled={squadShareBusy} className="p-1 hover:bg-white/10 rounded-full transition">
        <img src="/shareicon1.png" className="w-6 h-6" alt="" />
      </button>
      <button onClick={() => shareSquadInvite?.('copy')} disabled={squadShareBusy} className="p-1 hover:bg-white/10 rounded-full transition">
        <img src="/shareicon3.png" className="w-6 h-6" alt="" />
      </button>
    </div>

</div>

    {/* Squad CTA */}
    <div className="w-full  mx-auto">
      {canSquadMeet ? (
        <MeetNowButton
          onClick={handleSquadEnterCall}
          isSearching={squadMeetBusy}
          searchingText="Starting..."
          text="Meet Someone now"
          iconClass="text-sm transition-all h-4 w-4 "
          className="w-[70%]  h-16"
          borderClass="md:border-[1.8px] md:border-b-[4.4px] border border-b-[3px] md:rounded-[26px] rounded-[16px] mx-auto"
          isVideoOn
        />
      ) : (
        <SquadQuickInviteStrip
          friends={quickInviteFriends}
          busyId={quickInviteBusyId}
          pendingInviteeIds={quickInvitePendingIds}
          onInvite={(id) => handleQuickSquadInvite?.(id)}
          onCancelInvite={(id) => handleQuickSquadCancelInvite?.(id)}
          onSeeAll={() => setIsSquadInviteOpen(true)}
          className="w-full"
        />
      )}
    </div>
  </div>
) : (
  <>
    <div className="w-full ">
      <MeetNowButton
        onClick={handleMeetNow}
        className="w-full h-20"
        iconClass="md:text-xl transition-all md:h-8 md:w-8 h-6 w-6"
        borderClass="md:border-[1.89px] md:border-b-[5.4px] border border-b-[3px] md:rounded-[26px] rounded-[16px]"
      />
    </div>

    <FilterButtons 
      onGenderClick={() => setIsGenderModalOpen(true)}
      onLocationClick={() => setIsLocationModalOpen(true)}
      className="mt-3"
    />
  </>
)}
            </div>











   <div className="relative z-10 w-full max-w-sm px-4 mx-auto ">
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









        </div>




      </div>





</div>

   




      {/* Modals */}
      <GenderModal isOpen={isGenderModalOpen} onClose={() => setIsGenderModalOpen(false)}/>
      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
      <CoinModal isOpen={isCoinModalOpen} onClose={() => setIsCoinModalOpen(false)} />
      <SquadInviteFriendsModal
        open={isSquadInviteOpen}
        onClose={() => setIsSquadInviteOpen(false)}
        onInviteSent={() => {
          refreshSquadLobby?.();
          loadQuickInviteFriends?.();
        }}
        squadMemberIds={squadLobby?.memberIds || []}
      />
      
      <OverlayLayer
        open={overlay.open}
        url={overlay.url}
        title={overlay.title}
        onClose={() => setOverlay({ open: false, url: '', title: '' })}
      />
    </div>
  );
}