"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { API, apiRequest } from "@/lib/api";
import { fetchUserStickers, getActiveBadgeId } from "@/lib/stickers";

export default function ProfileMobileStickers({ 
  activeTab, 
  setActiveTab, 
  user,
  setUser
}) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState(null);

  const userId = user?.id || user?.userId;

  useEffect(() => {
    const activeId = getActiveBadgeId(user);
    if (activeId !== undefined) {
      setSelectedGiftId(activeId);
    }
  }, [user?.activeBadgeId, user?.activeBadge?.giftId]);

  useEffect(() => {
    if (activeTab === "stickers" && userId) {
      const fetchBadges = async () => {
        try {
          setLoading(true);
          const data = await fetchUserStickers(userId);
          setBadges(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("Failed to fetch badges:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchBadges();
    }
  }, [activeTab, userId]);

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
        const selected = badges.find((b) => b.giftId === selectedGiftId);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                activeBadgeId: selectedGiftId,
                activeBadgeImageUrl: selected?.imageUrl || null,
              }
            : prev
        );
      }
      setActiveTab("main");
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
        setUser((prev) =>
          prev ? { ...prev, activeBadgeId: null, activeBadgeImageUrl: null } : prev
        );
      }
      setActiveTab("main");
    } catch (err) {
      console.error("Failed to remove sticker:", err);
      alert("Failed to remove sticker: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {activeTab === "stickers" && (
        <div
          onClick={() => setActiveTab("main")}
          className="fixed inset-0 z-40 animate-in fade-in duration-300 "
        />
      )}

      <div
        className={`fixed bottom-0 w-full h-[62vh] bg-[#3D0075] rounded-[2.5rem] p-8 transition-transform duration-500 z-50 max-w-[400px] mx-auto ${
          activeTab === "stickers" ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          backgroundImage: `
            linear-gradient( rgba(0,0,0,0.2),  rgba(0,0,0,0.2)),
            url(/assets/mb.jpg)
          `,
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
        }}
      >
         
        {/* TITLE */}
        <div className="text-left mb-4">
          <p className="text-md font-semibold">Your Stickers</p>
          <p className="text-xs text-white/70 font-outfit mt-1 leading-snug">
            Apply a sticker next to your profile photo.
            <br />
            Stickers expire 7 days after you receive them
          </p>
        </div>

        {/* INNER CARD */}
        <div className=" ">
          {/* GRID */}
          <div className="grid grid-cols-4 gap-5 mb-6 max-h-[30vh] overflow-y-auto pr-1">
            {loading ? (
              <p className="col-span-4 text-center text-sm text-white/60 py-8">Loading stickers...</p>
            ) : badges.length === 0 ? (
              <p className="col-span-4 text-center text-sm text-white/60 py-8">No stickers received yet</p>
            ) : (
              badges.map((badge) => {
                const isSelected = selectedGiftId === badge.giftId;

                return (
                  <div
                    key={badge.giftId}
                    onClick={() => handleSelectSticker(badge.giftId)}
                    title={badge.giftName || badge.giftId}
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full aspect-square cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-[3px] border-yellow-400 border-b-4"
                        : "border border-white/50"
                    }`}
                  >
                    {badge.imageUrl ? (
                      <Image
                        src={badge.imageUrl}
                        width={50}
                        height={50}
                        alt={badge.giftName || ""}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-3xl leading-none" aria-hidden>
                        {badge.giftEmoji || "🎁"}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-between">
            {/* REMOVE */}
            <div
              onClick={handleRemoveSticker}
              className={`flex items-center gap-3 text-white/90 cursor-pointer ${
                saving || !userId ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <div className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center">
                −
              </div>
              <p className="text-sm">Remove sticker</p>
            </div>

            {/* SAVE BUTTON */}
            <button
              onClick={handleSaveSticker}
              disabled={saving || !userId}
              className="px-10 py-4 border border-white/40 rounded-full text-white font-semibold hover:bg-white/10 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
