"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import servicesData from "@/data/services.json";
import stylistsData from "@/data/stylist/stylist.json";

// ── Icons ───────────────────────────────────────────────
const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckCircle = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ── Constants ────────────────────────────────────────────
const STEPS = ["Service", "Stylist", "Date & Time", "Your Details", "Confirm"];

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM",
];

// ── Step indicator ───────────────────────────────────────
function StepBar({ current, total }) {
  return (
    <div className="flex items-center mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-1 shrink-0`}>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                  done ? "bg-green-500 border-green-500 text-white"
                    : active ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : step}
              </div>
              <span className={`text-xs font-medium hidden md:block whitespace-nowrap ${
                active ? "text-purple-700" : done ? "text-green-600" : "text-gray-400"
              }`}>
                {STEPS[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all duration-300 ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Confirmation screen ─────────────────────────────────
function ConfirmationScreen({ booking }) {
  const ref = `GLM-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  return (
    <div className="max-w-lg mx-auto flex flex-col items-center text-center py-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-xl mb-5">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <span className="text-yellow-600 text-xs font-bold tracking-widest uppercase mb-2">Booking Confirmed</span>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-sm">
        Your appointment has been booked. A confirmation has been sent to <strong>{booking.email}</strong>.
      </p>

      <div className="w-full bg-gray-50 rounded-2xl border border-gray-200 p-5 text-left mb-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <span className="text-sm text-gray-500">Booking reference</span>
          <span className="font-mono font-bold text-purple-700">{ref}</span>
        </div>
        {[
          { label: "Service", value: booking.service?.name },
          { label: "Stylist", value: booking.stylist?.name },
          { label: "Date", value: booking.date },
          { label: "Time", value: booking.time },
          { label: "Location", value: booking.stylist?.location },
          { label: "Price", value: `₦${(booking.service?.price || 0).toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value || "—"}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Link href="/" className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all text-sm text-center shadow-md">
          Back to Home
        </Link>
        <Link href="/services" className="flex-1 py-3 border border-gray-300 hover:border-purple-400 text-gray-700 font-semibold rounded-lg transition-all text-sm text-center">
          Book Another
        </Link>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────
export default function BookAppointmentPage() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [serviceSearch, setServiceSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [booking, setBooking] = useState({
    service: null,
    stylist: null,
    date: "",
    time: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const set = (key, value) => {
    setBooking((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const categories = useMemo(
    () => ["All", ...new Set(servicesData.map((s) => s.category))],
    []
  );

  const filteredServices = useMemo(() => {
    let list = servicesData;
    if (activeCategory !== "All") list = list.filter((s) => s.category === activeCategory);
    if (serviceSearch) list = list.filter((s) => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
    return list.slice(0, 12);
  }, [activeCategory, serviceSearch]);

  const filteredStylists = useMemo(() => {
    if (!booking.service) return stylistsData;
    return stylistsData.filter((s) =>
      s.services.some((svc) =>
        booking.service.category === "Hair"
          ? svc.includes("Hair") || svc.includes("Braiding") || svc.includes("Barber")
          : booking.service.category === "Makeup"
          ? svc.includes("Makeup")
          : booking.service.category === "Nails"
          ? svc.includes("Nails")
          : true
      )
    );
  }, [booking.service]);

  const today = new Date().toISOString().split("T")[0];

  const validateStep = (s) => {
    const errs = {};
    if (s === 1 && !booking.service) errs.service = "Please select a service";
    if (s === 2 && !booking.stylist) errs.stylist = "Please select a stylist";
    if (s === 3) {
      if (!booking.date) errs.date = "Please pick a date";
      if (!booking.time) errs.time = "Please pick a time slot";
    }
    if (s === 4) {
      if (!booking.name.trim()) errs.name = "Your name is required";
      if (!booking.email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) errs.email = "Enter a valid email";
      if (!booking.phone.trim()) errs.phone = "Phone number is required";
    }
    return errs;
  };

  const next = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep(4);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-lg border text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-purple-300"
    }`;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-purple-700 text-white py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-purple-300 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors">
            ← Back to Home
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Book an Appointment</h1>
          <p className="text-purple-200 text-sm">Complete the steps below to schedule your beauty service.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {done ? (
          <ConfirmationScreen booking={booking} />
        ) : (
          <>
            <StepBar current={step} total={STEPS.length} />

            {/* ── STEP 1: Choose Service ── */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Choose a Service</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Browse and select the service you&apos;d like to book.
                </p>

                <div className="flex gap-2 mb-4 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        activeCategory === cat
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Search services…"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent mb-5"
                />

                {errors.service && (
                  <p className="text-xs text-red-500 mb-3">{errors.service}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredServices.map((svc) => {
                    const selected = booking.service?.id === svc.id;
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => set("service", svc)}
                        className={`relative rounded-xl overflow-hidden text-left transition-all duration-200 group focus:outline-none ${
                          selected
                            ? "ring-2 ring-purple-600 ring-offset-2 shadow-lg"
                            : "hover:shadow-md hover:-translate-y-0.5"
                        }`}
                      >
                        <div className="relative h-32">
                          <Image
                            src={svc.image}
                            alt={svc.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          {selected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
                          <p className="text-white font-semibold text-sm leading-tight">{svc.name}</p>
                          <p className="text-yellow-300 text-xs font-medium">₦{svc.price.toLocaleString()}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 2: Choose Stylist ── */}
            {step === 2 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Choose a Stylist</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Stylists available for <strong>{booking.service?.name}</strong>
                </p>

                {errors.stylist && (
                  <p className="text-xs text-red-500 mb-3">{errors.stylist}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredStylists.slice(0, 8).map((stylist) => {
                    const selected = booking.stylist?.id === stylist.id;
                    return (
                      <button
                        key={stylist.id}
                        type="button"
                        onClick={() => set("stylist", stylist)}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 flex items-center gap-4 focus:outline-none ${
                          selected
                            ? "border-purple-600 bg-purple-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-md">
                          <Image
                            src={stylist.image}
                            alt={stylist.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 text-sm truncate">{stylist.name}</p>
                            {!stylist.available && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full shrink-0">Busy</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{stylist.location} · {stylist.experience}yr exp</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-400 text-xs">★</span>
                            <span className="text-xs font-medium text-gray-700">{stylist.rating}</span>
                            <span className="text-xs text-gray-400">· ₦{stylist.price.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {stylist.services.slice(0, 2).map((s) => (
                              <span key={s} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        </div>
                        {selected && (
                          <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 3: Date & Time ── */}
            {step === 3 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Pick a Date & Time</h2>
                <p className="text-gray-500 text-sm mb-5">Choose when you&apos;d like your appointment.</p>

                <div className="flex flex-col gap-5">
                  {/* Date picker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Appointment date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={booking.date}
                      min={today}
                      onChange={(e) => set("date", e.target.value)}
                      className={inputClass("date")}
                    />
                    {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                  </div>

                  {/* Time slots */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Preferred time <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const booked = ["9:30 AM", "11:00 AM", "1:30 PM", "3:00 PM"].includes(slot);
                        const selected = booking.time === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={booked}
                            onClick={() => set("time", slot)}
                            className={`py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                              booked
                                ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                                : selected
                                ? "border-purple-600 bg-purple-600 text-white shadow-sm"
                                : "border-gray-300 bg-white text-gray-700 hover:border-purple-400 hover:bg-purple-50"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    {errors.time && <p className="text-xs text-red-500">{errors.time}</p>}
                    <p className="text-xs text-gray-400">Strikethrough slots are already booked</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Your Details ── */}
            {step === 4 && (
              <form onSubmit={handleSubmit} noValidate>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Your Details</h2>
                <p className="text-gray-500 text-sm mb-5">Fill in your contact information for the booking.</p>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Full name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={booking.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Ada Okafor"
                      className={inputClass("name")}
                    />
                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Email address <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={booking.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="you@example.com"
                      className={inputClass("email")}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Phone number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={booking.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+234 800 000 0000"
                      className={inputClass("phone")}
                    />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Special requests (optional)</label>
                    <textarea
                      value={booking.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      rows={3}
                      placeholder="Any allergies, preferences, or special requests…"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent hover:border-purple-300 transition-all"
                    />
                  </div>

                  {/* Summary card */}
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-2">
                    <h3 className="text-sm font-semibold text-purple-900 mb-3">Booking Summary</h3>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: "Service", value: booking.service?.name },
                        { label: "Price", value: `₦${(booking.service?.price || 0).toLocaleString()}` },
                        { label: "Stylist", value: booking.stylist?.name },
                        { label: "Date", value: booking.date },
                        { label: "Time", value: booking.time },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-purple-700">{label}</span>
                          <span className="text-xs font-semibold text-purple-900">{value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg"
                >
                  {loading && <SpinnerIcon />}
                  {loading ? "Confirming your booking…" : "Confirm Booking ✨"}
                </button>
              </form>
            )}

            {/* ── Nav buttons (steps 1–3) ── */}
            {step < 4 && (
              <div className="flex items-center gap-3 mt-8">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={back}
                    className="flex-1 py-3 border border-gray-300 hover:border-purple-400 text-gray-700 font-semibold rounded-lg transition-all duration-200 text-sm"
                  >
                    ← Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg"
                >
                  Continue →
                </button>
              </div>
            )}

            {step > 1 && step === 4 && (
              <button
                type="button"
                onClick={back}
                className="w-full mt-3 py-3 border border-gray-300 hover:border-purple-400 text-gray-700 font-semibold rounded-lg transition-all duration-200 text-sm"
              >
                ← Edit Booking
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
