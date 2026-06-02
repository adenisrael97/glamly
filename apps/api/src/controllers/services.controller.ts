import { Request, Response } from "express";
import { servicesService } from "../services/services.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendSuccess } from "../lib/apiResponse";

export const servicesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    // Query is pre-validated and coerced by validateQuery(listQuerySchema) on the route.
    const { page, limit, category, stylistId } = req.query as {
      page?: number;
      limit?: number;
      category?: string;
      stylistId?: string;
    };
    const result = await servicesService.list({ page, limit, category, stylistId });
    sendSuccess(res, result, "Services retrieved successfully");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const service = await servicesService.getById(req.params.id);
    sendSuccess(res, service, "Service retrieved successfully");
  }),

  getCategories: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await servicesService.getCategories();
    sendSuccess(res, categories, "Categories retrieved successfully");
  }),
};
