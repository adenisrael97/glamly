import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        {/* Brand Section */}
        <div>
          <span className="text-2xl font-extrabold text-purple-700 tracking-tight">Glamhub</span>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            Glamhub connects customers with top salons, makeup artists, nail technicians, and beauty professionals — making beauty booking simple and seamless.
          </p>
        </div>
        {/* Quick Links */}
        <nav aria-label="Quick Links">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Quick Links</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/" className="text-sm text-gray-600 hover:text-purple-700 transition">
                Home
              </Link>
            </li>
            <li><a href="/services" className="text-sm text-gray-600 hover:text-purple-700 transition">Services</a></li>
            <li><a href="/book" className="text-sm text-gray-600 hover:text-purple-700 transition">Book Appointment</a></li>
            <li><a href="/partner" className="text-sm text-gray-600 hover:text-purple-700 transition">Become a Partner</a></li>
            <li><a href="/contact" className="text-sm text-gray-600 hover:text-purple-700 transition">Contact</a></li>
          </ul>
        </nav>
        {/* Services */}
        <nav aria-label="Services">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Services</h3>
          <ul className="space-y-2">
            <li><a href="/services/hair" className="text-sm text-gray-600 hover:text-purple-700 transition">Hair Styling</a></li>
            <li><a href="/services/makeup" className="text-sm text-gray-600 hover:text-purple-700 transition">Makeup</a></li>
            <li><a href="/services/nail" className="text-sm text-gray-600 hover:text-purple-700 transition">Nail Services</a></li>
            <li><a href="/services/eye" className="text-sm text-gray-600 hover:text-purple-700 transition">Eye & Lash</a></li>
            <li><a href="/services/spa" className="text-sm text-gray-600 hover:text-purple-700 transition">Spa Treatments</a></li>
          </ul>
        </nav>
        {/* Newsletter */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Newsletter</h3>
          <form className="flex flex-col space-y-3">
            <div className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
              <button
                type="submit"
                className="rounded-r-lg bg-purple-700 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-800 transition"
              >
                Subscribe
              </button>
            </div>
            <span className="text-xs text-gray-500">Get beauty tips and special offers.</span>
          </form>
        </div>
      </div>
      {/* Footer Bottom Bar */}
      <div className="border-t border-gray-200 mt-8 py-4">
        <p className="text-xs text-gray-500 text-center">
          © 2026 Glamhub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
