import { Request, Response } from "express";
import type {
  AuthResult,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "@glamly/shared";
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

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    // Body pre-validated by validateBody(updateProfileSchema) on the route.
    const user = await authService.updateProfile(
      req.user.id,
      req.body as UpdateProfileInput,
      { ipAddress: clientIp(req) },
    );
    sendSuccess(res, user, "Profile updated successfully");
  }),

  /**
   * POST /auth/me/password
   * Change the signed-in user's password. The refresh cookie is read so the
   * service can keep THIS device signed in while revoking the user's other
   * sessions. Body pre-validated by validateBody(changePasswordSchema).
   */
  changePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    await authService.changePassword(req.user.id, req.body as ChangePasswordInput, {
      ipAddress: clientIp(req),
      currentRefreshToken: req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
    });
    sendSuccess(res, null, "Password changed successfully");
  }),

  /**
   * POST /auth/forgot-password
   * Always returns 200 with the same message whether or not the email exists
   * (enumeration guard). Rate-limited on the route.
   */
  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body as ForgotPasswordInput, {
      ipAddress: clientIp(req),
    });
    sendSuccess(
      res,
      null,
      "If an account with that email exists, a reset link has been sent.",
    );
  }),

  /**
   * GET /auth/reset-password?token=<raw>
   * Validate the token before rendering the reset form. Returns the masked
   * email so the UI can confirm to the user which account they're resetting.
   */
  validateResetToken: asyncHandler(async (req: Request, res: Response) => {
    const token = req.query["token"];
    if (typeof token !== "string" || !token) {
      sendSuccess(res, { valid: false }, "Invalid reset token");
      return;
    }
    const result = await authService.validateResetToken(token);
    sendSuccess(res, { valid: true, maskedEmail: result.maskedEmail }, "Token is valid");
  }),

  /**
   * POST /auth/reset-password
   * Consume the token and set a new password. All sessions are revoked on
   * success so a stolen cookie cannot be replayed post-reset.
   */
  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body as ResetPasswordInput, {
      ipAddress: clientIp(req),
    });
    // Clear any refresh cookie that may be present — forces a clean login.
    clearRefreshCookie(res);
    sendSuccess(res, null, "Password reset successfully. Please log in with your new password.");
  }),
};
