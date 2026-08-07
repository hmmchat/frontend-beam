"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { FACECARD_PORTRAIT_ASPECT } from "@/lib/facecard-portrait";
import { getCroppedImageBlob } from "@/lib/crop-image";
import ErrorAlert from "@/components/ui/ErrorAlert";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {string | null} props.imageUrl Object URL from URL.createObjectURL (parent revokes on close)
 * @param {() => void} props.onClose
 * @param {(file: File) => void | Promise<void>} props.onComplete
 * @param {number} [props.aspect]
 * @param {boolean} [props.busy]
 */
export default function PortraitImageCropModal({
  open,
  imageUrl,
  onClose,
  onComplete,
  aspect = FACECARD_PORTRAIT_ASPECT,
  busy = false,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setSaving(false);
      setError("");
    }
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onCropComplete = useCallback((_area, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!imageUrl || !croppedAreaPixels || busy || saving) return;
    setSaving(true);
    setError("");
    try {
      const blob = await getCroppedImageBlob(imageUrl, croppedAreaPixels);
      const file = new File([blob], `portrait-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      await onComplete(file);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Could not crop image.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !imageUrl) return null;

  const disabled = busy || saving;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portrait-crop-title"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 shrink-0">
        <h2 id="portrait-crop-title" className="text-sm font-semibold tracking-wide">
          Adjust photo
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="rounded-full border border-white/30 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <div className="relative flex-1 min-h-[200px] w-full">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          objectFit="contain"
        />
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 border-t border-white/15 px-3 sm:px-4 py-3 sm:py-4 shrink-0 safe-area-pb max-w-lg w-full mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60 w-12">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            disabled={disabled}
            className="flex-1 accent-yellow-400"
          />
        </div>
        <p className="text-[11px] text-white/50 text-center px-1">
          Pinch-style: drag to frame your face. Portrait ratio matches your face card.
        </p>
        {error && <ErrorAlert message={error} className="mt-0" />}
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || !croppedAreaPixels}
          className="w-full rounded-full bg-yellow-400 py-3 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-40"
        >
          {saving || busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
