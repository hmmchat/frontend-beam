"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SignInModal from "../auth/SignInModel"; // adjust path/casing if needed
import { API } from "@/lib/api";





export default function Onboarding() {
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // form state
  const [name, setName] = useState("");
  const [dob, setDob] = useState({ day: "", month: "", year: "" });
  const [gender, setGender] = useState(null); // 'female' | 'male' | 'nonbinary'
  const [preferNotToSay, setPreferNotToSay] = useState(false);
  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([null, null, null]);
  const [photoFiles, setPhotoFiles] = useState([null, null, null]);
  const fileRefs = useRef([]);
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [selectedPrompts, setSelectedPrompts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isShuffleLoading, setIsShuffleLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isOverlayMode, setIsOverlayMode] = useState(false);

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
        const response = await fetch(API.USERS.GET_INTENT_PROMPTS(6));
        if (response.ok) {
          const data = await response.json();
          // Data is { prompts: [{ id, text }, ...] }
          setSuggestions(data.prompts?.map(p => p.text) || []);
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

  if (loading && !apiError && !name) {
    return (
      <div className=" w-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-2xl">Checking profile...</div>
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



      <div className=" mx-auto  ">
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 py-4  ">

            {step === 1 && (
    <>
          {/* Left */} 
          <div className="bg-gradient-purple-dark flex items-center justify-center text-center w-full mx-auto border border-white/30 rounded-2xl py-20  ">
            <div className="mx-auto ">

            <h3 className="text-4xl font-bold outfit-font">Welcome onboard,</h3>
              <p className="md:text-xl text-sm md:mt-3 md:font-medium opacity-95 outfit-font">Okeeyy! Let's get you started,</p>
              <p className="md:text-xl text-sm md:font-medium opacity-95 outfit-font">Just get done with the itsy bitsy stuff first</p>
            </div>
          </div>




          {/* Right - Form */}
          <div className="flex justify-center border border-white/30 rounded-2xl  ">
            <div className="w-full max-w-[540px] rounded-2xl p-6  mx-auto ">
              <form onSubmit={handleSubmit} className="space-y-6 border border-white/30 p-3 py-5 pb-10 rounded-[3rem]">
                
                {/* 2️⃣ Photo upload UI */}
                <div className="mb-8 border border-white/30 p-3 py-5 rounded-[3rem]">
                

                  <div className="flex justify-center gap-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="relative w-32 h-48 rounded-xl border-2 border-white/30 overflow-hidden bg-white/5 cursor-pointer"
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
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white text-black text-sm flex items-center justify-center"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-white text-3xl">
                            +
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
                    ))}
                  </div>
                    <p className="text-white/50 text-sm text-center mt-3">
                    Upload your niceeee pictures
                  </p>
                </div>

                {/* 3️⃣ Name input */}


                <div className="px-4">
                  <label className="text-white text-sm mb-1 block">
                    Enter name/ username
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/20 border-2 border-white/30 rounded-xl px-5 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/60"
                    placeholder="Your name"
                  />
                  {errors.name && <div className="text-xs text-rose-400 mt-1">{errors.name}</div>}
                </div>

                {/* 4️⃣ DOB inputs */}
                <div className="px-4">
                  <label className="text-white text-sm mb-1 block">Date of birth</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      name="day"
                      value={dob.day}
                      onChange={(e) => setDob((d) => ({ ...d, day: numericOnly(e.target.value, 2) }))}
                      placeholder="Day"
                      inputMode="numeric"
                      className="bg-black/20 border-2 border-white/30 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-white/60"
                    />
                    <input
                      name="month"
                      value={dob.month}
                      onChange={(e) => setDob((d) => ({ ...d, month: numericOnly(e.target.value, 2) }))}
                      placeholder="Month"
                      inputMode="numeric"
                      className="bg-black/20 border-2 border-white/30 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-white/60"
                    />
                    <input
                      name="year"
                      value={dob.year}
                      onChange={(e) => setDob((d) => ({ ...d, year: numericOnly(e.target.value, 4) }))}
                      placeholder="Year"
                      inputMode="numeric"
                      className="bg-black/20 border-2 border-white/30 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-white/60"
                    />
                  </div>
                  {(errors.day || errors.month || errors.year) && (
                    <div className="text-xs text-rose-400 mt-1">
                      {errors.day || errors.month || errors.year}
                    </div>
                  )}
                </div>

                {/* 5️⃣ Gender identity */}
                <div className="px-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white text-sm">Gender Identity</label>
                    <label className="text-white/60 text-xs flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={preferNotToSay}
                        onChange={(e) => {
                          setPreferNotToSay(e.target.checked);
                          if (e.target.checked) setGender(null);
                        }}
                      />
                      Prefer not to say
                    </label>
                  </div>

                  <div className="flex gap-3">
                    {[
                      { label: "Female", value: "female", icon: "♀" },
                      { label: "Male", value: "male", icon: "♂" },
                      { label: "Nonbinary", value: "nonbinary", icon: "⚧" },
                    ].map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGender(g.value)}
                        disabled={preferNotToSay}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-white transition border border-b-4
                        ${
                          gender === g.value
                            ? "border-yellow-400 bg-yellow-400/10"
                            : "border-white/30"
                        } ${preferNotToSay ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <span>{g.icon}</span>
                        <span className="text-xs md:text-sm lg:text-base">{g.label}</span>
                      </button>
                    ))}
                  </div>
                  {errors.gender && !preferNotToSay && <div className="text-xs text-rose-400 mt-1">{errors.gender}</div>}
                </div>
  

                {/* Error Message */}
                {apiError && (
                  <div className="text-red-400 text-sm mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                    {apiError}
                  </div>
                )}

                {/* 6️⃣ Bottom button */}
               
              </form>
             <button
  type="button"
  disabled={loading}
  onClick={() => {
    if (validate()) setStep(2);
  }}
  className="w-full mt-8 border-2 border-b-4 border-white/80 rounded-2xl py-4 text-white text-lg opacity-70 hover:opacity-100 transition hover:bg-white/5"
>
  Next: Add intent
</button>

            </div>
          </div>


                        </>
  )}


    {step === 2 && (
    < >
      {/* Left */}
      <div className="flex items-center justify-center text-left border border-white/30 rounded-2xl px-12">
        <div>
          <h2 className="text-4xl font-bold mb-4">Add Prompt</h2>
          <p className="text-lg opacity-90">
            Okeeyy! Let’s get you started,
            <br />
            Just get done with the itsy bitsy stuff first
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex justify-center border border-white/30 rounded-2xl p-6">
        <div className="w-full max-w-lg space-y-6">

          {/* Prompt box */}
    <div className="border border-white/30 rounded-2xl p-6 text-white">
  <textarea
    value={prompt}
    onChange={(e) => {
      setPrompt(e.target.value);
      setSelectedPrompts([]);
    }}
    placeholder="Type your own"
    rows={3}
    className="w-full bg-transparent resize-none outline-none text-center placeholder-white/60"
  />
  <div className="text-[10px] text-right opacity-40 mt-1">
    {prompt.length}/255
  </div>
</div>


          {/* Suggestions */}
          <div className="border border-white/30 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center text-white text-sm">
              <span className="opacity-70">Suggestions</span>
              <button 
                type="button" 
                onClick={async () => {
                  setIsShuffleLoading(true);
                  try {
                    const response = await fetch(API.USERS.GET_INTENT_PROMPTS(6));
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

            <div className="grid grid-cols-2 gap-3">
              {suggestions.map((text, i) => {
                const wordCount = text.trim().split(/\s+/).length;
                const isLong = wordCount > 6;
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
                      border border-white/30 rounded-xl px-4 py-3 text-xs transition text-center
                      hover:bg-white/5
                      ${isLong ? "col-span-2" : "col-span-1"}
                      ${isSelected ? "border-yellow-400 bg-yellow-400/10" : ""}
                      min-h-[3.5rem] flex items-center justify-center
                      whitespace-normal leading-relaxed
                    `}
                  >
                    {text}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div className="w-5 h-5 rounded-full border border-white/40 flex items-center justify-center text-[10px]">i</div>
              <p className="text-[10px] text-white/50 leading-tight">
                Prompts show up as your opener<br/>
                Say Literally anything, it can be changed anytime
              </p>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="pt-4 flex gap-4">
            <button
               onClick={() => {
                 if (isOverlayMode) {
                   // Ask parent overlay to close and return to call/matchmaking.
                   window.parent?.postMessage('overlay:close', '*');
                   return;
                 }
                 setStep(1);
               }}
               className="flex-1 border-2 border-white/30 rounded-2xl py-4 text-white text-lg hover:bg-white/5 transition"
            >
               ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-2 w-full border-2 border-white/30 rounded-2xl py-4 text-white text-lg hover:bg-white/5 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : isEditing ? 'Save Changes' : 'Create Facecard'}
            </button>
          </div>
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
