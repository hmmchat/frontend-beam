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
        setScale(0.80); // iPhone SE
        setTranslateY(0); // slightly smaller vertical translation to prevent top cut off
      }

      else if (h <= 740) {
        setScale(0.85); // XR, 11, 12 mini
        setTranslateY(-10);
      } else {
        setScale(1);
        setTranslateY();
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden cursor-pointer bg-black/20 backdrop-blur-[1px]"
      onClick={onClose}
    >
      {loading ? (
        <div
          className="flex flex-col items-center gap-3 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin " />
          <p className="text-white/60 text-sm">Loading facecard...</p>
        </div>
      ) : user ? (
        <div
          className={clsx(
            "relative z-20 flex flex-col items-center border border-white/30 rounded-[30px]  cursor-default",
            "origin-top transition-transform duration-300"
          )}
          style={
            typeof window !== "undefined" && window.innerWidth < 768
              ? {
                backgroundImage: "url('/assets/mb.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: `translateY(${translateY}px) scale(${scale})`,
                transformOrigin: " center",
                width: "380px",
                height: "670px",
              }
              : {
                backgroundImage: "url('/assets/mb.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                width: "365px",
                height: "675px",
              }
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-1 w-full  flex items-end justify-center">
            <FaceCard
              user={{
                ...user,
                age: calculateAge(user.dateOfBirth),
                city: user.preferredCity || user.city,
              }}
              className="md:mt-10"
            />
          </div>

          <button
            onClick={onClose}
            className="absolute -bottom-[7vh] z-[210] p-2  rounded-full border border-white/20 text-white "
            title="Close"
            style={{
              backgroundImage: "url('/assets/mb.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <IoClose className="text-2xl" />
          </button>
        </div>
      ) : (
        <div
          className="text-white/60 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          Failed to load facecard.
        </div>
      )}
    </div>
  );
}
