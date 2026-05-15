'use client';

export default function IcebreakerToast({ isOpen, icebreaker }) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-32 left-1/2 z-40 -translate-x-1/2 animate-in fade-in slide-in-from-top-4">
      
      <div className="relative px-8 py-4 rounded-2xl border border-white/20 shadow-2xl max-w-md text-center overflow-hidden">
        
        {/* Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: "0.8",
          }}
        />

        {/* Dark overlay (important for readability) */}
        <div className="absolute inset-0  z-0" />

        {/* Content */}
        <div className="relative z-10 font-otomanopee">
          <p className="text-yellow-400 text-[10px] md:text-base font-black uppercase  mb-1">
            Icebreaker
          </p>
          <p className="text-white text-[10px] md:text-base md:font-black ">
            {icebreaker}
          </p>
        </div>

      </div>
    </div>
  );
}