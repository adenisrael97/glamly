"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { GiftVoucherDTO } from "@glamly/shared";
import { client, unwrap } from "@/lib/api/client";
import { ServiceSelector } from "@/components/features/booking/ServiceSelector";
import { useServices } from "@/hooks/useServices";

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

interface GiftFields {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  message: string;
}

function validate(
  fields: GiftFields,
  selectedServiceIds: string[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.recipientName.trim()) errors.recipientName = "Recipient name is required";
  if (!fields.recipientEmail.trim()) errors.recipientEmail = "Recipient email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.recipientEmail))
    errors.recipientEmail = "Enter a valid email address";
  if (fields.recipientPhone && !/^[\d\s+\-()\\.]{7,20}$/.test(fields.recipientPhone))
    errors.recipientPhone = "Enter a valid phone number";
  if (selectedServiceIds.length === 0) errors.services = "Please select at least one service";
  return errors;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy code
        </>
      )}
    </button>
  );
}

function SuccessScreen({ voucher }: { voucher: GiftVoucherDTO }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4 max-w-md mx-auto">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-linear-to-br from-yellow-400 via-pink-400 to-purple-500 flex items-center justify-center shadow-2xl">
          <span className="text-5xl">🎁</span>
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <span className="text-yellow-700 text-xs font-bold tracking-widest uppercase mb-2">Gift Created!</span>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Beautiful gift!
      </h2>
      <p className="text-gray-500 text-sm mb-6 max-w-sm">
        Your gift voucher for <strong>{voucher.recipientName}</strong> has been created and sent to{" "}
        <strong>{voucher.recipientEmail}</strong>.
      </p>

      {/* Gift voucher card */}
      <div className="w-full bg-linear-to-br from-purple-900 via-purple-800 to-black rounded-2xl p-6 mb-6 text-left shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase">Glamly Gift Voucher</span>
            <span className="text-2xl">✨</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {voucher.services.map((s) => (
              <span key={s.id} className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">{s.name}</span>
            ))}
          </div>
          <p className="text-purple-200 text-xs mb-4">For {voucher.recipientName}</p>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-purple-300 text-xs">Total value</p>
              <p className="text-white font-bold text-lg">₦{voucher.totalAmount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-purple-300 text-xs mb-1">Voucher code</p>
              <p className="text-yellow-400 font-mono font-bold text-base">{voucher.code}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <CopyButton text={voucher.code} />
          </div>
          {voucher.message && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-purple-200 text-xs italic">&ldquo;{voucher.message}&rdquo;</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-gray-400 text-xs mb-6">
        The voucher has been emailed to {voucher.recipientEmail}. Share the code above with {voucher.recipientName}.
        Expires: {new Date(voucher.expiresAt).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}.
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
  const [voucher, setVoucher] = useState<GiftVoucherDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [fields, setFields] = useState<GiftFields>({
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    message: "",
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Fetch real services from API
  const { services, isLoading: servicesLoading } = useServices({ limit: 50 });

  const set =
    (key: keyof GiftFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: "" }));
    };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate(fields, selectedServiceIds);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setApiError(null);
    setLoading(true);
    try {
      const result = await unwrap<GiftVoucherDTO>(
        client.post("/gift-vouchers", {
          serviceIds: selectedServiceIds,
          recipientName: fields.recipientName.trim(),
          recipientEmail: fields.recipientEmail.trim(),
          recipientPhone: fields.recipientPhone.trim() || undefined,
          message: fields.message.trim() || undefined,
        }),
      );
      setVoucher(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Could not create gift voucher. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-purple-300 bg-white"
    }`;

  if (voucher) {
    return (
      <main className="min-h-screen bg-linear-to-br from-purple-50 via-white to-pink-50 py-16 px-4">
        <SuccessScreen voucher={voucher} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-purple-50 via-white to-pink-50">
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden bg-linear-to-r from-purple-900 via-purple-800 to-pink-800 py-14 px-4">
        <div className="absolute inset-0 opacity-20">
          <Image src="/images/background/background1.jpg" alt="" fill sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <span className="inline-block bg-yellow-400 text-black text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase shadow">
            🎁 Gift a Service
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Give the Gift of Glam
          </h1>
          <p className="text-purple-200 text-base max-w-xl mx-auto">
            Treat someone special to a professional beauty service. Choose services, fill in their details,
            and we&apos;ll send them a beautiful gift voucher.
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
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-100 to-pink-100 flex items-center justify-center text-xl">
                  🎁
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Gift Details</h2>
                  <p className="text-gray-500 text-xs">Fields marked * are required</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                {/* API error */}
                {apiError && (
                  <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {apiError}
                  </div>
                )}

                {/* Recipient name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipientName" className="text-sm font-medium text-gray-700">
                    Recipient&apos;s name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="recipientName"
                    type="text"
                    value={fields.recipientName}
                    onChange={set("recipientName")}
                    placeholder="Who is this gift for?"
                    className={inputClass("recipientName")}
                  />
                  {errors.recipientName && <p className="text-xs text-red-500">{errors.recipientName}</p>}
                </div>

                {/* Recipient email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipientEmail" className="text-sm font-medium text-gray-700">
                    Recipient&apos;s email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="recipientEmail"
                    type="email"
                    value={fields.recipientEmail}
                    onChange={set("recipientEmail")}
                    placeholder="they@example.com"
                    className={inputClass("recipientEmail")}
                  />
                  {errors.recipientEmail && <p className="text-xs text-red-500">{errors.recipientEmail}</p>}
                </div>

                {/* Recipient phone */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipientPhone" className="text-sm font-medium text-gray-700">
                    Recipient&apos;s phone{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="recipientPhone"
                    type="tel"
                    value={fields.recipientPhone}
                    onChange={set("recipientPhone")}
                    placeholder="+234 800 000 0000"
                    className={inputClass("recipientPhone")}
                  />
                  {errors.recipientPhone && <p className="text-xs text-red-500">{errors.recipientPhone}</p>}
                </div>

                {/* Service selector */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-medium text-gray-700">
                    Services to gift <span className="text-red-500">*</span>
                  </p>
                  {servicesLoading ? (
                    <div className="flex flex-col gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : services.length > 0 ? (
                    <ServiceSelector
                      services={services.map((s) => ({
                        id: s.id,
                        name: s.name,
                        category: s.category,
                        description: s.description,
                        price: s.price,
                        duration: s.duration,
                        imageUrl: s.imageUrl,
                      }))}
                      packages={[]}
                      selectedServiceIds={selectedServiceIds}
                      selectedPackageId={undefined}
                      onServicesChange={(ids) => {
                        setSelectedServiceIds(ids);
                        setErrors((prev) => ({ ...prev, services: "" }));
                      }}
                      onPackageChange={() => undefined}
                    />
                  ) : (
                    <p className="text-sm text-gray-400">No services available at the moment.</p>
                  )}
                  {errors.services && <p className="text-xs text-red-500">{errors.services}</p>}
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="giftMessage" className="text-sm font-medium text-gray-700">
                    Personal message{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="giftMessage"
                    value={fields.message}
                    onChange={set("message")}
                    rows={3}
                    maxLength={500}
                    placeholder="Write a heartfelt message to include with the gift…"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 resize-none bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent hover:border-purple-300 transition-all"
                  />
                  <span className="text-xs text-gray-400 text-right">{fields.message.length}/500</span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {loading && <SpinnerIcon />}
                  {loading ? "Creating voucher…" : "🎁 Send the Gift"}
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
                  { icon: "✍️", title: "Fill the form", desc: "Tell us about the recipient and pick services" },
                  { icon: "🎨", title: "We create the voucher", desc: "A beautiful digital gift card is generated" },
                  { icon: "📱", title: "Email delivery", desc: "The voucher is emailed to the recipient instantly" },
                  { icon: "✨", title: "They enjoy the service", desc: "Redeemable with any available stylist" },
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
            <div className="bg-linear-to-br from-purple-900 to-black rounded-2xl p-6 shadow-lg">
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
