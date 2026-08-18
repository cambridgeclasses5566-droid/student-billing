import crypto from "crypto";
import { put, del } from "@vercel/blob";

export const allowedLogoTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

export function uniqueLogoFilename(mimeType) {
  return `institute-logo-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${allowedLogoTypes.get(mimeType)}`;
}

export async function uploadLogoToBlob(file, userId) {
  const filename = uniqueLogoFilename(file.mimetype);

  const blob = await put(
    `logos/${userId}/${filename}`,

    file.buffer,

    {
      access: "public",
      contentType: file.mimetype,

      addRandomSuffix: false,
    },
  );

  return blob.url;
}

export async function removeStoredLogo(logoUrl) {
  if (!logoUrl) {
    return;
  }

  try {
    await del(logoUrl);
  } catch (error) {
    console.error("Failed to remove stored logo:", error);
  }
}
