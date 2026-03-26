"use client";

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'


import MobileHome from '@/components/Mobile/MobileHome'
import DesktopHome from '@/components/Mobile/DesktopHome'
const MeetSomeoneDynamic = dynamic(() => import('@/components/Home/MeetSomeoneDynamic'), { ssr: false })

const MyComponent = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token || token === 'null' || token === 'undefined' || token.split('.').length !== 3) {
        setIsLoggedIn(false);
        setAuthChecked(true);
        return;
      }
      // If it's malformed, treat as logged out. Expiry is handled by backend 401.
      JSON.parse(atob(token.split('.')[1]));
      setIsLoggedIn(true);
    } catch (_) {
      setIsLoggedIn(false);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  // Cleanup invalid tokens (no state writes)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!authChecked || isLoggedIn) return;
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('currentRoom');
    } catch (_) {}
  }, [authChecked, isLoggedIn]);

  if (!isMounted) {
    return null;
  }

  if (isLoggedIn) {
    return <MeetSomeoneDynamic />;
  }

  return (
    <div>
      <div className='hidden md:block'>
        <DesktopHome />
      </div>
      <div className='block md:hidden'>
        <MobileHome />
      </div>
    </div>
  )
}

export default MyComponent
