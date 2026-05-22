'use client';

export default function IcebreakerToast({ isOpen, icebreaker }) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-[78%] right-[10%] md:right-[54%] z-40 animate-in fade-in slide-in-from-top-4 flex justify-end">

      <div className="relative px-8 py-4 rounded-2xl bg-[#1B1B1B]/80 border border-white/20 shadow-2xl max-w-md text-center overflow-hidden">

        {/* Background */}


        {/* Dark overlay (important for readability) */}
        <div className="absolute inset-0  z-0" />

        {/* Content */}
        <div className="relative z-10 font-otomanopee">

          <p className="text-white text-[10px]  ">
            {icebreaker}
          </p>
        </div>

      </div>
    </div>
  );
}