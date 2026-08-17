import ProfileGuard from '@/components/auth/ProfileGuard';
import MeetSomeoneNew from '@/components/Home/MeetSomeoneNew';

export const metadata = {
  title: 'Meet Someone Dynamic | Beam',
  description: 'A dynamic mobile-friendly way to meet new people on Beam.',
};

export default function MeetSomeoneNewPage() {
  return (
    <ProfileGuard>
      <MeetSomeoneNew />
    </ProfileGuard>
  );
}
