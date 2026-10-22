"use client";

import { useState } from "react";
import { toast } from "sonner";

type Asset = { publicId: string; url: string; width: number | null; height: number | null; resourceType: string };
type CloudinaryErrorBody = { error?: { code?: string; message?: string } };
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const missingConfigurationMessage = "Cloudinary is not configured. Add the required Cloudinary credentials to .env.local and restart the server.";

function safeCode(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(value) ? value : undefined;
}

async function reportFailure(status: number, code?: string) {
  try {
    await fetch("/api/admin/cloudinary/diagnostic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, code: safeCode(code) }),
    });
  } catch {
    // Upload failure is already shown to the admin; diagnostic logging must not mask it.
  }
}

function uploadError(status: number, code?: string) {
  if (status === 401) return "Cloudinary rejected the upload (401). Check API key and secret.";
  if (status === 413) return "The image is too large.";
  if (status === 400) return `Cloudinary rejected the upload (400)${code ? `: ${code}.` : "."}`;
  return `Cloudinary rejected the upload (${status}). Check the Cloudinary configuration.`;
}

export function CloudinaryUpload({ onUploaded }: { onUploaded: (asset: Asset) => void }) {
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!acceptedTypes.has(file.type)) {
      toast.error("Cloudinary rejected this file type.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("The image is too large. Choose an image under 10 MB.");
      return;
    }
    setBusy(true);
    try {
      const sign = await fetch("/api/admin/cloudinary/sign", { method: "POST" });
      const signed = await sign.json().catch(() => ({})) as { error?: string; cloudName?: string; apiKey?: string; timestamp?: number; folder?: string; signature?: string };
      if (!sign.ok) throw new Error(signed.error || missingConfigurationMessage);
      if (!signed.cloudName || !signed.apiKey || !signed.timestamp || !signed.folder || !signed.signature) throw new Error("The signed upload response is incomplete.");

      const body = new FormData();
      body.set("file", file);
      body.set("api_key", signed.apiKey);
      body.set("timestamp", String(signed.timestamp));
      body.set("folder", signed.folder);
      body.set("signature", signed.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, { method: "POST", body });
      const result = await response.json().catch(() => ({})) as CloudinaryErrorBody & { secure_url?: unknown; public_id?: unknown; resource_type?: unknown; width?: unknown; height?: unknown };
      const code = safeCode(result.error?.code);
      if (!response.ok) {
        await reportFailure(response.status, code);
        throw new Error(uploadError(response.status, code));
      }
      if (typeof result.secure_url !== "string" || typeof result.public_id !== "string" || result.resource_type !== "image") {
        await reportFailure(response.status, "INVALID_SUCCESS_RESPONSE");
        throw new Error("Cloudinary returned an incomplete image response.");
      }
      onUploaded({ publicId: result.public_id, url: result.secure_url, resourceType: result.resource_type, width: typeof result.width === "number" ? result.width : null, height: typeof result.height === "number" ? result.height : null });
      toast.success("Image uploaded. Save the product to keep it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return <label className="inline-flex cursor-pointer items-center gap-2 border border-line bg-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-[.12em] hover:border-olive">{busy ? "Uploading…" : "Upload image"}<input aria-label="Choose an image to upload" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} /></label>;
}
