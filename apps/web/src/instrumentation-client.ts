// Client-side error reporting. OPT-IN and bundle-aware: Sentry is loaded via a
// DYNAMIC import gated on NEXT_PUBLIC_SENTRY_DSN. The var is inlined at build time,
// so with no DSN the whole block (and the import) is tree-shaken away — the client
// bundle then carries zero Sentry weight (§12 JS budget, low-end Android). With a
// DSN, Sentry loads as an async chunk so it never blocks initial JS. Deliberately
// lean — no Replay/profiling/feedback — to keep the payload small and avoid PII (§10).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
      sendDefaultPii: false,
    });
  });
}

// NOTE: client navigation-transition tracing (`onRouterTransitionStart`) is omitted
// to keep Sentry out of the initial bundle. Re-add it if perf tracing is enabled.
