"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FaceCard2 from "../Home/FaceCard2";
import { calculateProgress, calculateAge } from "@/lib/facecard-utils";
import { API, apiRequest } from "@/lib/api";
import RewardsReferralsPanel from "../Profile/RewardsReferralsPanel";

export default function ProfileMobile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("main");
  const [selectedSticker, setSelectedSticker] = useState(3);
  const [user, setUser] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const fields =
          "username,dateOfBirth,gender,displayPictureUrl,intent,photos,musicPreference,brandPreferences,interests,values,preferredCity,zodiac,zodiacId,zodiacOverridden";
        const data = await apiRequest(`${API.USERS.GET_ME}?fields=${fields}`);
        setUser(data.user || data);
      } catch (e) {
        console.error("[ProfileMobile] Failed to load user:", e);
      }
    };
    load();
  }, []);

  const progress = user ? calculateProgress(user) : 0;
  const displayName = user?.username?.trim() || "Profile";
  const age = user?.dateOfBirth ? calculateAge(user.dateOfBirth) : null;

  return (
    <div className="h-[100dvh] w-full text-white flex flex-col items-center pt-6 px-4 relative overflow-y-auto custom-scroll">
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
        <div className="w-full flex flex-col min-h-[90dvh] pb-10">
          {/* TOP */}
          <div className="flex items-center gap-3 mb-6">
            <div
              onClick={() => setActiveTab("main")}
              className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </div>
            <p className="text-base">My prompt</p>
          </div>

          {/* CARD */}
          <div className="border border-white/30 rounded-[2.5rem] p-10">
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
                  className="px-4 py-2 border border-white/30 rounded-full text-xs border-b-4"
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
        <div className="flex w-full flex-1 flex-col gap-3 pb-6">
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("main")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40"
              aria-label="Back to profile"
            >
              <ArrowLeft size={18} />
            </button>
            <p className="font-[family-name:var(--font-outfit),sans-serif] text-base font-medium">
              Rewards and Referrals
            </p>
          </div>
          <RewardsReferralsPanel />
        </div>
      ) : activeTab === "getmoney" ? (
        /* ================= GET MONEY ================= */
        <div className="w-full flex flex-col min-h-[90dvh] pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div
              onClick={() => setActiveTab("main")}
              className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </div>
            <p>Get money</p>
          </div>

          <div className="border border-white/30 rounded-[2.5rem] p-10 flex flex-col items-center text-center">
            <p className="text-sm text-white/80">
              Hmm. You being nice is paying back!!
            </p>

            <p className="text-sm text-white/60 mt-1">
              Just 💎 40 left to unlock
            </p>

            <h2 className="text-3xl font-bold mt-4 mb-10">₹7000</h2>

            <div className="w-full max-w-lg mb-12">
              <div className="h-5 border border-white rounded-full p-[3px] border-b-4">
                <div className="h-full w-[10%] bg-white rounded-full" />
              </div>
            </div>

            <button className="flex items-center gap-3 border border-white/40 px-6 py-3 rounded-[10.986px] text-lg border-b-4 hover:bg-white hover:text-black transition">
              <span className="w-4 h-4 flex items-center justify-center border border-white/40 rounded-full">
                +
              </span>
              Add withdrawal method
            </button>

            <div className="mt-12 text-sm text-white/70 space-y-6 text-left w-full pt-6">
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
                <img
                  src="/call.png"
                  alt=""
                  className="w-7 h-7 object-contain"
                />
                <p>Reach Support</p>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "facePreview" ? (
        <div className="w-full flex flex-col min-h-[90dvh] pb-10">
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("main")}
              className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center"
              aria-label="Back to profile"
            >
              <ArrowLeft size={18} />
            </button>
            <p className="text-base">My account</p>
          </div>
          {user ? (
            <div className="flex justify-center w-full">
              <div className="scale-[0.85] origin-top">
                <FaceCard2
                  user={{
                    ...user,
                    age,
                    city: user?.preferredCity || user?.city,
                  }}
                  currentIndex={currentImageIndex}
                  onIndexChange={setCurrentImageIndex}
                  onClose={() => setActiveTab("main")}
                />
              </div>
            </div>
          ) : (
            <p className="text-center text-white/60 text-sm">Loading…</p>
          )}
        </div>
      ) : (
        <>
          {/* ================= PROFILE ================= */}

          <div className="w-full flex justify-between mb-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex gap-3 items-center rounded-xl py-1 pr-2 text-left text-white hover:bg-white/10 transition-colors"
              aria-label="Back to home"
            >
              <span className="w-10 h-10 border rounded-full flex items-center justify-center shrink-0">
                <ArrowLeft size={18} />
              </span>
              <p>My Profile</p>
            </button>

            <Image src="/setting.png" width={34} height={4} alt="" />
          </div>

          <div className="w-full min-h-[85vh] border border-white/30 rounded-[2.5rem] p-10 flex flex-col items-center mb-10">
            {/* PROFILE */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white relative">
                {user?.displayPictureUrl ? (
                  <Image
                    src={user.displayPictureUrl}
                    width={120}
                    height={120}
                    alt=""
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <Image src="/loadingpage.png" width={120} height={120} alt="" />
                )}
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
              {displayName}
              {age != null ? ` ${age}` : ""}
            </h2>

            {/* MENU */}
            <div className="w-full mt-8 space-y-5">
              <div
                onClick={() => setActiveTab("facePreview")}
                className="flex cursor-pointer items-center justify-between gap-2 border-b border-white/20 pb-3"
              >
                <div>
                  <p className="text-sm">My account</p>
                  <p className="text-[10px] text-white/60">
                    Fill account details
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/40 px-2 py-1 text-[9px]">
                  {progress}% complete
                </span>
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white"
                  aria-hidden
                >
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
                  <p className="text-[10px] text-white/60">
                    40 left to withdraw
                  </p>
                </div>
                <span className="text-[9px] border border-white/40 px-3 py-1 rounded-full">
                  💎 60
                </span>
                <span className="w-6 h-6 flex items-center justify-center border border-white rounded-full">
                  ›
                </span>
              </div>

              <div
                onClick={() => setActiveTab("rewards")}
                className="flex items-center justify-between border-b border-white/20 pb-3 cursor-pointer"
              >
                <p>Rewards & Referrals</p>
                <span className="w-6 h-6 flex items-center justify-center border border-white rounded-full">
                  ›
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= STICKERS ================= */}

      {activeTab === "stickers" && (
        <div
          onClick={() => setActiveTab("main")}
          className="fixed inset-0  z-40"
        />
      )}

      <div
        className={`fixed bottom-0 w-full h-[62vh] bg-[#3D0075] rounded-t-[2.5rem] px-5 pt-5 pb-6 transition-transform duration-500 z-50 ${
          activeTab === "stickers" ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* DRAG HANDLE */}
        {/* <div className="w-12 h-1.5 bg-white/40 mx-auto mb-6 rounded-full" /> */}

        {/* TITLE */}
        <div className="text-left mb-4">
          <p className="text-md font-semibold">Your Stickers</p>
          <p className="text-xs text-white/70 mt-1 leading-snug">
            Apply a sticker next to your profile photo.
            <br />
            Stickers expire 7 days after you receive them
          </p>
        </div>

        {/* INNER CARD */}
        <div className="bg-white/5 border border-white/20 rounded-[2rem] p-5">
          {/* GRID */}
          <div className="grid grid-cols-4 gap-5 mb-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                onClick={() => setSelectedSticker(i)}
                className={`relative flex items-center justify-center rounded-full aspect-square cursor-pointer transition-all duration-200 ${
                  selectedSticker === i
                    ? "border-[3px] border-yellow-400 border-b-4"
                    : "border border-white/30"
                }`}
              >
                <Image
                  src={`/stickers/s${(i % 6) + 1}.png`}
                  width={60}
                  height={60}
                  alt=""
                  className="object-contain"
                />
              </div>
            ))}
          </div>

          {/* PAGINATION DOTS */}
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-2 h-2 bg-white rounded-full" />
            <div className="w-2 h-2 bg-white/40 rounded-full" />
            <div className="w-2 h-2 bg-white/40 rounded-full" />
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-between">
            {/* REMOVE */}
            <div className="flex items-center gap-3 text-white/90 cursor-pointer">
              <div className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center">
                −
              </div>
              <p className="text-sm">Remove sticker</p>
            </div>

            {/* SAVE BUTTON */}
            <button className="px-8 py-3 border border-white/40 rounded-full text-white font-semibold hover:bg-white/10 transition">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
