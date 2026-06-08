"use client";

import { useState, Suspense, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const SERVICE_OPTIONS = [
  "Hair Styling",
  "Braiding",
  "Barber",
  "Makeup",
  "Nails",
  "Lashes",
  "Home Service",
  "Bridal",
  "Natural Hair",
];

const LOCATION_OPTIONS = [
  "Lekki",
  "Victoria Island",
  "Ikeja",
  "Yaba",
  "Surulere",
  "Ajah",
  "Ikoyi",
  "Festac",
  "Maryland",
  "Other",
];

const STEP_LABELS = ["Personal Info", "Services", "Portfolio", "Review"];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                {done ? <CheckIcon /> : step}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  active ? "text-purple-700" : done ? "text-green-600" : "text-gray-400"
                }`}
              >
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`w-12 sm:w-16 h-0.5 mx-1 mb-4 transition-all duration-300 ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SuccessScreen({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-linear-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-xl">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center shadow">
          <span className="text-xs">⭐</span>
        </div>
      </div>
      <span className="text-yellow-700 text-xs font-bold tracking-widest uppercase mb-2">Account Created</span>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to the team, {name.split(" ")[0]}!</h2>
      <p className="text-gray-500 text-sm mb-8 max-w-sm">
        Your stylist account is live. Head to your studio to manage bookings and your storefront.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link
          href="/studio"
          className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm text-center shadow-md"
        >
          Go to your studio
        </Link>
        <Link
          href="/"
          className="flex-1 px-6 py-3 border border-gray-300 hover:border-purple-400 text-gray-700 font-semibold rounded-lg transition-all duration-200 text-sm text-center"
        >
          Homepage
        </Link>
      </div>
    </div>
  );
}

type FieldKey =
  | "name"
  | "email"
  | "password"
  | "phone"
  | "location"
  | "specialty"
  | "priceFrom"
  | "experience"
  | "bio"
  | "instagram"
  | "portfolio";

function StylistRegisterForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { register, error: authError, clearError } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [fields, setFields] = useState({
    name: params.get("name") ?? "",
    email: params.get("email") ?? "",
    password: "",
    phone: "",
    location: "",
    priceFrom: "",
    experience: "",
    bio: "",
    services: [] as string[],
    instagram: "",
    portfolio: "",
  });

  const set =
    (key: FieldKey) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: "" }));
      clearError();
    };

  const toggleService = (svc: string) => {
    setFields((prev) => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter((s) => s !== svc)
        : [...prev.services, svc],
    }));
    setErrors((prev) => ({ ...prev, services: "" }));
  };

  const validateStep = (s: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!fields.name.trim()) errs.name = "Full name is required";
      if (!fields.email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errs.email = "Enter a valid email";
      if (!fields.password) errs.password = "Password is required";
      else if (
        fields.password.length < 8 ||
        !/[a-z]/.test(fields.password) ||
        !/[A-Z]/.test(fields.password) ||
        !/[0-9]/.test(fields.password)
      )
        errs.password = "Min 8 chars with upper, lower & a number";
      if (!fields.phone.trim()) errs.phone = "Phone number is required";
      if (!fields.location) errs.location = "Please select a location";
    }
    if (s === 2) {
      if (fields.services.length === 0) errs.services = "Select at least one service";
      if (!fields.experience) errs.experience = "Years of experience is required";
      if (!fields.priceFrom || Number(fields.priceFrom) <= 0)
        errs.priceFrom = "Enter your starting price";
    }
    if (s === 3) {
      if (!fields.bio.trim() || fields.bio.length < 30) errs.bio = "Bio must be at least 30 characters";
    }
    return errs;
  };

  const next = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Re-validate every step before the real submission.
    for (const s of [1, 2, 3]) {
      const errs = validateStep(s);
      if (Object.keys(errs).length) {
        setErrors(errs);
        setStep(s);
        return;
      }
    }
    setErrors({});
    setLoading(true);
    try {
      // The register endpoint persists the storefront essentials; the primary
      // selected service becomes the specialty. Bio / experience / portfolio are
      // collected for UX but have no profile-update endpoint yet (read-only gap).
      await register({
        role: "stylist",
        name: fields.name,
        email: fields.email,
        password: fields.password,
        phone: fields.phone,
        specialty: fields.services[0] ?? "Beauty",
        location: fields.location,
        priceFrom: Number(fields.priceFrom),
      });
      setSuccess(true);
      // replace so the registration form is not in browser history — the back
      // button from /studio should go to wherever the user came from, not loop
      // back through the multi-step registration flow.
      router.replace("/studio");
    } catch {
      // error surfaced via context; jump back to the review step to show it
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-lg border text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-purple-300"
    }`;

  if (success) return <SuccessScreen name={fields.name} />;

  return (
    <div className="w-full max-w-lg">
      <div className="mb-2">
        <span className="text-yellow-700 text-xs font-bold tracking-widest uppercase">Stylist Onboarding</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Join as a Glamly Stylist</h1>
        <p className="text-gray-500 text-sm mt-1">
          Already registered?{" "}
          <Link href="/Login" className="text-purple-600 font-semibold hover:text-purple-800">Sign in</Link>
        </p>
      </div>

      <StepIndicator current={step} total={4} />

      <form onSubmit={handleSubmit} noValidate>
        {/* ── STEP 1: Personal Info ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Personal Information</h2>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Full name <span className="text-red-500">*</span></label>
              <input value={fields.name} onChange={set("name")} placeholder="Ada Okafor" className={inputClass("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Email address <span className="text-red-500">*</span></label>
              <input type="email" value={fields.email} onChange={set("email")} placeholder="you@example.com" className={inputClass("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={fields.password}
                onChange={set("password")}
                placeholder="Min 8 chars, mixed case + a number"
                autoComplete="new-password"
                className={inputClass("password")}
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Phone number <span className="text-red-500">*</span></label>
              <input type="tel" value={fields.phone} onChange={set("phone")} placeholder="+234 800 000 0000" className={inputClass("phone")} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Operating location <span className="text-red-500">*</span></label>
              <select value={fields.location} onChange={set("location")} className={inputClass("location")}>
                <option value="">Select a location</option>
                {LOCATION_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
            </div>
          </div>
        )}

        {/* ── STEP 2: Services ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Services & Experience</h2>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Services offered <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-400">Your first selection becomes your headline specialty.</p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((svc) => {
                  const selected = fields.services.includes(svc);
                  return (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => toggleService(svc)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                        selected
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:text-purple-700"
                      }`}
                    >
                      {selected && <span className="mr-1.5">✓</span>}
                      {svc}
                    </button>
                  );
                })}
              </div>
              {errors.services && <p className="text-xs text-red-500">{errors.services}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Starting price (₦) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={0}
                value={fields.priceFrom}
                onChange={set("priceFrom")}
                placeholder="e.g. 8000"
                className={inputClass("priceFrom")}
              />
              {errors.priceFrom && <p className="text-xs text-red-500">{errors.priceFrom}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Years of experience <span className="text-red-500">*</span></label>
              <select value={fields.experience} onChange={set("experience")} className={inputClass("experience")}>
                <option value="">Select experience level</option>
                <option value="0-1">Less than 1 year</option>
                <option value="1-3">1–3 years</option>
                <option value="3-5">3–5 years</option>
                <option value="5-10">5–10 years</option>
                <option value="10+">10+ years</option>
              </select>
              {errors.experience && <p className="text-xs text-red-500">{errors.experience}</p>}
            </div>
          </div>
        )}

        {/* ── STEP 3: Portfolio & Bio ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Portfolio & Bio</h2>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Bio <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-400">Tell clients about yourself, your style, and what makes you special.</p>
              <textarea
                value={fields.bio}
                onChange={set("bio")}
                rows={5}
                placeholder="I'm a passionate hairstylist with 5 years experience specializing in bridal looks and natural hair…"
                className={`${inputClass("bio")} resize-none`}
              />
              <div className="flex justify-between">
                {errors.bio ? <p className="text-xs text-red-500">{errors.bio}</p> : <span />}
                <span className={`text-xs ${fields.bio.length < 30 ? "text-red-400" : "text-gray-400"}`}>
                  {fields.bio.length}/30 min
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Instagram handle (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input type="text" value={fields.instagram} onChange={set("instagram")} placeholder="yourusername" className={`${inputClass("instagram")} pl-8`} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Portfolio link (optional)</label>
              <input type="url" value={fields.portfolio} onChange={set("portfolio")} placeholder="https://yourportfolio.com" className={inputClass("portfolio")} />
            </div>
          </div>
        )}

        {/* ── STEP 4: Review ── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Review your details</h2>
            {authError && (
              <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {authError}
              </div>
            )}
            <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
              {[
                { label: "Name", value: fields.name },
                { label: "Email", value: fields.email },
                { label: "Phone", value: fields.phone },
                { label: "Location", value: fields.location },
                { label: "Starting price", value: fields.priceFrom ? `₦${Number(fields.priceFrom).toLocaleString()}` : "—" },
                { label: "Experience", value: fields.experience ? `${fields.experience} years` : "—" },
                { label: "Services", value: fields.services.join(", ") || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between px-4 py-3">
                  <span className="text-sm text-gray-500 shrink-0 w-24">{label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
                </div>
              ))}
              {fields.bio && (
                <div className="px-4 py-3">
                  <span className="text-sm text-gray-500 block mb-1">Bio</span>
                  <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">{fields.bio}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 text-center">
              By submitting, you agree to our{" "}
              <Link href="#" className="text-purple-600 hover:underline">Stylist Terms</Link>.
            </p>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex items-center gap-3 mt-8">
          {step > 1 && (
            <button type="button" onClick={back} className="flex-1 py-3 border border-gray-300 hover:border-purple-400 text-gray-700 font-semibold rounded-lg transition-all duration-200 text-sm">
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={next} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm shadow-md">
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {loading && <SpinnerIcon />}
              {loading ? "Creating account…" : "Create stylist account ✨"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function StylistRegisterPage() {
  return (
    <main className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col items-center justify-center p-12 overflow-hidden">
        <Image src="/images/background/background1.jpg" alt="" fill sizes="(max-width: 1024px) 0px, 42vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/95 via-purple-800/90 to-black/80" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-linear-to-br from-pink-400 via-yellow-300 to-purple-400 shadow-xl mb-6">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#srg)" />
              <path d="M16 8c2.5 0 4.5 2 4.5 4.5S18.5 17 16 17s-4.5-2-4.5-4.5S13.5 8 16 8z" fill="#fff" />
              <ellipse cx="16" cy="22" rx="7" ry="3" fill="#fff" opacity="0.7" />
              <defs>
                <linearGradient id="srg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F472B6" />
                  <stop offset="0.5" stopColor="#FDE68A" />
                  <stop offset="1" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-2">For Stylists</span>
          <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">
            Grow your<br />beauty business
          </h2>
          <p className="text-purple-200 text-sm leading-relaxed mb-8">
            Join 500+ professional stylists on Glamly. Set your own hours, grow your clientele, and earn more.
          </p>
          <div className="flex flex-col gap-4 w-full">
            {[
              { icon: "💰", title: "Earn more", desc: "Keep 85% of every booking" },
              { icon: "📅", title: "Flexible schedule", desc: "Work when you want" },
              { icon: "📣", title: "Get discovered", desc: "Reach thousands of clients" },
              { icon: "🛡️", title: "Secure payments", desc: "Get paid instantly" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl shrink-0">{icon}</div>
                <div>
                  <div className="text-white font-semibold text-sm">{title}</div>
                  <div className="text-purple-300 text-xs">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-14 bg-white overflow-y-auto">
        <Suspense fallback={<div className="animate-pulse text-purple-600">Loading…</div>}>
          <StylistRegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
