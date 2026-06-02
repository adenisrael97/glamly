import { Router } from "express";
import {
  ROLES,
  bookingIdParamSchema,
  cancelBookingSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  rescheduleBookingSchema,
} from "@glamly/shared";
import { bookingsController } from "../../controllers/bookings.controller";
import { authenticate, requireRole } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";

const router = Router();

// Every booking route requires a valid access token.
router.use(authenticate);

// Bookings carry PII and per-user state — never cache them in any shared layer.
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Create — customers (and admins) only.
router.post(
  "/",
  requireRole(ROLES.USER, ROLES.ADMIN),
  validateBody(createBookingSchema),
  bookingsController.create,
);

// "My bookings" — role-aware (customer view for USER/ADMIN, provider view for STYLIST).
router.get("/me", validateQuery(listBookingsQuerySchema), bookingsController.listMine);

router.get("/:id", validateParams(bookingIdParamSchema), bookingsController.getById);

router.patch(
  "/:id/cancel",
  requireRole(ROLES.USER, ROLES.ADMIN),
  validateParams(bookingIdParamSchema),
  validateBody(cancelBookingSchema),
  bookingsController.cancel,
);

router.patch(
  "/:id/reschedule",
  requireRole(ROLES.USER, ROLES.ADMIN),
  validateParams(bookingIdParamSchema),
  validateBody(rescheduleBookingSchema),
  bookingsController.reschedule,
);

// Complete — a PROVIDER action (the assigned stylist) or an admin.
router.patch(
  "/:id/complete",
  requireRole(ROLES.STYLIST, ROLES.ADMIN),
  validateParams(bookingIdParamSchema),
  bookingsController.complete,
);

export default router;
