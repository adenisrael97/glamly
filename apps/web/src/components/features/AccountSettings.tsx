"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/context/AuthContext";
import AvatarUpload from "@/components/ui/AvatarUpload";

// Self-service account settings shared by the customer and admin areas (the
// backend endpoints — PATCH /auth/me, POST /auth/me/password, POST /auth/me/avatar
// — are role-agnostic). Two independent cards: profile (name/phone/address +
// avatar) and password. Each manages its own submit/success/error state so one
// failing never blocks the other.

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-60";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const cardClass = "bg-white rounded-2xl border border-gray-100 shadow-sm p-6";
const primaryBtn =
  "px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 transition-colors";

// ─── Profile card ───────────────────────────────────────────────────────────────

interface ProfileFields {
  name: string;
  phone: string;
  address: string;
}

function ProfileCard() {
  const { user, updateProfile, uploadAvatar } = useAuth();
  // Seed lazily from the user, which may still be resolving on first render (the
  // admin area renders this without a loading gate). Adopting freshly-arrived data
  // by setting state during render is a supported React pattern; the `=== null`
  // guard runs it exactly once.
  const [fields, setFields] = useState<ProfileFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (user && fields === null) {
    setFields({ name: user.name ?? "", phone: user.phone ?? "", address: user.address ?? "" });
  }

  if (!user || !fields) return null;

  const set = (key: keyof ProfileFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((f) => (f ? { ...f, [key]: e.target.value } : f));
    setSuccess(false);
    setError(null);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!fields) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // Only send fields that have a value — the schema rejects empty strings for
      // phone/address, so omitting them is how "leave unchanged / unset" is expressed.
      const name = fields.name.trim();
      const phone = fields.phone.trim();
      const address = fields.address.trim();
      await updateProfile({
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(address ? { address } : {}),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Profile" className={`${cardClass} mb-6`}>
      <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>

      <div className="flex items-center gap-5 mb-6">
        <AvatarUpload
          currentUrl={user.avatarUrl}
          name={user.name}
          onUpload={async (file) => {
            await uploadAvatar(file);
          }}
          size={88}
        />
        <div>
          <p className="text-sm font-medium text-gray-800">{user.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Click the photo to change it. JPEG, PNG, or WebP · Max 5 MB.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="set-name" className={labelClass}>Full name</label>
          <input id="set-name" className={inputClass} value={fields.name} onChange={set("name")} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="set-email" className={labelClass}>Email</label>
          {/* Email is the login identity and is not self-editable here. */}
          <input id="set-email" className={inputClass} value={user.email} disabled readOnly autoComplete="email" />
        </div>
        <div>
          <label htmlFor="set-phone" className={labelClass}>Phone number</label>
          <input
            id="set-phone"
            type="tel"
            className={inputClass}
            value={fields.phone}
            onChange={set("phone")}
            placeholder="+234 800 000 0000"
            autoComplete="tel"
          />
        </div>
        <div>
          <label htmlFor="set-address" className={labelClass}>Address</label>
          <input
            id="set-address"
            className={inputClass}
            value={fields.address}
            onChange={set("address")}
            placeholder="Street, area, city"
            autoComplete="street-address"
          />
        </div>

        {error && <p role="alert" aria-live="assertive" className="text-sm text-red-600">{error}</p>}
        {success && (
          <p role="status" aria-live="polite" className="text-sm text-green-600 font-medium">
            Profile saved.
          </p>
        )}

        <div>
          <button type="submit" disabled={saving} aria-busy={saving} className={primaryBtn}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ─── Password card ──────────────────────────────────────────────────────────────

const emptyPw = { current: "", next: "", confirm: "" };

function PasswordCard() {
  const [pw, setPw] = useState(emptyPw);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof pw) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPw((p) => ({ ...p, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setServerError(null);
    setSuccess(false);
  };

  // Mirrors the shared changePasswordSchema so the user gets instant feedback; the
  // server is still the authority (it re-validates and verifies the current password).
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!pw.current) e.current = "Your current password is required";
    if (!pw.next) e.next = "Enter a new password";
    else if (pw.next.length < 8) e.next = "Must be at least 8 characters";
    else if (!/[a-z]/.test(pw.next)) e.next = "Must contain a lowercase letter";
    else if (!/[A-Z]/.test(pw.next)) e.next = "Must contain an uppercase letter";
    else if (!/[0-9]/.test(pw.next)) e.next = "Must contain a number";
    else if (pw.next === pw.current) e.next = "New password must differ from your current one";
    if (!pw.confirm) e.confirm = "Confirm your new password";
    else if (pw.confirm !== pw.next) e.confirm = "Passwords do not match";
    return e;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setServerError(null);
    setSuccess(false);
    try {
      await authApi.changePassword({
        currentPassword: pw.current,
        newPassword: pw.next,
        confirmPassword: pw.confirm,
      });
      setPw(emptyPw);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      if (err instanceof ApiError && err.code === "AUTH_INCORRECT_PASSWORD") {
        setErrors((prev) => ({ ...prev, current: "Your current password is incorrect" }));
      } else {
        setServerError(err instanceof Error ? err.message : "Couldn't change your password. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const field = (
    id: string,
    key: keyof typeof pw,
    label: string,
    autoComplete: string,
  ) => (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        type={show ? "text" : "password"}
        className={`${inputClass} ${errors[key] ? "border-red-400 bg-red-50" : ""}`}
        value={pw[key]}
        onChange={set(key)}
        autoComplete={autoComplete}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${id}-error` : undefined}
      />
      {errors[key] && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-500 mt-1">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <section aria-label="Password" className={cardClass}>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Password</h2>
      <p className="text-sm text-gray-500 mb-4">
        Changing your password signs out your other devices.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {field("pw-current", "current", "Current password", "current-password")}
        {field("pw-next", "next", "New password", "new-password")}
        {field("pw-confirm", "confirm", "Confirm new password", "new-password")}

        <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="rounded border-gray-300" />
          Show passwords
        </label>

        {serverError && <p role="alert" aria-live="assertive" className="text-sm text-red-600">{serverError}</p>}
        {success && (
          <p role="status" aria-live="polite" className="text-sm text-green-600 font-medium">
            Password changed successfully.
          </p>
        )}

        <div>
          <button type="submit" disabled={saving} aria-busy={saving} className={primaryBtn}>
            {saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ─── Public component ───────────────────────────────────────────────────────────

export default function AccountSettings() {
  return (
    <div className="max-w-2xl mx-auto w-full">
      <ProfileCard />
      <PasswordCard />
    </div>
  );
}
