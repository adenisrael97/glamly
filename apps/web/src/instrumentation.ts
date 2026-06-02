import * as Sentry from "@sentry/nextjs";

// Next.js runtime hook: loads the matching Sentry config for the server/edge
// runtime. Each config is a no-op unless a DSN is present (see those files).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports errors thrown in nested React Server Components to Sentry.
export const onRequestError = Sentry.captureRequestError;
