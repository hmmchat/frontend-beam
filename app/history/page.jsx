"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaArrowLeftLong, FaHeart, FaMessage } from "react-icons/fa6";
import { IoVideocamOutline } from "react-icons/io5";
import { IoMdInformationCircleOutline } from "react-icons/io";

export default function History() {
  const router = useRouter();

  const groups = [
    {
      squad: false,
      date: "25 Aug 2025 | 22:34 IST",
      items: [{}],
    },
    {
      squad: true,
      date: "25 Aug 2025 | 22:34 IST",
      items: [{}, {}],
    },
    {
      squad: true,
      date: "25 Aug 2025 | 22:34 IST",
      items: [{}, {}],
    },
  ];

  return (
    <div className="h-screen w-full relative text-white overflow-hidden">

      {/* Background */}
      <div
        className="absolute inset-0 -z-50"
        style={{
          backgroundImage: "url('/assets/mb.jpg')",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
        }}
      />

      {/* Page Container */}
      <div className="h-full flex flex-col px-4 md:px-16 py-10 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 justify-between">
            <div className="flex items-center gap-2">
          <div 
            onClick={() => router.push('/')}
            className="border border-white rounded-full p-2 cursor-pointer hover:bg-white/10 transition-colors"
          >
            <FaArrowLeftLong />
          </div>
          <h1 className="text-lg font-medium">History</h1>

            </div>


          <div>
            <img src="./LOGO.png" alt="Logo" className="w-24 md:w-32" />
          </div>
        </div>

        {/* Main Card */}
<div className="flex-1 rounded-[40px] md:p-6  overflow-hidden 
                md:ring-2 md:ring-white/40 
                md:ring-offset-2 md:ring-offset-purple-900/80">


          <div className="h-full overflow-y-auto space-y-8 pr-2">

            {groups.map((group, gi) => (
              <div
                key={gi}
                className="border border-white/30 rounded-[36px] md:p-4 p-2 space-y-4"
              >


                  

                {group.items.map((_, i) => (
  <div
    key={i}
    className="border border-white/30 rounded-3xl p-5 space-y-4"
  >

    {/* Top row: Squad + Date */}
    <div className="flex items-center gap-3">
      {group.squad && (
        <p className="text-xs text-white px-3 py-1 border-2 border-[#FFBC2B] font-semibold rounded-full">
          Squad
        </p>
      )}

      <span className="text-xs text-white/70">
        {group.date}
      </span>

      <IoMdInformationCircleOutline  className="text-lg ml-auto"/>
    </div>

    {/* HR always */}
    <hr className="border-white/30" />

    {/* Card content */}
    <div className="flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full overflow-hidden">
          <Image
            src="/assets/avatar1.png"
            alt="user"
            width={56}
            height={56}
          />
        </div>

        <div className="space-y-1">
          <div className="font-medium">Shreya</div>
          <div className="text-sm text-white/70">📍 Kolkata</div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <IoVideocamOutline />
            32:28
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 border border-white/30 rounded-full grid place-items-center">
          <FaMessage/>
        </button>
        <button className="w-10 h-10 border border-white/30 rounded-full grid place-items-center">
          <FaHeart />
        </button>
      </div>
    </div>

  </div>
))}

              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}
