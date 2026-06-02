import { Request, Response } from "express";
import type { AvailabilityQuery, ListStylistsQuery } from "@glamly/shared";
import { stylistsService } from "../services/stylists.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendSuccess } from "../lib/apiResponse";

export const stylistsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    // Query is pre-validated/coerced by validateQuery(listStylistsQuerySchema).
    const result = await stylistsService.list(req.query as ListStylistsQuery);
    sendSuccess(res, result, "Stylists retrieved successfully");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const stylist = await stylistsService.getById(req.params.id);
    sendSuccess(res, stylist, "Stylist retrieved successfully");
  }),

  getAvailability: asyncHandler(async (req: Request, res: Response) => {
    const availability = await stylistsService.getAvailability(
      req.params.id,
      req.query as AvailabilityQuery,
    );
    sendSuccess(res, availability, "Availability retrieved successfully");
  }),
};
