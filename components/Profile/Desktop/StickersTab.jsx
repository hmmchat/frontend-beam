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
  const [diamonds, setDiamonds] = useState(0);

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

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    apiRequest(API.WALLET.GET_BALANCE)
      .then((res) => {
        if (!cancelled) setDiamonds(Number(res?.diamonds) || 0);
      })
      .catch(() => {
        if (!cancelled) setDiamonds(0);
      });
    return () => {
      cancelled = true;
    };
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
      <div className="flex-shrink-0 mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold text-xl">Your Stickers</p>
          <p className="text-xs text-white/60 mt-1 leading-tight">
            Apply a sticker next to your profile photo. <br />
            Stickers expire {stickerExpiryDays} day{stickerExpiryDays === 1 ? "" : "s"} after you receive them
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white"
          title="Your diamonds"
        >
          <Image
            src="/gift/dimond.png"
            alt=""
            width={16}
            height={14}
            className="object-contain"
          />
          <span>{diamonds}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-start justify-start overflow-y-auto pb-8 w-full">
        {loading ? (
          <div className="flex-1 flex items-center justify-center w-full">
            <p className="text-white/60 text-sm">Loading stickers...</p>
          </div>
        ) : badges.length === 0 ? (
          <div className="flex-1 flex items-center justify-center w-full">
            <p className="text-white/60 text-sm">No stickers received yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-x-3 gap-y-4 place-items-center w-full pt-3 px-1">
            {currentBadges.map((badge) => {
              const isSelected = selectedBadgeId === badge.id;

              return (
                <div
                  key={badge.id}
                  onClick={() => handleSelectSticker(badge.id)}
                  title={badge.expiryLabel || badge.giftName || badge.giftId}
                  className="cursor-pointer transition-all active:scale-95"
                >
                  <div
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                      isSelected
                        ? "border-[3px] border-[#FACC15]"
                        : "border border-white/50 hover:border-white"
                    }`}
                  >
                    <Image
                      src={badge.imageUrl}
                      alt={badge.giftName || "Sticker"}
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
