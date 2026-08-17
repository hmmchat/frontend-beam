import { useState } from 'react';
import { displayUsername } from '@/lib/username';

export default function ProfileCard({ user, profileCompletion, onPhotoUpload, uploading }) {
  const [imageError, setImageError] = useState(false);

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(user?.dateOfBirth);
  const completionPercentage = profileCompletion?.percentage || 0;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6">
      <div className="flex items-start gap-4 mb-6">
        {/* Profile Picture */}
        <div className="relative group">
          <div 
            onClick={onPhotoUpload}
            className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/30 0  meeting now group-hover:border-white/60 transition-all"
          >
            {user?.displayPictureUrl && !imageError ? (
              <img 
                src={user.displayPictureUrl} 
                alt={user.username}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-purple-600 flex items-center justify-center text-4xl">
                {user?.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">{displayUsername(user?.username)}</h1>
          <p className="text-white/60 text-sm mb-3">
            {age && `${age} years old`} • {user?.gender || 'Not specified'}
          </p>
          
          {/* DOB & Zodiac */}
          <div className="flex items-center gap-4 text-sm mb-3">
            <div>
              <p className="text-white/60">DOB</p>
              <p className="font-semibold">
                {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
              Y
            </div>
          </div>

          {/* Gender */}
          <div className="flex items-center gap-2 text-sm">
            <p className="text-white/60">Gender Identity</p>
            <div className="flex items-center gap-1">
              <span>{user?.gender === 'FEMALE' ? '♀' : user?.gender === 'MALE' ? '♂' : '⚧'}</span>
              <span className="font-semibold">{user?.gender || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* Completion Circle */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="#FFD700"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 35}`}
              strokeDashoffset={`${2 * Math.PI * 35 * (1 - completionPercentage / 100)}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">{Math.round(completionPercentage)}%</span>
          </div>
        </div>
      </div>

      {/* Facecard Button */}
      <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center gap-2 transition-all">
        <span>👁️</span>
        <span className="font-semibold">Facecard</span>
      </button>
    </div>
  );
}
