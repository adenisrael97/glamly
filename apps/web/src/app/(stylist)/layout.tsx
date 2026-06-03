"use client";

import { useState, useEffect, useRef, startTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";

// ─── Icons ────────────────────────────────────────────────────────────────────

function OverviewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  );
}

function PackagesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function BookingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function AvailabilityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Overview", href: "/studio", icon: <OverviewIcon /> },
  { label: "Services", href: "/studio/services", icon: <ServicesIcon /> },
  { label: "Packages", href: "/studio/packages", icon: <PackagesIcon /> },
  { label: "Bookings", href: "/studio/bookings", icon: <BookingsIcon /> },
  { label: "Availability", href: "/studio/availability", icon: <AvailabilityIcon /> },
];

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 ${
        active
          ? "bg-purple-100 text-purple-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  pathname,
  onClose,
  onLogout,
  userName,
}: {
  pathname: string;
  onClose?: () => void;
  onLogout: () => void;
  userName: string;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        <div>
          <p className="text-lg font-extrabold text-purple-700 tracking-tight">Glamly</p>
          <p className="text-xs text-gray-400 font-medium">Stylist Studio</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 md:hidden"
            aria-label="Close navigation menu"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <nav className="sidebar-nav flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Stylist studio navigation">
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={
              href === "/studio"
                ? pathname === "/studio"
                : pathname.startsWith(href)
            }
            onClick={onClose}
          />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div
            className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0"
            aria-hidden="true"
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-700 truncate">{userName}</span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <LogoutIcon />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function StylistLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, status } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated or not a stylist. The login route is "/Login"
  // (the (auth) route group adds no path segment) — "/auth/login" would 404.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/Login");
    } else if (status === "authenticated" && user?.role !== "stylist") {
      router.replace("/dashboard");
    }
  }, [status, user, router]);

  // Close mobile menu on route change. Use startTransition so the setState
  // call is not synchronous inside the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    startTransition(() => {
      setMobileOpen(false);
    });
  }, [pathname]);

  // Focus trap inside mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const el = overlayRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
      if (e.key === "Tab") {
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    first?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    router.replace("/Login");
  };

  const userName = user?.name ?? "Stylist";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
        <Sidebar pathname={pathname} onLogout={handleLogout} userName={userName} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={overlayRef}
            className="relative w-64 max-w-[80vw] bg-white h-full shadow-xl flex flex-col"
          >
            <Sidebar
              pathname={pathname}
              onClose={() => setMobileOpen(false)}
              onLogout={handleLogout}
              userName={userName}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-60 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile topbar — fixed (not sticky) so it never scrolls away inside the
            min-h-screen flex column on mobile browsers. */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <HamburgerIcon />
          </button>
          <span className="text-base font-bold text-purple-700">Studio</span>
        </header>

        {/* Desktop sticky topbar — breadcrumb + account menu. */}
        <DashboardTopbar
          rootLabel="Overview"
          userName={userName}
          profileHref="/studio"
          onLogout={handleLogout}
        />

        {/* pt-20 clears the fixed mobile header; md:pt-6 restores normal desktop spacing. */}
        <main className="flex-1 px-4 pt-20 pb-6 md:px-6 md:pt-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
