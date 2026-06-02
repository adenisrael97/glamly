import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  // Paystack — server-side secret key (sk_test_… / sk_live_…). The same key both
  // authenticates API calls AND is the HMAC key for webhook signatures (§6).
  PAYSTACK_SECRET_KEY: z.string().min(1, "PAYSTACK_SECRET_KEY is required"),
  // Base URL of the Paystack API; overridable so tests can point at a stub.
  PAYSTACK_BASE_URL: z.string().url().default("https://api.paystack.co"),
  // Where Paystack redirects the customer after checkout. This is a client
  // callback only — it never confirms a booking (that is webhook-only, §6).
  PAYSTACK_CALLBACK_URL: z.string().url().default("http://localhost:3000/bookings"),

  // ── Notifications (email / web push) ──────────────────────────────────────
  // All optional so the server boots in dev without third-party credentials.
  // The email + push integrations fail-soft (warn + no-op) when their key is
  // absent, so a missing key degrades delivery without breaking the booking flow.
  // Resend transactional email (§2). When unset, emails are logged, not sent.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Glamly <noreply@glamly.ng>"),
  // Public base URL of the web app, used to build links inside emails/pushes.
  WEB_APP_URL: z.string().url().default("http://localhost:3000"),
  // Web Push VAPID keys (§5). When unset, push delivery is skipped.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:noreply@glamly.ng"),

  // ── Error reporting (Sentry, §13) ─────────────────────────────────────────
  // Optional: when unset the SDK never initialises and error capture is a no-op,
  // so the server runs locally/in CI without a Sentry project. Set in production.
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid or missing environment variables — server cannot start.\n");
  const fields = parsed.error.flatten().fieldErrors;
  for (const [key, errors] of Object.entries(fields)) {
    console.error(`  ${key}: ${errors?.join(", ")}`);
  }
  console.error("\nCheck your .env file against .env.example and try again.");
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
