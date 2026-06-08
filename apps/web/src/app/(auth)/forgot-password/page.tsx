"use client";

import { useState } from "react";
import Link from "next/link";
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

const CheckCircleIcon = () => (
  <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const validateEmail = (val: string): string => {
    if (!val.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email address";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError("");
    setServerError("");
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-md text-center">
          <CheckCircleIcon />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            If <strong>{email}</strong> is linked to a Glamly account, you&apos;ll receive
            a password reset link shortly. The link expires in <strong>1 hour</strong>.
          </p>
          <p className="text-gray-400 text-xs mb-8">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => { setSubmitted(false); setEmail(""); }}
              className="text-purple-600 font-medium hover:text-purple-800 transition-colors underline underline-offset-2"
            >
              try again
            </button>
            .
          </p>
          <Link
            href="/Login"
            className="inline-block text-sm text-purple-600 font-semibold hover:text-purple-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
          >
            ← Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-linear-to-br from-pink-400 via-yellow-300 to-purple-400 shadow">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="16" fill="url(#fp-lg)" />
              <path d="M16 8c2.5 0 4.5 2 4.5 4.5S18.5 17 16 17s-4.5-2-4.5-4.5S13.5 8 16 8z" fill="#fff" />
              <ellipse cx="16" cy="22" rx="7" ry="3" fill="#fff" opacity="0.7" />
              <defs>
                <linearGradient id="fp-lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F472B6" />
                  <stop offset="0.5" stopColor="#FDE68A" />
                  <stop offset="1" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">Glamly</span>
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot your password?</h1>
        <p className="text-gray-500 text-sm mb-7 leading-relaxed">
          Enter the email address linked to your account and we&apos;ll send you a
          reset link. It&apos;s valid for <strong>1 hour</strong>.
        </p>

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

        <form onSubmit={handleSubmit} noValidate aria-label="Forgot password form" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="fp-email" className="text-sm font-medium text-gray-700">
              Email address <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              placeholder="you@example.com"
              autoComplete="email"
              aria-required="true"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "fp-email-error" : undefined}
              className={`w-full px-4 py-3 rounded-lg border text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                emailError ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-purple-300"
              }`}
            />
            {emailError && (
              <p id="fp-email-error" className="text-xs text-red-500" role="alert">
                {emailError}
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
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Remember your password?{" "}
          <Link
            href="/Login"
            className="text-purple-600 font-semibold hover:text-purple-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
