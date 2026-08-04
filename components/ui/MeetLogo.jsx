import React from "react";
import clsx from "clsx";

export default function MeetLogo({
  activeCount = 0,
  beamingText = "beaming now",
  className = "",
  logoClassName = "",
  textClassName = "",
  countClassName = "",
}) {
  return (
    <div className={clsx("flex flex-col items-center justify-center text-center", className)}>
      <img
        src="/logo.gif"
        alt="logo"
        fetchPriority="high"
        decoding="async"
        className={clsx("w-[155px] h-[55px] object-contain mx-auto", logoClassName)}
      />

      <p
        className={clsx(
          "text-white text-12  font-medium font-otomanopee -mt-1 tracking-wide",
          textClassName
        )}
      >
        Meet someone here
      </p>

      <div
        className={clsx(
          "flex font-outfit items-center gap-1 mt-2 text-white/95 text-12",
          countClassName
        )}
      >
        <img
          src="/assets/video-on.svg"
          alt="video indicator"
          className="w-4 h-4"
        />
        <span>
          {activeCount !== null ? activeCount.toLocaleString() : "0"}{" "}
          {beamingText}
        </span>
      </div>
    </div>
  );
}
