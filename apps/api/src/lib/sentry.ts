import * as Sentry from "@sentry/node";
import { config } from "../config";
import { logger } from "./logger";

// Error reporting (CLAUDE.md §13). Sentry is OPT-IN: with no SENTRY_DSN the SDK is
// never initialised and every capture below is a no-op, so dev / test / CI stay
// silent and need no Sentry project. In production a DSN flips it on and unhandled
// errors are reported with the request's correlation id for traceability.
let enabled = false;

export function initSentry(): void {
  if (!config.SENTRY_DSN) {
    logger.info("Sentry disabled — no SENTRY_DSN set");
    return;
  }

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    // Performance tracing off by default (sample rate 0); turn up via env in prod.
    tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
  });

  enabled = true;
  logger.info("Sentry initialised", { environment: config.NODE_ENV });
}

export function isSentryEnabled(): boolean {
  return enabled;
}

// Report an unexpected (non-operational) error, tagged with the correlation id so
// it can be cross-referenced against the structured logs for the same request.
export function captureException(
  err: unknown,
  context?: { correlationId?: string },
): void {
  if (!enabled) return;
  Sentry.captureException(
    err,
    context?.correlationId ? { tags: { correlationId: context.correlationId } } : undefined,
  );
}
