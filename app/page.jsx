"use client";

import React, { useState, useEffect } from 'react'
import MobileHome from '@/components/Mobile/MobileHome'
import DesktopHome from '@/components/Mobile/DesktopHome'
import MeetSomeoneDynamic from '@/components/Home/MeetSomeoneDynamic'
import MeetSomeoneNew from '@/components/Home/MeetSomeoneNew'
import { API, apiRequest } from '@/lib/api'

const MyComponent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSearchingOnMobile, setIsSearchingOnMobile] = useState(false);
  const [activeMeetingCount, setActiveMeetingCount] = useState(0);
  const [myProfile, setMyProfile] = useState(null);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    const isValidToken = (t) => {
      try {
        if (!t || t === 'null' || t === 'undefined' || t.split('.').length !== 3) return false;
        const payload = JSON.parse(atob(t.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) return false;
        return true;
      } catch (e) {
        return false;
      }
    };

    if (isValidToken(token)) {
      setIsLoggedIn(true);
      fetchInitialData();
    } else {
      setIsLoggedIn(false);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('currentRoom');
    }
    setLoading(false);
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Profile
      const meRes = await apiRequest(API.USERS.GET_ME).catch(() => null);
      if (meRes?.user) setMyProfile(meRes.user);

      // Active Meetings
      const metricsRes = await apiRequest(API.USERS.GET_ACTIVE_MEETINGS).catch(() => null);
      if (metricsRes && typeof metricsRes.count === 'number') {
        setActiveMeetingCount(metricsRes.count);
      }

      // Wallet
      const walletRes = await apiRequest(API.WALLET.GET_BALANCE).catch(() => null);
      if (walletRes) setCoins(walletRes.balance || 0);
    } catch (e) {}
  };

  if (loading) return null;

  if (isLoggedIn) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        {/* Mobile View */}
        <div className="block md:hidden h-full w-full">
           {!isSearchingOnMobile ? (
             <MeetSomeoneNew 
               onMeetNow={() => setIsSearchingOnMobile(true)}
               activeUsers={activeMeetingCount}
               myProfile={myProfile}
               coins={coins}
             />
           ) : (
             <MeetSomeoneDynamic initialIsSearching={true} />
           )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block h-full w-full">
          <MeetSomeoneDynamic />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className='hidden md:block h-full w-full'>
        <DesktopHome />
      </div>
      <div className='block md:hidden h-full w-full'>
        <MobileHome />
      </div>
    </div>
  )
}

export default MyComponent
