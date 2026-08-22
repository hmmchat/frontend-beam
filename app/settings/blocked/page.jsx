"use client";

import ProfileGuard from "@/components/auth/ProfileGuard";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaArrowLeftLong } from "react-icons/fa6";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { API, apiRequest } from "@/lib/api";
import FaceCard from "@/components/Home/FaceCard";
import { calculateAge } from "@/lib/facecard-utils";

export default function BlockedUsersPage() {
  return (
    <ProfileGuard>
      <BlockedUsersContent />
    </ProfileGuard>
  );
}

function BlockedUsersContent() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/");
        return;
      }

      const collected = [];
      let cursor;
      do {
        const data = await apiRequest(
          API.FRIENDS.GET_BLOCKED_USERS({ limit: 100, cursor })
        );
        collected.push(...(data.users || []));
        cursor = data.hasMore ? data.nextCursor : undefined;
      } while (cursor);

      setBlockedUsers(collected);
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (userId) => {
    try {
      setPreviewLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const data = await apiRequest(API.USERS.GET_USER(userId));
      setSelectedUser(data.user);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUnblockSuccess = () => {
    const unblockedId = selectedUser?.id;
    setIsPreviewOpen(false);
    setSelectedUser(null);
    setBlockedUsers((prev) =>
      prev.filter((row) => row.userId !== unblockedId)
    );
    fetchBlockedUsers();
  };

  useEffect(() => {
    const updateScale = () => {
      const newScale = Math.max(0.7, Math.min(window.innerHeight / 820, 1));
      setScale(newScale);
      const h = window.innerHeight;
      if (h <= 670) setTranslateY(-45);
      else if (h <= 740) setTranslateY(-15);
      else setTranslateY(0);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div className="fixed inset-0 h-[100dvh] w-full text-white font-sans overflow-hidden">
      <div
        className="absolute inset-0 -z-50"
        style={{
          backgroundImage: "url('/assets/mb.jpg')",
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
        }}
      />

      <div className="h-full flex flex-col md:py-12 md:px-12 lg:px-24 md:max-w-6xl md:mx-auto relative z-10 font-[family-name:var(--font-otomanopee)]">
        <div className="flex items-center justify-between gap-3 text-xl md:text-3xl font-semibold p-4 md:p-0 md:px-10 md:mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/settings")}
              className="border-white border-1 rounded-full p-2 hover:bg-white/10 transition-colors"
            >
              <FaArrowLeftLong className="text-xl" />
            </button>
            <span className="text-sm">Blocked users</span>
          </div>
        </div>

        <div className="flex-1 w-full md:h-[78vh] rounded-[48px] overflow-hidden flex flex-col bg-transparent py-6 px-4 md:p-10 mb-6 md:mb-0">
          <div className="flex flex-col h-full">
            <p className="text-xs md:text-lg font-outfit text-white/80 leading-relaxed mb-8 max-w-2xl px-2">
              People you have blocked. Open a face card and use the menu to unblock.
            </p>

            <div className="flex-1 border border-white/50 rounded-3xl p-2 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-white/60">Loading blocked users...</p>
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="h-full flex items-center justify-center flex-col gap-4">
                    <p className="text-white/60 text-lg">No blocked users</p>
                    <p className="text-white/40 text-sm">Blocked accounts will show up here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4">
                    {blockedUsers.map((row, i) => (
                      <div
                        key={row.userId || i}
                        onClick={() => handleUserClick(row.userId)}
                        className="aspect-square rounded-xl md:rounded-2xl border border-white/40 overflow-hidden bg-white/5 relative group cursor-pointer hover:border-white/80 transition-all "
                      >
                        {typeof row.photoUrl === "string" && row.photoUrl.trim() ? (
                          <Image
                            src={row.photoUrl}
                            alt="blocked user"
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold select-none">
                            U
                          </div>
                        )}
                        {previewLoading && selectedUser?.id === row.userId && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    ))}
                    {blockedUsers.length < 20 &&
                      Array.from({ length: 20 - blockedUsers.length }).map((_, i) => (
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

      {isPreviewOpen && selectedUser && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center md:p-4 overflow-hidden bg-black/30 backdrop-blur-sm supports-[backdrop-filter]:bg-black/20"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative z-10 w-full h-full flex flex-col items-center justify-center"
            style={{
              backgroundImage: "url('/assets/mb.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-10 flex flex-col items-center gap-4 border-0 md:border md:border-white/40 h-[92vh] rounded-[60px] md:w-[750px] w-full">
              <div className="flex w-full flex-col items-center pt-4 pb-4 scrollbar-none z-20">
                <div
                  className={clsx(
                    "relative flex w-full max-w-[380px] shrink-0 items-center justify-center",
                    "origin-top transition-transform duration-500 mt-3 md:mt-0"
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
                      ...selectedUser,
                      age: calculateAge(selectedUser.dateOfBirth),
                      city: selectedUser.preferredCity || selectedUser.city,
                    }}
                    menuVariant="unblock"
                    onUnblockSuccess={handleUnblockSuccess}
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
