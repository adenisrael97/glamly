import { NextResponse, type NextRequest } from "next/server";

// Optimistic route guarding (CLAUDE.md §4). The middleware reads the non-httpOnly
// `glamly_role` hint cookie set by AuthContext — it CANNOT read the httpOnly
// refresh cookie, and it does NOT verify anything. Real enforcement lives in the
// API (every protected endpoint rejects an unauthenticated/under-privileged
// request) plus client guards; this layer just avoids flashing a protected page
// before that happens, and keeps signed-in users out of the auth pages.

const PROTECTED_PREFIXES = ["/book-appointment", "/booking", "/dashboard"];
const STYLIST_PREFIXES = ["/studio"];
const AUTH_PREFIXES = ["/Login", "/register", "/stylist-register"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get("glamly_role")?.value;
  const isAuthed = Boolean(role);
  const isStylist = role === "stylist";

  // Signed-in users have no business on the auth pages.
  if (matches(pathname, AUTH_PREFIXES)) {
    if (isAuthed) {
      return NextResponse.redirect(new URL(isStylist ? "/studio" : "/", req.url));
    }
    return NextResponse.next();
  }

  const needsStylist = matches(pathname, STYLIST_PREFIXES);
  const needsAuth = needsStylist || matches(pathname, PROTECTED_PREFIXES);

  if (needsAuth && !isAuthed) {
    const url = new URL("/Login", req.url);
    url.searchParams.set("next", pathname);
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|push-sw.js|images|icons|offline).*)",
  ],
};
