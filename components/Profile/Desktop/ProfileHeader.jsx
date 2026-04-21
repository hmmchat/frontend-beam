"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfileHeader({ icons }) {
  const router = useRouter();
  return (
    <div className="z-10 mb-8 flex w-full max-w-5xl items-center justify-between px-4">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="flex items-center gap-3 rounded-xl py-1 pr-2 text-left text-white hover:bg-white/10 transition-colors"
        aria-label="Back to home"
      >
        <span className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center shrink-0">
          <ArrowLeft size={18} />
        </span>
        <span className="text-md font-medium">My Profile</span>
      </button>

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
