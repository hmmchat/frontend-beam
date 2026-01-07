'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const response = await fetch('http://localhost:3002/me', {
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

    fetchProfile();
  }, [router]);

  const handlePhotoUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      // For now, create a local preview URL
      // TODO: Integrate Cloudinary for real upload
      const photoUrl = URL.createObjectURL(file);
      
      // Update profile with new photo
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3002/me/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayPictureUrl: 'https://via.placeholder.com/150' // Placeholder for now
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update photo');
      }

      // Show preview locally
      setUser(prev => ({
        ...prev,
        displayPictureUrl: photoUrl
      }));

      alert('Photo uploaded! (Using placeholder URL for now)');
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Welcome to HMM! 🎉</h1>
        
        {user && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="flex items-center gap-6 mb-6">
              <div className="relative group">
                {user.displayPictureUrl && (
                  <img 
                    src={user.displayPictureUrl} 
                    alt={user.username}
                    className="w-24 h-24 rounded-full border-4 border-white/30 object-cover"
                  />
                )}
                {/* Upload overlay */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="text-white text-sm">Change</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                  disabled={uploading}
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{user.username}</h2>
                <p className="text-white/70">{user.gender}</p>
                {uploading && <p className="text-yellow-300 text-sm mt-1">Uploading...</p>}
                {uploadError && <p className="text-red-300 text-sm mt-1">{uploadError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-white/60 text-sm">Status</p>
                <p className="text-xl font-semibold">{user.status || 'OFFLINE'}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-white/60 text-sm">Profile Completed</p>
                <p className="text-xl font-semibold">{user.profileCompleted ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
              <p className="text-green-300 font-semibold">✅ Profile Created Successfully!</p>
              <p className="text-white/70 text-sm mt-1">
                Your profile has been created. You can now explore the app!
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold mb-3">Next Steps:</h3>
              <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <p className="font-medium">1. Add More Photos 📸</p>
                <p className="text-white/60 text-sm">Upload up to 4 additional photos</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <p className="font-medium">2. Add Music Preferences 🎵</p>
                <p className="text-white/60 text-sm">Share your favorite songs</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <p className="font-medium">3. Select Brand Preferences 🏷️</p>
                <p className="text-white/60 text-sm">Choose your favorite brands</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <p className="font-medium">4. Add Interests & Values 💡</p>
                <p className="text-white/60 text-sm">Tell us what you're passionate about</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <p className="font-medium">5. Set Your Location 📍</p>
                <p className="text-white/60 text-sm">Find people nearby</p>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full px-6 py-3 font-semibold transition-all"
              >
                Setup Later
              </button>
              <button
                onClick={() => router.push('/onboarding/photos')}
                className="flex-1 bg-purple-600 hover:bg-purple-700 rounded-full px-6 py-3 font-semibold transition-all"
              >
                Continue Setup →
              </button>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm">
                💡 <strong>Note:</strong> Photo upload currently uses placeholder URLs. 
                For real photo uploads, Cloudinary integration is needed.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              localStorage.clear();
              router.push('/');
            }}
            className="text-white/60 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
