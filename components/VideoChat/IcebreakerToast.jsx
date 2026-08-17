'use client';

export default function IcebreakerToast({ isOpen, icebreaker }) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-[49%] right-[15%] z-40 animate-in fade-in slide-in-from-top-4 flex justify-end md:top-[78%] md:right-[54%]">
      <div className="relative max-w-[12.5rem] px-4 py-3 rounded-xl bg-[#1B1B1B]/80 shadow-2xl text-center overflow-hidden md:max-w-md md:px-8 md:py-4">
        <div className="absolute inset-0 z-0" />
        <div className="relative z-10 font-otomanopee">
          <p className="text-white text-[10px] font-outfit leading-snug break-words">
            {icebreaker}
          </p>
        </div>
      </div>
    </div>
  );
}