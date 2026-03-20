'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';

export default function LocationOnboarding() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const requestLocation = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('Failed to get location. Please enable location permissions.');
        setLoading(false);
      }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      if (location) {
        const response = await fetch(API.USERS.UPDATE_LOCATION, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save location');
        }
      }

      // Success! Onboarding complete
      router.push('/facecard');
    } catch (error) {
      console.error('Error saving location:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/facecard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Step 7 of 7</span>
            <span className="text-sm text-white/60">100% Complete</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Where Are You? 📍</h1>
          <p className="text-white/70 text-lg">
            Share your location to find people nearby
          </p>
        </div>

        {/* Location Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
          {error && (
            <div className="text-red-300 mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
              {error}
            </div>
          )}

          {location ? (
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-green-300 font-semibold text-xl mb-2">Location Captured!</p>
              <p className="text-white/60 text-sm">
                Latitude: {location.latitude.toFixed(6)}<br />
                Longitude: {location.longitude.toFixed(6)}
              </p>
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📍</div>
              <p className="text-white/70 mb-6">
                We need your location to help you discover people nearby
              </p>
              <button
                onClick={requestLocation}
                disabled={loading}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-full font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Getting Location...' : 'Allow Location Access'}
              </button>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>🔒 Privacy:</strong> Your exact location is never shared publicly. 
              We only use it to show you people nearby.
            </p>
          </div>
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
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Complete Setup! 🎉'}
          </button>
        </div>
      </div>
    </div>
  );
}
