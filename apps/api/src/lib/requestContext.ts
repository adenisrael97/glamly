import { Request } from "express";
import type { Role } from "@glamly/shared";
import { UnauthorizedError } from "../errors/AppError";

/**
 * Client IP for audit trails. Honours X-Forwarded-For only when Express
 * `trust proxy` is configured; otherwise falls back to the socket address.
 * Never log this alongside identity data (CLAUDE.md §10).
 */
export function clientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.ip;
}

/**
 * The authenticated actor, guaranteed present after the `authenticate`
 * middleware. Throws rather than returning a nullable so callers stay terse.
 */
export function requireActor(req: Request): { userId: string; role: Role } {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.id, role: req.user.role };
}
