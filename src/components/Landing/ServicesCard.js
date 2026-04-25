import React from "react";
import Button from "@/components/ui/Button";

const services = [
  {
    icon: "💇‍♀️",
    title: "Hair",
    desc: "Precision cuts, styling, coloring, and treatments for every hair type.",
    price: "₦5,000+",
    duration: "45-90 min",
  },
  {
    icon: "💄",
    title: "Makeup",
    desc: "Flawless makeup for any occasion, from natural to glam.",
    price: "₦7,000+",
    duration: "30-60 min",
  },
  {
    icon: "💅",
    title: "Nails",
    desc: "Manicures, pedicures, nail art, and treatments for healthy nails.",
    price: "₦4,000+",
    duration: "30-60 min",
  },
  {
    icon: "👁️",
    title: "Lashes",
    desc: "Lash extensions, lifts, and tinting for a bold, beautiful look.",
    price: "₦6,000+",
    duration: "40-70 min",
  },
  {
    icon: "🧔",
    title: "Grooming",
    desc: "Men's haircuts, beard trims, and grooming services.",
    price: "₦5,000+",
    duration: "30-60 min",
  },
  {
    icon: "🏠",
    title: "Home Service",
    desc: "Enjoy our services in the comfort of your home.",
    price: "₦10,000+",
    duration: "60-120 min",
  },
];

export default function ServicesCard() {
  return (
    <>
      <div className="flex flex-wrap justify-center gap-6 mt-8">
        {services.map((service, idx) => (
          <div
            key={idx}
            className="w-full sm:w-75 md:w-85 lg:w-90 bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col items-center border border-gray-200 hover:border-purple-400 transition-all duration-300 mx-auto hover:scale-105"
            style={{ minHeight: 240 }}
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-br from-purple-200 via-yellow-100 to-purple-700 shadow-md mb-4 md:mb-6">
              <span className="text-4xl md:text-5xl drop-shadow-lg">{service.icon}</span>
            </div>
            <h3 className="text-xl md:text-2xl font-semibold mb-2 md:mb-3 text-purple-700 tracking-tight">
              {service.title}
            </h3>
            <p className="text-sm md:text-base text-gray-700 mb-3 md:mb-5 text-center leading-relaxed">
              {service.desc}
            </p>
            <div className="flex gap-2 md:gap-4 mb-3 md:mb-5 justify-center">
              <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-md text-xs font-medium shadow-sm">
                From {service.price}
              </span>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-md text-xs font-medium shadow-sm">
                {service.duration}
              </span>
            </div>
            <Button
              href="/book-appointment"
              variant="primary"
              size="md"
              icon="📅"
              iconPosition="left"
              className="mt-auto"
            >
              Book Now
            </Button>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS section */}
      <div className="mt-12 flex flex-col items-center">
        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-primary mb-4 drop-shadow-lg bg-gray-100 px-6 py-2 rounded-xl inline-block">
          HOW IT WORKS
        </h2>
        <p className="max-w-2xl mx-auto text-center text-muted text-lg md:text-xl font-medium bg-white/60 rounded-xl px-8 py-6 shadow-md border border-accent/30 mb-8">
          Choose your desired service, book an appointment online, and our professional stylists
          will deliver a personalized experience—either in our studio or at your home.
          <br />
          <span className="text-accent font-bold">
            Enjoy seamless booking, expert care, and beautiful results every time.
          </span>
        </p>

        <div className="mt-8 flex flex-col gap-6 w-full max-w-5xl sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          <div className="flex flex-col items-center p-6 sm:p-5 md:p-6 bg-linear-to-br from-gray-50 via-white to-gray-200 rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl hover:border-purple-400 transition-all duration-300 w-full">
            <div className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-200 text-gray-700 mb-4 shadow-md">
              <span className="text-2xl md:text-3xl">🔍</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2 tracking-tight text-center">
              Discover Services
            </h3>
            <p className="text-sm md:text-base text-gray-600 text-center leading-relaxed">
              Explore our curated selection of beauty and grooming services tailored for you.
            </p>
          </div>

          <div className="flex flex-col items-center p-6 sm:p-5 md:p-6 bg-linear-to-br from-purple-100 via-white to-purple-200 rounded-2xl shadow-lg border border-purple-200 hover:shadow-2xl hover:border-yellow-400 transition-all duration-300 w-full">
            <div className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-purple-200 text-purple-700 mb-4 shadow-md">
              <span className="text-2xl md:text-3xl">📝</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-purple-800 mb-2 tracking-tight text-center">
              Easy Booking
            </h3>
            <p className="text-sm md:text-base text-purple-700 text-center leading-relaxed">
              Select your preferred service, date, and time. Booking is fast and seamless.
            </p>
          </div>

          <div className="flex flex-col items-center p-6 sm:p-5 md:p-6 bg-linear-to-br from-yellow-50 via-white to-yellow-200 rounded-2xl shadow-lg border border-yellow-200 hover:shadow-2xl hover:border-purple-400 transition-all duration-300 w-full">
            <div className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-yellow-200 text-yellow-700 mb-4 shadow-md">
              <span className="text-2xl md:text-3xl">🤝</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-yellow-800 mb-2 tracking-tight text-center">
              Personalized Experience
            </h3>
            <p className="text-sm md:text-base text-yellow-700 text-center leading-relaxed">
              Meet your stylist or beauty expert and enjoy a tailored, professional session.
            </p>
          </div>

          <div className="flex flex-col items-center p-6 sm:p-5 md:p-6 bg-linear-to-br from-purple-100 via-white to-yellow-100 rounded-2xl shadow-lg border border-purple-200 hover:shadow-2xl hover:border-yellow-400 transition-all duration-300 w-full">
            <div className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-linear-to-br from-yellow-200 to-purple-200 text-purple-700 mb-4 shadow-md">
              <span className="text-2xl md:text-3xl">✨</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-purple-800 mb-2 tracking-tight text-center">
              Enjoy Results
            </h3>
            <p className="text-sm md:text-base text-purple-700 text-center leading-relaxed">
              Leave feeling confident and refreshed, with results that speak for themselves.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
