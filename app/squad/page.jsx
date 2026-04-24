"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SignUpModal from "@/components/auth/SignUpModal";
import { API, apiRequest } from "@/lib/api";
import {
  clearPendingSquadInviteToken,
  setPendingSquadInviteToken,
  setPostOnboardingRedirectPath,
  clearPostOnboardingRedirectPath,
} from "@/lib/squad-invite-link";

function SquadInviteLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = String(searchParams?.get("token") || "").trim();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [message, setMessage] = useState("Joining squad invite...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const join = async () => {
      if (!token) {
        setError("Invalid squad invite link.");
        return;
      }

      const joinPath = `/squad?token=${encodeURIComponent(token)}`;
      setPendingSquadInviteToken(token);
      setPostOnboardingRedirectPath(joinPath);

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setMessage("Please sign in to continue with this squad invite.");
        setShowAuthModal(true);
        return;
      }

      try {
        await apiRequest(API.SQUAD.JOIN_EXTERNAL(token));
        if (cancelled) return;
        clearPendingSquadInviteToken();
        clearPostOnboardingRedirectPath();
        router.replace("/?squad=1");
      } catch (e) {
        if (cancelled) return;
        const status = Number(e?.status || 0);
        const msg = String(e?.message || "Could not join this squad invite.");
        if (status === 401) {
          setMessage("Please sign in to continue with this squad invite.");
          setShowAuthModal(true);
          return;
        }
        if (status === 404 && /profile/i.test(msg)) {
          router.replace("/onboarding");
          return;
        }
        setError(msg);
      }
    };

    void join();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <div className="min-h-screen w-full bg-[#05002B] text-white flex items-center justify-center px-6 text-center">
      <div className="max-w-xl w-full">
        <h1 className="text-2xl font-bold mb-3">Squad Invite</h1>
        {error ? (
          <p className="text-red-300">{error}</p>
        ) : (
          <p className="text-white/80">{message}</p>
        )}
      </div>

      <SignUpModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          router.replace("/");
        }}
      />
    </div>
  );
}

export default function SquadInviteLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#05002B] text-white flex items-center justify-center px-6 text-center">
          <p className="text-white/80">Loading squad invite...</p>
        </div>
      }
    >
      <SquadInviteLinkContent />
    </Suspense>
  );
}

