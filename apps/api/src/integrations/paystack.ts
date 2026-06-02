import crypto from "node:crypto";
import { config } from "../config";

// Paystack integration wrapper (CLAUDE.md §3): all Paystack HTTP + crypto lives
// here so business logic depends on this interface, not on Paystack's wire shape.
// It can be swapped or mocked without touching payments.service.

/** Raised for any non-2xx / malformed response from the Paystack API. */
export class PaystackApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaystackApiError";
  }
}

// ─── Wire shapes (only the fields we consume) ─────────────────────────────────

interface InitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface VerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: "success" | "failed" | "abandoned" | string;
    reference: string;
    amount: number; // kobo
    currency: string;
    paid_at: string | null;
  };
}

/**
 * A Paystack webhook envelope. We only model `charge.success`, the single event
 * that confirms a booking. `data.id` is the stable transaction id used as our
 * idempotency key; `data.reference` is the reference we generated at initiation.
 */
export interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number; // kobo
    currency: string;
    paid_at: string | null;
  };
}

const TIMEOUT_MS = 10_000;

function authHeaders() {
  return {
    Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const url = `${config.PAYSTACK_BASE_URL}${path}`;
  let res: globalThis.Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new PaystackApiError(
      `Paystack request to ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new PaystackApiError(`Paystack returned non-JSON from ${path} (HTTP ${res.status})`);
  }

  if (!res.ok || (body as { status?: boolean }).status === false) {
    const msg = (body as { message?: string }).message ?? `HTTP ${res.status}`;
    throw new PaystackApiError(`Paystack ${path} rejected: ${msg}`);
  }
  return body as T;
}

export const paystack = {
  /** Create a checkout session; returns the hosted authorization URL. */
  async initializeTransaction(params: {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ authorizationUrl: string; accessCode: string; reference: string }> {
    const body = await request<InitializeResponse>("/transaction/initialize", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });
    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code,
      reference: body.data.reference,
    };
  },

  /**
   * Server-side verification of a transaction by reference. Used to reconcile a
   * webhook against Paystack's own record (defence in depth — never trust the
   * amount/status from the wire alone).
   */
  async verifyTransaction(reference: string): Promise<{
    status: string;
    amountKobo: number;
    currency: string;
    paidAt: string | null;
    transactionId: number;
  }> {
    const body = await request<VerifyResponse>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET", headers: authHeaders() },
    );
    return {
      status: body.data.status,
      amountKobo: body.data.amount,
      currency: body.data.currency,
      paidAt: body.data.paid_at,
      transactionId: body.data.id,
    };
  },

  /**
   * Verify the `x-paystack-signature` header: HMAC-SHA512 of the EXACT raw
   * request body keyed by the secret key (CLAUDE.md §6). Timing-safe compare.
   * `rawBody` must be the unparsed bytes — re-serialising the parsed JSON would
   * change whitespace/key order and break the signature.
   */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean {
    if (!signature) return false;
    const expected = crypto
      .createHmac("sha512", config.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    // timingSafeEqual throws on length mismatch — guard first so a wrong-length
    // signature is a clean `false` rather than an exception.
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  },

  /** Compute a signature for a payload — used by tests to forge valid webhooks. */
  signPayload(rawBody: Buffer | string): string {
    return crypto.createHmac("sha512", config.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  },
};
