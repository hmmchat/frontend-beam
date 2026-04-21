"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import {
  calculateProgress,
  getZodiac,
  calculateAge,
} from "@/lib/facecard-utils";

// Components
import FacecardDisplay from "@/components/facecard/FacecardDisplay";
import FacecardEditor from "@/components/facecard/FacecardEditor";
import SelectorOverlay from "@/components/facecard/SelectorOverlay";

import Skeleton from "@/components/ui/Skeleton";
import FaceCard2 from "@/components/Home/FaceCard2";

const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const PROFILE_PHOTO_ACCEPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

async function readHttpErrorMessage(res) {
  try {
    const ct = res.headers.get("content-type");
    if (ct && ct.includes("application/json")) {
      const j = await res.json();
      if (typeof j === "string") return j;
      return (
        j.message || j.error || j.detail || `Request failed (${res.status})`
      );
    }
    const t = await res.text();
    return (t && t.trim()) || res.statusText || `HTTP ${res.status}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

function musicTrackKey(song) {
  if (!song) return "";
  return (
    song.spotifyId || song.id || `${song.name || ""}\0${song.artist || ""}`
  );
}

import ProfileGuard from "@/components/auth/ProfileGuard";

export default function FacecardPage() {
  return (
    <ProfileGuard>
      <FacecardContent />
    </ProfileGuard>
  );
}

function FacecardContent() {
  const router = useRouter();
  const [view, setView] = useState("success"); // 'success' or 'editor'
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [targetUserId, setTargetUserId] = useState("");
  const fileInputRef = useRef(null);
  const [activeSlot, setActiveSlot] = useState(null);

  // Dynamic Data State
  const [masterInterests, setMasterInterests] = useState([]);
  const [masterValues, setMasterValues] = useState([]);
  const [masterBrands, setMasterBrands] = useState([]);
  const [allInterests, setAllInterests] = useState([]);
  const [allValues, setAllValues] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [allZodiacs, setAllZodiacs] = useState([]);
  const [showSelector, setShowSelector] = useState(null); // 'interests' | 'values' | 'brands' | 'music' | 'zodiacs'
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingItems, setIsSearchingItems] = useState(false);
  const [facecardPreviewOpen, setFacecardPreviewOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [musicSavingKey, setMusicSavingKey] = useState(null);
  const [exitEditorToProfile, setExitEditorToProfile] = useState(false);

  const progress = calculateProgress(user);

  // Read ?userId=... without using useSearchParams() (avoids Suspense requirement).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setTargetUserId(String(sp.get("userId") || "").trim());
    const requestedView = String(sp.get("view") || "")
      .trim()
      .toLowerCase();
    if (requestedView === "success" || requestedView === "editor") {
      setView(requestedView);
    }
    const from = String(sp.get("from") || "")
      .trim()
      .toLowerCase();
    setExitEditorToProfile(from === "profile");
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/");
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const authUid = payload.sub || payload.uid;
        const effectiveUid = targetUserId || authUid;

        const canEdit =
          !targetUserId || String(effectiveUid) === String(authUid);
        if (!canEdit) setView("success"); // force read-only facecard view

        const response = await fetch(
          `${API.USERS.GET_USER(effectiveUid)}?fields=username,dateOfBirth,gender,displayPictureUrl,intent,photos,musicPreference,brandPreferences,interests,values,preferredCity,zodiac,zodiacId,zodiacOverridden`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          console.error("❌ Failed to fetch profile:", response.status);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchChoices = async () => {
      try {
        const [intRes, valRes, brRes, zodiacRes] = await Promise.all([
          fetch(API.DISCOVERY.GET_INTERESTS),
          fetch(API.DISCOVERY.GET_VALUES),
          fetch(API.DISCOVERY.GET_BRANDS),
          fetch(API.USERS.GET_ZODIACS),
        ]);
        if (intRes.ok) {
          const data = (await intRes.json()).interests;
          setMasterInterests(data);
          setAllInterests(data);
        }
        if (valRes.ok) {
          const data = (await valRes.json()).values;
          setMasterValues(data);
          setAllValues(data);
        }
        if (brRes.ok) {
          const data = (await brRes.json()).brands;
          setMasterBrands(data);
          setAllBrands(data);
        }
        if (zodiacRes.ok) {
          const data = await zodiacRes.json();
          // Backend returns { ok: true, zodiacs: [...] } or just the array depending on route
          const z = data?.zodiacs || (Array.isArray(data) ? data : []);
          console.log("[Facecard] Fetched zodiacs:", z.length);
          setAllZodiacs(z);
        } else {
          console.warn("[Facecard] Failed to fetch zodiacs:", zodiacRes.status);
          // Fallback to static data if backend fails, to ensure selector works
          setAllZodiacs([
            {
              id: "aries",
              name: "Aries",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/aries.png",
            },
            {
              id: "taurus",
              name: "Taurus",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/taurus.png",
            },
            {
              id: "gemini",
              name: "Gemini",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/gemini.png",
            },
            {
              id: "cancer",
              name: "Cancer",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/cancer.png",
            },
            {
              id: "leo",
              name: "Leo",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/leo.png",
            },
            {
              id: "virgo",
              name: "Virgo",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/virgo.png",
            },
            {
              id: "libra",
              name: "Libra",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/libra.png",
            },
            {
              id: "scorpio",
              name: "Scorpio",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/scorpio.png",
            },
            {
              id: "sagittarius",
              name: "Sagittarius",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/sagittarius.png",
            },
            {
              id: "capricorn",
              name: "Capricorn",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/capricorn.png",
            },
            {
              id: "aquarius",
              name: "Aquarius",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/aquarius.png",
            },
            {
              id: "pisces",
              name: "Pisces",
              imageUrl: "https://cdn.hmmchat.live/horoscopes/pisces.png",
            },
          ]);
        }
      } catch (error) {
        console.error("Error fetching choices:", error);
      }
    };

    fetchProfile();
    fetchChoices();
  }, [router, targetUserId]);

  // Prevent switching to editor when viewing someone else's facecard.
  const safeSetView = (nextView) => {
    if (targetUserId) return;
    setView(nextView);
  };

  const handleExitEditor = () => {
    if (exitEditorToProfile) {
      router.replace("/profile");
      return;
    }
    safeSetView("success");
  };

  useEffect(() => {
    if (!showSelector) {
      if (masterInterests.length > 0) setAllInterests(masterInterests);
      if (masterValues.length > 0) setAllValues(masterValues);
      if (masterBrands.length > 0) setAllBrands(masterBrands);
    }
  }, [showSelector, masterInterests, masterValues, masterBrands]);

  const toggleInterest = async (interestId, name) => {
    if (!user) return;
    const token = localStorage.getItem("accessToken");
    const current = user.interests || [];
    const exists = current.find((i) => i.interestId === interestId);
    let newList;

    if (exists) {
      newList = current.filter((i) => i.interestId !== interestId);
    } else {
      newList = [...current, { interestId, interest: { name } }];
    }

    setUser((prev) => ({ ...prev, interests: newList }));

    try {
      const res = await fetch(API.USERS.UPDATE_INTERESTS, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interestIds: newList.map((i) => i.interestId) }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch (err) {
      console.error("Error saving interests:", err);
      setUser((prev) => (prev ? { ...prev, interests: current } : prev));
    }
  };

  const toggleValue = async (valueId, name) => {
    if (!user) return;
    const token = localStorage.getItem("accessToken");
    const current = user.values || [];
    const exists = current.find((v) => v.valueId === valueId);
    let newList;

    if (exists) {
      newList = current.filter((v) => v.valueId !== valueId);
    } else {
      newList = [...current, { valueId, value: { name } }];
    }

    setUser((prev) => ({ ...prev, values: newList }));

    try {
      const res = await fetch(API.USERS.UPDATE_VALUES, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ valueIds: newList.map((v) => v.valueId) }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch (err) {
      console.error("Error saving values:", err);
      setUser((prev) => (prev ? { ...prev, values: current } : prev));
    }
  };

  const toggleBrand = async (brandId, name, logoUrl) => {
    if (!user) return;
    const token = localStorage.getItem("accessToken");
    const current = user.brandPreferences || [];
    const exists = current.find((b) => b.brandId === brandId);
    let newList;

    if (exists) {
      newList = current.filter((b) => b.brandId !== brandId);
    } else {
      if (current.length >= 5) return;
      newList = [...current, { brandId, brand: { name, logoUrl } }];
    }

    setUser((prev) => ({ ...prev, brandPreferences: newList }));

    try {
      const res = await fetch(API.USERS.UPDATE_BRANDS, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ brandIds: newList.map((b) => b.brandId) }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch (err) {
      console.error("Error saving brands:", err);
      setUser((prev) => (prev ? { ...prev, brandPreferences: current } : prev));
    }
  };

  const levenshtein = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array.from({ length: a.length + 1 }, () =>
      new Array(b.length + 1).fill(0),
    );
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[a.length][b.length];
  };

  const fuzzySearch = (query, items) => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();

    return items
      .map((item) => {
        const text = item.name.toLowerCase();
        let score = 0;

        if (text === lowerQuery) score = 100;
        else if (text.startsWith(lowerQuery)) score = 80;
        else if (text.includes(lowerQuery)) score = 50;

        let i = 0,
          j = 0;
        while (i < lowerQuery.length && j < text.length) {
          if (lowerQuery[i] === text[j]) i++;
          j++;
        }
        if (i === lowerQuery.length && score < 30) score = 30;

        const prefixMatch = text.substring(0, lowerQuery.length + 2);
        const dist = levenshtein(lowerQuery, prefixMatch);
        if (dist <= 2 && score < 40 - dist * 10) score = 40 - dist * 10;

        return { item, score };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((match) => match.item);
  };

  const searchItems = async (category, query) => {
    if (!query) {
      if (category === "brands") setAllBrands(masterBrands);
      else if (category === "interests") setAllInterests(masterInterests);
      else if (category === "values") setAllValues(masterValues);
      return;
    }

    if (category === "interests" || category === "values") {
      setIsSearchingItems(true);
      setTimeout(() => {
        if (category === "interests") {
          setAllInterests(fuzzySearch(query, masterInterests));
        } else {
          setAllValues(fuzzySearch(query, masterValues));
        }
        setIsSearchingItems(false);
      }, 50);
      return;
    }

    if (query.length < 1) return;
    setIsSearchingItems(true);
    try {
      let endpoint;
      if (category === "brands") endpoint = API.DISCOVERY.SEARCH_BRANDS;
      else if (category === "interests")
        endpoint = API.DISCOVERY.SEARCH_INTERESTS;
      else if (category === "values") endpoint = API.DISCOVERY.SEARCH_VALUES;

      if (!endpoint) return;

      const fullUrl =
        typeof endpoint === "function"
          ? endpoint(query)
          : `${endpoint}?q=${encodeURIComponent(query)}`;
      const response = await fetch(fullUrl);
      if (response.ok) {
        const data = await response.json();
        if (category === "brands") setAllBrands(data.brands || []);
        else if (category === "interests")
          setAllInterests(data.interests || []);
        else if (category === "values") setAllValues(data.values || []);
      }
    } catch (err) {
      console.error(`Error searching ${category}:`, err);
    } finally {
      setIsSearchingItems(false);
    }
  };

  const searchMusic = async (query) => {
    if (!query || query.length < 2) return;
    setSearchingMusic(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(API.USERS.SEARCH_MUSIC(query), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        setMusicResults(data.songs || []);
      } else {
        const msg = await readHttpErrorMessage(response);
        console.warn("[facecard] music search failed:", msg);
        setMusicResults([]);
      }
    } catch (err) {
      console.error("Error searching music:", err);
      setMusicResults([]);
    } finally {
      setSearchingMusic(false);
    }
  };

  const updateZodiac = async (zodiacId) => {
    if (!zodiacId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const res = await fetch(API.USERS.UPDATE_ZODIAC, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ zodiacId }),
      });
      if (!res.ok) {
        const msg = await readHttpErrorMessage(res);
        throw new Error(msg);
      }
      const data = await res.json();
      if (data?.user) setUser(data.user);
      setShowSelector(null);
    } catch (e) {
      console.error("Failed to update zodiac", e);
      alert(e instanceof Error ? e.message : "Failed to update zodiac");
    }
  };

  const selectMusic = async (song) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("You need to be signed in to save music.");
      return;
    }
    const key = musicTrackKey(song);
    if (!song?.name) {
      alert("Invalid song selection.");
      return;
    }
    if (musicSavingKey) return;

    setMusicSavingKey(key);
    try {
      const createRes = await fetch(API.USERS.CREATE_MUSIC_PREFERENCE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          songName: song.name,
          artistName: song.artist,
          albumArtUrl: song.albumArtUrl,
          spotifyId: song.spotifyId,
        }),
      });

      if (!createRes.ok) {
        const msg = await readHttpErrorMessage(createRes);
        alert(msg || "Could not save this song. Try another or try again.");
        return;
      }

      const body = await createRes.json().catch(() => ({}));
      const savedSong = body.song || body;
      const prefId = savedSong?.id;
      if (!prefId) {
        alert("Server did not return a saved song. Please try again.");
        return;
      }

      const updateRes = await fetch(API.USERS.UPDATE_MUSIC_PREFERENCE, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ musicPreferenceId: prefId }),
      });

      if (!updateRes.ok) {
        const msg = await readHttpErrorMessage(updateRes);
        alert(msg || "Song was saved but could not be linked to your profile.");
        return;
      }

      setUser((prev) => ({ ...prev, musicPreference: savedSong }));
      setShowSelector(null);
      setMusicQuery("");
      setMusicResults([]);
    } catch (err) {
      console.error("Error selecting music:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Could not save music. Please try again.",
      );
    } finally {
      setMusicSavingKey(null);
    }
  };

  const handleSlotClick = (slotIndex) => {
    if (photoUploading) return;
    setActiveSlot(slotIndex);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    if (!PROFILE_PHOTO_ACCEPT_TYPES.includes(file.type)) {
      alert("Please choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      alert("Image must be 10MB or smaller.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("You need to be signed in to upload photos.");
      return;
    }

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profile-photos");

      const uploadRes = await fetch(
        `${API.FILES.UPLOAD}?folder=profile-photos`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        const msg = await readHttpErrorMessage(uploadRes);
        alert(msg || "Upload failed. Check the file and try again.");
        return;
      }

      const uploadData = await uploadRes.json();
      const uploadedUrl = uploadData?.file?.url;
      if (!uploadedUrl) {
        alert(
          "Upload succeeded but no file URL was returned. Please try again.",
        );
        return;
      }

      if (activeSlot === 0) {
        const updateRes = await fetch(API.USERS.UPDATE_PROFILE, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ displayPictureUrl: uploadedUrl }),
        });
        if (!updateRes.ok) {
          const msg = await readHttpErrorMessage(updateRes);
          alert(msg || "Photo uploaded but profile could not be updated.");
          return;
        }
        setUser((prev) => ({ ...prev, displayPictureUrl: uploadedUrl }));
      } else {
        const order = activeSlot - 1;
        const photoRes = await fetch(API.USERS.ADD_PHOTO, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: uploadedUrl, order }),
        });
        if (!photoRes.ok) {
          const msg = await readHttpErrorMessage(photoRes);
          alert(
            msg || "Photo uploaded but could not be added to your gallery.",
          );
          return;
        }
        setUser((prev) => {
          const currentPhotos = prev.photos || [];
          const existingIndex = currentPhotos.findIndex(
            (p) => p.order === order,
          );
          const newPhotos = [...currentPhotos];
          if (existingIndex > -1) {
            newPhotos[existingIndex] = {
              ...newPhotos[existingIndex],
              url: uploadedUrl,
            };
          } else {
            newPhotos.push({ url: uploadedUrl, order });
            newPhotos.sort((a, b) => a.order - b.order);
          }
          return { ...prev, photos: newPhotos };
        });
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to upload photo. Please try again.",
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleShareFacecard = async () => {
    if (!user) return;
    const shareData = {
      title: `${firstName}'s Facecard`,
      text: `Check out ${firstName}'s Facecard on HMM!`,
      url: `${window.location.origin}/facecard?userId=${user.id}`,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== "AbortError") console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        alert("Link copied to clipboard!");
      } catch (err) {
        console.error("Clipboard error:", err);
      }
    }
  };

  const handleDownloadFacecard = () => {
    if (user?.displayPictureUrl) {
      const link = document.createElement("a");
      link.href = user.displayPictureUrl;
      link.download = `${firstName}_facecard.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("No image available to download.");
    }
  };

  if (loading) {
    return (
      <div
        className="relative flex h-dvh max-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-purple-950 text-white outfit-font"
        style={{
          backgroundImage: "url('/assets/mb.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* --- MOBILE SKELETON --- */}
        <div className="flex md:hidden border-2 border-white/30 rounded-[60px] w-[92%] max-w-sm h-auto flex-col overflow-hidden px-4 py-8 gap-8 relative z-10 bg-black/30 backdrop-blur-md">
          <div className="grid grid-cols-12 gap-3 items-center px-2">
            <Skeleton
              circle
              className="col-span-2 h-9 w-9 border border-white/20"
            />
            <div className="col-span-6 flex justify-center">
              <Skeleton className="h-12 w-32 rounded-xl" />
            </div>
            <div className="col-span-4 flex justify-center items-center">
              <Skeleton
                circle
                className="w-[85px] h-[85px] border-4 border-white/5"
              />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4 px-2">
            <Skeleton className="col-span-7 h-14 rounded-xl border border-white/10" />
            <Skeleton className="col-span-5 h-14 rounded-xl border border-white/10" />
          </div>
          <div className="flex flex-col gap-5 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="w-16 h-3" />
                <Skeleton className="w-36 h-10 rounded-full border border-white/10" />
                <Skeleton className="w-10 h-10 rounded-xl" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 px-2">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="w-full h-40 rounded-[1rem] border border-white/20"
              />
            ))}
          </div>
          <div className="flex items-center gap-5 px-2">
            <Skeleton circle className="w-20 h-20 border-2 border-white/20" />
            <Skeleton className="h-12 w-32 rounded-xl border border-white/10" />
          </div>
        </div>

        {/* --- DESKTOP SKELETON --- */}
        <div className="hidden md:flex relative h-screen w-full md:max-w-7xl origin-center items-center justify-center">
          <div className="flex w-full h-[85vh] flex-row gap-6 border-2 border-white/30 rounded-[60px] p-6 bg-black/30 backdrop-blur-md">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-10 border-2 border-white/10 rounded-[3.5rem] p-8">
              {/* Top Row with Photos */}
              <div className="flex items-start gap-6">
                <Skeleton circle className="w-16 h-16" />
                <div className="flex gap-4">
                  <Skeleton className="w-[180px] h-[280px] rounded-[2rem] border border-white/20" />
                  <Skeleton className="w-[180px] h-[280px] rounded-[2rem] border border-white/10" />
                  <Skeleton className="w-[180px] h-[280px] rounded-[2rem] border border-white/10" />
                </div>
              </div>
              {/* Middle Labels Area */}
              <div className="grid grid-cols-10 gap-10 mt-4">
                <div className="col-span-3 space-y-10">
                  <Skeleton className="h-16 w-full rounded-xl border border-white/10" />
                  <Skeleton className="h-16 w-full rounded-xl border border-white/10" />
                </div>
                <div className="col-span-7 space-y-8">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-20 rounded-xl" />
                    <Skeleton className="h-16 flex-1 rounded-full border border-white/10" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-20 rounded-xl" />
                    <Skeleton className="h-16 flex-1 rounded-full border border-white/10" />
                  </div>
                </div>
              </div>
            </div>
            {/* Right Sidebar Area */}
            <div className="w-72 flex flex-col gap-12 py-10">
              <Skeleton
                circle
                className="w-48 h-48 border-4 border-white/5 self-center"
              />
              <Skeleton className="h-16 w-full rounded-3xl border border-white/20" />
              <div className="flex flex-col items-center gap-6">
                <Skeleton
                  circle
                  className="w-40 h-40 border-2 border-white/10"
                />
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const age = calculateAge(user?.dateOfBirth);
  const firstName = user?.username?.split(" ")[0] || "User";

  return (
    <div className="relative flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden overscroll-none">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === "success" ? (
          <FacecardDisplay
            user={user}
            age={age}
            setView={safeSetView}
            router={router}
          />
        ) : (
          <FacecardEditor
            user={user}
            firstName={firstName}
            zodiac={user?.zodiac}
            setView={safeSetView}
            onExitEditor={handleExitEditor}
            handleSlotClick={handleSlotClick}
            setShowSelector={setShowSelector}
            progress={progress}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            onOpenFacecardPreview={() => setFacecardPreviewOpen(true)}
            photoUploading={photoUploading}
          />
        )}
      </div>

      <SelectorOverlay
        showSelector={showSelector}
        setShowSelector={setShowSelector}
        user={user}
        toggleInterest={toggleInterest}
        toggleValue={toggleValue}
        toggleBrand={toggleBrand}
        allZodiacs={allZodiacs}
        selectZodiac={updateZodiac}
        allInterests={allInterests}
        allValues={allValues}
        allBrands={allBrands}
        musicQuery={musicQuery}
        setMusicQuery={setMusicQuery}
        musicResults={musicResults}
        searchingMusic={searchingMusic}
        searchMusic={searchMusic}
        selectMusic={selectMusic}
        musicSavingKey={musicSavingKey}
        musicTrackKey={musicTrackKey}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchItems={searchItems}
        isSearchingItems={isSearchingItems}
      />

      {facecardPreviewOpen && user && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center md:p-4 overflow-hidden "
          onClick={() => setFacecardPreviewOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full h-full flex flex-col items-center justify-center"
            style={{
              backgroundImage: "url('/assets/mb.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Facecard preview"
          >


      

            <div className="relative z-10 flex flex-col items-center gap-4 max-h-[96vh]  border-0  md:border md:border-white/40   rounded-[60px] w-[960px] ">
        

              <div className=" flex justify-center  h-[90%]    " >
                <div className="origin-center origin-center sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.9] transition-transform">
                  <FaceCard2
                    user={{
                      ...user,
                      age,
                      city: user?.preferredCity || user?.city,
                    }}
                    onClose={() => setFacecardPreviewOpen(false)}
                    onDownload={handleDownloadFacecard}
                    onShare={handleShareFacecard}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
