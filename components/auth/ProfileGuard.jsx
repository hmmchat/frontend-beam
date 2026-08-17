'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { clearPendingReferralCode } from '@/components/CaptureReferralFromUrl';
import { isMatchmakingProfileComplete } from '@/lib/profile-ready';

function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  clearPendingReferralCode();
}

export default function ProfileGuard({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token || token === 'null' || token === 'undefined') {
        router.replace('/');
        return;
      }

      // Auth account must still exist. Deleted accounts → sign-in, not onboarding.
      try {
        await apiRequest(API.AUTH.GET_STATUS);
      } catch (authErr) {
        if (
          authErr.status === 401 ||
          authErr.status === 403 ||
          authErr.status === 404
        ) {
          clearSession();
          router.replace('/');
          return;
        }
        // Network blip on status — still try profile; don't send to onboarding blindly.
      }

      try {
        const data = await apiRequest(API.USERS.GET_ME);
        const user = data?.user || data;

        if (!isMatchmakingProfileComplete(user)) {
          router.replace('/onboarding');
          return;
        }

        setAuthorized(true);
      } catch (err) {
        console.error('[ProfileGuard] Profile check failed:', err);

        if (err.status === 401 || err.status === 403) {
          clearSession();
          router.replace('/');
        } else if (err.status === 404 || err.message === 'Incomplete profile') {
          // Valid auth, missing profile → onboarding
          router.replace('/onboarding');
        } else {
          // Network error or unknown — don't redirect, user is still authed
          setAuthorized(true);
        }
      }
    };

    checkProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only — not on every pathname change

  // Don't render children until we've confirmed the user is authed + profile complete.
  // This prevents any flash of the protected page content before redirect fires.
  if (!authorized) return null;

  return children;
}
