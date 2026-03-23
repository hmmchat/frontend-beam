"use client";

import React, { useState, useEffect } from 'react'


import MobileHome from '@/components/Mobile/MobileHome'
import DesktopHome from '@/components/Mobile/DesktopHome'
import MeetSomeoneDynamic from '@/components/Home/MeetSomeoneDynamic'

const MyComponent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    const isValidToken = (t) => {
      try {
        if (!t || t === 'null' || t === 'undefined' || t.split('.').length !== 3) return false;
        // Check expiry
        const payload = JSON.parse(atob(t.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) return false;
        return true;
      } catch (e) {
        return false;
      }
    };

    if (isValidToken(token)) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      // Clear any stale tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('currentRoom');
    }
    setLoading(false);
  }, []);

  if (loading) return null;

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
