import { v2 as cloudinarySDK, type UploadApiResponse } from "cloudinary";
import { config } from "../config";
import { logger } from "../lib/logger";
import { AppError } from "../errors/AppError";

// Cloudinary integration wrapper (CLAUDE.md §3). All Cloudinary SDK calls live
// here so services depend on this interface, not the SDK directly.
//
// Fail-soft design: when any of the three required env vars is absent, every
// upload/delete returns a typed error result rather than throwing — matching the
// same pattern as the Resend and VAPID integrations. The upload routes read
// `isConfigured()` and return 503 before touching the service layer, so callers
// that don't go through a route (e.g. tests) get a clean `not_configured` result.

// ─── Config ───────────────────────────────────────────────────────────────────

const configured =
  !!config.CLOUDINARY_CLOUD_NAME &&
  !!config.CLOUDINARY_API_KEY &&
  !!config.CLOUDINARY_API_SECRET;

if (configured) {
  cloudinarySDK.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadResult =
  | { status: "ok"; url: string; publicId: string }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

export type DeleteResult =
  | { status: "ok" }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

// The two upload contexts with their own transformation presets.
export type UploadContext = "avatar" | "portfolio";

const UPLOAD_OPTIONS: Record<
  UploadContext,
  { folder: string; transformation: Record<string, unknown>[] }
> = {
  avatar: {
    folder: "glamly/avatars",
    // Square crop centred on the face; auto format + quality for mobile savings.
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face", fetch_format: "auto", quality: "auto" },
    ],
  },
  portfolio: {
    folder: "glamly/portfolio",
    // Limit to fit within 1200×900; preserve aspect ratio; auto format + quality.
    transformation: [
      { width: 1200, height: 900, crop: "limit", fetch_format: "auto", quality: "auto" },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the Cloudinary public_id from a secure URL so we can delete the old
 * asset when a user replaces their image. Returns null if the URL is not a
 * Cloudinary URL (e.g. an external seed URL).
 *
 * Cloudinary URL pattern:
 *   https://res.cloudinary.com/{cloud}/{resource_type}/upload/[transforms/]v{version}/{public_id}.{ext}
 */
export function publicIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("cloudinary.com")) return null;

    // Path: /cloud/image/upload/[optional transforms or version]/public_id.ext
    const parts = parsed.pathname.split("/");
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return null;

    // Everything after "upload/" is either version (v123456) or transforms then
    // the public_id. Skip version segment if present, skip transformation segments.
    const afterUpload = parts.slice(uploadIdx + 1);

    // Drop all transformation/version segments (they contain ":" or start with "v" + digits)
    const idParts: string[] = [];
    let hitId = false;
    for (const segment of afterUpload) {
      if (!hitId && (segment.startsWith("v") && /^v\d+$/.test(segment))) continue;
      if (!hitId && segment.includes(":")) continue;
      hitId = true;
      idParts.push(segment);
    }

    const lastPart = idParts.join("/");
    // Strip the file extension.
    return lastPart.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}

// ─── Upload from buffer (memory storage) ──────────────────────────────────────

function uploadBuffer(buffer: Buffer, context: UploadContext): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const opts = UPLOAD_OPTIONS[context];
    const stream = cloudinarySDK.uploader.upload_stream(
      {
        folder: opts.folder,
        transformation: opts.transformation,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          // Cloudinary errors are plain objects, not Error instances. Normalise so
          // the catch block above can reliably read `.message`.
          if (error) {
            const normalised = new Error(error.message ?? "Cloudinary upload failed");
            (normalised as Error & { http_code?: number }).http_code = error.http_code;
            reject(normalised);
          } else {
            reject(new Error("Cloudinary upload returned no result"));
          }
        } else {
          resolve(result);
        }
      },
    );
    stream.end(buffer);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const cloudinary = {
  /** True when all three Cloudinary env vars are set and the SDK is initialised. */
  isConfigured(): boolean {
    return configured;
  },

  /**
   * Upload a file buffer to Cloudinary. Uses memory-storage (multer passes a
   * Buffer), so no temp files hit disk. Returns the secure HTTPS URL and the
   * public_id needed for future deletions.
   *
   * If an `oldUrl` is supplied and it belongs to Cloudinary, the old asset is
   * deleted after a successful upload (best-effort, failure is logged not thrown).
   */
  async upload(
    buffer: Buffer,
    context: UploadContext,
    oldUrl?: string | null,
  ): Promise<UploadResult> {
    if (!configured) {
      logger.warn("Cloudinary upload skipped — credentials not configured");
      return { status: "not_configured" };
    }

    try {
      const result = await uploadBuffer(buffer, context);

      // Best-effort cleanup of the replaced asset. We do this AFTER the new upload
      // commits so a partial failure still leaves the user with a valid image.
      if (oldUrl) {
        const oldPublicId = publicIdFromUrl(oldUrl);
        if (oldPublicId) {
          void cloudinary.delete(oldPublicId).catch((err) => {
            logger.warn("Failed to delete old Cloudinary asset", {
              publicId: oldPublicId,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }

      logger.info("Cloudinary upload succeeded", {
        context,
        publicId: result.public_id,
        bytes: result.bytes,
      });

      return { status: "ok", url: result.secure_url, publicId: result.public_id };
    } catch (err) {
      // Cloudinary SDK errors are plain objects with a `message` string, not
      // standard Error instances — extract `.message` before falling back to String().
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? String(err);
      logger.error("Cloudinary upload failed", { context, error: message });
      return { status: "failed", error: message };
    }
  },

  /**
   * Permanently delete an asset by its public_id. Used when a user removes a
   * portfolio image or the cleanup after an avatar replace fails at call-site.
   */
  async delete(publicId: string): Promise<DeleteResult> {
    if (!configured) {
      return { status: "not_configured" };
    }

    try {
      await cloudinarySDK.uploader.destroy(publicId, { resource_type: "image" });
      logger.info("Cloudinary asset deleted", { publicId });
      return { status: "ok" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Cloudinary delete failed", { publicId, error: message });
      return { status: "failed", error: message };
    }
  },
};

// ─── Error helpers used by routes ────────────────────────────────────────────

export class UploadNotConfiguredError extends AppError {
  constructor() {
    super(
      "Image uploads are not configured on this server",
      503,
      "UPLOAD_NOT_CONFIGURED",
    );
  }
}

export class UploadFailedError extends AppError {
  constructor(detail?: string) {
    super(
      detail ? `Image upload failed: ${detail}` : "Image upload failed",
      502,
      "UPLOAD_FAILED",
    );
  }
}
