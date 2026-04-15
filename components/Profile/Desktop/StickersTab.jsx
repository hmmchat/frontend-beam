"use client";

import Image from "next/image";

export default function StickersTab() {
  const stickers = [
    "/stickers/s1.png", "/stickers/s2.png", "/stickers/s3.png", "/stickers/s4.png", "/stickers/s5.png",
    "/stickers/s6.png", "/stickers/s7.png", "/stickers/s8.png", "/stickers/s9.png", "/stickers/s10.png",
    "/stickers/s11.png", "/stickers/s12.png", "/stickers/s13.png", "/stickers/s1.png", "/stickers/s2.png",
    "/stickers/s3.png", "/stickers/s4.png", "/stickers/s5.png", "/stickers/s6.png", "/stickers/s7.png",
    "/stickers/s8.png", "/stickers/s9.png", "/stickers/s10.png", "/stickers/s11.png", "/stickers/s12.png",
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <p className="text-white font-semibold">Your Stickers</p>
        <p className="text-xs text-white/60 mt-1">
          Apply a sticker next to your profile photo. <br />
          Stickers expire 7 days after you receive them
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 px-16">
        {stickers.map((src, i) => (
          <div key={i} className="items-center justify-center cursor-pointer">
            <Image
              src={src}
              alt="sticker"
              width={70}
              height={70}
              className="object-contain"
            />
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-10">
        <button className="flex items-center gap-2 text-sm text-white/70">
          <span className="w-6 h-6 border border-white rounded-full flex items-center justify-center">
            -
          </span>
          Remove sticker
        </button>

        <button className="px-6 py-2 border border-white rounded-full border-b-4 hover:bg-white hover:text-black transition">
          Save
        </button>
      </div>
    </div>
  );
}
