'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { clearPendingReferralCode } from '@/components/CaptureReferralFromUrl';

export default function ProfileGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token || token === 'null' || token === 'undefined') {
        router.replace('/');
        return;
      }

      try {
        const data = await apiRequest(API.USERS.GET_ME);
        const user = data?.user || data;

        if (!user || !user.username) {
          router.replace('/onboarding');
          return;
        }

        setAuthorized(true);
      } catch (err) {
        console.error('[ProfileGuard] Profile check failed:', err);

        if (err.status === 404 || err.message === 'Incomplete profile') {
          router.replace('/onboarding');
        } else if (err.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          clearPendingReferralCode();
          router.replace('/');
        } else {
          // Network error or unknown — redirect home to be safe
          router.replace('/');
        }
      }
    };

    checkProfile();
  }, [pathname, router]);

  // Don't render children until we've confirmed the user is authed + profile complete.
  // This prevents any flash of the protected page content before redirect fires.
  if (!authorized) return null;

  return children;
}
