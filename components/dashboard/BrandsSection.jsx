import { useRouter } from 'next/navigation';

export default function BrandsSection({ brands }) {
  const router = useRouter();

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Brands</h2>
        <button 
          onClick={() => router.push('/onboarding/brands')}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
        >
          +
        </button>
      </div>
      <div className="flex gap-3 flex-wrap">
        {brands?.slice(0, 5).map((bp) => (
          <div key={bp.id} className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
            {bp.brand?.emoji || '🏷️'}
          </div>
        ))}
        {(!brands || brands.length === 0) && (
          <div className="text-white/60 text-sm">No brands selected yet</div>
        )}
      </div>
    </div>
  );
}
