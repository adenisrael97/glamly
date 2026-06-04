"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import AvatarUpload from "@/components/ui/AvatarUpload";
import { stylistMeApi } from "@/lib/api/stylist-me";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileFields {
  bio: string;
  specialty: string;
  location: string;
  tags: string;
  experience: string;
  isAvailable: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-60";

const labelClass = "block text-sm font-medium text-gray-700 mb-1";

// ─── Portfolio grid ────────────────────────────────────────────────────────────

function PortfolioGrid({
  urls,
  onAdd,
  onRemove,
}: {
  urls: string[];
  onAdd: (file: File) => Promise<void>;
  onRemove: (url: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const MAX = 20;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAddError(null);

    if (file.size > 10 * 1024 * 1024) {
      setAddError("Image must be under 10 MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAddError("Only JPEG, PNG, or WebP images are accepted");
      return;
    }

    setAdding(true);
    try {
      await onAdd(file);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Upload failed, please try again");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(url: string) {
    setRemovingUrl(url);
    try {
      await onRemove(url);
    } finally {
      setRemovingUrl(null);
    }
  }

  return (
    <section aria-label="Portfolio images">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Portfolio <span className="text-gray-400 font-normal">({urls.length} / {MAX})</span>
        </h3>
        {urls.length < MAX && (
          <label
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors ${
              adding ? "opacity-60 cursor-wait pointer-events-none" : "cursor-pointer"
            } focus-within:ring-2 focus-within:ring-purple-400 focus-within:ring-offset-1`}
          >
            {adding ? (
              <>
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Uploading…
              </>
            ) : (
              <>
                <svg
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add photo
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-label="Upload portfolio photo"
              onChange={handleFileChange}
              disabled={adding}
            />
          </label>
        )}
      </div>

      {addError && (
        <p role="alert" aria-live="assertive" className="text-xs text-red-600 mb-2">
          {addError}
        </p>
      )}

      {urls.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No portfolio images yet. Add photos to showcase your work.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {urls.map((url) => (
            <div key={url} className="relative group rounded-xl overflow-hidden aspect-4/3 bg-gray-100">
              <Image
                src={url}
                alt="Portfolio image"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
                unoptimized
              />
              {/* Delete overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => void handleRemove(url)}
                  disabled={removingUrl === url}
                  aria-label="Remove portfolio image"
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                >
                  {removingUrl === url ? (
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-40 rounded bg-gray-200" />
        <div className="h-4 w-64 rounded bg-gray-100 mt-2" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 flex items-center gap-5">
        <div className="rounded-full bg-gray-200" style={{ width: 96, height: 96 }} />
        <div className="flex-1">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-48 rounded bg-gray-100 mt-2" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-24 rounded bg-gray-100 mb-2" />
            <div className="h-9 w-full rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudioProfilePage() {
  const { user } = useAuth();

  // The studio edit form needs the full storefront record (bio, specialty,
  // location, tags, experience, isAvailable, avatar, portfolio). AuthUser does
  // NOT carry these storefront-only fields, so the form is seeded from this
  // fetch. Seeding `isAvailable` from the real value is also what stops a save
  // from silently flipping a paused stylist back to "accepting bookings".
  const { data, error, isLoading } = useSWR(
    user ? ["stylist-me-profile"] : null,
    () => stylistMeApi.getProfile(),
  );

  const [portfolioUrls, setPortfolioUrls] = useState<string[] | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Local state for the profile form — seeded once from the fetched profile.
  const [fields, setFields] = useState<ProfileFields | null>(null);

  // Seed local state from the fetched profile on first load. Setting state
  // during render to derive from freshly-loaded data is a supported pattern;
  // the guard runs it exactly once (afterwards `fields` is non-null).
  if (!fields && data) {
    setFields({
      bio: data.bio ?? "",
      specialty: data.specialty ?? "",
      location: data.location ?? "",
      tags: data.tags.join(", "),
      experience: data.experience != null ? String(data.experience) : "",
      isAvailable: data.isAvailable,
    });
    setAvatarUrl(data.avatarUrl);
    setPortfolioUrls(data.portfolioUrls);
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Profile</h1>
        <p role="alert" className="text-sm text-red-600">
          Could not load your profile. Please refresh the page and try again.
        </p>
      </div>
    );
  }

  if (isLoading || !fields) return <ProfileSkeleton />;

  async function handleAvatarUpload(file: File) {
    const result = await stylistMeApi.uploadAvatar(file);
    setAvatarUrl(result.avatarUrl);
  }

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    const tags = fields!.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const exp = parseInt(fields!.experience, 10);

    try {
      await stylistMeApi.updateProfile({
        bio: fields!.bio.trim() || undefined,
        specialty: fields!.specialty.trim() || undefined,
        location: fields!.location.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        experience: Number.isFinite(exp) ? exp : undefined,
        isAvailable: fields!.isAvailable,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Save failed, please try again");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAddPortfolio(file: File) {
    const result = await stylistMeApi.addPortfolioImage(file);
    setPortfolioUrls(result.portfolioUrls);
  }

  async function handleRemovePortfolio(url: string) {
    const result = await stylistMeApi.removePortfolioImage(url);
    setPortfolioUrls(result.portfolioUrls);
  }

  const f = fields!;
  const set = (key: keyof ProfileFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((prev) => ({ ...prev!, [key]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your public storefront — what customers see before booking.
        </p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile photo</h2>
        <div className="flex items-center gap-5">
          <AvatarUpload
            currentUrl={avatarUrl}
            name={user.name}
            onUpload={handleAvatarUpload}
            size={96}
          />
          <div>
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Click the photo to upload a new one. JPEG, PNG, or WebP · Max 5 MB.
            </p>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <form
        onSubmit={(e) => void handleProfileSave(e)}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4"
        noValidate
      >
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Storefront details</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="sp-specialty" className={labelClass}>Specialty</label>
            <input
              id="sp-specialty"
              className={inputClass}
              value={f.specialty}
              onChange={set("specialty")}
              placeholder="e.g. Braiding, Locs, Natural hair"
              maxLength={60}
            />
          </div>

          <div>
            <label htmlFor="sp-location" className={labelClass}>Location</label>
            <input
              id="sp-location"
              className={inputClass}
              value={f.location}
              onChange={set("location")}
              placeholder="e.g. Lagos Island, Lagos"
              maxLength={120}
            />
          </div>

          <div>
            <label htmlFor="sp-bio" className={labelClass}>Bio</label>
            <textarea
              id="sp-bio"
              className={`${inputClass} resize-none`}
              rows={4}
              value={f.bio}
              onChange={set("bio")}
              placeholder="Tell customers about your style, experience, and what makes you stand out."
              maxLength={1000}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{f.bio.length}/1000</p>
          </div>

          <div>
            <label htmlFor="sp-tags" className={labelClass}>
              Tags <span className="text-gray-400 font-normal">(comma-separated, max 10)</span>
            </label>
            <input
              id="sp-tags"
              className={inputClass}
              value={f.tags}
              onChange={set("tags")}
              placeholder="e.g. knotless braids, loc maintenance, protective styles"
            />
          </div>

          <div>
            <label htmlFor="sp-experience" className={labelClass}>Years of experience</label>
            <input
              id="sp-experience"
              type="number"
              min={0}
              max={50}
              className={inputClass}
              value={f.experience}
              onChange={set("experience")}
              placeholder="e.g. 5"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={f.isAvailable}
              onClick={() => setFields((prev) => ({ ...prev!, isAvailable: !prev!.isAvailable }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
                f.isAvailable ? "bg-purple-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                  f.isAvailable ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <label
              className="text-sm font-medium text-gray-700 cursor-pointer select-none"
              onClick={() => setFields((prev) => ({ ...prev!, isAvailable: !prev!.isAvailable }))}
            >
              {f.isAvailable ? "Accepting bookings" : "Not accepting bookings"}
            </label>
          </div>
        </div>

        {profileError && (
          <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600">
            {profileError}
          </p>
        )}
        {profileSuccess && (
          <p role="status" aria-live="polite" className="mt-4 text-sm text-green-600 font-medium">
            Profile saved successfully.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={profileSaving}
            aria-busy={profileSaving}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 transition-colors"
          >
            {profileSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* Portfolio */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <PortfolioGrid
          urls={portfolioUrls ?? []}
          onAdd={handleAddPortfolio}
          onRemove={handleRemovePortfolio}
        />
      </div>
    </div>
  );
}
