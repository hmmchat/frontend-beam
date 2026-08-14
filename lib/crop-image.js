const MAX_OUTPUT_EDGE = 4096;

/**
 * Load an image for canvas (blob URLs work without crossOrigin).
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const finish = () => resolve(img);
      if (typeof img.decode === "function") {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    const fail = () => reject(new Error("Crop produced empty image"));
    const fromDataUrl = () => {
      try {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const comma = dataUrl.indexOf(",");
        if (comma < 0) return fail();
        const binary = atob(dataUrl.slice(comma + 1));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        if (!blob.size) return fail();
        resolve(blob);
      } catch {
        fail();
      }
    };

    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size) resolve(blob);
          else fromDataUrl();
        },
        mimeType,
        quality,
      );
    } catch {
      fromDataUrl();
    }
  });
}

/**
 * Crop image to pixel rect (from react-easy-crop `croppedAreaPixels`).
 * @param {string} imageSrc
 * @param {{ x: number; y: number; width: number; height: number }} pixelCrop
 * @param {string} [mimeType='image/jpeg']
 * @param {number} [quality=0.92]
 * @returns {Promise<Blob>}
 */
export async function getCroppedImageBlob(
  imageSrc,
  pixelCrop,
  mimeType = "image/jpeg",
  quality = 0.92,
) {
  const image = await loadImage(imageSrc);
  const srcW = image.naturalWidth || image.width;
  const srcH = image.naturalHeight || image.height;
  if (!srcW || !srcH) throw new Error("Failed to load image");

  let x = Number(pixelCrop?.x) || 0;
  let y = Number(pixelCrop?.y) || 0;
  let w = Number(pixelCrop?.width) || 0;
  let h = Number(pixelCrop?.height) || 0;

  x = Math.max(0, Math.min(Math.round(x), srcW - 1));
  y = Math.max(0, Math.min(Math.round(y), srcH - 1));
  w = Math.max(1, Math.min(Math.round(w), srcW - x));
  h = Math.max(1, Math.min(Math.round(h), srcH - y));

  const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  canvas.width = outW;
  canvas.height = outH;
  ctx.drawImage(image, x, y, w, h, 0, 0, outW, outH);

  return canvasToBlob(canvas, mimeType, quality);
}
