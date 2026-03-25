'use client';

import React from 'react';
import { IoEllipsisVerticalSharp, IoLocationOutline, IoReorderThree } from 'react-icons/io5';

const FaceCard = ({ user }) => {
  if (!user) return null;

  return (
    <div className="w-[360px] h-[660px] rounded-[30px] p-[2px] border ">

      {/* MAIN BORDER WRAPPER */}
      <div className="w-full h-full rounded-[28px] overflow-hidden relative ">

        {/* HEADER */}
       <div className="absolute top-4 left-0 w-full px-6 z-20 flex justify-between items-center">

  <div>
    <h1 className="text-[#FFB800] text-[18px] font-semibold">
      {user.username || 'Shreyaa'}{' '}
      <span className="text-white font-medium">{user.age || 24}</span>
    </h1>

    <div className="flex items-center gap-1 text-xs text-white/80">
      <IoLocationOutline />
      <span>{user.city || 'Delhi, India'}</span>
    </div>
  </div>

  <div className="flex items-center gap-2">
    <button className="px-3 py-1 text-xs rounded-full border border-yellow-300 text-yellow-300">
      Squad
    </button>
    <img src="./broadcast.png" alt="" className="w-6 h-6" />
    <img src="./video-outline.png" alt="" className="w-6 h-6" />

    <button className="w-6 h-6 flex items-center justify-center text-white">
      <IoEllipsisVerticalSharp />
    </button>
  </div>

</div>

{/* 2nd border */}

<div className='absolute top-20 left-1 right-1 bottom-3 border border-white/50 rounded-[28px] '>

        {/* BIO */}
        <div className="absolute top-2 w-full px-1 z-20">
          <div className="rounded-[28px] border border-white/30 px-4 py-10 text-center text-white text-sm">
            {user.intent || 'Here to meet strangers and overthink later.'}
          </div>
        </div>

        {/* LEFT ICONS */}
        <div className="absolute left-3 top-[120px] z-20 flex flex-col gap-3 border border-white/50 p-2 rounded-full">
          {(user.brands?.length ? user.brands : [
            '/brands/samsung.png',
            '/brands/nike.png',
            '/brands/essentials.png',
            '/brands/ktm.png',
            '/brands/ktm.png'
          ]).map((b, i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-full bg-black/70 flex items-center justify-center border border-white/20 overflow-hidden"
            >
              <img src={b} className="w-7 h-7 object-contain" alt="" />
            </div>
          ))}
        </div>

        {/* IMAGE */}
 <div className="absolute top-[120px] right-2 w-[75%] bottom-[11px] rounded-[20px] overflow-hidden">
  <img
    src={user.displayPictureUrl || "/assets/placeholder-user.jpg"}
    className="w-full h-full object-cover"
    alt=""
  />
</div>
        {/* ZODIAC */}
        <div className="absolute left-3 bottom-28 z-20">
          <div className="w-14 h-14 rounded-[20px] border border-white/50 flex items-center justify-center text-white text-lg">
            ♎
          </div>
        </div>



<div className="absolute left-2 bottom-2 z-20">
 <div className="w-[65px] h-[100px] rounded-[24px] p-[2px]">

  {/* INNER BORDER */}
  <div className="w-full h-full rounded-t-[22px] rounded-b-[10px] border border-white/50 flex flex-col items-center justify-start  relative">

    {/* IMAGE */}
    <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden mt-1">
      <img
        src="/spotify1.png"
        className="w-full h-full object-cover"
        alt=""
      />
    </div>

    {/* LINE */}
    <div className="w-[70%] h-[1px] bg-white/30 mt-4"></div>

    {/* TEXT */}
 <div className="mt-2 text-center text-white">
  <p className="text-[10px] font-extralight tracking-wide">Rich Flex</p>
  <p className="text-[8px] text-white/70 font-extralight tracking-wide">Drake</p>
</div>

  </div>
</div>
</div>

        {/* DOTS */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 z-20">
          <div className="w-6 h-1 bg-white rounded-full" />
          <div className="w-2 h-1 bg-white/30 rounded-full" />
          <div className="w-2 h-1 bg-white/30 rounded-full" />
        </div>


         </div>

      </div>
    </div>
  );
};

export default FaceCard;