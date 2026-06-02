import { CookieOptions, Response } from "express";
import { config } from "../config";

// The refresh token lives in an httpOnly cookie (CLAUDE.md §6): unreadable by
// JavaScript (XSS can't exfiltrate it) and scoped by `path` so the browser only
// ever sends it to the refresh/logout endpoints — never to ordinary API calls,
// shrinking its exposure surface.

export const REFRESH_COOKIE_NAME = "glamly_rt";

// Cookie is offered only to /api/v1/auth/* (refresh + logout live there).
const REFRESH_COOKIE_PATH = "/api/v1/auth";

function baseOptions(): CookieOptions {
  const isProd = config.NODE_ENV === "production";
  return {
    httpOnly: true,
    // Secure in production so the cookie never rides an unencrypted connection.
    // Left off in dev so it works over http://localhost.
    secure: isProd,
    // Cross-site cookie delivery: in production the web app (e.g. *.vercel.app) and
    // the API (e.g. *.onrender.com) are on different registrable domains, so the
    // refresh cookie is sent on a CROSS-SITE XHR. `SameSite=Lax` is NOT sent on
    // cross-site subrequests, which would silently break token refresh + logout in
    // production. `SameSite=None` (which requires Secure, satisfied above) is the
    // correct setting for a split SPA+API deployment. In dev both run on
    // http://localhost (same-site), where `Lax` works and `None` can't be used
    // without Secure — so keep `Lax` locally.
    sameSite: isProd ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, token: string, maxAgeSeconds: number): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseOptions(),
    maxAge: maxAgeSeconds * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  // Must mirror the original attributes (path in particular) or the browser
  // won't match and clear it.
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions());
}
