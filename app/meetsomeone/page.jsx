'use client';

import ProfileGuard from '@/components/auth/ProfileGuard';
import MeetSomeoneDynamic from '../../components/Home/MeetSomeoneDynamic';

export default function MeetSomeonePage() {
  return (
    <ProfileGuard>
      <MeetSomeoneDynamic />
    </ProfileGuard>
  );
}
