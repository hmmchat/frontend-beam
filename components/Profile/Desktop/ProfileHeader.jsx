"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import BeamColourLogo from "@/components/ui/BeamColourLogo";

const FACECARD_EDITOR_FROM_PROFILE = "/facecard?view=editor&from=profile";

/** @param {{ icons: string[]; editIconIndex?: number; settingsIconIndex?: number }} props */
export default function ProfileHeader({
  icons,
  editIconIndex = 0,
  settingsIconIndex = 1,
}) {
  const router = useRouter();
  return (
    <div className="z-10 mb-8 flex w-full max-w-5xl items-center justify-between px-4">
      <button
        type="button"
        onClick={() => { if (window.history.length > 1) { router.back(); } else { router.push("/"); } }}
        className="flex items-center gap-3 rounded-xl py-1 pr-2 text-left text-white "
        aria-label="Go back"
      >
        <span className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} />
        </span>
        <span className="text-md font-medium">My Profile</span>
      </button>


      <BeamColourLogo alt="beam" className="w-[140px]" />

      <div className="flex items-center gap-1">
        {icons.map((src, i) => {
          const isEdit = i === editIconIndex;
          const isSettings = i === settingsIconIndex;
          const shellClass =
            "w-12 h-12 border border-white rounded-full flex items-center justify-center shrink-0";
          if (isEdit) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => router.push(FACECARD_EDITOR_FROM_PROFILE)}
                className={`${shellClass} transition-colors hover:bg-white/10`}
                aria-label="Edit facecard"
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
