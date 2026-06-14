"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { API, apiRequest } from "@/lib/api";

import MobileHome from "@/components/Mobile/MobileHome";
import DesktopHome from "@/components/Mobile/DesktopHome";
import HomeSkeletonMobile from "@/components/skeletons/HomeSkeletonMobile";
import HomeSkeletonDesktop from "@/components/skeletons/HomeSkeletonDesktop";

import { clearPendingReferralCode } from "@/components/CaptureReferralFromUrl";

const MeetSomeoneDynamic = dynamic(
  () => import("@/components/Home/MeetSomeoneDynamic"),

);

const MyComponent = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  const runAuthCheck = async () => {
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
    } catch (_) {
      setIsLoggedIn(false);
      setAuthChecked(true);
      setProfileChecked(true);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    runAuthCheck();
  }, []);

  // Re-run auth check when login happens on the same page (e.g. modal login without navigation)
  useEffect(() => {
    const handleAuthChanged = () => {
      runAuthCheck();
    };
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
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
    } catch (_) { }
  }, [authChecked, isLoggedIn]);






  if (isLoggedIn && profileComplete) {
    return <MeetSomeoneDynamic />;
  }

  // Show skeleton while checking auth — only on the very first load
  if (!authChecked) {
    return (
      <>
        <div className="hidden md:block">
          <HomeSkeletonDesktop />
        </div>
        <div className="block md:hidden">
          <HomeSkeletonMobile />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <DesktopHome />
      </div>
      <div className="block md:hidden">
        <MobileHome />
      </div>
    </>
  );
};

export default MyComponent;
