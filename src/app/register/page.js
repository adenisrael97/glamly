"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const EyeIcon = ({ open }) =>
  open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

const CheckIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

function validate(fields, role) {
  const errors = {};
  if (!fields.name.trim()) errors.name = "Full name is required";
  else if (fields.name.trim().length < 2) errors.name = "Name is too short";
  if (!fields.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = "Enter a valid email";
  if (!fields.password) errors.password = "Password is required";
  else if (fields.password.length < 8) errors.password = "Must be at least 8 characters";
  if (!fields.confirm) errors.confirm = "Please confirm your password";
  else if (fields.confirm !== fields.password) errors.confirm = "Passwords do not match";
  if (role === "stylist" && !fields.phone.trim()) errors.phone = "Phone number is required";
  return errors;
}

const SuccessScreen = ({ role, name }) => (
  <div className="flex flex-col items-center text-center py-10">
    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-5 shadow-lg">
      <CheckIcon />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Account created!</h2>
    <p className="text-gray-500 text-sm mb-6 max-w-xs">
      Welcome to GlamHub, <strong>{name.split(" ")[0]}</strong>!{" "}
      {role === "stylist"
        ? "Your stylist profile is being reviewed. You'll receive an email within 24 hours."
        : "You're all set to discover and book amazing beauty services."}
    </p>
    <Link
      href={role === "stylist" ? "/stylist" : "/"}
      className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-md text-sm"
    >
      {role === "stylist" ? "View Stylist Portal" : "Explore Services"}
    </Link>
    <Link href="/Login" className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors">
      Sign in instead →
    </Link>
  </div>
);

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState("user");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [fields, setFields] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
  });

  const set = (key) => (e) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(fields, role);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setLoading(false);
    if (role === "stylist") {
      router.push("/stylist-register?from=register&name=" + encodeURIComponent(fields.name) + "&email=" + encodeURIComponent(fields.email));
      return;
    }
    setSuccess(true);
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-lg border text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
      errors[field]
        ? "border-red-400 bg-red-50"
        : "border-gray-300 hover:border-purple-300"
    }`;

  const passwordStrength = (pw) => {
    if (!pw) return null;
    if (pw.length < 6) return { level: 1, label: "Weak", color: "bg-red-400" };
    if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
      return { level: 2, label: "Fair", color: "bg-yellow-400" };
    return { level: 3, label: "Strong", color: "bg-green-500" };
  };
  const strength = passwordStrength(fields.password);

  return (
    <main className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col items-center justify-center p-12 overflow-hidden">
        <Image src="/images/background/background1.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/95 via-purple-800/90 to-black/80" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-400 via-yellow-300 to-purple-400 shadow-xl mb-6">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#rg1)" />
              <path d="M16 8c2.5 0 4.5 2 4.5 4.5S18.5 17 16 17s-4.5-2-4.5-4.5S13.5 8 16 8z" fill="#fff" />
              <ellipse cx="16" cy="22" rx="7" ry="3" fill="#fff" opacity="0.7" />
              <defs>
                <linearGradient id="rg1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F472B6" />
                  <stop offset="0.5" stopColor="#FDE68A" />
                  <stop offset="1" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-2">GlamHub</span>
          <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">
            Join 10,000+<br />beauty lovers
          </h2>
          <p className="text-purple-200 text-sm leading-relaxed mb-8">
            Create your free account and get access to the best beauty professionals in your city.
          </p>
          <div className="grid grid-cols-2 gap-4 w-full">
            {[
              { stat: "500+", label: "Stylists" },
              { stat: "10k+", label: "Bookings" },
              { stat: "4.9★", label: "Rating" },
              { stat: "Free", label: "Sign up" },
            ].map(({ stat, label }) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-yellow-400 font-bold text-lg">{stat}</div>
                <div className="text-white/70 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-14 bg-white overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-400 via-yellow-300 to-purple-400 shadow">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="url(#rm1)" />
                <path d="M16 8c2.5 0 4.5 2 4.5 4.5S18.5 17 16 17s-4.5-2-4.5-4.5S13.5 8 16 8z" fill="#fff" />
                <ellipse cx="16" cy="22" rx="7" ry="3" fill="#fff" opacity="0.7" />
                <defs>
                  <linearGradient id="rm1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F472B6" />
                    <stop offset="0.5" stopColor="#FDE68A" />
                    <stop offset="1" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">GlamHub</span>
          </Link>

          {success ? (
            <SuccessScreen role={role} name={fields.name} />
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
              <p className="text-gray-500 text-sm mb-6">
                Already have one?{" "}
                <Link href="/Login" className="text-purple-600 font-semibold hover:text-purple-800 transition-colors">
                  Sign in
                </Link>
              </p>

              {/* Role toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
                {[
                  { key: "user", label: "Customer" },
                  { key: "stylist", label: "Stylist" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      role === key
                        ? "bg-white text-purple-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {role === "stylist" && (
                <div className="mb-5 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                  <strong>Stylist registration:</strong> After this step you&apos;ll complete your stylist profile with services, location, and bio.
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {/* Full name */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fields.name}
                    onChange={set("name")}
                    placeholder="Ada Okafor"
                    autoComplete="name"
                    className={inputClass("name")}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={fields.email}
                    onChange={set("email")}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={inputClass("email")}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Phone (stylist only) */}
                {role === "stylist" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Phone number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={fields.phone}
                      onChange={set("phone")}
                      placeholder="+234 800 000 0000"
                      autoComplete="tel"
                      className={inputClass("phone")}
                    />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                  </div>
                )}

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={fields.password}
                      onChange={set("password")}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      className={`${inputClass("password")} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                  {fields.password && strength && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3].map((l) => (
                          <div
                            key={l}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              l <= strength.level ? strength.color : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-medium ${
                        strength.level === 1 ? "text-red-500" :
                        strength.level === 2 ? "text-yellow-600" : "text-green-600"
                      }`}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    Confirm password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={fields.confirm}
                      onChange={set("confirm")}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      className={`${inputClass("confirm")} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                  {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
                </div>

                {/* Terms */}
                <p className="text-xs text-gray-400 mt-1">
                  By creating an account, you agree to GlamHub&apos;s{" "}
                  <Link href="#" className="text-purple-600 hover:underline">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="#" className="text-purple-600 hover:underline">Privacy Policy</Link>.
                </p>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-1 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg"
                >
                  {loading && <SpinnerIcon />}
                  {loading
                    ? "Creating account…"
                    : role === "stylist"
                    ? "Continue as Stylist →"
                    : "Create free account"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
