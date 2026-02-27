import { useRouter } from 'next/navigation';

export default function ValuesSection({ values }) {
  const router = useRouter();

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Values</h2>
        <button 
          onClick={() => router.push('/onboarding/values')}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
        >
          +
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {values?.map((value) => (
          <div key={value.id} className="px-4 py-2 rounded-full bg-white/10 text-sm">
            {value.value?.emoji} {value.value?.name}
          </div>
        ))}
        {(!values || values.length === 0) && (
          <div className="text-white/60 text-sm">No values selected yet</div>
        )}
      </div>
    </div>
  );
}
