



"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import stylistData from "@/data/stylist/stylist.json";
import packagesData from "@/data/package/packages.json";

/* ---------------------- Stylist Info ---------------------- */
function StylistInfo({ stylist }) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-6 bg-white rounded-lg shadow p-6 mb-6">
      <div className="shrink-0 flex items-center justify-center w-32 h-32 bg-linear-to-br from-purple-100 to-gold-100 rounded-full overflow-hidden border-4 border-purple-400 shadow-md">
        <Image
          src={stylist.image || "/images/stylist/default.jpg"}
          alt={stylist.name}
          width={120}
          height={120}
          className="rounded-full object-cover w-30 h-30"
          unoptimized
        />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-purple-700">{stylist.name}</h2>
        <p className="text-gray-600 mb-1">{stylist.location}</p>
        <p className="text-yellow-500 font-semibold mb-1">
          ⭐ {stylist.rating} / 5
        </p>
        <p className="text-gray-800 mb-1">
          Services: {stylist.services.join(", ")}
        </p>
        <p className="text-gold-600 font-bold">Base Price: ₦{stylist.price?.toLocaleString()}</p>
      </div>
    </div>
  );
}

/* ---------------------- Package Card with Modal ---------------------- */

function PackageCard({ pkg, selected, onSelect, onShowDetail }) {
  return (
    <div
      className={`relative cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center transition-all duration-200
        ${selected ? "border-4 border-gold-500 bg-gold-50 scale-105 shadow-xl" : "border-gray-200 bg-white hover:shadow-lg"}`}
      onClick={onSelect}
    >
      {selected && (
        <span className="absolute top-2 left-2 bg-gold-500 text-white rounded-full p-1 shadow-lg animate-bounce z-10" title="Selected">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </span>
      )}
      <div className="relative w-full flex flex-col items-center">
        <Image
          src={pkg.image}
          alt={pkg.name}
          width={100}
          height={100}
          className="rounded mb-2"
        />
        <button
          className="absolute top-2 right-2 bg-white/80 rounded-full p-1 shadow hover:bg-gold-100 text-purple-700 text-xs font-bold border border-gold-300"
          onClick={e => { e.stopPropagation(); onShowDetail(pkg); }}
          aria-label={`View more about ${pkg.name}`}
        >
          More
        </button>
      </div>
      <h3 className="font-semibold text-lg text-purple-700">{pkg.name}</h3>
      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{pkg.description}</p>
      <span className="text-gold-700 font-bold">₦{pkg.price}</span>
      <span className="block text-xs text-gray-500 mt-1">⏱️ {pkg.duration || '90 min'}</span>
    </div>
  );
}

