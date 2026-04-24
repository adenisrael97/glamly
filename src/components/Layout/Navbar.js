


"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FaPhone, FaEnvelope, FaBars, FaTimes } from "react-icons/fa";
import { HiChevronDown } from "react-icons/hi";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Services", href: "/services" },
  { name: "Packages", href: "/packages" },
  { name: "Stylists", href: "/stylist" },
  { name: "Search", href: "/Search" },
  { name: "Login/Register", href: "/Login" },
];

const contactInfo = {
  phone: "+234 800 123 4567",
  email: "info@glamhub.com",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false); // mobile menu
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // desktop dropdown
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const dropdownRef = useRef(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path) => pathname === path;

  const handleSearch = () => {
    if (!service && !location) return;
    router.push(
      `/Search?service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`
    );
    setSearchOpen(false);
    setIsOpen(false);
  };

  const navbarBg = scrolled ? "rgba(0,0,0,0.95)" : "rgba(44, 20, 63, 0.85)";

  return (
    <>
      {/* ===== TOP BAR ===== */}
      <div className="hidden lg:block bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <a
              href={`tel:${contactInfo.phone}`}
              className="flex items-center gap-2 hover:text-yellow-500 transition-colors"
            >
              <FaPhone className="text-yellow-500 text-xs" />
              {contactInfo.phone}
            </a>
            <a
              href={`mailto:${contactInfo.email}`}
              className="flex items-center gap-2 hover:text-yellow-500 transition-colors"
            >
              <FaEnvelope className="text-yellow-500 text-xs" />
              {contactInfo.email}
            </a>
          </div>
          <p className="text-gray-400">Mon - Fri: 8:00 AM - 6:00 PM</p>
        </div>
      </div>

      {/* ===== MAIN NAVBAR ===== */}
      <header
        className="sticky top-0 z-50 w-full transition-all duration-300"
        style={{
          background: navbarBg,
          boxShadow: scrolled
            ? "0 2px 16px 0 rgba(44,20,63,0.12)"
            : "none",
          backdropFilter: scrolled ? "blur(4px)" : "blur(0px)",
        }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg bg-linear-to-br from-pink-400 via-yellow-300 to-purple-400">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="url(#glamGradient)" />
                  <path
                    d="M16 8c2.5 0 4.5 2 4.5 4.5S18.5 17 16 17s-4.5-2-4.5-4.5S13.5 8 16 8z"
                    fill="#fff"
                  />
                  <ellipse
                    cx="16"
                    cy="22"
                    rx="7"
                    ry="3"
                    fill="#fff"
                    opacity="0.7"
                  />
                  <defs>
                    <linearGradient
                      id="glamGradient"
                      x1="0"
                      y1="0"
                      x2="32"
                      y2="32"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#F472B6" />
                      <stop offset="0.5" stopColor="#FDE68A" />
                      <stop offset="1" stopColor="#A78BFA" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-bold text-white leading-tight tracking-wide">
                  GlamHub
                </span>
                <span className="text-xs sm:text-sm font-medium text-gray-700 leading-tight tracking-widest">
                  UNISEX SALON
                </span>
              </div>
            </Link>

            {/* Desktop nav links */}
            <ul className="hidden lg:flex items-center gap-2">
              {navLinks.map((link) => (
                <li
                  key={link.href}
                  className={link.name === "Search" ? "relative" : ""}
                >
                  {link.name === "Search" ? (
                    <>
                      <button
                        onClick={() => setSearchOpen(!searchOpen)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm md:text-base font-normal rounded-lg transition-colors ${
                          searchOpen
                            ? "text-yellow-500 bg-gray-900"
                            : "text-white hover:text-yellow-500 hover:bg-gray-800"
                        }`}
                      >
                        {link.name}{" "}
                        <HiChevronDown
                          className={`transition-transform ${
                            searchOpen ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {searchOpen && (
                          <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-4 z-50"
                          >
                            <input
                              type="text"
                              placeholder="Service (e.g., Makeup)"
                              value={service}
                              onChange={(e) => setService(e.target.value)}
                              className="w-full mb-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Location"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              className="w-full mb-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            />
                            <button
                              onClick={handleSearch}
                              className="w-full py-2 mt-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition"
                            >
                              Search
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      className={`px-3 py-1.5 text-sm md:text-base font-normal rounded-lg transition-colors ${
                        isActive(link.href)
                          ? "text-yellow-500 bg-gray-900"
                          : "text-white hover:text-yellow-500 hover:bg-gray-800"
                      }`}
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <div className="hidden lg:flex items-center gap-4 ml-4">
              <Link
                href="/Search"
                className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-base font-semibold transition-all shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-200"
                style={{ minWidth: "120px", letterSpacing: "0.04em" }}
              >
                Book Appointment
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-white hover:text-yellow-500 transition-colors"
            >
              {isOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-gray-100 border-t border-gray-200 overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 py-4">
                {/* Mobile Search inline */}
                <div className="flex flex-col gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Service (e.g., Makeup)"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm w-full"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm w-full"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black font-semibold transition w-full"
                  >
                    Search
                  </button>
                </div>
                {/* Mobile & Tablet Nav Links */}
                <ul className="flex flex-col gap-2 mt-2">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`block px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                          isActive(link.href)
                            ? "text-yellow-500 bg-gray-900"
                            : "text-gray-900 hover:text-yellow-500 hover:bg-gray-200"
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}