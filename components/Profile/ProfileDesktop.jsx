"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import FacecardProfile from "../Home/FacecardProfile";
import { calculateProgress } from "@/lib/facecard-utils";
import { toJpeg } from "html-to-image";
import html2canvas from "html2canvas";

import ProfileHeader from "./Desktop/ProfileHeader";
import ProfileSidebar from "./Desktop/ProfileSidebar";
import GetMoneyTab from "./Desktop/GetMoneyTab";
import PromptsTab from "./Desktop/PromptsTab";

import RewardsTab from "./Desktop/RewardsTab";
import StickersTab from "./Desktop/StickersTab";

import { API, apiRequest } from "@/lib/api";
import { enrichUserStickerFields } from "@/lib/stickers";

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
  const [activeTab, setActiveTab] = useState("default"); // "default" | "prompts" | "account" | "mysterybox" | "rewards" | "stickers"
  const [interestIndex, setInterestIndex] = useState(0);
  const [causeIndex, setCauseIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [seasonSummary, setSeasonSummary] = useState({
    subtitle: "Season rewards",
    badge: null,
  });
  const facecardExportRef = useRef(null);

  useEffect(() => {
    if (!initialUser) {
      const fetchUser = async () => {
        try {
          const fields =
            "username,dateOfBirth,gender,displayPictureUrl,intent,photos,musicPreference,brandPreferences,interests,values,preferredCity,zodiac,zodiacId,zodiacOverridden,activeBadgeId,activeBadge";
          const data = await apiRequest(`${API.USERS.GET_ME}?fields=${fields}`);
          setUser(await enrichUserStickerFields(data.user || data));
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

  const loadSeasonSummary = async () => {
    try {
      const view = await apiRequest(API.SEASON.GET_MY_SEASON);
      const tasks = view?.tasks || [];
      const done = tasks.filter((t) => t.completed).length;
      const total = tasks.length;
      let subtitle = "Season rewards";
      let badge = null;
      if (view?.uiMode === "NO_ACTIVE_SEASON") {
        subtitle = "Cooking next season";
      } else if (view?.uiMode === "PENDING") {
        subtitle = "Awaiting approval";
      } else if (view?.uiMode === "APPROVED" || view?.uiMode === "GIFT_SENT") {
        subtitle = "Box on the way";
      } else if (view?.uiMode === "CLAIM_READY") {
        subtitle = "Ready to claim";
        badge = "Ship it";
      } else if (total > 0) {
        subtitle = `${done}/${total} tasks`;
        badge = `${view?.global?.approvedCount ?? 0}/${view?.global?.giftPoolSize ?? 0}`;
      }
      setSeasonSummary({ subtitle, badge });
    } catch (err) {
      console.error("Failed to fetch season summary:", err);
    }
  };

  useEffect(() => {
    loadSeasonSummary();
  }, []);

  const handleShareFacecard = async () => {
    if (!user?.id || typeof window === "undefined") return;
    const shareData = {
      title: `${firstName}'s Facecard`,
      text: `Check out ${firstName}'s Facecard on HMM!`,
      url: `${window.location.origin}/facecard?userId=${user.id}`,
    };

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        (!navigator.canShare || navigator.canShare(shareData))
      ) {
        await navigator.share(shareData);
      } else if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Failed to share facecard:", err);
      }
    }
  };

  const handleDownloadFacecard = async () => {
    if (typeof window === "undefined") return;
    const node = facecardExportRef.current;
    if (!node) return;

    const fileName = `${firstName}_facecard.jpeg`;
    const transparentPixel =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgJ2Z2sQAAAAASUVORK5CYII=";
    const triggerDownload = (dataUrl) => {
      if (!dataUrl) return false;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    };
    const isHttpUrl = (value) => /^https?:\/\//i.test(value || "");
    const toProxyDataUrl = async (rawUrl) => {
      const proxyUrl = `${API.FILES.IMAGE_PROXY}?url=${encodeURIComponent(rawUrl)}`;
      const res = await fetch(proxyUrl, { mode: "cors", credentials: "omit" });
      if (!res.ok) {
        throw new Error(`Proxy fetch failed: ${res.status}`);
      }
      const payload = await res.json();
      if (typeof payload?.dataUrl !== "string" || !payload.dataUrl.startsWith("data:")) {
        throw new Error("Proxy did not return dataUrl");
      }
      return payload.dataUrl;
    };

    const waitForImageSettled = (img, timeoutMs = 5000) =>
      new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
          resolve();
        };
        const onLoad = () => finish();
        const onError = () => {
          img.setAttribute("src", transparentPixel);
          finish();
        };
        if (img.complete) {
          if (!img.naturalWidth) img.setAttribute("src", transparentPixel);
          resolve();
          return;
        }
        img.addEventListener("load", onLoad, { once: true });
        img.addEventListener("error", onError, { once: true });
        setTimeout(finish, timeoutMs);
      });

    let exportMount = null;

    try {
      const clone = node.cloneNode(true);
      exportMount = document.createElement("div");
      exportMount.style.position = "fixed";
      exportMount.style.left = "-100000px";
      exportMount.style.top = "0";
      exportMount.style.pointerEvents = "none";
      exportMount.style.opacity = "0";
      exportMount.appendChild(clone);
      document.body.appendChild(exportMount);

      const sourceImgs = Array.from(node.querySelectorAll("img"));
      const cloneImgs = Array.from(clone.querySelectorAll("img"));

      await Promise.all(
        cloneImgs.map(async (img, idx) => {
          const sourceImg = sourceImgs[idx];
          const sourceUrl = sourceImg?.currentSrc || sourceImg?.src || img.currentSrc || img.src;
          if (!isHttpUrl(sourceUrl)) return;
          try {
            const dataUrl = await toProxyDataUrl(sourceUrl);
            img.setAttribute("src", dataUrl);
            img.removeAttribute("srcset");
          } catch {
            img.setAttribute("src", transparentPixel);
            img.removeAttribute("srcset");
          }
        }),
      );

      // Export should be trimmed to the card border; exclude pagination dots.
      const exportNode =
        clone.querySelector('[data-facecard-boundary="true"]') || clone;
      exportNode.style.overflow = "hidden";

      const paginationNode = exportNode.querySelector(
        '[data-facecard-pagination="true"]',
      );
      if (paginationNode?.parentNode) {
        paginationNode.parentNode.removeChild(paginationNode);
      }

      for (const img of cloneImgs) {
        img.setAttribute("loading", "eager");
        img.setAttribute("decoding", "sync");
      }

      await Promise.all(cloneImgs.map((img) => waitForImageSettled(img)));

      const dataUrl = await toJpeg(exportNode, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.98,
        backgroundColor: "#4f0b99",
        skipAutoScale: true,
        imagePlaceholder: transparentPixel,
        fetchRequestInit: { mode: "cors", credentials: "omit" },
      });
      if (triggerDownload(dataUrl)) return;
      throw new Error("Generated empty export data");
    } catch {
      try {
        // Fallback: foreignObject rendering can succeed when direct DOM serializer fails.
        const canvas = await html2canvas(node, {
          backgroundColor: "#4f0b99",
          scale: 2,
          useCORS: true,
          allowTaint: false,
          foreignObjectRendering: true,
        });
        const fallbackDataUrl = canvas.toDataURL("image/jpeg", 0.98);
        const fallbackLink = document.createElement("a");
        fallbackLink.href = fallbackDataUrl;
        fallbackLink.download = fileName;
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        document.body.removeChild(fallbackLink);
      } catch (fallbackErr) {
        const details =
          fallbackErr instanceof Error
            ? `${fallbackErr.name}: ${fallbackErr.message}`
            : String(fallbackErr);
        console.error("Failed to export facecard:", details);
        alert("Could not download facecard right now. Please try again.");
      }
    } finally {
      if (exportMount?.parentNode) {
        exportMount.parentNode.removeChild(exportMount);
      }
    }
  };

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

      <ProfileHeader icons={["/edit.svg", "/setting.png", "/bandage.png"]} />

      <div className="z-10 grid w-full md:max-w-5xl lg:max-w-5xl grid-cols-1 flex-1 min-h-0 gap-3 rounded-[60px] border border-white/70 p-3 md:grid-cols-[0.36fr_0.64fr]">
        <ProfileSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          firstName={firstName}
          progress={progress}
          seasonSummary={seasonSummary}
        />

        <div
          className={` flex flex-1 min-h-0 min-w-0 flex-col rounded-[3rem] border border-white/40 px-6 md:px-8 ${activeTab === "account" || activeTab === "default" ? "py-4" : "py-6 md:py-8"
            }`}>
          {activeTab === "account" || activeTab === "default" ? (
            <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden">
              <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden">
                <div className="w-full max-w-[420px] transition-transform ">
                  <div className="flex h-full w-full items-start justify-center overflow-hidden">
                    <div
                      className="
      origin-top
      [@media(max-height:2100px)]:scale-[0.95]
      [@media(max-height:2000px)]:scale-[0.90]
      [@media(max-height:1900px)]:scale-[0.87]
      [@media(max-height:1800px)]:scale-[0.85]
      [@media(max-height:1700px)]:scale-[0.88]
      [@media(max-height:1500px)]:scale-[0.87]
      [@media(max-height:1200px)]:scale-[0.87]
      [@media(max-height:1000px)]:scale-[0.86]
      [@media(max-height:800px)]:scale-[0.75]
      md:[@media(max-height:700px)]:scale-[0.70]
      [@media(max-height:600px)]:scale-[0.50]
    "
                    >
                      <div
                        ref={facecardExportRef}
                        data-facecard-export-root="true"
                      >
                        <FacecardProfile
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
                  </div>
                </div>
              </div>

            </div>
          ) : (


            // <div className="min-h-0 flex-1 overflow-y-auto flex items-start justify-center">
            <div className="min-h-0 flex-1 flex items-start justify-center">
              {activeTab === "mysterybox" ? (
                <GetMoneyTab />
              ) : activeTab === "prompts" ? (
                <div className="flex h-full w-full items-center justify-center overflow-hidden">
                  <div className="

       [@media(max-height:1000px)]:scale-[1] 
          
    [@media(max-height:820px)]:scale-[0.78] 
       [@media(max-height:750px)]:scale-[0.70] 
]"
                  >
                    <PromptsTab user={user} setUser={setUser} />
                  </div>
                </div>
              ) : activeTab === "rewards" ? (
                <RewardsTab onBack={() => setActiveTab("default")} />
              ) : (
                <StickersTab user={user} setUser={setUser} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
