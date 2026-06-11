'use client';
import { useState, useEffect } from 'react';
import {
  getNotificationBadgeCount,
  getNotificationCountThrottled,
  subscribeNotificationRealtime,
  subscribeNotificationCount,
} from '@/lib/notification-count';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const notifRes = await getNotificationCountThrottled();

        if (notifRes) {
          const count = getNotificationBadgeCount(notifRes);
          setUnreadCount((prev) => (prev === count ? prev : count));
        }
      } catch (e) {
        // fail silently
      }
    };

    const unsubscribe = subscribeNotificationCount((notifRes) => {
      const count = getNotificationBadgeCount(notifRes);
      setUnreadCount((prev) => (prev === count ? prev : count));
    });
    const unsubscribeRealtime = subscribeNotificationRealtime();

    fetchNotifications();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchNotifications();
    }, 30000);

    const onFocus = () => void getNotificationCountThrottled({ force: true, minGapMs: 5000 });
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void getNotificationCountThrottled({ force: true, minGapMs: 5000 });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      unsubscribe();
      unsubscribeRealtime();
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, []);

  return { unreadCount };
}
