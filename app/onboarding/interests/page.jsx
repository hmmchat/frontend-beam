'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';

export default function InterestsOnboarding() {
  const router = useRouter();
  const [interests, setInterests] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    try {
      const response = await fetch(API.USERS.GET_INTERESTS);
      
      if (!response.ok) {
        throw new Error('Failed to fetch interests');
      }

      const data = await response.json();
      setInterests(data.interests || []);
    } catch (error) {
      console.error('Error fetching interests:', error);
      setError('Failed to load interests');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interestId) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else {
        if (prev.length >= 4) {
          setError('Maximum 4 interests allowed');
          return prev;
        }
        setError('');
        return [...prev, interestId];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      if (selectedInterests.length > 0) {
        const response = await fetch(API.USERS.UPDATE_INTERESTS, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            interestIds: selectedInterests
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save interests');
        }
      }

      // Success! Move to next step
      router.push('/onboarding/values');
    } catch (error) {
      console.error('Error saving interests:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/values');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-2xl">Loading interests...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Step 5 of 7</span>
            <span className="text-sm text-white/60">{Math.round((5/7) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${(5/7) * 100}%` }}></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">What Are You Into? 💡</h1>
          <p className="text-white/70 text-lg">
            Select 1-4 interests that define you
          </p>
          <p className="text-purple-300 mt-2">
            {selectedInterests.length}/4 selected
          </p>
        </div>

        {/* Interests Grid */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
          {error && (
            <div className="text-red-300 mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {interests.map((interest) => (
              <div
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`p-6 rounded-xl 0  meeting now transition-all ${
                  selectedInterests.includes(interest.id)
                    ? 'bg-purple-600/30 border-2 border-purple-500 scale-105'
                    : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{interest.emoji || '💡'}</div>
                  <p className="font-semibold">{interest.name}</p>
                  {selectedInterests.includes(interest.id) && (
                    <span className="text-green-400 text-sm">✓ Selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {interests.length === 0 && (
            <div className="text-center text-white/60 py-12">
              No interests available. Please contact support.
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-semibold transition-all"
          >
            ← Back
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-semibold transition-all"
          >
            Skip for Now
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-full font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
