import { ErrorCode, ERROR_CODES } from "@glamly/shared";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "AUTH_UNAUTHORIZED" satisfies ErrorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "AUTH_FORBIDDEN" satisfies ErrorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT") {
    super(message, 409, code);
  }
}

// Single, deliberately vague credential failure. Login and any password check
// throw THIS and nothing else — never "no such user" vs "wrong password" — so
// the response can't be used to enumerate which emails are registered.
export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid credentials", 401, ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }
}

// Access token rejected because it has expired — distinct code lets the client
// know to silently refresh rather than bounce the user to login.
export class TokenExpiredError extends AppError {
  constructor() {
    super("Access token expired", 401, ERROR_CODES.AUTH_TOKEN_EXPIRED);
  }
}

// Access token rejected for any reason other than expiry (bad signature,
// malformed, wrong audience, missing). Deliberately generic.
export class TokenInvalidError extends AppError {
  constructor(message = "Invalid access token") {
    super(message, 401, ERROR_CODES.AUTH_TOKEN_INVALID);
  }
}

// Refresh failed — token missing, expired, already rotated, or revoked. One code
// for every cause so a caller can't probe session state. Client must re-login.
export class SessionExpiredError extends AppError {
  constructor() {
    super("Session expired, please log in again", 401, ERROR_CODES.AUTH_SESSION_EXPIRED);
  }
}

export class EmailTakenError extends ConflictError {
  constructor() {
    super("An account with this email already exists", ERROR_CODES.AUTH_EMAIL_TAKEN);
  }
}

// ─── Booking domain ─────────────────────────────────────────────────────────

// The requested slot is already taken by another active booking. Raised when the
// DB-level partial unique index (or the in-transaction overlap check) rejects a
// concurrent booking — the authoritative double-booking guard (§11).
export class SlotTakenError extends ConflictError {
  constructor(message = "That time slot is no longer available") {
    super(message, ERROR_CODES.BOOKING_SLOT_TAKEN);
  }
}

// The slot is structurally invalid (outside working hours, in the past, beyond
// the booking horizon, or the stylist is not accepting bookings).
export class SlotUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 422, ERROR_CODES.BOOKING_SLOT_UNAVAILABLE);
  }
}

export class BookingNotFoundError extends AppError {
  constructor(message = "Booking not found") {
    super(message, 404, ERROR_CODES.BOOKING_NOT_FOUND);
  }
}

// The booking cannot transition from its current status (e.g. cancelling a
// completed booking, rescheduling a cancelled one).
export class InvalidBookingStateError extends AppError {
  constructor(message: string) {
    super(message, 409, ERROR_CODES.BOOKING_INVALID_STATE);
  }
}

// ─── Review domain ──────────────────────────────────────────────────────────

export class ReviewAlreadyExistsError extends ConflictError {
  constructor() {
    super("This booking has already been reviewed", ERROR_CODES.REVIEW_ALREADY_EXISTS);
  }
}

export class BookingNotCompletedError extends AppError {
  constructor() {
    super(
      "You can only review a booking after it has been completed",
      422,
      ERROR_CODES.REVIEW_BOOKING_NOT_COMPLETED,
    );
  }
}

// ─── Payment domain ───────────────────────────────────────────────────────────

export class PaymentNotFoundError extends AppError {
  constructor(message = "Payment not found") {
    super(message, 404, ERROR_CODES.PAYMENT_NOT_FOUND);
  }
}

// The booking can't be paid for: it isn't PENDING, is already paid, or has been
// cancelled/expired. A 409 conflict with the current state.
export class BookingNotPayableError extends ConflictError {
  constructor(message = "This booking cannot be paid for") {
    super(message, ERROR_CODES.PAYMENT_BOOKING_NOT_PAYABLE);
  }
}

// The Paystack webhook signature header was missing or did not match the HMAC of
// the raw body. Returned as 400 Bad Request: the endpoint carries no auth scheme
// to challenge (so 401 is semantically wrong) — the request body simply failed
// authenticity verification. Mirrors the canonical Stripe webhook pattern.
export class WebhookSignatureError extends AppError {
  constructor() {
    super("Invalid webhook signature", 400, ERROR_CODES.PAYMENT_SIGNATURE_INVALID);
  }
}

// The payment gateway (Paystack) was unreachable or rejected the request. 502 —
// the failure is upstream, not the client's. The customer can safely retry.
export class PaymentGatewayError extends AppError {
  constructor(message = "Could not reach the payment provider, please try again") {
    super(message, 502, ERROR_CODES.PAYMENT_VERIFICATION_FAILED);
  }
}
