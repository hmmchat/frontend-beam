"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = [
  "/",
  "/onboarding",
  "/onboarding/interests",
  "/onboarding/values",
  "/onboarding/brands",
  "/onboarding/music",
  "/onboarding/photos",
  "/onboarding/location",
  "/squad",
  "/warning",
];

function isPublicPath(pathname) {
  const clean = pathname.replace(/\/$/, "") || "/";
  return PUBLIC_PATHS.some((p) => clean === p.replace(/\/$/, ""));
}

function hasValidToken() {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token || token === "null" || token === "undefined") return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export default function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isPublicPath(pathname)) return;
    if (!hasValidToken()) {
      router.replace("/");
    }
  }, [pathname, router]);

  return children;
}
