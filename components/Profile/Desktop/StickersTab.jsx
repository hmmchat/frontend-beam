"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { API, apiRequest } from "@/lib/api";
import {
  fetchUserStickers,
  getActiveBadgeId,
} from "@/lib/stickers";

export default function StickersTab({ user, setUser }) {
  const [badges, setBadges] = useState([]);
  const [stickerExpiryDays, setStickerExpiryDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedBadgeId, setSelectedBadgeId] = useState(null);

  const userId = user?.id || user?.userId;

  useEffect(() => {
    const activeId = getActiveBadgeId(user);
    if (activeId !== undefined) {
      setSelectedBadgeId(activeId);
    }
  }, [user?.activeBadgeId, user?.activeBadge?.id]);

  useEffect(() => {
    if (!userId) return;

    const loadStickers = async () => {
      try {
        setLoading(true);
        const data = await fetchUserStickers(userId);
        setStickerExpiryDays(data?.stickerExpiryDays ?? 7);
        setBadges(Array.isArray(data?.badges) ? data.badges : []);
      } catch (err) {
        console.error("Failed to fetch stickers:", err);
      } finally {
        setLoading(false);
      }
    };
    loadStickers();
  }, [userId]);

  const stickersPerPage = 20;
  const totalPages = Math.ceil(badges.length / stickersPerPage);

  const currentBadges = badges.slice(
    currentPage * stickersPerPage,
    (currentPage + 1) * stickersPerPage
  );

  const handleSelectSticker = (badgeId) => {
    setSelectedBadgeId((prev) => (prev === badgeId ? null : badgeId));
  };

  const handleSaveSticker = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await apiRequest(API.USERS.SET_ACTIVE_BADGE(userId), {
        method: "POST",
        body: JSON.stringify({ badgeId: selectedBadgeId }),
      });
      if (setUser) {
        const selected = badges.find((b) => b.id === selectedBadgeId);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                activeBadgeId: selectedBadgeId,
                activeBadge: selected
                  ? {
                      id: selected.id,
                      giftId: selected.giftId,
                      giftName: selected.giftName,
                      giftEmoji: selected.giftEmoji,
                    }
                  : null,
                activeBadgeImageUrl: selected?.imageUrl || null,
              }
            : prev
        );
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
        body: JSON.stringify({ badgeId: null }),
      });
      setSelectedBadgeId(null);
      if (setUser) {
        setUser((prev) =>
          prev ? { ...prev, activeBadgeId: null, activeBadge: null, activeBadgeImageUrl: null } : prev
        );
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
      <div className="flex-shrink-0 mb-6">
        <p className="text-white font-semibold text-xl">Your Stickers</p>
        <p className="text-xs text-white/60 mt-1 leading-tight">
          Apply a sticker next to your profile photo. <br />
          Stickers expire {stickerExpiryDays} day{stickerExpiryDays === 1 ? "" : "s"} after you receive them
        </p>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto pb-8">
        {loading ? (
          <p className="text-white/60 text-sm">Loading stickers...</p>
        ) : badges.length === 0 ? (
          <p className="text-white/60 text-sm">No stickers received yet</p>
        ) : (
          <div className="grid grid-cols-5 gap-3 place-items-center">
            {currentBadges.map((badge) => {
              const isSelected = selectedBadgeId === badge.id;
              const src = badge.imageUrl;

              return (
                <div
                  key={badge.id}
                  onClick={() => handleSelectSticker(badge.id)}
                  title={badge.expiryLabel || badge.giftName || badge.giftId}
                  className="cursor-pointer transition-all active:scale-95 hover:scale-105"
                >
                  <div
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all ${
                      isSelected
                        ? "border-[#FACC15] scale-110"
                        : "border-white/50 hover:border-white border-[1px]"
                    }`}
                  >
                    {src ? (
                      <Image
                        src={src}
                        alt={badge.giftName || `Sticker`}
                        width={65}
                        height={65}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-3xl leading-none" aria-hidden>
                        {badge.giftEmoji || "🎁"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex-shrink-0 flex justify-center gap-2 mb-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === currentPage ? "bg-white w-6" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

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
