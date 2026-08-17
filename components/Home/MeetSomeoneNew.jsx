'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IoVideocam, IoNavigate, IoTimeOutline, IoChatbubbleOutline, IoPersonOutline, IoHomeOutline, IoLayersOutline, IoMic, IoMicOff, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
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
import { AppOverviewToggle, AppOverviewPanel } from '@/components/ui/AppOverviewInfo';
import Link from 'next/link';
import SquadInviteFriendsModal from '@/components/Home/SquadInviteFriendsModal';
import SquadQuickInviteStrip from '@/components/Home/SquadQuickInviteStrip';
import { displayUsername } from '@/lib/username';
import MeetLogo from '@/components/ui/MeetLogo';


export default function MeetSomeoneNew({
  onMeetNow,
  mode: externalMode,
  setMode: setExternalMode,
  coins: externalCoins,
  activeUsers: externalActiveUsers,
  myProfile: externalMyProfile,
  unreadCount: externalUnreadCount,
  onWalletRefresh,

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

  // Camera toggle props
  isVideoOn = true,
  onVideoClick = null,
}) {
  const router = useRouter();
  const [internalMode, setInternalMode] = useState('solo');
  const [internalCoins, setInternalCoins] = useState(25500);
  const [internalActiveUsers, setInternalActiveUsers] = useState(140567);
  const [internalMyProfile, setInternalMyProfile] = useState(null);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [purchaseToast, setPurchaseToast] = useState(null);
  const [internalUnreadCount, setInternalUnreadCount] = useState(0);
  const [overlay, setOverlay] = useState({ open: false, url: '', title: '' });
  const [isSquadInviteOpen, setIsSquadInviteOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState("ALL");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGenderFilter(localStorage.getItem("genderPreference") || "ALL");
    }
  }, []);

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

  const toggleFullscreen = () => {
    try {
      const doc = window.document;
      const docEl = doc.documentElement;

      const requestFullScreen =
        docEl.requestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.webkitRequestFullScreen ||
        docEl.msRequestFullscreen;

      const cancelFullScreen =
        doc.exitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.webkitExitFullscreen ||
        doc.msExitFullscreen;

      if (
        !doc.fullscreenElement &&
        !doc.mozFullScreenElement &&
        !doc.webkitFullscreenElement &&
        !doc.msFullscreenElement
      ) {
        if (requestFullScreen) {
          requestFullScreen.call(docEl).catch((err) => {
            console.error("Error attempting to enable fullscreen:", err);
          });
        }
      } else {
        if (cancelFullScreen) {
          cancelFullScreen.call(doc);
        }
      }
    } catch (error) {
      console.error("Fullscreen toggle error:", error);
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden flex flex-col      

    
    ">


      {/* Decorative frame + Solo/Squad — hide while overview is open (match MobileHome) */}
      <div
        className={clsx(
          'absolute inset-0 z-40 mt-3 flex items-center justify-center pointer-events-none transition-opacity duration-300',
          isInfoOpen && 'opacity-0 pointer-events-none',
        )}
        style={{ bottom: navbarHeight }}
        aria-hidden={isInfoOpen || undefined}
      >
        <div className="relative w-[95%] h-full max-w-md">
          {mode !== 'squad' && !isInfoOpen && (
            <svg
              viewBox="0 0 380 681"
              className="w-full h-full"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M93.7835 338C97.225 338 98.9457 338 100.067 338.335C101.639 338.805 101.514 338.739 102.792 339.768C103.703 340.501 105.757 343.486 109.864 349.456C113.83 355.22 120.474 359 128 359H252C259.526 359 266.17 355.22 270.136 349.456C274.243 343.486 276.297 340.501 277.208 339.768C278.486 338.739 278.361 338.805 279.933 338.335C281.054 338 282.775 338 286.217 338H298.463C301.033 338 303.143 339.915 304.722 341.943L320.442 362.142C322.337 364.576 325.249 366 328.334 366H365.817C369.848 366 371.863 366 373.568 366.864C374.992 367.585 376.329 368.912 377.061 370.33C377.938 372.028 377.952 373.931 377.981 377.737C378 380.246 378 382.988 378 386V633C378 649.801 378 658.203 374.73 664.62C371.854 670.265 367.265 674.854 361.62 677.73C355.203 681 346.801 681 330 681H48C31.1985 681 22.7972 681 16.3799 677.73C10.7353 674.854 6.14571 670.265 3.26953 664.62C-0.000251449 658.203 -3.49457e-09 649.801 0 633V386C0 383.446 0.000108949 381.086 0.0117415 378.897C0.0324858 374.995 0.0428579 373.044 0.918083 371.342C1.65451 369.909 2.976 368.595 4.41202 367.866C6.11869 367 8.16608 367 12.2609 367H49.5693C52.7088 367 55.6662 365.526 57.5557 363.019L73.5205 341.834C75.0172 339.848 77.0592 338 79.5462 338H93.7835ZM330 0C346.802 0 355.203 -0.000273228 361.62 3.26953C367.265 6.14571 371.854 10.7352 374.73 16.3799C378 22.7972 378 31.1987 378 48V286C378 288.554 378 290.914 377.988 293.103C377.968 297.005 377.957 298.956 377.082 300.658C376.346 302.091 375.024 303.405 373.588 304.134C371.881 305 369.834 305 365.739 305H328.408C325.282 305 322.334 306.462 320.443 308.952L304.649 329.754C303.009 331.914 300.808 334 298.095 334H286.217C282.775 334 281.055 334 279.934 333.665C278.362 333.195 278.487 333.261 277.209 332.232C276.297 331.499 274.243 328.514 270.136 322.544C266.17 316.779 259.526 313 252 313H128C120.474 313 113.83 316.779 109.864 322.544C105.757 328.514 103.703 331.499 102.791 332.232C101.513 333.261 101.638 333.195 100.066 333.665C98.9453 334 97.2246 334 93.7831 334H79.8815C77.2659 334 75.1402 331.999 73.5908 329.892L57.5518 308.076C55.6674 305.513 52.6761 304 49.4951 304H12.3305C8.18 304 6.10473 304 4.39651 303.132C2.94977 302.397 1.64214 301.094 0.901822 299.65C0.0276937 297.944 0.0206606 295.95 0.00659464 291.963C2.40291e-05 290.1 -4.40241e-10 288.117 0 286V48C0 31.1987 -0.000137434 22.7972 3.26953 16.3799C6.14568 10.7352 10.7352 6.14571 16.3799 3.26953C22.7972 -0.00027298 31.1984 0 48 0H330Z"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1"
              />
            </svg>
          )}



          {/* {only sqad tab svg border stuff} */}
          {mode === 'squad' && !isInfoOpen && (
            <svg
              viewBox="0 0 380 681"
              className="w-full h-full"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <mask id="path-1-inside-1_10925_4871" fill="white">
                <path d="M330 338C346.802 338 355.203 338 361.62 341.27C367.265 344.146 371.854 348.735 374.73 354.38C378 360.797 378 369.199 378 386V633C378 649.801 378 658.203 374.73 664.62C371.854 670.265 367.265 674.854 361.62 677.73C355.203 681 346.801 681 330 681H48C31.1985 681 22.7972 681 16.3799 677.73C10.7353 674.854 6.14571 670.265 3.26953 664.62C-0.000251449 658.203 -3.49457e-09 649.801 0 633V386C0 369.199 -0.000137434 360.797 3.26953 354.38C6.14568 348.735 10.7352 344.146 16.3799 341.27C22.7972 338 31.1984 338 48 338H93.7835C97.225 338 98.9457 338 100.067 338.335C101.639 338.805 101.514 338.739 102.792 339.768C103.703 340.501 105.757 343.486 109.864 349.456C113.83 355.22 120.474 359 128 359H252C259.526 359 266.17 355.22 270.136 349.456C274.243 343.486 276.297 340.501 277.208 339.768C278.486 338.739 278.361 338.805 279.933 338.335C281.054 338 282.775 338 286.217 338H330ZM330 0C346.802 0 355.203 -0.000273228 361.62 3.26953C367.265 6.14571 371.854 10.7352 374.73 16.3799C378 22.7972 378 31.1987 378 48V286C378 302.801 378 311.203 374.73 317.62C371.854 323.265 367.265 327.854 361.62 330.73C355.203 334 346.801 334 330 334H286.217C282.775 334 281.055 334 279.934 333.665C278.362 333.195 278.487 333.261 277.209 332.232C276.297 331.499 274.243 328.514 270.136 322.544C266.17 316.779 259.526 313 252 313H128C120.474 313 113.83 316.779 109.864 322.544C105.757 328.514 103.703 331.499 102.791 332.232C101.513 333.261 101.638 333.195 100.066 333.665C98.9453 334 97.2246 334 93.7831 334H48C31.1985 334 22.7972 334 16.3799 330.73C10.7353 327.854 6.14571 323.265 3.26953 317.62C-0.000251449 311.203 -3.49457e-09 302.801 0 286V48C0 31.1987 -0.000137434 22.7972 3.26953 16.3799C6.14568 10.7352 10.7352 6.14571 16.3799 3.26953C22.7972 -0.00027298 31.1984 0 48 0H330Z" />
              </mask>
              <path d="M361.62 341.27L362.074 340.379L362.074 340.379L361.62 341.27ZM374.73 354.38L375.621 353.926L375.621 353.926L374.73 354.38ZM378 633H377H378ZM374.73 664.62L375.621 665.074H375.621L374.73 664.62ZM361.62 677.73L362.074 678.621H362.074L361.62 677.73ZM16.3799 677.73L15.9259 678.621H15.9259L16.3799 677.73ZM3.26953 664.62L2.37852 665.074H2.37853L3.26953 664.62ZM0 633H1H0ZM3.26953 354.38L2.37853 353.926L2.37852 353.926L3.26953 354.38ZM16.3799 341.27L15.9259 340.379L15.9259 340.379L16.3799 341.27ZM252 359V360V360V359ZM361.62 3.26953L362.074 2.37853L362.074 2.37852L361.62 3.26953ZM374.73 16.3799L375.621 15.9259L375.621 15.9259L374.73 16.3799ZM378 286H377H378ZM374.73 317.62L375.621 318.074L375.621 318.074L374.73 317.62ZM361.62 330.73L362.074 331.621L362.074 331.621L361.62 330.73ZM128 313V312V312V313ZM16.3799 330.73L15.9259 331.621L15.9259 331.621L16.3799 330.73ZM3.26953 317.62L2.37852 318.074L2.37853 318.074L3.26953 317.62ZM0 286H1H0ZM3.26953 16.3799L2.37853 15.9259L2.37852 15.9259L3.26953 16.3799ZM16.3799 3.26953L15.9259 2.37852L15.9259 2.37853L16.3799 3.26953ZM48 0V-1V0ZM279.934 333.665L279.647 334.623L279.934 333.665ZM270.136 322.544L270.96 321.977L270.136 322.544ZM277.209 332.232L277.836 331.453L277.209 332.232ZM270.136 349.456L269.312 348.889L270.136 349.456ZM277.208 339.768L276.581 338.989L277.208 339.768ZM279.933 338.335L280.22 339.293L279.933 338.335ZM109.864 322.544L110.688 323.111L109.864 322.544ZM102.791 332.232L103.418 333.011L102.791 332.232ZM100.066 333.665L99.7799 332.707L100.066 333.665ZM100.067 338.335L100.353 337.377L100.067 338.335ZM109.864 349.456L110.688 348.889L109.864 349.456ZM102.792 339.768L103.419 338.989L102.792 339.768ZM330 338V339C338.417 339 344.67 339.001 349.623 339.405C354.564 339.809 358.122 340.609 361.166 342.161L361.62 341.27L362.074 340.379C358.701 338.66 354.85 337.826 349.786 337.412C344.733 336.999 338.384 337 330 337V338ZM361.62 341.27L361.166 342.161C366.623 344.941 371.059 349.377 373.839 354.834L374.73 354.38L375.621 353.926C372.649 348.093 367.907 343.351 362.074 340.379L361.62 341.27ZM374.73 354.38L373.839 354.834C375.391 357.878 376.191 361.436 376.595 366.377C376.999 371.33 377 377.583 377 386H378H379C379 377.616 379.001 371.267 378.588 366.215C378.174 361.15 377.34 357.299 375.621 353.926L374.73 354.38ZM378 386H377V633H378H379V386H378ZM378 633H377C377 641.417 376.999 647.67 376.595 652.623C376.191 657.564 375.391 661.122 373.839 664.166L374.73 664.62L375.621 665.074C377.34 661.701 378.174 657.85 378.588 652.785C379.001 647.733 379 641.384 379 633H378ZM374.73 664.62L373.839 664.166C371.059 669.623 366.623 674.059 361.166 676.839L361.62 677.73L362.074 678.621C367.907 675.649 372.649 670.907 375.621 665.074L374.73 664.62ZM361.62 677.73L361.166 676.839C358.122 678.391 354.564 679.191 349.623 679.595C344.67 679.999 338.417 680 330 680V681V682C338.384 682 344.733 682.001 349.786 681.588C354.85 681.174 358.701 680.34 362.074 678.621L361.62 677.73ZM330 681V680H48V681V682H330V681ZM48 681V680C39.5828 680 33.3298 679.999 28.3773 679.595C23.4365 679.191 19.8781 678.391 16.8339 676.839L16.3799 677.73L15.9259 678.621C19.299 680.34 23.15 681.174 28.2145 681.588C33.2673 682.001 39.6158 682 48 682V681ZM16.3799 677.73L16.8339 676.839C11.3774 674.059 6.94084 669.623 4.16053 664.166L3.26953 664.62L2.37853 665.074C5.35058 670.907 10.0931 675.649 15.9259 678.621L16.3799 677.73ZM3.26953 664.62L4.16054 664.166C2.60945 661.122 1.80889 657.564 1.40528 652.623C1.00071 647.67 1 641.417 1 633H0H-1C-1 641.384 -1.00084 647.733 -0.588083 652.785C-0.174372 657.85 0.659825 661.701 2.37852 665.074L3.26953 664.62ZM0 633H1V386H0H-1V633H0ZM0 386H1C1 377.583 1.00074 371.33 1.40532 366.377C1.80894 361.436 2.60951 357.878 4.16054 354.834L3.26953 354.38L2.37852 353.926C0.659882 357.299 -0.174315 361.15 -0.58804 366.215C-1.00081 371.267 -1 377.616 -1 386H0ZM3.26953 354.38L4.16053 354.834C6.94081 349.377 11.3774 344.941 16.8339 342.161L16.3799 341.27L15.9259 340.379C10.0931 343.351 5.35055 348.093 2.37853 353.926L3.26953 354.38ZM16.3799 341.27L16.8339 342.161C19.8781 340.609 23.4364 339.809 28.3773 339.405C33.3298 339.001 39.5827 339 48 339V338V337C39.6157 337 33.2673 336.999 28.2144 337.412C23.1499 337.826 19.299 338.66 15.9259 340.379L16.3799 341.27ZM48 338V339H93.7835V338V337H48V338ZM109.864 349.456L109.04 350.023C113.185 356.047 120.131 360 128 360V359V358C120.817 358 114.476 354.394 110.688 348.889L109.864 349.456ZM128 359V360H252V359V358H128V359ZM252 359V360C259.869 360 266.815 356.047 270.96 350.023L270.136 349.456L269.312 348.889C265.524 354.394 259.183 358 252 358V359ZM286.217 338V339H330V338V337H286.217V338ZM330 0V1C338.417 1 344.67 1.00071 349.623 1.40527C354.564 1.80888 358.122 2.60944 361.166 4.16054L361.62 3.26953L362.074 2.37852C358.701 0.659815 354.85 -0.174383 349.786 -0.588091C344.733 -1.00085 338.384 -1 330 -1V0ZM361.62 3.26953L361.166 4.16053C366.623 6.94084 371.059 11.3774 373.839 16.8339L374.73 16.3799L375.621 15.9259C372.649 10.0931 367.907 5.35058 362.074 2.37853L361.62 3.26953ZM374.73 16.3799L373.839 16.8339C375.391 19.878 376.191 23.4365 376.595 28.3774C376.999 33.3299 377 39.5828 377 48H378H379C379 39.6158 379.001 33.2674 378.588 28.2145C378.174 23.15 377.34 19.299 375.621 15.9259L374.73 16.3799ZM378 48H377V286H378H379V48H378ZM378 286H377C377 294.417 376.999 300.67 376.595 305.623C376.191 310.564 375.391 314.122 373.839 317.166L374.73 317.62L375.621 318.074C377.34 314.701 378.174 310.85 378.588 305.785C379.001 300.733 379 294.384 379 286H378ZM374.73 317.62L373.839 317.166C371.059 322.623 366.623 327.059 361.166 329.839L361.62 330.73L362.074 331.621C367.907 328.649 372.649 323.907 375.621 318.074L374.73 317.62ZM361.62 330.73L361.166 329.839C358.122 331.391 354.564 332.191 349.623 332.595C344.67 332.999 338.417 333 330 333V334V335C338.384 335 344.733 335.001 349.786 334.588C354.85 334.174 358.701 333.34 362.074 331.621L361.62 330.73ZM330 334V333H286.217V334V335H330V334ZM270.136 322.544L270.96 321.977C266.815 315.953 259.869 312 252 312V313V314C259.183 314 265.524 317.606 269.312 323.111L270.136 322.544ZM252 313V312H128V313V314H252V313ZM128 313V312C120.131 312 113.185 315.953 109.04 321.977L109.864 322.544L110.688 323.111C114.476 317.606 120.817 314 128 314V313ZM93.7831 334V333H48V334V335H93.7831V334ZM48 334V333C39.5828 333 33.3298 332.999 28.3773 332.595C23.4365 332.191 19.8781 331.391 16.8339 329.839L16.3799 330.73L15.9259 331.621C19.299 333.34 23.15 334.174 28.2145 334.588C33.2673 335.001 39.6158 335 48 335V334ZM16.3799 330.73L16.8339 329.839C11.3774 327.059 6.94084 322.623 4.16053 317.166L3.26953 317.62L2.37853 318.074C5.35058 323.907 10.0931 328.649 15.9259 331.621L16.3799 330.73ZM3.26953 317.62L4.16054 317.166C2.60945 314.122 1.80889 310.564 1.40528 305.623C1.00071 300.67 1 294.417 1 286H0H-1C-1 294.384 -1.00084 300.733 -0.588083 305.785C-0.174372 310.85 0.659825 314.701 2.37852 318.074L3.26953 317.62ZM0 286H1V48H0H-1V286H0ZM0 48H1C1 39.5828 1.00074 33.3299 1.40532 28.3774C1.80894 23.4365 2.60951 19.878 4.16054 16.8339L3.26953 16.3799L2.37852 15.9259C0.659882 19.299 -0.174315 23.15 -0.58804 28.2145C-1.00081 33.2674 -1 39.6158 -1 48H0ZM3.26953 16.3799L4.16053 16.8339C6.94081 11.3774 11.3774 6.94084 16.8339 4.16053L16.3799 3.26953L15.9259 2.37853C10.0931 5.35058 5.35055 10.0931 2.37853 15.9259L3.26953 16.3799ZM16.3799 3.26953L16.8339 4.16054C19.8781 2.60944 23.4364 1.80888 28.3773 1.40527C33.3298 1.00071 39.5827 1 48 1V0V-1C39.6157 -1 33.2673 -1.00085 28.2144 -0.588091C23.1499 -0.174383 19.299 0.659815 15.9259 2.37852L16.3799 3.26953ZM48 0V1H330V0V-1H48V0ZM286.217 334V333C284.487 333 283.222 333 282.247 332.959C281.266 332.918 280.657 332.838 280.22 332.707L279.934 333.665L279.647 334.623C280.331 334.827 281.143 334.915 282.163 334.957C283.19 335 284.505 335 286.217 335V334ZM270.136 322.544L269.312 323.111C271.363 326.091 272.911 328.341 274.059 329.936C274.634 330.733 275.117 331.379 275.519 331.877C275.909 332.36 276.265 332.756 276.582 333.011L277.209 332.232L277.836 331.453C277.697 331.341 277.454 331.089 277.074 330.62C276.707 330.165 276.249 329.554 275.682 328.767C274.549 327.194 273.016 324.966 270.96 321.977L270.136 322.544ZM279.934 333.665L280.22 332.707C279.38 332.456 279.142 332.386 278.926 332.273C278.711 332.16 278.519 332.003 277.836 331.453L277.209 332.232L276.582 333.011C277.177 333.49 277.561 333.815 277.996 334.043C278.43 334.272 278.916 334.404 279.647 334.623L279.934 333.665ZM270.136 349.456L270.96 350.023C273.016 347.034 274.549 344.806 275.682 343.233C276.248 342.446 276.706 341.835 277.074 341.38C277.453 340.911 277.696 340.659 277.835 340.547L277.208 339.768L276.581 338.989C276.264 339.244 275.909 339.64 275.518 340.123C275.116 340.621 274.633 341.267 274.059 342.064C272.91 343.659 271.363 345.908 269.312 348.889L270.136 349.456ZM286.217 338V337C284.505 337 283.189 337 282.163 337.043C281.142 337.085 280.33 337.173 279.647 337.377L279.933 338.335L280.22 339.293C280.657 339.162 281.266 339.082 282.247 339.041C283.221 339 284.487 339 286.217 339V338ZM277.208 339.768L277.835 340.547C278.518 339.997 278.71 339.84 278.926 339.727C279.142 339.614 279.379 339.544 280.22 339.293L279.933 338.335L279.647 337.377C278.915 337.596 278.429 337.728 277.995 337.957C277.561 338.185 277.176 338.51 276.581 338.989L277.208 339.768ZM109.864 322.544L109.04 321.977C106.984 324.966 105.451 327.194 104.318 328.767C103.751 329.554 103.293 330.165 102.926 330.62C102.546 331.089 102.303 331.341 102.164 331.453L102.791 332.232L103.418 333.011C103.735 332.756 104.091 332.36 104.481 331.877C104.883 331.379 105.366 330.733 105.941 329.936C107.089 328.341 108.637 326.091 110.688 323.111L109.864 322.544ZM93.7831 334V335C95.495 335 96.8103 335 97.8367 334.957C98.8571 334.915 99.6691 334.827 100.353 334.623L100.066 333.665L99.7799 332.707C99.3425 332.838 98.7336 332.918 97.7531 332.959C96.7785 333 95.5127 333 93.7831 333V334ZM102.791 332.232L102.164 331.453C101.481 332.003 101.289 332.16 101.074 332.273C100.858 332.386 100.62 332.456 99.7799 332.707L100.066 333.665L100.353 334.623C101.084 334.404 101.57 334.272 102.004 334.043C102.439 333.815 102.823 333.49 103.418 333.011L102.791 332.232ZM93.7835 338V339C95.513 339 96.7789 339 97.7535 339.041C98.7341 339.082 99.343 339.162 99.7804 339.293L100.067 338.335L100.353 337.377C99.6695 337.173 98.8576 337.085 97.8371 337.043C96.8107 337 95.4954 337 93.7835 337V338ZM109.864 349.456L110.688 348.889C108.637 345.908 107.09 343.659 105.941 342.064C105.367 341.267 104.884 340.621 104.482 340.123C104.091 339.64 103.736 339.244 103.419 338.989L102.792 339.768L102.165 340.547C102.304 340.659 102.547 340.911 102.926 341.38C103.294 341.835 103.752 342.446 104.318 343.233C105.451 344.806 106.984 347.034 109.04 350.023L109.864 349.456ZM100.067 338.335L99.7804 339.293C100.621 339.544 100.858 339.614 101.074 339.727C101.29 339.84 101.482 339.997 102.165 340.547L102.792 339.768L103.419 338.989C102.824 338.51 102.439 338.185 102.005 337.957C101.571 337.728 101.085 337.596 100.353 337.377L100.067 338.335Z" fill="white" fill-opacity="0.3" mask="url(#path-1-inside-1_10925_4871)" />
            </svg>
          )}




          {/* Side icons sit in the SVG pockets; vertically centered with the Solo/Squad pill. */}
          {!isInfoOpen && (
            <>
              {mode !== 'squad' && (
                <div className="absolute left-3 top-[49.35%] -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white pointer-events-auto z-50 cursor-pointer">
                  <Link href="/beam-tv">
                    <button className={clsx('relative', 'h-10', 'w-10', 'l', 'p-3', 'shadow-md', 'hover:border-white', 'hover:scale-110', 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]', 'active:scale-95', 'active:border-b-2', 'transition-all', 'duration-300')}>
                      <img src="/tvfame.png" className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'object-contain')} />
                      <img src="/beamtv.png" className={clsx('absolute', 'inset-0', 'm-auto', 'w-[24px]', 'h-[24px]', 'object-contain', 'ml-1', 'mt-3')} />
                    </button>
                  </Link>
                </div>
              )}

              {mode !== 'squad' && (
                <div className="absolute right-3 top-[49.35%] -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white pointer-events-auto z-50 cursor-pointer">
                  <Link href="/cards">
                    <button
                      type="button"
                      className={clsx(
                        'relative',
                        'h-10',
                        'w-10',
                        'flex',
                        'items-center',
                        'justify-center',
                        'hover:scale-110',
                        'active:scale-95',
                        'transition-all',
                        'duration-300',
                      )}
                    >
                      <img
                        src="/hugeiconscards.svg"
                        alt="cards"
                        className={clsx('w-[42px]', 'h-[42px]', 'max-w-none', 'object-contain', '-m-[1px]')}
                      />
                    </button>
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Inner Solo/Squad pill: fill the SVG waist hole, inset equally so borders never kiss */}
          {!isInfoOpen && (
            <div
              className="absolute left-1/2 top-[49.35%] z-50 box-border p-1.5 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{ width: '45.9%', height: '6.75%' }}
            >
              <div className="relative flex h-full w-full rounded-full border border-white/50 shadow-inner cursor-pointer">
                <div
                  className={clsx(
                    "absolute top-1 bottom-1 w-[calc(50%-8px)] border bg-black/10 border-white/60 rounded-full transition-all duration-500",
                    mode === 'solo' ? "left-1" : "left-[calc(50%+4px)]"
                  )}
                />
                <button
                  onClick={() => setMode('solo')}
                  className={clsx(
                    "flex-1 rounded-full text-xs z-10 flex items-center justify-center cursor-pointer",
                    mode === 'solo' ? "text-white" : "text-white/70"
                  )}
                >
                  Solo
                </button>
                <button
                  onClick={() => setMode('squad')}
                  className={clsx(
                    "flex-1 rounded-full text-xs z-10 flex items-center justify-center cursor-pointer",
                    mode === 'squad' ? "text-white" : "text-white/70"
                  )}
                >
                  Squad
                </button>
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Info overview — root-level overlay so it fills the card like MobileHome / lander */}
      {isInfoOpen && (
        <AppOverviewPanel
          className="absolute z-[60] left-1/2 -translate-x-1/2 w-[95%] max-w-md top-20"
          style={{ bottom: Math.max(navbarHeight + 12, 88) }}
          onClose={() => setIsInfoOpen(false)}
        />
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
        <div className="relative z-10 w-full px-9 flex justify-between items-center ">



          {/* LEFT BUTTON (COINS) */}
          <div>
            <button
              className="h-12 min-h-12 px-4 flex items-center gap-2 border-[1px] border-b-[3px] border-white/50 rounded-full"
              onClick={() => setIsCoinModalOpen(true)}
            >
              <img src="/assets/Coin-token.svg" className="w-5 h-5" />
              <div className="text-sm font-semibold">{coins.toLocaleString()}</div>
              <img src="/assets/plus.png" className="w-4 h-4" />
            </button>
          </div>





          {/* RIGHT BUTTONS — above overview panel */}
          <div className='absolute right-8 z-[70] flex gap-2 items-center'>

            <AppOverviewToggle
              isOpen={isInfoOpen}
              onToggle={() => setIsInfoOpen((prev) => !prev)}
              className="h-14 w-14"
              iconClassName="h-[24px] w-[24px]"
            />

            {!isInfoOpen && (
              <button
                onClick={toggleFullscreen}
                className='group h-14 w-14 rounded-full border-[1px] border-b-[3px] border-white/60 shadow-md transition-all duration-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] items-center justify-center flex'>
                <img src="/icon1.svg" alt="Prompt" className={clsx('h-[24px]', 'w-[24px]', 'transition-transform', 'duration-300', 'group-hover:scale-110')} />
              </button>
            )}



          </div>




        </div>

        {/* Main Content Area */}
        <div className="relative   z-10 flex-1 w-full max-w-xl mx-auto px-3 flex flex-col items-center justify-center gap-1">

          <MeetLogo
            activeCount={activeUsers}
            className={clsx('mt-[8%]', isInfoOpen && 'opacity-0 pointer-events-none')}
          />

          {/* Mic/Audio Controls */}
          {canSquadMeet && (
            <div className="flex items-center w-[28%] mx-auto gap-2 rounded-full bg-[#0A032D]/20 px-[19px] py-[1vh] ">

              <button
                onClick={() => setSquadLobbyMicMuted?.((prev) => !prev)}
                className={clsx(
                  'p-[0.8vh] rounded-full border',
                  squadLobbyMicMuted
                    ? 'border-red-400 bg-red-500/20 text-red-100'
                    : 'border-none text-white'
                )}
              >
                {squadLobbyMicMuted ? <IoMicOff /> : <IoMic />}
              </button>

              <button
                onClick={() => setSquadLobbyAudioOff?.((prev) => !prev)}
                className={clsx(
                  'p-[0.8vh] rounded-full border',
                  squadLobbyAudioOff
                    ? 'border-yellow-400 bg-yellow-500/20 text-yellow-100'
                    : 'border-none text-white'
                )}
              >
                {squadLobbyAudioOff ? <IoVolumeMute /> : <IoVolumeHigh />}
              </button>

            </div>
          )}



        </div>





      </div>

















      {/* {only solo tab buttons} */}
      {mode !== 'squad' && (
        <div
          className={clsx(
            'absolute bottom-[25%] sm:bottom-[20%] left-1/2 -translate-x-1/2 z-40 pointer-events-none w-full max-w-[520px] px-3 sm:px-4 transition-opacity duration-300',
            isInfoOpen && 'opacity-0 pointer-events-none',
          )}
        >
          <div className="w-full pointer-events-auto flex justify-center">
            <MeetNowButton
              onClick={handleMeetNow}
              isVideoOn={isVideoOn}
              onVideoClick={onVideoClick}
              className="
          w-[clamp(300px,85vw,520px)]
          aspect-[23/5]
        "
              iconClass="
          transition-all
          w-[clamp(25px,6.5vw,36px)]
          h-[clamp(25px,6.5vw,36px)]
          md:w-8
          md:h-8
          
        "
              borderClass="
          border
          border-b-[3px]
          md:border-b-[5px]
          md:border-[1.89px]
          rounded-[16px]
          md:rounded-[26px]
        "
            />
          </div>

          <FilterButtons
            onGenderClick={() => setIsGenderModalOpen(true)}
            onLocationClick={() => setIsLocationModalOpen(true)}
            genderLabel={
              genderFilter === "MALE" ? "Male" :
                genderFilter === "FEMALE" ? "Female" :
                  genderFilter === "NON_BINARY" ? "Non-binary" : "Both"
            }
            locationLabel={
              !myProfile?.preferredCity || myProfile.preferredCity === 'ANYWHERE_IN_INDIA'
                ? 'Anywhere'
                : myProfile.preferredCity.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
            }
            className="mt-6 pointer-events-auto w-[clamp(295px,65vw,520px)]"
          />
        </div>
      )}














      <div
        ref={navbarRef}
        className="absolute bottom-[1.5%] left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[94%] max-w-sm px-4 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="pointer-events-auto border border-white/50 rounded-full h-[64px] w-full flex items-center justify-between px-8 ">
          <button
            onClick={() => router.push('/')}
            className="text-white text-2xl hover:scale-125 transition-transform"
          >
            <img src="./mobhome.svg" alt="chat" className="w-[30px] h-[30px]" />
          </button>
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
              <span
                className={clsx(
                  'absolute',
                  'top-[9px]',
                  '-right-[10px]',
                  'w-[10px]',
                  'h-[10px]',
                  'bg-[#ACE723]',
                  'border-2',
                  'border-[#1ECB00]',
                  'z-50',
                  'rounded-full',
                  'shadow-[0_0_16px_8px_rgba(34,197,94,0.9),0_0_24px_8px_rgba(34,197,94,0.6),0_0_40px_12px_rgba(34,197,94,0.4)]'
                )}
              />
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






















      {mode === 'squad' && !isInfoOpen ? (
        <div className={`flex flex-col items-center w-full absolute ${canSquadMeet ? 'bottom-[15vh]' : 'bottom-[14vh]'}`}>

          {squadProductMessage && (
            <div
              role="alert"
              className="w-full rounded-2xl border border-red-400/40 bg-red-950/45 px-4 py-3 text-sm font-medium text-red-50"
            >
              {squadProductMessage}
            </div>
          )}

          <div className="flex flex-col gap-[2vh] mx-auto">

            {/* Avatars */}
            <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap">

              {/* Me */}
              <div className="flex flex-col items-center gap-1">
                <div className="h-[7.5vh] aspect-square rounded-full border-[3px] border-white/90 overflow-hidden bg-black/10">
                  <img
                    src={myProfile?.displayPictureUrl}
                    alt="me"
                    className="w-full h-full object-cover"
                  />
                </div>

                <span className="text-[10px] text-white/90 font-outfit">
                  Me
                </span>
              </div>

              {squadGuestIds?.slice(0, 2).map((guestId, i) => (
                <div key={`g-${i}`} className="flex items-center gap-5">

                  <img
                    src="/assets/plus.png"
                    alt=""
                    className="w-3 h-3 mb-4"
                  />

                  <div className="flex flex-col items-center gap-1">

                    <div className="relative h-[7.5vh] aspect-square  sm:w-18 sm:h-18">

                      <div className="w-full h-full rounded-full border-[3px] border-white/90 flex items-center justify-center overflow-hidden bg-black/10">

                        {guestId && guestProfiles?.[guestId]?.displayPictureUrl ? (
                          <img
                            src={guestProfiles[guestId].displayPictureUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : guestId ? (
                          <span className="text-xl text-white/60">…</span>
                        ) : (
                          <span className="text-xl font-outfit  font-bold  break-words text-white">?</span>
                        )}

                      </div>

                      {guestId && (
                        <button
                          type="button"
                          disabled={squadMemberActionBusyId === guestId}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSquadMember?.(guestId);
                          }}
                          className="absolute -top-[1px] -right-1 z-20 min-w-6 min-h-6 w-6 h-6 rounded-full bg-white border border-white/90 flex items-center justify-center overflow-hidden disabled:opacity-50"
                          aria-label="Remove squad member"
                        >
                          <span
                            className="font-bold text-[10px] mix-blend-difference"
                            style={{ color: "white" }}
                          >
                            ✕
                          </span>
                        </button>
                      )}

                    </div>

                    <span className="text-[10px] font-outfit text-white/90">
                      {guestId
                        ? displayUsername(guestProfiles?.[guestId]?.username, 'Friend')
                        : 'Who'}
                    </span>

                  </div>
                </div>
              ))}
            </div>



            {/* Share Icons */}
            <div className="flex items-center gap-4 rounded-full   bg-[#0A032D]/35 w-[100%] mx-auto py-2.5 px-8">

              <div className="flex-1 text-[11px] text-white/90 font-outfit">
                Share to
              </div>

              <button
                onClick={() => shareSquadInvite?.('generic')}
                disabled={squadShareBusy}
                className="p-1 hover:bg-white/10 rounded-full transition"
              >
                <img src="/shareicon3.svg" className="w-[3.1vh] h-[3.1vh]" alt="" />
              </button>

              <button
                onClick={() => shareSquadInvite?.('generic')}
                disabled={squadShareBusy}
                className="p-1 hover:bg-white/10 rounded-full transition"
              >
                <img src="/shareicon2.svg" className="w-[3.1vh] h-[3.1vh]" alt="" />
              </button>

              <button
                onClick={() => shareSquadInvite?.('whatsapp')}
                disabled={squadShareBusy}
                className="p-1 hover:bg-white/10 rounded-full transition"
              >
                <img src="/shareicon1.svg" className="w-[3.1vh] h-[3.1vh]" alt="" />
              </button>

              <button
                onClick={() => shareSquadInvite?.('copy')}
                disabled={squadShareBusy}
                className="p-1 hover:bg-white/10 rounded-full transition"
              >
                <img src="/shareicon4.svg" className="w-[3.1vh] h-[3.1vh]" alt="" />
              </button>

            </div>

          </div>

          {/* Squad CTA */}
          <div className="w-full mx-auto mt-[2vh]" >

            {canSquadMeet ? (
              <MeetNowButton
                onClick={handleSquadEnterCall}
                isSearching={squadMeetBusy}
                searchingText="Starting..."
                text="Meet Someone now"
                iconClass="text-sm transition-all h-4 w-4"
                className="w-[70%] h-16"
                borderClass="md:border-[1.8px] md:border-b-[4.4px] border border-b-[3px] md:rounded-[26px] rounded-[16px] mx-auto"
                isVideoOn={isVideoOn}
                onVideoClick={onVideoClick}
              />
            ) : (
              <div className="w-full max-w-[360px] mx-auto px-2">
                <SquadQuickInviteStrip
                  friends={quickInviteFriends}
                  busyId={quickInviteBusyId}
                  pendingInviteeIds={quickInvitePendingIds}
                  onInvite={(id) => handleQuickSquadInvite?.(id)}
                  onCancelInvite={(id) => handleQuickSquadCancelInvite?.(id)}
                  onSeeAll={() => setIsSquadInviteOpen(true)}
                  className="w-full"
                />
              </div>
            )}

          </div>

        </div>
      ) : null
      }








      {/* Modals */}
      <GenderModal
        isOpen={isGenderModalOpen}
        onClose={() => {
          setIsGenderModalOpen(false);
          setGenderFilter(localStorage.getItem("genderPreference") || "ALL");
        }}
        userCoins={coins}
        onCoinsUpdated={(cost) => {
          // Parent owns wallet when coins are passed in; otherwise update local.
          if (externalCoins === undefined) {
            setInternalCoins((prev) => Math.max(0, prev - (Number(cost) || 0)));
          }
          if (typeof onWalletRefresh === 'function') {
            void onWalletRefresh();
          }
        }}
        onStartBeaming={() => {
          setGenderFilter(localStorage.getItem("genderPreference") || "ALL");
          if (onMeetNow) onMeetNow();
        }}
      />
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => {
          setIsLocationModalOpen(false);
          fetchMyProfile();
        }}
      />
      <CoinModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        onSuccess={async ({ coinsCredited }) => {
          if (typeof onWalletRefresh === 'function') {
            await onWalletRefresh();
          } else {
            await fetchWalletBalance();
          }
          const credited = Number(coinsCredited) || 0;
          setPurchaseToast(
            credited > 0
              ? `Added ${credited.toLocaleString()} coins`
              : 'Coins added to your wallet'
          );
          window.setTimeout(() => setPurchaseToast(null), 3000);
        }}
      />
      {purchaseToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/80 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-outfit text-sm font-semibold">{purchaseToast}</span>
        </div>
      )}
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
    </div >
  );
}