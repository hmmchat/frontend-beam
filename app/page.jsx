"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { API, apiRequest } from "@/lib/api";

import MobileHome from "@/components/Mobile/MobileHome";
import DesktopHome from "@/components/Mobile/DesktopHome";
import HomeSkeleton from "@/components/Home/HomeSkeleton";
import { clearPendingReferralCode } from "@/components/CaptureReferralFromUrl";

const MeetSomeoneDynamic = dynamic(
  () => import("@/components/Home/MeetSomeoneDynamic"),
  {
    ssr: false,
    loading: () => <HomeSkeleton />,
  },
);

const MyComponent = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("accessToken");

    if (
      !token ||
      token === "null" ||
      token === "undefined" ||
      token.split(".").length !== 3
    ) {
      setIsLoggedIn(false);
      setAuthChecked(true);
      setProfileChecked(true);
      return;
    }

    try {
      JSON.parse(atob(token.split(".")[1]));
      setIsLoggedIn(true);

      const checkProfile = async () => {
        try {
          const data = await apiRequest(API.USERS.GET_ME);
          const user = data?.user || data;

          if (user && user.username) {
            setProfileComplete(true);
          } else {
            console.warn("[Home] Incomplete profile:", user);
            setProfileComplete(false);
            window.location.href = "/onboarding";
          }
        } catch (err) {
          console.error("[Home] Profile check failed:", err);
          if (err.status === 404) {
            setProfileComplete(false);
            window.location.href = "/onboarding";
          } else if (err.status === 401) {
            setIsLoggedIn(false);
            localStorage.removeItem("accessToken");
            clearPendingReferralCode();
          }
        } finally {
          setProfileChecked(true);
          setAuthChecked(true);
        }
      };

      checkProfile();
    } catch (_) {
      setIsLoggedIn(false);
      setAuthChecked(true);
      setProfileChecked(true);
    }
  }, []);

  // Cleanup invalid tokens (no state writes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!authChecked || isLoggedIn) return;
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("currentRoom");
    } catch (_) {}
  }, [authChecked, isLoggedIn]);




return (
  <>
    <div className={isLoggedIn && profileComplete ? "hidden" : ""}>
      <div className="hidden md:block">
        <DesktopHome />
      </div>
      <div className="block md:hidden">
        <MobileHome />
      </div>
    </div>

    <div className={isLoggedIn && profileComplete ? "block" : "hidden"}>
      <MeetSomeoneDynamic />
    </div>
  </>
);
};

export default MyComponent;
