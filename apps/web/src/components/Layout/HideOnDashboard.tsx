"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// The admin and stylist-studio dashboards render their own sidebar + topbar chrome,
// so the public marketing Navbar/Footer must not wrap them — showing both is
// confusing and the sticky marketing navbar (z-50) would overlap the dashboard's
// own sticky topbar. This client gate hides its children on those route trees.
const DASHBOARD_PREFIXES = ["/admin", "/studio"];

export function HideOnDashboard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onDashboard = DASHBOARD_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (onDashboard) return null;
  return <>{children}</>;
}
