"use client";

import Image from "next/image";
import { Pencil, Settings, Link2, ArrowLeft, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import FaceCard from "../Home/FaceCard";
import { getFacecardPhotos } from "@/lib/facecard-utils";
import FacecardEditor from "../facecard/FacecardEditor";

export default function ProfileDesktop({
  user,
  age,
  setView,
  router,
  firstName,
  zodiac,
  handleSlotClick,
  setShowSelector,
  onPickZodiac,
  progress,
  fileInputRef,
  handleFileChange,
  onOpenFacecardPreview,
  photoUploading = false,
}) {
  const [interestIndex, setInterestIndex] = useState(0);
  const [causeIndex, setCauseIndex] = useState(0);
  const interests =
    user?.interests?.map((i) => i.interest?.name || i.name).filter(Boolean) ||
    [];
  const causes =
    user?.values?.map((v) => v.value?.name || v.name).filter(Boolean) || [];

  useEffect(() => {
    if (interests.length <= 1) return;
    const interval = setInterval(() => {
      setInterestIndex((prev) => (prev + 1) % interests.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [interests.length]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const allPhotos = getFacecardPhotos(user);

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : allPhotos.length - 1,
    );
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev < allPhotos.length - 1 ? prev + 1 : 0,
    );
  };
  const [activeTab, setActiveTab] = useState("default"); // "default" | "prompts"
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

            <div
              onClick={() => setActiveTab("rewards")}
              className="flex items-center justify-between cursor-pointer"
            >
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
                <div className="h-5 border border-white rounded-full p-[3px] border-b-4">
                  <div className="h-full w-[10%] bg-white rounded-full" />
                </div>
              </div>

              <button className="flex items-center gap-3 border border-white px-6 py-3 rounded-[10.986px] text-lg border-b-4 hover:bg-white hover:text-black transition">
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
      border-b-4
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
            <div className="w-full h-[70vh] overflow-hidden">
              <>
                <div className="h-full flex items-center justify-center">
                  <div className="flex border border-white/60 rounded-[2rem] w-full flex-col gap-2 px-3 py-3 relative z-10 h-full overflow-y-auto">
                    {/* TOP ROW: Close, Name Box, Progress */}
                    <div className="grid grid-cols-12 gap-2 items-center px-2 mt-2 mt-4 ">
                      {/* Close Button */}

                      <div className="col-span-2">
                        <button
                          onClick={() => setView("success")}
                          className="w-9 h-9 rounded-full border border-white/50 flex items-center justify-center text-md hover:bg-white/10 transition-all active:scale-95"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Name Box with Brackets */}
                      <div className="col-span-6 flex justify-center">
                        <div className="relative px-6 py-1 min-w-[140px] h-[42px]">
                          <span className="absolute top-0 left-0 w-3 h-3 border-t-1 border-l-1 border-white/50"></span>
                          <span className="absolute top-0 right-0 w-3 h-3 border-t-1 border-r-1 border-white/50"></span>
                          <span className="absolute bottom-0 left-0 w-3 h-3 border-b-1 border-l-1 border-white/50"></span>
                          <span className="absolute bottom-0 right-0 w-3 h-3 border-b-1 border-r-1 border-white/50"></span>
                          <div className="flex flex-col justify-center h-full">
                            <h2 className="text-[12px] text-white">
                              {firstName}
                            </h2>

                            <p className="text-[10px]  font-outfit text-white">
                              UserID:{user?.id?.slice(0, 8) || "4heu24sds"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 row-span-2 flex justify-center items-center">
                        <div className="relative w-[120px] h-[120px] flex items-center justify-center">
                          {/* Glow */}

                          {/* Outer ring */}
                          <div className="absolute w-[104px] h-[104px] rounded-full border-[2px] border-pink-500/60 border-b-4" />

                          <div className="absolute w-[100px] h-[100px] rounded-full border-[2px] border-white" />

                          <div className="absolute w-[96px] h-[96px] rounded-full border-[2px] border-pink-500/60" />

                          {/* Main yellow ring with pink glow */}
                          <div className="w-[88px] h-[88px] rounded-full border-[5px] border-yellow-400 flex items-center justify-center border-b-4">
                            {/* Inner thin ring */}
                            <div className="absolute w-[75px] h-[75px] rounded-full border-[3px] border-[#FFBC2B]" />

                            {/* Center text */}
                            <span className="text-[18px] text-white font-semibold">
                              {progress}
                              <span className="text-sm opacity-60">%</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-5 mt-1">
                        <div className="relative px-6 py-1 min-w-[140px] h-[42px]">
                          <span className="absolute top-0 left-0 w-3 h-3 border-t-1 border-l-1 border-white/50"></span>
                          <span className="absolute top-0 right-0 w-3 h-3 border-t-1 border-r-1 border-white/50"></span>
                          <span className="absolute bottom-0 left-0 w-3 h-3 border-b-1 border-l-1 border-white/50"></span>
                          <span className="absolute bottom-0 right-0 w-3 h-3 border-b-1 border-r-1 border-white/50"></span>

                          <div className="">
                            <p className="text-[10px] uppercase   text-white">
                              DOB :{" "}
                              {user?.dateOfBirth
                                ? new Date(user.dateOfBirth).toLocaleDateString(
                                    "en-GB",
                                  )
                                : "22/08/1998"}
                            </p>
                            <p className="text-[10px] font-thin  text-white">
                              Zodiac : {zodiac?.name || "Gemini"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-3 flex justify-center mt-1">
                        <button
                          onClick={
                            onPickZodiac || (() => setShowSelector("zodiacs"))
                          }
                          className="w-12 h-12 border border-white/40 border-b-[3px] rounded-[10.986px] flex items-center justify-center text-4xl text-white hover:bg-white/5 transition"
                        >
                          {zodiac?.imageUrl ? (
                            <img
                              src={zodiac.imageUrl}
                              className="h-[20px] w-[20px] object-contain brightness-0 invert"
                            />
                          ) : (
                            <span className="opacity-40 text-2xl">+</span>
                          )}
                        </button>
                      </div>

                      <div className="col-span-5 mt-1">
                        <div className="relative px-6 py-1 min-w-[140px] h-[42px]">
                          <span className="absolute top-0 left-0 w-3 h-3 border-t-1 border-l-1 border-white/50"></span>
                          <span className="absolute top-0 right-0 w-3 h-3 border-t-1 border-r-1 border-white/50"></span>
                          <span className="absolute bottom-0 left-0 w-3 h-3 border-b-1 border-l-1 border-white/50"></span>
                          <span className="absolute bottom-0 right-0 w-3 h-3 border-b-1 border-r-1 border-white/50"></span>

                          <div className="">
                            <p className="text-[10px]  opacity-60 text-white">
                              Gender Identity
                            </p>
                            <p className="text-[10px]  text-white">
                              {user?.gender}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Gender Icon + Facecard Button Column */}
                      <div className="col-span-3 flex flex-col gap-4 mt-2">
                        <div className="flex justify-center">
                          <button className="w-12 h-12 border border-white/40 border-b-[3px] rounded-[10.986px] flex items-center justify-center text-xl text-white">
                            {user?.gender === "MALE"
                              ? "♂"
                              : user?.gender === "FEMALE"
                                ? "♀"
                                : "⚧"}
                          </button>
                        </div>
                      </div>

                      <div className="col-span-4 flex justify-center items-center">
                        <button
                          onClick={() => onOpenFacecardPreview?.()}
                          className="w-full py-2 px-1 border border-white/40 rounded-2xl flex items-center justify-center gap-2  hover:bg-white/10 active:scale-95 transition-all"
                        >
                          <span className="text-xl">
                            <img src="/eye.svg" alt="" />
                          </span>
                          <span className="text-xs font-bold tracking-widest text-white">
                            Facecard
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* MIDDLE SECTION: DOB/Zodiac Box + Zodiac Icon */}

                    {/* BOTTOM SECTION: Gender Box, Gender Icon, Facecard Button */}

                    {/* Action Rows: Interests, Causes, Brands */}
                    <div className="flex flex-col gap-5">
                      {/* Interests */}
                      <div className="flex items-center justify-between gap-3">
                        {/* LEFT → Label */}
                        <span className="text-[12px] font-black  tracking-wide">
                          Interests
                        </span>

                        {/* RIGHT → Box + Button */}
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => setShowSelector("interests")}
                            className="w-28 h-8 border border-white/40 rounded-full px-4 flex items-center justify-center text-[11px] 0  meeting now overflow-hidden"
                          >
                            {interests.length > 0 ? (
                              <div
                                key={interestIndex}
                                className="animate-slide-down"
                              >
                                {interests[interestIndex]}
                              </div>
                            ) : (
                              "Select"
                            )}
                          </div>

                          <button
                            onClick={() => setShowSelector("interests")}
                            className="w-8 h-8 border border-white/60 border-b-2 rounded-xl text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        {/* LEFT → Label */}
                        <span className="text-[12px] font-black  tracking-wide">
                          Causes
                        </span>

                        {/* RIGHT → Box + Button */}
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => setShowSelector("values")}
                            className="w-28 h-8 border border-white/40 rounded-full px-4 flex items-center justify-center text-[11px] 0  meeting now overflow-hidden"
                          >
                            {causes.length > 0 ? (
                              <div
                                key={causeIndex}
                                className="animate-slide-down italic"
                              >
                                {causes[causeIndex]}
                              </div>
                            ) : (
                              "Select"
                            )}
                          </div>

                          <button
                            onClick={() => setShowSelector("values")}
                            className="w-8 h-8 border border-white/60 rounded-xl border-b-2 text-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Brands */}
                      <div className="flex items-center justify-between gap-3">
                        {/* LEFT → Label */}
                        <span className="text-[12px] font-black  tracking-wide">
                          Brands
                        </span>

                        {/* RIGHT → Icons */}
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                          {[0, 1, 2, 3, 4].map((i) => {
                            const selection = user?.brandPreferences?.[i];
                            return (
                              <div
                                key={i}
                                onClick={() => setShowSelector("brands")}
                                className="w-8 h-8 shrink-0 border-2 border-white/40 rounded-full flex items-center justify-center bg-white/5  meeting now hover:bg-white/10"
                              >
                                {selection ? (
                                  <img
                                    src={selection.brand?.logoUrl}
                                    className="w-7 h-7 rounded-full object-contain"
                                  />
                                ) : (
                                  <span className="opacity-40 text-xl">+</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Photo Slots Section */}
                    <div className="relative group">
                      {photoUploading && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                          <div className="h-8 w-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        {/* Photo 1 (DP) */}
                        <div
                          onClick={() => handleSlotClick(0)}
                          className="w-full aspect-[4/5] border-2  border-white/50 rounded-[1rem] overflow-hidden relative shadow-2xl"
                        >
                          <img
                            src={user?.displayPictureUrl || "/imageprofile.png"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-black text-[10px]">
                            ✎
                          </div>
                        </div>

                        {/* Other Slots */}
                        {[0, 1].map((idx) => {
                          const photo = user?.photos?.find(
                            (p) => p.order === idx,
                          );
                          return (
                            <div
                              key={idx}
                              onClick={() => handleSlotClick(idx + 1)}
                              className="w-full border-2 border-white/20 rounded-[1rem] flex items-center justify-center relative overflow-hidden bg-white/5"
                            >
                              {photo ? (
                                <img
                                  src={photo.url}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 border-2 border-white/60 rounded-full flex items-center justify-center text-3xl opacity-40">
                                  +
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between mb-4 ">
                      {/* LEFT: Album + Info */}
                      <div className="flex items-center gap-5">
                        {/* Album */}
                        <div
                          onClick={() => setShowSelector("music")}
                          className="relative 0  meeting now active:scale-95 transition"
                        >
                          <div
                            className={`w-18 h-18 rounded-full border border-white/20 flex items-center justify-center border rounded-full border-white border-2 ${user?.musicPreference ? "bg-black" : "bg-white/5"}`}
                          >
                            <div
                              className={`w-18 h-18 rounded-full overflow-hidden flex items-center justify-center  ${user?.musicPreference ? "animate-spin-slow" : ""}`}
                            >
                              {user?.musicPreference?.albumArtUrl ? (
                                <img
                                  src={user.musicPreference.albumArtUrl}
                                  className="w-full h-full object-cover"
                                  alt="Album Art"
                                />
                              ) : (
                                <span className="text-4xl opacity-20 text-white">
                                  +
                                </span>
                              )}
                            </div>

                            {/* center dot */}
                            <div className="absolute w-4 h-4 rounded-full bg-black border border-white/20 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white/30"></div>
                            </div>
                          </div>
                        </div>

                        <div className="relative px-6 py-1 min-w-[60px]">
                          <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/50"></span>
                          <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/50"></span>
                          <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/50"></span>
                          <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/50"></span>
                          {/* Text */}
                          <div className="inline-flex flex-col justify-end items-start">
                            <p className="text-white text-[10px] leading-tight">
                              {user?.musicPreference?.name ||
                                user?.musicPreference?.songName ||
                                "Select Song"}
                            </p>
                            <p className="text-white/60 text-[10px] text-center">
                              {user?.musicPreference?.artist ||
                                user?.musicPreference?.artistName ||
                                "Spotify"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Dots */}
                      <div className="grid grid-cols-6 gap-2 opacity-30">
                        {[...Array(42)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 h-1 bg-white rounded-full"
                          ></div>
                        ))}
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </>
            </div>
          ) : activeTab === "rewards" ? (
            <>
              <div className="w-full h-[70vh] flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    onClick={() => setActiveTab("getmoney")}
                    className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center"
                  >
                    <ArrowLeft size={18} />
                  </div>
                  <p>Rewards and Referrals</p>
                </div>

                <div className="border border-white/30 rounded-3xl p-7 text-center">
                  <p className="mb-2">Invite you gang and win</p>
                  <p className="text-xl mb-6 flex items-center justify-center">
                    <span>
                      <img src="/Coins/coin1.png" alt="" className="w-8 h-8" />
                    </span>
                    100
                  </p>

                  <div className="w-20 h-20 rounded-xl mx-auto mb-6 flex items-center justify-center text-black">
                    <img src="/profile/code.png" alt="" />
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
            </>
          ) : activeTab === "default" ? (
            <FaceCard
              user={{
                ...user,
                age,
                city: user?.preferredCity || user?.city,
              }}
              currentIndex={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
            />
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

                <button className="px-6 py-2 border border-white rounded-full border-b-4 hover:bg-white hover:text-black transition">
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
