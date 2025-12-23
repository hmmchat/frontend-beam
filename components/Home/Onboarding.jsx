"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import SignInModal from "../auth/SignInModel"; // adjust path/casing if needed
import Button from '@/components/ui/Button';

export default function Onboarding() {
  const [showSignIn, setShowSignIn] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [dob, setDob] = useState({ day: "", month: "", year: "" });
  const [gender, setGender] = useState(null); // 'female' | 'male'
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null); // <-- added

  // default avatar path (public)
  const defaultAvatar = "/assets/avatar1.png";

  // prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showSignIn ? "hidden" : "";
  }, [showSignIn]);

  // cleanup objectURLs on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith?.("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarChange = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // revoke previous blob
    if (avatarPreview && avatarPreview.startsWith?.("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(url);
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Please enter your name.";
    const { day, month, year } = dob;
    if (!day || isNaN(Number(day)) || Number(day) < 1 || Number(day) > 31) e.day = "Invalid day";
    if (!month || isNaN(Number(month)) || Number(month) < 1 || Number(month) > 12) e.month = "Invalid month";
    if (!year || isNaN(Number(year)) || Number(year) < 1900 || Number(year) > new Date().getFullYear()) e.year = "Invalid year";
    if (!gender) e.gender = "Select gender";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Open & close helpers (these fix the missing function issue)
  const openSignIn = () => {
    if (validate()) {
      setShowSignIn(true);
    } else {
      // focus first invalid field
      const firstKey = Object.keys(errors)[0];
      if (firstKey) {
        const el = document.querySelector(`[name="${firstKey}"]`);
        if (el) el.focus();
      }
    }
  };
  const closeSignIn = () => setShowSignIn(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    openSignIn();
  };

  const numericOnly = (value, maxLen = 4) => value.replace(/\D/g, "").slice(0, maxLen);

  return (
    <div className="min-h-screen w-full relative overflow-hidden outfit-font text-white">
      {/* Background */}
      <div className="absolute inset-0 -z-10 opacity-95">
        <Image src="/assets/mb.jpg" alt="stars" fill style={{ objectFit: "cover" }} priority />
      </div>

      <div className="container mx-auto py-12 px-6">
        <main className="grid grid-cols-1 lg:grid-cols-2 min-h-[70vh] gap-8 ">
          {/* Left */}
          <div className="bg-gradient-purple-dark flex items-center justify-center text-center w-full mx-auto  ">
            <div className="mx-auto ml-10">

              <img src="/assets/Logo.svg" alt="" className="w-64 mx-auto md:mb-2" />
              <p className="md:text-xl text-sm md:mt-3 md:font-medium opacity-95 outfit-font">Okeeyy! Let's get you started,</p>
              <p className="md:text-xl text-sm md:font-medium opacity-95 outfit-font">Just get done with the itsy bitsy stuff first</p>
            </div>
          </div>

          {/* Right - Form */}
          <div className="flex justify-center  ">
            <div className="w-full max-w-lg rounded-2xl p-6 mx-auto md:ml-30">
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-30 h-30 rounded-full border-white overflow-hidden shadow-lg">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    // use plain <img> for static public images is fine too,
                    // but next/image with fill is also ok. keeping <img> for parity.
                    <img src={defaultAvatar} alt="avatar" className="w-full h-full object-cover" />
                  )}
                  <img
                    src="/assets/camera.svg"
                    alt="overlay"
                    className="justify-center text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 object-contain"
                  />
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className="text-sm cursor-pointer outfit-font " onClick={() => fileRef.current?.click()}>
                    Upload profile picture
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                  />
                  {avatarPreview && (
                    <button
                      type="button"
                      className="text-sm text-red-300"
                      onClick={() => {
                        if (avatarPreview.startsWith?.("blob:")) URL.revokeObjectURL(avatarPreview);
                        setAvatarPreview(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-white text-sm mb-1 block">Enter Name</label>
                  <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Poseidon"
                    variant="outline"
                    className="w-full bg-[#0A032D]/50 border-2 border-white/20 rounded-2xl px-5 py-3 text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                  />
                  {errors.name && <div className="text-xs text-rose-400 mt-2">{errors.name}</div>}
                </div>

                <div>
                  <label className="text-white text-sm mb-1 block">Date of birth</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      name="day"
                      value={dob.day}
                      onChange={(e) => setDob((d) => ({ ...d, day: numericOnly(e.target.value, 2) }))}
                      placeholder="Day"
                      inputMode="numeric"
                      className="bg-[#0A032D]/50 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none"
                    />
                    <input
                      name="month"
                      value={dob.month}
                      onChange={(e) => setDob((d) => ({ ...d, month: numericOnly(e.target.value, 2) }))}
                      placeholder="Month"
                      inputMode="numeric"
                      className="bg-[#0A032D]/50 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none"
                    />
                    <input
                      name="year"
                      value={dob.year}
                      onChange={(e) => setDob((d) => ({ ...d, year: numericOnly(e.target.value, 4) }))}
                      placeholder="Year"
                      inputMode="numeric"
                      className="bg-[#0A032D]/50 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none"
                    />
                  </div>
                  {(errors.day || errors.month || errors.year) && (
                    <div className="text-xs text-rose-400 mt-2">
                      {errors.day || errors.month || errors.year}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-white text-sm mb-1 block">Select gender</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setGender("female")}
                      className={`flex-1 rounded-2xl border-2 px-4 py-3 text-left transition ${gender === "female" ? "border-yellow-400 bg-yellow-500/10" : "border-white/20"}`}
                      aria-pressed={gender === "female"}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🙋‍♀️</span>
                        <div className="text-white font-medium">Female</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGender("male")}
                      className={`flex-1 rounded-2xl border-2 px-4 py-3 text-left transition ${gender === "male" ? "border-yellow-400 bg-yellow-500/10" : "border-white/20"}`}
                      aria-pressed={gender === "male"}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🧑‍🦱</span>
                        <div className="text-white font-medium">Male</div>
                      </div>
                    </button>
                  </div>
                  {errors.gender && <div className="text-xs text-rose-400 mt-2">{errors.gender}</div>}
                  <p className="text-white text-xs opacity-80 mt-3">Don't get your DOB and gender wrong. You can't change it later.</p>
                </div>

                <div className="text-right mt-1">
                  <button
                    type="button"
                    onClick={openSignIn}
                    className="bg-[#0A032D]/50 border-2 border-white/30 rounded-full px-8 py-3 text-white text-lg hover:brightness-110"
                  >
                    Les gooo!
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* center divider */}
      <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-white/40 -translate-x-1/2" />

      {/* Modal mounts only when showSignIn is true */}
      {showSignIn && <SignInModal isOpen={showSignIn} onClose={closeSignIn} />}
    </div>
  );
}
