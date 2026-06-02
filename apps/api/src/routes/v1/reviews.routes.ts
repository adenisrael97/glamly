import { Router } from "express";
import { ROLES, createReviewSchema } from "@glamly/shared";
import { reviewsController } from "../../controllers/reviews.controller";
import { authenticate, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const router = Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// A review is created by the authenticated customer who owns the completed
// booking. Stylist-scoped review LISTING lives on /stylists/:id/reviews.
router.post(
  "/",
  authenticate,
  requireRole(ROLES.USER, ROLES.ADMIN),
  validateBody(createReviewSchema),
  reviewsController.create,
);

export default router;
