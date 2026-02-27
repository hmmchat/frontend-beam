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
        return t && t !== 'null' && t !== 'undefined' && t.split('.').length === 3;
      } catch (e) {
        return false;
      }
    };

    if (isValidToken(token)) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      if (token) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
      }
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
