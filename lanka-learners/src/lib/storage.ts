import "server-only";

import { put } from "@vercel/blob";

/**
 * Profile photos are never stored in PostgreSQL or on the local filesystem —
 * only a URL is persisted. Vercel Blob is used when configured, with Cloudinary
 * as a fallback, so the app stays stateless and Vercel-compatible.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Strips directories and anything that is not a safe filename character. */
function safeFileName(original: string): string {
  const base = original.split(/[\\/]/).pop() ?? "photo";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-60);
  return cleaned || "photo";
}

export function validateImage(file: File): string | null {
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_BYTES) return "Image must be 5 MB or smaller.";
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Image must be a JPEG, PNG or WebP file.";
  }
  return null;
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );
}

async function uploadToCloudinary(file: File): Promise<UploadResult> {
  const { v2: cloudinary } = await import("cloudinary");

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder: "lanka-learners/clients",
    resource_type: "image",
    overwrite: false,
  });

  return { ok: true, url: uploaded.secure_url };
}

/**
 * Uploads a validated client profile photo and returns its public URL.
 * Errors are returned, not thrown — a failed photo upload must not take down
 * the whole client registration.
 */
export async function uploadClientPhoto(file: File): Promise<UploadResult> {
  const validationError = validateImage(file);
  if (validationError) return { ok: false, error: validationError };

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const name = `clients/${Date.now()}-${safeFileName(file.name)}`;
      const blob = await put(name, file, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type,
      });
      return { ok: true, url: blob.url };
    }

    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      return await uploadToCloudinary(file);
    }

    return {
      ok: false,
      error:
        "File storage is not configured. Set BLOB_READ_WRITE_TOKEN or the Cloudinary variables.",
    };
  } catch (error) {
    console.error("[storage] upload failed", error);
    return { ok: false, error: "Could not upload the image. Please try again." };
  }
}
