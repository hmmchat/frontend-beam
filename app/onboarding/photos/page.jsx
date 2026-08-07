'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import PortraitImageCropModal from '@/components/ui/PortraitImageCropModal';
import ErrorAlert from '@/components/ui/ErrorAlert';

const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const PROFILE_PHOTO_ACCEPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

async function readHttpErrorMessage(res) {
  try {
    const ct = res.headers.get('content-type');
    if (ct && ct.includes('application/json')) {
      const j = await res.json();
      if (typeof j === 'string') return j;
      const msg = j.message || j.error || j.detail;
      if (Array.isArray(msg)) return msg.filter(Boolean).join(' ');
      if (typeof msg === 'string' && msg.trim()) return msg;
      return `Request failed (${res.status})`;
    }
    const t = await res.text();
    return (t && t.trim()) || res.statusText || `HTTP ${res.status}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export default function PhotosOnboarding() {
  const router = useRouter();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState(null);

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
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const closeCropModal = () => {
    setCropModalOpen(false);
    setCropImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (photos.length >= 4) {
      setError('Maximum 4 photos allowed');
      return;
    }
    if (!PROFILE_PHOTO_ACCEPT_TYPES.includes(file.type)) {
      setError('Please choose a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setError('Image must be 10MB or smaller.');
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/');
      return;
    }
    setError('');
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
    setCropModalOpen(true);
  };

  const handleCroppedPhoto = async (file) => {
    const token = localStorage.getItem('accessToken');
    if (!token || photos.length >= 4) {
      closeCropModal();
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'profile-photos');

      const uploadRes = await fetch(
        `${API.FILES.UPLOAD}?folder=profile-photos&maxWidth=1600&maxHeight=2400&quality=88`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        const msg = await readHttpErrorMessage(uploadRes);
        throw new Error(msg || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      const photoUrl = uploadData?.file?.url;
      if (!photoUrl) {
        throw new Error('Upload succeeded but no file URL was returned.');
      }

      const order = photos.length;
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
        const msg = await readHttpErrorMessage(response);
        throw new Error(msg || 'Failed to save photo');
      }

      await fetchPhotos();
      setUploading(false);
      closeCropModal();
    } catch (err) {
      console.error('Error uploading photo:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to upload photo';
      setError(message);
      setUploading(false);
      // Keep crop modal open; ErrorAlert shows there too.
      throw err instanceof Error ? err : new Error(message);
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

      await fetchPhotos();
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
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
      <PortraitImageCropModal
        open={cropModalOpen && !!cropImageUrl}
        imageUrl={cropImageUrl}
        onClose={closeCropModal}
        onComplete={handleCroppedPhoto}
        busy={uploading}
      />
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
              <div key={photo.id} className="relative aspect-[2/3] rounded-lg overflow-hidden group">
                <img 
                  src={photo.url} 
                  alt={`Photo ${photo.order + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
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
                className="aspect-[2/3] rounded-lg border-2 border-dashed border-white/30 flex items-center justify-center hover:border-white/60 hover:bg-white/5 transition-all"
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
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onFileInputChange}
            disabled={uploading || photos.length >= 4}
          />

          {uploading && (
            <div className="text-center text-yellow-300 mb-4">
              Uploading photo...
            </div>
          )}

          {error && (
            <div className="mb-4 max-w-md mx-auto w-full px-1">
              <ErrorAlert message={error} className="mt-0" />
            </div>
          )}

          <p className="text-center text-white/60 text-sm">
            Photos use the same portrait shape as your face card. Adjust framing before saving.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-semibold transition-all"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-semibold transition-all"
          >
            Skip for Now
          </button>
          <button
            type="button"
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
