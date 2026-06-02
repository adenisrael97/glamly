"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { validateLogin } from "@glamly/shared";
import { useAuth } from "@/context/AuthContext";

const GlamLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="url(#lg1)" />
    <path d="M16 8c2.5 0 4.5 2 4.5 4.5S18.5 17 16 17s-4.5-2-4.5-4.5S13.5 8 16 8z" fill="#fff" />
    <ellipse cx="16" cy="22" rx="7" ry="3" fill="#fff" opacity="0.7" />
    <defs>
      <linearGradient id="lg1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F472B6" />
        <stop offset="0.5" stopColor="#FDE68A" />
        <stop offset="1" stopColor="#A78BFA" />
      </linearGradient>
    </defs>
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

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const features = [
  "Book top stylists instantly",
  "Track your appointments",
  "Exclusive member offers",
  "Rate and review services",
];

export default function LoginPage() {
  const router = useRouter();
  const { login, error: authError, clearError } = useAuth();

  // Kept as UX affordance only (reveals the "join as stylist" link). The real
  // login does not take a role — the account's role is whatever it registered as.
  const [role, setRole] = useState<"user" | "stylist">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const clearFieldError = (field: string) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validateLogin({ email, password });
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.push(next ?? (user.role === "stylist" ? "/studio" : "/"));
    } catch {
      // error already surfaced via context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col items-center justify-center p-12 overflow-hidden" aria-hidden="true">
        <Image src="/images/background/background1.jpg" alt="" fill sizes="(max-width: 1024px) 0px, 42vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/95 via-purple-800/90 to-black/80" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-linear-to-br from-pink-400 via-yellow-300 to-purple-400 shadow-xl mb-6">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#bp1)" />
              <path d="M16 8c2.5 0 4.5 2 4.5 4.5S18.5 17 16 17s-4.5-2-4.5-4.5S13.5 8 16 8z" fill="#fff" />
              <ellipse cx="16" cy="22" rx="7" ry="3" fill="#fff" opacity="0.7" />
              <defs>
                <linearGradient id="bp1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F472B6" />
                  <stop offset="0.5" stopColor="#FDE68A" />
                  <stop offset="1" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-2">Glamly</span>
          <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">
            Your beauty,<br />on demand.
          </h2>
          <p className="text-purple-200 text-sm leading-relaxed mb-10">
            Access your account to manage appointments, discover top stylists, and unlock exclusive offers.
          </p>
          <ul className="flex flex-col gap-3 text-left w-full">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-white/85 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-14 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-linear-to-br from-pink-400 via-yellow-300 to-purple-400 shadow">
              <GlamLogo />
            </div>
            <span className="text-lg font-bold text-gray-900">Glamly</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-7">Sign in to your account.</p>

          {/* Role toggle (UX affordance) */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1" role="group" aria-label="Account type">
            {[
              { key: "user", label: "Customer" },
              { key: "stylist", label: "Stylist" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRole(key as "user" | "stylist")}
                aria-pressed={role === key}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  role === key ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Global auth error */}
          {authError && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2"
            >
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-label="Sign in form" className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                Email address <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                className={`w-full px-4 py-3 rounded-lg border text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                  errors.email ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-purple-300"
                }`}
              />
              {errors.email && (
                <p id="login-email-error" className="text-xs text-red-500" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                  Password <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <Link
                  href="#"
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "login-password-error" : undefined}
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
              {errors.password && (
                <p id="login-password-error" className="text-xs text-red-500" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="w-full mt-1 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
            >
              {submitting && <SpinnerIcon />}
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-500">
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-purple-600 font-semibold hover:text-purple-800 transition-colors">
                Create one free
              </Link>
            </p>
            {role === "stylist" && (
              <p>
                New stylist?{" "}
                <Link href="/stylist-register" className="text-yellow-600 font-semibold hover:text-yellow-800 transition-colors">
                  Join as a stylist →
                </Link>
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-3" aria-hidden="true">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Social buttons (decorative placeholders) */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {["Google", "Facebook"].map((provider) => (
              <button
                key={provider}
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                {provider === "Google" ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                {provider}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
