"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mediaReady, setMediaReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setSaving(false);
      setError("");
      setMediaReady(false);
    }
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open || !imageUrl) {
      setMediaReady(false);
      return;
    }
    let cancelled = false;
    setMediaReady(false);
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setMediaReady(true);
    };
    img.onerror = () => {
      if (!cancelled) {
        setMediaReady(false);
        setError("Could not load this photo. Try a JPEG or PNG instead.");
      }
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onCropComplete = useCallback((_area, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!imageUrl || busy || saving) return;
    if (!croppedAreaPixels?.width || !croppedAreaPixels?.height) {
      setError("Could not read the crop area. Wait for the photo to load, then try again.");
      return;
    }
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

  if (!mounted || !open || !imageUrl) return null;

  const disabled = busy || saving;

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/90 text-white"
      style={{ height: "100dvh", width: "100vw" }}
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

      <div className="relative min-h-0 flex-1 w-full">
        {mediaReady ? (
          <Cropper
            key={imageUrl}
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
            objectFit="contain"
            style={{
              containerStyle: { width: "100%", height: "100%" },
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
            {error ? "Photo could not be displayed" : "Loading photo…"}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 border-t border-white/15 px-3 sm:px-4 py-3 sm:py-4 shrink-0 max-w-lg w-full mx-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60 w-12">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            disabled={disabled || !mediaReady}
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
          disabled={disabled || !mediaReady || !croppedAreaPixels?.width}
          className="w-full rounded-full bg-yellow-400 py-3 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-40"
        >
          {saving || busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
