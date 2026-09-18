/**
 * Shrinks a photo in the browser before it is uploaded. Phone cameras produce
 * 3–10 MB images; a profile photo is shown at most ~100px wide, so resizing to
 * 800px and re-encoding as JPEG typically cuts it to well under 150 KB —
 * faster uploads, less storage, and faster pages everywhere the photo appears.
 */
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.85;

export async function compressImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Not a decodable image — let the normal validation report it.
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );

  // Keep the original if re-encoding somehow made it larger.
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
