"use client";

import OverlayBackdrop from '@/components/ui/OverlayBackdrop';
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SignInModal from "../auth/SignInModel"; // adjust path/casing if needed
import { API, apiRequest } from "@/lib/api";
import Skeleton from '@/components/ui/Skeleton';
import PortraitImageCropModal from "@/components/ui/PortraitImageCropModal";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { CiCirclePlus } from "react-icons/ci";
import BeamColourLogo from "@/components/ui/BeamColourLogo";

async function readHttpErrorMessage(res) {
  try {
    const ct = res.headers.get("content-type");
    if (ct && ct.includes("application/json")) {
      const j = await res.json();
      if (typeof j === "string") return j;
      const msg = j.message || j.error || j.detail;
      if (Array.isArray(msg)) return msg.filter(Boolean).join(" ");
      if (typeof msg === "string" && msg.trim()) return msg;
      return `Request failed (${res.status})`;
    }
    const t = await res.text();
    return (t && t.trim()) || res.statusText || `HTTP ${res.status}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

/** Match user-service DisplayNameSchema: map unicode spaces to ASCII (keeps intentional double spaces). */
function normalizeDisplayNameWhitespace(s) {
  return s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");
}

const DISPLAY_NAME_MAX_LEN = 8;
/** Matches @hmm/common PREFERRED_CITY_ANYWHERE_IN_INDIA / discovery city catalog value. */
const ANYWHERE_IN_INDIA = "ANYWHERE_IN_INDIA";

function getLiveNameError(raw) {
  const username = normalizeDisplayNameWhitespace(raw).trim();
  if (username.length > DISPLAY_NAME_MAX_LEN) {
    return `Name must be at most ${DISPLAY_NAME_MAX_LEN} characters.`;
  }
  return "";
}

const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const PROFILE_PHOTO_ACCEPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export default function Onboarding() {
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [city, setCity] = useState(ANYWHERE_IN_INDIA);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [dob, setDob] = useState({ day: "", month: "", year: "" });
  const [gender, setGender] = useState(null); // 'female' | 'male' | 'nonbinary'
  const [preferNotToSay, setPreferNotToSay] = useState(false);
  const [errors, setErrors] = useState({});

  const handleNameChange = (val) => {
    setName(val);
    if (apiError) setApiError("");
    const liveError = getLiveNameError(val);
    setNameError(liveError);
    setErrors((prev) => {
      const next = { ...prev };
      if (liveError) next.name = liveError;
      else delete next.name;
      return next;
    });
  };
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
  const [tempCity, setTempCity] = useState(ANYWHERE_IN_INDIA);


  const [showGenderModal, setShowGenderModal] = useState(false);
  const [tempGender, setTempGender] = useState(gender || "");

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState(null);
  const [cropSlotIndex, setCropSlotIndex] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchCities = async (q = '') => {
    try {
      setSearchLoading(true);
      if (q) {
        // Search API
        const data = await apiRequest(API.DISCOVERY.SEARCH_CITIES(q));
        setCities(data.cities || []);
      } else {
        // Catalog API (Active Options)
        const data = await apiRequest(API.DISCOVERY.GET_ACTIVE_CITY_OPTIONS);
        // data is { options: [...] }
        setCities(data.options?.map(c => ({ name: c.label, value: c.value })) || []);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (showCityModal) {
      const timer = setTimeout(() => {
        fetchCities(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, showCityModal]);
  // Get userId from token on mount
  useEffect(() => {
    // Overlay deep link: /onboarding?intent=1&overlay=1 should land directly on step 2.
    try {
      const sp = new URLSearchParams(window.location.search);
      const overlay = sp.get('overlay') === '1';
      const intent = sp.get('intent') === '1';
      if (overlay) setIsOverlayMode(true);
      if (intent) setStep(2);
    } catch (_) { }

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

        // Auth row must still exist. Deleted accounts → sign-in, never stay on onboarding.
        const statusCheck = await fetch(API.AUTH.GET_STATUS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (
          statusCheck.status === 401 ||
          statusCheck.status === 403 ||
          statusCheck.status === 404
        ) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          router.replace('/');
          return;
        }

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
            const loadedName = u.username || "";
            setName(loadedName);
            const loadedError = getLiveNameError(loadedName);
            setNameError(loadedError);
            if (loadedError) {
              setErrors((prev) => ({
                ...prev,
                name: loadedError,
              }));
            }
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
            if (u.preferredCity) {
              setCity(u.preferredCity);
              setTempCity(u.preferredCity);
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
              .slice(0, 6) // 👈 yaha control kar number
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

  const closePhotoCropModal = () => {
    setCropModalOpen(false);
    setCropSlotIndex(null);
    setCropImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const applyPhotoAtSlot = (file, index) => {
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

  const openPhotoCrop = (file, index) => {
    const url = URL.createObjectURL(file);
    setCropSlotIndex(index);
    setCropImageUrl(url);
    setCropModalOpen(true);
  };

  const onPhotoInputChange = (e, index) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    if (!PROFILE_PHOTO_ACCEPT_TYPES.includes(file.type)) {
      setApiError("Please choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setApiError("Image must be 10MB or smaller.");
      return;
    }
    setApiError("");
    openPhotoCrop(file, index);
  };

  const handleCroppedOnboardingPhoto = async (file) => {
    const index = cropSlotIndex;
    if (index === null || index === undefined) return;
    applyPhotoAtSlot(file, index);
    closePhotoCropModal();
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

  const uploadToService = async (file, slotIndex = 0) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'profile-photos');

    // First slot becomes DP; remaining slots are gallery (groups/objects OK)
    const moderationPurpose = slotIndex === 0 ? 'display' : 'gallery';
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API.FILES.UPLOAD}?folder=profile-photos&maxWidth=1600&maxHeight=2400&quality=88&moderationPurpose=${moderationPurpose}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const msg = await readHttpErrorMessage(response);
      throw new Error(msg || 'Failed to upload image');
    }

    const data = await response.json();
    if (!data?.file?.url) {
      throw new Error('Upload succeeded but no file URL was returned.');
    }
    return data.file.url;
  };

  const validate = () => {
    const e = {};

    const username = normalizeDisplayNameWhitespace(name).trim();
    if (!username) {
      e.name = "Please enter your name.";
    } else if (username.length < 3) {
      e.name = "Name must be at least 3 characters.";
    } else if (username.length > DISPLAY_NAME_MAX_LEN) {
      e.name = `Name must be at most ${DISPLAY_NAME_MAX_LEN} characters.`;
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
    if (!city) e.city = "Please select a city";

    setNameError(getLiveNameError(name));
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
      for (let slotIndex = 0; slotIndex < photoFiles.length; slotIndex++) {
        const file = photoFiles[slotIndex];
        if (file) {
          const url = await uploadToService(file, slotIndex);
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

      // Display name may be shared (e.g. "John"); identity uniqueness is the user id.
      const preferredCity =
        !city || city === "Anywhere" ? ANYWHERE_IN_INDIA : city;

      const profileData = {
        username: normalizeDisplayNameWhitespace(name).trim(),
        dateOfBirth: dobDate.toISOString(),
        gender: backendGender,
        displayPictureUrl,
        intent: prompt.trim() || undefined,
        preferredCity
      };

      // If editing, skip the create profile step entirely and only update intent/photos
      if (isEditing) {
        console.warn('Editing existing profile, skipping create call...');
      } else {
        // 2. Create Profile (Bearer required — rejects leftover JWTs after hard-delete)
        const accessTokenForCreate =
          typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const response = await fetch(API.USERS.CREATE_PROFILE(userId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessTokenForCreate
              ? { Authorization: `Bearer ${accessTokenForCreate}` }
              : {}),
          },
          body: JSON.stringify(profileData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || "";

          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            throw new Error(
              errorMessage || 'Your session expired. Please sign in again.'
            );
          } else if (errorMessage.toLowerCase().includes('already exists')) {
            console.warn('Profile already exists, proceeding with updates...');
          } else {
            throw new Error(errorMessage || 'Profile creation failed');
          }
        }
      }

      // 2.5 Save City Preference (including Anywhere in India)
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (preferredCity && accessToken) {
        await apiRequest(API.USERS.UPDATE_PREFERRED_CITY, {
          method: 'PATCH',
          body: JSON.stringify({ city: preferredCity })  // user-service expects { city }, not { preferredCity }
        });
        // Also update discovery service location preference (same city, different store)
        await apiRequest(API.DISCOVERY.UPDATE_LOCATION_PREFERENCE, {
          method: 'PATCH',
          body: JSON.stringify({ city: preferredCity })
        }).catch(() => { }); // non-critical
      }

      // 3. Add extra photos if any
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
      const num = parseInt(val, 10);
      // Block only clearly invalid 2-digit entries (e.g. 00, 32+)
      if (val.length === 2 && (num < 1 || num > 31)) return;
      // Allow any single digit (1-9) — user may not have finished typing
      setDob((prev) => ({ ...prev, day: val }));
      // Auto-advance only when a full 2-digit value is entered
      if (val.length === 2) monthRef.current?.focus();
    }
    else if (field === "month") {
      val = val.slice(0, 2);
      const num = parseInt(val, 10);
      // Block only clearly invalid 2-digit entries (e.g. 00, 13+)
      if (val.length === 2 && (num < 1 || num > 12)) return;
      // Allow any single digit (1-9) — user may type '2' and move on manually
      setDob((prev) => ({ ...prev, month: val }));
      // Auto-advance only when a full 2-digit value is entered
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

    <div className="w-full h-full overflow-y-auto scrollbar-hide relative outfit-font text-white"
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <PortraitImageCropModal
        open={cropModalOpen && !!cropImageUrl}
        imageUrl={cropImageUrl}
        onClose={closePhotoCropModal}
        onComplete={handleCroppedOnboardingPhoto}
      />

      <div className=" mx-auto ">



        <main className="
  grid
  grid-cols-1
  lg:grid-cols-2
  gap-4
  min-h-screen
  p-3
  md:p-6
">

          {step === 1 && (
            <>


              {/* <div className="pt-10 px-4 flex flex-col items-center text-center  md:mb-10">
  <BeamColourLogo alt="beam" className="w-40 mx-auto" />
  <p className="text-white text-lg font-medium mt-1">
    Meet someone here
  </p>
</div> */}
              {/* Left */}
              <div className="bg-gradient-purple-dark flex items-center justify-center text-center w-full mx-auto md:border md:border-white/30 md:rounded-[60px] hidden md:flex ">
                <div className="mx-auto ">

                  <h3 className="text-3xl font-bold ">Welcome onboard,</h3>
                  <p className="md:text-lg text-sm md:mt-3  opacity-95 font-outfit">Okeeyy! Let's get you started,</p>
                  <p className="md:text-lg text-sm  opacity-95 font-outfit">Just get done with the itsy bitsy stuff first</p>
                </div>
              </div>




              {/* Right - Form */}

              <div className="items-center md:h-[96dvh] min-h-0 h-auto md:overflow-hidden overflow-y-auto">

                <div className="flex flex-col items-center md:justify-center h-auto md:h-full md:min-h-full overflow-visible md:overflow-hidden md:border md:border-white/30 md:rounded-[60px] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <div className="overflow-visible md:overflow-hidden w-full sm:max-w-[420px] md:max-w-[520px] rounded-2xl mx-auto compact-on-short">



                    <div className="mx-auto md:hidden  flex flex-col items-center text-center mb-6 ">
                      <BeamColourLogo alt="beam" className="w-28 mx-auto" />

                      <p className="text-sm font-bold outfit-font">Welcome onboard!</p>
                      <p className="md:text-sm text-sm md:mt-3 md:font-medium opacity-95 outfit-font">getting your started now</p>

                    </div>




                    <div className="flex flex-col justify-start h-auto mt-4">


                      <div
                        className="
 
      origin-top
      transition-all
    "
                      >

                        <div className="flex items-center justify-center ">
                          <div className="w-full md:border md:border-white/30 md:p-2   md:pb-3  md:rounded-[60px] ">
                            <form
                              onSubmit={handleSubmit}
                              className="
                                space-y-3
                                md:space-y-5
                                md:p-2
                              
                              "
                            >

                              {/* 2️⃣ Photo upload UI */}
                              <div className=" border border-white/30 w-[95%] mx-auto py-2 md:p-5 md:rounded-[44px]  rounded-[20px] ">

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
  w-[92px] sm:w-[110px] md:w-32 
  max-h-[140px] sm:max-h-[160px] md:max-h-full
  aspect-[4/6] md:aspect-[2/3] 
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
                                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-whitetext-sm flex items-center justify-center "
                                            >
                                              ✕
                                            </button>
                                          </>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center h-full text-white">
                                            <CiCirclePlus className="text-[50px] opacity-60  rounded-full " />

                                          </div>
                                        )}

                                        <input
                                          ref={(el) => (fileRefs.current[i] = el)}
                                          type="file"
                                          accept="image/*"
                                          hidden
                                          onChange={(e) => onPhotoInputChange(e, i)}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                <p className="text-white/50 text-sm text-center font-outfit mt-3">
                                  Upload your niceeee pictures
                                </p>
                                {apiError && (
                                  <div className="px-2 sm:px-3 max-w-md mx-auto">
                                    <ErrorAlert message={apiError} className="mt-3" />
                                  </div>
                                )}
                              </div>

                              {/* 3️⃣ Name input */}


                              <div className="md:px-4 px-2 font-outfit">
                                <label className="text-white text-sm mb-1 block">
                                  Enter name/ username
                                </label>
                                <input
                                  value={name}
                                  onChange={(e) => handleNameChange(e.target.value)}
                                  onInput={(e) => handleNameChange(e.target.value)}
                                  aria-invalid={Boolean(nameError || errors.name)}
                                  className={`w-full bg-black/20 border-2 rounded-2xl px-5 py-3 md:px-4 md:py-5 text-white placeholder-white/50 focus:outline-none ${
                                    nameError || errors.name
                                      ? "border-rose-400 focus:border-rose-400"
                                      : "border-white/30 focus:border-white/60"
                                  }`}
                                  placeholder="Your name"
                                />
                                {(nameError || errors.name) && (
                                  <div className="text-sm text-rose-400 mt-1.5 font-medium">
                                    {nameError || errors.name}
                                  </div>
                                )}
                              </div>

                              {/* 4️⃣ DOB inputs */}
                              <div className="md:px-4 px-2 font-outfit">
                                <label className="text-white text-sm mb-1 block">Date of birth</label>
                                <div className="grid grid-cols-3 gap-4">
                                  <input
                                    name="day"
                                    value={dob.day}
                                    onChange={(e) => handleDobChange(e, 'day')}
                                    placeholder="Day"
                                    maxLength={2}
                                    inputMode="numeric"
                                    className="bg-black/20 border-2 border-white/30 rounded-xl px-4 py-3  md:px-5 md:py-5 text-white text-start focus:outline-none focus:border-white/60"
                                  />
                                  <input
                                    name="month"
                                    ref={monthRef}
                                    value={dob.month}
                                    onChange={(e) => handleDobChange(e, 'month')}
                                    placeholder="Month"
                                    maxLength={2}
                                    inputMode="numeric"
                                    className="bg-black/20 border-2 border-white/30 rounded-xl px-4 py-3  md:px-5 md:py-5 text-white text-start focus:outline-none focus:border-white/60"
                                  />
                                  <input
                                    name="year"
                                    ref={yearRef}
                                    value={dob.year}
                                    onChange={(e) => handleDobChange(e, 'year')}
                                    placeholder="Year"
                                    maxLength={4}
                                    inputMode="numeric"
                                    className="bg-black/20 border-2 border-white/30 rounded-xl px-4 py-3  md:px-5 md:py-5 text-white text-start focus:outline-none focus:border-white/60"
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
                              <div className="md:px-4 px-2 font-outfit grid grid-cols-2 gap-3">

                                {/* Gender */}
                                <div>
                                  <label className="text-white text-sm mb-2 block">
                                    Gender Identity
                                  </label>
                                  <div onClick={() => setShowGenderModal(true)}
                                    className="w-full border border-white/40 border-b-[3px]
  rounded-[1rem] px-5 py-3 md:py-5 text-white text-lg 
  flex justify-between items-center cursor-pointer gap-2"
                                  >
                                    <span className="flex items-center gap-2 truncate min-w-0">
                                      {gender === 'male' ? '♂ Male' : gender === 'female' ? '♀ Female' : gender === 'nonbinary' ? '⚧ Non Binary' : preferNotToSay ? '🙂 Prefer not to say' : 'Select'}
                                    </span>
                                    <span className="shrink-0">▼</span>
                                  </div>
                                  {errors.gender && <div className="text-xs text-rose-400 mt-1">{errors.gender}</div>}


                                  {showGenderModal && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center md:justify-end md:pr-72">
                                      <OverlayBackdrop onClick={() => setShowGenderModal(false)} />
                                      <div
                                        className="relative z-10 w-[90%] max-w-xs text-white rounded-[2rem] p-6 overflow-hidden "
                                        style={{
                                          backgroundImage: "url('/assets/mb.jpg')",
                                          backgroundSize: "cover",
                                          backgroundPosition: "center",
                                        }}
                                      >

                                        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

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

                                        <div className="space-y-5 z-50">

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
                                              if (tempGender === 'none') {
                                                setGender(null);
                                                setPreferNotToSay(true);
                                              } else {
                                                setGender(tempGender);
                                                setPreferNotToSay(false);
                                              }
                                              setShowGenderModal(false);
                                            }}
                                            className="border border-white/40 px-6 py-2 rounded-full hover:bg-white/5 transition-colors"
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
                                    onClick={() => {
                                      setTempCity(city || ANYWHERE_IN_INDIA);
                                      setSearchQuery("");
                                      setShowCityModal(true);
                                    }}
                                    className="w-full border border-white/40 border-b-[3px] 
  rounded-[1rem] px-5 py-3 md:py-5 text-white text-lg 
  flex justify-between items-center cursor-pointer gap-2"
                                  >
                                    <span className="truncate min-w-0">{
                                      city === ANYWHERE_IN_INDIA || city === "Anywhere"
                                        ? "Anywhere in India"
                                        : (cities.find(c => c.value === city)?.name || city || "Anywhere in India")
                                    }</span>
                                    <span className="shrink-0">▼</span>
                                  </div>
                                  {errors.city && <div className="text-xs text-rose-400 mt-1">{errors.city}</div>}
                                </div>


                                {showCityModal && (
                                  <div className="fixed inset-0 z-50 flex items-center justify-center md:justify-end md:pr-40 md:pb-14">
                                    <OverlayBackdrop onClick={() => setShowCityModal(false)} />
                                    <div
                                      className="relative z-10 w-[90%] max-w-sm text-white rounded-[2rem] p-6 border border-white/20 overflow-hidden"
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
                                        <div className="border border-white/30 rounded-full px-4 py-3 mb-4 flex items-center gap-2 focus-within:border-white/60 transition-colors">
                                          🔍 <input
                                            placeholder="Search city"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-transparent outline-none text-white placeholder-white/50 w-full"
                                          />
                                        </div>

                                        {/* List */}
                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                          {/* Always offer national feed; catalog may also include it — avoid duplicates below */}
                                          {(!searchQuery || "anywhere in india".includes(searchQuery.toLowerCase())) && (
                                            <div
                                              onClick={() => setTempCity(ANYWHERE_IN_INDIA)}
                                              className="flex justify-between items-center border-b border-white/20 pb-3 cursor-pointer hover:bg-white/5 transition-colors px-2"
                                            >
                                              <span>Anywhere in India</span>
                                              <div className={`w-5 h-5 rounded-full border-2 transition-all
                ${tempCity === ANYWHERE_IN_INDIA || tempCity === "Anywhere" ? "border-white bg-white" : "border-white/50"}
              `}></div>
                                            </div>
                                          )}

                                          {searchLoading && <div className="text-white/50 text-center py-4">Searching...</div>}

                                          {!searchLoading && cities.filter((c) => c.value !== ANYWHERE_IN_INDIA).length === 0 && (
                                            <div className="text-white/50 text-center py-4 italic">No cities found</div>
                                          )}

                                          {!searchLoading && cities.filter((c) => c.value !== ANYWHERE_IN_INDIA).map((c) => (
                                            <div
                                              key={c.id || c.value}
                                              onClick={() => setTempCity(c.value)}
                                              className="flex justify-between items-center border-b border-white/20 pb-3 cursor-pointer hover:bg-white/5 transition-colors px-2"
                                            >
                                              <span>{c.name || c.label}</span>

                                              <div className={`w-5 h-5 rounded-full border-2 transition-all
                ${tempCity === c.value ? "border-white bg-white" : "border-white/50"}
              `}></div>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Apply */}
                                        <div className="flex justify-end mt-6">
                                          <button
                                            onClick={() => {
                                              setCity(tempCity || ANYWHERE_IN_INDIA);
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

                              {/* 6️⃣ Bottom button */}


                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => {
                                  if (validate()) setStep(2);
                                }}
                                className="w-84  md:w-[456px] w-[85%] flex mx-auto justify-center items-center mt-6 md:mt-8 mx-auto border border-b-[3px] border-white/80 rounded-xl md:rounded-2xl py-3 md:py-4 text-white text-md opacity-70 hover:opacity-100 transition hover:bg-white/5"
                              >
                                Step 2/2: Add Prompt
                              </button>

                            </form>


                          </div>
                        </div>


                      </div>

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
                  <h2 className="text-3xl font-bold mb-4 text-center">Add Prompt</h2>
                  <p className="text-md opacity-90 text-center font-outfit">
                    Promts Show Up as your opener
                    <br />
                    Say literally anything, it can be changed anytime
                  </p>
                </div>
              </div>



              <div className="flex flex-col md:flex md:flex-col gap-6 items-center justify-center overflow-visible md:overflow-hidden md:border md:border-white/30 md:rounded-[3rem] w-full h-full pb-6 md:pb-0">
                {/* Right */}

                <div className="w-full max-w-lg  flex flex-col  ">




                  <div className="md:hidden  text-[14px] font-[family-name:var(--font-otomanopee)]">Add Prompt</div>
                  <div className="flex items-center gap-2  md:hidden font-outfit">

                    <p className="text-[10px] font-outfit text-white mt-1 leading-tight font-light font-[family-name:var(--font-otomanopee)]">
                      Prompts show up as your opener<br />
                      Say Literally anything, it can be changed anytime
                    </p>
                  </div>



                  {/* Bordered wrapper — matches step 1 form border */}
                  <div className="md:border md:border-white/30 md:block md:rounded-[50px] py-4 md:p-4 flex flex-col flex-1 min-h-0 overflow-visible md:overflow-hidden  mt-6 sm:mt-0">

                    {/* Prompt box */}
                    <div className="border border-white/30 md:rounded-[36px] rounded-[20px] p-10 text-white">
                      <textarea
                        value={prompt}
                        onChange={(e) => {
                          setPrompt(e.target.value.slice(0, 255));
                          setSelectedPrompts([]);
                          if (apiError) setApiError("");
                        }}
                        maxLength={255}
                        placeholder="Type your own"
                        className="w-full font-outfit bg-transparent resize-none outline-none text-center placeholder-white/60 h-[72px] md:h-[96px]"
                      />
                      <div className="text-[10px] text-right opacity-40 mt-1">
                        {prompt.length}/255
                      </div>
                    </div>


                    {/* Suggestions */}
                    <div className="border border-white/30 mt-3 md:rounded-[40px] rounded-[20px] p-4 flex flex-col  font-outfit flex-1 min-h-0 overflow-visible md:overflow-y-auto">
                      <div className="flex justify-between items-center text-white text-sm px-1 mt-4">
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
                      <div className="flex flex-wrap gap-2 h-auto md:h-[300px] content-start items-start mt-6 overflow-visible md:overflow-hidden">
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
    border border-[1px]  border-white/40 border-b-[3px] rounded-xl px-4 md:py-4 py-3  text-xs transition
    hover:bg-white/5
    ${isSelected ? "border-yellow-400 bg-yellow-400/10" : ""}
    
    inline-flex items-center justify-center
    max-w-full
  `}
                            >
                              <span className="line-clamp-2 whitespace-normal text-start break-words">
                                {text}
                              </span>
                            </button>
                          );
                        })}
                      </div>



                    </div>

                    {/* Bottom actions */}
                    <div className="mt-8  md:mt-0 md:pt-8   mb-4 w-[90%]  mx-auto flex flex-col items-center">

                      {apiError && (
                        <ErrorAlert message={apiError} className="mt-0 mb-4 w-full" />
                      )}

                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-2  w-full mx-auto border-[2px] border-b-[4px] border-white/30 rounded-2xl py-3 text-white text-lg hover:bg-white/5 transition disabled:opacity-50 "
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
