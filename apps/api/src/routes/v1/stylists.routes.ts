import { Router } from "express";
import {
  availabilityQuerySchema,
  listReviewsQuerySchema,
  listStylistsQuerySchema,
  stylistIdParamSchema,
} from "@glamly/shared";
import { stylistsController } from "../../controllers/stylists.controller";
import { reviewsController } from "../../controllers/reviews.controller";
import { validateParams, validateQuery } from "../../middleware/validate";

const router = Router();

// Public discovery surface — no auth required.
router.get("/", validateQuery(listStylistsQuerySchema), stylistsController.list);

router.get("/:id", validateParams(stylistIdParamSchema), stylistsController.getById);

router.get(
  "/:id/availability",
  validateParams(stylistIdParamSchema),
  validateQuery(availabilityQuerySchema),
  stylistsController.getAvailability,
);

router.get(
  "/:id/reviews",
  validateParams(stylistIdParamSchema),
  validateQuery(listReviewsQuerySchema),
  reviewsController.listForStylist,
);

export default router;
