"use client";

import Image from "next/image";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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

function DeleteAccountModal({ open, onClose, onConfirm, confirming }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-desc"
        className="relative max-h-[min(85dvh,540px)] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-white/30 bg-[#2a0a4a]/95 p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-md sm:rounded-[2rem] sm:p-8 sm:pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-right text-lg font-extrabold tracking-wide text-yellow-400 [font-family:var(--font-otomanopee),sans-serif] sm:text-xl">
          beam
        </p>

        <h2
          id="delete-account-title"
          className="mt-1 text-lg font-semibold leading-snug text-yellow-400 [font-family:var(--font-otomanopee),sans-serif] sm:text-xl"
        >
          Delete your account permanently?
        </h2>

        <p
          id="delete-account-desc"
          className="mt-4 text-sm leading-relaxed text-white/90 sm:text-[15px]"
        >
          This action cannot be undone. Your account will not be restored if you continue. Your
          profile and associated data will be removed according to our retention policy.
        </p>

        <p className="mt-4 text-sm font-medium text-white sm:text-[15px]">
          Are you sure you want to delete your account?
        </p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:mt-10 sm:flex-row sm:justify-end sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="min-h-[48px] w-full rounded-full border border-white/45 px-6 py-3 text-center text-[15px] font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50 sm:min-h-0 sm:w-auto sm:min-w-[7.5rem]"
          >
            No
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="min-h-[48px] w-full rounded-full border border-red-400/55 bg-red-950/35 px-6 py-3 text-center text-[15px] font-semibold text-red-100 transition-colors hover:bg-red-950/55 disabled:opacity-60 sm:min-h-0 sm:w-auto sm:min-w-[7.5rem]"
          >
            {confirming ? "Deleting…" : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsContent() {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const closeDeleteModal = useCallback(() => {
    if (busy === "delete") return;
    setDeleteModalOpen(false);
  }, [busy]);

  /**
   * Sign out: clear local session and go home immediately so the UI never
   * blocks on auth-service. Revoke refresh in the background (keepalive helps
   * if the tab navigates away during the request).
   */
  const signOut = () => {
    const refreshToken = localStorage.getItem("refreshToken");
    clearClientSession();
    router.replace("/");
    if (!refreshToken) return;
    fetch(API.AUTH.LOGOUT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      keepalive: true,
    }).catch((e) => {
      console.warn("[Settings] Background logout failed:", e);
    });
  };

  const confirmDeleteAccount = async () => {
    setBusy("delete");
    try {
      const signal =
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(12000)
          : undefined;
      await apiRequest(API.AUTH.DELETE_ACCOUNT, { method: "DELETE", signal });
      setDeleteModalOpen(false);
      clearClientSession();
      router.replace("/");
    } catch (e) {
      const msg =
        e?.name === "AbortError"
          ? "That request timed out. Your account may or may not have been deleted—please try signing in again or contact support."
          : e?.message || "Could not delete account. Please try again.";
      alert(msg);
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
              disabled={busy === "delete"}
            />
            <ActionRow
              label="Delete my account"
              onClick={() => setDeleteModalOpen(true)}
              disabled={busy !== null}
              destructive
            />
          </div>
        </section>
      </main>

      <DeleteAccountModal
        open={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteAccount}
        confirming={busy === "delete"}
      />
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
