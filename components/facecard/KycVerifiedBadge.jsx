"use client";

/**
 * Blue verified tick when discovery/profile card has KYC VERIFIED.
 * Omitted on moderator face cards (`isModeratorFaceCard`).
 */
export default function KycVerifiedBadge({ user, className = "" }) {
  if (!user || user.isModeratorFaceCard) return null;
  if (user.kycStatus !== "VERIFIED") return null;

  return (
    <span
      className={`ml-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 align-middle text-white shadow-sm ${className}`}
      title="KYC verified"
      aria-label="KYC verified"
    >
      <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" aria-hidden>
        <path
          d="M3.5 8.2 6.2 11l6.3-6.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
