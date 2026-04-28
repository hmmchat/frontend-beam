"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import FaceCard3 from "../Home/FaceCard3";
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
import { buildGetMoneyModel } from "@/lib/getMoney";

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
  const [walletSnapshot, setWalletSnapshot] = useState({
    diamonds: 0,
    coins: 0,
    loading: true,
  });
  const facecardExportRef = useRef(null);

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

  const loadWallet = async () => {
    try {
      const balance = await apiRequest(API.WALLET.GET_BALANCE);
      setWalletSnapshot({
        diamonds: Number(balance?.diamonds) || 0,
        coins: Number(balance?.balance) || 0,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
      setWalletSnapshot((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const handleAdRewardGranted = (result) => {
    if (typeof result?.newBalance === "number") {
      setWalletSnapshot((prev) => ({
        ...prev,
        coins: result.newBalance,
        loading: false,
      }));
      return;
    }
    loadWallet();
  };

  const moneyModel = buildGetMoneyModel({
    diamonds: walletSnapshot.diamonds,
    coins: walletSnapshot.coins,
  });

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

      <ProfileHeader icons={["/edit.png", "/setting.png", "/bandage.png"]} />

      <div className="z-10 grid w-full max-w-5xl grid-cols-1 gap-6 rounded-[3rem] border border-white/30 p-3 md:grid-cols-3">
        <ProfileSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          firstName={firstName}
          progress={progress}
          moneyModel={moneyModel}
        />

        <div
          className={`col-span-2 flex h-[80vh] min-w-0 flex-col rounded-[3rem] border border-white/20 px-8 ${
            activeTab === "account" || activeTab === "default" ? "py-4" : "py-10"
          }`}
        >
          {activeTab === "account" || activeTab === "default" ? (
            <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden">
              <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden">
                <div className="origin-top scale-[0.72] transition-transform lg:scale-[0.78]">
                <div
                  ref={facecardExportRef}
                  data-facecard-export-root="true"
                >
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
              </div>
              <div className="mt-2 flex shrink-0 items-center gap-5 pb-1">
                <button
                  type="button"
                  onClick={handleDownloadFacecard}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 transition hover:bg-white/10"
                  aria-label="Download facecard"
                >
                  <Image src="/download.svg" alt="" width={26} height={26} />
                </button>
                <button
                  type="button"
                  onClick={handleShareFacecard}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 transition hover:bg-white/10"
                  aria-label="Share facecard"
                >
                  <Image
                    src="/share-outline.svg"
                    alt=""
                    width={26}
                    height={26}
                  />
                </button>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === "getmoney" ? (
              <GetMoneyTab
                moneyModel={moneyModel}
                loading={walletSnapshot.loading}
                onRewardGranted={handleAdRewardGranted}
              />
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
    </div>
  );
}
