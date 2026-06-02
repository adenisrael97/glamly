"use client";

import NextError from "next/error";
import { useEffect } from "react";

// Catches errors that escape the root layout. Sentry is loaded via a DYNAMIC import
// gated on the DSN so this boundary's chunk carries zero Sentry weight when error
// reporting is disabled (tree-shaken at build time). Must render its own
// <html>/<body> as it replaces the layout.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* App Router does not expose a status code here; 0 renders a generic page. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
