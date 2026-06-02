import { z } from "zod";
import { EMAIL_RE, PHONE_RE } from "./validation";

// ─── Roles ──────────────────────────────────────────────────────────────────
//
// Two role vocabularies coexist deliberately:
//   • `Role` (UPPERCASE) is the canonical internal vocabulary — it matches the
//     Prisma `UserRole` enum and is what travels inside JWTs, `req.user.role`,
//     and RBAC checks. The DB is the source of truth, so internals speak its
//     language.
//   • The public REST surface speaks lowercase (`"user" | "stylist"`), matching
//     the existing frontend (`UserRole` in ./types). Registration may only ever
//     create USER or STYLIST — ADMIN is provisioned out-of-band, never via the
//     public register endpoint (privilege-escalation guard).
//
// `apiRoleToDbRole` / `dbRoleToApiRole` are the only sanctioned bridges between
// the two; nothing else should hand-roll the mapping.

export const ROLES = {
  USER: "USER",
  STYLIST: "STYLIST",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles a client is allowed to self-register as (never ADMIN). */
export const REGISTERABLE_API_ROLES = ["user", "stylist"] as const;
export type ApiRole = (typeof REGISTERABLE_API_ROLES)[number] | "admin";

export function apiRoleToDbRole(role: ApiRole): Role {
  switch (role) {
    case "user":
      return ROLES.USER;
    case "stylist":
      return ROLES.STYLIST;
    case "admin":
      return ROLES.ADMIN;
  }
}

export function dbRoleToApiRole(role: Role): ApiRole {
  switch (role) {
    case ROLES.USER:
      return "user";
    case ROLES.STYLIST:
      return "stylist";
    case ROLES.ADMIN:
      return "admin";
  }
}

// ─── Password policy ──────────────────────────────────────────────────────────
//
// Min 8 for usability; hard cap 72 because bcrypt silently truncates input
// beyond 72 bytes — allowing longer would create a false sense of strength and
// make two distinct long passwords collide. Require mixed case + a digit so the
// stored hash resists trivial dictionary attacks.

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .regex(EMAIL_RE, "Enter a valid email address");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name is too short")
  .max(80, "Name is too long");

const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_RE, "Enter a valid phone number");

// ─── Register ─────────────────────────────────────────────────────────────────
//
// Discriminated on `role` so the type system (and Zod) enforce that a stylist
// registration carries the fields the Stylist storefront record requires
// (specialty, location, priceFrom) while a customer registration does not.

const userRegisterSchema = z.object({
  role: z.literal("user"),
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
});

const stylistRegisterSchema = z.object({
  role: z.literal("stylist"),
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  // Stylists must be reachable — phone is mandatory for them.
  phone: phoneSchema,
  specialty: z.string().trim().min(2, "Specialty is required").max(60),
  location: z.string().trim().min(2, "Location is required").max(120),
  priceFrom: z.coerce
    .number()
    .int("Price must be a whole number (kobo/naira)")
    .min(0, "Price cannot be negative")
    .max(100_000_000, "Price is implausibly large"),
});

export const registerSchema = z.discriminatedUnion("role", [
  userRegisterSchema,
  stylistRegisterSchema,
]);

export type RegisterInput = z.infer<typeof registerSchema>;
export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type StylistRegisterInput = z.infer<typeof stylistRegisterSchema>;

// ─── Login ────────────────────────────────────────────────────────────────────
//
// Login intentionally does NOT enforce the registration password policy — doing
// so would leak the policy and reject legacy passwords. Any non-empty string is
// accepted at the boundary; correctness is decided solely by the hash compare.

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Token & user shapes ───────────────────────────────────────────────────────

/** Claims carried by the short-lived access JWT. */
export interface AccessTokenPayload {
  /** User id (JWT `sub`). */
  sub: string;
  role: Role;
}

/** Claims carried by the refresh JWT. `jti` is the Redis whitelist handle. */
export interface RefreshTokenPayload {
  sub: string;
  /** Unique token id — the key under which validity is tracked in Redis. */
  jti: string;
}

/** Safe, public projection of a user — never contains the password hash. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string;
}

/** Successful auth response body (access token in body, refresh in httpOnly cookie). */
export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  /** Seconds until the access token expires — lets the client schedule refresh. */
  expiresIn: number;
}
