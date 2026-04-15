"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function ProfileHeader({ icons }) {
  return (
    <div className="w-full max-w-5xl flex items-center justify-between mb-8 z-10 px-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center">
          <ArrowLeft size={18} />
        </div>
        <span className="text-md font-medium">My Profile</span>
      </div>

      <h1 className="text-3xl font-extrabold text-yellow-400 tracking-wide">
        beam
      </h1>

      <div className="flex items-center gap-3">
        {icons.map((src, i) => (
          <div
            key={i}
            className="w-10 h-10 border border-white rounded-full flex items-center justify-center"
          >
            <Image
              src={src}
              alt="icon"
              width={20}
              height={20}
              className="object-contain text-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
