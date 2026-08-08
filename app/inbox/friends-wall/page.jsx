"use client";

import ProfileGuard from "@/components/auth/ProfileGuard";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaArrowLeftLong } from "react-icons/fa6";
import { FaShare } from "react-icons/fa";
import clsx from 'clsx';
import { useState, useEffect, useRef } from "react";
import { toJpeg } from "html-to-image";
import { API, apiRequest } from "../../../lib/api";
import FaceCard from '@/components/Home/FaceCard';
import { calculateAge } from '@/lib/facecard-utils';

export default function FriendWall() {
  return (
    <ProfileGuard>
      <FriendWallContent />
    </ProfileGuard>
  );
}

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgJ2Z2sQAAAAASUVORK5CYII=";

/**
 * Renders the friend wall box (plus the beam logo header) to a JPEG data URL.
 * Same approach as the facecard export: clone off-screen, inline cross-origin
 * images through the backend proxy so the canvas is not CORS-tainted, then
 * rasterize with html-to-image (html2canvas produced a black image here).
 */
async function renderWallImage(node) {
  const toProxyDataUrl = async (rawUrl) => {
    const proxyUrl = `${API.FILES.IMAGE_PROXY}?url=${encodeURIComponent(rawUrl)}`;
    const res = await fetch(proxyUrl, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
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
        img.setAttribute("src", TRANSPARENT_PIXEL);
        finish();
      };
      if (img.complete) {
        if (!img.naturalWidth) img.setAttribute("src", TRANSPARENT_PIXEL);
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
    // Un-clamp the scroll container so the full grid is captured.
    clone.style.height = "auto";
    clone.style.overflow = "visible";
    const scroller = clone.firstElementChild;
    if (scroller) {
      scroller.style.height = "auto";
      scroller.style.overflow = "visible";
    }

    const wrapper = document.createElement("div");
    wrapper.style.width = `${node.offsetWidth + 64}px`;
    wrapper.style.padding = "32px";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.backgroundColor = "#2e0668";
    wrapper.style.backgroundImage = "url('/assets/mb.jpg')";
    wrapper.style.backgroundRepeat = "repeat";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "center";
    header.style.marginBottom = "24px";
    const logo = document.createElement("img");
    logo.src = "/logo.gif";
    logo.alt = "Beam";
    logo.style.width = "155px";
    logo.style.height = "55px";
    logo.style.objectFit = "contain";
    header.appendChild(logo);

    wrapper.appendChild(header);
    wrapper.appendChild(clone);

    exportMount = document.createElement("div");
    exportMount.style.position = "fixed";
    exportMount.style.left = "-100000px";
    exportMount.style.top = "0";
    exportMount.style.pointerEvents = "none";
    exportMount.style.opacity = "0";
    exportMount.appendChild(wrapper);
    document.body.appendChild(exportMount);

    const imgs = Array.from(wrapper.querySelectorAll("img"));
    await Promise.all(
      imgs.map(async (img) => {
        const src = img.currentSrc || img.src;
        img.removeAttribute("srcset");
        img.setAttribute("loading", "eager");
        img.setAttribute("decoding", "sync");
        if (!src) return;
        let crossOrigin = false;
        try {
          crossOrigin = new URL(src, window.location.href).origin !== window.location.origin;
        } catch {
          return;
        }
        if (!crossOrigin) return;
        try {
          img.setAttribute("src", await toProxyDataUrl(src));
        } catch {
          img.setAttribute("src", TRANSPARENT_PIXEL);
        }
      })
    );
    await Promise.all(imgs.map((img) => waitForImageSettled(img)));

    return await toJpeg(wrapper, {
      cacheBust: true,
      pixelRatio: 2,
      quality: 0.95,
      backgroundColor: "#2e0668",
      skipAutoScale: true,
      imagePlaceholder: TRANSPARENT_PIXEL,
      fetchRequestInit: { mode: "cors", credentials: "omit" },
    });
  } finally {
    if (exportMount?.parentNode) exportMount.parentNode.removeChild(exportMount);
  }
}

function FriendWallContent() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const wallRef = useRef(null);
  const [scale, setScale] = useState(1);




  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/');
        return;
      }

      const data = await apiRequest(API.FRIENDS.GET_FRIENDS_WALL);
      setFriends(data.friends || []);
    } catch (error) {
      console.error('Error fetching wall:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/');
        return;
      }

      // Render the wall grid client-side (html-to-image, same approach as facecard export)
      const node = wallRef.current;
      if (!node) {
        alert('Nothing to share yet.');
        return;
      }

      const dataUrl = await renderWallImage(node);
      const blob = await (await fetch(dataUrl)).blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'friend-wall.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error sharing wall:', error);
      alert(error.message || 'Failed to share friend wall');
    } finally {
      setSharing(false);
    }
  };



  const handleFriendClick = async (friendId) => {
    try {
      setPreviewLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const data = await apiRequest(API.USERS.GET_USER(friendId));
      setSelectedFriend(data.user);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Error fetching friend details:', error);
    } finally {
      setPreviewLoading(false);
    }
  };


  useEffect(() => {
    const updateScale = () => {
      const h = window.innerHeight;

      if (h <= 670) {
        setScale(0.78); // iPhone SE
        setTranslateY(-45);
      } else if (h <= 740) {
        setScale(0.85); // XR, 11, 12 mini
        setTranslateY(-15);
      }


      else {
        setScale(1);
        setTranslateY(0);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const updateScale = () => {
      const newScale = Math.max(
        0.7,
        Math.min(window.innerHeight / 820, 1)
      );
      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);


  return (
    <div className="fixed inset-0 h-[100dvh] w-full text-white font-sans overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-50"
        style={{
          backgroundImage: "url('/assets/mb.jpg')",
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
        }}
      />

      {/* Page Container */}
      <div className="h-full flex flex-col md:py-12 md:px-12 lg:px-24 md:max-w-6xl md:mx-auto relative z-10 font-[family-name:var(--font-otomanopee)]">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 text-xl md:text-3xl font-semibold p-4 md:p-0 md:px-10 md:mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="border-white border-1 rounded-full p-2 hover:bg-white/10 transition-colors"
            >
              <FaArrowLeftLong className="text-xl" />
            </button>
            <span className="text-sm">Friend Wall</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center gap-2 border border-white/80 px-4 py-1.5 rounded-full text-sm backdrop-blur-md hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <FaShare className="text-sm" />
              {sharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="flex-1 w-full md:h-[78vh] rounded-[48px] 
          overflow-hidden flex flex-col bg-transparent py-6 px-4 md:p-10 mb-6 md:mb-0">

          <div className="flex flex-col h-full">
            {/* Subtitle */}
            <p className="text-xs md:text-lg font-outfit text-white/80 leading-relaxed mb-8 max-w-2xl px-2">
              Once they were drifters now they are your real friend,
              and you are to them as well
            </p>

            {/* Wall Content Container */}
            <div ref={wallRef} className="flex-1 border border-white/50 rounded-3xl p-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-white/60">Loading your friends...</p>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="h-full flex items-center justify-center flex-col gap-4">
                    <p className="text-white/60 text-lg">Your wall is empty</p>
                    <p className="text-white/40 text-sm">Make some friends to see them here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4">
                    {friends.map((friend, i) => (
                      <div
                        key={friend.friendId || i}
                        onClick={() => handleFriendClick(friend.friendId)}
                        className="aspect-square rounded-xl md:rounded-2xl border border-white/40 overflow-hidden bg-white/5 relative group cursor-pointer hover:border-white/80 transition-all "
                      >
                        {(typeof friend.photoUrl === "string" && friend.photoUrl.trim()) ? (
                          <Image
                            src={friend.photoUrl}
                            alt="friend"
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold select-none">
                            {(friend.username || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        {previewLoading && selectedFriend?.id === friend.friendId && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Fill up with placeholder spots for aesthetics if less than 20 friends */}
                    {friends.length < 20 && Array.from({ length: 20 - friends.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="aspect-square rounded-xl md:rounded-2xl border border-white/10 bg-white/5 opacity-50"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Facecard Preview Modal */}
      {isPreviewOpen && selectedFriend && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center md:p-4 overflow-hidden"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative w-full h-full flex flex-col items-center justify-center"
            style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >





            <div className="relative z-10 flex flex-col items-center gap-4 border-0 md:border md:border-white/40 h-[92vh] rounded-[60px] md:w-[98vw] w-full md:w-[750px]">

              {/* Scrollable container for the face card content */}








              <div className="flex w-full flex-col items-center pt-4 pb-4 scrollbar-none z-20">
                <div
                  className={clsx(
                    'relative flex w-full max-w-[380px] shrink-0 items-center justify-center',
                    'origin-top transition-transform duration-500 mt-3 md:mt-0',
                  )}
                  style={
                    typeof window !== "undefined" && window.innerWidth < 768
                      ? {
                        transform: `translateY(${translateY}px) scale(${scale})`,
                        transformOrigin: "top center",
                      }
                      : undefined
                  }
                >
                  <FaceCard
                    user={{
                      ...selectedFriend,
                      age: calculateAge(selectedFriend.dateOfBirth),
                      city: selectedFriend.preferredCity || selectedFriend.city,
                    }}
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
