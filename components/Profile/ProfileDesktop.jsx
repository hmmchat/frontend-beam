"use client";

import Image from "next/image";
import { Pencil, Settings, Link2, ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";

export default function ProfileDesktop() {
  const [activeTab, setActiveTab] = useState("getmoney"); // "default" | "prompts"
  const icons = ["/edit.png", "/setting.png", "/bandage.png"];
  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center justify-start py-10 px-6 relative overflow-hidden">
      {/* stars bg */}

      <div className="absolute inset-0 -z-10 pointer-events-none">
        <Image
          src="/test.png"
          alt="background"
          fill
          className="object-cover opacity-30 bg-no-repeat"
          priority
        />
      </div>

      {/* top bar */}
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

      {/* main card */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 border border-white/20 rounded-[3rem] p-3 z-10">
        {/* left panel */}
        <div className="col-span-1 border border-white/20 rounded-[3rem] p-6 flex flex-col items-center text-center justify-center">
          <div className="relative">
            {/* Profile with white ring */}
            <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
              <Image
                src="/loadingpage.png"
                alt="profile"
                width={120}
                height={120}
                className="rounded-full object-cover h-30 w-30"
              />
            </div>

            {/* Outer faint circle (behind gift) */}
            <div className="absolute bottom-0 right-[-10] w-14 h-14 rounded-full border border-white/40 flex items-center justify-center">
              {/* Gift inside */}
              <div className="relative w-10 h-10 rounded-full flex items-center justify-center">
                <Image
                  src="/gift/gift8.png"
                  alt="gift"
                  fill
                  className="object-contain"
                />

                {/* Edit icon */}
                <div
                  onClick={() => setActiveTab("stickers")}
                  className="absolute -bottom-1 -right-4 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                >
                  <img src="/edit.png" alt="edit" className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
          <h2 className="mt-4 text-xl font-bold text-yellow-400">Eldzhey 29</h2>

          <div className="w-full mt-10 space-y-4 text-left px-4">
            <div
              onClick={() => setActiveTab("account")}
              className="flex items-center justify-between border-b border-white/20 pb-3 cursor-pointer"
            >
              <div>
                <p className="text-sm">My account</p>
                <p className="text-[10px] text-white/60">
                  Fill account details
                </p>
              </div>
              <span className="text-[9px] border border-white/40 px-2 py-1 rounded-full">
                60% complete
              </span>
              <span className="w-6 h-6 flex items-center justify-center border border-white rounded-full">
                ›
              </span>
            </div>

            <div
              onClick={() => setActiveTab("prompts")}
              className="flex items-center justify-between border-b border-white/20 pb-3 cursor-pointer"
            >
              <p className="text-sm">My Prompts</p>
              <span className="w-6 h-6 flex items-center justify-center border border-white rounded-full">
                ›
              </span>
            </div>

            <div
              onClick={() => setActiveTab("getmoney")}
              className="flex items-center justify-between border-b border-white/20 pb-3 cursor-pointer"
            >
              <div>
                <p className="text-sm">Get money</p>
                <p className="text-[10px] text-white/60">40 left to withdraw</p>
              </div>
              <span className="text-[9px] border border-white/40 px-3 py-1 rounded-full">
                💎 60
              </span>
              <span className="w-6 h-6 flex items-center justify-center border border-white rounded-full">
                ›
              </span>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm">Rewards & Referrals</p>
              <span className="w-6 h-6 flex items-center justify-center border border-white rounded-full">
                ›
              </span>
            </div>
          </div>
        </div>

        {/* right panel */}
        <div className="col-span-2 border border-white/20 rounded-[3rem] px-10 py-12 flex flex-col min-h-[650px]">
          {activeTab === "getmoney" ? (
            /* ================= DEFAULT VIEW ================= */
            <div className="flex flex-col items-center text-center h-full">
              <p className="text-sm text-white/80">
                Hmm. You being nice is paying back!!
              </p>

              <p className="text-sm text-white/60 mt-1">
                Just 💎 40 left to unlock
              </p>

              <h2 className="text-3xl font-bold mt-4 mb-10">₹7000</h2>

              <div className="w-full max-w-lg mb-12">
                <div className="h-5 border border-white rounded-full p-[3px] shadow-[0_4px_0_0_rgba(255,255,255,1)]">
                  <div className="h-full w-[10%] bg-white rounded-full" />
                </div>
              </div>

              <button className="flex items-center gap-3 border border-white px-6 py-3 rounded-[10.986px] text-lg shadow-[0_4px_0_0_rgba(255,255,255,1)] hover:bg-white hover:text-black transition">
                <span className="w-4 h-4 flex items-center justify-center border border-white/40 rounded-full">
                  +
                </span>
                Add withdrawal method
              </button>

              <div className="mt-auto text-sm text-white/70 space-y-6 text-left w-full pt-12">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 flex items-center justify-center border border-white rounded-full">
                    ?
                  </span>
                  <div>
                    <p className="font-medium text-white">
                      Learn How to earn diamonds?
                    </p>
                    <p className="text-white/80 text-xs">
                      You literally need to do nothing, it’s that simple
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <img src="/call.png" alt="" />
                  <p>Reach Support</p>
                </div>
              </div>
            </div>
          ) : activeTab === "prompts" ? (
            /* ================= PROMPTS VIEW ================= */
            <div className="flex flex-col px-14">
              {/* top card */}
              <div className="border border-white/30 rounded-3xl p-12 text-center text-sm text-white/90">
                Full-time trash-talker, part-time sniper. Full-time tras
                Full-time trash-talker Full-time trash-talker, part-time sniper.
              </div>

              {/* suggestions */}
              <div className="text-left mt-8">
                <p className="text-sm mb-4 text-white/70">Suggestions</p>

                <div className="flex flex-wrap gap-3">
                  {[
                    "Do you know what happened today in our boy’s GC",
                    "Long Day, need to rant",
                    "How many stars are there in galaxy?",
                    "I want to see someone Dance on Drake",
                    "My pizza fell today",
                    "Mom scolded today. Need moral support.",
                    "My mom cooked epic food today. Soo daymmn fooking good!",
                  ].map((text, i) => (
                    <div
                      key={i}
                      className="px-4 py-4 border border-white/30 rounded-xl text-xs 
      shadow-[0_3px_0_0_rgba(255,255,255,0.4)]
      hover:bg-white hover:text-black transition cursor-pointer"
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>
              {/* refresh button */}
              <div className="mt-auto -mr-10 flex justify-end">
                <div className="w-10 h-10 border border-white rounded-full flex items-center justify-center cursor-pointer">
                  <img src="/refresh.png" alt="refresh" className="p-2" />
                </div>
              </div>
            </div>
          ) : activeTab === "account" ? (
            <div className="flex flex-col h-full md:px-16 px-2">
              {/* OUTER BOX */}
              <div className="border border-white/40 p-2 rounded-3xl">
                {/* QUOTE */}
                <div className="w-full max-w-xl mx-auto border border-white/40 rounded-3xl md:p-10 p-4 text-center text-xs md:text-sm text-white/90 mb-3">
                  Here to meet strangers and overthink later.
                </div>

                {/* MAIN CONTENT */}
                <div className="flex flex-col md:flex-row items-center justify-center md:gap-4 gap-4">
                  {/* ICON SECTION */}
                  <div className="flex md:flex-col flex-row md:gap-2 gap-3 overflow-x-auto md:overflow-visible w-full md:w-auto">
                    {/* PROFILE ICONS */}
                    <div className="flex md:flex-col flex-row gap-2 border border-white/30 md:rounded-full rounded-2xl p-2">
                      {[
                        "/profile/p2.png",
                        "/profile/p1.png",
                        "/profile/p3.png",
                        "/profile/p4.png",
                        "/profile/p5.png",
                      ].map((src, i) => (
                        <div
                          key={i}
                          className="h-12 w-12 md:h-14 md:w-14 rounded-full border border-white/30 flex items-center justify-center shrink-0"
                        >
                          <Image
                            src={src}
                            alt="brand"
                            width={50}
                            height={50}
                            className="object-contain"
                          />
                        </div>
                      ))}
                    </div>

                    {/* EXTRA CARDS */}
                    <div className="flex md:flex-col flex-row gap-2 mt-2 md:mt-2">
                      {/* PIECES */}
                      <div className="w-12 h-12 md:w-14 md:h-14 border border-white/40 rounded-xl flex flex-col items-center justify-center text-[10px] shrink-0">
                        <span className="text-sm md:text-lg">♎</span>
                        Pieces
                      </div>

                      {/* MUSIC */}
                      <div className="w-14 h-16 md:w-16 md:h-20 border border-white/40 rounded-xl overflow-hidden flex flex-col items-center justify-end text-[10px] text-center shrink-0">
                        <Image
                          src="/music.png"
                          alt="music"
                          width={60}
                          height={60}
                          className="object-cover"
                        />
                        <p className="pb-1">Starboy</p>
                      </div>
                    </div>
                  </div>

                  {/* MAIN IMAGE */}
                  <div className="w-full md:w-auto flex justify-center">
                    <div className="w-full max-w-[280px] md:w-[320px] md:h-[480px] h-[380px] rounded-xl overflow-hidden">
                      <Image
                        src="/assets/ico.png"
                        alt="profile large"
                        width={300}
                        height={400}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Title */}
              <div className="mb-6">
                <p className="text-white font-semibold">Your Stickers</p>
                <p className="text-xs text-white/60 mt-1">
                  Apply a sticker next to your profile photo. <br />
                  Stickers expire 7 days after you receive them
                </p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-5 gap-2 px-18">
                {[
                  "/stickers/s1.png",
                  "/stickers/s2.png",
                  "/stickers/s3.png",
                  "/stickers/s4.png",
                  "/stickers/s5.png",
                  "/stickers/s6.png",
                  "/stickers/s7.png",
                  "/stickers/s8.png",
                  "/stickers/s9.png",
                  "/stickers/s10.png",
                  "/stickers/s11.png",
                  "/stickers/s12.png",
                  "/stickers/s13.png",
                  "/stickers/s1.png",
                  "/stickers/s2.png",
                  "/stickers/s3.png",
                  "/stickers/s4.png",
                  "/stickers/s5.png",
                  "/stickers/s6.png",
                  "/stickers/s7.png",
                  "/stickers/s8.png",
                  "/stickers/s9.png",
                  "/stickers/s10.png",
                  "/stickers/s11.png",
                  "/stickers/s12.png",
                ].map((src, i) => (
                  <div
                    key={i}
                    className="items-center justify-center cursor-pointer"
                  >
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

              {/* Bottom controls */}
              <div className="mt-auto flex items-center justify-between pt-10">
                <button className="flex items-center gap-2 text-sm text-white/70">
                  <span className="w-6 h-6 border border-white rounded-full flex items-center justify-center">
                    -
                  </span>
                  Remove sticker
                </button>

                <button className="px-6 py-2 border border-white rounded-full shadow-[0_4px_0_0_rgba(255,255,255,0.6)] hover:bg-white hover:text-black transition">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
