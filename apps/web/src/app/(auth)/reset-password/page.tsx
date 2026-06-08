"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api/auth";

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

type TokenState = "validating" | "valid" | "invalid" | "expired";

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = ["", "Weak", "Fair", "Good", "Strong"][score];
  const color = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"][score];

  if (!password) return null;

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Strength: <span className="font-medium">{label || "—"}</span>
        {score < 4 && (
          <span className="text-gray-400">
            {" "}· needs {!checks[0] ? "8+ chars" : !checks[1] ? "lowercase" : !checks[2] ? "uppercase" : "a number"}
          </span>
        )}
      </p>
    </div>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  // Constant initial state — must NOT depend on `token`. `token` comes from
  // useSearchParams(), which is empty during the server prerender and populated on
  // the client, so seeding state from it would diverge server vs client and trip a
  // hydration mismatch. The effect below resolves the real state after hydration.
  const [tokenState, setTokenState] = useState<TokenState>("validating");
  const [maskedEmail, setMaskedEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  // Validate the token with the API on mount / when it changes (an empty token
  // returns valid:false, so the missing-token case is handled here too). State is
  // set from the promise callbacks (async), never synchronously in the effect body,
  // and the `active` guard drops a late response after unmount or a token change.
  useEffect(() => {
    let active = true;
    authApi
      .validateResetToken(token)
      .then((res) => {
        if (!active) return;
        if (res.valid) {
          setMaskedEmail(res.maskedEmail ?? "");
          setTokenState("valid");
        } else {
          setTokenState("invalid");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const code = (err as { code?: string })?.code;
        setTokenState(code === "AUTH_RESET_TOKEN_EXPIRED" ? "expired" : "invalid");
      });
    return () => {
      active = false;
    };
  }, [token]);

  const validate = () => {
    const errs: typeof errors = {};
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    else if (!/[a-z]/.test(password)) errs.password = "Password must contain a lowercase letter";
    else if (!/[A-Z]/.test(password)) errs.password = "Password must contain an uppercase letter";
    else if (!/[0-9]/.test(password)) errs.password = "Password must contain a number";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setServerError("");
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, password, confirmPassword });
      setSuccess(true);
      setTimeout(() => router.push("/Login"), 3000);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "AUTH_RESET_TOKEN_EXPIRED") {
        setTokenState("expired");
      } else if (code === "AUTH_RESET_TOKEN_INVALID") {
        setTokenState("invalid");
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (tokenState === "validating") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="text-center">
          <SpinnerIcon />
          <p className="mt-3 text-sm text-gray-500">Verifying your reset link…</p>
        </div>
      </main>
    );
  }

  // ── Invalid / expired ─────────────────────────────────────────────────────
  if (tokenState === "invalid" || tokenState === "expired") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {tokenState === "expired" ? "Link expired" : "Invalid reset link"}
          </h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            {tokenState === "expired"
              ? "This password reset link has expired (links are valid for 1 hour). Please request a new one."
              : "This reset link is invalid or has already been used. Please request a new one."}
          </p>
          <Link
            href="/forgot-password"
            className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
          >
            Request a new link
          </Link>
          <p className="mt-4">
            <Link href="/Login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </main>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated!</h1>
          <p className="text-gray-500 text-sm mb-1 leading-relaxed">
            Your password has been reset successfully.
          </p>
          <p className="text-gray-400 text-xs mb-6">Redirecting you to sign in…</p>
          <Link
            href="/Login"
            className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
          >
            Sign in now
          </Link>
        </div>
      </main>
    );
  }

  // ── Reset form ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-linear-to-br from-pink-400 via-yellow-300 to-purple-400 shadow">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="16" fill="url(#rp-lg)" />
              <path d="M16 8c2.5 0 4.5 2 4.5 4.5S18.5 17 16 17s-4.5-2-4.5-4.5S13.5 8 16 8z" fill="#fff" />
              <ellipse cx="16" cy="22" rx="7" ry="3" fill="#fff" opacity="0.7" />
              <defs>
                <linearGradient id="rp-lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F472B6" />
                  <stop offset="0.5" stopColor="#FDE68A" />
                  <stop offset="1" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">Glamly</span>
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a new password</h1>
        {maskedEmail && (
          <p className="text-gray-500 text-sm mb-7">
            Resetting password for <strong>{maskedEmail}</strong>
          </p>
        )}
        {!maskedEmail && <p className="text-gray-500 text-sm mb-7">Choose a strong new password.</p>}

        {serverError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2"
          >
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-label="Reset password form" className="flex flex-col gap-4">
          {/* New password */}
          <div className="flex flex-col gap-1">
            <label htmlFor="rp-password" className="text-sm font-medium text-gray-700">
              New password <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id="rp-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "rp-password-error" : undefined}
                className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                  errors.password ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-purple-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <PasswordStrengthBar password={password} />
            {errors.password && (
              <p id="rp-password-error" className="text-xs text-red-500" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label htmlFor="rp-confirm" className="text-sm font-medium text-gray-700">
              Confirm new password <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id="rp-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined }));
                }}
                placeholder="Repeat your new password"
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "rp-confirm-error" : undefined}
                className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                  errors.confirmPassword ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-purple-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="rp-confirm-error" className="text-xs text-red-500" role="alert">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="w-full mt-1 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
          >
            {submitting && <SpinnerIcon />}
            {submitting ? "Updating password…" : "Set new password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/Login" className="text-purple-600 font-semibold hover:text-purple-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

// useSearchParams must be inside a Suspense boundary (Next.js 15 requirement).
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <svg className="animate-spin h-6 w-6 mx-auto text-purple-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
