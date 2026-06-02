import * as Sentry from "@sentry/nextjs";

// Server-runtime error reporting. The DSN is not a secret, so the public var is an
// acceptable fallback; a server-only SENTRY_DSN wins when set. No-op without one.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
  });
}
