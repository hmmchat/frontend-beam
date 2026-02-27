'use client';

export default function FilterButtons({ 
  onGenderClick, 
  onLocationClick,
  genderLabel = "Both",
  locationLabel = "Location",
  className = ""
}) {
  return (
    <div className={`font-[family-name:var(--font-otomanopee)] border border-white/90 flex flex-row items-center justify-center gap-0 w-[80%] mx-auto border border-white/30 rounded-[20px] overflow-hidden ${className}`}>
      <button
        onClick={onGenderClick}
        className="flex-1 flex items-center justify-center w-full gap-2 px-6 py-4 bg-transparent text-white/80 font-medium hover:bg-white/10 transition"
      >
        <img src="/assets/gender-intersex.svg" alt="" className='w-6 h-6 opacity-60' />
        {genderLabel}
      </button>

      <div className="w-px h-12 bg-white/30"></div>

      <button
        onClick={onLocationClick}
        className="flex-1 flex items-center justify-center w-full gap-2 px-6 py-4 bg-transparent text-white/80 font-medium hover:bg-white/10 transition"
      >
        {locationLabel}
        <img src="/assets/location-pin.svg" alt="" className='w-6 h-6' />
      </button>
    </div>
  );
}
