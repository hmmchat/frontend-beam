"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import FaceCard3 from "../Home/FaceCard3";
import { calculateProgress } from "@/lib/facecard-utils";

import ProfileHeader from "./Desktop/ProfileHeader";
import ProfileSidebar from "./Desktop/ProfileSidebar";
import GetMoneyTab from "./Desktop/GetMoneyTab";
import PromptsTab from "./Desktop/PromptsTab";

import RewardsTab from "./Desktop/RewardsTab";
import StickersTab from "./Desktop/StickersTab";

import { API, apiRequest } from "@/lib/api";

export default function ProfileDesktop({
  user: initialUser,
  age: initialAge,
  setView,
  firstName: initialFirstName,
  zodiac: initialZodiac,
  handleSlotClick,
  setShowSelector,
  onPickZodiac,
  progress: initialProgress,
  fileInputRef,
  handleFileChange,
  onOpenFacecardPreview,
  photoUploading = false,
}) {
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState("default"); // "default" | "prompts" | "account" | "getmoney" | "rewards" | "stickers"
  const [interestIndex, setInterestIndex] = useState(0);
  const [causeIndex, setCauseIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!initialUser) {
      const fetchUser = async () => {
        try {
          const fields =
            "username,dateOfBirth,gender,displayPictureUrl,intent,photos,musicPreference,brandPreferences,interests,values,preferredCity,zodiac,zodiacId,zodiacOverridden";
          const data = await apiRequest(`${API.USERS.GET_ME}?fields=${fields}`);
          setUser(data.user || data);
        } catch (err) {
          console.error("Failed to fetch user data:", err);
        }
      };
      fetchUser();
    }
  }, [initialUser]);

  const interests =
    user?.interests?.map((i) => i.interest?.name || i.name).filter(Boolean) ||
    [];
  const causes =
    user?.values?.map((v) => v.value?.name || v.name).filter(Boolean) || [];

  const age =
    initialAge ?? (user?.dateOfBirth ? calculateAge(user.dateOfBirth) : null);
  const firstName = initialFirstName ?? user?.username?.split(" ")[0] ?? "User";
  const zodiac = initialZodiac ?? user?.zodiac;
  const progress =
    user != null
      ? calculateProgress(user)
      : initialProgress != null
        ? initialProgress
        : 0;

  function calculateAge(birthday) {
    const ageDifMs = Date.now() - new Date(birthday).getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  useEffect(() => {
    if (interests.length <= 1) return;
    const interval = setInterval(() => {
      setInterestIndex((prev) => (prev + 1) % interests.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [interests.length]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-start overflow-hidden px-6 py-10">
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

      <ProfileHeader icons={["/edit.png", "/setting.png", "/bandage.png"]} />

      <div className="z-10 grid w-full max-w-5xl grid-cols-1 gap-6 rounded-[3rem] border border-white/30 p-3 md:grid-cols-3">
        <ProfileSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          firstName={firstName}
          progress={progress}
        />

        {activeTab === "account" || activeTab === "default" ? (
          <div className="col-span-2 border border-white/20 rounded-[3rem] flex items-center justify-center min-h-[80vh]">
            <div className="scale-75 lg:scale-90 transition-transform">
              <FaceCard3
                user={{
                  ...user,
                  age,
                  city: user?.preferredCity || user?.city,
                }}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
                hideArrows={true}
                hideHeader={true}
              />
            </div>
          </div>
        ) : (
          <div className="col-span-2 flex min-h-[80vh] flex-col rounded-[3rem] border border-white/20 px-8 py-10">
            {activeTab === "getmoney" ? (
              <GetMoneyTab />
            ) : activeTab === "prompts" ? (
              <PromptsTab user={user} setUser={setUser} />
            ) : activeTab === "rewards" ? (
              <RewardsTab onBack={() => setActiveTab("default")} />
            ) : (
              <StickersTab />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
