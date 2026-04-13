"use client";

import Image from "next/image";
import { useState } from "react";

export default function Profile() {
  const [tab, setTab] = useState("earn");

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-800 to-purple-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/stars.png')] opacity-30"></div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8">
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center">
              ←
            </button>
            <span className="text-lg">My Profile</span>
          </div>

          <div className="text-3xl font-bold text-yellow-400">beam</div>

          <div className="flex gap-3">
            <div className="w-10 h-10 border border-white/40 rounded-full"></div>
            <div className="w-10 h-10 border border-white/40 rounded-full"></div>
            <div className="w-10 h-10 border border-white/40 rounded-full"></div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          
          <div className="border border-white/20 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex flex-col items-center">
              <div className="relative">
                <Image
                  src="/profile.jpg"
                  alt=""
                  width={120}
                  height={120}
                  className="rounded-full"
                />
                <div className="absolute bottom-0 right-0 bg-purple-700 w-10 h-10 rounded-full flex items-center justify-center">
                  🐵
                </div>
              </div>

              <h2 className="mt-3 text-xl font-bold text-yellow-400">
                Eldzhey 29
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <Item title="My account" badge="60% complete" />
              <Item title="My Prompts" />
              <Item title="Get money" badge="💎 60" sub="40 left to withdraw" />
              <Item title="Rewards & Referrals" />
            </div>
          </div>

          <div className="md:col-span-2 border border-white/20 rounded-3xl p-6 backdrop-blur-md">
            {tab === "earn" && <Earn />}
            {tab === "stickers" && <Stickers />}
            {tab === "prompts" && <Prompts />}
          </div>
        </div>

        <div className="flex gap-4 mt-6 justify-center">
          <button onClick={() => setTab("earn")} className="px-4 py-2 border rounded-full">Earn</button>
          <button onClick={() => setTab("stickers")} className="px-4 py-2 border rounded-full">Stickers</button>
          <button onClick={() => setTab("prompts")} className="px-4 py-2 border rounded-full">Prompts</button>
        </div>
      </div>
    </div>
  );
}

function Item({ title, badge, sub }) {
  return (
    <div className="flex justify-between items-center border-b border-white/10 pb-3">
      <div>
        <p>{title}</p>
        {sub && <p className="text-sm text-white/60">{sub}</p>}
      </div>
      {badge && (
        <span className="text-sm px-3 py-1 border rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

function Earn() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
      <p className="text-white/70">Just 💎40 left to unlock</p>
      <h1 className="text-3xl font-bold">₹1000</h1>

      <div className="w-full bg-white/20 h-3 rounded-full">
        <div className="bg-white h-3 rounded-full w-[20%]"></div>
      </div>

      <button className="px-6 py-3 border rounded-xl">
        + Add withdrawal method
      </button>
    </div>
  );
}

function Stickers() {
  const items = new Array(18).fill("🐌");

  return (
    <div>
      <h2 className="mb-4">Your Stickers</h2>
      <div className="grid grid-cols-6 gap-4">
        {items.map((i, idx) => (
          <div
            key={idx}
            className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center"
          >
            {i}
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-6">
        <button className="text-sm">Remove sticker</button>
        <button className="px-4 py-2 border rounded-xl">Save</button>
      </div>
    </div>
  );
}

function Prompts() {
  const prompts = [
    "Long Day, need to rant",
    "How many stars are there in galaxy?",
    "I want to see someone Dance on Drake",
    "Mom scolded today. Need moral support.",
  ];

  return (
    <div className="space-y-4">
      <div className="border border-white/20 rounded-2xl p-4 text-center">
        Full-time trash-talker, part-time sniper.
      </div>

      <div className="space-y-3">
        {prompts.map((p, i) => (
          <div
            key={i}
            className="border border-white/20 rounded-full px-4 py-2 text-sm w-fit"
          >
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}