'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { IoSearchOutline, IoLocationOutline, IoCheckmarkCircle } from 'react-icons/io5';

export default function LocationOnboarding() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState(null);
  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(API.DISCOVERY.GET_ACTIVE_CITY_OPTIONS);
      // Expected shape from docs: Array of { value, label, faceCardImageUrl }
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setError('Failed to load cities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCity && selectedCity !== null) {
      setError('Please select a city to continue');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Update preferred city
      await apiRequest(API.USERS.UPDATE_PREFERRED_CITY, {
        method: 'PATCH',
        body: JSON.stringify({
          preferredCity: selectedCity
        })
      });

      // 2. Also try to get geolocation as secondary data if possible (silent)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            await apiRequest(API.DISCOVERY.LOCATE_ME, {
              method: 'POST',
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              })
            });
          } catch (e) {
            console.warn('Silent location update failed', e);
          }
        });
      }

      // Success! Onboarding complete
      router.push('/facecard');
    } catch (error) {
      console.error('Error saving location:', error);
      setError(error.message || 'Failed to save your preference');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/facecard');
  };

  const filteredCities = cities.filter(city => 
    city.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white/40 tracking-wider uppercase">Step 7 of 7</span>
            <span className="text-sm font-bold text-purple-400">Final Step</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-1000" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Where's the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">vibe?</span> 📍
          </h1>
          <p className="text-white/50 text-xl max-w-2xl mx-auto">
            Choose your city to find people who match your energy nearby.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-[1fr_350px] gap-8">
          <div className="space-y-6">
            {/* Search */}
            <div className="relative group">
              <IoSearchOutline className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 text-xl group-focus-within:text-purple-400 transition-colors" />
              <input
                type="text"
                placeholder="Search your city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all text-lg backdrop-blur-sm"
              />
            </div>

            {/* City Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-white/5 rounded-2xl animate-pulse" />
                ))
              ) : (
                <>
                  {/* Anywhere in India Option */}
                  <button
                    onClick={() => setSelectedCity(null)}
                    className={`relative aspect-[4/5] rounded-2xl border-2 transition-all overflow-hidden group ${
                      selectedCity === null
                        ? 'border-white bg-purple-500/10'
                        : 'border-white bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                      <p className="font-bold text-lg">Anywhere in India</p>
                      <p className="text-white/50 text-xs">National feed</p>
                    </div>
                    {selectedCity === null && (
                      <div className="absolute top-3 right-3 text-purple-400 text-2xl">
                        <IoCheckmarkCircle />
                      </div>
                    )}
                  </button>

                  {filteredCities.map((city) => (
                    <button
                      key={city.value}
                      onClick={() => setSelectedCity(city.value)}
                      className={`relative aspect-[4/5] rounded-2xl border-2 transition-all overflow-hidden group ${
                        selectedCity === city.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white bg-white/5 hover:border-white/20'
                      }`}
                    >
                      {city.faceCardImageUrl ? (
                        <img 
                          src={city.faceCardImageUrl} 
                          alt={city.label}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="absolute inset-0 " />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex flex-col justify-end p-4">
                        <p className="font-bold text-lg leading-tight">{city.label}</p>
                        <p className="text-white/50 text-xs">Active community</p>
                      </div>
                      {selectedCity === city.value && (
                        <div className="absolute top-3 right-3 text-purple-400 text-2xl animate-in zoom-in">
                          <IoCheckmarkCircle />
                        </div>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-shake">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
                <IoLocationOutline className="text-2xl text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Location Insights</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-6">
                Showing you cities with the most active users right now. Picking a city helps us group you with people in your area.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Real-time activity
                </div>
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Verified locations
                </div>
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  Privacy protected
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSave}
                disabled={saving || (!selectedCity && selectedCity !== null)}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-2xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(139,92,246,0.3)]"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Complete Onboarding'}
              </button>
              <button
                onClick={handleSkip}
                className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-medium transition-all text-white/60"
              >
                Let me choose later
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
}
