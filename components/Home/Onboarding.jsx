"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SignInModal from "../auth/SignInModel"; // adjust path/casing if needed
import { API } from "@/lib/api";
import Skeleton from '@/components/ui/Skeleton';





export default function Onboarding() {
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState({ day: "", month: "", year: "" });
  const [gender, setGender] = useState(null); // 'female' | 'male' | 'nonbinary'
  const [preferNotToSay, setPreferNotToSay] = useState(false);
  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([null, null, null]);
  const [photoFiles, setPhotoFiles] = useState([null, null, null]);
  const fileRefs = useRef([]);
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [selectedPrompts, setSelectedPrompts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isShuffleLoading, setIsShuffleLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
const [tempCity, setTempCity] = useState(city || "Anywhere");


  const [showGenderModal, setShowGenderModal] = useState(false);
const [tempGender, setTempGender] = useState(gender || "");
  // Get userId from token on mount
  useEffect(() => {
    // Overlay deep link: /onboarding?intent=1&overlay=1 should land directly on step 2.
    try {
      const sp = new URLSearchParams(window.location.search);
      const overlay = sp.get('overlay') === '1';
      const intent = sp.get('intent') === '1';
      if (overlay) setIsOverlayMode(true);
      if (intent) setStep(2);
    } catch (_) {}

    const checkUserProfile = async () => {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setApiError('No session found. Redirecting to login...');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const uid = payload.sub || payload.uid;
        setUserId(uid);

        // Check if profile already exists
        const response = await fetch(API.USERS.GET_USER(uid), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // Profile exists! Populate data so user can edit it
          const data = await response.json();
          const u = data.user;
          if (u) {
            setName(u.username || "");
            if (u.dateOfBirth) {
              const d = new Date(u.dateOfBirth);
              setDob({
                day: d.getDate().toString(),
                month: (d.getMonth() + 1).toString(),
                year: d.getFullYear().toString()
              });
            }
            if (u.gender) {
              const genderMap = {
                'MALE': 'male',
                'FEMALE': 'female',
                'NON_BINARY': 'nonbinary',
                'PREFER_NOT_TO_SAY': null
              };
              setGender(genderMap[u.gender] || null);
              if (u.gender === 'PREFER_NOT_TO_SAY') setPreferNotToSay(true);
            }
            if (u.displayPictureUrl) {
              setPhotos(prev => {
                const next = [...prev];
                next[0] = u.displayPictureUrl;
                return next;
              });
            }
            if (u.photos && u.photos.length > 0) {
              setPhotos(prev => {
                const next = [...prev];
                u.photos.slice(0, 2).forEach((p, idx) => {
                  next[idx + 1] = p.url;
                });
                return next;
              });
            }
            if (u.intent) {
              setPrompt(u.intent);
            }
            setIsEditing(true);
          }
          setLoading(false);
        } else {
          // Profile doesn't exist - show onboarding form
          setIsEditing(false);
          setLoading(false);
        }
        
      } catch (error) {
        console.error('Error checking profile:', error);
        setApiError('Invalid session. Please login again.');
        setTimeout(() => router.push('/'), 2000);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(API.USERS.GET_INTENT_PROMPTS(9));
        if (response.ok) {
          const data = await response.json();
          // Data is { prompts: [{ id, text }, ...] }
 setSuggestions(
  data.prompts
    ?.map(p => p.text)
    .slice(0,6) // 👈 yaha control kar number
);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    };

    checkUserProfile();
    fetchSuggestions();
  }, [router]);

  // prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showSignIn ? "hidden" : "";
  }, [showSignIn]);

  // cleanup objectURLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach(photo => {
        if (photo && photo.startsWith?.("blob:")) {
          URL.revokeObjectURL(photo);
        }
      });
    };
  }, [photos]);

  const handlePhotoChange = (file, index) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    
    setPhotos((prev) => {
      const copy = [...prev];
      if (copy[index] && copy[index].startsWith?.("blob:")) {
        URL.revokeObjectURL(copy[index]);
      }
      copy[index] = preview;
      return copy;
    });

    setPhotoFiles((prev) => {
      const copy = [...prev];
      copy[index] = file;
      return copy;
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const copy = [...prev];
      if (copy[index] && copy[index].startsWith?.("blob:")) {
        URL.revokeObjectURL(copy[index]);
      }
      copy[index] = null;
      return copy;
    });
    setPhotoFiles((prev) => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
  };

  const uploadToService = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'profile-photos');

    const token = localStorage.getItem('accessToken');
    const response = await fetch(API.FILES.UPLOAD, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.file.url;
  };

  const validate = () => {
    const e = {};
    
    const username = name.trim();
    if (!username) {
      e.name = "Please enter your name.";
    } else if (username.length < 3) {
      e.name = "Name must be at least 3 characters.";
    }
    
    const { day, month, year } = dob;
    if (!day || isNaN(Number(day)) || Number(day) < 1 || Number(day) > 31) e.day = "Invalid day";
    if (!month || isNaN(Number(month)) || Number(month) < 1 || Number(month) > 12) e.month = "Invalid month";
    if (!year || isNaN(Number(year)) || Number(year) < 1900 || Number(year) > new Date().getFullYear()) e.year = "Invalid year";
    
    if (day && month && year && !e.day && !e.month && !e.year) {
      const dobDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const age = Math.floor((new Date() - dobDate) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        e.year = "You must be at least 18 years old";
      }
    }
    
    if (!gender && !preferNotToSay) e.gender = "Select gender";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openSignIn = () => {
    if (validate()) {
      setShowSignIn(true);
    }
  };
  const closeSignIn = () => setShowSignIn(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    if (!userId) {
      setApiError('User session not found. Please login again.');
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      // 1. Upload photos first
      const uploadedUrls = [];
      for (const file of photoFiles) {
        if (file) {
          const url = await uploadToService(file);
          uploadedUrls.push(url);
        }
      }

      const displayPictureUrl = uploadedUrls[0] || 'https://via.placeholder.com/150';

      const dobDate = new Date(
        parseInt(dob.year),
        parseInt(dob.month) - 1,
        parseInt(dob.day)
      );

      const genderMap = {
        'male': 'MALE',
        'female': 'FEMALE',
        'nonbinary': 'NON_BINARY'
      };
      
      const backendGender = preferNotToSay ? 'PREFER_NOT_TO_SAY' : (genderMap[gender] || 'PREFER_NOT_TO_SAY');

      const profileData = {
        username: name.trim(),
        dateOfBirth: dobDate.toISOString(),
        gender: backendGender,
        displayPictureUrl,
        intent: prompt.trim() || undefined
      };

      // If editing, skip the create profile step entirely and only update intent/photos
      if (isEditing) {
        console.warn('Editing existing profile, skipping create call...');
      } else {
        // 2. Create Profile
        const response = await fetch(API.USERS.CREATE_PROFILE(userId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || "";
          
          if (errorMessage.toLowerCase().includes('already exists')) {
            console.warn('Profile already exists, proceeding with updates...');
          } else {
            throw new Error(errorMessage || 'Profile creation failed');
          }
        }
      }

      // 3. Add extra photos if any
      const accessToken = localStorage.getItem('accessToken');
      if (uploadedUrls.length > 1 && accessToken) {
        for (let i = 1; i < uploadedUrls.length; i++) {
          await fetch(API.USERS.ADD_PHOTO, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ url: uploadedUrls[i], order: i - 1 })
          });
        }
      }

      // 4. Update Intent/Prompt if present
if (prompt.trim() && accessToken) {
  const res = await fetch(API.USERS.UPDATE_INTENT, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ intent: prompt.trim() })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Intent update failed:", err);
    throw new Error("Intent update failed");
  } else {
    const data = await res.json();
    console.log("Intent updated:", data);
  }
}

      router.push('/facecard');

    } catch (error) {
      console.error('Error creating profile:', error);
      setApiError(error.message || 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const numericOnly = (value, maxLen = 4) => value.replace(/\D/g, "").slice(0, maxLen);

  const handleDobChange = (e, field) => {
    let val = e.target.value.replace(/\D/g, "");
    
    if (field === "day") {
      val = val.slice(0, 2);
      const num = parseInt(val);
      // Validate first digit (can only be 0, 1, 2, 3)
      if (val.length === 1 && num > 3) return;
      // Validate full 2-digit value (must be 01 - 31)
      if (val.length === 2 && (num < 1 || num > 31)) return;
      
      setDob((prev) => ({ ...prev, day: val }));
      if (val.length === 2) monthRef.current?.focus();
    } 
    else if (field === "month") {
      val = val.slice(0, 2);
      const num = parseInt(val);
      // Validate first digit (can only be 0, 1)
      if (val.length === 1 && num > 1) return;
      // Validate full 2-digit value (must be 01 - 12)
      if (val.length === 2 && (num < 1 || num > 12)) return;
      
      setDob((prev) => ({ ...prev, month: val }));
      if (val.length === 2) yearRef.current?.focus();
    } 
    else if (field === "year") {
      val = val.slice(0, 4);
      setDob((prev) => ({ ...prev, year: val }));
    }
  };

  if (loading && !apiError && !name) {
    return (
      <div 
        className="w-full flex h-screen items-center justify-center bg-purple-950 p-4"
        style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full md:max-w-6xl h-auto">
          {/* Left Column Skeleton */}
          <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 p-12 hidden lg:flex flex-col justify-center">
            <Skeleton className="h-12 w-64 rounded-lg mb-6" />
            <Skeleton className="h-6 w-48 rounded-lg mb-3 opacity-50" />
            <Skeleton className="h-6 w-56 rounded-lg opacity-50" />
          </div>

          {/* Right Column (Form) Skeleton */}
          <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 p-8 flex flex-col gap-8">
            {/* Logo/Header (Mobile) */}
            <div className="flex flex-col items-center lg:hidden mb-4">
              <Skeleton circle className="h-14 w-32 mb-4" />
              <Skeleton className="h-5 w-48 opacity-50" />
            </div>

            {/* Photo Slots */}
            <div className="flex justify-center gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="w-[100px] h-36 md:w-32 md:h-48 rounded-2xl border border-white/20" />
              ))}
            </div>

            {/* Input Groups */}
            <div className="space-y-6">
              <div>
                <Skeleton className="h-4 w-32 mb-2 ml-1 opacity-50" />
                <Skeleton className="h-14 w-full border border-white/20 rounded-xl" />
              </div>
              
              <div>
                <Skeleton className="h-4 w-32 mb-2 ml-1 opacity-50" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-14 border border-white/10 rounded-xl" />
                  <Skeleton className="h-14 border border-white/10 rounded-xl" />
                  <Skeleton className="h-14 border border-white/10 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Gender Pills */}
            <div className="flex gap-2">
              <Skeleton className="h-14 flex-1 border border-white/10 rounded-xl" />
              <Skeleton className="h-14 flex-1 border border-white/10 rounded-xl" />
              <Skeleton className="h-14 flex-1 border border-white/10 rounded-xl" />
            </div>

            {/* Button Placeholder */}
            <div className="overflow-hidden rounded-2xl mt-4">
              <Skeleton className="h-16 w-full max-w-xs mx-auto border border-white/30" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className=" w-full relative outfit-font text-white" 
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >



      <div className=" mx-auto ">




<main className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-screen overflow-y-auto px-4 py-3">

            {step === 1 && (
    <>


           {/* <div className="pt-10 px-4 flex flex-col items-center text-center  md:mb-10">
  <img src="/Logo.png" className="w-40 mx-auto" />
  <p className="text-white text-lg font-medium mt-1">
    Meet someone here
  </p>
</div> */}
          {/* Left */} 
          <div className="bg-gradient-purple-dark flex items-center justify-center text-center w-full mx-auto border border-white/30 rounded-[3rem] py-10 md:py-16 hidden md:flex ">
            <div className="mx-auto ">

            <h3 className="text-4xl font-bold ">Welcome onboard,</h3>
              <p className="md:text-lg text-sm md:mt-3  opacity-95 font-outfit">Okeeyy! Let's get you started,</p>
              <p className="md:text-lg text-sm  opacity-95 font-outfit">Just get done with the itsy bitsy stuff first</p>
            </div>
          </div>




          {/* Right - Form */}



          <div className="flex flex-col justify-between items-center justify-center h-full overflow-hidden md:border md:border-white/30 md:rounded-[3rem]">
            <div className="w-full max-w-[90%] sm:max-w-[420px] md:max-w-[520px] rounded-2xl  mx-auto ">



 <div className="mx-auto md:hidden  flex flex-col items-center text-center mb-6 ">
  <img src="/LOGO.png" className="w-28 mx-auto" />

            <p className="text-sm font-bold outfit-font">Welcome onboard!</p>
              <p className="md:text-sm text-sm md:mt-3 md:font-medium opacity-95 outfit-font">getting your started now</p>

            </div>




<div className="flex flex-col justify-between h-full mt-10 md:mt-0">


  <div
    className="
 
      origin-top
      transition-all
    "
  >
              <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6 md:border md:border-white/30 md:p-3 md:py-6  md:rounded-[3rem]  mt-4">
                
                {/* 2️⃣ Photo upload UI */}
                <div className="mb-8 border border-white/30 p-3 md:py-5 rounded-[2rem] ">
                

                  <div className="flex justify-center md:gap-4 gap-2">
                    {[0, 1, 2].map((i) => {
                      // Only show the slot if it's the first one OR the previous one is filled
                      const isVisible = i === 0 || !!photos[i - 1];
                      if (!isVisible) return null;

                      return (
                        <div
                          key={i}
className="
  relative 
  w-[90px] sm:w-[110px] md:w-32 
  aspect-[2/3] md:aspect-[3/4] 
  rounded-[1rem] md:rounded-[1.5rem]
  border border-b-[3px] md:border-2 md:border-b-4 
  border-white/40 overflow-hidden 
  animate-in fade-in zoom-in duration-300
"
                          onClick={() => fileRefs.current[i]?.click()}
                        >
                          {photos[i] ? (
                            <>
                              <img src={photos[i]} className="w-full h-full object-cover" alt={`upload-${i}`} />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePhoto(i);
                                }}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white text-black text-sm flex items-center justify-center font-bold"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-white text-3xl">
                              <span className="text-4xl text-white/50 md:border-4 border-[3px] border-white/40 rounded-full px-2">+</span>

                            </div>
                          )}

                          <input
                            ref={(el) => (fileRefs.current[i] = el)}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => handlePhotoChange(e.target.files?.[0], i)}
                          />
                        </div>
                      );
                    })}
                  </div>
                    <p className="text-white/50 text-sm text-center font-outfit mt-3">
                    Upload your niceeee pictures
                  </p>
                </div>

                {/* 3️⃣ Name input */}


                <div className="md:px-4 font-outfit">
                  <label className="text-white text-sm mb-1 block">
                    Enter name/ username
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/20 border-2 border-white/30 rounded-xl px-5 py-3 md:px-4 md:py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/60"
                    placeholder="Your name"
                  />
                  {errors.name && <div className="text-xs text-rose-400 mt-1">{errors.name}</div>}
                </div>

                {/* 4️⃣ DOB inputs */}
                <div className="md:px-4 font-outfit">
                  <label className="text-white text-sm mb-1 block">Date of birth</label>
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      name="day"
                      value={dob.day}
                      onChange={(e) => handleDobChange(e, 'day')}
                      placeholder="Day"
                      maxLength={2}
                      inputMode="numeric"
                      className="bg-black/20 border-2 border-white/30 rounded-xl px-4 py-3  md:px-2 md:py-3 text-white text-start focus:outline-none focus:border-white/60"
                    />
                    <input
                      name="month"
                      ref={monthRef}
                      value={dob.month}
                      onChange={(e) => handleDobChange(e, 'month')}
                      placeholder="Month"
                      maxLength={2}
                      inputMode="numeric"
                      className="bg-black/20 border-2 border-white/30 rounded-xl px-4 py-3  md:px-2 md:py-3 text-white text-start focus:outline-none focus:border-white/60"
                    />
                    <input
                      name="year"
                      ref={yearRef}
                      value={dob.year}
                      onChange={(e) => handleDobChange(e, 'year')}
                      placeholder="Year"
                      maxLength={4}
                      inputMode="numeric"
                      className="bg-black/20 border-2 border-white/30 rounded-xl px-4 py-3  md:px-2 md:py-3 text-white text-start focus:outline-none focus:border-white/60"
                    />
                  </div>
                  {(errors.day || errors.month || errors.year) && (
                    <div className="text-xs text-rose-400 mt-1">
                      {errors.day || errors.month || errors.year}
                    </div>
                  )}
                </div>

                {/* 5️⃣ Gender identity */}
{/* 5️⃣ Gender + City (Row UI) */}
<div className="md:px-4 font-outfit grid grid-cols-2 gap-3">

  {/* Gender */}
  <div>
    <label className="text-white text-sm mb-2 block">
      Gender Identity
    </label>
