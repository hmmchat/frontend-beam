import { useRouter } from 'next/navigation';

export default function PhotosSection({ photos }) {
  const router = useRouter();

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Photos</h2>
        <button 
          onClick={() => router.push('/onboarding/photos')}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
        >
          +
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {photos?.slice(0, 3).map((photo) => (
          <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-white/10">
            <img src={photo.url} alt="Photo" className="w-full h-full object-cover" />
          </div>
        ))}
        {Array.from({ length: Math.max(0, 3 - (photos?.length || 0)) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-xl bg-white/10 flex items-center justify-center">
            <span className="text-4xl text-white/30">+</span>
          </div>
        ))}
      </div>
    </div>
  );
}
