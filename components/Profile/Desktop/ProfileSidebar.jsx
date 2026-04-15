"use client";

import Image from "next/image";
import { calculateAge } from "@/lib/facecard-utils";

export default function ProfileSidebar({
  activeTab,
  setActiveTab,
  user,
  firstName,
  progress,
}) {
  return (
    <div className="col-span-1 border border-white/20 rounded-[3rem] p-6 flex flex-col items-center text-center justify-center">
      <div className="relative">
        <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
          <Image
            src={user?.displayPictureUrl || "/loadingpage.png"}
            alt="profile"
            width={120}
            height={120}
            className="rounded-full object-cover h-30 w-30"
          />
        </div>

        <div className="absolute bottom-0 right-[-10] w-14 h-14 rounded-full border border-white/40 flex items-center justify-center">
          <div className="relative w-10 h-10 rounded-full flex items-center justify-center">
            <Image
              src="/gift/gift8.png"
              alt="gift"
              fill
              className="object-contain"
            />

            <div
              onClick={() => setActiveTab("stickers")}
              className="absolute -bottom-1 -right-4 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
            >
              <img src="/edit.png" alt="edit" className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
      <h2 className="mt-4 text-xl font-bold text-yellow-400">
        {firstName} {user?.age || calculateAge(user?.dateOfBirth) || ""}
      </h2>

      <div className="w-full mt-10 space-y-4 text-left px-4">
        <div
          onClick={() => setActiveTab("account")}
          className={`flex items-center justify-between border-b border-white/20 pb-3 cursor-pointer ${activeTab === "account" ? "opacity-100" : "opacity-70"}`}
        >
          <div>
            <p className="text-sm">My account</p>
            <p className="text-[10px] text-white/60">Fill account details</p>
          </div>
          <span className="text-[9px] border border-white/40 px-2 py-1 rounded-full">
            {progress}% complete
          </span>
          <span className="w-6 h-6 flex items-center justify-center border border-white rounded-full">
            ›
          </span>
        </div>

        <div
          onClick={() => setActiveTab("prompts")}
          className={`flex items-center justify-between border-b border-white/20 pb-3 cursor-pointer ${activeTab === "prompts" ? "opacity-100" : "opacity-70"}`}
        >
          <p className="text-sm">My Prompts</p>
          <span className="w-6 h-6 flex items-center justify-center border border-white rounded-full">
            ›
          </span>
        </div>

        <div
          onClick={() => setActiveTab("getmoney")}
          className={`flex items-center justify-between border-b border-white/20 pb-3 cursor-pointer ${activeTab === "getmoney" ? "opacity-100" : "opacity-70"}`}
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

        <div
          onClick={() => setActiveTab("rewards")}
          className={`flex items-center justify-between cursor-pointer ${activeTab === "rewards" ? "opacity-100" : "opacity-70"}`}
        >
          <p className="text-sm">Rewards & Referrals</p>
          <span className="w-6 h-6 flex items-center justify-center border border-white rounded-full">
            ›
          </span>
        </div>
      </div>
    </div>
  );
}
