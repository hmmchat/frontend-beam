import { useRouter } from 'next/navigation';

export default function InterestsSection({ interests }) {
  const router = useRouter();

  return (
    <div 
      onClick={() => interests?.length > 0 && router.push('/facecard/interests')}
      className={`bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6 ${interests?.length > 0 ? '0  meeting now hover:bg-white/15 transition-all' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Interests</h2>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            router.push('/onboarding/interests');
          }}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
        >
          +
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {interests?.map((interest) => (
          <div key={interest.id} className="px-4 py-2 rounded-full bg-white/10 text-sm">
            {interest.interest?.emoji} {interest.interest?.name}
          </div>
        ))}
        {(!interests || interests.length === 0) && (
          <div className="text-white/60 text-sm">No interests selected yet</div>
        )}
      </div>
    </div>
  );
}
