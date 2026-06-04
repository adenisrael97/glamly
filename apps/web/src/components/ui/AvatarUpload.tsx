"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface AvatarUploadProps {
  /** Current avatar URL — if null, shows a placeholder initials circle. */
  currentUrl: string | null;
  /** Display name — used to generate initials when there's no avatar. */
  name: string;
  /** Called with the chosen File so the parent can POST it to the API. */
  onUpload: (file: File) => Promise<void>;
  /** Optional CSS classes for the outer wrapper. */
  className?: string;
  /** Size of the avatar circle in pixels. Defaults to 80. */
  size?: number;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const ACCEPTED = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Reusable avatar upload widget.
 *
 * Renders a circular avatar (or initials placeholder) with a camera-icon
 * overlay. Clicking anywhere on the circle opens the native file picker.
 * After the user selects a file it is validated client-side (type + size),
 * a local preview is shown immediately, and `onUpload` is called with the
 * File so the parent can POST it. If the upload fails the preview reverts to
 * the previous URL and an inline error is surfaced.
 */
export default function AvatarUpload({
  currentUrl,
  name,
  onUpload,
  className = "",
  size = 80,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = preview ?? currentUrl;

  function openPicker() {
    if (uploading) return;
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so re-selecting the same file triggers onChange again.
    e.target.value = "";

    setError(null);

    if (file.size > MAX_BYTES) {
      setError("Image must be under 5 MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are accepted");
      return;
    }

    // Show a local preview instantly — the user sees their choice before
    // the upload completes, which makes the interaction feel fast.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      await onUpload(file);
    } catch (err) {
      // Revert preview on failure.
      setPreview(null);
      URL.revokeObjectURL(localUrl);
      setError(err instanceof Error ? err.message : "Upload failed, please try again");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Clickable avatar circle */}
      <button
        type="button"
        onClick={openPicker}
        disabled={uploading}
        aria-label={uploading ? "Uploading avatar…" : "Change profile photo"}
        aria-busy={uploading}
        style={{ width: size, height: size }}
        className={`relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 shrink-0 ${
          uploading ? "cursor-wait" : "cursor-pointer"
        }`}
      >
        {/* Avatar or initials */}
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={`${name} avatar`}
            width={size}
            height={size}
            className="rounded-full object-cover w-full h-full"
            unoptimized // Cloudinary + blob URLs are already optimised; bypass Next.js proxy
          />
        ) : (
          <span
            className="flex items-center justify-center w-full h-full rounded-full bg-purple-100 text-purple-700 font-bold select-none"
            style={{ fontSize: size * 0.35 }}
            aria-hidden="true"
          >
            {initials(name) || "?"}
          </span>
        )}

        {/* Camera overlay */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-end justify-end rounded-full"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 border-2 border-white shadow-sm mb-0 mr-0">
            {uploading ? (
              <svg
                className="animate-spin text-white"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                className="text-white"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </span>
        </span>
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />

      {/* Inline error */}
      {error && (
        <p role="alert" aria-live="assertive" className="text-xs text-red-600 text-center max-w-[160px]">
          {error}
        </p>
      )}
    </div>
  );
}