<div onClick={() => setShowGenderModal(true)}
  className="w-full border border-white/40  border-b-[3px]
  rounded-[1rem] px-5 py-4 text-white text-lg 
  flex justify-between items-center cursor-pointer"
>
  <span className="flex items-center gap-2">
    ⚧ {gender ? gender : "Select"}
  </span>
  <span>▼</span>
</div>


{showGenderModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-end pr-80 ">

    <div
      className="w-[90%] max-w-xs text-white rounded-[2rem] p-6 border border-white/20 relative overflow-hidden "
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >

  <div className="absolute inset-0 bg-black/20"></div>

          <div 
      className=" w-full relative outfit-font text-white" 
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    />

      <h2 className="text-xl font-semibold">Select Gender</h2>
      <p className="text-sm text-white/60 mb-4">
        Gender is not visible on your profile
      </p>

      <div className="space-y-5">

        {[
          { label: "Male", value: "male", icon: "♂" },
          { label: "Female", value: "female", icon: "♀" },
          { label: "Non Binary", value: "nonbinary", icon: "⚧" },
          { label: "Prefer not to say", value: "none", icon: "🙂" },
        ].map((g) => (
          <div
            key={g.value}
            onClick={() => setTempGender(g.value)}
            className="flex justify-between items-center border-b border-white/20 pb-3 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span>{g.icon}</span>
              <span>{g.label}</span>
            </div>

            <div className={`w-5 h-5 rounded-full border-2 
              ${tempGender === g.value ? "border-white bg-white" : "border-white/50"}
            `}></div>
          </div>
        ))}

      </div>

      {/* Apply Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={() => {
            setGender(tempGender);
            setShowGenderModal(false);
          }}
          className="border border-white/40 px-6 py-2 rounded-full"
        >
          Apply
        </button>
      </div>

    </div>
  </div>
)}
  </div>

  {/* Preferred City */}
  <div>
    <label className="text-white text-sm mb-2 block">
      Preferred City
    </label>

  <div
  onClick={() => setShowCityModal(true)}
  className="w-full border border-white/40 border-b-[3px] 
  rounded-[1rem] px-5 py-4 text-white text-lg 
  flex justify-between items-center cursor-pointer"
>
  <span>{city || "Anywhere"}</span>
  <span>▼</span>
</div>
  </div>


  {showCityModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-end pr-28 pb-20 ">

    <div
      className="w-[90%] max-w-md text-white rounded-[2rem] p-6 border border-white/20 relative overflow-hidden"
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >

      {/* overlay */}
      <div className="absolute inset-0 bg-black/20"></div>

      <div className="relative z-10">

        <h2 className="text-xl font-semibold">Select city</h2>
        <p className="text-sm text-white/60 mb-4">
          We do not track your location
        </p>

        {/* Search (UI only) */}
        <div className="border border-white/30 rounded-full px-4 py-3 mb-4 flex items-center gap-2">
          🔍 <input
            placeholder="Search city"
            className="bg-transparent outline-none text-white placeholder-white/50 w-full"
          />
        </div>

        {/* List */}
        <div className="space-y-4 max-h-[300px] overflow-y-auto">

          {["Anywhere","Delhi","Bengaluru","Kolkata","Ahmedabad","Assam"].map((c) => (
            <div
              key={c}
              onClick={() => setTempCity(c)}
              className="flex justify-between items-center border-b border-white/20 pb-3 cursor-pointer"
            >
              <span>{c}</span>

              <div className={`w-5 h-5 rounded-full border-2 
                ${tempCity === c ? "border-white bg-white" : "border-white/50"}
              `}></div>
            </div>
          ))}

        </div>

        {/* Apply */}
        <div className="flex justify-end mt-6">
          <button
            onClick={() => {
              setCity(tempCity);
              setShowCityModal(false);
            }}
            className="border border-white/40 px-6 py-2 rounded-full"
          >
            Apply
          </button>
        </div>

      </div>
    </div>
  </div>
)}

