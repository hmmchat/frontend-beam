/**
 * Load an image for canvas (blob URLs work without crossOrigin).
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
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
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Crop produced empty image"));
        else resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
