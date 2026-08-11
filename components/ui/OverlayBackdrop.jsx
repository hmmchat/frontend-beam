/**
 * Full-viewport dim (+ optional blur) behind any modal/overlay.
 * Place as the first child of a `fixed inset-0` (or absolute inset-0) root.
 *
 * Gift/dare flows pass blur={false} so the call stays sharp behind the sheet.
 */
export default function OverlayBackdrop({ onClick, className = "", blur = true }) {
  return (
    <div
      aria-hidden
      role="presentation"
      onClick={onClick}
      className={[
        "absolute inset-0 z-0",
        blur
          ? "bg-black/30 backdrop-blur-sm supports-[backdrop-filter]:bg-black/20"
          : "bg-transparent",
        className,
      ].join(" ")}
    />
  );
}

/** Shared class for roots that want the blur on the same element (simple cases). */
export const OVERLAY_SCRIM_CLASS =
  "bg-black/30 backdrop-blur-sm supports-[backdrop-filter]:bg-black/20";

/** Clear click-catcher — gift/dare overlays (no dim, no blur). */
export const OVERLAY_CLEAR_CLASS = "bg-transparent";
