'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';

export default function MusicOnboarding() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(API.USERS.SEARCH_MUSIC(searchQuery, 10));
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.songs || []);
    } catch (error) {
      console.error('Error searching songs:', error);
      setError('Failed to search songs. Make sure Spotify credentials are configured in backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSong = (song) => {
    setSelectedSong(song);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');

      if (selectedSong) {
        // Step 1: Create/get music preference
        const createResponse = await fetch(API.USERS.CREATE_MUSIC_PREFERENCE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            songName: selectedSong.name,
            artistName: selectedSong.artist,
            albumArtUrl: selectedSong.albumArtUrl,
            spotifyId: selectedSong.spotifyId
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create music preference');
        }

        const data = await createResponse.json();
        const musicPref = data.song;

        // Step 2: Update user's music preference
        const updateResponse = await fetch(API.USERS.UPDATE_MUSIC_PREFERENCE, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            musicPreferenceId: musicPref.id
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update music preference');
        }
      }

      // Success! Move to next step
      router.push('/onboarding/brands');
    } catch (error) {
      console.error('Error saving music preference:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/brands');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Step 3 of 7</span>
            <span className="text-sm text-white/60">{Math.round((3/7) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${(3/7) * 100}%` }}></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">What's Your Vibe? 🎵</h1>
          <p className="text-white/70 text-lg">
            Search and select your favorite song
          </p>
        </div>

        {/* Search */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for a song or artist..."
              className="flex-1 bg-white/10 border-2 border-white/20 rounded-xl px-5 py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/60"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && (
            <div className="text-red-300 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Selected Song */}
          {selectedSong && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-300 font-semibold mb-2">✅ Selected:</p>
              <div className="flex items-center gap-4">
                {selectedSong.albumArtUrl && (
                  <img 
                    src={selectedSong.albumArtUrl} 
                    alt={selectedSong.name}
                    className="w-16 h-16 rounded-lg"
                  />
                )}
                <div>
                  <p className="font-semibold">{selectedSong.name}</p>
                  <p className="text-white/60 text-sm">{selectedSong.artist}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((song, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectSong(song)}
                  className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all ${
                    selectedSong?.spotifyId === song.spotifyId
                      ? 'bg-purple-600/30 border-2 border-purple-500'
                      : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                  }`}
                >
                  {song.albumArtUrl && (
                    <img 
                      src={song.albumArtUrl} 
                      alt={song.name}
                      className="w-12 h-12 rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{song.name}</p>
                    <p className="text-white/60 text-sm">{song.artist}</p>
                  </div>
                  {selectedSong?.spotifyId === song.spotifyId && (
                    <span className="text-green-400">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && !loading && searchQuery && (
            <div className="text-center text-white/60 py-8">
              No results found. Try a different search term.
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
