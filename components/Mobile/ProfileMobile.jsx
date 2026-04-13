"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function ProfileMobile() {
  const [activeTab, setActiveTab] = useState("getmoney");
  const [selectedSticker, setSelectedSticker] = useState(3);

  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center pt-6 px-4 relative overflow-hidden">
      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/test.png"
          fill
          alt=""
          className="object-cover opacity-30"
        />
      </div>

      {/* ================= PROMPTS SCREEN ================= */}
      {activeTab === "prompts" ? (
        <div className="w-full flex flex-col">
          {/* TOP */}
          <div className="flex items-center gap-3 mb-6">
            <div
              onClick={() => setActiveTab("getmoney")}
              className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </div>
            <p className="text-base">My prompt</p>
          </div>

          {/* CARD */}
          <div className="border border-white/30 rounded-[2.5rem] p-5">
            {/* CURRENT PROMPT */}
            <div className="border border-white/30 rounded-2xl p-6 text-center text-sm mb-6">
              Full-time trash-talker, part-time sniper. Full-time tras Full-time
              trash-talker Full-time trash-talker, part-time sniper.
            </div>

            {/* SUGGESTIONS */}
            <div className="flex justify-between mb-4">
              <p>Suggestions</p>
              <div className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center">
                ↻
              </div>
            </div>

            {/* CHIPS */}
            <div className="flex flex-wrap gap-3">
              {[
                "Aj mummy ne geend faaaaad dinner banaya",
                "Aj to kwayzzzzzy Ho gaya bhai",
                "Up for pushup challenge??",
                "I want to see someone Dance on Drake",
                "Ta kaise ho aap sab",
                "today I will look to the side 😤",
                "Full-time trash-talker...",
              ].map((t, i) => (
                <div
                  key={i}
                  className="px-4 py-2 border border-white/30 rounded-full text-xs shadow-[0_4px_0_0_rgba(255,255,255,0.5)]"
                >
                  {t}
                </div>
              ))}
            </div>

            {/* INFO */}
            <div className="flex gap-3 mt-6 text-xs text-white/70">
              <div className="w-6 h-6 border border-white/40 rounded-full flex items-center justify-center">
                i
              </div>
              <p>
                Prompts show up as your opener <br />
                Say literally anything, it can be changed anytime.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="border border-white/30 rounded-2xl py-4 text-center mt-6 font-semibold">
            Meet Someone rn
          </div>
        </div>
      ) : activeTab === "rewards" ? (
        /* ================= REWARDS ================= */
        <div className="w-full flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div
              onClick={() => setActiveTab("getmoney")}
              className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </div>
            <p>Rewards and Referrals</p>
          </div>

          <div className="border border-white/30 rounded-3xl p-16 text-center">
            <p className="mb-2">Invite you gang and win</p>
            <p className="text-xl mb-6">🪙 100</p>

            <div className="w-40 h-40 bg-white rounded-xl mx-auto mb-6 flex items-center justify-center text-black">
              <img src="/qrcode.png" alt="" />
            </div>

            <div className="bg-black/20 rounded-full py-3">
              Ref- eral- code-12
            </div>
          </div>

          <div className="border border-white/30 rounded-3xl p-16 mt-6 text-center">
            <p className="mb-4">Share to</p>
            <div className="flex justify-center gap-6">
              <img src="/shareicon4.png" className="w-8 h-8" />
              <img src="/shareicon2.png" className="w-8 h-8" />
              <img src="/shareicon1.png" className="w-8 h-8" />
              <img src="/shareicon3.png" className="w-8 h-8" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ================= PROFILE ================= */}

          <div className="w-full flex justify-between mb-6">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 border rounded-full flex items-center justify-center">
                <ArrowLeft size={18} />
              </div>
              <p>My Profile</p>
            </div>

            <Image src="/setting.png" width={24} height={24} alt="" />
          </div>

          <div className="w-full border border-white/30 rounded-[2.5rem] p-6 flex flex-col items-center">
            {/* PROFILE */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white">
                <Image src="/loadingpage.png" width={120} height={120} alt="" />
              </div>

              <div className="absolute bottom-0 right-[-10px] w-14 h-14 border rounded-full flex items-center justify-center">
                <div className="relative w-10 h-10">
                  <Image src="/gift/gift8.png" fill alt="" />

                  <div
                    onClick={() => setActiveTab("stickers")}
                    className="absolute -bottom-1 -right-2 w-5 h-5 cursor-pointer"
                  >
                    <img src="/edit.png" />
                  </div>
                </div>
              </div>
            </div>

            <h2 className="mt-4 text-yellow-400 text-xl font-bold">
              Eldzhey 29
            </h2>

            {/* MENU */}
            <div className="w-full mt-8 space-y-5">
              <div className="flex justify-between border-b pb-3">
                <p>My account</p>
                <span>›</span>
              </div>

              <div
                onClick={() => setActiveTab("prompts")}
                className="flex justify-between border-b pb-3 cursor-pointer"
              >
                <p>My Prompts</p>
                <span>›</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <p>Get money</p>
                <span>›</span>
              </div>

              <div
                onClick={() => setActiveTab("rewards")}
                className="flex justify-between cursor-pointer"
              >
                <p>Rewards & Referrals</p>
                <span>›</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= STICKERS ================= */}

      {activeTab === "stickers" && (
        <div
          onClick={() => setActiveTab("getmoney")}
          className="fixed inset-0 bg-black/40 z-40"
        />
      )}

      <div
        className={`fixed bottom-0 w-full h-[60vh] bg-purple-900 rounded-t-[2rem] p-5 transition-transform duration-500 z-50 ${
          activeTab === "stickers" ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-12 h-1 bg-white/40 mx-auto mb-4 rounded-full" />

        <p className="mb-4">Your Stickers</p>

        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              onClick={() => setSelectedSticker(i)}
              className={`aspect-square rounded-full flex items-center justify-center ${
                selectedSticker === i
                  ? "border-yellow-400 border-2"
                  : "border-white/30"
              }`}
            >
              <Image
                src={`/stickers/s${(i % 6) + 1}.png`}
                width={70}
                height={70}
                alt=""
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
