import { useRouter } from 'next/navigation';

export default function MusicSection({ musicPreference }) {
  const router = useRouter();

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Music</h2>
        <button 
          onClick={() => router.push('/onboarding/music')}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
        >
          +
        </button>
      </div>
      {musicPreference ? (
        <div className="flex items-center gap-4">
          {musicPreference.albumArtUrl && (
            <img 
              src={musicPreference.albumArtUrl} 
              alt={musicPreference.songName}
              className="w-16 h-16 rounded-xl"
            />
          )}
          <div>
            <p className="font-semibold">{musicPreference.songName}</p>
            <p className="text-white/60 text-sm">{musicPreference.artistName}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎵</div>
          <p className="text-white/60 text-sm">Tap to add music</p>
          <p className="text-white/40 text-xs">Artist name</p>
        </div>
      )}
    </div>
  );
}
