"use client";

import ProfileGuard from "@/components/auth/ProfileGuard";
import ProfileDesktop from "../../components/Profile/ProfileDesktop";
import ProfileMobile from "../../components/Mobile/ProfileMobile";

export default function BeamProfile() {
  return (
    <ProfileGuard>
      <div className="hidden lg:block">
        <ProfileDesktop />
      </div>
      <div className="lg:hidden block">
        <ProfileMobile />
      </div>
    </ProfileGuard>
  );
}
