'use client';

export default function FilterButtons({ 
  onGenderClick, 
  onLocationClick,
  genderLabel = "Both",
  locationLabel = "Location",
  className = ""
}) {
  return (
    <div className={`font-[family-name:var(--font-otomanopee)] border  border-white/60 border-b-[3px] flex flex-row items-center justify-center gap-0  md:w-[50%] w-[86%] mx-auto rounded-[16px] overflow-hidden   ${className}`}>
      <button
        onClick={onGenderClick}
        className="flex-1 flex md:text-[14px] text-[12px] items-center justify-center w-full gap-2 px-6 py-5 bg-transparent text-white font-medium hover:bg-white/10 transition"
      >
        <img src="/assets/gender-intersex.svg" alt="" className='w-4 md:w-6 md:h-6 h-4' />
        {genderLabel}
      </button>

    <div className="w-[2px] self-stretch bg-white/30" />

      <button
        onClick={onLocationClick}
        className="flex-1 flex items-center justify-center w-full gap-2 px-6 py-5 bg-transparent text-white md:text-[14px] text-[12px]  hover:bg-white/10 transition"
      >
        {locationLabel}
        <img src="/assets/location-pin.svg" alt="" className='md:w-6 md:h-6 w-4 h-4' />
      </button>
    </div>
  );
}
