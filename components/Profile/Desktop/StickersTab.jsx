"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { API, apiRequest } from "@/lib/api";

export function resolveStickerPath(giftId) {
  if (!giftId) return "/gift/gift1.png";
  if (giftId.startsWith("/") || giftId.startsWith("http")) return giftId;

  if (giftId === "monkey") return "/stickers/s1.png";
  if (giftId === "pikachu") return "/stickers/s2.png";
  if (giftId === "rose") return "/stickers/s3.png";
  if (giftId === "diamond") return "/stickers/s4.png";
  if (giftId === "heart") return "/stickers/s5.png";
  if (giftId === "star") return "/stickers/s6.png";
  if (giftId === "fire") return "/stickers/s7.png";
  if (giftId === "crown") return "/stickers/s8.png";

  if (giftId === "superman") return "/stickers/s3.png";
  if (giftId === "ironman") return "/stickers/s4.png";

  if (/^s\d+$/.test(giftId)) return `/stickers/${giftId}.png`;
  if (/^gift\d+$/.test(giftId)) return `/gift/${giftId}.png`;

  let h = 0;
  for (let i = 0; i < giftId.length; i++) {
    h = (Math.imul(31, h) + giftId.charCodeAt(i)) | 0;
  }
  const idx = (Math.abs(h) % 8) + 1;
  return `/gift/gift${idx}.png`;
}

export default function StickersTab({ user, setUser }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGiftId, setSelectedGiftId] = useState(null);

  const userId = user?.id || user?.userId;

  useEffect(() => {
    if (user?.activeBadgeId !== undefined) {
      setSelectedGiftId(user.activeBadgeId);
    }
  }, [user?.activeBadgeId]);

  useEffect(() => {
    if (!userId) return;

    const fetchBadges = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(API.USERS.GET_BADGES(userId));
        if (Array.isArray(data)) {
          setBadges(data);
        }
      } catch (err) {
        console.error("Failed to fetch badges:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBadges();
  }, [userId]);

  const stickersPerPage = 20;
  const totalPages = Math.ceil(badges.length / stickersPerPage);

  const currentBadges = badges.slice(
    currentPage * stickersPerPage,
    (currentPage + 1) * stickersPerPage
  );

  const handleSelectSticker = (giftId) => {
    setSelectedGiftId((prev) => (prev === giftId ? null : giftId));
  };

  const handleSaveSticker = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await apiRequest(API.USERS.SET_ACTIVE_BADGE(userId), {
        method: "POST",
        body: JSON.stringify({ giftId: selectedGiftId }),
      });
      if (setUser) {
        setUser((prev) => prev ? { ...prev, activeBadgeId: selectedGiftId } : prev);
      }
    } catch (err) {
      console.error("Failed to save active sticker:", err);
      alert("Failed to save sticker: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSticker = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await apiRequest(API.USERS.SET_ACTIVE_BADGE(userId), {
        method: "POST",
        body: JSON.stringify({ giftId: null }),
      });
      setSelectedGiftId(null);
      if (setUser) {
        setUser((prev) => prev ? { ...prev, activeBadgeId: null } : prev);
      }
    } catch (err) {
      console.error("Failed to remove sticker:", err);
      alert("Failed to remove sticker: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden px-2">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <p className="text-white font-semibold text-xl">Your Stickers</p>
        <p className="text-xs text-white/60 mt-1 leading-tight">
          Apply a sticker next to your profile photo. <br />
          Stickers expire 7 days after you receive them
        </p>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto pb-8">
        {loading ? (
          <p className="text-white/60 text-sm">Loading stickers...</p>
        ) : badges.length === 0 ? (
          <p className="text-white/60 text-sm">No stickers received yet</p>
        ) : (
          <div className="grid grid-cols-5 gap-3 place-items-center">
            {currentBadges.map((badge, localIndex) => {
              const globalIndex = currentPage * stickersPerPage + localIndex;
              const isSelected = selectedGiftId === badge.giftId;
              const src = resolveStickerPath(badge.giftId);

              return (
                <div
                  key={badge.giftId}
                  onClick={() => handleSelectSticker(badge.giftId)}
                  className="cursor-pointer transition-all active:scale-95 hover:scale-105"
                >
                  <div
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all ${isSelected
                      ? "border-[#FACC15] scale-110"
                      : "border-white/50 hover:border-white border-[1px]"
                      }`}
                  >
                    <Image
                      src={src}
                      alt={badge.giftName || `Sticker ${globalIndex + 1}`}
                      width={65}
                      height={65}
                      className="object-contain"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Dots (3-dot slider style) */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 flex justify-center gap-2 mb-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${i === currentPage ? "bg-white w-6" : "bg-white/40"
                }`}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <button
          onClick={handleRemoveSticker}
          disabled={saving || !userId}
          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors disabled:opacity-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-2xl leading-none">
            −
          </div>
          <span className="text-sm font-medium">Remove sticker</span>
        </button>

        <button
          onClick={handleSaveSticker}
          disabled={saving || !userId}
          className="rounded-3xl bg-white px-10 py-3 text-black font-medium hover:bg-white/90 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
