'use client';

import React from 'react';
import Image from 'next/image';
import { IoNotificationsOutline, IoLocationOutline } from 'react-icons/io5';

const FaceCard = ({ user, onRaincheck, onMeetPerson }) => {
  if (!user) return null;

  // Age calculation
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = user.age || calculateAge(user.dateOfBirth);

  return (
    <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-black group shadow-2xl">
      {/* 🔥 IMAGE BACKGROUND */}
      <div className="absolute inset-0">
        <img 
          src={user.displayPictureUrl || "/assets/placeholder-user.jpg"} 
          alt={user.username}
          className="w-full h-full object-cover "
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-[1]" />
      </div>

      {/* 🔥 TOP BAR */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-[3]">
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
          <IoLocationOutline className="text-white text-lg" />
          <div className="text-white text-xs">
            <p className="font-bold tracking-wide">{user.city || 'Delhi, India'}</p>
            <p className="text-[10px] opacity-80">2 miles away</p>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 hover:bg-white/30 transition-colors cursor-pointer">
          <IoNotificationsOutline className="text-white text-xl" />
        </div>
      </div>

      {/* 🔥 BRAND STRIP */}
      <div className="absolute top-24 left-10 right-10 z-[3]">
        <div className="bg-white/10 backdrop-blur-xl rounded-[24px] p-4 border border-white/20 shadow-2xl">
          <div className="flex justify-center gap-3">
            {(user.brands?.length > 0 ? user.brands.slice(0, 5) : [
              { name: 'NIKE' }, { name: 'ADIDAS' }, { name: 'BMW' }, { name: 'NVIDIA' }, { name: 'GUCCI' }
            ]).map((brand, i) => (
              <div
                key={i}
                className="w-12 h-12 bg-black/60 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/40 transition-all cursor-default group/brand"
              >
                <span className="text-white text-[10px] font-bold opacity-80 group-hover/brand:opacity-100 group-hover/brand:scale-110 transition-transform">
                  {(brand.name || brand).toString().slice(0, 2).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-white/50 mt-3 tracking-[0.2em] uppercase font-bold">
            Can't live w/o these
          </p>
        </div>
      </div>

      {/* 🔥 VERTICAL NAME & AGE (LEFT SIDE) */}
   

      {/* 🔥 BOTTOM FLOATING CARD (MUSIC & BIO) */}
      <div className="absolute bottom-10 left-8 right-8 z-[5]">









        <div className=" rounded-[20px] px-2 py-6 border border-white-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          {/* Music Section */}
       

          {/* Bio Section */}
      <div className="relative px-2">
  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-white text-4xl font-serif">
    “
  </span>

  <p className="text-white/90 text-sm font-medium leading-relaxed text-center italic">
    {user.intent || "Here to meet strangers and overthink later. Let's find beauty in the chaos."}
  </p>

  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-4xl font-serif">
    ”
  </span>
</div>



        </div>


        
      </div>




    </div>
  );
};

export default FaceCard;



//         {/* Navigation Dots */}
// <div className="flex justify-center gap-2.5 mt-6">
//           <div className="w-8 h-1.5 bg-white rounded-full transition-all" />
//           <div className="w-2 h-1.5 bg-white/30 rounded-full" />
//           <div className="w-2 h-1.5 bg-white/30 rounded-full" />
//         </div>