</div>

                {/* Error Message */}
                {apiError && (
                  <div className="text-red-400 text-sm mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                    {apiError}
                  </div>
                )}

                {/* 6️⃣ Bottom button */}


                             <button
  type="button"
  disabled={loading}
  onClick={() => {
    if (validate()) setStep(2);
  }}
  className="w-84 md:w-[456px] flex mx-auto justify-center items-center mt-4 md:mt-5 border border-b-4 border-white/80 rounded-2xl py-3 text-white text-lg opacity-70 hover:opacity-100 transition hover:bg-white/5"
>
  Step 2/2: Add Prompt
</button>
               
              </form>





</div>

</div>

            </div>
          </div>



                        </>
  )}


    {step === 2 && (
    < >
      {/* Left */}
      <div className="flex items-center justify-center text-left border border-white/30 rounded-[3rem] px-12 hidden md:flex h-full]">
        <div>
          <h2 className="text-4xl font-bold mb-4 text-center">Add Prompt</h2>
          <p className="text-md opacity-90 text-center font-outfit">
            Okeeyy! Let’s get you started,
            <br />
            Just get done with the itsy bitsy stuff first
          </p>
        </div>
      </div>



          <div className="flex flex-col gap-6 items-center justify-center  overflow-hidden md:border md:border-white/30 md:rounded-[3rem]">
      {/* Right */}

<div className="w-full max-w-lg  flex flex-col  p-4">




<div className="md:hidden  tetxt-[14px] font-[family-name:var(--font-otomanopee)]">Add Prompt</div>
 <div className="flex items-center gap-2  md:hidden font-outfit">

       <p className="text-[10px] font-outfit text-white mt-1 leading-tight font-light font-[family-name:var(--font-otomanopee)]">
  Prompts show up as your opener<br/>
  Say Literally anything, it can be changed anytime
</p>
            </div>


            
          {/* Bordered wrapper — matches step 1 form border */}
<div className="md:border md:border-white/30 md:block rounded-[3rem] py-4 md:p-6 flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Prompt box */}
    <div className="border border-white/30 rounded-3xl p-10 text-white">
  <textarea
    value={prompt}
    onChange={(e) => {
      setPrompt(e.target.value);
      setSelectedPrompts([]);
    }}
    placeholder="Type your own"
    rows={3}
    className="w-full font-outfit bg-transparent resize-none outline-none text-center placeholder-white/60"
  />
  <div className="text-[10px] text-right opacity-40 mt-1">
    {prompt.length}/255
  </div>
</div>


          {/* Suggestions */}
          <div className="border border-white/30 rounded-2xl p-4 flex flex-col mt-3 font-outfit flex-1 min-h-0 overflow-y-auto">
            <div className="flex justify-between items-center text-white text-sm px-1">
              <span className="opacity-90 text-[12px]">Suggestions</span>
              <button 
                type="button" 
                onClick={async () => {
                  setIsShuffleLoading(true);
                  try {
                    const response = await fetch(API.USERS.GET_INTENT_PROMPTS(7));
                    if (response.ok) {
                      const data = await response.json();
                      setSuggestions(data.prompts?.map(p => p.text) || []);
                    }
                  } catch (err) {
                    console.error('Error shuffling suggestions:', err);
                  } finally {
                    setIsShuffleLoading(false);
                  }
                }}
                disabled={isShuffleLoading}
                className={`opacity-70 hover:opacity-100 transition ${isShuffleLoading ? 'animate-spin' : ''}`}
              >
                ⟳
              </button>
            </div>

<div
  className="flex flex-wrap gap-2 content-start items-start mt-4 overflow-hidden"
  style={{
    maxHeight: "310px" // 👈 tweak this once, don’t overthink
  }}
>
              {suggestions.map((text, i) => {
                const isLong = text.length > 25;
                const isSelected = selectedPrompts.includes(text);

                return (
<button
  key={i}
  type="button"
  onClick={() => {
    setSelectedPrompts(prev => {
      const isSelected = prev.includes(text);
      const newSelection = isSelected ? [] : [text];
      setPrompt(newSelection[0] || "");
      return newSelection;
    });
  }}
  className={`
    border border-[2px]  border-white/30 border-b-[4px] rounded-xl px-4 md:py-4 py-3  text-xs transition
    hover:bg-white/5
    ${isSelected ? "border-yellow-400 bg-yellow-400/10" : ""}
    
    inline-flex items-center justify-center
    whitespace-nowrap
    
    max-w-full
  `}
>
  {text}
</button>
                );
              })}
            </div>

 <div className="flex items-center gap-2  mt-6 hidden md:flex">
              <div className="w-5 h-5 rounded-full border border-white/40 flex items-center justify-center text-[10px]">i</div>
              <p className="text-[10px] text-white/50 leading-tight">
                Prompts show up as your opener<br/>
                Say Literally anything, it can be changed anytime
              </p>
            </div>
           
          </div>

          {/* Bottom actions */}
  <div className="mt-auto pt-3">
            
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-2 w-full border-2 border-white/30 rounded-2xl py-3 text-white text-lg hover:bg-white/5 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : isEditing ? 'Save Changes' : 'Create Facecard'}
            </button>
          </div>

          </div>{/* end bordered wrapper */}
          
        </div>
      </div>

    </>
  )}

    </main>
  </div>

  {/* Modal mounts only when showSignIn is true */}
  {showSignIn && <SignInModal isOpen={showSignIn} onClose={closeSignIn} />}
</div>
);
}
