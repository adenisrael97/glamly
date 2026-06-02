import jwt from "jsonwebtoken";
import { config } from "../config";
import type { AccessTokenPayload, RefreshTokenPayload } from "@glamly/shared";

// Thin, typed wrapper around jsonwebtoken so the rest of the codebase never
// imports `jsonwebtoken` directly and never has to reason about its error zoo.
// Verification normalises every failure mode into a single `TokenError` with a
// coarse reason, which callers (auth middleware / auth service) map to the
// public error taxonomy.

const ISSUER = "glamly";
const ACCESS_AUDIENCE = "glamly:access";
const REFRESH_AUDIENCE = "glamly:refresh";

/** Discriminated, infra-agnostic token failure — no jsonwebtoken types leak out. */
export class TokenError extends Error {
  constructor(public readonly reason: "expired" | "invalid") {
    super(`token ${reason}`);
    this.name = "TokenError";
  }
}

// `expiresIn` accepts the vercel/ms string format ("15m", "30d"). The config
// values are validated strings; cast to satisfy the SignOptions literal type.
type ExpiresIn = jwt.SignOptions["expiresIn"];

export const accessTokenTtlSeconds = durationToSeconds(config.JWT_ACCESS_EXPIRES_IN);
export const refreshTokenTtlSeconds = durationToSeconds(config.JWT_REFRESH_EXPIRES_IN);

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign({ role: payload.role }, config.JWT_ACCESS_SECRET, {
    subject: payload.sub,
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as ExpiresIn,
    issuer: ISSUER,
    audience: ACCESS_AUDIENCE,
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign({}, config.JWT_REFRESH_SECRET, {
    subject: payload.sub,
    jwtid: payload.jti,
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as ExpiresIn,
    issuer: ISSUER,
    audience: REFRESH_AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = verify(token, config.JWT_ACCESS_SECRET, ACCESS_AUDIENCE);
  const role = decoded.role;
  if (!decoded.sub || typeof role !== "string") {
    throw new TokenError("invalid");
  }
  return { sub: decoded.sub, role: role as AccessTokenPayload["role"] };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = verify(token, config.JWT_REFRESH_SECRET, REFRESH_AUDIENCE);
  if (!decoded.sub || !decoded.jti) {
    throw new TokenError("invalid");
  }
  return { sub: decoded.sub, jti: decoded.jti };
}

function verify(token: string, secret: string, audience: string): jwt.JwtPayload {
  try {
    const decoded = jwt.verify(token, secret, { issuer: ISSUER, audience });
    // A correctly-issued token always decodes to an object, never a bare string.
    if (typeof decoded === "string") throw new TokenError("invalid");
    return decoded;
  } catch (err) {
    if (err instanceof TokenError) throw err;
    if (err instanceof jwt.TokenExpiredError) throw new TokenError("expired");
    // NotBeforeError, JsonWebTokenError (bad signature/issuer/audience/malformed)
    throw new TokenError("invalid");
  }
}

/** Parse "15m" / "30d" / "900s" / "<n>" (bare = seconds) into seconds. */
function durationToSeconds(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid JWT duration: "${value}"`);
  }
  const amount = Number(match[1]);
  switch (match[2]) {
    case "ms":
      return Math.floor(amount / 1000);
    case "h":
      return amount * 3600;
    case "d":
      return amount * 86400;
    case "m":
      return amount * 60;
    case "s":
    case undefined:
      return amount;
    default:
      return amount;
  }
}
