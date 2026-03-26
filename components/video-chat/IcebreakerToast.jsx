'use client';

export default function IcebreakerToast({ showIcebreaker, icebreaker }) {
  if (!showIcebreaker) return null;

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4">
      <div className="bg-purple-600/90 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white/20 shadow-2xl max-w-md text-center">
        <p className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Icebreaker</p>
        <p className="text-white text-base font-black leading-tight">{icebreaker}</p>
      </div>
    </div>
  );
}
