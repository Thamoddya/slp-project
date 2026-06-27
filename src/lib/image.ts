/**
 * Read an image file and return a downscaled JPEG data URL, small enough to
 * store inside a Firestore document (well under the 1 MB field limit). Used for
 * the admin-only proof banner on Dansal requests.
 */
export async function compressImage(file: File, maxDim = 1280, quality = 0.7): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode-failed"));
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Upload a proof image to a free host (ImgBB) and return its URL, so the DB only
 * stores a short link instead of a heavy base64 blob. The image is uploaded with
 * an expiry (temporary hosting). If no key is configured (VITE_IMGBB_KEY) or the
 * upload fails, it falls back to returning the inline base64 data URL.
 *
 * Get a free key at https://api.imgbb.com/ and set VITE_IMGBB_KEY in .env.local.
 */
export async function uploadImage(dataUrl: string, expirySeconds = 60 * 60 * 24 * 60): Promise<string> {
  const key = import.meta.env.VITE_IMGBB_KEY as string | undefined;
  if (!key) return dataUrl;
  try {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const form = new FormData();
    form.append("image", base64);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}&expiration=${expirySeconds}`, {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    return json?.data?.url || json?.data?.display_url || dataUrl;
  } catch {
    return dataUrl;
  }
}
