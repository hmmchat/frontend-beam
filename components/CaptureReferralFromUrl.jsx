"use client";

import { useEffect } from "react";

/** Persists ?ref= from the landing URL so Sign Up can attach referralCode to auth. */
export const PENDING_REFERRAL_STORAGE_KEY = "beam_pending_referral_code";

function hasValidAccessToken() {
  if (typeof window === "undefined") return false;
  try {
    const t = localStorage.getItem("accessToken");
    if (!t || t === "null" || t === "undefined" || t.split(".").length !== 3) {
      return false;
    }
    JSON.parse(atob(t.split(".")[1]));
    return true;
  } catch {
    return false;
  }
}

/** Remove ref from URL without reload so shared devices / bookmarks are less error-prone. */
function stripRefQueryParam() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("ref")) return;
    url.searchParams.delete("ref");
    const next =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
      url.hash;
    window.history.replaceState({}, "", next);
  } catch {
    /* ignore */
  }
}

export function getPendingReferralCode() {
  if (typeof window === "undefined") return undefined;
  try {
    const v = sessionStorage.getItem(PENDING_REFERRAL_STORAGE_KEY)?.trim();
    return v || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Referral code to send with sign-up auth only when the browser is not already
 * in an authenticated session (avoids stale ?ref= after an existing user scanned a QR).
 */
export function getPendingReferralCodeIfAnonymous() {
  if (hasValidAccessToken()) return undefined;
  return getPendingReferralCode();
}

export function clearPendingReferralCode() {
  try {
    sessionStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export default function CaptureReferralFromUrl() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (hasValidAccessToken()) {
        return;
      }
      const sp = new URLSearchParams(window.location.search);
      const ref = sp.get("ref")?.trim();
      if (ref) {
        sessionStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, ref);
        stripRefQueryParam();
      }
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
