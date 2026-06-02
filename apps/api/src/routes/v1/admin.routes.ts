import { Router } from "express";
import { adminController } from "../../controllers/admin.controller";
import { authenticate, requireRole } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import {
  approveStylistSchema,
  listAdminStylistsQuerySchema,
  listAdminUsersQuerySchema,
  listAdminBookingsQuerySchema,
  changeUserRoleSchema,
  stylistIdParamSchema,
  bookingIdParamSchema,
} from "@glamly/shared";
import { z } from "zod";

const router = Router();

// All admin routes require authentication + ADMIN role.
router.use(authenticate, requireRole("ADMIN"));

// ─── Analytics ──────────────────────────────────────────────────────────────────

router.get("/analytics", adminController.getAnalytics);
router.get("/stylists/pending-count", adminController.getPendingCount);

// ─── Stylists ───────────────────────────────────────────────────────────────────

router.get(
  "/stylists",
  validateQuery(listAdminStylistsQuerySchema),
  adminController.listStylists,
);

router.get(
  "/stylists/:id",
  validateParams(stylistIdParamSchema),
  adminController.getStylistById,
);

router.patch(
  "/stylists/:id/status",
  validateParams(stylistIdParamSchema),
  validateBody(approveStylistSchema),
  adminController.updateStylistStatus,
);

// ─── Users ──────────────────────────────────────────────────────────────────────

router.get(
  "/users",
  validateQuery(listAdminUsersQuerySchema),
  adminController.listUsers,
);

router.get(
  "/users/:id",
  validateParams(z.object({ id: z.string().cuid() })),
  adminController.getUserById,
);

router.patch(
  "/users/:id/role",
  validateParams(z.object({ id: z.string().cuid() })),
  validateBody(changeUserRoleSchema),
  adminController.changeUserRole,
);

router.delete(
  "/users/:id",
  validateParams(z.object({ id: z.string().cuid() })),
  adminController.softDeleteUser,
);

// ─── Bookings ───────────────────────────────────────────────────────────────────

router.get(
  "/bookings",
  validateQuery(listAdminBookingsQuerySchema),
  adminController.listBookings,
);

router.get(
  "/bookings/:id",
  validateParams(bookingIdParamSchema),
  adminController.getBookingById,
);

// ─── Services ───────────────────────────────────────────────────────────────────

router.get("/services", adminController.listAllServices);

router.delete(
  "/services/:id",
  validateParams(z.object({ id: z.string().cuid() })),
  adminController.deactivateService,
);

export default router;
