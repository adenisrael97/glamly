import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request context propagated implicitly through async calls (CLAUDE.md §13).
 *
 * The correlation-ID middleware seeds this at the edge; the logger reads it so
 * EVERY log line emitted while handling a request carries the same id without
 * threading `req` through every service/repository. Kept Express-free so the
 * logger can depend on it without creating an import cycle.
 */
interface RequestContext {
  correlationId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Run `fn` (and everything it awaits) with the given correlation id in scope. */
export function runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
  return storage.run({ correlationId }, fn);
}

/** The current request's correlation id, or undefined outside a request. */
export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}
