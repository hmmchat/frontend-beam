"use client";

import ProfileDesktop from "../../components/Profile/ProfileDesktop";
import ProfileMobile from "../../components/Mobile/ProfileMobile";

export default function BeamProfile() {
  return (
    <>
      <div className="hidden md:block">
        <ProfileDesktop />
      </div>
      <div className="md:hidden block">
        <ProfileMobile />
      </div>
    </>
  );
}
