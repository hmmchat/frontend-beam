"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** @param {{ icons: string[]; settingsIconIndex?: number }} props */
export default function ProfileHeader({ icons, settingsIconIndex = 1 }) {
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
        {icons.map((src, i) => {
          const isSettings = i === settingsIconIndex;
          const shellClass =
            "w-10 h-10 border border-white rounded-full flex items-center justify-center shrink-0";
          if (isSettings) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => router.push("/settings")}
                className={`${shellClass} transition-colors hover:bg-white/10`}
                aria-label="Settings"
              >
                <Image
                  src={src}
                  alt=""
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </button>
            );
          }
          return (
            <div key={i} className={shellClass}>
              <Image
                src={src}
                alt=""
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
