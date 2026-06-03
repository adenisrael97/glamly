"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Shared sticky desktop topbar for the admin + stylist dashboard layouts. Renders a
// breadcrumb derived from the URL on the left, and (optionally) a notification slot
// plus an accessible user menu on the right. Hidden on mobile (md:flex) — the mobile
// fixed header in each layout covers small screens.

// Segments that are record ids (cuid / uuid / numeric) shouldn't appear as crumbs.
const ID_LIKE = /^(c[a-z0-9]{20,}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F-]+|\d+)$/;

function humanize(segment: string): string {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build a breadcrumb trail from the path, dropping the section root + id segments. */
function useBreadcrumb(rootLabel: string): string[] {
  const pathname = usePathname();
  return useMemo(() => {
    const trail = pathname
      .split("/")
      .filter(Boolean)
      .slice(1) // drop the section root (e.g. "admin" / "studio") — the sidebar shows it
      .filter((seg) => !ID_LIKE.test(seg))
      .map(humanize);
    return trail.length > 0 ? trail : [rootLabel];
  }, [pathname, rootLabel]);
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CrumbSeparator() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-gray-300">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

interface MenuItem {
  label: string;
  href?: string;
  onSelect?: () => void;
}

function UserMenu({
  userName,
  profileHref,
  onLogout,
}: {
  userName: string;
  profileHref: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const menuId = useId();

  const items = useMemo<MenuItem[]>(
    () => [
      { label: "Profile", href: profileHref },
      { label: "Sign out", onSelect: onLogout },
    ],
    [profileHref, onLogout],
  );

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Focus the active item whenever the menu opens or the active index changes.
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  // Close on a click outside the menu container.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const openMenu = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu(0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(items.length - 1);
    }
  };

  // Arrow keys cycle; Tab/Shift+Tab are trapped (also cycle); Escape closes.
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
      case "Tab":
        if (e.key === "Tab" && e.shiftKey) {
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + items.length) % items.length);
          break;
        }
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  };

  const activate = (item: MenuItem) => {
    setOpen(false);
    item.onSelect?.();
  };

  const initial = userName.charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : openMenu(0))}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-200 text-sm font-bold text-purple-700" aria-hidden="true">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-gray-700 lg:block">
          {userName}
        </span>
        <span className="text-gray-400">
          <ChevronDown />
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
            Signed in as <span className="font-semibold text-gray-600">{userName}</span>
          </p>
          {items.map((item, i) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                tabIndex={i === activeIndex ? 0 : -1}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href="#"
                role="menuitem"
                tabIndex={i === activeIndex ? 0 : -1}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={(e) => {
                  e.preventDefault();
                  activate(item);
                }}
                className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
              >
                {item.label}
              </a>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export interface DashboardTopbarProps {
  /** Crumb shown when the path has no sub-segment (e.g. "Overview"). */
  rootLabel: string;
  userName: string;
  /** Where the "Profile" menu item links. */
  profileHref: string;
  onLogout: () => void;
  /** Optional right-aligned content before the user menu (e.g. an admin bell). */
  rightSlot?: ReactNode;
}

export function DashboardTopbar({ rootLabel, userName, profileHref, onLogout, rightSlot }: DashboardTopbarProps) {
  const crumbs = useBreadcrumb(rootLabel);

  return (
    <header className="hidden md:flex sticky top-0 z-20 bg-white border-b border-gray-200 h-14 items-center justify-between px-6 shrink-0">
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={`${crumb}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <CrumbSeparator />}
                <span
                  className={isLast ? "font-semibold text-gray-900 truncate" : "text-gray-500"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-center gap-1">
        {rightSlot}
        <UserMenu userName={userName} profileHref={profileHref} onLogout={onLogout} />
      </div>
    </header>
  );
}
