"use client";

/**
 * Animated BEAM logo bubble; optional MOD caption under the mark.
 * Logo uses object-contain so the full wordmark fits inside the circle.
 */
export default function SystemAvatar({ line, size = 48, className = "" }) {
  const px = typeof size === "number" ? `${size}px` : size;
  const isMod = line === "BEAM_MOD";

  return (
    <div
      className={`relative shrink-0 overflow-visible ${className}`}
      style={{ width: px, height: px }}
      title={isMod ? "BEAM MOD" : "BEAM"}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full border border-yellow-400/50 bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.gif"
          alt={isMod ? "BEAM MOD" : "BEAM"}
          className="absolute inset-0 h-full w-full object-contain object-center p-[12%]"
          draggable={false}
        />
      </div>
      {isMod && (
        <span
          className="absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-1/3 rounded-sm bg-yellow-400 px-[3px] py-px text-[7px] font-black leading-none tracking-wide text-black"
          style={{ letterSpacing: "0.04em" }}
        >
          MOD
        </span>
      )}
    </div>
  );
}
