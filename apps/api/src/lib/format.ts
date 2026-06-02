// Presentation helpers for notifications (email/push). Kept server-side and tiny.
// Glamly serves the Nigerian market, so human-facing times render in Africa/Lagos
// and money renders in Naira regardless of where the server runs.

const DATE_FMT = new Intl.DateTimeFormat("en-NG", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Lagos",
});

/** "Mon, 2 Jun 2026, 1:00 PM" in West Africa Time. */
export function formatBookingTime(date: Date): string {
  return DATE_FMT.format(date);
}

/** Naira amount (stored as a whole-Naira integer) → "₦12,000". */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}
