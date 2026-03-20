'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { API } from '@/lib/api';

export default function PhotosOnboarding() {
  const router = useRouter();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch(API.USERS.GET_PHOTOS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    if (photos.length >= 4) {
      setError('Maximum 4 photos allowed');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      // For now, use placeholder URL
      // TODO: Integrate Cloudinary for real upload
      const photoUrl = 'https://via.placeholder.com/300';
      const order = photos.length; // 0, 1, 2, or 3

      const response = await fetch(API.USERS.ADD_PHOTO, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: photoUrl,
          order: order
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload photo');
      }

      // Refresh photos
      await fetchPhotos();
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(API.USERS.DELETE_PHOTO(photoId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      // Refresh photos
      await fetchPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      setError(error.message);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/music');
  };

  const handleContinue = () => {
    router.push('/onboarding/music');
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
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Step 2 of 7</span>
            <span className="text-sm text-white/60">{Math.round((2/7) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${(2/7) * 100}%` }}></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Add More Photos 📸</h1>
          <p className="text-white/70 text-lg">
            Upload up to 4 additional photos to complete your profile
          </p>
        </div>

        {/* Photos Grid */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Existing photos */}
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                <img 
                  src={photo.url} 
                  alt={`Photo ${photo.order + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: 4 - photos.length }).map((_, index) => (
              <div 
                key={`empty-${index}`}
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:border-white/60 hover:bg-white/5 transition-all"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">+</div>
                  <div className="text-sm text-white/60">Add Photo</div>
                </div>
              </div>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
            disabled={uploading || photos.length >= 4}
          />

          {uploading && (
            <div className="text-center text-yellow-300 mb-4">
              Uploading photo...
            </div>
          )}

          {error && (
            <div className="text-center text-red-300 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              {error}
            </div>
          )}

          <div className="text-center text-white/60 text-sm">
            <p>💡 <strong>Note:</strong> Photo upload currently uses placeholder URLs.</p>
            <p className="mt-1">For real uploads, Cloudinary integration is needed.</p>
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
            onClick={handleContinue}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-full font-semibold transition-all"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
