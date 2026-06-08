export const PAGINATION_DEFAULT_PAGE_SIZE = 20;
export const PAGINATION_MAX_PAGE_SIZE = 50;

export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  // Refresh-session errors: returned when a refresh token is missing, expired,
  // already rotated, or revoked. Never distinguishes the exact cause to the client.
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",
  // Registration conflict. Returned generically; see auth.service for the
  // enumeration-hardening tradeoff documented at the call site.
  AUTH_EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
  // Password reset token is malformed, not found, or has already been used.
  AUTH_RESET_TOKEN_INVALID: "AUTH_RESET_TOKEN_INVALID",
  // Password reset token is structurally valid but past its 1-hour TTL.
  AUTH_RESET_TOKEN_EXPIRED: "AUTH_RESET_TOKEN_EXPIRED",
  // Authenticated change-password: the supplied current password did not match.
  // Deliberately a 400 (not 401) so the client's refresh-on-401 interceptor never
  // fires for a wrong current password.
  AUTH_INCORRECT_PASSWORD: "AUTH_INCORRECT_PASSWORD",
  // Slot/booking domain.
  BOOKING_SLOT_TAKEN: "BOOKING_SLOT_TAKEN",
  BOOKING_SLOT_UNAVAILABLE: "BOOKING_SLOT_UNAVAILABLE",
  BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",
  // Returned when a booking cannot transition from its current status (e.g.
  // cancelling an already-cancelled booking, rescheduling a completed one).
  BOOKING_INVALID_STATE: "BOOKING_INVALID_STATE",
  // Review domain.
  REVIEW_ALREADY_EXISTS: "REVIEW_ALREADY_EXISTS",
  REVIEW_BOOKING_NOT_COMPLETED: "REVIEW_BOOKING_NOT_COMPLETED",
  // Payment domain.
  PAYMENT_VERIFICATION_FAILED: "PAYMENT_VERIFICATION_FAILED",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
  // Booking is not in a state that can be paid for (not PENDING, already paid,
  // cancelled, or expired).
  PAYMENT_BOOKING_NOT_PAYABLE: "PAYMENT_BOOKING_NOT_PAYABLE",
  // Paystack webhook signature absent or did not match the HMAC of the raw body.
  PAYMENT_SIGNATURE_INVALID: "PAYMENT_SIGNATURE_INVALID",
  // Stylist approval domain.
  STYLIST_PENDING_APPROVAL: "STYLIST_PENDING_APPROVAL",
  STYLIST_SUSPENDED: "STYLIST_SUSPENDED",
  STYLIST_REJECTED: "STYLIST_REJECTED",
  // Gift voucher domain.
  GIFT_VOUCHER_EXPIRED: "GIFT_VOUCHER_EXPIRED",
  GIFT_VOUCHER_ALREADY_REDEEMED: "GIFT_VOUCHER_ALREADY_REDEEMED",
  GIFT_VOUCHER_NOT_FOUND: "GIFT_VOUCHER_NOT_FOUND",
  // Package domain.
  PACKAGE_NOT_FOUND: "PACKAGE_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
