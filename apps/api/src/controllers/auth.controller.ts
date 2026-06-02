import { Request, Response } from "express";
import type { AuthResult, LoginInput, RegisterInput } from "@glamly/shared";
import { authService, type IssuedSession } from "../services/auth.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendSuccess, sendCreated } from "../lib/apiResponse";
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
} from "../lib/cookies";
import { UnauthorizedError } from "../errors/AppError";

// Controllers stay THIN: parse the request, call the service, translate the
// IssuedSession into (httpOnly refresh cookie + JSON body with the access
// token). The refresh token NEVER appears in a response body or a log.

// Client IP for the audit trail. Trusts X-Forwarded-For only if Express
// `trust proxy` is set; falls back to the socket address.
function clientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.ip;
}

function toAuthResult(session: IssuedSession): AuthResult {
  return {
    user: session.user,
    accessToken: session.accessToken,
    expiresIn: session.accessExpiresIn,
  };
}

function completeSession(res: Response, session: IssuedSession): AuthResult {
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresIn);
  return toAuthResult(session);
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    // Body is pre-validated by validateBody(registerSchema) on the route.
    const session = await authService.register(req.body as RegisterInput, {
      ipAddress: clientIp(req),
    });
    sendCreated(res, completeSession(res, session), "Account created successfully");
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const session = await authService.login(req.body as LoginInput, {
      ipAddress: clientIp(req),
    });
    sendSuccess(res, completeSession(res, session), "Logged in successfully");
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const session = await authService.refresh(token, { ipAddress: clientIp(req) });
    sendSuccess(res, completeSession(res, session), "Token refreshed");
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await authService.logout(token, { ipAddress: clientIp(req) });
    // Clear the cookie regardless of whether a token was present (idempotent).
    clearRefreshCookie(res);
    sendSuccess(res, null, "Logged out successfully");
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    // `authenticate` middleware guarantees req.user is set before this runs.
    if (!req.user) throw new UnauthorizedError();
    const user = await authService.getProfile(req.user.id);
    sendSuccess(res, user, "Profile retrieved successfully");
  }),
};
