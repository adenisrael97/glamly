import { Request, Response } from "express";
import type { CreateReviewInput, ListReviewsQuery } from "@glamly/shared";
import { reviewsService } from "../services/reviews.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendCreated, sendSuccess } from "../lib/apiResponse";
import { clientIp, requireActor } from "../lib/requestContext";

export const reviewsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const result = await reviewsService.create(actor, req.body as CreateReviewInput, {
      ipAddress: clientIp(req),
    });
    sendCreated(res, result, "Review submitted successfully");
  }),

  // Mounted at GET /stylists/:id/reviews — `id` is the stylist id.
  listForStylist: asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewsService.listForStylist(
      req.params.id,
      req.query as ListReviewsQuery,
    );
    sendSuccess(res, result, "Reviews retrieved successfully");
  }),
};
