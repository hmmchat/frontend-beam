/**
 * Full-viewport dim + blur behind any modal/overlay.
 * Place as the first child of a `fixed inset-0` (or absolute inset-0) root.
 */
export default function OverlayBackdrop({ onClick, className = "" }) {
  return (
    <div
      aria-hidden
      role="presentation"
      onClick={onClick}
      className={[
        "absolute inset-0 z-0 bg-black/45 backdrop-blur-md",
        "supports-[backdrop-filter]:bg-black/35",
        className,
      ].join(" ")}
    />
  );
}

/** Shared class for roots that want the blur on the same element (simple cases). */
export const OVERLAY_SCRIM_CLASS =
  "bg-black/45 backdrop-blur-md supports-[backdrop-filter]:bg-black/35";
