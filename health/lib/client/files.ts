"use client";

export function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image format isn't supported — try JPG or PNG (iPhone: Settings → Camera → Most Compatible)."));
    };
    img.src = url;
  });
}

/** Downscales a photo to JPEG so uploads stay small (Vercel request limit ≈ 4.5 MB). */
export async function compressImage(file: Blob, maxSide = 1800, quality = 0.85): Promise<{ dataUrl: string; blob: Blob }> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const blob = await (await fetch(dataUrl)).blob();
  return { dataUrl, blob };
}

/** Small square-ish preview stored alongside food entries. */
export async function thumbnail(file: Blob, side = 240): Promise<string> {
  return (await compressImage(file, side, 0.7)).dataUrl;
}

export const MAX_PDF_BYTES = 3.2 * 1024 * 1024;