function PackageDetailModal({ pkg, onClose }) {
  if (!pkg) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative animate-fade-in">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-purple-700 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>
        <div className="flex flex-col items-center">
          <Image
            src={pkg.image}
            alt={pkg.name}
            width={180}
            height={180}
            className="rounded-xl mb-4 object-cover"
          />
          <h2 className="text-2xl font-extrabold text-purple-800 mb-2">{pkg.name}</h2>
          <p className="text-gray-700 mb-3 text-center">{pkg.description}</p>
          {/* Example: testimonials or extra info (stub) */}
          <div className="bg-gold-50 rounded-lg p-3 w-full mb-2">
            <p className="text-gold-700 text-sm italic">“Absolutely loved this package! Made my day so special.”</p>
            <p className="text-right text-xs text-gray-500">– Happy Client</p>
          </div>
          <div className="flex flex-col gap-1 w-full mt-2">
            <span className="text-purple-700 font-bold">Price: ₦{pkg.price}</span>
            <span className="text-xs text-gray-500">Estimated Duration: {pkg.duration || '90 min'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Add-On Item ---------------------- */
function AddOnItem({ addon, selected, onToggle }) {
  return (
    <button
      className={`px-4 py-2 rounded-full border-2 m-1 transition-all
        ${selected
          ? "bg-purple-600 text-white border-purple-700"
          : "bg-gray-100 text-gray-700 border-gray-300"}
        hover:bg-purple-100`}
      onClick={onToggle}
      type="button"
    >
      <span className="block font-semibold">{addon.name} (+₦{addon.price})</span>
      <span className="block text-[10px] text-gray-400">⏱️ {addon.duration || '20 min'}</span>
    </button>
  );
}

/* ---------------------- Main Booking Page ---------------------- */
export default function BookingPage({ params }) {

  const router = useRouter();
  // In Next.js 16+, params is a Promise and must be unwrapped
  const { id } = React.use(params); // stylist ID from URL
  const stylist = stylistData.find((s) => String(s.id) === String(id));
  const isAvailable = stylist?.available !== false;
  // Simulate stylist availability and time slots
  const slots = [
    "09:00 AM", "10:30 AM", "12:00 PM", "01:30 PM", "03:00 PM", "04:30 PM", "06:00 PM"
  ];
  const [selectedSlot, setSelectedSlot] = useState(null);
  // Packages come from JSON
  const [packages] = useState(packagesData || []);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [modalPackage, setModalPackage] = useState(null);
  // Add-Ons array
  const addOns = [
    { name: "Extra Hair Treatment", price: 2000, duration: '30 min' },
    { name: "Nail Art", price: 1500, duration: '25 min' },
    { name: "Facial Mask", price: 2500, duration: '40 min' },
    { name: "Eyelash Extensions", price: 3000, duration: '35 min' },
    { name: "Brow Shaping", price: 1200, duration: '15 min' },
    { name: "Foot Spa", price: 1800, duration: '30 min' },
    { name: "Hand Massage", price: 1000, duration: '20 min' },
    { name: "Makeup Touch-Up Kit", price: 800, duration: '10 min' },
    { name: "Hair Accessories", price: 600, duration: '5 min' },
    { name: "Mini Photoshoot", price: 3500, duration: '45 min' },
  ];
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  // Add-on selection highlight
  const isAddOnSelected = (addon) => selectedAddOns.some((a) => a.name === addon.name);

  // Booking Progress Bar/Stepper
  // Steps: 1. Select Package, 2. Add Extras, 3. Pick Slot, 4. Confirm
  const steps = [
    { label: "Package", done: !!selectedPackage },
    { label: "Add-Ons", done: selectedAddOns.length > 0 },
    { label: "Time Slot", done: !!selectedSlot },
    { label: "Confirm", done: false },
  ];
  const currentStep = steps.findIndex((step) => !step.done);

  // ...existing code...
  const handleSelectPackage = (pkg) => setSelectedPackage(pkg);

  const handleToggleAddOn = (addon) => {
    setSelectedAddOns((prev) =>
      prev.some((a) => a.name === addon.name)
        ? prev.filter((a) => a.name !== addon.name)
        : [...prev, addon]
    );
  };

  const total =
    (stylist?.price || 0) +
    (selectedPackage?.price || 0) +
    selectedAddOns.reduce((sum, a) => sum + (a.price || 0), 0);

  const handleConfirmBooking = () => {
    alert(
      `Booking confirmed!\nStylist: ${stylist.name}\nPackage: ${
        selectedPackage?.name || "None"
      }\nAdd-Ons: ${selectedAddOns.map((a) => a.name).join(", ") || "None"}\nTotal: ₦${total}`
    );
    router.push("/"); // redirect to home or thank-you page
  };

  if (!stylist) {
    return (
      <div className="flex items-center justify-center h-64 text-xl text-gray-500">
        Loading stylist info...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6 sm:py-8 md:py-12 bg-linear-to-br from-purple-50 via-gold-50 to-white min-h-screen">
      {/* Booking Progress Bar/Stepper */}
      <nav className="mb-6 sm:mb-8">
        <ol className="flex flex-wrap items-center justify-center gap-2 md:gap-6">
          {steps.map((step, idx) => (
            <li key={step.label} className="flex items-center gap-2">
              <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm transition-all
                ${idx < currentStep ? 'bg-gold-500 border-gold-600 text-white' : idx === currentStep ? 'bg-purple-700 border-purple-800 text-white animate-pulse' : 'bg-gray-200 border-gray-300 text-gray-400'}`}
                aria-current={idx === currentStep ? 'step' : undefined}
              >
                {idx < currentStep ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                ) : idx + 1}
              </span>
              <span className={`text-xs md:text-base font-medium ${idx === currentStep ? 'text-purple-800' : idx < currentStep ? 'text-gold-700' : 'text-gray-400'}`}>{step.label}</span>
              {idx < steps.length - 1 && (
                <span className="w-6 h-1 bg-gray-300 rounded-full md:w-10 md:h-1 mx-1 md:mx-2" />
              )}
            </li>
          ))}
        </ol>
      </nav>
      {/* Availability & Slot Selection */}
      <section className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-lg shadow p-3 sm:p-4 border border-gold-200">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={`font-semibold ${isAvailable ? 'text-green-700' : 'text-red-700'}`}>{isAvailable ? 'Stylist Available' : 'Stylist Unavailable'}</span>
          </div>
          {isAvailable && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-500 mr-2">Select a time slot:</span>
              {slots.map(slot => (
                <button
                  key={slot}
                  className={`px-3 py-1 rounded-full border-2 text-sm font-medium transition-all
                    ${selectedSlot === slot ? 'bg-gold-500 text-white border-gold-600 scale-105' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gold-100'}`}
                  onClick={() => setSelectedSlot(slot)}
                  type="button"
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      {/* Stylist Info */}
      <div className="mb-8 sm:mb-10">
        <StylistInfo stylist={stylist} />
      </div>

      {/* Packages Section with Header and Description */}
      <section className="mb-10">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-purple-800 mb-2 tracking-tight drop-shadow-sm">
            Our Special Packages For You
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-base md:text-lg">
            Discover our curated selection of beauty packages, crafted to give you a luxurious and unforgettable experience. Whether it&apos;s your big day or a special treat, each package is designed to make you feel your absolute best.
          </p>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              selected={selectedPackage?.id === pkg.id}
              onSelect={() => handleSelectPackage(pkg)}
              onShowDetail={setModalPackage}
            />
          ))}
        </div>
        <PackageDetailModal pkg={modalPackage} onClose={() => setModalPackage(null)} />
      </section>

      {/* Add-Ons Section */}
      <section className="mb-10">
        <div className="text-center mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-2xl font-bold text-purple-700 mb-1">Enhance Your Experience</h2>
          <p className="text-gray-500 text-xs sm:text-sm md:text-base">Add any of these premium extras to personalize your booking.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
          {addOns.map((addon) => (
            <div key={addon.name} className="relative">
              <AddOnItem
                selected={isAddOnSelected(addon)}
                addon={addon}
                onToggle={() => handleToggleAddOn(addon)}
              />
              {isAddOnSelected(addon) && (
                <span className="absolute top-0 right-0 bg-gold-500 text-white rounded-full p-0.5 shadow animate-bounce z-10" title="Selected add-on">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Total & Confirm Section */}
      <section className="sticky bottom-0 left-0 w-full bg-white/90 backdrop-blur-md shadow-lg rounded-t-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between border-t-4 border-gold-400 z-20 overflow-x-auto">
        <div className="text-lg sm:text-xl font-extrabold text-black mb-2 sm:mb-0">
          Total: <span className="text-gold-700">₦{total}</span>
        </div>
        <button
          className="w-full sm:w-auto bg-linear-to-r from-purple-700 via-purple-600 to-gold-500 hover:from-purple-800 hover:to-gold-600 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-lg shadow-xl transition-all text-base sm:text-lg tracking-wide"
          onClick={handleConfirmBooking}
        >
          Confirm Booking
        </button>
      </section>
    </div>
  );
}