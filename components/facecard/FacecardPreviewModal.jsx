"use client";

import { useState, useEffect } from "react";
import FaceCard from "@/components/Home/FaceCard";
import { API, apiRequest } from "@/lib/api";
import { calculateAge } from "@/lib/facecard-utils";
import { IoClose } from "react-icons/io5";
import clsx from "clsx";

export default function FacecardPreviewModal({ userId, isOpen, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    if (!isOpen || !userId) {
      setUser(null);
      return;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(API.USERS.GET_USER(userId));
        setUser(data.user);
      } catch (error) {
        console.error("Error fetching user details for facecard preview:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, isOpen]);

  useEffect(() => {
    const updateScale = () => {
      const h = window.innerHeight;
      if (h <= 670) {
        setScale(0.78); // iPhone SE
        setTranslateY(-45);
      } else if (h <= 740) {
        setScale(0.85); // XR, 11, 12 mini
        setTranslateY(-15);
      } else {
        setScale(1);
        setTranslateY(0);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center md:p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer"
        style={{
          backgroundImage: "url('/assets/mb.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onClick={onClose}
      >
        {/* Close Button on Backdrop (Top-Right of screen) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[210] p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/20 text-white transition-colors"
          title="Close"
        >
          <IoClose className="text-2xl" />
        </button>

        <div
          className="relative z-10 flex flex-col items-center gap-4 border-0 md:border md:border-white/40 h-[92vh] rounded-[60px] md:w-[98vw] w-full md:w-[750px] justify-center cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white/60 text-sm">Loading facecard...</p>
            </div>
          ) : user ? (
            <div className="flex flex-col items-center pt-4 pb-4 scrollbar-none z-20">
              <div className="flex flex-col items-center pt-4 pb-4 scrollbar-none z-20">
                <div
                  className={clsx(
                    "origin-top transition-transform duration-500 w-full flex justify-center mt-3 md:mt-0"
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
                      ...user,
                      age: calculateAge(user.dateOfBirth),
                      city: user.preferredCity || user.city,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-white/60">Failed to load facecard.</p>
          )}
        </div>
      </div>
    </div>
  );
}
