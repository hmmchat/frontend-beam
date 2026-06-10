"use client";

import { useEffect } from "react";
import { API, apiRequest } from "@/lib/api";
import { getTabId } from "@/lib/tab-coordinator";

const ACTIVE_TABS_KEY = "hmm:activePresenceTabs";
const ACTIVE_TAB_TTL_MS = 90_000;
const HEARTBEAT_MS = 45_000;

function hasUsableToken() {
  try {
    const token = localStorage.getItem("accessToken");
    return Boolean(token && token !== "null" && token !== "undefined");
  } catch {
    return false;
  }
}

function authHeaders(includeJson = true) {
  const token = localStorage.getItem("accessToken");
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function readActiveTabs() {
  try {
    const raw = localStorage.getItem(ACTIVE_TABS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, expiresAt]) => Number(expiresAt) > now)
    );
  } catch {
    return {};
  }
}

function writeActiveTabs(tabs) {
  try {
    localStorage.setItem(ACTIVE_TABS_KEY, JSON.stringify(tabs));
  } catch {
    // ignore storage failures
  }
}

function markTabActive(tabId) {
  const tabs = readActiveTabs();
  tabs[tabId] = Date.now() + ACTIVE_TAB_TTL_MS;
  writeActiveTabs(tabs);
}

function markTabInactive(tabId) {
  const tabs = readActiveTabs();
  delete tabs[tabId];
  writeActiveTabs(tabs);
  return Object.keys(tabs).length === 0;
}

function sendInactivePresence() {
  if (!hasUsableToken()) return;
  try {
    fetch(API.USERS.REPORT_PRESENCE, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ active: false }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // keepalive is best-effort during page hide/unload
  }
}

async function heartbeatPresence() {
  if (!hasUsableToken()) return;
  try {
    await apiRequest(API.USERS.PRESENCE_HEARTBEAT, { method: "POST" });
  } catch {
    // Presence should never block navigation or rendering.
  }
}

export default function AppPresence() {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const tabId = getTabId();
    let heartbeatTimer = null;
    let activeTabsTimer = null;

    const stopTimers = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (activeTabsTimer) {
        clearInterval(activeTabsTimer);
        activeTabsTimer = null;
      }
    };

    const startActivePresence = () => {
      if (!hasUsableToken() || document.visibilityState === "hidden") return;
      markTabActive(tabId);
      heartbeatPresence();

      if (!heartbeatTimer) {
        heartbeatTimer = setInterval(heartbeatPresence, HEARTBEAT_MS);
      }
      if (!activeTabsTimer) {
        activeTabsTimer = setInterval(() => markTabActive(tabId), ACTIVE_TAB_TTL_MS / 3);
      }
    };

    const stopActivePresence = () => {
      stopTimers();
      if (markTabInactive(tabId)) {
        sendInactivePresence();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopActivePresence();
      } else {
        startActivePresence();
      }
    };

    const onPageHide = () => {
      stopActivePresence();
    };

    startActivePresence();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      stopTimers();
      markTabInactive(tabId);
    };
  }, []);

  return null;
}
