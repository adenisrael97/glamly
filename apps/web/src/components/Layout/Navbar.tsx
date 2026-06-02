"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FaPhone, FaEnvelope, FaBars, FaTimes } from "react-icons/fa";
import { HiChevronDown } from "react-icons/hi";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Services", href: "/services" },
  { name: "Packages", href: "/packages" },
  { name: "Stylists", href: "/stylist" },
  { name: "Search", href: "/Search" },
  { name: "Gift a Service", href: "/gift-service" },
];

const contactInfo = {
  phone: "+234 800 123 4567",
  email: "info@glamhub.com",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false); // mobile menu
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // desktop dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleSearch = () => {
    if (!service && !location) return;
    router.push(
      `/Search?service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`,
    );
    setSearchOpen(false);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    setIsOpen(false);
    router.push("/");
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
          boxShadow: scrolled ? "0 2px 16px 0 rgba(44,20,63,0.12)" : "none",
          backdropFilter: scrolled ? "blur(4px)" : "blur(0px)",
        }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg bg-linear-to-br from-pink-400 via-yellow-300 to-purple-400">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="16" fill="url(#glamGradient)" />
                  <path
                    d="M16 8c2.5 0 4.5 2 4.5 4.5S18.5 17 16 17s-4.5-2-4.5-4.5S13.5 8 16 8z"
                    fill="#fff"
                  />
                  <ellipse cx="16" cy="22" rx="7" ry="3" fill="#fff" opacity="0.7" />
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
                <li key={link.href} className={link.name === "Search" ? "relative" : ""}>
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
                          className={`transition-transform ${searchOpen ? "rotate-180" : "rotate-0"}`}
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

            {/* CTA / Auth */}
            <div className="hidden lg:flex items-center gap-3 ml-4">
              {!authLoading && !user ? (
                <>
                  <Link
                    href="/Login"
                    className="px-4 py-2 rounded-lg border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/book-appointment"
                    className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black text-sm font-bold transition-all shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-200"
                    style={{ minWidth: "140px", letterSpacing: "0.04em", textAlign: "center" }}
                  >
                    Book Now 📅
                  </Link>
                </>
              ) : !authLoading && user ? (
                <>
                  <Link
                    href="/book-appointment"
                    className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black text-sm font-bold transition-all shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-200"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    Book Now 📅
                  </Link>
                  {/* User avatar + dropdown */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((v) => !v)}
                      aria-expanded={userMenuOpen}
                      aria-haspopup="true"
                      aria-label={`Account menu for ${user.name}`}
                      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-white/20 hover:border-white/50 transition-all bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-pink-400 via-yellow-300 to-purple-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {user.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm text-white font-medium max-w-[100px] truncate">
                        {user.name.split(" ")[0]}
                      </span>
                      <HiChevronDown
                        className={`text-white/70 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                          role="menu"
                        >
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            <span className="mt-1 inline-block text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium capitalize">
                              {user.role}
                            </span>
                          </div>
                          <div className="py-1">
                            <Link
                              href={user.role === "stylist" ? "/studio" : "/dashboard"}
                              role="menuitem"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              Dashboard
                            </Link>
                            {user.role === "stylist" && (
                              <Link
                                href="/studio"
                                role="menuitem"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                My Studio
                              </Link>
                            )}
                          </div>
                          <div className="py-1 border-t border-gray-100">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={handleLogout}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Sign out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : null}
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

                {/* Mobile auth */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {user ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-pink-400 via-yellow-300 to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {user.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        href={user.role === "stylist" ? "/studio" : "/dashboard"}
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/Login"
                        onClick={() => setIsOpen(false)}
                        className="block text-center px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setIsOpen(false)}
                        className="block text-center px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
                      >
                        Create account
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
