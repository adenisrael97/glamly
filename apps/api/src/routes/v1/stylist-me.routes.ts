import { Router } from "express";
import { Request, Response } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/asyncHandler";
import { sendSuccess, sendCreated } from "../../lib/apiResponse";
import { stylistMeService } from "../../services/stylist-me.service";
import {
  createPackageSchema,
  updatePackageSchema,
  packageIdParamSchema,
  PAGINATION_DEFAULT_PAGE_SIZE,
} from "@glamly/shared";
import { z } from "zod";

const router = Router();

// All /stylists/me/* routes: authenticated STYLIST only
const guard = [authenticate, requireRole("STYLIST")];

// ─── Services ────────────────────────────────────────────────────────────────

const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1).max(50),
  description: z.string().trim().max(500).optional(),
  price: z.number().int().positive(),
  duration: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
});

const updateServiceSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(500).optional(),
  price: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

router.get(
  "/me/services",
  ...guard,
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || PAGINATION_DEFAULT_PAGE_SIZE;
    const result = await stylistMeService.listServices(req.user!.id, page, limit);
    sendSuccess(res, result, "Services retrieved");
  }),
);

router.post(
  "/me/services",
  ...guard,
  validateBody(createServiceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const svc = await stylistMeService.createService(req.user!.id, req.body);
    sendCreated(res, svc, "Service created");
  }),
);

router.patch(
  "/me/services/:id",
  ...guard,
  validateParams(z.object({ id: z.string().cuid() })),
  validateBody(updateServiceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const svc = await stylistMeService.updateService(req.user!.id, req.params.id, req.body);
    sendSuccess(res, svc, "Service updated");
  }),
);

router.delete(
  "/me/services/:id",
  ...guard,
  validateParams(z.object({ id: z.string().cuid() })),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await stylistMeService.deactivateService(req.user!.id, req.params.id);
    sendSuccess(res, result, "Service deactivated");
  }),
);

// ─── Packages ────────────────────────────────────────────────────────────────

router.get(
  "/me/packages",
  ...guard,
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || PAGINATION_DEFAULT_PAGE_SIZE;
    const result = await stylistMeService.listPackages(req.user!.id, page, limit);
    sendSuccess(res, result, "Packages retrieved");
  }),
);

router.post(
  "/me/packages",
  ...guard,
  validateBody(createPackageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const pkg = await stylistMeService.createPackage(req.user!.id, req.body);
    sendCreated(res, pkg, "Package created");
  }),
);

router.patch(
  "/me/packages/:id",
  ...guard,
  validateParams(packageIdParamSchema),
  validateBody(updatePackageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const pkg = await stylistMeService.updatePackage(req.user!.id, req.params.id, req.body);
    sendSuccess(res, pkg, "Package updated");
  }),
);

router.delete(
  "/me/packages/:id",
  ...guard,
  validateParams(packageIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await stylistMeService.deactivatePackage(req.user!.id, req.params.id);
    sendSuccess(res, result, "Package deactivated");
  }),
);

// ─── Profile ─────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  bio: z.string().trim().max(1000).optional(),
  specialty: z.string().trim().min(1).max(60).optional(),
  location: z.string().trim().min(1).max(120).optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  experience: z.number().int().min(0).max(50).optional(),
  isAvailable: z.boolean().optional(),
});

router.patch(
  "/me/profile",
  ...guard,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await stylistMeService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, updated, "Profile updated");
  }),
);

export default router;
