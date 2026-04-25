"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const SERVICE_OPTIONS = [
  "Hair Styling", "Makeup", "Nails", "Lashes", "Braiding",
  "Barber", "Bridal Package", "Home Service", "Glam Package",
];

function validate(fields) {
  const errors = {};
  if (!fields.senderName.trim()) errors.senderName = "Your name is required";
  if (!fields.recipientName.trim()) errors.recipientName = "Recipient name is required";
  if (!fields.phone.trim()) errors.phone = "Phone number is required";
  else if (!/^[\d\s\+\-\(\)]{7,15}$/.test(fields.phone)) errors.phone = "Enter a valid phone number";
  if (!fields.service) errors.service = "Please select a service";
  if (!fields.date) errors.date = "Please pick a date";
  return errors;
}

function SuccessScreen({ fields }) {
  const giftCode = `GLAM-${Math.random().toString(36).toUpperCase().slice(2, 8)}`;
  return (
    <div className="flex flex-col items-center text-center py-8 px-4 max-w-md mx-auto">
      {/* Animated gift icon */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-pink-400 to-purple-500 flex items-center justify-center shadow-2xl">
          <span className="text-5xl">🎁</span>
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <span className="text-yellow-600 text-xs font-bold tracking-widest uppercase mb-2">Gift Booked!</span>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Beautiful gift, {fields.senderName.split(" ")[0]}!
      </h2>
      <p className="text-gray-500 text-sm mb-6 max-w-sm">
        Your gift of <strong>{fields.service}</strong> for <strong>{fields.recipientName}</strong> on{" "}
        <strong>{fields.date}</strong> has been confirmed.
      </p>

      {/* Gift voucher card */}
      <div className="w-full bg-gradient-to-br from-purple-900 via-purple-800 to-black rounded-2xl p-6 mb-6 text-left shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase">GlamHub Gift Voucher</span>
            <span className="text-2xl">✨</span>
          </div>
          <h3 className="text-white text-xl font-extrabold mb-1">{fields.service}</h3>
          <p className="text-purple-200 text-xs mb-4">For {fields.recipientName}</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-xs">Gift date</p>
              <p className="text-white font-semibold text-sm">{fields.date}</p>
            </div>
            <div className="text-right">
              <p className="text-purple-300 text-xs">Voucher code</p>
              <p className="text-yellow-400 font-mono font-bold text-base">{giftCode}</p>
            </div>
          </div>
          {fields.message && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-purple-200 text-xs italic">&ldquo;{fields.message}&rdquo;</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-gray-400 text-xs mb-6">
        A confirmation and the gift voucher have been sent to your phone. Share the voucher code with {fields.recipientName}.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Link
          href="/"
          className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all text-sm text-center shadow-md"
        >
          Back to Home
        </Link>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex-1 py-3 border border-gray-300 hover:border-purple-400 text-gray-700 font-semibold rounded-lg transition-all text-sm"
        >
          Send Another Gift
        </button>
      </div>
    </div>
  );
}

export default function GiftServicePage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [fields, setFields] = useState({
    senderName: "",
    recipientName: "",
    phone: "",
    service: "",
    date: "",
    message: "",
  });

  const today = new Date().toISOString().split("T")[0];

  const set = (key) => (e) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setLoading(false);
    setSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-purple-300 bg-white"
    }`;

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-16 px-4">
        <SuccessScreen fields={fields} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-purple-800 to-pink-800 py-14 px-4">
        <div className="absolute inset-0 opacity-20">
          <Image src="/images/background/background1.jpg" alt="" fill className="object-cover" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <span className="inline-block bg-yellow-400 text-black text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase shadow">
            🎁 Gift a Service
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Give the Gift of Glam
          </h1>
          <p className="text-purple-200 text-base max-w-xl mx-auto">
            Treat someone special to a professional beauty service. Choose a service, pick a date, and we&apos;ll send them a beautiful gift voucher.
          </p>
        </div>
      </div>

      {/* ── Form + sidebar ── */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-xl">
                  🎁
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Gift Details</h2>
                  <p className="text-gray-500 text-xs">All fields marked * are required</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {/* Your name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fields.senderName}
                    onChange={set("senderName")}
                    placeholder="Your full name"
                    className={inputClass("senderName")}
                  />
                  {errors.senderName && <p className="text-xs text-red-500">{errors.senderName}</p>}
                </div>

                {/* Recipient name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Recipient&apos;s name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fields.recipientName}
                    onChange={set("recipientName")}
                    placeholder="Who is the gift for?"
                    className={inputClass("recipientName")}
                  />
                  {errors.recipientName && <p className="text-xs text-red-500">{errors.recipientName}</p>}
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Your phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={fields.phone}
                    onChange={set("phone")}
                    placeholder="+234 800 000 0000"
                    className={inputClass("phone")}
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>

                {/* Service type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Service type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_OPTIONS.map((svc) => {
                      const selected = fields.service === svc;
                      return (
                        <button
                          key={svc}
                          type="button"
                          onClick={() => {
                            setFields((prev) => ({ ...prev, service: svc }));
                            setErrors((prev) => ({ ...prev, service: "" }));
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                            selected
                              ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                              : "bg-white text-gray-700 border-gray-200 hover:border-purple-400 hover:text-purple-700"
                          }`}
                        >
                          {selected && <span className="mr-1.5">✓</span>}
                          {svc}
                        </button>
                      );
                    })}
                  </div>
                  {errors.service && <p className="text-xs text-red-500">{errors.service}</p>}
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Preferred date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={fields.date}
                    min={today}
                    onChange={set("date")}
                    className={inputClass("date")}
                  />
                  {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Personal message{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={fields.message}
                    onChange={set("message")}
                    rows={3}
                    maxLength={200}
                    placeholder="Write a heartfelt message to include with the gift…"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 resize-none bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent hover:border-purple-300 transition-all"
                  />
                  <span className="text-xs text-gray-400 text-right">{fields.message.length}/200</span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {loading && <SpinnerIcon />}
                  {loading ? "Sending gift…" : "🎁 Send the Gift"}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* How it works */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">How It Works</h3>
              <div className="flex flex-col gap-4">
                {[
                  { n: "1", icon: "✍️", title: "Fill the form", desc: "Tell us about the recipient and service" },
                  { n: "2", icon: "🎨", title: "We create the voucher", desc: "A beautiful digital gift card is generated" },
                  { n: "3", icon: "📱", title: "Share & redeem", desc: "Send the voucher code to your loved one" },
                  { n: "4", icon: "✨", title: "They enjoy the service", desc: "Booked with any available stylist" },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-base shrink-0">
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular gifts */}
            <div className="bg-gradient-to-br from-purple-900 to-black rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-white mb-1 text-sm uppercase tracking-wide">Popular Gifts 🔥</h3>
              <p className="text-purple-300 text-xs mb-4">Most gifted services this month</p>
              <div className="flex flex-col gap-2">
                {[
                  { service: "Bridal Package", count: "234 gifts" },
                  { service: "Makeup", count: "187 gifts" },
                  { service: "Hair Styling", count: "156 gifts" },
                  { service: "Glam Package", count: "98 gifts" },
                ].map(({ service, count }) => (
                  <div key={service} className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{service}</span>
                    <span className="text-yellow-400 text-xs">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
              <p className="text-yellow-800 text-sm font-medium mb-2">
                Want to book for yourself instead?
              </p>
              <Link
                href="/book-appointment"
                className="inline-block px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg text-sm transition-all duration-200 shadow-sm"
              >
                Book Appointment →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
