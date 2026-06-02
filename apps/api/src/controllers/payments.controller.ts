import { Request, Response } from "express";
import type { InitiatePaymentInput, PaymentReferenceParam } from "@glamly/shared";
import { paymentsService } from "../services/payments.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendSuccess } from "../lib/apiResponse";
import { clientIp, requireActor } from "../lib/requestContext";

export const paymentsController = {
  initiate: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const session = await paymentsService.initiate(actor, req.body as InitiatePaymentInput, {
      ipAddress: clientIp(req),
    });
    sendSuccess(res, session, "Payment initialized");
  }),

  /** Read-only payment status for the post-checkout callback page to poll. */
  getStatus: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const { reference } = req.params as unknown as PaymentReferenceParam;
    const status = await paymentsService.getStatusForActor(actor, reference);
    sendSuccess(res, status, "Payment status retrieved");
  }),

  /**
   * Paystack webhook. Unauthenticated by design — trust comes from the HMAC
   * signature over the RAW body (captured by express.json's `verify` hook in
   * server.ts), not a JWT. Always acknowledge with 200 once the signature is
   * valid so Paystack stops retrying; a bad signature throws and surfaces as 401.
   */
  webhook: asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["x-paystack-signature"] as string | undefined;
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const outcome = await paymentsService.handleWebhook(rawBody, signature);
    sendSuccess(res, outcome, "Webhook received");
  }),
};
