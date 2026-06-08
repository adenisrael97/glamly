import { NextResponse, type NextRequest } from "next/server";

// Optimistic route guarding (CLAUDE.md §4). The middleware reads the non-httpOnly
// `glamly_role` hint cookie set by AuthContext — it CANNOT read the httpOnly
// refresh cookie, and it does NOT verify anything. Real enforcement lives in the
// API (every protected endpoint rejects an unauthenticated/under-privileged
// request) plus client guards; this layer just avoids flashing a protected page
// before that happens, and keeps signed-in users out of the auth pages.

const PROTECTED_PREFIXES = ["/book-appointment", "/booking", "/dashboard"];
const STYLIST_PREFIXES = ["/studio"];
const ADMIN_PREFIXES = ["/admin"];
const AUTH_PREFIXES = ["/Login", "/register", "/stylist-register"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get("glamly_role")?.value;
  const isAuthed = Boolean(role);
  const isStylist = role === "stylist";
  const isAdmin = role === "admin";

  // Signed-in users have no business on the auth pages.
  if (matches(pathname, AUTH_PREFIXES)) {
    if (isAuthed) {
      return NextResponse.redirect(new URL(isStylist ? "/studio" : isAdmin ? "/admin/dashboard" : "/", req.url));
    }
    return NextResponse.next();
  }

  // Admin-only routes.
  if (matches(pathname, ADMIN_PREFIXES)) {
    if (!isAuthed) {
      const url = new URL("/Login", req.url);
      // Preserve the full URL (path + search) so the user lands back on the
      // exact page they requested after logging in — including any query params
      // such as ?reference=... from a Paystack payment callback.
      const next = req.nextUrl.search ? `${pathname}${req.nextUrl.search}` : pathname;
      url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  const needsStylist = matches(pathname, STYLIST_PREFIXES);
  const needsAuth = needsStylist || matches(pathname, PROTECTED_PREFIXES);

  if (needsAuth && !isAuthed) {
    const url = new URL("/Login", req.url);
    const next = req.nextUrl.search ? `${pathname}${req.nextUrl.search}` : pathname;
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (needsStylist && !isStylist) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on app routes only; skip Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|images|icons|offline).*)",
  ],
};
