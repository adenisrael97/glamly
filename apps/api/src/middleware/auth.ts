import { Request, Response, NextFunction } from "express";
import type { Role } from "@glamly/shared";
import {
  ForbiddenError,
  TokenExpiredError,
  TokenInvalidError,
  UnauthorizedError,
} from "../errors/AppError";
import { TokenError, verifyAccessToken } from "../lib/jwt";
import { asyncHandler } from "./asyncHandler";

/**
 * Verify the `Authorization: Bearer <token>` access token, then attach
 * `req.user = { id, role }`. Expired tokens get a distinct code so the client
 * knows to refresh; everything else is a generic invalid-token rejection.
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or malformed Authorization header");
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) throw new TokenInvalidError();

    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, role: payload.role };
      next();
    } catch (err) {
      if (err instanceof TokenError) {
        throw err.reason === "expired" ? new TokenExpiredError() : new TokenInvalidError();
      }
      throw err;
    }
  },
);

/**
 * RBAC guard. Must run AFTER `authenticate`. Passing several roles means "any
 * of these" (e.g. requireRole(ROLES.STYLIST, ROLES.ADMIN)).
 */
export const requireRole = (...roles: Role[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError("You do not have permission to perform this action");
    }
    next();
  });
