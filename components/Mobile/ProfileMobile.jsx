"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toJpeg } from "html-to-image";
import html2canvas from "html2canvas";

// Utils and API
import { calculateProgress, calculateAge } from "@/lib/facecard-utils";
import { API, apiRequest } from "@/lib/api";
import { enrichUserStickerFields } from "@/lib/stickers";

// Sub-components
import ProfileMobileMain from "./Profile/ProfileMobileMain";
import ProfileMobilePrompts from "./Profile/ProfileMobilePrompts";
import ProfileMobileRewards from "./Profile/ProfileMobileRewards";
import ProfileMobileGetMoney from "./Profile/ProfileMobileGetMoney";
import ProfileMobileAccount from "./Profile/ProfileMobileAccount";
import ProfileMobileStickers from "./Profile/ProfileMobileStickers";

export default function ProfileMobile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("main");
  const [selectedSticker, setSelectedSticker] = useState(3);
  const [user, setUser] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [seasonSummary, setSeasonSummary] = useState({
    subtitle: "Season rewards",
    badge: null,
  });
  const facecardExportRef = useRef(null);

  // Load User Data
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const fields =
          "username,dateOfBirth,gender,displayPictureUrl,intent,photos,musicPreference,brandPreferences,interests,values,preferredCity,zodiac,zodiacId,zodiacOverridden,activeBadgeId,activeBadge";
        const data = await apiRequest(`${API.USERS.GET_ME}?fields=${fields}`);
        setUser(await enrichUserStickerFields(data.user || data));
      } catch (e) {
        console.error("[ProfileMobile] Failed to load user:", e);
      }
    };
    load();
  }, []);

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
    } catch (e) {
      console.error("[ProfileMobile] Failed to load season:", e);
    }
  };

  useEffect(() => {
    loadSeasonSummary();
  }, []);

  // Derived Data
  const progress = user ? calculateProgress(user) : 0;
  const displayName = user?.username?.trim() || "Profile";
  const firstName = user?.username?.split(" ")[0] || "User";
  const age = user?.dateOfBirth ? calculateAge(user.dateOfBirth) : null;

  // Facecard Handlers
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
      if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
      const payload = await res.json();
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

      const exportNode = clone.querySelector('[data-facecard-boundary="true"]') || clone;
      exportNode.style.overflow = "hidden";
      await Promise.all(cloneImgs.map((img) => waitForImageSettled(img)));

      const dataUrl = await toJpeg(exportNode, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.98,
        backgroundColor: "#4f0b99",
        imagePlaceholder: transparentPixel,
      });
      if (triggerDownload(dataUrl)) return;
    } catch {
      try {
        const canvas = await html2canvas(node, {
          backgroundColor: "#4f0b99",
          scale: 2,
          useCORS: true,
          allowTaint: false,
        });
        const fallbackDataUrl = canvas.toDataURL("image/jpeg", 0.98);
        triggerDownload(fallbackDataUrl);
      } catch (fallbackErr) {
        console.error("Failed to export facecard:", fallbackErr);
        alert("Could not download facecard right now. Please try again.");
      }
    } finally {
      if (exportMount?.parentNode) exportMount.parentNode.removeChild(exportMount);
    }
  };

  return (
    <div className="h-[100dvh] w-full text-white flex flex-col items-center pt-6 px-4 relative overflow-y-auto scrollbar-hide">
      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/test.png"
          fill
          alt=""
          className="object-cover opacity-30"
        />
      </div>

      {/* Main Content Areas */}
      {activeTab === "prompts" && (
        <ProfileMobilePrompts
          onBack={() => setActiveTab("main")}
          user={user}
          setUser={setUser}
        />
      )}

      {activeTab === "rewards" && (
        <ProfileMobileRewards onBack={() => setActiveTab("main")} />
      )}

      {activeTab === "mysterybox" && (
        <ProfileMobileGetMoney onBack={() => setActiveTab("main")} />
      )}

      {activeTab === "facePreview" && (
        <ProfileMobileAccount
          onBack={() => setActiveTab("main")}
          user={user}
          age={age}
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
          handleDownloadFacecard={handleDownloadFacecard}
          handleShareFacecard={handleShareFacecard}
          facecardExportRef={facecardExportRef}
        />
      )}

      {(activeTab === "main" || activeTab === "stickers") && (
        <ProfileMobileMain
          router={router}
          user={user}
          displayName={displayName}
          age={age}
          progress={progress}
          seasonSummary={seasonSummary}
          setActiveTab={setActiveTab}
        />
      )}


      <ProfileMobileStickers
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedSticker={selectedSticker}
        setSelectedSticker={setSelectedSticker}
        user={user}
        setUser={setUser}
      />
    </div>
  );
}
