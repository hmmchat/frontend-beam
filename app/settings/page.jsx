"use client";

import Image from "next/image";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ProfileGuard from "@/components/auth/ProfileGuard";
import { API, apiRequest } from "@/lib/api";
import { clearPendingReferralCode } from "@/components/CaptureReferralFromUrl";

function clearClientSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  clearPendingReferralCode();
}

function PlaceholderRow({ label }) {
  return (
    <div className="flex w-full items-center justify-between py-3.5">
      <span className="text-[15px] text-white">{label}</span>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/35"
        aria-hidden
      >
        <ChevronRight className="h-4 w-4 text-white/90" />
      </span>
    </div>
  );
}

function ActionRow({ label, onClick, disabled, destructive }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between py-3.5 text-left text-[15px] transition-colors hover:bg-white/5 disabled:cursor-wait disabled:opacity-60 ${
        destructive ? "text-red-200" : "text-white"
      }`}
    >
      <span>{label}</span>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/35"
        aria-hidden
      >
        <ChevronRight className="h-4 w-4 text-white/90" />
      </span>
    </button>
  );
}

function SettingsContent() {
  const router = useRouter();
  const [busy, setBusy] = useState(null);

  const signOut = async () => {
    setBusy("logout");
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await apiRequest(API.AUTH.LOGOUT, {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) {
      console.warn("[Settings] Logout request failed:", e);
    } finally {
      clearClientSession();
      router.push("/");
    }
  };

  const deleteAccount = async () => {
    const ok = window.confirm(
      "Delete your account? Your data will be permanently removed within 30 days. You will be signed out."
    );
    if (!ok) return;
    setBusy("delete");
    try {
      await apiRequest(API.AUTH.DELETE_ACCOUNT, { method: "DELETE" });
      clearClientSession();
      router.push("/");
    } catch (e) {
      alert(e?.message || "Could not delete account. Please try again.");
      setBusy(null);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden px-5 pb-16 pt-8 font-outfit md:px-10 md:pt-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/test.png"
          alt=""
          fill
          className="object-cover opacity-30"
          priority
        />
      </div>

      <header className="mb-8 flex w-full max-w-5xl items-center justify-between self-center px-1">
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="flex items-center gap-3 rounded-xl py-1 pr-2 text-left text-white transition-colors hover:bg-white/10"
          aria-label="Back to profile"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40">
            <ArrowLeft size={18} />
          </span>
          <span className="text-base font-medium">Settings</span>
        </button>
        <h1 className="text-3xl font-extrabold tracking-wide text-yellow-400 [font-family:var(--font-otomanopee),sans-serif]">
          beam
        </h1>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 rounded-[2.5rem] border border-white/30 px-5 py-6 md:px-10 md:py-8">
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-white md:text-base">
            Terms of service
          </h2>
          <div className="divide-y divide-white/15">
            <PlaceholderRow label="Terms of service" />
            <PlaceholderRow label="About Us" />
            <PlaceholderRow label="Safety center" />
            <PlaceholderRow label="Privacy policy" />
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-white md:text-base">
            Support
          </h2>
          <div className="divide-y divide-white/15">
            <PlaceholderRow label="FAQs" />
            <PlaceholderRow label="Contact Us" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-white md:text-base">
            Account
          </h2>
          <div className="divide-y divide-white/15">
            <ActionRow
              label="Sign out"
              onClick={signOut}
              disabled={busy !== null}
            />
            <ActionRow
              label="Delete my account"
              onClick={deleteAccount}
              disabled={busy !== null}
              destructive
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProfileGuard>
      <SettingsContent />
    </ProfileGuard>
  );
}
