import React from "react";
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaClock } from "react-icons/fa";

export default function Address() {
  return (
    <section className="w-full bg-white py-10 px-2 sm:px-4">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <h2 className="text-lg md:text-xl font-bold text-purple-700 tracking-widest mb-2 uppercase text-center">
          GET IN TORCH
        </h2>
        <p className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 mb-3 text-center">
          Visit Our Salon
        </p>
        <p className="text-sm md:text-base text-gray-600 mb-10 text-center max-w-xl">
          Experience beauty and relaxation in our modern, welcoming space. Our team is ready to help you shine—just drop by, call, or connect with us!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full">
          {/* Visit Us */}
          <div className="bg-linear-to-br from-purple-100 via-yellow-50 to-pink-100 rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col items-center w-full min-w-0 hover:scale-105 transition-transform">
            <FaMapMarkerAlt className="text-3xl text-purple-600 mb-2" />
            <h3 className="text-base font-bold text-purple-800 mb-1">Visit Us</h3>
            <p className="text-xs text-gray-700 text-center">123 Glam Street, Beauty City</p>
          </div>
          {/* Call Us */}
          <div className="bg-linear-to-br from-yellow-100 via-pink-50 to-purple-100 rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col items-center w-full min-w-0 hover:scale-105 transition-transform">
            <FaPhoneAlt className="text-3xl text-yellow-700 mb-2" />
            <h3 className="text-base font-bold text-yellow-700 mb-1">Call Us</h3>
            <p className="text-xs text-gray-700 text-center">+1 (555) 123-4567</p>
          </div>
          {/* Email Us */}
          <div className="bg-linear-to-br from-pink-100 via-purple-50 to-yellow-100 rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col items-center w-full min-w-0 hover:scale-105 transition-transform">
            <FaEnvelope className="text-3xl text-pink-500 mb-2" />
            <h3 className="text-base font-bold text-pink-600 mb-1">Email Us</h3>
            <p className="text-xs text-gray-700 text-center">hello@glamly.com</p>
          </div>
          {/* Hours */}
          <div className="bg-linear-to-br from-green-100 via-yellow-50 to-purple-100 rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col items-center w-full min-w-0 hover:scale-105 transition-transform">
            <FaClock className="text-3xl text-green-600 mb-2" />
            <h3 className="text-base font-bold text-green-700 mb-1">Hours</h3>
            <p className="text-xs text-gray-700 text-center">Mon-Sat: 9am - 8pm<br />Sun: 10am - 6pm</p>
          </div>
        </div>
      </div>
    </section>
  );
}
