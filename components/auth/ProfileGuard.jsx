'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { clearPendingReferralCode } from '@/components/CaptureReferralFromUrl';

export default function ProfileGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const token = localStorage.getItem('accessToken');
      
      // If no token, we can't be here in protected routes
      // (Pages should ideally handle their own guest vs user state, 
      // but if we are in a protected route, we redirect to home)
      if (!token) {
        if (pathname === '/') {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }
        router.push('/');
        return;
      }

      try {
        const data = await apiRequest(API.USERS.GET_ME);
        const user = data?.user || data;

        // Check if profile is complete (e.g., has a username)
        if (!user || !user.username) {
          throw new Error('Incomplete profile');
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error('[ProfileGuard] Profile check failed:', err);
        
        // If 404 or specific error, redirect to onboarding
        if (err.status === 404 || err.message === 'Incomplete profile') {
          if (pathname !== '/onboarding') {
            router.push('/onboarding');
            return;
          }
        } else if (err.status === 401) {
          // Token expired possibly
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          clearPendingReferralCode();
          router.push('/');
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [pathname, router]);

  return children;
}
