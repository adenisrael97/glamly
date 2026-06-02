import { Router } from "express";
import { ROLES, initiatePaymentSchema, paymentReferenceParamSchema } from "@glamly/shared";
import { paymentsController } from "../../controllers/payments.controller";
import { authenticate, requireRole } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";

const router = Router();

// ── Webhook ───────────────────────────────────────────────────────────────────
// Unauthenticated and registered BEFORE the `authenticate` guard: Paystack calls
// it server-to-server with no JWT. Trust is the HMAC signature over the raw body
// (verified in the service). Confirmation of a booking happens ONLY here (§6).
router.post("/webhook", paymentsController.webhook);

// ── Customer-facing endpoints ─────────────────────────────────────────────────
router.use(authenticate);

// Payment data is per-user and state-bearing — never cache it in a shared layer.
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Start a checkout for a booking the customer owns.
router.post(
  "/initiate",
  requireRole(ROLES.USER, ROLES.ADMIN),
  validateBody(initiatePaymentSchema),
  paymentsController.initiate,
);

// Poll payment status after returning from the Paystack-hosted checkout.
router.get("/:reference", validateParams(paymentReferenceParamSchema), paymentsController.getStatus);

export default router;
