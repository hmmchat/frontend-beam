'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InterestsView() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch('http://localhost:3002/me?fields=interests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  // Group interests by category (if available)
  const groupedInterests = {
    'Sports': user?.interests?.filter(i => i.interest?.category === 'sports') || [],
    'All': user?.interests || []
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white p-4 md:p-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-all"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">Interests</h1>
          <div className="w-10"></div>
        </div>

        {/* Description */}
        <p className="text-white/70 text-center mb-8">
          Short opening message showed to your matches at the beginning of the call to let them know what you wanna rap about.
        </p>

        {/* Interests by Category */}
        {Object.entries(groupedInterests).map(([category, interests]) => (
          interests.length > 0 && (
            <div key={category} className="mb-8">
              <h2 className="text-lg font-semibold mb-4">{category}</h2>
              <div className="flex flex-wrap gap-3">
                {interests.map((interest) => (
                  <div
                    key={interest.id}
                    className="px-6 py-3 rounded-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <span className="mr-2">{interest.interest?.emoji || '💡'}</span>
                    <span>{interest.interest?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}

        {(!user?.interests || user.interests.length === 0) && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💡</div>
            <p className="text-white/60 mb-6">No interests added yet</p>
            <button
              onClick={() => router.push('/onboarding/interests')}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-full font-semibold transition-all"
            >
              Add Interests
            </button>
          </div>
        )}

        {/* Edit Button */}
        {user?.interests && user.interests.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/onboarding/interests')}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-semibold transition-all"
            >
              Edit Interests
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
